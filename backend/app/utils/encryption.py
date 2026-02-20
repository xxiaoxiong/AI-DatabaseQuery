from cryptography.fernet import Fernet
from app.config import settings
import base64
import os


def _get_fernet() -> Fernet:
    key = settings.ENCRYPTION_KEY
    if not key:
        key = os.environ.get("ENCRYPTION_KEY", "")
    if not key:
        raise ValueError("ENCRYPTION_KEY is not configured")
    return Fernet(key.encode() if isinstance(key, str) else key)


def encrypt_password(plain: str) -> str:
    f = _get_fernet()
    return f.encrypt(plain.encode()).decode()


def decrypt_password(token: str) -> str:
    f = _get_fernet()
    return f.decrypt(token.encode()).decode()


def generate_key() -> str:
    return Fernet.generate_key().decode()
