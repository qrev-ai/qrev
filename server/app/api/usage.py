"""API routes for usage tracking and cost reporting."""

from datetime import datetime, timedelta

from fastapi import APIRouter, Depends, Query
from sqlalchemy import select, func
from sqlalchemy.ext.asyncio import AsyncSession

from app.db.session import get_db
from app.db.models import UsageLog

router = APIRouter(prefix="/usage", tags=["usage"])


@router.get("/{workspace_id}")
async def get_usage_summary(
    workspace_id: str,
    days: int = Query(30, ge=1, le=365),
    db: AsyncSession = Depends(get_db),
) -> dict:
    """Get usage summary for a workspace over the last N days."""
    since = datetime.utcnow() - timedelta(days=days)

    result = await db.execute(
        select(
            func.sum(UsageLog.input_tokens).label("total_input_tokens"),
            func.sum(UsageLog.output_tokens).label("total_output_tokens"),
            func.sum(UsageLog.cost_usd).label("total_cost"),
            func.count(UsageLog.id).label("total_calls"),
        )
        .where(
            UsageLog.workspace_id == workspace_id,
            UsageLog.created_at >= since,
        )
    )
    row = result.one()

    return {
        "workspace_id": workspace_id,
        "period_days": days,
        "total_input_tokens": row.total_input_tokens or 0,
        "total_output_tokens": row.total_output_tokens or 0,
        "total_cost_usd": round(row.total_cost or 0, 4),
        "total_calls": row.total_calls or 0,
    }


@router.get("/{workspace_id}/breakdown")
async def get_usage_breakdown(
    workspace_id: str,
    days: int = Query(30, ge=1, le=365),
    group_by: str = Query("provider", regex="^(provider|agent|model)$"),
    db: AsyncSession = Depends(get_db),
) -> list[dict]:
    """Get usage breakdown grouped by provider, agent, or model."""
    since = datetime.utcnow() - timedelta(days=days)

    group_col = {
        "provider": UsageLog.provider_id,
        "agent": UsageLog.agent_id,
        "model": UsageLog.model,
    }[group_by]

    result = await db.execute(
        select(
            group_col.label("group"),
            func.sum(UsageLog.input_tokens).label("input_tokens"),
            func.sum(UsageLog.output_tokens).label("output_tokens"),
            func.sum(UsageLog.cost_usd).label("cost"),
            func.count(UsageLog.id).label("calls"),
        )
        .where(
            UsageLog.workspace_id == workspace_id,
            UsageLog.created_at >= since,
        )
        .group_by(group_col)
        .order_by(func.sum(UsageLog.cost_usd).desc())
    )

    return [
        {
            "group": row.group,
            "input_tokens": row.input_tokens or 0,
            "output_tokens": row.output_tokens or 0,
            "cost_usd": round(row.cost or 0, 4),
            "calls": row.calls or 0,
        }
        for row in result.all()
    ]
