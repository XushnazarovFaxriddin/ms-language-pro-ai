from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from auth_api.api.v1 import auth as auth_router
from auth_api.api.v1 import me as me_router
from auth_api.settings import settings
from languagepro_common.errors import register_error_handlers
from languagepro_common.logging import configure_logging, get_logger
from languagepro_common.middleware import RequestIdMiddleware

configure_logging(settings.LOG_LEVEL, settings.LOG_FORMAT)
log = get_logger(__name__)


@asynccontextmanager
async def lifespan(app: FastAPI):
    log.info("auth_api_starting", env=settings.PYTHON_ENV)
    yield
    log.info("auth_api_stopped")


app = FastAPI(
    title="LanguagePro AI — Auth API",
    version="0.1.0",
    lifespan=lifespan,
    docs_url="/v1/docs",
    redoc_url="/v1/redoc",
    openapi_url="/v1/openapi.json",
)

app.add_middleware(RequestIdMiddleware)
# CORS handled by Caddy in dev; permissive here for direct calls
app.add_middleware(
    CORSMiddleware,
    allow_origin_regex=r"https?://(.*\.)?(localhost|aiexam\.uz)(:\d+)?",
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
    expose_headers=["X-Request-Id"],
)

register_error_handlers(app)

app.include_router(auth_router.router, prefix="/v1")
app.include_router(me_router.router, prefix="/v1")


@app.get("/healthz")
async def healthz() -> dict:
    return {"status": "ok", "service": settings.SERVICE_NAME}


@app.get("/readyz")
async def readyz() -> dict:
    # TODO: real DB ping
    return {"status": "ready", "service": settings.SERVICE_NAME}
