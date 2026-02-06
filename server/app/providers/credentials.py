"""Encrypted credential storage using AES-256-GCM."""

import json
import os

from cryptography.hazmat.primitives.ciphers.aead import AESGCM

from app.config import settings


def _get_key() -> bytes:
    """Get the 32-byte encryption key from settings."""
    hex_key = settings.credentials_encryption_key
    if not hex_key:
        raise ValueError(
            "CREDENTIALS_ENCRYPTION_KEY not set. "
            "Generate one with: python -c \"import secrets; print(secrets.token_hex(32))\""
        )
    return bytes.fromhex(hex_key)


def encrypt_credentials(data: dict) -> tuple[str, str]:
    """Encrypt a credentials dict. Returns (ciphertext_hex, nonce_hex)."""
    key = _get_key()
    aesgcm = AESGCM(key)
    nonce = os.urandom(12)
    plaintext = json.dumps(data).encode("utf-8")
    ciphertext = aesgcm.encrypt(nonce, plaintext, None)
    return ciphertext.hex(), nonce.hex()


def decrypt_credentials(ciphertext_hex: str, nonce_hex: str) -> dict:
    """Decrypt a credentials blob back to a dict."""
    key = _get_key()
    aesgcm = AESGCM(key)
    nonce = bytes.fromhex(nonce_hex)
    ciphertext = bytes.fromhex(ciphertext_hex)
    plaintext = aesgcm.decrypt(nonce, ciphertext, None)
    return json.loads(plaintext.decode("utf-8"))
