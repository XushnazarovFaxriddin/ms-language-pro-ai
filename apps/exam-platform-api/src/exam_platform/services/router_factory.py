"""Build a singleton Gemini/OpenAI-compatible router for exam-platform jobs."""

from __future__ import annotations

from pathlib import Path

from languagepro_llm import CostLogger, LLMRouter, PromptRegistry

from exam_platform.db import SessionLocal
from exam_platform.services.llm_logger import DbCostLoggerSink
from exam_platform.settings import settings


def build_router() -> LLMRouter:
    prompts = PromptRegistry(Path(settings.PROMPTS_DIR))
    sink = DbCostLoggerSink(SessionLocal, service_name=settings.SERVICE_NAME)
    return LLMRouter(
        settings=settings,
        prompts=prompts,
        cost_logger=CostLogger(sink),
    )


router_singleton: LLMRouter | None = None


def get_router() -> LLMRouter:
    global router_singleton
    if router_singleton is None:
        router_singleton = build_router()
    return router_singleton
