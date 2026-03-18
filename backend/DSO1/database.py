import sqlite3
from datetime import datetime

def init_db():
    conn = sqlite3.connect('irrigation.db')
    c = conn.cursor()
    c.execute('''
        CREATE TABLE IF NOT EXISTS irrigation_events (
            id INTEGER PRIMARY KEY,
            timestamp TEXT,
            moisture_level REAL,
            water_amount REAL,
            duration INTEGER,
            next_irrigation TEXT,
            crop_type TEXT,
            weather_conditions TEXT
        )
    ''')
    conn.commit()
    conn.close()

def log_irrigation(moisture, amount, duration, next_date, crop, weather):
    conn = sqlite3.connect('irrigation.db')
    c = conn.cursor()
    c.execute('''
        INSERT INTO irrigation_events 
        (timestamp, moisture_level, water_amount, duration, next_irrigation, crop_type, weather_conditions)
        VALUES (?, ?, ?, ?, ?, ?, ?)
    ''', (datetime.now().isoformat(), moisture, amount, duration, next_date, crop, weather))
    conn.commit()
    conn.close()