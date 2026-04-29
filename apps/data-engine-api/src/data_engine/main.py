from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from languagepro_common.errors import register_error_handlers
from languagepro_common.logging import configure_logging, get_logger
from languagepro_common.middleware import RequestIdMiddleware

from data_engine.settings import settings

configure_logging(settings.LOG_LEVEL, settings.LOG_FORMAT)
log = get_logger(__name__)


@asynccontextmanager
async def lifespan(app: FastAPI):
    log.info("data_engine_api_starting", env=settings.PYTHON_ENV)
    yield
    log.info("data_engine_api_stopped")


app = FastAPI(
    title="LanguagePro AI — Data Engine API",
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

from data_engine.api.v1 import (  # noqa: E402
    blueprints,
    exports,
    generation,
    items,
    llm_usage,
    practice_catalogue,
    practice_content,
    research,
)

app.include_router(items.router, prefix="/v1")
app.include_router(blueprints.router, prefix="/v1")
app.include_router(generation.router, prefix="/v1")
app.include_router(llm_usage.router, prefix="/v1")
app.include_router(practice_content.router, prefix="/v1")
app.include_router(practice_catalogue.router, prefix="/v1")
app.include_router(exports.router, prefix="/v1")
app.include_router(research.router, prefix="/v1")


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
        "llm_default_model": settings.LLM_PROFILE_GENERATE_QUESTION,
        "openai_base_url": settings.OPENAI_BASE_URL,
    }
