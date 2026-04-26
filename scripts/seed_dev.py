"""Seed dev data: demo users, IELTS Reading blueprint, exam, sample questions.

Idempotent. Run after migrations:
    uv run python scripts/seed_dev.py
"""

from __future__ import annotations

import asyncio
import json
import sys
from decimal import Decimal
from uuid import UUID, uuid4

from sqlalchemy import insert, select, text
from sqlalchemy.ext.asyncio import async_sessionmaker, create_async_engine

# Allow running from repo root without install
sys.path.insert(0, "apps/auth-api/src")
sys.path.insert(0, "apps/data-engine-api/src")
sys.path.insert(0, "apps/exam-platform-api/src")
sys.path.insert(0, "python/languagepro_common/src")
sys.path.insert(0, "python/languagepro_llm/src")
sys.path.insert(0, "python/languagepro_irt/src")

from auth_api.models import Role, User, UserRole  # noqa: E402
from auth_api.services import passwords  # noqa: E402
from auth_api.settings import settings  # noqa: E402
from data_engine.models import ExamBlueprint, Question, QuestionBank  # noqa: E402
from exam_platform.models import Exam  # noqa: E402


# Fixed UUIDs for reproducible dev data
BANK_ID = UUID("00000000-0000-4000-a000-000000000001")
BLUEPRINT_ID = UUID("00000000-0000-4000-a000-000000000010")
EXAM_ID = UUID("00000000-0000-4000-a000-000000000020")

BLUEPRINT_ID_IELTS = UUID("00000000-0000-4000-a000-000000000011")
EXAM_ID_IELTS = UUID("00000000-0000-4000-a000-000000000021")

BLUEPRINT_ID_CEFR = UUID("00000000-0000-4000-a000-000000000012")
EXAM_ID_CEFR = UUID("00000000-0000-4000-a000-000000000022")

# Question IDs
Q_IDS = [UUID(f"00000000-0000-4000-a000-0000000001{i:02d}") for i in range(1, 6)]

IELTS_READING_BLUEPRINT = {
    "code": "ielts_reading_mini",
    "name_uz": "IELTS Reading Mini (Demo)",
    "name_en": "IELTS Reading Mini (Demo)",
    "sections": [
        {
            "skill": "reading",
            "name_uz": "O'qish bo'limi",
            "name_en": "Reading Section",
            "item_count": 5,
            "time_limit_seconds": 600,
            "stop_rule": {"type": "budget", "max_items": 5},
        }
    ],
}

IELTS_FULL_BLUEPRINT = {
    "code": "ielts_full_mock",
    "name_uz": "IELTS Academic Full Test",
    "name_en": "IELTS Academic Full Test",
    "sections": [
        {
            "skill": "reading",
            "name_uz": "O'qish bo'limi",
            "name_en": "Reading Section",
            "item_count": 5,  # Demo uchun 5 ta qo'yildi
            "time_limit_seconds": 3600,
            "stop_rule": {"type": "budget", "max_items": 5},
        }
    ],
}

CEFR_FULL_BLUEPRINT = {
    "code": "cefr_multilevel",
    "name_uz": "CEFR Multilevel Full Test",
    "name_en": "CEFR Multilevel Full Test",
    "sections": [
        {
            "skill": "reading",
            "name_uz": "O'qish bo'limi",
            "name_en": "Reading Section",
            "item_count": 5, # Demo uchun 5 ta qo'yildi
            "time_limit_seconds": 3600,
            "stop_rule": {"type": "budget", "max_items": 5},
        }
    ],
}

# 5 AI-generated (not real IELTS!) MCQ reading questions — open-licensed
SAMPLE_QUESTIONS = [
    {
        "id": Q_IDS[0],
        "passage": (
            "The development of renewable energy sources has become a global priority. "
            "Solar panels, which convert sunlight into electricity, have seen a dramatic "
            "decrease in cost over the past decade. In 2010, the average cost of solar "
            "panels was approximately $2.50 per watt. By 2023, this figure had dropped "
            "to around $0.30 per watt, making solar energy increasingly accessible to "
            "households and businesses worldwide."
        ),
        "prompt": "According to the passage, what was the approximate cost of solar panels per watt in 2023?",
        "options": [
            {"id": "A", "label": "$2.50"},
            {"id": "B", "label": "$1.00"},
            {"id": "C", "label": "$0.30"},
            {"id": "D", "label": "$0.50"},
        ],
        "correct_option_id": "C",
        "distractor_rationale": "A is the 2010 price; B and D are plausible but incorrect values.",
        "difficulty_b": -0.5,
        "cefr": "B1",
    },
    {
        "id": Q_IDS[1],
        "passage": (
            "Urban green spaces provide numerous benefits to city residents. Parks and "
            "gardens not only offer recreational opportunities but also play a crucial "
            "role in reducing air pollution, mitigating urban heat islands, and supporting "
            "biodiversity. Research has shown that access to green spaces can improve "
            "mental health, reduce stress levels, and encourage physical activity."
        ),
        "prompt": "Which of the following is NOT mentioned as a benefit of urban green spaces?",
        "options": [
            {"id": "A", "label": "Reducing air pollution"},
            {"id": "B", "label": "Increasing property values"},
            {"id": "C", "label": "Supporting biodiversity"},
            {"id": "D", "label": "Improving mental health"},
        ],
        "correct_option_id": "B",
        "distractor_rationale": "A, C, and D are explicitly mentioned. B (property values) is not in the passage.",
        "difficulty_b": 0.0,
        "cefr": "B1",
    },
    {
        "id": Q_IDS[2],
        "passage": (
            "The process of desalination — removing salt from seawater to produce fresh "
            "water — has long been considered an expensive solution to water scarcity. "
            "However, advances in reverse osmosis technology have significantly reduced "
            "energy consumption, making desalination more economically viable. Countries "
            "in the Middle East, particularly Saudi Arabia and the UAE, now rely on "
            "desalinated water for a substantial portion of their freshwater supply."
        ),
        "prompt": "What technological advance has made desalination more economically viable?",
        "options": [
            {"id": "A", "label": "Solar-powered pumps"},
            {"id": "B", "label": "Improvements in reverse osmosis"},
            {"id": "C", "label": "Chemical filtration methods"},
            {"id": "D", "label": "Underground water storage"},
        ],
        "correct_option_id": "B",
        "distractor_rationale": "Only reverse osmosis is mentioned. Others are plausible but not stated.",
        "difficulty_b": 0.3,
        "cefr": "B2",
    },
    {
        "id": Q_IDS[3],
        "passage": (
            "Cognitive scientists have demonstrated that bilingual individuals often "
            "outperform monolinguals on tasks requiring attentional control and cognitive "
            "flexibility. This 'bilingual advantage' is thought to arise from the constant "
            "need to manage two language systems, which strengthens executive function. "
            "Nevertheless, some researchers argue that the effect is smaller than initially "
            "claimed and may be influenced by socioeconomic and cultural factors."
        ),
        "prompt": "What is the main reason given for the 'bilingual advantage'?",
        "options": [
            {"id": "A", "label": "Bilinguals have larger vocabularies"},
            {"id": "B", "label": "Managing two languages strengthens executive function"},
            {"id": "C", "label": "Bilinguals receive better education"},
            {"id": "D", "label": "Speaking two languages improves memory capacity"},
        ],
        "correct_option_id": "B",
        "distractor_rationale": "The passage explicitly links the advantage to managing two systems/executive function.",
        "difficulty_b": 0.7,
        "cefr": "B2",
    },
    {
        "id": Q_IDS[4],
        "passage": (
            "The concept of 'circular economy' challenges the traditional linear model of "
            "'take, make, dispose.' In a circular economy, products and materials are kept "
            "in use for as long as possible through recycling, repairing, and repurposing. "
            "Proponents argue this approach not only reduces waste but also creates new "
            "economic opportunities. Critics, however, point out that implementing circular "
            "systems at scale requires significant infrastructure investment and changes in "
            "consumer behaviour that may prove difficult to achieve."
        ),
        "prompt": "According to critics, what is the main challenge of implementing a circular economy?",
        "options": [
            {"id": "A", "label": "Lack of consumer interest in recycled products"},
            {"id": "B", "label": "Higher costs of raw materials"},
            {"id": "C", "label": "Infrastructure investment and behavioural change"},
            {"id": "D", "label": "Insufficient government regulation"},
        ],
        "correct_option_id": "C",
        "distractor_rationale": "C directly matches critics' stated concerns (infrastructure + consumer behaviour).",
        "difficulty_b": 1.0,
        "cefr": "C1",
    },
]


async def main() -> None:
    engine = create_async_engine(settings.DATABASE_URL)
    Sessionmaker = async_sessionmaker(engine, expire_on_commit=False)

    async with Sessionmaker() as db:
        # ── 1. Seed users ──
        roles = (await db.execute(select(Role))).scalars().all()
        role_by_code = {r.code: r for r in roles}

        await _ensure_user(
            db,
            email="admin@aiexam.uz",
            password="admin12345",
            display_name="Demo Admin",
            roles=[role_by_code["superadmin"], role_by_code["content_admin"]],
        )
        await _ensure_user(
            db,
            email="bobomurod@aiexam.uz",
            password="content12345",
            display_name="Bobomurod",
            roles=[role_by_code["content_admin"]],
        )
        await _ensure_user(
            db,
            email="faxriddin@aiexam.uz",
            password="content12345",
            display_name="Faxriddin",
            roles=[role_by_code["content_admin"]],
        )
        await _ensure_user(
            db,
            email="student@aiexam.uz",
            password="student12345",
            display_name="Demo Talaba",
            roles=[role_by_code["student"]],
        )
        await db.commit()

        # ── 2. Seed question bank ──
        existing_bank = (
            await db.execute(
                text("SELECT id FROM data_engine.question_banks WHERE id = :bid"),
                {"bid": BANK_ID},
            )
        ).scalar_one_or_none()

        if existing_bank is None:
            await db.execute(
                insert(QuestionBank).values(
                    id=BANK_ID, name="Demo Reading Bank", scope="public"
                )
            )
            print("   ✅ Question bank created")
        else:
            print("   ⏭️  Question bank already exists")

        # ── 3. Seed sample questions ──
        # Look up skill and cefr IDs
        reading_skill_id = (
            await db.execute(
                text("SELECT id FROM data_engine.skills WHERE code = 'reading'")
            )
        ).scalar_one()

        cefr_ids = {}
        for row in (await db.execute(text("SELECT code, id FROM data_engine.cefr_levels"))).all():
            cefr_ids[row[0]] = row[1]

        q_count = 0
        for q in SAMPLE_QUESTIONS:
            existing = (
                await db.execute(
                    select(Question.id).where(Question.id == q["id"])
                )
            ).scalar_one_or_none()
            if existing is not None:
                continue
            await db.execute(
                insert(Question).values(
                    id=q["id"],
                    bank_id=BANK_ID,
                    type="mcq_single",
                    status="approved",
                    skill_id=reading_skill_id,
                    cefr_level_id=cefr_ids[q["cefr"]],
                    payload={
                        "passage": q["passage"],
                        "prompt": q["prompt"],
                        "options": q["options"],
                    },
                    answer_key={
                        "correct_option_id": q["correct_option_id"],
                        "distractor_rationale": q["distractor_rationale"],
                    },
                    difficulty_b=q["difficulty_b"],
                    discrimination_a=1.0,
                    guessing_c=0.25,
                    source_license="ai_generated",
                    estimated_seconds=90,
                )
            )
            q_count += 1
        print(f"   ✅ {q_count} questions seeded (of {len(SAMPLE_QUESTIONS)} total)")

        # ── 4. Seed blueprint ──
        for bp_id, bp_data in [
            (BLUEPRINT_ID, IELTS_READING_BLUEPRINT),
            (BLUEPRINT_ID_IELTS, IELTS_FULL_BLUEPRINT),
            (BLUEPRINT_ID_CEFR, CEFR_FULL_BLUEPRINT),
        ]:
            existing_bp = (
                await db.execute(
                    select(ExamBlueprint.id).where(ExamBlueprint.id == bp_id)
                )
            ).scalar_one_or_none()

            if existing_bp is None:
                await db.execute(
                    insert(ExamBlueprint).values(
                        id=bp_id,
                        code=bp_data["code"],
                        name_uz=bp_data["name_uz"],
                        name_en=bp_data["name_en"],
                        sections=bp_data["sections"],
                    )
                )
                print(f"   ✅ Blueprint {bp_data['code']} created")
            else:
                print(f"   ⏭️  Blueprint {bp_data['code']} already exists")

        # ── 5. Seed exam in exam_platform schema ──
        for ex_id, bp_data in [
            (EXAM_ID, IELTS_READING_BLUEPRINT),
            (EXAM_ID_IELTS, IELTS_FULL_BLUEPRINT),
            (EXAM_ID_CEFR, CEFR_FULL_BLUEPRINT),
        ]:
            existing_exam = (
                await db.execute(
                    select(Exam.id).where(Exam.id == ex_id)
                )
            ).scalar_one_or_none()

            if existing_exam is None:
                await db.execute(
                    insert(Exam).values(
                        id=ex_id,
                        blueprint_code=bp_data["code"],
                        name_uz=bp_data["name_uz"],
                        name_en=bp_data["name_en"],
                    )
                )
                print(f"   ✅ Exam {bp_data['name_en']} created")
            else:
                print(f"   ⏭️  Exam {bp_data['name_en']} already exists")

        await db.commit()

        print("\n✅ Seed complete:")
        print("   Users: admin@aiexam.uz / admin12345, student@aiexam.uz / student12345")
        print("   Blueprint: ielts_reading_mini (5 questions, reading)")
        print("   Exam: IELTS Reading Mini (Demo)")

    await engine.dispose()


async def _ensure_user(db, *, email: str, password: str, display_name: str, roles: list[Role]) -> None:
    existing = (await db.execute(select(User).where(User.email == email))).scalar_one_or_none()
    if existing is not None:
        return
    user = User(
        email=email,
        password_hash=passwords.hash_password(password),
        display_name=display_name,
        locale="uz",
    )
    db.add(user)
    await db.flush()
    for role in roles:
        db.add(UserRole(user_id=user.id, role_id=role.id))


if __name__ == "__main__":
    asyncio.run(main())
