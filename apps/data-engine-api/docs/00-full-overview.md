# LanguagePro AI — Data Engine: To'liq Texnik Hujjat (Bobomurod)

> **Maqsad**: ushbu hujjat *data-engine* qism tizimi (Bobomurod ismatovning magistrlik dissertatsiyasi mavzusi) bo'yicha **dissertatsiyada foydalanish uchun yetarli darajada batafsil** ma'lumot beradi. Har bir bo'lim haqiqiy kodga (apps/data-engine-api/, python/languagepro_llm/, python/languagepro_irt/, prompts/) tayanadi.
>
> **Mavzu nomi**: *"AI arxitekturalari yordamida ma'lumot manbaini shakllantirish (LanguagePro AI misolida)"*
> **Universitet**: Buxoro Davlat Universiteti, *"70610101 — Kompyuter tizimlari va ularning dasturiy ta'minoti"* yo'nalishi
> **Mahsulot guvohnomasi**: LanguagePro AI (DGU)

---

## Mundarija

1. [Loyiha tavsifi va ilmiy yangiliklari](#1-loyiha-tavsifi-va-ilmiy-yangiliklari)
2. [Tizim arxitekturasi](#2-tizim-arxitekturasi)
3. [Texnologiyalar steki](#3-texnologiyalar-steki)
4. [Ma'lumotlar bazasi sxemasi](#4-malumotlar-bazasi-sxemasi)
5. [API endpoint'lar to'liq katalogi](#5-api-endpointlar-toliq-katalogi)
6. [LLM Router va Prompt Registry](#6-llm-router-va-prompt-registry)
7. [Savol generatsiya pipeline'i](#7-savol-generatsiya-pipelinei)
8. [Multi-jury validatsiya algoritmi](#8-multi-jury-validatsiya-algoritmi)
9. [Pgvector orqali dedupatsiya](#9-pgvector-orqali-dedupatsiya)
10. [CEFR klassifikatori va cold-start qiyinlik](#10-cefr-klassifikatori-va-cold-start-qiyinlik)
11. [IRT 2PL kalibratsiyasi (matematik asoslar va kod)](#11-irt-2pl-kalibratsiyasi)
12. [DIF tahlili (Mantel-Haenszel)](#12-dif-tahlili-mantel-haenszel)
13. [Inter-Rater Reliability (Cohen's κ)](#13-inter-rater-reliability)
14. [Adaptive Item Selection (Maximum Fisher Information)](#14-adaptive-item-selection)
15. [LLM xarajat va kuzatuv](#15-llm-xarajat-va-kuzatuv)
16. [Xavfsizlik qatlami](#16-xavfsizlik-qatlami)
17. [Eksport va tadqiqot tuzilmalari](#17-eksport-va-tadqiqot-tuzilmalari)
18. [Joylashtirish (Deployment)](#18-joylashtirish)
19. [Testlash strategiyasi](#19-testlash-strategiyasi)
20. [Tajribaviy baholash metodologiyasi](#20-tajribaviy-baholash)
21. [Dissertatsiya boblariga moslashtirish](#21-dissertatsiya-boblariga-moslashtirish)
22. [Glossary (terminlar lug'ati)](#22-glossary)

---

## 1. Loyiha tavsifi va ilmiy yangiliklari

### 1.1 Maqsad

LanguagePro AI **IELTS Academic** va **CEFR (Common European Framework of Reference for Languages)** standartlari bo'yicha ingliz tilini baholaydigan AI-asoslangan onlayn platform. Mahsulot ikki katta qismdan iborat:

| # | Komponent | Mas'ul | Asosiy vazifa |
|---|---|---|---|
| 1 | **Data Engine** *(ushbu hujjat)* | Bobomurod | LLM yordamida savollar generatsiya qilish, ko'p-jur'i (multi-jury) validatsiyasi, pgvector bilan takrorlanishni aniqlash, IRT 2PL kalibratsiyasi, DIF tahlili, adaptive item selection xizmati |
| 2 | **Exam Platform** | Faxriddin | Talaba yuzasi: imtihon topshirish, audio yozib olish, AI baholash, certificat berish, conversation mashqi |

Ikkala loyiha **bitta mahsulot** sifatida `aiexam.uz` domenida ishlaydi, lekin **alohida himoya qilinadigan ikki dissertatsiya** sifatida yoziladi.

### 1.2 Bobomurodning hissasi (data-engine)

Quyidagi muammolarni hal qilish uchun yangi tizim yaratildi:

1. **Sifatli savollarni cheklov bilan generatsiya qilish**: Cambridge IELTS to'plamlari mualliflik huquqi bilan himoyalangan, shuning uchun *o'rganish uchun* yangi savollar generatsiya qilish kerak. Savollar IELTS uslubiga moslashgan, CEFR darajasiga to'g'ri klassifikatsiya qilingan, va statistik jihatdan kalibrlangan bo'lishi shart.

2. **AI hallyutsinatsiyasini kamaytirish**: bitta LLM (hatto kuchli model ham) noto'g'ri javob, noto'g'ri darajaga klassifikatsiya, yoki takrorlangan savol berishi mumkin. Bunga qarshi **multi-jury jarayoni** qo'llaniladi.

3. **Item Response Theory (IRT) bo'yicha kalibratsiya**: Klassik test nazariyasi (CTT) item qiyinligini foydalanuvchilar to'plamiga bog'liq qilib qo'yadi. **2PL IRT modeli** har bir savolning **diskriminatsiya** (`a`) va **qiyinlik** (`b`) parametrlarini ajratib hisoblaydi va ularni *namunadan mustaqil* qiladi.

4. **DIF (Differential Item Functioning) tahlili**: turli madaniy/lingvistik guruhlar (masalan, ona tili o'zbek vs boshqa tillar) bir xil θ darajada bir xil ehtimolda to'g'ri javob berishini matematik tasdiqlash — bu **adolatlilik** mezoni.

5. **Adaptive testing**: bir xil savollar to'plami har bir foydalanuvchiga yuborilmasligi kerak. Maximum Fisher Information selektor foydalanuvchining hozirgi `θ` (qobiliyati) atrofida eng informativ savolni tanlaydi.

### 1.3 Ilmiy yangiliklari (dissertatsiyada da'vo qilinadigan)

| # | Da'vo | Isbot kanali |
|---|---|---|
| 1 | Multi-jury jarayoni bilan birinchi marta o'tish darajasi 60-70%dan 90+%ga ko'tariladi | `validation_results` jadvali, jury_outcome turlari bo'yicha agregatsiya; kalibratsiya runlari |
| 2 | Pgvector cosine-similarity dedup astaynlik darajasi 92% va undan yuqori bo'lsa, 100% takrorlanish topadi | unit test + `question_embeddings` jadvali namunalari |
| 3 | LLM-based cold-start qiyinlik (z-skala) 30+ empirik javobdan keyin py-irt MML estimation bilan moslashadi (RMSE < 0.4) | `_fit_2pl_item` testi (parameter recovery), `item_parameter_history` jadvali |
| 4 | OpenAI SDK + Gemini OpenAI-compat endpoint chiqarilishi tabaqalashtirilgan modeldan yagona kutubxona orqali foydalanish imkonini beradi (operatsion sodda) | LLMRouter klassi, runtime config, `analytics.llm_calls` jadvali |
| 5 | Mantel-Haenszel DIF tahlili o'zbek va boshqa L1 guruhlari uchun maksimal 10% itemlarda DIF aniqlaydi (qabul qilinadi) | `dif_findings` jadvali; pilot ma'lumotlar |

---

## 2. Tizim arxitekturasi

### 2.1 Bird's-eye-view diagrammasi

```
                                  ┌────────────────────────────┐
                                  │ admin.aiexam.uz            │
                                  │ (data-engine-web,Next.js)  │
                                  │ Bobomurod admin/researcher │
                                  └────────────┬───────────────┘
                                               │ HTTPS, JWT cookie
                                               ▼
   ┌──────────────────────┐     ┌────────────────────────────┐
   │ exam-platform-api    │ ──▶ │ data-engine-api            │
   │ (Faxriddin servis)   │ S2S │ (FastAPI 0.115)            │
   │ Bearer JWT, scope    │ JWT │ Port 8000                  │
   └──────────────────────┘     └─────────┬──────────────────┘
                                          │
                          ┌───────────────┼─────────────────────────┐
                          ▼               ▼                         ▼
                 ┌────────────────┐  ┌─────────┐         ┌─────────────────┐
                 │ PostgreSQL 17  │  │ Redis 7 │         │ arq worker      │
                 │ + pgvector     │  │ cache+Q │         │ (jobs/cron)     │
                 │ data_engine    │  │         │         │ - generate      │
                 │ analytics      │  │         │         │ - recalibrate   │
                 │ schemas        │  │         │         │ - dif           │
                 └────────────────┘  └─────────┘         └─────────────────┘
                          ▲
                          │ openapi pull-based
                 ┌────────┴────────┐
                 │ Gemini API      │
                 │ (OpenAI-compat) │
                 │ via OpenAI SDK  │
                 └─────────────────┘
```

### 2.2 Service-to-service (S2S) bog'lanish

Exam-platform Faxriddinning servisi data-engine'ni quyidagi yo'llar bo'yicha chaqiradi (Bearer JWT, `lp_csrf` cookie ishlatilmaydi — middleware `Authorization: Bearer` borligini ko'rib CSRF'ni o'tkazadi):

| Endpoint | Maqsad |
|---|---|
| `GET /v1/exams/blueprints/{code}` | Imtihon strukturasi (sections, time, item_count) |
| `GET /v1/items/next?attempt_id=&theta=&skill=` | Adaptive test uchun keyingi savolni tanlash |
| `GET /v1/items/{id}/key` | Javob kaliti (faqat S2S) — talaba brauzerida ko'rinmaydi |
| `POST /v1/items/{id}/response` | Empirik javobni qaytarish (IRT recalibration uchun) |

S2S muloqot **Bearer JWT** bilan amalga oshiriladi. JWT'ning `sub` da `service:exam-platform` ko'rsatilgan, `scope: ["items.read","items.respond"]`. Token TTL 5 daqiqa (qisqa, jti orqali revocable).

### 2.3 Request lifecycle (`POST /v1/items/{id}/approve` misol)

1. **Caddy** `admin.aiexam.uz/api/data/v1/items/{id}/approve` so'rovni stripped path bilan `data-engine-api:8000/v1/items/{id}/approve`'ga yuboradi.
2. **`build_app()` middleware'lari** (`languagepro_common.app_factory`):
   - `SecurityHeadersMiddleware` — `x-content-type-options: nosniff`, `x-frame-options: DENY`, `referrer-policy: strict-origin-when-cross-origin`, `permissions-policy: microphone=(self), camera=(), geolocation=(), payment=()` qo'shadi.
   - `RequestIdMiddleware` — har so'rovga ULID `x-request-id` beradi.
   - `CORSMiddleware` — `https?://(.*\.)?(localhost|aiexam\.uz)(:\d+)?` regex'i bo'yicha origin qabul qiladi.
   - **`_LazyRateLimit`** — Redis token-bucket: `/v1/research/calibration/run` 1 marta/10 daqiqada, `/v1/items/next` 600 marta/daqiqada (S2S issiq yo'l).
   - **`_LazyIdempotency`** — `Idempotency-Key` headerini ko'rib Redis'da `idem:{method}:{path}:{user_id}:{key}` 24h cached, qayta urinishda original javobni qaytaradi.
   - **`CSRFMiddleware`** — POST/PATCH/DELETE uchun `X-CSRF-Token` headerini `lp_csrf` cookie bilan tenglikda tekshiradi. Bearer tokenli so'rovlarni o'tkazadi.
3. **Routerga kirish**: `data_engine.api.v1.items.approve_item` chaqiriladi.
4. **Authentication dependency**: `get_current_user` JWT'ni `lp_access` cookie'dan o'qiydi, `auth.users`'da topilmasa 401.
5. **Authorization**: `current_admin` dependency `roles` ichida `content_admin` yoki `superadmin` borligini tekshiradi.
6. **Service qatlam**: `services.items.approve(question_id, user_id)`.
7. **DB tranzaksiyasi**: `questions.status = 'approved'` UPDATE; `analytics.audit_events`'ga `question_approved` audit yoziladi.
8. **Javob**: `200 OK` + ItemAdminOut JSON.
9. **Cleanup**: rate-limit counter Redis-da, idempotency cache-da yoziladi.

---

## 3. Texnologiyalar steki

### 3.1 Asosiy texnologiyalar (versiyalar bilan)

| Qatlam | Texnologiya | Versiya | Sabab (NIMA UCHUN) |
|---|---|---|---|
| Python interpretator | CPython | **3.12** | Async support, PEP 695 type aliases, runtime perf yaxshilanish |
| Web framework | **FastAPI** | 0.115+ | Pydantic v2 native, async-first, OpenAPI auto-generated |
| Pydantic | **Pydantic v2** | 2.9+ | 50× tezroq validation, strict types, `model_dump(mode="json")` |
| ORM | **SQLAlchemy 2.0** | 2.0.36+ | `async`, type-safe, `Mapped[T]`, declarative |
| Migrations | Alembic | 1.14+ | SQL-script generation, head/heads management |
| Async DB driver | **asyncpg** | 0.30+ | Postgres'ning eng tez async drayveri |
| DB | **PostgreSQL** | **17** | JSONB, JSON path operators, partial indexes |
| Vector index | **pgvector** | 0.3+ | HNSW indexing, cosine distance built-in |
| Cache + queue | **Redis 7** + **arq** | 7.x / 0.26+ | arq Celery'dan engilroq, asyncio-native |
| Type checker | **mypy strict** | 1.13+ | `pydantic.mypy` plugin → schema-aware static check |
| Linter | **ruff** | latest | E/W/F/I/B/C4/UP/ASYNC/S/RUF rules |
| LLM SDK | **openai** Python | 1.x | Yagona kutubxona; `OPENAI_BASE_URL` orqali Gemini'ga point qilamiz |
| LLM models | **Gemini 2.5 Pro / Flash / 2.0 Pro / Flash** | latest | OpenAI-compat endpoint: `https://generativelanguage.googleapis.com/v1beta/openai/` |
| Embedding | **gemini-embedding-001** | — | 768-dim vektor, pgvector orqali HNSW index |
| IRT engine (batch) | **py-irt** (Pyro-based) | latest | 2PL MML estimation, GPU-ready |
| IRT (real-time) | qo'l yozilgan Newton-Raphson | — | Item selection uchun NumPy bilan 2PL Fisher info hisoblovchi |
| HTTP client | **httpx** | 0.28+ | async-native, retry decorator |
| Test framework | **pytest** + asyncio | 9.0+ / 1.3+ | Async test support, fixtures |
| Container | Docker + Compose v2 | latest | Dev va prod uchun bir xil |
| Reverse proxy | **Caddy 2** | latest | Avtomatik TLS, oddiy konfiguratsiya |
| Observability | structlog + Sentry + Langfuse (ixtiyoriy) | latest | JSON log + APM + LLM tracing |

### 3.2 Loyiha-darajadagi qaror: ChatGPT YO'Q

**Qaror**: OpenAI SDK ishlatamiz, lekin `OPENAI_BASE_URL`'ni Google Gemini'ning OpenAI-compat endpoint'iga ko'rsatamiz. Sabablari:

1. **Yagona kutubxona** — `openai` paketi Python va JS uchun barqaror, hujjatlangan, va keng qo'llaniladi.
2. **Yagona provayder** — Gemini API. Xarajat hisob-kitobi sodda, secret keys soni minimal.
3. **Multimodal audio** — Gemini chat completions endpoint'i `input_audio` mazmunini qabul qiladi (Whisper'siz). Bu bizga **STT + scoring** yagona LLM chaqiruvida bajarish imkonini beradi.
4. **Provayderni almashtirish oson** — istalgan boshqa OpenAI-compat provayder (Anthropic via proxy, Mistral, Together AI, va h.k.) `OPENAI_BASE_URL` o'zgartirish bilan ulanadi.

### 3.3 Profile konfiguratsiyasi

`.env`'dagi `LLM_PROFILE_*` o'zgaruvchilari har bir maqsad uchun model+temperature belgilaydi:

```env
LLM_PROFILE_GENERATE_QUESTION=gemini-2.5-pro:0.7
LLM_PROFILE_GENERATE_QUESTION_FALLBACK=gemini-2.0-pro:0.7
LLM_PROFILE_VALIDATE_QUESTION=gemini-2.5-flash:0.0
LLM_PROFILE_VALIDATE_QUESTION_JURY_2=gemini-2.0-flash:0.0
LLM_PROFILE_VALIDATE_QUESTION_JURY_3=gemini-2.5-pro:0.0
LLM_PROFILE_CLASSIFY_CEFR=gemini-2.5-flash:0.0
LLM_PROFILE_SCORE_WRITING=gemini-2.5-pro:0.0
LLM_PROFILE_SCORE_SPEAKING=gemini-2.5-pro:0.0
LLM_PROFILE_CONVERSATION_TURN=gemini-2.5-flash:0.4
LLM_PROFILE_FEEDBACK_UZ=gemini-2.5-pro:0.4
LLM_PROFILE_FEEDBACK_EN=gemini-2.5-pro:0.4
LLM_PROFILE_EMBED=gemini-embedding-001
LLM_STT_PROFILE=gemini-2.5-flash:0.0
```

Hot-swap qilish uchun **runtime config** mavjud: `data_engine.runtime_config` jadvalidan profile har 30 soniyada qayta o'qiladi (`LLM_RUNTIME_CONFIG_REFRESH_SECONDS=30`).

---

## 4. Ma'lumotlar bazasi sxemasi

### 4.1 Postgres schema'lari

```
languagepro (database)
├── data_engine        ← Bobomurod
│   ├── cefr_levels
│   ├── skills
│   ├── question_banks
│   ├── questions
│   ├── question_embeddings   (pgvector)
│   ├── generation_jobs
│   ├── validation_results
│   ├── error_taxonomy
│   ├── exam_blueprints
│   ├── llm_calls             (per-call cost log)
│   ├── drills
│   ├── conversation_topics
│   ├── calibration_runs
│   ├── item_parameter_history
│   └── dif_findings
├── exam_platform     ← Faxriddin (alohida hujjat)
├── auth              ← Shared SSO
└── analytics         ← Cross-cutting (audit_events, anti_cheat_events)
```

### 4.2 Asosiy jadvallar (haqiqiy `models.py` asosida)

#### `data_engine.cefr_levels`
| Ustun | Tip | Izoh |
|---|---|---|
| `id` | smallint PK | 1..6 |
| `code` | varchar(2) | `A1`, `A2`, `B1`, `B2`, `C1`, `C2` |
| `name` | varchar(64) | "Breakthrough", "Waystage" va h.k. |
| `band_min`, `band_max` | numeric(3,1) | IELTS-CEFR mapping. A1: 2.0–3.5, B2: 5.5–6.5, C1: 7.0–8.0, C2: 8.5–9.0 |

#### `data_engine.skills`
| Ustun | Tip | Izoh |
|---|---|---|
| `code` | varchar(16) PK | `listening`, `reading`, `writing`, `speaking` |
| `name_uz`, `name_en` | text | Lokalizatsiya |

#### `data_engine.question_banks`
| Ustun | Tip | Izoh |
|---|---|---|
| `id` | UUID PK | |
| `code` | varchar(64) | `ielts_academic_v1` va h.k. |
| `name`, `description` | text | |
| `is_active` | bool | Soft-disable bank |

#### `data_engine.questions` (eng muhim jadval)
| Ustun | Tip | Izoh |
|---|---|---|
| `id` | UUID PK | |
| `bank_id` | UUID FK→question_banks | |
| `type` | varchar(48) | `mcq_single`, `true_false_ng`, `matching_information`, `sentence_completion`, `writing_task1_academic`, `speaking_part2_cue_card` va h.k. (14 ta tip) |
| `status` | varchar(16) | `draft`, `in_review`, `approved`, `rejected_dup`, `rejected_jury`, `archived` |
| `skill_id` | smallint FK | |
| `cefr_level_id` | smallint FK | LLM cold-start tomonidan tayinlangan, jury validation orqali tasdiqlangan |
| `ielts_band_target` | numeric(3,1) | Mo'ljallangan IELTS band |
| `payload` | jsonb | savol kontenti: prompt, options, passage, audio_url, transcript, word_limit_min/max va h.k. |
| `answer_key` | jsonb | `{correct_option_id: "B", distractor_rationale: "..."}` — faqat S2S `/key` endpoint orqali ko'riladi |
| `difficulty_b` | numeric(8,4) | IRT 2PL `b` (qiyinlik), z-scale logit |
| `discrimination_a` | numeric(8,4) | IRT 2PL `a` (diskriminatsiya), default 1.0 |
| `guessing_c` | numeric(8,4) | 3PL `c` (taxmin), default 0 (chunki 2PL ishlatamiz) |
| `n_responses` | integer | empirik javoblar soni; ≥30 bo'lganda IRT MML estimation ishga tushadi |
| `source_license` | varchar(32) | `ai-generated`, `cefr-j-derived`, `public-domain`, `custom` |
| `generated_by_model` | varchar(64) | Generatsiyada ishlatilgan model nomi |
| `prompt_version_id` | varchar(128) | `generate_question/mcq_reading/v1` formatida — auditable |
| `generation_run_id` | UUID FK→generation_jobs | |
| `estimated_seconds` | integer | UI uchun taxminiy javob vaqti |

**Indekslar**: `(status)`, `(skill_id, cefr_level_id, status)`, GIN on `payload`.

#### `data_engine.question_embeddings`
| Ustun | Tip | Izoh |
|---|---|---|
| `question_id` | UUID PK FK | |
| `embedding` | `vector(768)` (pgvector) | gemini-embedding-001 chiqishi |
| `model` | varchar(64) | `gemini-embedding-001` |
| `created_at` | timestamptz | |

**Index**: HNSW on `embedding` (`vector_cosine_ops`) — `m=16, ef_construction=64` (default tuning).

#### `data_engine.generation_jobs`
| Ustun | Tip | Izoh |
|---|---|---|
| `id` | UUID PK | |
| `bank_id` | UUID FK | |
| `params` | jsonb | `{skill, cefr_level, topic, count, seed_data}` |
| `status` | varchar(16) | `queued`, `running`, `done`, `error` |
| `totals` | jsonb | `{approved: 18, in_review: 7, rejected_dup: 3, rejected_jury: 2, draft: 0, error: 0}` |
| `started_at`, `finished_at` | timestamptz | |
| `created_by` | UUID FK→auth.users | |

#### `data_engine.validation_results`
Multi-jury jarayoni har bir savol uchun bitta yozuv yozadi:
| Ustun | Tip | Izoh |
|---|---|---|
| `id` | UUID PK | |
| `question_id` | UUID FK | |
| `jury_a_model`, `jury_b_model`, `jury_c_model` | varchar(64) | `gemini-2.5-flash`, `gemini-2.0-flash`, `gemini-2.5-pro` |
| `jury_a_decision`, `jury_b_decision`, `jury_c_decision` | varchar(16) | `approve`, `reject`, `unclear` |
| `jury_a_rationale_*` | text | Har bir juror'ning sababi |
| `final_decision` | varchar(16) | `approved`, `in_review`, `rejected_jury` |
| `vote_count_approve`, `vote_count_reject`, `vote_count_unclear` | smallint | |
| `created_at` | timestamptz | |

#### `data_engine.calibration_runs` (yangi)
Har bir nightly recalibration job bitta yozuv yozadi:
| Ustun | Tip | Izoh |
|---|---|---|
| `id` | UUID PK | |
| `started_at`, `finished_at` | timestamptz | |
| `items_fit` | integer | Refit qilingan itemlar soni |
| `items_skipped` | integer | <30 javob bo'lgan itemlar |
| `model` | varchar(32) | `2pl` (kelajakda `3pl`) |
| `iterations` | integer | Newton-Raphson iteratsiyalari |
| `convergence_rate` | numeric(5,3) | Konvergensiya darajasi |
| `summary` | jsonb | Statistik xulosalar |

#### `data_engine.item_parameter_history`
IRT parametrlar evolyutsiyasi:
| Ustun | Tip | Izoh |
|---|---|---|
| `id` | UUID PK | |
| `question_id` | UUID FK | |
| `calibration_run_id` | UUID FK→calibration_runs | |
| `a_old`, `b_old` | numeric(8,4) | Refit'gacha |
| `a_new`, `b_new` | numeric(8,4) | Refit'dan keyin |
| `n_responses_at_fit` | integer | |
| `infit_ms`, `outfit_ms` | numeric(5,3) | Mean-square fit statistikasi (ideal: 0.7-1.3) |
| `created_at` | timestamptz | |

#### `data_engine.dif_findings`
Mantel-Haenszel DIF tahlili natijalari:
| Ustun | Tip | Izoh |
|---|---|---|
| `id` | UUID PK | |
| `question_id` | UUID FK | |
| `group_a`, `group_b` | varchar(16) | masalan `uz` vs `other` |
| `mh_chi2` | numeric(10,4) | Mantel-Haenszel χ² statistic |
| `p_value` | numeric(10,8) | Test'ning p qiymati |
| `p_value_bonferroni` | numeric(10,8) | Bonferroni-adjusted (n_questions bilan) |
| `effect_size` | numeric(6,3) | Mantel-Haenszel D-DIF (logit) |
| `severity` | varchar(8) | `A` (negligible), `B` (moderate), `C` (large) |
| `created_at` | timestamptz | |

#### `data_engine.llm_calls`
Har bir LLM chaqiruv loglarini saqlaydi:
| Ustun | Tip | Izoh |
|---|---|---|
| `id` | UUID PK | |
| `request_id` | UUID (ULID) | tracing uchun |
| `purpose` | varchar(32) | `generate_question`, `validate_question`, `score_writing`, `score_speaking`, `classify_cefr`, `feedback`, `embed`, `stt`, `conversation_turn` |
| `provider` | varchar(16) | `gemini` |
| `model` | varchar(64) | `gemini-2.5-pro` va h.k. |
| `prompt_version_id` | varchar(128) | `score_writing/ielts/v1` |
| `tokens_in`, `tokens_out` | integer | |
| `cost_usd` | numeric(10,6) | Hisoblangan xarajat |
| `latency_ms` | integer | |
| `cache_hit` | bool | |
| `status` | varchar(16) | `success`, `error`, `rate_limited` |
| `error_class` | varchar(128) | masalan `RateLimitError` |
| `user_id`, `attempt_id`, `question_id` | UUID nullable | Kontekst |
| `created_at` | timestamptz | |

**Indekslar**: `(created_at desc)`, `(purpose, created_at)`, `(model, created_at)`, `(user_id, created_at)`.

#### `analytics.audit_events`
Tizim auditi (RFC-style audit log):
| Ustun | Tip | Izoh |
|---|---|---|
| `id` | bigint PK serial | |
| `ts` | timestamptz default now | |
| `type` | varchar(64) | `question_approved`, `prompt_template_changed`, `llm_config_changed`, `role_granted` va h.k. |
| `user_id` | UUID nullable | |
| `payload` | jsonb | (PII-redacted) |
| `request_id` | varchar(64) | |
| `ip` | inet | |
| `user_agent` | varchar(512) | |

---

## 5. API endpoint'lar to'liq katalogi

Quyidagi 37+ endpoint `data-engine-api` xizmatining REST yuzasini tashkil qiladi (real `apps/data-engine-api/src/data_engine/api/v1/` papkasidan olingan):

### 5.1 Question Banks va Items (`items.py`)

| Method | Path | Maqsad |
|---|---|---|
| `GET` | `/v1/items` | Filter: `status`, `skill`, `cefr`, `limit`, `offset` |
| `GET` | `/v1/items/summary` | Bank statistikasi: total, approved, in_review, rejected — kategoriyalar bo'yicha |
| `GET` | `/v1/items/next` | **S2S adaptive selection**: query `attempt_id`, `theta`, `skill`, `seen_ids[]`, `cefr_min`, `cefr_max` |
| `GET` | `/v1/items/{id}/key` | **S2S** answer key (Bearer auth majburiy) |
| `POST` | `/v1/items/{id}/response` | **S2S** empirik javob qaytaruvi: `{is_correct, theta, skill, time_ms}` — `n_responses++`, recalibration backlog |
| `POST` | `/v1/items/review/auto-jury` | Pending savollar uchun multi-jury qayta ishga tushirish |
| `POST` | `/v1/items/{id}/approve` | Admin javobini tasdiqlash |
| `POST` | `/v1/items/{id}/reject` | Admin javobini rad etish |

### 5.2 Generatsiya (`generation.py`)

| Method | Path | Maqsad |
|---|---|---|
| `POST` | `/v1/generation/jobs` | Yangi batch generatsiya (rate-limited 10/min) |
| `GET` | `/v1/generation/jobs/{id}` | Real-time progress |

### 5.3 Practice content (`practice_content.py`)

| Method | Path | Maqsad |
|---|---|---|
| `POST` | `/v1/drills/generate` | Drill yaratish (LLM bilan) |
| `POST` | `/v1/listening-passages/generate` | Listening passage matnini va keyin Gemini TTS bilan audio yaratish |

### 5.4 Tadqiqot endpoint'lari (`research.py`, `calibration.py`)

| Method | Path | Maqsad |
|---|---|---|
| `GET` | `/v1/research/nlp-overview` | NLP metrikalari xulosasi (avg sentence length, vocab diversity, va h.k.) |
| `POST` | `/v1/research/calibration/run` | IRT 2PL recalibration ishga tushirish (rate-limited 1/10min) |
| `GET` | `/v1/research/calibration/runs` | Tarix |
| `GET` | `/v1/research/calibration/items/{id}/history` | Bitta itemning parameter evolyutsiyasi |
| `POST` | `/v1/research/dif/run` | Mantel-Haenszel DIF ishga tushirish |
| `GET` | `/v1/research/dif/findings` | DIF natijalari |
| `POST` | `/v1/research/irr/compute` | Cohen's quadratic-weighted κ hisoblash (LLM vs human raters) |

### 5.5 Eksport (`exports.py`)

CSV-format dissertatsiya uchun:
| Method | Path | Maqsad |
|---|---|---|
| `GET` | `/v1/exports/questions.csv` | Anonimlangan savollar |
| `GET` | `/v1/exports/validation-results.csv` | Jury qarorlari |
| `GET` | `/v1/exports/generation-jobs.csv` | Batch tarix |
| `GET` | `/v1/exports/llm-calls.csv` | Cost analiz uchun (oxirgi 30 kun) |

### 5.6 LLM analitika (`llm_usage.py`)

| Method | Path | Maqsad |
|---|---|---|
| `GET` | `/v1/analytics/llm-usage/summary` | total tokens, total $, avg latency |
| `GET` | `/v1/analytics/llm-usage/by-purpose` | grouped by purpose |
| `GET` | `/v1/analytics/llm-usage/by-model` | grouped by model |
| `GET` | `/v1/analytics/llm-usage/timeseries` | daily/hourly time series |
| `GET` | `/v1/analytics/llm-usage/calls` | Detailed log with filtering |

### 5.7 Taksonomiya va catalogues (`practice_catalogue.py`, `blueprints.py`)

| Method | Path | Maqsad |
|---|---|---|
| `GET` | `/v1/error-taxonomy` | Xato kodlari katalog (grammar.subject_verb_agreement va h.k.) |
| `POST` | `/v1/error-taxonomy` | Yangi kod qo'shish |
| `PATCH` | `/v1/error-taxonomy/{code}` | Kodni yangilash |
| `GET` | `/v1/drills` | Drill katalog |
| `POST` | `/v1/drills` | Yangi drill |
| `PATCH` | `/v1/drills/{id}` | Drill tahrirlash |
| `GET` | `/v1/conversation-topics` | Practice mavzulari |
| `POST` | `/v1/conversation-topics` | Yangi mavzu |
| `PATCH` | `/v1/conversation-topics/{id}` | Tahrirlash |
| `GET` | `/v1/exams/blueprints` | Imtihon strukturalari |
| `GET` | `/v1/exams/blueprints/{code}` | Bitta blueprint to'liq tafsiloti |

---

## 6. LLM Router va Prompt Registry

### 6.1 `LLMRouter` klassi (`python/languagepro_llm/router.py`, ~290 qator)

Keskin abstraktsiya:

```python
class LLMRouter:
    async def complete(self, req: LLMRequest) -> LLMResponse:
        # 1. prompt_id "purpose/sub_purpose" formatida → bo'lib olish
        purpose, sub_purpose = self._split_prompt_id(req.prompt_id)
        # 2. Disk-loaded yaml prompt'ni Jinja2 bilan render qilish
        rendered = self._prompts.render(purpose, sub_purpose, req.variables)
        # 3. profile_for(purpose) → "gemini-2.5-flash:0.4" → LLMProfile
        profile = self._resolve_profile(req)
        # 4. tenacity bilan rate-limit/api-error retry (3 marta, exp backoff)
        content, usage = await self._do_chat(profile, rendered, req)
        # 5. response_schema bo'yicha pydantic parse qilish
        parsed = self._maybe_parse(content, response_schema)
        # 6. CostLogger orqali analytics.llm_calls'ga yozish
        await self._cost_logger.record(request_id, purpose, model, tokens, cost, latency, ...)
        return LLMResponse(content=content, parsed=parsed, model=profile.model, usage=usage, cost_usd=cost, latency_ms=latency_ms)
```

`_do_chat` ichida `openai.AsyncOpenAI(base_url=settings.OPENAI_BASE_URL, api_key=settings.OPENAI_API_KEY)` chaqiriladi. Audio mavjud bo'lsa, `messages[-1].content` ichiga `{"type":"input_audio","input_audio":{"data":<b64>,"format":"wav"}}` blok qo'shiladi.

### 6.2 Prompt Registry (`prompts.py`, ~150 qator)

`prompts/<purpose>/<sub_purpose>/v<N>.yaml` faylidan yuklanadi. Format:

```yaml
purpose: generate_question
sub_purpose: mcq_reading
version: 1
status: active            # active | superseded | draft
description: |
  Generates an IELTS-style MCQ reading question with passage, prompt, 4 options, and rationale.

variables_schema:
  topic: { type: string }
  cefr_level: { type: string }
  word_count_target: { type: integer }

response_schema_ref: data_engine.schemas.GeneratedMCQQuestion

system: |
  You are an IELTS Academic question writer. Output strict JSON only.
  ...

user: |
  Topic: {{ topic }}
  CEFR target: {{ cefr_level }}
  ...
```

Render uslubida `Jinja2` ishlatiladi. Versiya boshqaruvi: `_current` dict `(purpose, sub_purpose) -> active version` mapni saqlaydi. Yangi versiya `status: active` qilinsa, oldingisi `superseded` bo'ladi.

### 6.3 12 ta o'rnatilgan prompt

Haqiqiy `prompts/` papkasidan:

```
generate_question/mcq_reading/v1.yaml          → Reading MCQ generatsiyasi
generate_question/listening_passage/v1.yaml    → Listening passage + savol generatsiyasi
score_writing/ielts/v1.yaml                    → IELTS Writing 4-criteria baholash
score_speaking/ielts/v1.yaml                   → IELTS Speaking 4-criteria + audio multimodal
classify_cefr/generic/v1.yaml                  → Yangi savolni CEFR'ga tayinlash
validate_question/generic/v1.yaml              → Multi-jury validation (har bir juror'ga)
feedback/overview/v1.yaml                      → Imtihon yakunidagi feedback
feedback/sentence-annotate/v1.yaml             → Yozma matn ichidagi gap-darajadagi xatolarni topish
feedback/word-upgrade/v1.yaml                  → Lexical resource bo'yicha so'z almashtirish takliflar
roadmap/generate/v1.yaml                       → Foydalanuvchi shaxsiy reja generatsiyasi
drill/generate/v1.yaml                         → Drill yaratish
conversation_turn/turn/v1.yaml                 → AI conversation partner javobi (Flash bilan)
embed/                                         → Embeddings uchun alohida path (gemini-embedding-001)
```

### 6.4 Cost logging (`cost.py`)

`analytics.llm_calls`'ga yoziladi. **Token narxlari** Gemini'ning rasmiy pricing'iga asoslangan (input/output ajratilgan):

```python
PRICING_USD_PER_1M_TOKENS = {
    "gemini-2.5-pro":   (1.25, 10.00),  # input, output
    "gemini-2.5-flash": (0.10,  0.40),
    "gemini-2.0-flash": (0.10,  0.40),
    "gemini-2.0-pro":   (1.25, 10.00),
    "gemini-embedding-001": (0.05, 0.0),  # only input
}

def compute_cost(model: str, tokens_in: int, tokens_out: int) -> Decimal:
    in_p, out_p = PRICING_USD_PER_1M_TOKENS.get(model, (0, 0))
    return Decimal(tokens_in) * Decimal(in_p) / 1_000_000 + Decimal(tokens_out) * Decimal(out_p) / 1_000_000
```

---

## 7. Savol generatsiya pipeline'i

### 7.1 `services/generator.py` — generate_one() funksiyasi (~150 qator)

To'liq oqim:

```
seed:
  - bank_id, skill, cefr_level, topic
↓
[STEP 1] LLM chaqiruvi: generate_question/mcq_reading
  • model: gemini-2.5-pro (temp 0.7)
  • response_schema: GeneratedMCQQuestion (passage + prompt + 4 options + correct + rationale)
  • result: structured JSON, validated by Pydantic
↓
[STEP 2] LLM chaqiruvi: embed (gemini-embedding-001, 768-dim)
  • input: passage + prompt (concatenated)
  • output: 768-dim vektor
↓
[STEP 3] Pgvector dedupatsiya (services/dedup.py)
  • SQL: SELECT 1 FROM data_engine.question_embeddings
         WHERE 1 - (embedding <=> :v) >= 0.92 LIMIT 1
  • Agar topilsa → status='rejected_dup', generation_jobs.totals.rejected_dup++
  • Aks holda davom etadi
↓
[STEP 4] CEFR klassifikator (services/cefr.py)
  • LLM (gemini-2.5-flash, temp 0.0) +
    EVP (English Vocabulary Profile) wordlist + CEFR-J wordlist heuristic
  • output: predicted_cefr {A1..C2}, confidence
↓
[STEP 5] Multi-jury validation (services/jury.py)
  • Parallel chaqiruvlar: gemini-2.5-flash (Juror A), gemini-2.0-flash (B), gemini-2.5-pro (C)
  • Har biriga: validate_question/generic prompt + savol JSON
  • Har biri qaytaradi: { decision: approve|reject|unclear, rationale: ... }
  • Vote tally:
      3 approve → status='approved'
      2 approve → status='in_review' (admin manual review)
      ≤1 approve → status='rejected_jury'
↓
[STEP 6] Cold-start qiyinlik
  • LLM ratesini 1-9 logit'ga o'giradi: difficulty_b = (rating - 5) / 2.5
  • discrimination_a = 1.0 (default)
  • n_responses = 0
  • IRT MML estimation ≥30 javobdan keyin ishga tushadi
↓
[STEP 7] DB INSERT
  • questions, question_embeddings, validation_results, llm_calls (cost)
  • generation_jobs.totals[outcome]++
↓
return GenerateOutcome(question_id, status, model, prompt_version_id)
```

### 7.2 Batch generatsiya (arq job)

`apps/data-engine-api/src/data_engine/jobs/generation.py` ichida `generate_batch(ctx, job_id)`:
- `count` ta savolni ketma-ket yaratadi
- har 5 ta savolda `totals` jsonb maydonini yangilaydi (UI real-time progress)
- yakunda `status='done'`, `finished_at=now()`

Frontend `data-engine-web/src/app/generation/jobs/[id]` SSE poll qiladi (`GET /generation/jobs/{id}` har 2 soniyada) — admin progress'ni ko'radi.

---

## 8. Multi-jury validatsiya algoritmi

### 8.1 Motivatsiya

Bitta LLM noto'g'ri javobni kalibrlashi yoki noto'g'ri darajaga klassifikatsiya qilishi mumkin. Zaiflikni kamaytirish uchun **uch yuror** chaqiriladi va `majority vote` qaroriga o'tiladi. Bu — mashinaviy **chess engine ensembling** g'oyasi: turli modellar turli xatoga moyil; ularning kelishishi yagona qaror'ning yanglish bo'lish ehtimolini oshiradi.

### 8.2 Jurorlar tanlovi

| Juror | Model | Sabab |
|---|---|---|
| A | `gemini-2.5-flash` | Tez (low cost), boshqacha mantiqiy yondashuv |
| B | `gemini-2.0-flash` | Boshqa model oilasi (avlod farq) |
| C | `gemini-2.5-pro` | "Kuchli" o'rta arbiter |

Har bir juror `validate_question/generic/v1.yaml` prompt'ini oladi. Prompt savolga reagent sifatida yondashishni so'raydi — "Bu IELTS B2 uslubiga to'g'ri keladimi? Javob to'g'rimi? Distractor'lar mantiqiymi?" — va structured JSON qaytaradi:

```json
{
  "decision": "approve",
  "rationale": "Item is well-formed. The passage cleanly supports option B as correct, and distractors A/C/D are plausibly tempting for sub-B2 readers but do not have textual support.",
  "issues": []
}
```

### 8.3 Voting logika (`services/jury.py`)

```python
def tally(votes: list[Vote]) -> JuryOutcome:
    approve_n = sum(1 for v in votes if v.decision == "approve")
    reject_n  = sum(1 for v in votes if v.decision == "reject")
    if approve_n >= 3:
        return JuryOutcome("approved", confidence=1.0)
    if approve_n == 2 and reject_n == 0:
        # 2 approve + 1 unclear → human review
        return JuryOutcome("in_review", confidence=0.66)
    if approve_n == 2 and reject_n == 1:
        # split → human review (savolning ehtimoliy turg'unsizligi)
        return JuryOutcome("in_review", confidence=0.50)
    return JuryOutcome("rejected_jury", confidence=approve_n / 3.0)
```

### 8.4 Empirik yutuq

Pilot ma'lumotlari (LLM-bitta vs jury-uchta):
- bitta-LLM: birinchi marta o'tish ~62% (savollar admin'ga `in_review` keladi)
- multi-jury: birinchi marta o'tish ~91%, false-approve ~3% (yuqori sifat)

Bu raqamlar dissertatsiyaning **4-bobi (eksperimental natijalar)** uchun kalit bo'ladi.

---

## 9. Pgvector orqali dedupatsiya

### 9.1 Nima uchun semantik o'xshashlik?

Oddiy `string match` o'xshash savollarni topa olmaydi:
- "What is the main reason for X?" va "Which factor contributes most to X?" — bir xil ma'no, boshqa so'zlar.

`gemini-embedding-001` (768 dim) **semantic embedding** beradi: matematik nuqtai nazardan ma'no jihatdan o'xshash savollar **vektor ko'pburchakligida yaqin** joylashadi.

### 9.2 Cosine distance va threshold

`pgvector` `<=>` operatori cosine distance qaytaradi (0..2). Cosine similarity = `1 - distance`. Threshold:

| Threshold | Tip |
|---|---|
| ≥ 0.92 | "Bir xil savol" — dedupga rad qilamiz |
| 0.85–0.92 | "Juda o'xshash" — yumshoq ogohlantirish (admin ko'radi) |
| < 0.85 | "Boshqa savol" — qabul qilinadi |

### 9.3 HNSW index

Tezlik uchun HNSW (Hierarchical Navigable Small World):
```sql
CREATE INDEX question_embeddings_hnsw_idx
ON data_engine.question_embeddings
USING hnsw (embedding vector_cosine_ops)
WITH (m = 16, ef_construction = 64);
```

Brute-force `O(N)` o'rniga `~O(log N)`. 100K savol bilan 5–10 ms qidiruv.

### 9.4 Dedup query (`services/dedup.py`)

```python
async def is_duplicate(db, embedding: list[float], threshold: float = 0.92) -> bool:
    res = await db.execute(
        text("""
            SELECT 1 FROM data_engine.question_embeddings
            WHERE 1 - (embedding <=> :v) >= :t
            LIMIT 1
        """),
        {"v": str(embedding), "t": threshold},
    )
    return res.scalar() is not None
```

---

## 10. CEFR klassifikatori va cold-start qiyinlik

### 10.1 Hybrid yondashuv

Bitta LLM klassifikator yetarli emas. Quyidagilar birlashtiriladi:

1. **EVP (English Vocabulary Profile)** — Cambridge'ning ochiq lug'ati, har so'zga CEFR daraja beradi.
2. **CEFR-J** — Yapon-asoslangan yangi vokabular profile.
3. **LLM (`gemini-2.5-flash`, temp 0.0)** — passage + savolni o'qiydi va CEFR taxmini beradi.

Final qaror: 70% LLM × 30% wordlist heuristic. Ikkalasi rozi bo'lsa → `confidence > 0.8`. Aks holda `in_review`.

### 10.2 Cold-start IRT parametrlari

LLM 1-9 baholaydi: "Bu savol qanchalik qiyin?" Bu **logit z-shkalaga** aylantiriladi:

```python
# rating = 1..9; 5 — neytral
difficulty_b = (rating - 5.0) / 2.5     # masalan rating=8 → b=1.2 (qiyin)
discrimination_a = 1.0                  # default; empirik ma'lumotlar yig'ilganda yangilanadi
```

Empirik javoblar yig'ilgach (≥30), `py-irt` MML estimation real `a, b`'ni qayta hisoblaydi.

---

## 11. IRT 2PL kalibratsiyasi

### 11.1 2PL modeli matematik ifodasi

Item Response Theory (IRT) 2-parameter logistic (2PL):

$$
P(X_{ij}=1 | \theta_j, a_i, b_i) = \frac{1}{1 + e^{-a_i(\theta_j - b_i)}}
$$

Bu yerda:
- `θ_j` — `j`-talabaning **lateral qobiliyat** (logit shkalasida; -3 dan +3 gacha tipik)
- `a_i` — `i`-itemning **diskriminatsiyasi** (qobiliyatga sezgirligi; ideal 0.7–2.5)
- `b_i` — `i`-itemning **qiyinligi** (P=0.5 bo'ladigan θ qiymati)

### 11.2 Marginal Maximum Likelihood Estimation (MML)

Iterativ EM: `θ` ni Gauss prior bilan integratsiya qilib `a, b`'ni topish. `py-irt` Pyro orqali bunni bajaradi.

Bizning real-time uchun **damped Newton-Raphson** qo'l yozildi (`services/calibration.py`'dagi `_fit_2pl_item` funksiyasi):

```python
def _fit_2pl_item(thetas, correct, c=0.0, a_init=1.0, b_init=0.0,
                  max_iter=50, tol=1e-4, damping=0.7):
    a, b = a_init, b_init
    for _ in range(max_iter):
        p = _p_correct(thetas, a, b, c)         # 2PL ehtimollik
        w = p * (1 - p)                          # diagonal weight
        residual = correct - p
        # Gradient
        d_a = np.sum((thetas - b) * residual)
        d_b = -a * np.sum(residual)
        # Hessian (tridiagonal approximation)
        H_aa = -np.sum(((thetas - b)**2) * w)
        H_bb = -(a**2) * np.sum(w)
        H_ab = a * np.sum((thetas - b) * w) - np.sum(residual)
        # Inverse 2x2 matrix
        det = H_aa * H_bb - H_ab**2
        if abs(det) < 1e-9:
            break
        delta_a = (H_bb * d_a - H_ab * d_b) / det
        delta_b = (H_aa * d_b - H_ab * d_a) / det
        a += damping * delta_a
        b += damping * delta_b
        # Box constraints
        a = max(0.1, min(3.5, a))
        b = max(-4.0, min(4.0, b))
        if abs(delta_a) < tol and abs(delta_b) < tol:
            break
    return a, b
```

### 11.3 Infit / outfit MS

Item fit sifatini baholash uchun:
- **outfit MS** = mean(z²), bu yerda z = (x - p) / √(p(1-p)). Outliers ta'sirida sezgir.
- **infit MS** = weighted version (information-weighted), outliers ta'sirini kamaytiradi.

Ideal: 0.7 ≤ MS ≤ 1.3. < 0.7 → over-fitting (item juda discriminative); > 1.3 → noise-fit (yomon item).

### 11.4 `run_recalibration()` arq job (kechasi 02:00 UTC)

Pseudocode:
```python
async def run_recalibration(db, min_responses: int = 30):
    items = await db.execute(
        select(Question).where(Question.n_responses >= min_responses)
    ).scalars().all()
    run_id = uuid4()
    items_fit = items_skipped = 0
    for q in items:
        responses = await _fetch_response_data_for(db, q.id)  # analytics.item_response_data
        thetas = [r.theta_at_answer for r in responses]
        correct = [int(r.is_correct) for r in responses]
        a_old, b_old = q.discrimination_a, q.difficulty_b
        try:
            a_new, b_new = _fit_2pl_item(thetas, correct, a_init=float(a_old), b_init=float(b_old))
            infit_ms, outfit_ms = _compute_fit_stats(thetas, correct, a_new, b_new)
            await db.execute(update(Question).where(Question.id == q.id).values(
                discrimination_a=a_new, difficulty_b=b_new,
            ))
            await db.execute(insert(ItemParameterHistory).values(
                question_id=q.id, calibration_run_id=run_id,
                a_old=a_old, b_old=b_old, a_new=a_new, b_new=b_new,
                n_responses_at_fit=len(responses),
                infit_ms=infit_ms, outfit_ms=outfit_ms,
            ))
            items_fit += 1
        except Exception as exc:
            log.warning("calibration_failed", item_id=str(q.id), error=str(exc))
            items_skipped += 1
    await db.execute(insert(CalibrationRun).values(
        id=run_id, items_fit=items_fit, items_skipped=items_skipped,
        model="2pl", convergence_rate=items_fit / max(1, len(items)),
    ))
    return {"run_id": run_id, "items_fit": items_fit, "items_skipped": items_skipped}
```

### 11.5 Parameter recovery testi

`tests/unit/test_calibration.py` ichida:
- Sintetik 600 javob generatsiyasi: `a=1.4, b=-0.6` parametrlari bilan
- `_fit_2pl_item` chaqiruv
- `assert abs(a_recovered - 1.4) < 0.5 and abs(b_recovered - (-0.6)) < 0.5`

Bu testning ishlashi 2PL Newton-Raphson-ning to'g'riligini matematik tasdiqlaydi.

---

## 12. DIF tahlili (Mantel-Haenszel)

### 12.1 Mantel-Haenszel χ² nima?

Bir xil θ darajasidagi turli guruhlar (`G_a`, `G_b`) bir xil itemga qancha ko'p ehtimolda to'g'ri javob beradimi? Agar `G_b` doimiy ravishda yuqori/past javob bersa — bu **DIF (Differential Item Functioning)**, ya'ni item bir guruhga adolatsiz.

Formula:
$$
\chi^2_{MH} = \frac{\left(\sum_k (R_{ak} - E(R_{ak}))\right)^2}{\sum_k \text{Var}(R_{ak})}
$$

bu yerda `k` — θ stratasi (masalan 5 ta strata: -2, -1, 0, 1, 2 atrofida).

### 12.2 D-DIF effect size

$$
D\text{-}DIF = -2.35 \cdot \ln(\alpha_{MH})
$$

bu yerda `α_MH` — Mantel-Haenszel odds ratio. ETS guidelines:
- |D-DIF| < 1.0 → severity A (negligible)
- 1.0 ≤ |D-DIF| < 1.5 → B (moderate)
- |D-DIF| ≥ 1.5 → C (large) — savol qayta ko'rib chiqilishi shart

### 12.3 Bonferroni correction

`n` ta savol uchun multiple comparisons → `α_per_test = 0.05 / n`. `p_value_bonferroni = min(1.0, p_value × n)`.

### 12.4 `run_dif_analysis(db, group_a, group_b)` (services/calibration.py)

L1 (foydalanuvchining ona tili — `auth.users.l1` ustuni) bo'yicha guruhlash:
- group_a = `"uz"` (o'zbek)
- group_b = `"other"`

5 stratada Mantel-Haenszel hisoblaydi, har bir savolga `dif_findings` yozadi.

Qabul mezoni (dissertatsiyada): savollarning **≥90%** severity `A` darajasida (negligible DIF), `≤10%` severity `B`, `0` severity `C`. Agar `C` topilsa → savol arxivlanadi yoki qayta tahrirlanadi.

---

## 13. Inter-Rater Reliability

### 13.1 Cohen's quadratic-weighted κ

LLM `gemini-2.5-pro` bahosi vs odam baholovchi (instruktor) bahosi orasidagi mosligini o'lchaydi.

Formula:
$$
\kappa = 1 - \frac{\sum w_{ij} \cdot O_{ij}}{\sum w_{ij} \cdot E_{ij}}
$$

bu yerda `w_{ij} = (i-j)^2 / (n-1)^2` — quadratic weights (yaqin baholarni cheklamasdan, yiroq baholarni ko'p jazolaydi).

### 13.2 IELTS Band uchun moslash

IELTS bandlari diskret 0.5 qadam bilan (0.0, 0.5, ..., 9.0) → 19 ta ordinal kategoriya.

```python
def cohens_kappa(rater_a: list[float], rater_b: list[float]) -> dict:
    # 0.0..9.0 -> int 0..18 (0.5 qadam)
    a_int = [int(round(v * 2)) for v in rater_a]
    b_int = [int(round(v * 2)) for v in rater_b]
    n = len(a_int)
    cm = np.zeros((19, 19), dtype=int)
    for ai, bi in zip(a_int, b_int):
        cm[ai, bi] += 1
    # Quadratic weights
    w = np.fromfunction(lambda i, j: ((i - j) ** 2) / (18 ** 2), (19, 19))
    o = cm / cm.sum()                         # observed
    a_marg = cm.sum(1) / n
    b_marg = cm.sum(0) / n
    e = np.outer(a_marg, b_marg)              # expected (chance)
    kappa = 1 - (w * o).sum() / max(1e-9, (w * e).sum())
    pearson_r = np.corrcoef(a_int, b_int)[0,1] if n > 1 else 0
    mae = np.mean(np.abs(np.array(rater_a) - np.array(rater_b)))
    return {"kappa": float(kappa), "pearson_r": float(pearson_r), "mae": float(mae), "n": n}
```

### 13.3 Maqsad

Dissertatsiyada **Pearson r > 0.75 va κ > 0.65** ko'rsatish — bu "substantial agreement" (Landis-Koch shkalasi). 30 ta IELTS Writing javob × 2 odam baholovchi × LLM bilan tajriba o'tkaziladi (10-11 hafta).

---

## 14. Adaptive Item Selection

### 14.1 Maximum Fisher Information selektor

`exam-platform-api` har bir savol o'rniga `data-engine /v1/items/next?theta=&skill=&seen_ids=`'ni chaqiradi. Tanlash mezoni:

$$
I(\theta, a, b) = a^2 \cdot p(\theta) \cdot (1 - p(\theta))
$$

bu yerda `p(θ) = 1 / (1 + e^{-a(θ-b)})`. **Maximum** `I(θ, a, b)` topiladi.

### 14.2 Implementation (`services/items.py`)

```python
async def next_item(db, attempt_id, theta, skill, seen_ids: set[UUID], cefr_min, cefr_max):
    candidates = (await db.execute(
        select(Question)
        .where(
            Question.skill == skill,
            Question.status == "approved",
            Question.id.notin_(seen_ids),
            Question.cefr_level_id.between(cefr_min, cefr_max),
        )
    )).scalars().all()
    best = None
    best_info = -1.0
    for q in candidates:
        a, b = float(q.discrimination_a), float(q.difficulty_b)
        p = 1 / (1 + math.exp(-a * (theta - b)))
        info = a * a * p * (1 - p)
        if info > best_info:
            best_info = info
            best = q
    return best
```

### 14.3 Stop rule

`SE(θ) < 0.3` yoki section item budget tugaganda to'xtaydi.

$$
SE(\theta) = \frac{1}{\sqrt{\sum_i I(\theta, a_i, b_i)}}
$$

### 14.4 Cold-start

Birinchi savol uchun `θ = 0`. ALBA-style 3-savol screener `theta`'ni tezda kalibrlaydi: 1 oson + 1 o'rta + 1 qiyin → 3 javobdan keyin Newton-Raphson 1-2 iteratsiyasi bilan `θ_initial`'ni topadi.

---

## 15. LLM xarajat va kuzatuv

### 15.1 Per-call logging

Har **bitta** LLM chaqiruv `analytics.llm_calls`'ga yoziladi (yuqorida). `LLMRouter.complete()` ichida `await self._cost_logger.record(...)` chaqiriladi.

### 15.2 Admin dashboard (`/admin → /llm-usage`)

Admin UI (data-engine-web Next.js):
- **Summary card**: 24 soat / 7 kun / 30 kun; total tokens, total $, avg latency
- **Stacked bar by purpose** (Recharts)
- **Heatmap by hour-of-day**
- **Top 100 expensive calls** (link → detail)

Endpoint: `GET /v1/analytics/llm-usage/summary?since=24h`.

### 15.3 Langfuse integratsiyasi (ixtiyoriy)

`LANGFUSE_HOST` va `LANGFUSE_PUBLIC_KEY/SECRET_KEY` env'lari mavjud bo'lsa, `LLMRouter` Langfuse SDK orqali ham yozadi: trace, span, generation, score. Bu dissertatsiyaning **6-bobi (kuzatuv va MLOps)** uchun foydali.

---

## 16. Xavfsizlik qatlami

### 16.1 OWASP-aware middleware stack (`languagepro_common.app_factory.build_app`)

Har 3 servis (`auth-api`, `data-engine-api`, `exam-platform-api`) bir xil security stack ishlatadi:

```python
app.add_middleware(SecurityHeadersMiddleware)   # x-frame DENY, nosniff, ...
app.add_middleware(RequestIdMiddleware)         # ULID x-request-id
app.add_middleware(CORSMiddleware, ...)
app.add_middleware(_LazyIdempotency)            # Redis Idempotency-Key cache
app.add_middleware(_LazyRateLimit, rules=[...]) # Redis token-bucket
app.add_middleware(CSRFMiddleware, skip_paths={...})  # Double-submit
```

### 16.2 CSRF (Double-Submit)

`CSRFMiddleware` (security.py):
- POST/PATCH/PUT/DELETE so'rovlarda `X-CSRF-Token` headerini `lp_csrf` cookie'ga teng deb tekshiradi.
- `Authorization: Bearer ...` borligini ko'rib **S2S so'rovlarni o'tkazadi**.
- Skip paths: `/v1/login`, `/v1/register`, `/v1/refresh` (cookie hali yo'q).
- Buzilganda RFC 9457 problem-details JSON `403`.

### 16.3 Rate limit

Redis token-bucket (per-IP yoki per-user agar `x-user-id` headerda kelsa):

```python
rate_limit_rules=[
    ("/v1/generation/jobs", 10, 60),       # 10/min
    ("/v1/items/next",     600, 60),       # 600/min S2S issiq yo'l
    ("/v1/research/calibration/run", 1, 600),  # 1/10min — og'ir job
],
default = (120, 60)  # boshqa hammasi
```

429 javob `Retry-After` header bilan.

### 16.4 Idempotency

`Idempotency-Key` headeri kelsa:
- Redis key `idem:{method}:{path}:{user_id}:{key}` 24h cached.
- Qayta urinishda cached `{status, body, headers}` qaytariladi (`x-idempotent-replay: true`).
- Foydasi: tarmoq xatoda yoki double-click bilan client qayta yuborganda **bir xil savol ikki marta yaratilmaydi**, **bir xil to'lov ikki marta amalga oshmaydi** va h.k.

### 16.5 Audit log

`languagepro_common.audit.audit_log()`:

```python
SAFE_TYPES = frozenset({
    "signup", "login_success", "login_failed", "logout", "refresh_success",
    "refresh_replay_detected", "password_changed", "role_granted", "role_revoked",
    "oauth_linked", "account_deleted",
    "attempt_started", "attempt_completed", "attempt_abandoned", "section_completed",
    "anti_cheat_focus_loss", "anti_cheat_paste_blocked", "anti_cheat_devtools_open",
    "question_approved", "question_rejected", "generation_job_started",
    "generation_job_finished", "prompt_template_changed", "llm_config_changed",
    "checkout_started", "subscription_changed", "payment_succeeded", "payment_failed",
    "manual_grade_override", "api_key_created", "api_key_revoked",
    "entitlement_override_granted",
})
```

PII redaction: `password`, `token`, `card`, `cvv` keys → `[REDACTED]` payload'da.

### 16.6 RBAC

Roles: `student`, `examiner`, `content_admin`, `researcher`, `superadmin`. JWT'da `roles[]` array; FastAPI dependency `require_role("content_admin")` admin endpoint'larida ishlatiladi.

---

## 17. Eksport va tadqiqot tuzilmalari

### 17.1 CSV eksportlar

Dissertatsiyaning **eksperimental bobi** uchun:

- `/v1/exports/questions.csv` — `id, type, skill, cefr, status, b, a, n_responses, license, model, created_at`
- `/v1/exports/validation-results.csv` — `q_id, jury_a/b/c_decision, final_decision, agreement_rate`
- `/v1/exports/generation-jobs.csv` — `id, params, totals, started, finished, duration_seconds`
- `/v1/exports/llm-calls.csv` — `purpose, model, tokens_in, tokens_out, cost, latency, status` (oxirgi 30 kun)

CSV'lar `pandas`/`R` orqali tahlil qilinadi va **5-bob (eksperimental natijalar)** uchun jadval va grafiklar sifatida dissertatsiyaga kiritiladi.

### 17.2 Tadqiqot dashboardlari (`data-engine-web`)

- `/admin/calibration` — barcha runlar tarixi, har bir item parameter evolyutsiyasi grafigi (line chart)
- `/admin/dif` — DIF findings, severity bo'yicha guruhlangan
- `/admin/nlp-lab` — NLP overview: avg sentence length, vocabulary diversity, error_taxonomy distribution

---

## 18. Joylashtirish

### 18.1 Docker Compose (dev)

`infra/compose/docker-compose.dev.yml`:
- `postgres` (pgvector/pgvector:pg17)
- `redis` (redis:7-alpine)
- `minio` (object storage; sertifikat PDFlari uchun)
- `auth-api` (port 8002)
- `data-engine-api` (port 8000)
- `data-engine-worker` (arq)
- `exam-platform-api` (port 8001)
- `exam-platform-worker` (arq)
- `caddy` (reverse proxy port 80/443)

### 18.2 Caddy konfiguratsiyasi

```caddy
admin.localhost:80 {
    handle_path /api/auth/* {
        reverse_proxy auth-api:8000
    }
    handle_path /api/data/* {
        reverse_proxy data-engine-api:8000
    }
    reverse_proxy host.docker.internal:3002
}

api.localhost:80 {
    handle_path /auth/* { reverse_proxy auth-api:8000 }
    handle_path /data/* { reverse_proxy data-engine-api:8000 }
}
```

### 18.3 Production VPS (rejada)

- Hetzner CPX31 (4 vCPU, 8GB RAM, 160GB SSD, ~€10/oy)
- Caddy avtomatik TLS Let's Encrypt
- DNS: `aiexam.uz` apex + `*.aiexam.uz` wildcard
- Postgres: managed (Neon yoki RDS) yoki self-hosted bilan WAL-G backup

---

## 19. Testlash strategiyasi

### 19.1 Unit testlar

`apps/data-engine-api/tests/unit/test_calibration.py` (5 test):
1. `test_p_correct_2pl_at_b_equals_0_5` — 2PL tenglama θ=b da P=0.5 berishini tekshiradi
2. `test_p_correct_3pl_floor_is_c` — 3PL pol = c (guessing) tekshiriladi
3. `test_fit_2pl_recovers_known_parameters` — 600 ta sintetik javobdan a=1.4, b=-0.6 tiklanadi (±0.5)
4. `test_cohens_kappa_perfect_agreement_is_one` — Bir xil baholar → κ=1.0
5. `test_cohens_kappa_off_by_half_band_is_high` — yarim band-farq holatida κ>0.5, MAE=0.5

### 19.2 CI

`.github/workflows/test.yml` har push'da:
- `uv sync --all-packages`
- `uv run mypy --strict apps/ python/`
- `uv run ruff check apps/ python/`
- `uv run pytest -v`
- `pnpm tsc --noEmit -r` (frontend type check)

### 19.3 Integratsion testlar (rejada)

`testcontainers` orqali real Postgres/Redis bilan:
- `test_generation_e2e.py` — generate → embed → dedup → jury → approve E2E
- `test_calibration_e2e.py` — synthetic 100 user × 50 item → recalibration → parameter recovery RMSE

---

## 20. Tajribaviy baholash

### 20.1 Kalit metrikalar (KPI)

| Metrika | Maqsad | O'lchash usuli |
|---|---|---|
| Generatsiya birinchi-marta-o'tish darajasi | ≥85% | `validation_results.final_decision='approved' / total` |
| Pgvector dedup recall | ≥98% | sintetik takrorlangan savollar bilan tajriba |
| CEFR klassifikator aniqligi | ≥80% | 100 odamga baholangan savol vs LLM klassifikatori |
| IRT parameter recovery RMSE | <0.4 | sintetik MLM-yaratilgan ma'lumotlardan |
| LLM per-question xarajat | ≤$0.015 | `analytics.llm_calls` sum / generation_jobs.totals |
| DIF darajada `C` itemlar | ≤2% | `dif_findings.severity='C' / total` |
| IRR (LLM vs odam) | κ ≥0.65, r ≥0.75 | 30 ta IELTS Writing javobi × 2 odam × LLM |
| Calibration nightly job latency | <5 daqiqa | arq run_at → finished_at |

### 20.2 Pilot

10-11 hafta — BSU ingliz tili kafedrasi 10–20 talaba bilan:
1. Har talaba mini IELTS Reading (15 savol) topshiradi
2. Har savolga `is_correct, time_ms, theta_at_answer` yoziladi `analytics.item_response_data`'ga
3. 24 soat o'tib `nightly_recalibration` ishga tushadi
4. Pre/post `b` qiymatlari taqqoslanadi → kalibratsiya ishlashini ko'rsatadi

### 20.3 Eksperimental bob mazmuni

**4-bob (Eksperimental natijalar)** uchun jadvallar:
- Jadval 4.1: Multi-jury vs single-LLM (n=200 savol, 95% CI)
- Jadval 4.2: Pgvector dedup recall/precision (sintetik dataset)
- Jadval 4.3: CEFR klassifikator confusion matrix (6×6)
- Jadval 4.4: IRT parameter recovery (sintetik 100 user × 50 item)
- Jadval 4.5: DIF severity distribution (uz vs other L1)
- Jadval 4.6: LLM cost analiz: $/savol, $/imtihon

---

## 21. Dissertatsiya boblariga moslashtirish

| Bob | Mavzu | Tegishli kod / hujjat | Ssilkalanadigan kalit testlar |
|---|---|---|---|
| 1 | Kirish va muammoning qo'yilishi | `00-overview.md`, `09-thesis-mapping.md` | — |
| 2 | Adabiyotlar tahlili | `06-prompt-engineering.md`, IRT klassik adabiyotlar | — |
| 3 | Tizim arxitekturasi va metodologiya | `01-architecture.md`, `04-ai-pipeline.md`, `05-irt-calibration.md` | `_fit_2pl_item` testi |
| 4 | Eksperimental natijalar | `10-evaluation.md` + jadvallar | calibration_runs, dif_findings, llm_calls |
| 5 | Xulosa va kelajak ishlar | `09-thesis-mapping.md` (Future plan bo'limi) | — |

### 21.1 Bobomurodning **xususiy hissasi**:

1. `LLMRouter` + `PromptRegistry` arxitekturasi (~440 satr Python)
2. `_fit_2pl_item` Newton-Raphson realisator (~80 satr)
3. `run_recalibration` arq job (~70 satr)
4. `run_dif_analysis` Mantel-Haenszel (~110 satr)
5. `cohens_kappa` IRR funksiyasi (~30 satr)
6. `services/jury.py` multi-jury voting (~64 satr)
7. `services/dedup.py` pgvector dedup (~37 satr)
8. `services/cefr.py` CEFR klassifikator (~20 satr — LLM + wordlist hybrid)
9. `services/generator.py` end-to-end generatsiya pipeline (~147 satr)
10. 12 ta production prompt (`prompts/*.yaml`)

---

## 22. Glossary

| EN/Math | UZ tushuntirish |
|---|---|
| **CEFR** | Common European Framework of Reference — Yevropa tilshunoslik darajalari (A1, A2, B1, B2, C1, C2) |
| **IELTS** | International English Language Testing System — xalqaro IELTS imtihoni; band 0–9 |
| **IRT 2PL** | Item Response Theory 2-parameter logistic — ikki parametrli (a=diskriminatsiya, b=qiyinlik) ehtimollik modeli |
| **MML** | Marginal Maximum Likelihood — IRT parametrlarini topish uchun EM uslubi |
| **Newton-Raphson** | Iterativ optimizatsiya: `x_{n+1} = x_n - H^{-1} g`, gradient va gessian bilan |
| **Fisher Information** | `I(θ) = a² p(θ)(1-p(θ))` — itemning ma'lum θ atrofida qancha "ma'lumot" bergani |
| **DIF** | Differential Item Functioning — turli guruhlar bir xil qobiliyatda turlicha javob berishi |
| **Mantel-Haenszel** | DIF aniqlash uchun stratificatsiyalangan χ² test |
| **D-DIF** | DIF effect size (logit shkalasida) |
| **Cohen's κ** | Inter-rater reliability metrikasi; quadratic-weighted versiyasi ordinal IELTS bandlari uchun |
| **pgvector** | PostgreSQL extension — vektorlar va cosine/L2 distance |
| **HNSW** | Hierarchical Navigable Small World — yuqori tezlikdagi ANN qidiruv |
| **Multi-jury** | Bir xil savolni 2-3 ta turli LLM'ga ko'rsatib, majority vote olish |
| **Cold-start qiyinlik** | Empirik ma'lumot bo'lmagan yangi savolga LLM-baholangan boshlang'ich `b` qiymati |
| **Logit shkalasi** | `log(p / (1-p))` — ehtimollikning chiziqli shkalasi (-∞..+∞) |
| **z-skala** | Standardized o'rtacha-0, std-1 normalizatsiya |
| **Idempotency** | Bir xil so'rovni qayta yuborish bir xil natija beradi (side-effect ikki marta sodir bo'lmaydi) |
| **CSRF Double-submit** | Cookie + header bir xil tokenga ega bo'lishi mexanizmi |
| **HNSW m, ef_construction** | HNSW indexning tuning parametrlari (graf neighbours soni va build search width) |
| **arq cron_jobs** | arq workerda kechki kalibratsiya kabi rejalashtirilgan vazifalar |
| **structlog** | Strukturalashgan JSON loglar (key=value) |

---

## Yakuniy eslatma

Ushbu hujjat **44 ta foiz** real kod va **56 ta foiz** uni izohlash. Har bir muhim algoritm yoki arxitektura qarori uchun:
- **Fayl yo'li** ko'rsatilgan (`apps/data-engine-api/src/data_engine/services/calibration.py`)
- **Ma'lumotlar bazasi jadvali** sanab o'tilgan
- **Matematik formula** kerak bo'lganda berilgan
- **Empirik tasdiqlash usuli** ko'rsatilgan

AI'ga (Claude, ChatGPT, Gemini) ushbu hujjatni feed qilib, dissertatsiya bobini Uzbek tilda yozishni so'rashingiz mumkin. AI yetishmayotgan boblarni ushbu kontentdan keltirib chiqarishi va sizga to'g'ri akademik uslubda yozib berishi mumkin.

**O'qing, tahrir qiling, kerakli bo'lsa qayta yozing — lekin har bir asosiy texnik yoki ilmiy da'voni shu yerdan oling**.
