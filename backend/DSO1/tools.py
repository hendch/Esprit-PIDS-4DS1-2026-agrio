import requests
from datetime import datetime, timedelta
from langchain.tools import tool
from crop_coefficients import get_kc
from database import log_irrigation
import paho.mqtt.client as mqtt
import time

# MQTT Setup - lazy initialization
mqtt_client = None
latest_moisture = 45  # Global variable

def on_message(client, userdata, msg):
    global latest_moisture
    try:
        latest_moisture = int(msg.payload.decode())
        print(f"Received moisture: {latest_moisture}%")
    except:
        pass

def get_mqtt_client():
    global mqtt_client
    if mqtt_client is None:
        mqtt_client = mqtt.Client()
        mqtt_client.on_message = on_message
        try:
            mqtt_client.connect("test.mosquitto.org", 1883, 60)
            mqtt_client.subscribe("farm/soil_moisture")
            mqtt_client.loop_start()
            print("MQTT connected and subscribed")
        except:
            print("MQTT broker unavailable - simulation disabled")
    return mqtt_client

@tool
def fetch_weather_data(lat: float, lon: float) -> dict:
    """Fetches weather data from Open-Meteo API"""
    url = "https://api.open-meteo.com/v1/forecast"
    params = {
        "latitude": lat,
        "longitude": lon,
        "daily": "temperature_2m_max,temperature_2m_min,precipitation_sum,windspeed_10m_max,relative_humidity_2m_mean,et0_fao_evapotranspiration",
        "timezone": "Africa/Tunis",
        "forecast_days": 7
    }
    response = requests.get(url, params=params)
    data = response.json()
    
    return {
        "temp_max": data['daily']['temperature_2m_max'][0],
        "temp_min": data['daily']['temperature_2m_min'][0],
        "humidity": data['daily']['relative_humidity_2m_mean'][0],
        "wind_speed": data['daily']['windspeed_10m_max'][0],
        "precipitation": data['daily']['precipitation_sum'][0],
        "et0": data['daily']['et0_fao_evapotranspiration'][0]
    }

@tool
def calculate_crop_water_need(et0: float, crop: str, growth_stage: str) -> dict:
    """Calculates crop water requirement using Kc coefficient"""
    kc = get_kc(crop, growth_stage)
    etc = et0 * kc
    
    return {
        "et0": et0,
        "kc": kc,
        "etc_mm_per_day": etc,
        "recommended_irrigation_mm": etc * 3
    }

@tool
def read_soil_moisture() -> dict:
    """Reads soil moisture from MQTT sensor"""
    global latest_moisture
    
    # Initialize MQTT if not done
    get_mqtt_client()
    
    # Wait a moment for fresh data
    time.sleep(0.5)
    
    moisture = latest_moisture
    return {
        "moisture_percent": moisture,
        "status": "low" if moisture < 60 else "adequate"
    }

@tool
def control_irrigation_pump(action: str, duration_seconds: int) -> dict:
    """Controls irrigation pump via MQTT"""
    message = {"action": action, "duration": duration_seconds}
    
    client = get_mqtt_client()
    if client:
        client.publish("farm/irrigation_command", str(message))
    
    print(f"Pump {action} for {duration_seconds}s")
    return {
        "status": "success",
        "action": action,
        "duration": duration_seconds
    }

@tool
def log_irrigation_event(moisture: float, amount: float, duration: int, crop: str, weather: str) -> dict:
    """Logs irrigation event to database"""
    next_irrigation = (datetime.now() + timedelta(days=3)).isoformat()
    log_irrigation(moisture, amount, duration, next_irrigation, crop, weather)
    
    return {
        "logged": True,
        "next_irrigation": next_irrigation
    }