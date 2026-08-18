from pydantic import BaseModel, Field
from fastapi import APIRouter, Depends, HTTPException, Response, status

from core.auth import clear_session_cookie, create_session, require_user, set_session_cookie, verify_user

router = APIRouter(prefix="/auth", tags=["Autenticação"])


class LoginPayload(BaseModel):
    username: str = Field(min_length=1, max_length=80)
    password: str = Field(min_length=1, max_length=200)


@router.post("/login")
def login(payload: LoginPayload, response: Response):
    user = verify_user(payload.username, payload.password)
    if not user:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Usuário ou senha inválidos")
    set_session_cookie(response, create_session(user["username"]))
    return {"user": user}


@router.get("/me")
def current_user(user: dict[str, str] = Depends(require_user)):
    return {"user": user}


@router.post("/logout")
def logout(response: Response):
    clear_session_cookie(response)
    return {"ok": True}
