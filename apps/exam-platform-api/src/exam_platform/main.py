from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from exam_platform.settings import settings
from languagepro_common.errors import register_error_handlers
from languagepro_common.logging import configure_logging, get_logger
from languagepro_common.middleware import RequestIdMiddleware

configure_logging(settings.LOG_LEVEL, settings.LOG_FORMAT)
log = get_logger(__name__)


@asynccontextmanager
async def lifespan(app: FastAPI):
    log.info("exam_platform_api_starting", env=settings.PYTHON_ENV)
    yield
    log.info("exam_platform_api_stopped")


app = FastAPI(
    title="LanguagePro AI — Exam Platform API",
    version="0.1.0",
    lifespan=lifespan,
    docs_url="/v1/docs",
    redoc_url="/v1/redoc",
    openapi_url="/v1/openapi.json",
)

app.add_middleware(RequestIdMiddleware)
app.add_middleware(
    CORSMiddleware,
    allow_origin_regex=r"https?://(.*\.)?(localhost|aiexam\.uz)(:\d+)?",
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
    expose_headers=["X-Request-Id"],
)

register_error_handlers(app)

from exam_platform.api.v1 import attempts, exams  # noqa: E402

app.include_router(exams.router, prefix="/v1")
app.include_router(attempts.router, prefix="/v1")


@app.get("/healthz")
async def healthz() -> dict:
    return {"status": "ok", "service": settings.SERVICE_NAME}


@app.get("/readyz")
async def readyz() -> dict:
    return {"status": "ready", "service": settings.SERVICE_NAME}


@app.get("/v1/info")
async def info() -> dict:
    return {
        "service": settings.SERVICE_NAME,
        "version": "0.1.0",
        "data_engine_url": settings.DATA_ENGINE_API_URL,
    }
