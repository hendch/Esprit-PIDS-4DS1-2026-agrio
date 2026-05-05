import asyncio
from app.persistence.db import AsyncSessionLocal
from sqlalchemy import text

async def reset():
    async with AsyncSessionLocal() as db:
        await db.execute(text('UPDATE vaccination_reminders SET last_reminded_at = NULL'))
        await db.execute(text('UPDATE price_alerts SET last_triggered_at = NULL'))
        await db.commit()
        print('all cooldowns reset')

asyncio.run(reset())
