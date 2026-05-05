import asyncio
import httpx

BASE = "http://localhost:8000"
EMAIL = "yacine_bencheikh@yahoo.fr"
PASSWORD = "Yanayassine,10"

async def main():
    async with httpx.AsyncClient(timeout=30) as client:
        r = await client.post(f"{BASE}/api/v1/auth/login", json={"email": EMAIL, "password": PASSWORD})
        token = r.json()["access_token"]
        headers = {"Authorization": f"Bearer {token}"}
        print("Logged in, token acquired")

        r2 = await client.post(f"{BASE}/api/v1/notifications/alerts/check-now", headers=headers)
        print("Price alerts:", r2.json())

        r3 = await client.post(f"{BASE}/api/v1/notifications/vaccination/check-now", headers=headers)
        print("Vaccination alerts:", r3.json())

asyncio.run(main())
