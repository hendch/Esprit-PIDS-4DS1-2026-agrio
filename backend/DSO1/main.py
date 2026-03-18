from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from langchain_groq import ChatGroq
import os
from dotenv import load_dotenv

load_dotenv()

from tools import (
    fetch_weather_data,
    calculate_crop_water_need,
    read_soil_moisture,
    control_irrigation_pump,
    log_irrigation_event
)
from database import init_db

app = FastAPI()

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

init_db()

llm = ChatGroq(
    api_key=os.getenv("GROQ_API_KEY"),
    model="llama-3.3-70b-versatile",  
    temperature=0
)

class IrrigationAgent:
    """Agent that makes irrigation decisions using LLM reasoning"""
    
    def __init__(self, llm):
        self.llm = llm
        self.tools = {
            'fetch_weather': fetch_weather_data,
            'calc_water': calculate_crop_water_need,
            'read_moisture': read_soil_moisture,
            'control_pump': control_irrigation_pump,
            'log_event': log_irrigation_event
        }
    
    def run(self, query):
        # Agent reasoning with LLM
        prompt = f"""You are an irrigation decision agent. 
        
Task: {query}

Available tools: fetch_weather, calc_water, read_moisture, control_pump, log_event

Reason through the decision step by step, then provide final recommendation."""

        reasoning = self.llm.invoke(prompt)
        
        # Execute tools based on reasoning
        return self._execute_decision(reasoning.content)
    
    def _execute_decision(self, reasoning):
        # Tool execution logic
        weather = self.tools['fetch_weather'].invoke({"lat": 36.8, "lon": 10.18})
        moisture = self.tools['read_moisture'].invoke({})
        
        if moisture['moisture_percent'] < 60:
            # Calculate irrigation duration
            duration = 900  # 15 minutes in seconds
            
            # Turn pump ON
            self.tools['control_pump'].invoke({"action": "ON", "duration_seconds": duration})
            
            # Log event
            self.tools['log_event'].invoke({
                "moisture": moisture['moisture_percent'],
                "amount": 20.0,  # mm of water
                "duration": duration,
                "crop": "wheat",
                "weather": str(weather)
            })
            
            return f"Agent Decision: Irrigate (moisture {moisture['moisture_percent']}%)"
        
        return f"Agent Decision: Skip (moisture adequate {moisture['moisture_percent']}%)"

agent = IrrigationAgent(llm)

@app.post("/api/check-irrigation")
async def check_irrigation(data: dict):
    query = f"Should I irrigate {data['crop']} at {data['lat']},{data['lon']}?"
    result = agent.run(query)
    return {"decision": result}

@app.get("/api/irrigation-history")
async def get_history():
    import sqlite3
    conn = sqlite3.connect('irrigation.db')
    c = conn.cursor()
    c.execute('SELECT * FROM irrigation_events ORDER BY timestamp DESC LIMIT 10')
    rows = c.fetchall()
    conn.close()
    return {"history": rows}

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)