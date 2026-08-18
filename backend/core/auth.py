import base64
import hashlib
import hmac
import json
import secrets
import time
from pathlib import Path
from typing import Any

from fastapi import Cookie, HTTPException, status

from core.config import settings

ROOT_DIR = Path(__file__).resolve().parents[2]
USERS_FILE = ROOT_DIR / "backend" / "users.json"
SESSION_COOKIE = "acervo_session"
SESSION_TTL_SECONDS = 60 * 60 * 12


def _password_hash(password: str, salt: bytes | None = None) -> str:
    salt = salt or secrets.token_bytes(16)
    derived = hashlib.pbkdf2_hmac("sha256", password.encode("utf-8"), salt, 210_000)
    return f"pbkdf2_sha256$210000${base64.urlsafe_b64encode(salt).decode()}${base64.urlsafe_b64encode(derived).decode()}"


def _password_matches(password: str, stored: str) -> bool:
    try:
        algorithm, iterations, salt_text, digest_text = stored.split("$", 3)
        if algorithm != "pbkdf2_sha256":
            return False
        salt = base64.urlsafe_b64decode(salt_text.encode())
        expected = base64.urlsafe_b64decode(digest_text.encode())
        actual = hashlib.pbkdf2_hmac("sha256", password.encode("utf-8"), salt, int(iterations))
        return hmac.compare_digest(actual, expected)
    except (ValueError, TypeError):
        return False


def load_users() -> list[dict[str, Any]]:
    if not USERS_FILE.exists():
        return []
    try:
        payload = json.loads(USERS_FILE.read_text(encoding="utf-8"))
        return payload if isinstance(payload, list) else []
    except (OSError, json.JSONDecodeError):
        return []


def save_users(users: list[dict[str, Any]]) -> None:
    USERS_FILE.parent.mkdir(parents=True, exist_ok=True)
    temporary = USERS_FILE.with_suffix(".tmp")
    temporary.write_text(json.dumps(users, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
    temporary.replace(USERS_FILE)


def verify_user(username: str, password: str) -> dict[str, str] | None:
    normalized = username.strip().lower()
    for user in load_users():
        if user.get("username", "").lower() == normalized and _password_matches(password, user.get("password_hash", "")):
            return {"username": user["username"], "display_name": user.get("display_name") or user["username"]}
    return None


def create_session(username: str) -> str:
    expires = int(time.time()) + SESSION_TTL_SECONDS
    payload = f"{username}|{expires}"
    signature = hmac.new(settings.SESSION_SECRET.encode("utf-8"), payload.encode("utf-8"), hashlib.sha256).hexdigest()
    return base64.urlsafe_b64encode(f"{payload}|{signature}".encode()).decode()


def read_session(token: str | None) -> dict[str, str] | None:
    if not token:
        return None
    try:
        decoded = base64.urlsafe_b64decode(token.encode()).decode()
        username, expires_text, signature = decoded.split("|", 2)
        payload = f"{username}|{expires_text}"
        if int(expires_text) < int(time.time()):
            return None
        expected = hmac.new(settings.SESSION_SECRET.encode("utf-8"), payload.encode("utf-8"), hashlib.sha256).hexdigest()
        if not hmac.compare_digest(signature, expected):
            return None
        user = next((item for item in load_users() if item.get("username", "").lower() == username.lower()), None)
        if not user:
            return None
        return {"username": user["username"], "display_name": user.get("display_name") or user["username"]}
    except (ValueError, TypeError, UnicodeDecodeError):
        return None


def require_user(acervo_session: str | None = Cookie(default=None)) -> dict[str, str]:
    user = read_session(acervo_session)
    if not user:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Login necessário")
    return user


def set_session_cookie(response: Any, token: str) -> None:
    response.set_cookie(
        key=SESSION_COOKIE,
        value=token,
        httponly=True,
        max_age=SESSION_TTL_SECONDS,
        samesite="lax",
        secure=settings.SESSION_COOKIE_SECURE,
        path="/",
    )


def clear_session_cookie(response: Any) -> None:
    response.delete_cookie(SESSION_COOKIE, path="/")


def hash_password(password: str) -> str:
    return _password_hash(password)
