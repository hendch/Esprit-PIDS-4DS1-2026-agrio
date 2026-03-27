from __future__ import annotations

from fastapi import APIRouter, HTTPException
from pydantic import BaseModel

from app.modules.irrigation.repository import IrrigationRepository
from app.modules.weather.open_meteo_client import OpenMeteoWeatherProvider
from app.modules.iot_gateway.mqtt_client import MqttSensorProvider

router = APIRouter()

_repo = IrrigationRepository()
_weather = OpenMeteoWeatherProvider()
_sensor = MqttSensorProvider()
_agent = None

class ScheduleRequest(BaseModel):
    field_id: str
    target_date: str
    start_time: str
    duration_minutes: int
    water_volume: float

class AutonomousStateRequest(BaseModel):
    autonomous: bool


def _get_agent():
    global _agent
    if _agent is None:
        from app.modules.ai.agent.orchestrator import IrrigationAgent

        _agent = IrrigationAgent()
    return _agent


@router.post("/check")
async def check_irrigation(data: dict):
    """Ask the irrigation agent whether to irrigate."""
    crop = data.get("crop", "wheat")
    growth_stage = data.get("growth_stage", "mid")
    lat = data.get("lat", 36.8)
    lon = data.get("lon", 10.18)
    query = f"Should I irrigate {crop} at {lat},{lon}?"
    result = _get_agent().run(
        query=query,
        crop=crop,
        growth_stage=growth_stage,
        lat=float(lat),
        lon=float(lon),
    )
    return {"decision": result}


@router.get("/history")
async def get_history():
    """Return recent irrigation events."""
    rows = _repo.get_history()
    return {"history": rows}


@router.get("/recommendation/{field_id}")
async def get_recommendation(field_id: str):
    """Get irrigation recommendation for a field (placeholder)."""
    # TODO: look up field coords from farms module
    result = _get_agent().run(
        query=f"Should I irrigate the field {field_id}?",
        crop="wheat",
        growth_stage="mid",
        lat=36.8,
        lon=10.18,
    )
    return {"field_id": field_id, "recommendation": result}


@router.get("/dashboard")
async def get_dashboard_data():
    """Unified endpoint to grab remote data without crashing if one fails."""
    # 1. Fetch Weather
    weather_data = None
    try:
        weather_data = await _weather.get_forecast(lat=36.8, lon=10.18, days=5)
    except Exception as e:
        import logging
        logging.getLogger(__name__).warning("Weather provider failed: %s", e)

    # 2. Fetch Cached Moisture (Wait at most 0.1s internally)
    moisture_data = None
    try:
        moisture_data = _sensor.get_cached_reading()
    except Exception as e:
        import logging
        logging.getLogger(__name__).warning("MQTT Sensor failed: %s", e)

    # 3. Fetch Today's Water Usage
    usage_today = 0.0
    try:
        usage_today = _repo.get_today_water_usage()
    except Exception as e:
        import logging
        logging.getLogger(__name__).warning("DB usage fetch failed: %s", e)

    # 4. Fetch History and Savings
    usage_history = None
    try:
        usage_history = _repo.get_water_usage_history(limit=7)
    except Exception as e:
        import logging
        logging.getLogger(__name__).warning("DB history fetch failed: %s", e)

    return {
        "weather": weather_data,
        "moisture": moisture_data,
        "usage_today": usage_today,
        "usage_history": usage_history
    }


@router.post("/schedule")
async def create_schedule(data: ScheduleRequest):
    """Save an irrigation schedule."""
    try:
        schedule_id = _repo.add_schedule(
            field_id=data.field_id,
            target_date=data.target_date,
            start_time=data.start_time,
            duration_minutes=data.duration_minutes,
            water_volume=data.water_volume
        )
        return {"status": "success", "schedule_id": schedule_id}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/autonomous")
async def get_autonomous():
    """Get the current autonomous background job status."""
    return {"autonomous": _repo.get_autonomous_state()}

@router.post("/autonomous")
async def set_autonomous(data: AutonomousStateRequest):
    """Enable or disable the autonomous background job."""
    _repo.set_autonomous_state(data.autonomous)
    return {"status": "success", "autonomous": data.autonomous}

@router.get("/schedules")
async def get_schedules():
    """Get the recent irrigation schedules."""
    return {"schedules": _repo.get_schedules()}
