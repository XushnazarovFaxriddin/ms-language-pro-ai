from datetime import datetime
from typing import Literal
from uuid import UUID

from pydantic import BaseModel, ConfigDict, EmailStr, Field

Locale = Literal["uz", "en"]


class RegisterRequest(BaseModel):
    model_config = ConfigDict(extra="forbid")
    email: EmailStr
    password: str = Field(min_length=8, max_length=128)
    display_name: str | None = None
    locale: Locale = "uz"


class LoginRequest(BaseModel):
    model_config = ConfigDict(extra="forbid")
    email: EmailStr
    password: str


class UserOut(BaseModel):
    id: UUID
    email: EmailStr
    display_name: str | None
    roles: list[str]
    locale: Locale
    created_at: datetime


class LoginResponse(BaseModel):
    user: UserOut


class MeUpdate(BaseModel):
    model_config = ConfigDict(extra="forbid")
    display_name: str | None = None
    locale: Locale | None = None
