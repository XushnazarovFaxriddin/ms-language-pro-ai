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
            "skill": "listening",
            "name_uz": "Tinglash",
            "name_en": "Listening",
            "item_count": 2,
            "time_limit_seconds": 1800,
            "stop_rule": {"type": "budget", "max_items": 2},
        },
        {
            "skill": "reading",
            "name_uz": "O'qish",
            "name_en": "Reading",
            "item_count": 3,
            "time_limit_seconds": 3600,
            "stop_rule": {"type": "budget", "max_items": 3},
        },
        {
            "skill": "writing",
            "name_uz": "Yozish",
            "name_en": "Writing",
            "item_count": 1,
            "time_limit_seconds": 2400,
            "stop_rule": {"type": "budget", "max_items": 1},
        },
        {
            "skill": "speaking",
            "name_uz": "Gapirish",
            "name_en": "Speaking",
            "item_count": 1,
            "time_limit_seconds": 840,
            "stop_rule": {"type": "budget", "max_items": 1},
        },
    ],
}

CEFR_FULL_BLUEPRINT = {
    "code": "cefr_multilevel",
    "name_uz": "CEFR Multilevel Full Test",
    "name_en": "CEFR Multilevel Full Test",
    "sections": [
        {
            "skill": "listening",
            "name_uz": "Tinglash",
            "name_en": "Listening",
            "item_count": 2,
            "time_limit_seconds": 1500,
            "stop_rule": {"type": "budget", "max_items": 2},
        },
        {
            "skill": "reading",
            "name_uz": "O'qish",
            "name_en": "Reading",
            "item_count": 3,
            "time_limit_seconds": 2400,
            "stop_rule": {"type": "budget", "max_items": 3},
        },
        {
            "skill": "writing",
            "name_uz": "Yozish",
            "name_en": "Writing",
            "item_count": 1,
            "time_limit_seconds": 1800,
            "stop_rule": {"type": "budget", "max_items": 1},
        },
        {
            "skill": "speaking",
            "name_uz": "Gapirish",
            "name_en": "Speaking",
            "item_count": 1,
            "time_limit_seconds": 600,
            "stop_rule": {"type": "budget", "max_items": 1},
        },
    ],
}

# ── Listening / Writing / Speaking demo items ──
# Listening: same MCQ structure as reading, but with `audio_url` in payload (the
# student listens to a clip and answers an MCQ). For dev, we point at a publicly
# hosted ielts-style sample WAV; production uses gemini-2.5-flash-preview-tts.
LISTENING_Q_IDS = [UUID(f"00000000-0000-4000-a000-0000000002{i:02d}") for i in range(1, 3)]
LISTENING_QUESTIONS = [
    {
        "id": LISTENING_Q_IDS[0],
        "audio_url": "https://demo.aiexam.uz/audio/listening/library_dialog.mp3",
        "transcript": (
            "Hello, I'd like to register for a library card. — Of course. Could you tell me "
            "your name and current address? — My name is Aziza Karimova, and I live at "
            "12 Mustaqillik Street, Bukhara. — Great. The card costs 5,000 so'm and gives "
            "you access to all branches for one year."
        ),
        "prompt": "How much does the library card cost per year?",
        "options": [
            {"id": "A", "label": "2,000 so'm"},
            {"id": "B", "label": "5,000 so'm"},
            {"id": "C", "label": "10,000 so'm"},
            {"id": "D", "label": "Free"},
        ],
        "correct_option_id": "B",
        "distractor_rationale": "The dialogue states 5,000 so'm explicitly.",
        "difficulty_b": -0.3,
        "cefr": "B1",
    },
    {
        "id": LISTENING_Q_IDS[1],
        "audio_url": "https://demo.aiexam.uz/audio/listening/lecture_climate.mp3",
        "transcript": (
            "In today's lecture we will examine three drivers of urban heat: dense building "
            "materials that absorb solar radiation, the lack of vegetation in city centres, "
            "and emissions from vehicles. Of these, the absence of green space contributes "
            "the most measurable temperature increase, often raising readings by two to three "
            "degrees Celsius compared to surrounding suburbs."
        ),
        "prompt": "According to the lecturer, which factor most increases urban temperatures?",
        "options": [
            {"id": "A", "label": "Dense building materials"},
            {"id": "B", "label": "Lack of vegetation"},
            {"id": "C", "label": "Vehicle emissions"},
            {"id": "D", "label": "Industrial activity"},
        ],
        "correct_option_id": "B",
        "distractor_rationale": "The lecture explicitly states the absence of green space contributes the most.",
        "difficulty_b": 0.3,
        "cefr": "B2",
    },
]

# Writing: Task 2 essay prompt
WRITING_Q_IDS = [UUID(f"00000000-0000-4000-a000-0000000003{i:02d}") for i in range(1, 2)]
WRITING_QUESTIONS = [
    {
        "id": WRITING_Q_IDS[0],
        "task_type": "task2",
        "prompt": (
            "Some people believe that universities should only accept students with the "
            "highest grades, while others think that universities should be open to all "
            "students regardless of academic performance.\n\n"
            "Discuss both views and give your own opinion. Write at least 250 words."
        ),
        "word_limit_min": 250,
        "word_limit_max": 400,
        "time_limit_minutes": 40,
        "difficulty_b": 0.5,
        "cefr": "B2",
    },
]

# Speaking: Part 1 (interview), Part 2 (cue card), Part 3 (discussion)
SPEAKING_Q_IDS = [UUID(f"00000000-0000-4000-a000-0000000004{i:02d}") for i in range(1, 4)]
SPEAKING_QUESTIONS = [
    {
        "id": SPEAKING_Q_IDS[0],
        "type_": "speaking_part1_question",
        "part": 1,
        "prompt": (
            "Let's talk about your hometown.\n"
            "  • Where are you from?\n"
            "  • What do you like most about your hometown?\n"
            "  • Has it changed much in recent years?"
        ),
        "preparation_seconds": 0,
        "speaking_seconds": 60,
        "difficulty_b": -0.6,
        "cefr": "A2",
    },
    {
        "id": SPEAKING_Q_IDS[1],
        "type_": "speaking_part2_cue_card",
        "part": 2,
        "prompt": (
            "Describe a memorable trip you took. You should say:\n"
            "  • where you went\n"
            "  • who you went with\n"
            "  • what you did there\n"
            "and explain why this trip was memorable for you."
        ),
        "preparation_seconds": 60,
        "speaking_seconds": 120,
        "difficulty_b": 0.0,
        "cefr": "B1",
    },
    {
        "id": SPEAKING_Q_IDS[2],
        "type_": "speaking_part3_question",
        "part": 3,
        "prompt": (
            "Let's discuss travel and tourism more broadly.\n"
            "  • How has tourism changed in your country over the last decade?\n"
            "  • Some people argue that international travel harms local cultures. Do you agree?\n"
            "  • What balance should governments strike between promoting tourism and protecting heritage?"
        ),
        "preparation_seconds": 0,
        "speaking_seconds": 90,
        "difficulty_b": 0.6,
        "cefr": "B2",
    },
]

# Writing Task 1 (Academic — graph description)
WRITING_TASK1_Q_IDS = [UUID(f"00000000-0000-4000-a000-0000000005{i:02d}") for i in range(1, 2)]
WRITING_TASK1_QUESTIONS = [
    {
        "id": WRITING_TASK1_Q_IDS[0],
        "task_type": "task1_academic",
        "type_": "writing_task1_academic",
        "prompt": (
            "The chart below shows the percentage of households in three Central Asian "
            "countries that owned a personal computer between 2000 and 2024.\n\n"
            "Summarise the information by selecting and reporting the main features, "
            "and make comparisons where relevant. Write at least 150 words."
        ),
        "word_limit_min": 150,
        "word_limit_max": 250,
        "time_limit_minutes": 20,
        "difficulty_b": 0.2,
        "cefr": "B2",
    },
]

# Reading: True/False/Not Given + Matching + Sentence Completion
READING_EXTRA_Q_IDS = [UUID(f"00000000-0000-4000-a000-0000000006{i:02d}") for i in range(1, 4)]
READING_EXTRA_QUESTIONS = [
    {
        "id": READING_EXTRA_Q_IDS[0],
        "type_": "true_false_ng",
        "passage": (
            "The honeybee, Apis mellifera, has been kept by humans for at least 8,000 "
            "years. Beekeepers harvest honey, beeswax, propolis and royal jelly. While "
            "honey is consumed worldwide, beeswax has industrial applications ranging "
            "from cosmetics to electronics. Recent declines in bee populations have "
            "raised concerns among ecologists, although the precise causes remain "
            "debated."
        ),
        "prompt": "Beekeeping has been practised for over five millennia.",
        "options": [
            {"id": "A", "label": "True"},
            {"id": "B", "label": "False"},
            {"id": "C", "label": "Not Given"},
        ],
        "correct_option_id": "A",
        "distractor_rationale": "The passage states 'at least 8,000 years', which exceeds 5,000.",
        "difficulty_b": -0.2,
        "cefr": "B1",
    },
    {
        "id": READING_EXTRA_Q_IDS[1],
        "type_": "matching_information",
        "passage": (
            "(A) The first electric streetcars began running in 1881. "
            "(B) By 1920 most major cities had electric tram networks. "
            "(C) Buses gradually replaced trams in the mid-20th century due to lower "
            "infrastructure costs. "
            "(D) Modern light rail systems revive many of the principles of early trams."
        ),
        "prompt": "Which paragraph mentions the year electric streetcars first ran?",
        "options": [
            {"id": "A", "label": "Paragraph A"},
            {"id": "B", "label": "Paragraph B"},
            {"id": "C", "label": "Paragraph C"},
            {"id": "D", "label": "Paragraph D"},
        ],
        "correct_option_id": "A",
        "distractor_rationale": "Only paragraph A names the year (1881).",
        "difficulty_b": 0.1,
        "cefr": "B2",
    },
    {
        "id": READING_EXTRA_Q_IDS[2],
        "type_": "sentence_completion",
        "passage": (
            "The Aral Sea, once the world's fourth-largest lake, has shrunk to a "
            "fraction of its former size since the 1960s. Soviet-era irrigation projects "
            "diverted the Amu Darya and Syr Darya rivers to grow cotton, leaving the "
            "sea starved of inflow. Today the lakebed is a salt-encrusted desert known "
            "as the Aralkum."
        ),
        "prompt": "The shrinking of the Aral Sea began in the ____.",
        "options": [
            {"id": "A", "label": "1940s"},
            {"id": "B", "label": "1960s"},
            {"id": "C", "label": "1980s"},
            {"id": "D", "label": "2000s"},
        ],
        "correct_option_id": "B",
        "distractor_rationale": "The passage explicitly says 'since the 1960s'.",
        "difficulty_b": -0.4,
        "cefr": "B1",
    },
]

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
        skill_ids: dict[str, int] = {}
        for row in (
            await db.execute(text("SELECT code, id FROM data_engine.skills"))
        ).all():
            skill_ids[row[0]] = row[1]

        cefr_ids: dict[str, int] = {}
        for row in (await db.execute(text("SELECT code, id FROM data_engine.cefr_levels"))).all():
            cefr_ids[row[0]] = row[1]

        async def _ensure_question(q_id, *, skill_code, type_, payload, answer_key, cefr, b, est_seconds):
            existing = (
                await db.execute(select(Question.id).where(Question.id == q_id))
            ).scalar_one_or_none()
            if existing is not None:
                return False
            await db.execute(
                insert(Question).values(
                    id=q_id,
                    bank_id=BANK_ID,
                    type=type_,
                    status="approved",
                    skill_id=skill_ids[skill_code],
                    cefr_level_id=cefr_ids[cefr],
                    payload=payload,
                    answer_key=answer_key,
                    difficulty_b=b,
                    discrimination_a=1.0,
                    guessing_c=0.25 if type_ == "mcq_single" else 0.0,
                    source_license="ai_generated",
                    estimated_seconds=est_seconds,
                )
            )
            return True

        # Reading
        r_count = 0
        for q in SAMPLE_QUESTIONS:
            inserted = await _ensure_question(
                q["id"],
                skill_code="reading",
                type_="mcq_single",
                payload={
                    "passage": q["passage"],
                    "prompt": q["prompt"],
                    "options": q["options"],
                },
                answer_key={
                    "correct_option_id": q["correct_option_id"],
                    "distractor_rationale": q["distractor_rationale"],
                },
                cefr=q["cefr"],
                b=q["difficulty_b"],
                est_seconds=90,
            )
            if inserted:
                r_count += 1
        print(f"   ✅ {r_count} reading questions seeded (of {len(SAMPLE_QUESTIONS)} total)")

        # Listening
        l_count = 0
        for q in LISTENING_QUESTIONS:
            inserted = await _ensure_question(
                q["id"],
                skill_code="listening",
                type_="mcq_single",
                payload={
                    "prompt": q["prompt"],
                    "options": q["options"],
                    "audio_url": q["audio_url"],
                    "transcript": q["transcript"],  # admin-only; UI hides in exam
                },
                answer_key={
                    "correct_option_id": q["correct_option_id"],
                    "distractor_rationale": q["distractor_rationale"],
                },
                cefr=q["cefr"],
                b=q["difficulty_b"],
                est_seconds=120,
            )
            if inserted:
                l_count += 1
        print(f"   ✅ {l_count} listening questions seeded (of {len(LISTENING_QUESTIONS)} total)")

        # Writing
        w_count = 0
        for q in WRITING_QUESTIONS:
            inserted = await _ensure_question(
                q["id"],
                skill_code="writing",
                type_="writing_task2",
                payload={
                    "prompt": q["prompt"],
                    "task_type": q["task_type"],
                    "word_limit_min": q["word_limit_min"],
                    "word_limit_max": q["word_limit_max"],
                    "time_limit_minutes": q["time_limit_minutes"],
                },
                answer_key={
                    "rubric_ref": "ielts_writing_task2_v1",
                },
                cefr=q["cefr"],
                b=q["difficulty_b"],
                est_seconds=q["time_limit_minutes"] * 60,
            )
            if inserted:
                w_count += 1
        print(f"   ✅ {w_count} writing questions seeded (of {len(WRITING_QUESTIONS)} total)")

        # Speaking — Parts 1, 2, 3
        s_count = 0
        for q in SPEAKING_QUESTIONS:
            inserted = await _ensure_question(
                q["id"],
                skill_code="speaking",
                type_=q["type_"],
                payload={
                    "prompt": q["prompt"],
                    "part": q["part"],
                    "preparation_seconds": q["preparation_seconds"],
                    "speaking_seconds": q["speaking_seconds"],
                },
                answer_key={
                    "rubric_ref": f"ielts_speaking_part{q['part']}_v1",
                },
                cefr=q["cefr"],
                b=q["difficulty_b"],
                est_seconds=q["preparation_seconds"] + q["speaking_seconds"],
            )
            if inserted:
                s_count += 1
        print(f"   ✅ {s_count} speaking questions seeded (of {len(SPEAKING_QUESTIONS)} total)")

        # Writing — Task 1 (Academic graph)
        w1_count = 0
        for q in WRITING_TASK1_QUESTIONS:
            inserted = await _ensure_question(
                q["id"],
                skill_code="writing",
                type_=q["type_"],
                payload={
                    "prompt": q["prompt"],
                    "task_type": q["task_type"],
                    "word_limit_min": q["word_limit_min"],
                    "word_limit_max": q["word_limit_max"],
                    "time_limit_minutes": q["time_limit_minutes"],
                },
                answer_key={"rubric_ref": "ielts_writing_task1_v1"},
                cefr=q["cefr"],
                b=q["difficulty_b"],
                est_seconds=q["time_limit_minutes"] * 60,
            )
            if inserted:
                w1_count += 1
        print(f"   ✅ {w1_count} writing-task1 seeded (of {len(WRITING_TASK1_QUESTIONS)} total)")

        # Reading — extra question types (T/F/NG, matching, completion)
        r2_count = 0
        for q in READING_EXTRA_QUESTIONS:
            inserted = await _ensure_question(
                q["id"],
                skill_code="reading",
                type_=q["type_"],
                payload={
                    "passage": q["passage"],
                    "prompt": q["prompt"],
                    "options": q["options"],
                },
                answer_key={
                    "correct_option_id": q["correct_option_id"],
                    "distractor_rationale": q["distractor_rationale"],
                },
                cefr=q["cefr"],
                b=q["difficulty_b"],
                est_seconds=70,
            )
            if inserted:
                r2_count += 1
        print(f"   ✅ {r2_count} extra reading types seeded (of {len(READING_EXTRA_QUESTIONS)} total)")

        # ── 4. Seed/update blueprints (UPSERT so section structure stays fresh) ──
        from sqlalchemy import update as sa_update

        for bp_id, bp_data in [
            (BLUEPRINT_ID, IELTS_READING_BLUEPRINT),
            (BLUEPRINT_ID_IELTS, IELTS_FULL_BLUEPRINT),
            (BLUEPRINT_ID_CEFR, CEFR_FULL_BLUEPRINT),
        ]:
            existing_bp = (
                await db.execute(select(ExamBlueprint.id).where(ExamBlueprint.id == bp_id))
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
                print(f"   ✅ Blueprint {bp_data['code']} created ({len(bp_data['sections'])} sections)")
            else:
                await db.execute(
                    sa_update(ExamBlueprint)
                    .where(ExamBlueprint.id == bp_id)
                    .values(
                        code=bp_data["code"],
                        name_uz=bp_data["name_uz"],
                        name_en=bp_data["name_en"],
                        sections=bp_data["sections"],
                    )
                )
                print(f"   🔄 Blueprint {bp_data['code']} updated ({len(bp_data['sections'])} sections)")

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
