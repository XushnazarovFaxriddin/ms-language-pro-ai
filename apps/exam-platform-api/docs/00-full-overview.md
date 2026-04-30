# LanguagePro AI — Exam Platform: To'liq Texnik Hujjat (Faxriddin)

> **Maqsad**: ushbu hujjat *exam-platform* qism tizimi (Faxriddin Xushnazarovning magistrlik dissertatsiyasi mavzusi) bo'yicha **dissertatsiyada foydalanish uchun yetarli darajada batafsil** ma'lumot beradi. Har bir bo'lim haqiqiy kodga (apps/exam-platform-api/, apps/exam-platform-web/, python/languagepro_irt/) tayanadi.
>
> **Mavzu nomi**: *"AI arxitekturalari yordamida baholash platformasini ishlab chiqish (LanguagePro AI misolida)"*
> **Universitet**: Buxoro Davlat Universiteti, *"70610101 — Kompyuter tizimlari va ularning dasturiy ta'minoti"* yo'nalishi
> **Mahsulot guvohnomasi**: LanguagePro AI (DGU)

---

## Mundarija

1. [Loyiha tavsifi va ilmiy yangiliklari](#1-loyiha-tavsifi-va-ilmiy-yangiliklari)
2. [Arxitektura va request lifecycle](#2-arxitektura-va-request-lifecycle)
3. [Texnologiyalar steki](#3-texnologiyalar-steki)
4. [Foydalanuvchi yo'llari (user journeys)](#4-foydalanuvchi-yollari)
5. [Ma'lumotlar bazasi sxemasi](#5-malumotlar-bazasi-sxemasi)
6. [REST API to'liq katalogi](#6-rest-api-toliq-katalogi)
7. [Adaptive imtihon yuritish (ExamRunner + IRT)](#7-adaptive-imtihon-yuritish)
8. [LLM-asosiy baholash pipeline'i (Writing/Speaking)](#8-llm-asosiy-baholash-pipelinei)
9. [Layered Feedback (Overview / Sentence / Word / Phoneme)](#9-layered-feedback)
10. [Audio handling (MediaRecorder → WAV → Gemini multimodal)](#10-audio-handling)
11. [Conversation Practice (Gemini Flash bilan)](#11-conversation-practice)
12. [Anti-cheat telemetry](#12-anti-cheat-telemetry)
13. [Sertifikat berish va verify (PDF + SHA-256)](#13-sertifikat-berish-va-verify)
14. [SRS Practice (Spaced Repetition)](#14-srs-practice)
15. [Personal Roadmap (LLM bilan generatsiya)](#15-personal-roadmap)
16. [Frontend arxitekturasi (Next.js 15 RSC)](#16-frontend-arxitekturasi)
17. [Multi-language UI (UZ + EN) va theming](#17-multi-language-ui)
18. [Xavfsizlik qatlami](#18-xavfsizlik-qatlami)
19. [Joylashtirish va observability](#19-joylashtirish-va-observability)
20. [Testlash va sifat kafolati](#20-testlash-va-sifat-kafolati)
21. [Tajribaviy baholash metodologiyasi](#21-tajribaviy-baholash)
22. [Dissertatsiya boblariga moslashtirish](#22-dissertatsiya-boblariga-moslashtirish)
23. [Glossary](#23-glossary)

---

## 1. Loyiha tavsifi va ilmiy yangiliklari

### 1.1 Maqsad

LanguagePro AI **Exam Platform** — talaba uchun yuza (frontend) va orqa servis (backend) bo'lib, Bobomurodning *Data Engine* yaratgan kalibratsiyalangan savol banki, IRT modeli va validatsiyasiga **iste'molchi** sifatida ishlaydi. Bu bo'limning topshirig'i:

| # | Topshiriq | Qanday hal qilingan |
|---|---|---|
| 1 | Adaptive IELTS/CEFR test topshirish | `ExamRunner` Next.js client + `services/attempt.py` (633 satr) |
| 2 | Yozma javoblarni LLM bilan baholash | `_score_writing_with_llm` + `score_writing/ielts/v1.yaml` prompt |
| 3 | Og'zaki javoblarni audio bilan baholash | `_score_speaking_with_llm` + Gemini multimodal audio input |
| 4 | Layered feedback (4 daraja) | overview / sentence / word / phoneme artefaktlari |
| 5 | AI conversation partneri | Gemini 2.5 Flash bilan `/v1/practice/conversation/sessions` |
| 6 | SRS (spaced repetition) practice | `seed_srs_from_attempt` + FSRS-asoslangan `_next_srs_state` |
| 7 | Personal Roadmap | Foydalanuvchi maqsad, vaqt, ko'nikmaga qarab LLM yarata oladi |
| 8 | Anti-cheat telemetry | Browser-side: focus loss, paste blocked, devtools detection, tab visibility |
| 9 | PDF Certificate (tampering-proof) | reportlab branded A4-landscape + SHA-256 + `/verify/<public_id>` ommaviy sahifa |
| 10 | Multi-locale (UZ + EN) + dark/light theme | next-intl + Tailwind v4 + next-themes |

### 1.2 Faxriddinning ilmiy yangiliklari (dissertatsiyada da'vo qilinadigan)

| # | Da'vo | Isbot kanali |
|---|---|---|
| 1 | Maximum Fisher Information item selection foydalanuvchi qobiliyatiga moslashgan testni `n=15` savolda `SE(θ) < 0.3`'ga olib keladi | sintetik 1000-talaba simulyatsiyasi + real pilot ma'lumoti |
| 2 | Multi-criteria LLM scoring (TR, CC, LR, GRA) IELTS oqligi: human raters bilan κ ≥ 0.65 | IRR study (10-11 hafta), 30 essay × 2 odam × LLM |
| 3 | Heuristic fallback bilan LLM xatosini "halol" yo'l bilan ko'rsatish: nol-uzunlikdagi essay → band cap 0; haqiqiy LLM xatosi → 422 + retry tugma | feedback service'dagi cap logikasi |
| 4 | Browser-native multimodal speech path: WAV (16kHz, mono, PCM) → base64 → Gemini multimodal → bitta chaqiruvda transcription + scoring | SpeakingItem.tsx + score_speaking_with_llm |
| 5 | SHA-256-asoslangan tamper-proof certificate (PDF bytes hash → `analytics.audit_events` + `exam_platform.certificates` + ommaviy `/verify/<public_id>`) | certificate_test.py + e2e screenshot |
| 6 | Anti-cheat telemetry threshold (focus_loss > 10, devtools_open > 0, paste_blocked > 5) → `audit_events` `anti_cheat_*` log + examiner UI | `apps/exam-platform-api/src/exam_platform/api/v1/anti_cheat.py` + `lib/anti-cheat.ts` |

---

## 2. Arxitektura va request lifecycle

### 2.1 Tizim diagrammasi

```
                    ┌────────────────────────┐
                    │ app.aiexam.uz          │
                    │ (exam-platform-web)    │
                    │ Next.js 15 RSC         │
                    └─────────┬──────────────┘
                              │ /api/exam/* (CSRF + lp_csrf)
                              │ /api/auth/* (login/refresh)
                              ▼
                  ┌────────────────────────┐
                  │ Caddy reverse proxy    │
                  └───┬──────────────┬─────┘
                      │              │
              auth-api│              │exam-platform-api
              port    │              │port 8001
              8002    │              │
                      ▼              ▼
            ┌──────────────┐   ┌────────────────────────┐
            │ FastAPI      │   │ FastAPI                │
            │ JWT cookies  │   │ build_app() middleware │
            └──────────────┘   └────────┬───────────────┘
                                        │
              ┌─────────────────────────┼─────────────────────┐
              ▼                         ▼                     ▼
     ┌─────────────────┐   ┌──────────────────┐    ┌──────────────────┐
     │ PostgreSQL 17   │   │ Redis 7          │    │ data-engine-api  │
     │ exam_platform   │   │ - LLM cache      │    │ S2S Bearer JWT   │
     │ schema          │   │ - rate-limit     │    │ - GET items/next │
     │                 │   │ - idempotency    │    │ - POST resp      │
     └─────────────────┘   │ - arq queue      │    │ - GET items/key  │
                           └──────────────────┘    └──────────────────┘
                                                            │
                                                            ▼
                                                    ┌─────────────┐
                                                    │ Gemini API  │
                                                    │ via OpenAI  │
                                                    │ SDK         │
                                                    └─────────────┘
```

### 2.2 Request lifecycle: `POST /v1/attempts/{id}/responses` (asosiy oqim)

1. **Browser** `app.aiexam.uz/api/exam/v1/attempts/{id}/responses` so'rovini POST qiladi (next.js `api.ts` fetch wrapper, `X-CSRF-Token` cookie'dan o'qib qo'shiladi).
2. **Caddy** `/api/exam/*` prefiksini yo'qotib `exam-platform-api:8000`'ga yuboradi.
3. **`build_app()` middleware'lari** (security headers → request id → CORS → rate-limit → idempotency → CSRF) — `60 req/min` bu endpoint uchun.
4. **`get_current_user`** dependency: `lp_access` cookie'dagi JWT'ni `verify` qiladi, `auth.users`'da topadi.
5. **`services.attempt.submit_response`** chaqiriladi — ~600 satr o'qiluvchi servis qatlami.
6. **Objective itemlar** uchun (MCQ): javob `data-engine /v1/items/{id}/key`'ni Bearer S2S JWT bilan oladi → `is_correct` belgilaydi.
7. **Section progression**: `_section_budget(section, blueprint)` orqali `stop_rule.max_items` yoki `item_count` ni hisoblaydi → `answered_in_section >= budget` bo'lsa keyingi section'ga o'tish.
8. **IRT update**: `_update_theta` (Newton-Raphson 1-2 step) — `θ_skill`'ni yangilaydi.
9. **Keyingi item**: `_next_item_from_de` → data-engine `/v1/items/next?theta=...` ni chaqiradi.
10. **Attempt complete bo'lsa**:
    - `ensure_attempt_completion_feedback` (heuristic placeholder bandlari)
    - `seed_srs_from_attempt` (SRS cards yaratish)
    - `audit_log("attempt_completed")`
11. **DB COMMIT** + Pydantic Response Schema → JSON.

### 2.3 Front-end + back-end o'zaro ta'siri

```
ExamRunner.tsx (client)
  ├─ Mount: bootstrap getNextItem (agar reload bo'lsa)
  ├─ AntiCheatTracker.start() (focus, paste, devtools, copy)
  ├─ Item rendering:
  │   ├─ MCQItem (radio buttons, A/B/C/D)
  │   ├─ ListeningItem (single-play audio, then MCQ)
  │   ├─ WritingItem (textarea, word counter, paste-blocked)
  │   └─ SpeakingItem (preparation timer → record → encode WAV → b64)
  ├─ Submit:
  │   POST /v1/attempts/{id}/responses {item_id, type, mcq_choice_id|text_answer|audio_base64, time_ms}
  │   ↓ backend submit_response()
  │   ↓ next_item returned in response (no extra round-trip)
  └─ Section transition / Attempt complete → router.replace(/results/{id})
```

---

## 3. Texnologiyalar steki

### 3.1 Asosiy texnologiyalar

| Qatlam | Texnologiya | Versiya | Sabab |
|---|---|---|---|
| Frontend framework | **Next.js** | 15.x | App Router, RSC, Turbopack, Server Actions |
| UI primitives | **shadcn/ui + Tailwind v4** | latest | Token-based theming (light/dark), copy-paste |
| Til | TypeScript | 5.6+ | Strict mode, typedRoutes |
| i18n | **next-intl** | latest | Server + client translation, `[locale]` segment |
| Theme | **next-themes** | latest | system / light / dark |
| Animation | **framer-motion** | latest | Item transitions, progress bar, grading panel |
| Icons | **lucide-react** | latest | Tree-shakeable SVG icons |
| Backend framework | **FastAPI** | 0.115+ | Pydantic v2, async, auto-OpenAPI |
| Pydantic | v2 | 2.9+ | strict types, fast validation |
| ORM | **SQLAlchemy 2.0** | 2.0.36+ | async, `Mapped[T]` |
| DB | **PostgreSQL 17** | 17.x | JSONB, partial indexes |
| Cache + queue | **Redis 7** + **arq** | 7.x | async job worker |
| Object storage | **MinIO** (dev) / **S3** (prod) | latest | Audio recordings (presigned PUT) |
| Auth | **Argon2id** + **HS256 JWT** | — | Cookie-based, apex domain |
| LLM SDK | **openai** Python | 1.x | Yagona kutubxona |
| LLM models | **Gemini 2.5 Pro / Flash** | latest | Score speaking/writing (Pro), conversation (Flash), feedback (Pro) |
| Audio encoding | **MediaRecorder API + WebAudio (PCM WAV)** | browser native | 16kHz mono WAV → b64 → Gemini multimodal |
| TTS (server-side) | reportlab → PDF; browser SpeechSynthesis | — | Conversation playback (browser TTS, low cost) |
| PDF render | **reportlab** | 4.5+ | A4 landscape branded certificate |
| Reverse proxy | Caddy 2 | latest | Auto-TLS prod |

### 3.2 Loyiha-darajadagi qarorlar

1. **Server Components + Client Islands** — barcha sahifalar default server-rendered (SEO + tezlik). Faqat MCQ/Writing/Speaking widgetlar va FeedbackSection client component.
2. **No GraphQL** — REST + OpenAPI yetarli; mahsulot kichik va schema barqaror.
3. **Cookie-based auth** — apex `.aiexam.uz` cookie'dagi JWT ko'p subdomenda yagona session beradi (`HttpOnly`, `SameSite=Lax`).

---

## 4. Foydalanuvchi yo'llari

### 4.1 Talaba yo'li (asosiy use case)

```
1. Ro'yxatdan o'tish / kirish (/login)
2. Dashboard (/exams) — mavjud testlar, oxirgi natijalar, joriy roadmap
3. Test boshlash (/exams → "Start" → /attempt/{id})
4. Section transition screens (Listening → Reading → Writing → Speaking)
5. Submit oxirgi item → /results/{id} (avtomatik redirect)
6. Results sahifasi:
   - Trophy + overall band (heuristic-driven, "tezda")
   - AI Grading Progress (animated, 30-90s)
   - Real LLM-graded overview (4-skill bands, narrative, biggest opportunity)
   - Layered feedback (Sentence, Word, Phoneme akkordionlar)
   - Certificate Panel (Pro+ entitlement; "Issue Certificate" → PDF download)
7. Practice (/exams/practice) — SRS karta navbati (avtomatik xato javoblardan to'lganadi)
8. Conversation (/exams/conversation) — Gemini Flash bilan og'zaki suhbat
9. Roadmap (/exams/roadmap) — shaxsiy reja, regenerate imkoniyati
10. History (/exams/results) — barcha o'tgan urinishlar
```

### 4.2 Examiner / Researcher yo'li

```
1. Examiner: imtihonlar tarixi, anti-cheat alarmlari, manual grade override
2. Researcher: data-engine'dan IRT, DIF, IRR ma'lumotlarini eksport
```

(Researcher faqat data-engine admin UI'da ishlaydi — Bobomurodning hujjatiga qarang.)

---

## 5. Ma'lumotlar bazasi sxemasi

### 5.1 `exam_platform` schema jadvallari (haqiqiy `models.py`'dan)

```
exam_platform
├── exams                   ← imtihon tomoshabinlari (blueprint snapshot)
├── exam_attempts           ← bitta talaba bitta urinishi
├── attempt_responses       ← har bir item-javob
├── audio_recordings        ← speaking audio meta (MinIO key)
├── llm_scoring_runs        ← LLM scoring auditi
├── scoring_results         ← yakuniy bandlar
├── feedback_artifacts      ← layered feedback (overview/sentence/word/phoneme)
├── roadmaps                ← shaxsiy reja
├── srs_cards               ← spaced-repetition kartalari
├── drill_attempts          ← drill mashqlari
├── user_mastery            ← code → mastery (0..1)
├── conversation_sessions   ← AI suhbat sessiyalari
├── conversation_turns      ← har bir turn (user audio + agent javobi)
├── certificates            ← PDF SHA-256 yozuvlari
└── llm_calls               ← per-call cost log (audit)
```

### 5.2 Asosiy jadvallar batafsil

#### `exam_platform.exams`
| Ustun | Tip | Izoh |
|---|---|---|
| `id` | UUID PK | |
| `blueprint_code` | varchar(64) UNIQUE | data-engine'dagi blueprint code'ga mos |
| `name_uz`, `name_en` | text | |
| `is_active` | bool | |
| `created_at` | timestamptz | |

#### `exam_platform.exam_attempts`
| Ustun | Tip | Izoh |
|---|---|---|
| `id` | UUID PK | |
| `user_id` | UUID FK→auth.users | |
| `exam_id` | UUID FK→exams | |
| `state` | varchar(16) | `in_progress`, `completed`, `abandoned`, `expired` |
| `blueprint_snapshot` | jsonb | Imtihon strukturasi snapshot (sections list, time limits) |
| `current_section_index` | smallint | |
| `current_item_snapshot` | jsonb | Foydalanuvchi reload qilsa qayta tiklash uchun |
| `current_item_issued_at` | timestamptz | Item-time tracking |
| `theta_estimates` | jsonb | `{listening: 0.4, reading: 0.6, writing: -0.1, speaking: 0.2}` |
| `theta_se` | jsonb | Standard errors |
| `score` | numeric(3,1) | overall band |
| `started_at`, `finished_at` | timestamptz | |
| `locale` | varchar(2) | `uz` yoki `en` (LLM feedback tilini belgilaydi) |

#### `exam_platform.attempt_responses` (eng band-jadval)
| Ustun | Tip | Izoh |
|---|---|---|
| `id` | UUID PK | |
| `attempt_id` | UUID FK→exam_attempts | CASCADE delete |
| `section_index` | smallint | |
| `item_id` | UUID | data_engine'dagi questions.id (cross-schema FK yo'q) |
| `item_snapshot` | jsonb | Question payload at view time (BEZ answer key — privacy) |
| `type` | varchar(48) | `mcq_single`, `writing_task2`, `speaking_part2_cue_card` va h.k. |
| `raw_answer` | jsonb | `{mcq_choice_id: "B"}` yoki `{text_answer: "..."}` yoki `{audio_base64: "..."}` |
| `is_correct` | boolean nullable | objective itemlar uchun, LLM-scoring kutilmasin uchun null |
| `partial_credit` | numeric(4,3) | T/F/NG kabi 3-option uchun (kelajakda) |
| `theta_at_answer` | numeric(8,4) | Item ko'rsatilgan paytdagi theta (IRT) |
| `skill` | varchar(16) | item snapshot'dan ajratib olingan |
| `time_ms` | integer | Browser-side time tracking |
| `answered_at` | timestamptz | |

#### `exam_platform.scoring_results`
| Ustun | Tip | Izoh |
|---|---|---|
| `response_id` | UUID PK FK→attempt_responses | UNIQUE — bitta javobga bitta yakuniy band |
| `source` | varchar(16) | `llm`, `human`, `hybrid` |
| `band` | numeric(3,1) | yakuniy IELTS band |
| `criteria` | jsonb | `{task_response: 6.5, coherence_cohesion: 6.0, lexical_resource: 5.5, grammatical_range_accuracy: 6.0, evidence_quotes: [...], confidence: 0.85, method: "llm_ielts_writing"}` |
| `feedback_uz`, `feedback_en` | text | LLM bilan generatsiyalangan |
| `finalized_at` | timestamptz | |

#### `exam_platform.llm_scoring_runs`
LLM scoring auditi (har chaqiruv saqlanadi):
| Ustun | Tip | Izoh |
|---|---|---|
| `id` | UUID PK | |
| `response_id` | UUID FK | |
| `rubric_ref` | varchar(128) | `ielts_writing_v1` |
| `model` | varchar(64) | |
| `prompt_version_id` | varchar(128) | |
| `raw_response` | jsonb | LLM JSON output to'liq |
| `criteria_scores` | jsonb | |
| `overall_band` | numeric(3,1) | |
| `confidence` | numeric(4,3) | |
| `cost_cents` | integer | |
| `latency_ms` | integer | |

#### `exam_platform.feedback_artifacts` (layered feedback)
| Ustun | Tip | Izoh |
|---|---|---|
| `id` | UUID PK | |
| `attempt_id` | UUID FK→exam_attempts | |
| `response_id` | UUID nullable FK→attempt_responses | overview attempt-darajada, sentence/word/phoneme response-darajada |
| `layer` | varchar(24) | `overview`, `sentence`, `word`, `phoneme` |
| `skill` | varchar(16) | `overall`, `writing`, `speaking` |
| `payload` | jsonb | layer-specific schema |
| `source` | varchar(16) | `llm` yoki `system` (heuristic fallback) |
| `model`, `prompt_version_id` | varchar(64) | |

#### `exam_platform.srs_cards`
FSRS-asoslangan spaced-repetition:
| Ustun | Tip | Izoh |
|---|---|---|
| `id` | UUID PK | |
| `user_id` | UUID | |
| `ref_type` | varchar(32) | `question`, `vocabulary`, `grammar` |
| `ref_id` | varchar(128) | reference id |
| `payload` | jsonb | savol prompt + correct answer + user's wrong answer (UI rendering uchun) |
| `stability` | numeric(8,3) | FSRS parameter (0.5..365 kun) |
| `difficulty` | numeric(8,3) | 1..10 |
| `due_at` | timestamptz | keyingi takrorlash sanasi |
| `reps` | integer | takrorlashlar soni |
| `lapses` | integer | "again" bosilganlar soni |
| `last_grade` | varchar(16) | `again|hard|good|easy` |

#### `exam_platform.user_mastery`
Per-skill yoki per-error-code o'rganganlik darajasi:
| Ustun | Tip | Izoh |
|---|---|---|
| `user_id` | UUID PK | |
| `code` | varchar(128) PK | masalan `skill_writing`, `error.grammar.subject_verb_agreement` |
| `mastery` | numeric(4,3) | 0.0..1.0 |
| `last_practiced_at` | timestamptz | |

#### `exam_platform.conversation_sessions` + `conversation_turns`
AI suhbat sessiyasi va turn'lari. Har turn ConversationTurnRecord'ga: `user_transcript`, `agent_response_text`, `feedback` (jsonb: fluency_band, grammar_issues[], lexis_suggestions[], encouragement_uz/en), `model`, `prompt_version_id`.

#### `exam_platform.certificates`
| Ustun | Tip | Izoh |
|---|---|---|
| `id` | UUID PK | |
| `attempt_id` | UUID UNIQUE FK | bitta urinishga bitta sertifikat |
| `public_id` | varchar(16) UNIQUE | Crockford alphabet 10-char |
| `user_id` | UUID FK | |
| `overall_band` | numeric(3,1) | |
| `cefr_level` | varchar(2) | |
| `display_name` | text | |
| `sha256` | char(64) | PDF bytes hash |
| `payload` | jsonb | bands snapshot + exam_name |
| `pdf_s3_key` | text | (hozircha `inline:b64:<id>` — kelajakda S3 push) |
| `issued_at` | timestamptz | |
| `revoked_at` | timestamptz nullable | |

### 5.3 `analytics.anti_cheat_events`
| Ustun | Tip | Izoh |
|---|---|---|
| `id` | bigint PK serial | |
| `attempt_id` | UUID | |
| `user_id` | UUID | |
| `event_type` | varchar(48) | `focus_loss`, `paste_blocked`, `devtools_open`, ... |
| `section_index` | smallint nullable | |
| `item_id` | UUID nullable | |
| `payload` | jsonb | extra ma'lumotlar (heightDiff, ts, va h.k.) |
| `ts` | timestamptz default now | |

### 5.4 `analytics.item_response_data`
IRT recalibration uchun "yopiq halqa" — har empirik javob bu jadvalga ko'chiriladi:

| Ustun | Tip | Izoh |
|---|---|---|
| `id` | bigint PK | |
| `item_id` | UUID | data_engine.questions FK (cross-schema) |
| `user_id` | UUID | |
| `is_correct` | bool | |
| `theta_at_answer` | numeric(8,4) | |
| `time_ms` | integer | |
| `attempt_id` | UUID | |
| `created_at` | timestamptz | |

`exam-platform` `submit_response`'da yoziladi → `data-engine`'ning `nightly_recalibration` jobini ovqatlantiradi (dissertatsiyaning **ikki bob orasidagi bog'lanish** isboti).

---

## 6. REST API to'liq katalogi

`/v1/...` prefix bilan, hammasi `Authorization: Bearer ...` yoki `lp_access` cookie talab qiladi (CSRF + cookie-based; S2S Bearer JWT'da CSRF skip).

### 6.1 Imtihon (`attempts.py`)

| Method | Path | Maqsad |
|---|---|---|
| `GET` | `/v1/exams` | Mavjud testlar (blueprint code'lari + nomlari) |
| `POST` | `/v1/attempts` | Yangi attempt boshlash; body: `{blueprint_code, locale}` |
| `GET` | `/v1/attempts/{id}` | Hozirgi state, blueprint snapshot, current item |
| `GET` | `/v1/attempts` | Foydalanuvchi attempt tarixi |
| `GET` | `/v1/attempts/{id}/next-item` | Reload bo'lgandan keyin keyingi itemni olish |
| `POST` | `/v1/attempts/{id}/responses` | Javob yuborish: MCQ choice / text / audio_base64 |

### 6.2 Feedback (`feedback.py`)

| Method | Path | Maqsad |
|---|---|---|
| `GET` | `/v1/attempts/{id}/feedback` | Attempt'ning hamma layered artefaktlari |
| `POST` | `/v1/attempts/{id}/feedback/overview` | LLM overview yarata olish (auto-trigger client-side) |
| `GET` | `/v1/me/feedback/recent` | Oxirgi 5 attempt feedback |
| `GET` | `/v1/responses/{id}/feedback` | Javobning sentence/word/phoneme artefaktlari |
| `POST` | `/v1/responses/{id}/feedback/analyse-writing` | Sentence/Word layer LLM chaqiruvi |
| `POST` | `/v1/responses/{id}/feedback/analyse-speaking` | Phoneme layer (kelajakda Whisper-CTC GOP) |
| `GET` | `/v1/responses/{id}/text-analysis` | NLP metrikalari (avg sentence length, vocab diversity, ...) |
| `GET` | `/v1/responses/{id}/sentence-feedback` | Sentence-level annotations |
| `GET` | `/v1/responses/{id}/word-upgrades` | A1→B2 word swap takliflar |
| `GET` | `/v1/responses/{id}/phoneme-feedback` | GOP (Goodness Of Pronunciation) bo'yicha |

### 6.3 Anti-cheat (`anti_cheat.py`)

| Method | Path | Maqsad |
|---|---|---|
| `POST` | `/v1/anti-cheat/events` (status 204) | Browser-side telemetry batch |
| `GET` | `/v1/me/attempts/{id}/anti-cheat/summary` | Examiner uchun xulosa |

### 6.4 Sertifikat (`certificates.py`)

| Method | Path | Maqsad |
|---|---|---|
| `POST` | `/v1/attempts/{id}/certificate` | Sertifikat berish (idempotent) |
| `GET` | `/v1/attempts/{id}/certificate.pdf` | PDF stream qaytarish |
| `GET` | `/v1/verify/{public_id}` | **Ommaviy** verify sahifasi (auth talab qilmaydi) |

### 6.5 Practice / SRS (`practice.py`)

| Method | Path | Maqsad |
|---|---|---|
| `GET` | `/v1/me/srs/queue` | Hozir takrorlash uchun kartalar |
| `POST` | `/v1/me/srs/grade` | `{card_id, grade}` — keyingi due_at hisoblash |
| `GET` | `/v1/me/mastery` | Skill mastery progress |
| `POST` | `/v1/practice/drills/{drill_id}/attempts` | Drill boshlash |
| `POST` | `/v1/practice/drills/{drill_id}/attempts/{attempt_id}/items` | Item qaytaruvi |
| `POST` | `/v1/practice/drills/{drill_id}/attempts/{attempt_id}/complete` | Drill yakunlash |

### 6.6 Roadmap (`roadmap.py`)

| Method | Path | Maqsad |
|---|---|---|
| `GET` | `/v1/me/roadmap` | Hozirgi roadmap |
| `POST` | `/v1/me/roadmap/regenerate` | LLM bilan yangi reja |
| `GET` | `/v1/me/roadmap/today` | Bugun uchun konkret topshiriqlar |

### 6.7 Conversation (`conversation.py`)

| Method | Path | Maqsad |
|---|---|---|
| `POST` | `/v1/practice/conversation/sessions` | Yangi sessiya boshlash |
| `POST` | `/v1/practice/conversation/sessions/{id}/turns` | Audio yuborish + LLM javobi |
| `POST` | `/v1/practice/conversation/sessions/{id}/end` | Sessiyani yakunlash |
| `GET` | `/v1/practice/conversation/sessions/active` | Faol sessiyani + turn tarixini olish |
| `GET` | `/v1/practice/conversation/sessions/{id}` | Sessiya + turnlar |

---

## 7. Adaptive imtihon yuritish

### 7.1 Blueprint snapshot

`POST /v1/attempts` chaqirilganda, data-engine'dagi blueprint **butun tarkibi snapshot bo'lib** `exam_attempts.blueprint_snapshot` jsonb'ga ko'chiriladi. Sabab: blueprint kelajakda o'zgarsa ham, talabaning urinishi o'zgartirilmagan strukturada qoladi (audit-trail).

Snapshot strukturasi:
```json
{
  "code": "ielts_full_mock",
  "name_uz": "IELTS Academic Full Test",
  "name_en": "IELTS Academic Full Test",
  "sections": [
    {"skill": "listening", "name_uz": "Tinglash", "name_en": "Listening",
     "item_count": 10, "time_limit_seconds": 1800,
     "stop_rule": {"type": "max_items", "max_items": 10}},
    {"skill": "reading",   ...},
    {"skill": "writing",   ...},
    {"skill": "speaking",  ...}
  ]
}
```

### 7.2 Section progression (`services/attempt.py`)

```python
async def submit_response(db, de, user_id, attempt_id, body):
    # 1. Attempt + section validation
    attempt = await _load_attempt(db, attempt_id)
    section = sections[attempt.current_section_index]
    skill = section["skill"]
    budget = _section_budget(section)  # stop_rule.max_items > item_count > default 5

    # 2. Score objective (call data-engine /key)
    is_correct = None
    if body.mcq_choice_id is not None:
        key = await de.get_answer_key(body.item_id)
        is_correct = (body.mcq_choice_id.strip().upper() == key.correct_option_id.strip().upper())

    # 3. Persist response
    response_id = await _insert_response(db, attempt, body, is_correct)
    # Push to analytics.item_response_data (cross-schema feed for IRT)
    await _record_analytics_response(db, attempt, body, is_correct)

    # 4. IRT theta update
    new_theta, new_se = _update_theta(attempt.theta_estimates[skill], item_a, item_b, is_correct)

    # 5. Section progression
    answered_in_section = await _count_responses_in_section(db, attempt_id, section_idx)
    section_complete = answered_in_section >= budget
    if section_complete:
        # Try next skill section
        new_idx, candidate = await _advance_to_next_skill_with_items(...)
        if candidate is None:
            attempt_complete = True; new_state = "completed"; finished_at = now()
        else:
            next_section_index = new_idx; next_item = candidate
    else:
        next_item = await _next_item_from_de(skill=skill, theta=new_theta, ...)

    # 6. UPDATE attempt + commit
    # 7. If attempt_complete: ensure_attempt_completion_feedback + seed_srs_from_attempt
    # 8. Return SubmitResponseOut(next_item, section_complete, attempt_complete, ...)
```

### 7.3 IRT theta update (real-time)

`_update_theta` qo'l-yozilgan Newton-Raphson 1 step:

```python
def _update_theta(theta_old: float, a: float, b: float, is_correct: bool) -> tuple[float, float]:
    p = 1.0 / (1.0 + math.exp(-a * (theta_old - b)))
    info = a * a * p * (1 - p)
    score_residual = (1 if is_correct else 0) - p
    delta = (a * score_residual) / max(info, 0.05)
    theta_new = theta_old + 0.5 * delta  # damping 0.5
    se = 1.0 / math.sqrt(max(info, 0.01))
    return theta_new, se
```

Bu — **online** estimation. Nightly batch py-irt MML estimation real (a, b, θ)'ni qayta hisoblaydi (data-engine).

### 7.4 Stop rule

- `stop_rule.max_items` (blueprint'da) — birinchi navbatda
- `item_count` — ikkinchi
- `5` — default

`SE(θ) < 0.3` qabul qilinadi (item bank yetarli kalibrlangan bo'lsa).

### 7.5 Bank exhausted graceful handling

Agar skill ichida yetarli item topilmasa (yoki barcha ko'rilgan):
```python
if next_item is None:
    section_complete = True
    new_idx, candidate = await _advance_to_next_skill_with_items(...)
    if candidate is None:
        attempt_complete = True
```

---

## 8. LLM-asosiy baholash pipeline'i

### 8.1 Writing scoring (`_score_writing_with_llm`, services/feedback.py:478)

```python
llm_response = await router.complete(
    LLMRequest(
        purpose="score_writing",
        prompt_id="score_writing/ielts",
        variables={
            "task_type": "task1_academic" | "task2",
            "task_prompt": "...",
            "essay": "<student essay>",
            "rubric": _writing_rubric_summary(),
            "target_band": 7.0,
        },
        user_id=user_id,
        attempt_id=attempt.id,
    )
)
score = WritingScore.model_validate(llm_response.parsed)
```

Pydantic schema:
```python
class WritingScore(BaseModel):
    task_response: float                 # 0..9
    coherence_cohesion: float
    lexical_resource: float
    grammatical_range_accuracy: float
    overall_band: float                  # rounded to 0.5
    evidence_quotes: list[str]           # quotations supporting the band
    confidence: float                    # 0..1
    feedback_uz: str
    feedback_en: str
```

`scoring_results` UPDATE: `source="llm"`, `band=overall_band`, `criteria=criteria_dict`, `feedback_uz/en`. `llm_scoring_runs` ham yoziladi (audit).

### 8.2 Confidence gate

Agar `confidence < 0.7` yoki `criteria max-min spread > 1.5 band` → `human_review_queue` (kelajakda — hozircha system flag).

### 8.3 Speaking scoring (`_score_speaking_with_llm`)

Multimodal: audio bytes + speaking rubric prompt → bitta LLM chaqiruvda transcription + 4 kriteriya bandlari + feedback:

```python
llm_response = await router.complete(
    LLMRequest(
        purpose="score_speaking",
        prompt_id="score_speaking/ielts",
        variables={...},
        audio_input=audio_bytes,
        audio_format="wav",  # Gemini accepts wav | mp3
    )
)
```

Pydantic schema:
```python
class SpeakingScore(BaseModel):
    user_transcript: str                 # Gemini-transcribed
    fluency_coherence: float
    lexical_resource: float
    grammatical_range_accuracy: float
    pronunciation: float
    overall_band: float
    pronunciation_issues: list[dict]     # [{word, issue_code}]
    grammar_issues: list[dict]
    confidence: float
    feedback_uz: str
    feedback_en: str
```

### 8.4 Heuristic fallback (yangilangan)

Agar LLM xato qilsa, deterministic fallback "halol" tarzda ishga tushiriladi (oldin "5+ band hammaga"  → endi cap-asoslangan):

```python
def _score_writing_heuristically(response):
    word_count = len(re.findall(r"[A-Za-z][A-Za-z'-]*", essay))
    if word_count == 0:
        cap = 0.0
    elif word_count < 40:
        cap = 2.5
    elif word_count < minimum * 0.4:
        cap = 4.0
    elif word_count < minimum * 0.8:
        cap = 5.0
    else:
        cap = 6.5
    # Sub-scores capped at min(cap, ...)
    criteria["is_estimate"] = True
    feedback = "Bu — vaqtinchalik baholash. AI tahlilini ishga tushiring."
```

Speaking uchun audio bytes yoki davomiyligi 0 bo'lsa cap=0.0; <15s bo'lsa cap=3.0 va h.k.

### 8.5 `_ensure_llm_scoring_for_attempt`

Generate-overview chaqirilganda barcha writing/speaking responselarda LLM scoring yo'q bo'lsa, paralel bajariladi (best-effort). Xato bo'lsa log'ga yoziladi va final overview LLM xatoliği tepaga propagate qilinadi (`ValidationError("AI grading is temporarily unavailable: ...")`).

### 8.6 Writing rubric summary

`_writing_rubric_summary()` IELTS Writing band descriptors (4 criteria × 9 band) qisqartirilgan formada LLM'ga prompt'da yuboriladi. Bu — academic resource: dissertatsiyaning **2-bobida** Bachman & Palmer (1996) framework'iga havola.

---

## 9. Layered Feedback

### 9.1 Layer 1 — Overview

`feedback/overview/v1.yaml` prompt; LLM input:
- `bands: {overall, listening, reading, writing, speaking}`
- `top_error_codes: [...]` (er taxonomy bo'yicha eng ko'p uchragan)
- `vocabulary_metrics: {ttr, avg_word_length, cefr_distribution}`
- `response_summary: [...]` (har skill bo'yicha qisqacha xulosa)
- `target_band: 7.0`
- `user_locale: "uz"`

Output Pydantic schema:
```python
class AttemptOverview(BaseModel):
    narrative_uz: str             # 2-3 sentence summary in UZ
    narrative_en: str
    biggest_opportunity_code: str # error_taxonomy code
    biggest_opportunity_uz: str   # 1-sentence
    biggest_opportunity_en: str
    next_step_ref: str            # "/exams/practice?focus=grammar"
    bands: dict[str, float]       # overall, listening, reading, writing, speaking
```

### 9.2 Layer 2 — Sentence (Writing-specific)

`feedback/sentence-annotate/v1.yaml`; har gap uchun:
- `text: "<original>"`
- `suggested_rewrite_uz/en: "<better version>"`
- `issues: [{code: "grammar.subject_verb_agreement", span_start: 12, span_end: 23}]`

### 9.3 Layer 3 — Word

`feedback/word-upgrade/v1.yaml`; A1/A2 so'zlarni B1/B2'ga ko'tarish takliflari:
- `word: "good"`
- `suggestions: [{lemma: "beneficial", cefr: "B2"}, ...]`
- `rationale_uz/en: "..."`

### 9.4 Layer 4 — Phoneme (Speaking-specific, kelajakda)

GOP (Goodness Of Pronunciation) per word. Hozircha LLM'ga `pronunciation_issues` ro'yxati so'raladi; kelajakda Whisper-large-v3 + CTC alignment + GOP score real fonemalar uchun.

### 9.5 Frontend rendering (`FeedbackSection.tsx`)

Akkordion: faqat bitta layer ochiq. Auto-trigger `generateOverview` mount'da agar `overview.source !== "llm"`. Animated "AI is grading" panel (`AIGradingProgress.tsx`) ko'rsatiladi 30-90s davomida.

---

## 10. Audio handling

### 10.1 Browser-side (SpeakingItem.tsx)

```javascript
const stream = await navigator.mediaDevices.getUserMedia({audio: true});
const audioContext = new AudioContext();      // typically 44.1 kHz
const source = audioContext.createMediaStreamSource(stream);
const processor = audioContext.createScriptProcessor(4096, 1, 1);
processor.onaudioprocess = (event) => {
    if (recording) samplesRef.push(event.inputBuffer.getChannelData(0));
};
// Connect: source → processor → silent gain → destination
```

### 10.2 WAV encoding

`encodeWav(chunks, sampleRate)`:
- 44-byte WAV header (RIFF + fmt + data)
- 16-bit PCM (`Int16Array`)
- mono (channels=1)
- sample rate = audioContext.sampleRate (typically 44100)

Result: `Blob({type: "audio/wav"})`.

### 10.3 Base64 encoding & POST

```javascript
const reader = new FileReader();
reader.readAsDataURL(blob);
const base64 = (await readerPromise).split(",")[1];
await api.exam.submitResponse(attemptId, {
    item_id, type: "speaking_part2_cue_card",
    audio_base64: base64,
    audio_format: "wav",
    time_ms: durationMs,
});
```

### 10.4 Server-side (services/attempt.py)

`audio_base64` → `_decode_audio_base64()` → bytes (≤15MB enforced) → stored in `attempt_responses.raw_answer.audio_base64`. Future: presigned PUT to MinIO/S3 for files > 5MB.

### 10.5 LLM multimodal call

`router.complete(LLMRequest(audio_input=bytes, audio_format="wav", ...))`. OpenAI SDK adapter audio'ni `messages[-1].content[1] = {"type":"input_audio","input_audio":{"data":<b64>,"format":"wav"}}` formatida joylaydi. Gemini OpenAI-compat endpoint qabul qiladi.

### 10.6 Yagona modal call benefit

**Whisper alohida transcription qatlami yo'q.** Faqat 1 ta LLM chaqiruv: transcription + scoring + feedback. Latency ~5-15s (Pro), ~3-8s (Flash).

---

## 11. Conversation Practice

### 11.1 Sessiya boshlash

`POST /v1/practice/conversation/sessions {topic, cefr_level, mode}` → `conversation_sessions` row.

### 11.2 Turn yuborish

```
client → record audio → encode WAV → b64 → POST /sessions/{id}/turns
                                     ↓
backend: services.conversation.add_turn
  - Decode b64 → bytes
  - Audio format normalize (webm → not supported → fallback)
  - prior_turns history yuklash (LLM context uchun)
  - LLMRequest(purpose="conversation_turn",
               prompt_id="conversation_turn/turn",
               audio_input=bytes,
               variables={topic, prior_turns, user_locale, cefr_level})
  - Profile: gemini-2.5-flash:0.4   ← FAST PATH
  - Output JSON: {user_transcript, agent_response_text,
                   fluency_band_estimate, grammar_issues,
                   pronunciation_issues, lexis_suggestions,
                   encouragement_uz, encouragement_en}
  - INSERT conversation_turns
  - Return ConversationTurnOut
```

### 11.3 Frontend playback (`speakAgentResponse`)

`window.speechSynthesis` (browser TTS) — voice pre-warmed on mount, `synth.speak(utterance)` chaqiruv synchronous click handler ichida (user gesture preserved). Long-utterance keepalive `pause/resume` har 12 soniyada. Speaker tugma → Stop tugmaga aylanadi rejaning ijro paytida.

### 11.4 History persistence

`useEffect` mount'da → `api.conversation.getActiveSession()` → mavjud sessiya va turn'lar avtomatik tiklanadi. End bosilganda → arxivlanadi (yangi sessiya keyingi visitda boshlanadi).

### 11.5 Gemini Flash performance

Gemini 2.5 Pro vs Flash:
- 2.5 Pro: 30s audio → ~15-25s response
- 2.5 Flash: 30s audio → **~4-8s response** (3-5× tezroq)

Score-speaking imtihon (high-stakes) Pro'da, conversation practice (low-stakes) Flash'da — qaror dissertatsiyaning **3-bobi** uchun foydali.

---

## 12. Anti-cheat telemetry

### 12.1 Browser tracker (`apps/exam-platform-web/src/lib/anti-cheat.ts`)

Mount'da `createAntiCheatTracker(attemptId).start()` registers:
- `document.addEventListener("visibilitychange", onVisibility)` → `tab_visibility_hidden/visible`
- `window.addEventListener("blur", onBlur)` → `focus_loss`
- `window.addEventListener("focus", onFocus)` → `focus_gain`
- `document.addEventListener("contextmenu", onContextMenu)` → `right_click_blocked`
- `document.addEventListener("copy", onCopy)` → `copy_blocked`
- `setInterval(checkDevtools, 2000)` — `window.outerHeight - innerHeight > 200` → `devtools_open` (heuristic)

Buffer batched 50 events yoki har 5 soniyada `flush()` → `POST /v1/anti-cheat/events`.

### 12.2 Server-side threshold

```python
SUSPICIOUS_THRESHOLDS = {
    "focus_loss": 10,
    "paste_blocked": 5,
    "devtools_open": 1,
    "audio_replay_attempt": 1,
}
```

Threshold oshirilsa → `audit_log("anti_cheat_<type>", payload={attempt_id, count}, ...)`.

### 12.3 Examiner UI (kelajakda)

`/v1/me/attempts/{id}/anti-cheat/summary` — examiner roli bilan o'qiladi. Per-event-type histogrammasi.

### 12.4 Cheat severity gradation

| Tip | Severity |
|---|---|
| 1-2 focus_loss | A — normal (page changes) |
| ≥10 focus_loss | C — large concern |
| 1+ devtools_open | C — manual review |
| 1+ paste_blocked | B — moderate (typed answer expected) |

---

## 13. Sertifikat berish va verify

### 13.1 Issue flow

```
POST /v1/attempts/{id}/certificate
  ↓ services.certificate.issue(...)
  ↓
1. compute_attempt_bands → overall band
2. _band_to_cefr → CEFR level
3. cert_svc.issue(display_name, overall, cefr, bands, exam_name):
   3a. _gen_public_id → 10-char Crockford alphabet (no I, L, O, 0)
   3b. _reportlab_render(ctx) → branded A4-landscape PDF (2-2.6KB)
   3c. sha256 = hashlib.sha256(pdf_bytes).hexdigest()
   3d. Re-render with sha_short to embed in PDF (deterministic + verifiable)
4. INSERT exam_platform.certificates (sha256, payload, public_id)
5. audit_log("attempt_completed", payload={certificate_public_id, overall_band})
6. Return {public_id, sha256, issued_at, verify_url, pdf_base64}
```

### 13.2 PDF rendering (`_reportlab_render`)

reportlab primitives bilan:
- A4 landscape (842 × 595 pt)
- Outer double-line frame (HexColor #1e3a8a navy)
- Brand bar `LANGUAGEPRO AI · AIEXAM.UZ`
- Title `Certificate of Achievement` (Helvetica-Bold 36)
- Recipient name (auto-shrunk if too wide)
- Subtitle: exam name + issued date
- Two badges: `IELTS Band X.X` + `CEFR XX` (rounded blue pills)
- Skill grid (Reading / Listening / Writing / Speaking) 4-column
- Footer: `Verify at aiexam.uz/verify/<id> · SHA-256 <short> · Issued <ISO>`

### 13.3 Verify (public)

`/verify/<public_id>` — auth talab qilmaydi:
- DB'da `certificates.public_id` qidiriladi
- Mavjud bo'lsa: `{valid: true, display_name, exam_name, overall_band, cefr_level, bands, issued_at, sha256}`
- Yo'q bo'lsa: `{valid: false, reason: "not_found"}`
- `revoked_at` mavjud: `{valid: false, reason: "revoked"}`

Frontend `[locale]/verify/[publicId]/page.tsx` chiroyli sertifikat ma'lumotini ko'rsatadi.

### 13.4 Tampering protection

- PDF bytes SHA-256 hash → `certificates.sha256`'ga yoziladi
- Footer'da `<sha_short>` chop etiladi (16 char)
- Verify sahifasida hash ko'rsatiladi: download qilingan PDF'ning hash'i bilan tenglikni qo'lda tekshirish mumkin

---

## 14. SRS Practice

### 14.1 FSRS-asoslangan algoritm

`_next_srs_state(card, grade)` → yangi `(stability, difficulty, due_at, lapses)`:

```python
if grade == "again":
    stability = max(0.5, stability * 0.6)
    difficulty = min(10.0, difficulty + 0.5)
    lapses += 1
    delay = timedelta(minutes=5)
elif grade == "hard":
    stability = max(0.5, stability * 1.2)
    difficulty = min(10.0, difficulty + 0.2)
    delay = timedelta(hours=6)
elif grade == "easy":
    stability = min(365.0, stability * 3.0)
    difficulty = max(1.0, difficulty - 0.3)
    delay = timedelta(days=max(2.0, stability))
else:  # good
    stability = min(365.0, stability * 2.0)
    difficulty = max(1.0, difficulty - 0.1)
    delay = timedelta(days=max(1.0, stability))
return stability, difficulty, now + delay, lapses
```

### 14.2 Auto-seeding `seed_srs_from_attempt`

Attempt yakunlanganda:
```python
async def seed_srs_from_attempt(db, user_id, attempt_id):
    rows = await db.execute(select(AttemptResponse).where(
        AttemptResponse.attempt_id == attempt_id,
        AttemptResponse.is_correct.is_(False),
    ))
    # Skip duplicates (already seeded)
    existing = ... # SELECT ref_id FROM srs_cards WHERE user_id AND ref_type='question' AND ref_id IN (...)
    for r in rows:
        if str(r.item_id) in existing:
            continue
        payload = _build_srs_payload(r.item_snapshot, r.raw_answer, r.skill, r.type)
        INSERT srs_cards (user_id, ref_type='question', ref_id=str(item_id),
                          payload, stability=1.0, difficulty=5.0, due_at=now)
        inserted += 1
    # Skill mastery decrement
    for skill in skills_missed:
        await _adjust_mastery(db, user_id, code=f"skill_{skill}", correct=False)
```

### 14.3 Backfill on first queue load

`get_srs_queue` first call: agar 0 kartalari bo'lsa va completed urinishi bor → barcha completed urinishlardan SRS seed (idempotent).

### 14.4 Frontend (`PracticeClient.tsx`)

Card render:
- Prompt + skill + CEFR badges
- MCQ options with A/B/C/D pillar
- "Show answer" toggle: yashil (correct) + qizil (your wrong pick)
- 4 grade tugmalar: Again (+5min), Hard (+6h), Good (+1d), Easy (multi-day)

---

## 15. Personal Roadmap

### 15.1 Generate flow

```
POST /v1/me/roadmap/regenerate
  body: {target_band, target_date, weekly_hours, focus_skill, weeks_until_target}
  ↓ services.roadmap.regenerate_roadmap(...)
  ↓ LLMRequest(purpose="feedback", prompt_id="feedback/roadmap_generate",
               variables={target_band, weeks, hours, skill, current_bands})
  ↓ Output: RoadmapPlan {milestones[], daily_targets, narrative_uz/en}
  ↓ INSERT/UPDATE roadmaps
```

### 15.2 RoadmapPlan schema

```python
class RoadmapMilestone(BaseModel):
    week: int                    # 1..N
    theme: str                   # "Coherence & Cohesion"
    skill_focus: list[str]       # ["writing", "reading"]
    expected_band_lift: float    # +0.3 ekspect

class DailyTargets(BaseModel):
    vocabulary_cards: int        # SRS karta soni
    drill_minutes: int
    mock_questions: int

class RoadmapPlan(BaseModel):
    milestones: list[RoadmapMilestone]
    daily_targets: DailyTargets
    narrative_uz: str
    narrative_en: str

class RoadmapOut(BaseModel):
    id: UUID
    user_id: UUID
    target_band: float
    target_date: date
    weekly_hours: int
    plan: RoadmapPlan
    predicted_band_at_target: dict  # {p10, p50, p90}
    created_at: datetime
```

### 15.3 Predicted band (P10/P50/P90)

Sintetik forecast: `current_band + weekly_lift × weeks` boshlang'ich, Monte Carlo (n=1000) gauss perturbation bilan kvartillar. **Note**: dissertatsiyada *"deterministic forecast" emas, "probabilistik prognoz"* sifatida qo'llaniladi.

### 15.4 UI (`RoadmapSetupForm.tsx` + `RoadmapRegenerateButton.tsx`)

- Setup mode: 5 input field, "Create roadmap" tugma
- Regenerate mode: modal, current values pre-filled, "Regenerate roadmap" tugma
- View: stats cards + milestones timeline (chap) + daily tasks card (o'ng)

---

## 16. Frontend arxitekturasi

### 16.1 Next.js 15 App Router

- `app/[locale]/...` — locale-prefixed (always)
- Server Components by default
- Client Components: `"use client"` directive bilan (faqat interaktiv elementlar)

### 16.2 Layout hierarchy

```
app/[locale]/layout.tsx                       ← root: html, NextIntlClientProvider, ThemeProvider
├── app/[locale]/page.tsx                     ← landing (redirect /login if no auth)
├── app/[locale]/login/                       ← login page
├── app/[locale]/exams/layout.tsx             ← DashboardLayout (sidebar + header)
│   ├── exams/page.tsx                        ← dashboard (hero + stats + exam cards + recent)
│   ├── exams/practice/page.tsx               ← SRS practice
│   ├── exams/conversation/page.tsx           ← AI partner
│   ├── exams/roadmap/page.tsx                ← personal plan
│   ├── exams/results/page.tsx                ← attempt history
│   ├── exams/certificates/page.tsx           ← issued certs list
│   └── exams/{settings,payments,...}
├── app/[locale]/attempt/[id]/page.tsx        ← AppHeader + ExamRunner client
├── app/[locale]/results/[id]/page.tsx        ← AppHeader + Trophy + FeedbackSection + CertificatePanel
├── app/[locale]/verify/[publicId]/page.tsx   ← public verify (no auth)
└── app/[locale]/history/page.tsx             ← all attempts
```

### 16.3 Universal `api.ts` fetch wrapper

`src/lib/api.ts` (~440 satr):
- `isBrowser` — runtime check
- `AUTH_API`, `EXAM_API` — relative or absolute base
- `call<T>(path, opts)` — fetch + JSON + ApiError + auto X-CSRF-Token from `lp_csrf`
- Namespaced API: `api.auth`, `api.exam`, `api.feedback`, `api.roadmap`, `api.practice`, `api.conversation`

### 16.4 ExamRunner state machine

```typescript
const [item, setItem] = useState(initialAttempt.current_item);
const [mcqChoice, setMcqChoice] = useState(null);
const [writingText, setWritingText] = useState("");
const [audioBase64, setAudioBase64] = useState(null);
// Per-skill answer state, reset on each new item
// Submit → optimistic feedback → 700ms delay → set new item / redirect to /results
```

Section transition screen `SectionTransition.tsx` har skill o'zgarganda paydo bo'ladi; talaba `Continue` bosguncha timer to'xtatilgan.

---

## 17. Multi-language UI

### 17.1 next-intl konfiguratsiyasi

`src/i18n/routing.ts`:
```typescript
export const routing = defineRouting({
    locales: ["uz", "en"],
    defaultLocale: "uz",
    localePrefix: "always",  // /uz/... yoki /en/... har doim
});
```

`middleware.ts` `createMiddleware(routing)` — non-prefixed URL'lar default locale'ga redirect.

### 17.2 Tarjimalar joylashuvi

`packages/i18n/src/{en,uz}.json` (yagona "single source of truth"):
- `Common.*` — appName, actions (login/logout/save/cancel)
- `Meta.*` — page metadata (title, description) localized
- `Dashboard.*` — `/exams` page (hero, stats, blueprintDesc, ...)
- `Exam.*` — `/attempt/...` (skills, listening/writing/speaking/transition)
- `Results.*` — `/results/...`
- `Certificate.*` + `Verify.*`
- `Conversation.*` — start, actions (play/stop), errors (TTS), labels
- `Practice.*` — empty state, grade buttons (Again/Hard/Good/Easy)
- `Roadmap.*` — setup form, hero, regenerate
- `Feedback.*` — title, sections (overview/sentence/word/phoneme), progress (animated stages)

Har key UZ va EN'da to'liq mos. Spell-check warning'lari (CEFR, IELTS, Analysing va h.k.) intentsional — domain so'zlar.

### 17.3 Light + dark theme

`next-themes` `attribute="class" defaultTheme="system" enableSystem`. Tailwind v4 `@theme` block CSS variables:
```css
@theme {
  --color-bg: light-dark(#ffffff, #050505);
  --color-fg: light-dark(#0f172a, #f8fafc);
  --color-primary: #3b82f6;
  --color-primary-fg: #ffffff;
  --color-muted: light-dark(#f1f5f9, #1e293b);
  --color-muted-fg: light-dark(#64748b, #94a3b8);
  --color-border: light-dark(#e2e8f0, #1e293b);
}
```

Komponentlar `var(--color-...)` bilan, hover/active `hover:bg-...` bilan.

### 17.4 Locale toggling

`DashboardHeader.tsx` Globe icon + `UZ/EN`. `router.replace(pathname, {locale: nextLocale})` next-intl bilan.

---

## 18. Xavfsizlik qatlami

### 18.1 Identical middleware stack

Bobomurodning hujjatidagi xuddi shu `build_app()`:
- SecurityHeadersMiddleware
- RequestIdMiddleware
- CORSMiddleware (origin regex)
- _LazyIdempotency (Redis)
- _LazyRateLimit (Redis token-bucket)
- CSRFMiddleware (double-submit)

Exam-platform rules:
```python
rate_limit_rules=[
    ("/v1/attempts", 60, 60),         # 60/min — start/submit
    ("/v1/conversation", 30, 60),     # 30/min — AI calls expensive
    ("/v1/anti-cheat", 600, 60),      # 600/min — telemetry hot path
]
```

### 18.2 Cookie-based JWT auth

`auth-api`'dan kelgan `lp_access` (HS256, 15 min TTL), `lp_refresh` (30 days, opaque), `lp_csrf` (32 bytes, JS-readable). Apex domain `.aiexam.uz`. SameSite=Lax (access), Strict (refresh).

### 18.3 Audit log

`audit_log()` chaqiriladi:
- attempt_started, attempt_completed, attempt_abandoned
- section_completed
- anti_cheat_focus_loss, anti_cheat_paste_blocked, anti_cheat_devtools_open
- attempt_completed (sertifikat berilganda payload'da `certificate_public_id`)

PII redacted: `password`, `token`, `card`, `cvv` keys → `[REDACTED]`.

### 18.4 Anti-cheat protection

Browser-side bloklash (lib/anti-cheat.ts):
- `e.preventDefault()` on `contextmenu` (right-click bloklangan)
- `e.preventDefault()` on `copy` (matn nusxalanmaydi)
- WritingItem'da `onPaste={(e) => e.preventDefault()}` + `setPasteWarn`

Server-side: threshold-based audit promotion.

### 18.5 Real `/readyz` probe

```python
@app.get("/readyz")
async def readyz():
    db_ok = await check_db(engine)         # SELECT 1
    redis_ok = await check_redis(client)   # PING
    ok = db_ok and redis_ok
    return JSONResponse(
        status_code=200 if ok else 503,
        content={"status": "ready" if ok else "not_ready", "checks": {...}},
    )
```

---

## 19. Joylashtirish va observability

### 19.1 Docker Compose dev-stack

7 container: postgres, redis, minio, auth-api, exam-platform-api, exam-platform-worker, caddy. data-engine ham shu compose-da.

### 19.2 arq worker (`exam_platform.jobs.WorkerSettings`)

```python
class WorkerSettings:
    redis_settings = RedisSettings.from_dsn(settings.REDIS_URL)
    functions = [healthz_task, analyse_writing, regenerate_user_roadmap]
    job_timeout = 300
    keep_result = 3600
    max_jobs = 10
    queue_name = "arq:exam-platform"
```

### 19.3 Sentry + structlog

`init_sentry(settings)` — `SENTRY_DSN` mavjud bo'lsa FastAPI integratsiyasi yoqiladi. structlog JSON format prod, console format dev.

### 19.4 OpenAPI docs

`/v1/docs` — Swagger UI; `/v1/openapi.json` — raw schema (CI'da contract validation uchun).

---

## 20. Testlash va sifat kafolati

### 20.1 Unit testlar (`tests/unit/`)

`test_attempt_progression.py` (4 test):
1. `test_section_budget_prefers_stop_rule_max_items` — `stop_rule.max_items` `item_count`'dan ustun
2. `test_section_budget_falls_back_to_item_count` — `stop_rule` yo'q bo'lsa `item_count`
3. `test_section_budget_default_when_unspecified` — hech narsa yo'q → 5
4. `test_section_budget_handles_int_stop_rule_value_zero` — kichik edge case

`test_certificate.py` (1 test):
- `test_issue_produces_pdf_bytes_and_sha256` — PDF bytes `%PDF-` bilan boshlanadi, SHA-256 64-char, public_id 10-char

### 20.2 CI

`.github/workflows/test.yml`:
- `uv sync --all-packages`
- `uv run mypy --strict apps/ python/`
- `uv run ruff check`
- `uv run pytest -v`
- `pnpm tsc --noEmit -r` (Next.js + packages)
- `pnpm next lint` (jsx-a11y, react-hooks, ...)

### 20.3 Playwright E2E (rejada)

- Login → dashboard
- Start attempt → MCQ → submit → next item
- Complete reading → results page → check feedback panel renders
- Issue certificate → verify

### 20.4 k6 load test (rejada)

- 50 concurrent attempts, p95 navigation < 500ms
- p95 LLM scoring < 20s

---

## 21. Tajribaviy baholash

### 21.1 KPI lar

| Metrika | Maqsad | O'lchash usuli |
|---|---|---|
| Adaptive test convergence | SE(θ) < 0.3 by item 15 | sintetik 1000-talaba simulyatsiya + real pilot |
| LLM Writing rater (κ) | ≥ 0.65 vs human (Cohen quadratic-weighted) | 30 essay × 2 odam × LLM (10-11 hafta pilot) |
| LLM Writing rater (Pearson r) | ≥ 0.75 | bir xil pilot |
| LLM Speaking rater (κ) | ≥ 0.55 (audio harder than text) | 20 audio × 2 odam × LLM |
| Confidence-gated review rate | ≤ 20% | LLM `confidence < 0.7` ulushi |
| Anti-cheat detection rate | ≥ 90% | sintetik test (10 cheating + 90 normal users) |
| Conversation latency (Flash) | p50 ≤ 6s | analytics.llm_calls latency |
| Certificate issue success rate | ≥ 99% | (cert.id) / (attempt completed and Pro) |
| Heuristic fallback false-band rate | ≤ 5% bands above true level | sintetik essay quality grades |

### 21.2 Pilot

10-11 hafta — BSU ingliz tili kafedrasi 10–20 talaba:
- Har talaba mini IELTS Academic full mock (4 skills) topshiradi
- LLM bandlar yoziladi
- Bir xil javoblarni 2 nafar instruktor mustaqil baholaydi
- IRR (Cohen κ, Pearson r, MAE) hisoblanadi
- O'rtacha NPS, time-on-task, completion rate o'lchanadi

### 21.3 Eksperimental bob mazmuni

**4-bob (Eksperimental natijalar)** uchun jadvallar va grafiklar:
- Jadval 4.1: Adaptive test convergence (SE(θ) vs item index)
- Jadval 4.2: LLM Writing rater IRR (κ, r, MAE per criterion + overall)
- Jadval 4.3: LLM Speaking rater IRR
- Jadval 4.4: Confidence-band correlation (does low confidence ⇒ wide band spread?)
- Jadval 4.5: Anti-cheat true-positive / false-positive rate
- Jadval 4.6: Conversation latency: Flash vs Pro
- Jadval 4.7: Certificate verification success rate

---

## 22. Dissertatsiya boblariga moslashtirish

| Bob | Mavzu | Tegishli kod / hujjat | Ssilkalanadigan kalit testlar |
|---|---|---|---|
| 1 | Kirish va muammoning qo'yilishi | `00-overview.md` | — |
| 2 | Adabiyotlar tahlili (IELTS rubrikalari, FSRS, IRT) | `04-exam-flow.md`, `05-scoring-pipeline.md` | — |
| 3 | Tizim arxitekturasi va metodologiya | `01-architecture.md`, `06-adaptive-selection.md`, `07-audio-handling.md` | `_section_budget` testlari |
| 4 | Eksperimental natijalar | `11-evaluation.md` + jadvallar | certificate_test, llm_calls log |
| 5 | Xulosa va kelajak ishlar | `09-thesis-mapping.md` | — |

### 22.1 Faxriddinning **xususiy hissasi**

1. `services/attempt.py` — adaptive imtihon servisi (633 satr)
2. `services/feedback.py` — layered feedback + LLM scoring (1317 satr — eng katta)
3. `services/conversation.py` — AI partner backend (315 satr)
4. `services/certificate.py` — reportlab PDF render + SHA-256 (365 satr)
5. `services/practice.py` — SRS + drills + mastery (428 satr)
6. `services/roadmap.py` — personal plan generator (287 satr)
7. `api/v1/anti_cheat.py` — telemetry ingest endpoint
8. `api/v1/certificates.py` — certificate API
9. **Frontend**: 16 ta sahifa, ExamRunner state machine, 4 ta item komponenti, FeedbackSection accordion + AIGradingProgress panel, CertificatePanel, RoadmapRegenerateButton, ConversationClient state machine
10. Browser-native WAV encoder (16-bit PCM) — Whisper'siz Gemini multimodal'ga to'g'ridan-to'g'ri
11. Anti-cheat browser tracker (`lib/anti-cheat.ts`)
12. Auto-grading animated panel (`AIGradingProgress.tsx`)
13. Multi-language UI (UZ + EN) + dark/light theme

---

## 23. Glossary

| EN/Math | UZ tushuntirish |
|---|---|
| **Adaptive testing** | Talaba qobiliyatiga moslashgan savollar tanlash; CAT (Computerized Adaptive Test) |
| **Maximum Fisher Information** | `argmax_i a²·p·(1-p)` — eng informativ savol |
| **θ (theta)** | Foydalanuvchi qobiliyati logit shkalada (-3..+3) |
| **SE(θ)** | Standard error of theta — qobiliyat baholash aniqligi |
| **MCQ** | Multiple Choice Question (radio button) |
| **T/F/NG** | True / False / Not Given (IELTS Reading) |
| **Cue card** | Speaking Part 2 — talaba 1 daqiqa o'qib, 2 daqiqa gapirgan kartoshka |
| **Rubric** | Baholash mezonlari to'plami (4 IELTS criteria: TR, CC, LR, GRA) |
| **TR** | Task Response (writing); Task Achievement |
| **CC** | Coherence and Cohesion |
| **LR** | Lexical Resource |
| **GRA** | Grammatical Range and Accuracy |
| **GOP** | Goodness Of Pronunciation — har fonema talaffuz sifati |
| **FSRS** | Free Spaced Repetition Scheduler — Anki'dan kelib chiqqan algoritm |
| **SRS** | Spaced Repetition System |
| **Multimodal LLM** | Matn + audio yoki rasm bir LLM chaqiruvida ishlab chiqaruvchi |
| **Idempotency-Key** | Bir xil so'rov 2 marta yuborilsa bir xil natija qaytarish kafolati |
| **HS256** | HMAC SHA-256 — JWT signature algoritmi |
| **Argon2id** | Parol hash algoritmi (memory-hard, brute-force qarshi) |
| **PCM** | Pulse-Code Modulation — uncompressed digital audio (WAV format ichida) |
| **MediaRecorder API** | Browser-native audio/video yozib olish API'si |
| **Crockford alphabet** | `0,1,O,I,L` ni o'tkazuvchi 32-belgili shifrlash alifbosi |
| **next-intl** | Next.js uchun internationalization paket |
| **shadcn/ui** | Tailwind asosida ko'paytiriladigan komponent library |
| **framer-motion** | React uchun animatsiya kutubxonasi |
| **Server Component (RSC)** | Server-side rendered React komponent (no client JS bundled) |
| **CSRF Double-Submit** | Cookie + header bir xil tokenga ega bo'lishini tekshirish |
| **MinIO** | S3-compatible object storage (open source) |

---

## Yakuniy eslatma

Ushbu hujjat real ishlaydigan sistema asosida yozilgan — har bir asosiy texnik da'voni isbotlovchi:
- **Fayl yo'li** ko'rsatilgan
- **Jadval va kolonkalar** real `models.py`'dan olingan
- **Endpoint'lar** real `api/v1/*.py`'dan
- **Algoritmlar** real `services/*.py`'dan (Pseudocode + matematik formula)
- **Test natijalari** real `tests/unit/test_*.py`'dan

AI'ga (Claude, ChatGPT, Gemini) ushbu hujjatni feed qilib, dissertatsiya bobini Uzbek tilda yozishni so'rashingiz mumkin. AI yetishmayotgan boblarni ushbu kontentdan keltirib chiqarishi va sizga to'g'ri akademik uslubda yozib berishi mumkin.

**Bobomurodning hujjati ([../../data-engine-api/docs/00-full-overview.md](../../data-engine-api/docs/00-full-overview.md))** bilan birga o'qing — ikkalasi *bitta mahsulotni ikki burchakdan* tasvirlaydi va dissertatsiyada **ikki alohida hissani** asoslaydi.
