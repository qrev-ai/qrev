"""Shared task system for agent coordination.

Inspired by Claude Code's TeammateTool — agents coordinate through a shared
task list rather than direct messaging. This reduces coupling and makes
progress visible to users.
"""

import uuid
from datetime import datetime

from sqlalchemy import select, update
from sqlalchemy.ext.asyncio import AsyncSession

from app.db.models import AgentTask, AgentTaskStatus


def _new_id() -> str:
    return uuid.uuid4().hex[:24]


async def create_task(
    db: AsyncSession,
    workspace_id: str,
    session_id: str,
    agent_id: str,
    objective: str,
    parent_task_id: str | None = None,
) -> AgentTask:
    task = AgentTask(
        id=_new_id(),
        workspace_id=workspace_id,
        session_id=session_id,
        agent_id=agent_id,
        objective=objective,
        parent_task_id=parent_task_id,
        status=AgentTaskStatus.PENDING,
    )
    db.add(task)
    await db.flush()
    return task


async def update_task_status(
    db: AsyncSession,
    task_id: str,
    status: AgentTaskStatus,
    result: dict | None = None,
    tokens_used: int = 0,
    model_used: str | None = None,
    cost_usd: float = 0.0,
) -> None:
    values: dict = {"status": status, "updated_at": datetime.utcnow()}
    if result is not None:
        values["result"] = result
    if tokens_used:
        values["tokens_used"] = tokens_used
    if model_used:
        values["model_used"] = model_used
    if cost_usd:
        values["cost_usd"] = cost_usd

    await db.execute(update(AgentTask).where(AgentTask.id == task_id).values(**values))
    await db.flush()


async def get_task(db: AsyncSession, task_id: str) -> AgentTask | None:
    result = await db.execute(select(AgentTask).where(AgentTask.id == task_id))
    return result.scalar_one_or_none()


async def get_session_tasks(db: AsyncSession, session_id: str) -> list[AgentTask]:
    result = await db.execute(
        select(AgentTask)
        .where(AgentTask.session_id == session_id)
        .order_by(AgentTask.created_at)
    )
    return list(result.scalars().all())


async def get_sub_tasks(db: AsyncSession, parent_task_id: str) -> list[AgentTask]:
    result = await db.execute(
        select(AgentTask)
        .where(AgentTask.parent_task_id == parent_task_id)
        .order_by(AgentTask.created_at)
    )
    return list(result.scalars().all())
