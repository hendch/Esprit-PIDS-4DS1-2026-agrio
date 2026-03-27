from __future__ import annotations

import sqlite3
from datetime import datetime
from pathlib import Path

_DB_PATH = Path(__file__).resolve().parent.parent.parent.parent / "irrigation.db"


class IrrigationRepository:
    """SQLite-backed irrigation event store (MVP)."""

    def __init__(self, db_path: str | Path = _DB_PATH) -> None:
        self._db_path = str(db_path)

    def init_db(self) -> None:
        conn = sqlite3.connect(self._db_path)
        conn.execute(
            """
            CREATE TABLE IF NOT EXISTS irrigation_events (
                id              INTEGER PRIMARY KEY,
                timestamp       TEXT,
                moisture_level  REAL,
                water_amount    REAL,
                duration        INTEGER,
                next_irrigation TEXT,
                crop_type       TEXT,
                weather_conditions TEXT
            )
            """
        )
        conn.execute(
            """
            CREATE TABLE IF NOT EXISTS irrigation_schedules (
                id               INTEGER PRIMARY KEY,
                field_id         TEXT,
                target_date      TEXT,
                start_time       TEXT,
                duration_minutes INTEGER,
                water_volume     REAL,
                status           TEXT
            )
            """
        )
        conn.execute(
            """
            CREATE TABLE IF NOT EXISTS app_settings (
                key   TEXT PRIMARY KEY,
                value TEXT
            )
            """
        )
        # Ensure default autonomous state is False
        conn.execute(
            "INSERT OR IGNORE INTO app_settings (key, value) VALUES ('autonomous', 'false')"
        )
        conn.commit()
        conn.close()

    def log_event(
        self,
        moisture: float,
        amount: float,
        duration: int,
        next_date: str,
        crop: str,
        weather: str,
    ) -> None:
        conn = sqlite3.connect(self._db_path)
        conn.execute(
            """
            INSERT INTO irrigation_events
                (timestamp, moisture_level, water_amount, duration,
                 next_irrigation, crop_type, weather_conditions)
            VALUES (?, ?, ?, ?, ?, ?, ?)
            """,
            (datetime.now().isoformat(), moisture, amount, duration, next_date, crop, weather),
        )
        conn.commit()
        conn.close()

    def get_history(self, limit: int = 10) -> list[dict]:
        conn = sqlite3.connect(self._db_path)
        conn.row_factory = sqlite3.Row
        rows = conn.execute(
            "SELECT * FROM irrigation_events ORDER BY timestamp DESC LIMIT ?",
            (limit,),
        ).fetchall()
        conn.close()
        return [dict(r) for r in rows]

    def get_today_water_usage(self) -> float:
        today_str = datetime.now().strftime("%Y-%m-%d")
        conn = sqlite3.connect(self._db_path)
        # Sum water_amount for entries where timestamp starts with today's date
        row = conn.execute(
            "SELECT SUM(water_amount) as total FROM irrigation_events WHERE timestamp LIKE ?",
            (f"{today_str}%",),
        ).fetchone()
        conn.close()
        return float(row[0] or 0.0)

    def get_water_usage_history(self, limit: int = 7) -> dict:
        conn = sqlite3.connect(self._db_path)
        conn.row_factory = sqlite3.Row
        rows = conn.execute(
            """
            SELECT substr(timestamp, 1, 10) as date, SUM(water_amount) as total_amount
            FROM irrigation_events
            GROUP BY date
            ORDER BY date DESC
            LIMIT ?
            """,
            (limit,),
        ).fetchall()
        
        # Calculate overall water saved based on a standard baseline of 10mm per recorded day
        total_baseline = len(rows) * 10.0
        actual_total = sum(r['total_amount'] for r in rows)
        water_saved_pct = 0.0
        if total_baseline > 0:
            water_saved_pct = max(0.0, ((total_baseline - actual_total) / total_baseline) * 100)

        conn.close()
        return {
            "history": [dict(r) for r in rows],
            "water_saved_pct": water_saved_pct
        }

    def add_schedule(self, field_id: str, target_date: str, start_time: str, duration_minutes: int, water_volume: float) -> int:
        conn = sqlite3.connect(self._db_path)
        cursor = conn.execute(
            """
            INSERT INTO irrigation_schedules
                (field_id, target_date, start_time, duration_minutes, water_volume, status)
            VALUES (?, ?, ?, ?, ?, 'pending')
            """,
            (field_id, target_date, start_time, duration_minutes, water_volume),
        )
        conn.commit()
        last_id = cursor.lastrowid
        conn.close()
        return int(last_id or 0)

    def get_schedules(self, limit: int = 10) -> list[dict]:
        conn = sqlite3.connect(self._db_path)
        conn.row_factory = sqlite3.Row
        cursor = conn.execute(
            "SELECT id, field_id, target_date, start_time, duration_minutes, water_volume, status FROM irrigation_schedules ORDER BY id DESC LIMIT ?",
            (limit,)
        )
        rows = cursor.fetchall()
        conn.close()
        return [dict(row) for row in rows]

    def get_autonomous_state(self) -> bool:
        conn = sqlite3.connect(self._db_path)
        row = conn.execute("SELECT value FROM app_settings WHERE key = 'autonomous'").fetchone()
        conn.close()
        if row and row[0] == 'true':
            return True
        return False

    def set_autonomous_state(self, is_autonomous: bool) -> None:
        conn = sqlite3.connect(self._db_path)
        val = 'true' if is_autonomous else 'false'
        conn.execute("UPDATE app_settings SET value = ? WHERE key = 'autonomous'", (val,))
        conn.commit()
        conn.close()
