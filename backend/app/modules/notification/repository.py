from __future__ import annotations

import uuid
from datetime import datetime

from sqlalchemy import delete, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.modules.notification.models import DevicePushToken, PriceAlert


async def save_device_token(
    db: AsyncSession,
    user_id: str | uuid.UUID,
    token: str,
    platform: str,
) -> DevicePushToken:
    stmt = select(DevicePushToken).where(DevicePushToken.token == token)
    result = await db.execute(stmt)
    existing = result.scalar_one_or_none()

    if existing is not None:
        existing.platform = platform
        await db.commit()
        await db.refresh(existing)
        return existing

    new_token = DevicePushToken(
        id=uuid.uuid4(),
        user_id=uuid.UUID(str(user_id)),
        token=token,
        platform=platform,
    )
    db.add(new_token)
    await db.commit()
    await db.refresh(new_token)
    return new_token


async def get_device_tokens_for_user(
    db: AsyncSession,
    user_id: str | uuid.UUID,
) -> list[DevicePushToken]:
    stmt = select(DevicePushToken).where(
        DevicePushToken.user_id == uuid.UUID(str(user_id))
    )
    result = await db.execute(stmt)
    return list(result.scalars().all())


async def delete_device_token(db: AsyncSession, token: str) -> bool:
    stmt = delete(DevicePushToken).where(DevicePushToken.token == token)
    result = await db.execute(stmt)
    await db.commit()
    return result.rowcount > 0


async def get_alerts_for_user(
    db: AsyncSession,
    user_id: str | uuid.UUID,
) -> list[PriceAlert]:
    stmt = select(PriceAlert).where(
        PriceAlert.user_id == uuid.UUID(str(user_id))
    )
    result = await db.execute(stmt)
    return list(result.scalars().all())


async def create_alert(
    db: AsyncSession,
    user_id: str | uuid.UUID,
    data: dict,
) -> PriceAlert:
    alert = PriceAlert(
        id=uuid.uuid4(),
        user_id=uuid.UUID(str(user_id)),
        series_name=data["series_name"],
        condition=data["condition"],
        threshold=data["threshold"],
    )
    db.add(alert)
    await db.commit()
    await db.refresh(alert)
    return alert


async def update_alert(
    db: AsyncSession,
    alert_id: str | uuid.UUID,
    user_id: str | uuid.UUID,
    data: dict,
) -> PriceAlert | None:
    stmt = select(PriceAlert).where(
        PriceAlert.id == uuid.UUID(str(alert_id)),
        PriceAlert.user_id == uuid.UUID(str(user_id)),
    )
    result = await db.execute(stmt)
    alert = result.scalar_one_or_none()
    if alert is None:
        return None

    for field, value in data.items():
        setattr(alert, field, value)

    await db.commit()
    await db.refresh(alert)
    return alert


async def delete_alert(
    db: AsyncSession,
    alert_id: str | uuid.UUID,
    user_id: str | uuid.UUID,
) -> bool:
    stmt = delete(PriceAlert).where(
        PriceAlert.id == uuid.UUID(str(alert_id)),
        PriceAlert.user_id == uuid.UUID(str(user_id)),
    )
    result = await db.execute(stmt)
    await db.commit()
    return result.rowcount > 0


async def get_active_alerts_for_series(
    db: AsyncSession,
    series_name: str,
) -> list[PriceAlert]:
    stmt = select(PriceAlert).where(
        PriceAlert.series_name == series_name,
        PriceAlert.is_active.is_(True),
    )
    result = await db.execute(stmt)
    return list(result.scalars().all())


async def mark_alert_triggered(db: AsyncSession, alert_id: str | uuid.UUID) -> None:
    stmt = select(PriceAlert).where(PriceAlert.id == uuid.UUID(str(alert_id)))
    result = await db.execute(stmt)
    alert = result.scalar_one_or_none()
    if alert is not None:
        alert.last_triggered_at = datetime.utcnow()
        await db.commit()


async def get_distinct_alert_series(db: AsyncSession) -> list[str]:
    from sqlalchemy import distinct

    stmt = (
        select(distinct(PriceAlert.series_name))
        .where(PriceAlert.is_active.is_(True))
    )
    result = await db.execute(stmt)
    return [row[0] for row in result.fetchall()]


async def get_latest_price_for_series(db: AsyncSession, series_name: str):
    from app.modules.market_prices.db_models import MarketPriceHistory

    stmt = (
        select(MarketPriceHistory)
        .where(MarketPriceHistory.series_name == series_name)
        .where(MarketPriceHistory.region == "national")
        .order_by(MarketPriceHistory.price_date.desc())
        .limit(1)
    )
    result = await db.execute(stmt)
    return result.scalar_one_or_none()
