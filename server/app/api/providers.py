"""API routes for managing provider credentials (LLM + Email)."""

import uuid

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from sqlalchemy import select, delete
from sqlalchemy.ext.asyncio import AsyncSession

from app.db.session import get_db
from app.db.models import ProviderCredential, ProviderType
from app.providers.credentials import encrypt_credentials, decrypt_credentials
from app.providers.llm import llm_registry
from app.providers.email import email_registry

router = APIRouter(prefix="/providers", tags=["providers"])


# ── Schemas ──────────────────────────────────────────────

class ConnectProviderRequest(BaseModel):
    workspace_id: str
    provider_type: str  # "llm" or "email"
    provider_id: str    # "openai", "anthropic", "sendgrid", etc.
    credentials: dict   # { "api_key": "...", ... }
    preferred_model: str | None = None
    monthly_budget: float | None = None


class ProviderResponse(BaseModel):
    id: str
    provider_type: str
    provider_id: str
    is_active: bool
    is_valid: bool
    preferred_model: str | None
    monthly_budget: float | None

    class Config:
        from_attributes = True


class ValidateResponse(BaseModel):
    valid: bool


class CredentialField(BaseModel):
    key: str
    label: str
    type: str = "password"  # "password", "text"
    placeholder: str = ""
    required: bool = True


class AvailableProvider(BaseModel):
    id: str
    name: str
    type: str
    models: list[dict] | None = None
    credential_fields: list[CredentialField] | None = None


# Map provider IDs to the credential fields the UI should show
EMAIL_CREDENTIAL_FIELDS: dict[str, list[CredentialField]] = {
    "sendgrid": [
        CredentialField(key="api_key", label="API Key", placeholder="SG.xxxx"),
    ],
    "resend": [
        CredentialField(key="api_key", label="API Key", placeholder="re_xxxx"),
    ],
    "mailgun": [
        CredentialField(key="api_key", label="API Key", placeholder="key-xxxx"),
        CredentialField(key="domain", label="Sending Domain", type="text", placeholder="mg.yourdomain.com"),
    ],
    "ses": [
        CredentialField(key="access_key_id", label="Access Key ID", placeholder="AKIA..."),
        CredentialField(key="secret_access_key", label="Secret Access Key", placeholder="wJalr..."),
        CredentialField(key="region", label="AWS Region", type="text", placeholder="us-east-1"),
    ],
    "postmark": [
        CredentialField(key="api_key", label="Server Token", placeholder="xxxx-xxxx-xxxx"),
    ],
    "gmail": [
        CredentialField(key="client_id", label="OAuth Client ID", type="text", placeholder="xxxx.apps.googleusercontent.com"),
        CredentialField(key="client_secret", label="OAuth Client Secret", placeholder="GOCSPX-xxxx"),
        CredentialField(key="refresh_token", label="Refresh Token", placeholder="1//xxxx"),
    ],
}


# ── Routes ───────────────────────────────────────────────

@router.get("/available")
async def list_available_providers() -> list[AvailableProvider]:
    """List all provider types the platform supports (no credentials needed)."""
    result = []
    for p in llm_registry.providers.values():
        result.append(AvailableProvider(
            id=p.id,
            name=p.name,
            type="llm",
            models=[
                {
                    "id": m.id,
                    "name": m.name,
                    "tier": m.tier.value,
                    "context_window": m.context_window,
                    "input_cost_per_1m": m.input_cost_per_1m,
                    "output_cost_per_1m": m.output_cost_per_1m,
                }
                for m in p.models
            ],
        ))
    for p in email_registry.providers.values():
        result.append(AvailableProvider(
            id=p.id,
            name=p.name,
            type="email",
            credential_fields=EMAIL_CREDENTIAL_FIELDS.get(p.id),
        ))
    return result


@router.get("/{workspace_id}")
async def list_connected_providers(
    workspace_id: str,
    db: AsyncSession = Depends(get_db),
) -> list[ProviderResponse]:
    """List all providers connected to a workspace."""
    result = await db.execute(
        select(ProviderCredential).where(
            ProviderCredential.workspace_id == workspace_id
        )
    )
    rows = result.scalars().all()
    return [
        ProviderResponse(
            id=r.id,
            provider_type=r.provider_type.value,
            provider_id=r.provider_id,
            is_active=r.is_active,
            is_valid=r.is_valid,
            preferred_model=r.preferred_model,
            monthly_budget=r.monthly_budget,
        )
        for r in rows
    ]


@router.post("/connect")
async def connect_provider(
    body: ConnectProviderRequest,
    db: AsyncSession = Depends(get_db),
) -> ProviderResponse:
    """Connect a provider by storing encrypted credentials."""
    # Validate provider exists
    ptype = ProviderType(body.provider_type)
    if ptype == ProviderType.LLM and not llm_registry.get(body.provider_id):
        raise HTTPException(400, f"Unknown LLM provider: {body.provider_id}")
    if ptype == ProviderType.EMAIL and not email_registry.get(body.provider_id):
        raise HTTPException(400, f"Unknown email provider: {body.provider_id}")

    # Encrypt credentials
    ciphertext, nonce = encrypt_credentials(body.credentials)

    cred = ProviderCredential(
        id=uuid.uuid4().hex[:24],
        workspace_id=body.workspace_id,
        provider_type=ptype,
        provider_id=body.provider_id,
        credentials_encrypted=ciphertext,
        nonce=nonce,
        preferred_model=body.preferred_model,
        monthly_budget=body.monthly_budget,
    )
    db.add(cred)
    await db.commit()
    await db.refresh(cred)

    return ProviderResponse(
        id=cred.id,
        provider_type=cred.provider_type.value,
        provider_id=cred.provider_id,
        is_active=cred.is_active,
        is_valid=cred.is_valid,
        preferred_model=cred.preferred_model,
        monthly_budget=cred.monthly_budget,
    )


@router.post("/{credential_id}/validate")
async def validate_provider(
    credential_id: str,
    db: AsyncSession = Depends(get_db),
) -> ValidateResponse:
    """Test if stored credentials are valid."""
    result = await db.execute(
        select(ProviderCredential).where(ProviderCredential.id == credential_id)
    )
    cred = result.scalar_one_or_none()
    if not cred:
        raise HTTPException(404, "Credential not found")

    raw = decrypt_credentials(cred.credentials_encrypted, cred.nonce)

    valid = False
    if cred.provider_type == ProviderType.LLM:
        from app.providers.llm.types import ProviderCredentials
        provider = llm_registry.get(cred.provider_id)
        if provider:
            valid = await provider.validate_credentials(ProviderCredentials(**raw))
    elif cred.provider_type == ProviderType.EMAIL:
        from app.providers.email.types import EmailCredentials
        provider = email_registry.get(cred.provider_id)
        if provider:
            valid = await provider.validate_credentials(EmailCredentials(**raw))

    # Update validity in DB
    cred.is_valid = valid
    await db.commit()

    return ValidateResponse(valid=valid)


@router.delete("/{credential_id}")
async def disconnect_provider(
    credential_id: str,
    db: AsyncSession = Depends(get_db),
) -> dict:
    """Remove a provider connection."""
    await db.execute(
        delete(ProviderCredential).where(ProviderCredential.id == credential_id)
    )
    await db.commit()
    return {"deleted": True}
