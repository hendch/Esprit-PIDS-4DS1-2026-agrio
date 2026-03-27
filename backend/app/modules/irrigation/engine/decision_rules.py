from __future__ import annotations


def evaluate_irrigation_need(
    etc_mm: float,
    soil_moisture_pct: float,
    forecast_rain_mm: float,
) -> dict:
    
    deficit = etc_mm - forecast_rain_mm
    recommended = max(deficit, 0.0)

    if soil_moisture_pct >= 50:
        return {
            "decision": "skip",
            "reason": f"Soil moisture is high at {soil_moisture_pct}%. No irrigation needed.",
            "recommended_mm": 0.0,
        }
    elif soil_moisture_pct < 30:
        return {
            "decision": "irrigate",
            "reason": f"Soil moisture is critically low at {soil_moisture_pct}%. Applying full required amount.",
            "recommended_mm": round(max(recommended, etc_mm * 0.8), 2),
        }
    else:
        # Between 30 and 50
        return {
            "decision": "reduce",
            "reason": f"Soil moisture is adequate ({soil_moisture_pct}%), but dipping. Applying a reduced maintenance amount.",
            "recommended_mm": round(recommended * 0.5, 2),
        }
