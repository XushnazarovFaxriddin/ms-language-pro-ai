"""Domain errors with FastAPI handlers (RFC 9457 Problem Details).

Service-specific errors should subclass AppError.
Register handlers via `register_error_handlers(app)` in main.py.
"""

from typing import Any

from fastapi import FastAPI, Request
from fastapi.responses import JSONResponse


class AppError(Exception):
    status_code: int = 500
    error_type: str = "https://api.aiexam.uz/errors/internal"
    title: str = "Internal Error"

    def __init__(self, detail: str | None = None, **extra: Any) -> None:
        self.detail = detail or self.title
        self.extra = extra
        super().__init__(self.detail)


class ValidationError(AppError):
    status_code = 422
    error_type = "https://api.aiexam.uz/errors/validation"
    title = "Validation Error"


class NotFoundError(AppError):
    status_code = 404
    error_type = "https://api.aiexam.uz/errors/not-found"
    title = "Not Found"


class UnauthorizedError(AppError):
    status_code = 401
    error_type = "https://api.aiexam.uz/errors/unauthorized"
    title = "Unauthorized"


class ForbiddenError(AppError):
    status_code = 403
    error_type = "https://api.aiexam.uz/errors/forbidden"
    title = "Forbidden"


class ConflictError(AppError):
    status_code = 409
    error_type = "https://api.aiexam.uz/errors/conflict"
    title = "Conflict"


def _problem_response(request: Request, exc: AppError) -> JSONResponse:
    body: dict[str, Any] = {
        "type": exc.error_type,
        "title": exc.title,
        "status": exc.status_code,
        "detail": exc.detail,
        "instance": str(request.url.path),
    }
    if exc.extra:
        body["errors"] = exc.extra
    request_id = request.headers.get("x-request-id") or getattr(request.state, "request_id", None)
    if request_id:
        body["request_id"] = request_id
    return JSONResponse(
        status_code=exc.status_code,
        content=body,
        media_type="application/problem+json",
    )


def register_error_handlers(app: FastAPI) -> None:
    @app.exception_handler(AppError)
    async def _app_error_handler(request: Request, exc: AppError) -> JSONResponse:
        return _problem_response(request, exc)
