"""API routes for agent management and task tracking."""

from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession

from app.db.session import get_db
from app.agents.registry import agent_registry
from app.agents import task_system
from app.db.models import AgentTaskStatus

router = APIRouter(prefix="/agents", tags=["agents"])


@router.get("/")
async def list_agents() -> list[dict]:
    """List all available agents and their capabilities."""
    return agent_registry.list_agents()


@router.get("/tasks/{session_id}")
async def list_tasks(
    session_id: str,
    db: AsyncSession = Depends(get_db),
) -> list[dict]:
    """List all tasks for a session."""
    tasks = await task_system.get_session_tasks(db, session_id)
    return [
        {
            "id": t.id,
            "agent_id": t.agent_id,
            "status": t.status.value,
            "objective": t.objective,
            "result": t.result,
            "tokens_used": t.tokens_used,
            "model_used": t.model_used,
            "cost_usd": t.cost_usd,
            "parent_task_id": t.parent_task_id,
            "created_at": t.created_at.isoformat() if t.created_at else None,
        }
        for t in tasks
    ]


@router.get("/tasks/{session_id}/{task_id}")
async def get_task(
    session_id: str,
    task_id: str,
    db: AsyncSession = Depends(get_db),
) -> dict:
    """Get a specific task with its sub-tasks."""
    task = await task_system.get_task(db, task_id)
    if not task:
        return {"error": "Task not found"}

    sub_tasks = await task_system.get_sub_tasks(db, task_id)
    return {
        "id": task.id,
        "agent_id": task.agent_id,
        "status": task.status.value,
        "objective": task.objective,
        "result": task.result,
        "tokens_used": task.tokens_used,
        "model_used": task.model_used,
        "cost_usd": task.cost_usd,
        "sub_tasks": [
            {
                "id": st.id,
                "agent_id": st.agent_id,
                "status": st.status.value,
                "objective": st.objective,
            }
            for st in sub_tasks
        ],
    }
