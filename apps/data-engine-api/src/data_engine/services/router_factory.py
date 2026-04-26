"""Wire the LLMRouter once at app startup."""

from __future__ import annotations

from pathlib import Path

from languagepro_llm import CostLogger, LLMRouter, PromptRegistry
from data_engine.db import SessionLocal
from data_engine.services.llm_logger import DbCostLoggerSink
from data_engine.settings import settings


def build_router() -> LLMRouter:
    prompts = PromptRegistry(Path(settings.PROMPTS_DIR))
    sink = DbCostLoggerSink(SessionLocal, service_name=settings.SERVICE_NAME)
    return LLMRouter(
        settings=settings,  # type: ignore[arg-type]  (Settings inherits LLMSettings)
        prompts=prompts,
        cost_logger=CostLogger(sink),
    )


router_singleton: LLMRouter | None = None


def get_router() -> LLMRouter:
    global router_singleton
    if router_singleton is None:
        router_singleton = build_router()
    return router_singleton
