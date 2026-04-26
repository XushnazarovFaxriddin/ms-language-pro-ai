# Glossariy: O'zbekcha ↔ Inglizcha (EN ↔ UZ Glossary)

> **Maqsad**: Loyiha bo'yicha texnik atamalar uchun **kanonik** (yagona to'g'ri) tarjimalar. Hujjatlarni o'zbekcha yozayotganda har xil variantlar (jargon, transliteratsiya) ishlatilmasligi uchun.

> **Goal**: Single canonical EN ↔ UZ translations for technical terms used throughout LanguagePro AI documentation. Avoids inconsistent translations in dissertation chapters.

---

## A — Asosiy tushunchalar (Core concepts)

| O'zbekcha | English | Tavsif |
|---|---|---|
| Sun'iy intellekt (SI) | Artificial Intelligence (AI) | Umumiy nom |
| Mashina o'rganish | Machine Learning (ML) | |
| Chuqur o'rganish | Deep Learning (DL) | |
| Katta til modeli | Large Language Model (LLM) | Loyihada Gemini ishlatilmoqda |
| Model | Model | Aynan shu so'z, transliteratsiya emas |
| Promt | Prompt | "Buyruq" emas — texnik termin sifatida |
| Promt-injinerlik | Prompt engineering | |
| Fine-tuning | Fine-tuning | Tarjima qilinmaydi |
| Embedding | Embedding (yoki "embedding vektori") | "Joylashtirish" deb tarjima qilinmaydi |
| Vektor | Vector | |
| Tokenizatsiya | Tokenization | |
| Token | Token | |

---

## B — Til baholash (Language assessment)

| O'zbekcha | English | Tavsif |
|---|---|---|
| Til bilish darajasi | Language proficiency / level | |
| Imtihon | Exam | |
| Imtihon urunishi | Exam attempt | DB: `exam_attempts` |
| Sinov | Test | "Imtihon"ga yaqin sinonim |
| Savol bazasi | Question bank | DB: `question_banks` |
| Savol | Question / item | "Item" — IRT kontekstida |
| Variant | Option / choice | MCQ ko'p tanlovli |
| To'g'ri javob | Correct answer / answer key | |
| Distraktor | Distractor | Noto'g'ri javob varianti (xato boshqa fikrga olib boruvchi) |
| Bo'lim | Section | IELTS bo'limlari: Listening, Reading, Writing, Speaking |
| Topshiriq | Task | Writing Task 1 / Task 2 |
| Cue card | Cue card | Speaking Part 2 — tarjima qilinmaydi |
| Band | Band | IELTS shkalasi (0-9) |
| Daraja | Level | CEFR (A1-C2) |
| Ko'nikma | Skill | listening / reading / writing / speaking |
| Tinglash | Listening | |
| O'qish | Reading | |
| Yozish | Writing | |
| Gapirish | Speaking | |
| Mahorat | Proficiency | "Bilish darajasi" deb ham aytamiz |
| Ovozli yozuv | Audio recording | DB: `audio_recordings` |
| Transkriptsiya | Transcript / transcription | |

---

## C — IRT (Item Response Theory)

| O'zbekcha | English | Tavsif |
|---|---|---|
| Adaptiv test | Adaptive test | Savollar foydalanuvchining darajasiga moslashadi |
| Element javob nazariyasi | Item Response Theory (IRT) | |
| 2PL model | 2PL model (Two-Parameter Logistic) | a (diskriminatsiya) + b (qiyinlik) |
| Qiyinlik parametri | Difficulty parameter (b) | |
| Diskriminatsiya parametri | Discrimination parameter (a) | |
| Ehtimollik | Probability | |
| Iqtidor (theta) | Ability (θ) | Foydalanuvchining yashirin qobiliyati |
| Maksimal axborot | Maximum information | Fisher information |
| Kalibratsiya | Calibration | DB: `calibration_runs` |
| Element banki | Item bank | Question bank sinonimi |
| To'xtatish sharti | Stopping criterion / rule | SE(θ) < 0.3 |
| Sovuq start | Cold start | Yangi savol uchun boshlang'ich `b` |

---

## D — Texnik infratuzilma (Technical infrastructure)

| O'zbekcha | English | Tavsif |
|---|---|---|
| Monorepo | Monorepo | |
| Mikroservis | Microservice | |
| API | API | Aynan shu, "interfeys" deb tarjima qilmaymiz |
| Servis | Service | |
| Konteyner | Container (Docker) | |
| Tasvir | Image (Docker image) | |
| Ish hajmi | Workload | |
| Yuk muvozanati | Load balancer | |
| Reverse proksi | Reverse proxy | Caddy |
| Ma'lumotlar bazasi | Database | |
| Sxema | Schema | DB schema |
| Jadval | Table | DB table |
| Maydon | Field / column | |
| Yozuv | Row / record | |
| Indeks | Index | |
| Migratsiya | Migration | Alembic |
| Cache (kesh) | Cache | Redis |
| Navbat | Queue | arq |
| Fon vazifa | Background job | |
| Ish | Job | arq job |
| Ishchi | Worker | arq worker |
| Obyekt xotirasi | Object storage | MinIO/S3 |
| Avtorizatsiya | Authorization | Ruxsat berish |
| Autentifikatsiya | Authentication | Kim ekanligini tekshirish |
| Foydalanuvchi | User | |
| Sessiya | Session | |
| Token | Token | |
| Cookie (kuki) | Cookie | |

---

## E — Frontend / UX

| O'zbekcha | English | Tavsif |
|---|---|---|
| Sahifa | Page | |
| Komponent | Component | React |
| Props | Props | Tarjima qilinmaydi |
| Holat | State | React state |
| Holat boshqaruvi | State management | Zustand, TanStack Query |
| Yo'nalish | Route | URL route |
| Qatlam (komponent) | Layout | Next.js layout |
| Server komponenti | Server Component (RSC) | |
| Mijoz komponenti | Client Component | `'use client'` |
| Server Actions | Server Actions | Tarjima qilinmaydi |
| Forma | Form | |
| Validatsiya | Validation | Zod |
| Imzosiz xabar | Toast notification | |
| Indikator | Loader / spinner | |
| Skelet | Skeleton | Loading placeholder |

---

## F — Generatsiya va validatsiya (Generation & Validation)

| O'zbekcha | English | Tavsif |
|---|---|---|
| Savol generatsiya | Question generation | |
| Validatsiya | Validation | |
| Sud (jury) tizimi | Jury system / multi-jury | 3 ta LLM ovoz beradi |
| Konsensus | Consensus | |
| Inson reviewi | Human review | DB: `human_reviews` |
| Ekspert baholovchi | Examiner | Rol nomi |
| Mazmun-admin | Content admin | Rol nomi |
| Tadqiqotchi | Researcher | Rol nomi |
| Dublikat aniqlash | Duplicate detection | pgvector orqali |
| Kosinus o'xshashligi | Cosine similarity | |
| Ko'zgu | Mirror / replica | |
| Sifat nazorati | Quality control / QA | |

---

## G — Baholash pipeline'i (Scoring pipeline)

| O'zbekcha | English | Tavsif |
|---|---|---|
| Baho | Score | |
| Baholash | Scoring / grading | |
| Ishonch ko'rsatkichi | Confidence score | LLM uncertainty |
| Mezon | Criterion (pl. criteria) | IELTS Writing 4 mezoni |
| Rubrika | Rubric | DB: `rubrics` |
| Avtomatik baholash | Automated assessment / scoring | |
| Avtomatik insho baholash (AAB) | Automated Essay Scoring (AES) | |
| Ko'p modal | Multimodal | Audio + matn |
| Ko'p baholash mosligi | Inter-rater reliability (IRR) | Pearson r, Cohen's κ |
| Pirson korrelyatsiyasi | Pearson correlation (r) | |
| Cohen kappa | Cohen's kappa (κ) | |
| Sertifikat | Certificate | DB: `certificates` |
| Fikr-mulohaza | Feedback | |
| Tushuntirish | Explanation / rationale | |

---

## H — Loyiha boshqaruvi (Project management)

| O'zbekcha | English | Tavsif |
|---|---|---|
| Talaba | Student | Bobomurod, Faxriddin |
| Ilmiy rahbar | Advisor / supervisor | |
| Magisterlik dissertatsiyasi | Master's dissertation / thesis | |
| Bob | Chapter | |
| Bo'lim | Section | Tezis ichida |
| Iqtibos | Citation | |
| Adabiyot tahlili | Literature review | |
| Eksperiment | Experiment | |
| Pilot | Pilot study | 10–20 talabalik sinov |
| Bosqich | Phase | |
| Vergulli ro'yxat | Roadmap | "Yo'l xaritasi" |
| Maqsad ko'rsatkichlari | Metrics / KPIs | |
| Reja | Plan | |
| Topshiriqlar ro'yxati | Todo list | |
| ADR | ADR (Architecture Decision Record) | Tarjima qilinmaydi |
| Spetsifikatsiya | Specification (spec) | |

---

## I — Maxsus loyiha atamalari (Project-specific terms)

| O'zbekcha | English | Tavsif |
|---|---|---|
| LanguagePro AI | LanguagePro AI | Loyiha rasmiy nomi (transliteratsiya: LangvigePro AI emas) |
| Data Engine | Data Engine | Bobomurod loyihasi (`apps/data-engine-*`) |
| Exam Platform | Exam Platform | Faxriddin loyihasi (`apps/exam-platform-*`) |
| Auth Servis | Auth Service | Shared SSO (`apps/auth-api`) |
| Landing | Landing page | Marketing sayt |
| LLM Yo'naltiruvchi | LLM Router | `python/languagepro_llm/router.py` |
| Promt registri | Prompt Registry | Versioning tizimi |
| Yopiq halqa | Closed loop | response → recalibration mexanizmi |
| Imtihon yuruvchisi | Exam runner | Frontend ExamRunner komponenti |
| Yozish redaktor | Writing editor | TipTap |
| Tinglash pleyer | Listening player | Single-play audio player |

---

## J — Stilistik qoidalar (Style rules)

1. **Inglizcha qisqartmalar inglizcha qoladi**: API, SDK, LLM, IRT, JWT, MCQ, RBAC, S2S, SSE, ORM, ETL, etc.
2. **Texnologiya nomlari original qoldiriladi**: Next.js, FastAPI, Pydantic, Tailwind CSS, PostgreSQL, Redis (transliteratsiya emas).
3. **Brand nomlari**: LanguagePro AI, OpenAI (kompaniya), Gemini, Whisper, ChatGPT (lekin biz ChatGPT'ni ishlatmaymiz!).
4. **Funksiya/o'zgaruvchi nomlari**: kod ichida ingliz tilida (`get_user_profile()`), izohlarda esa o'zbekcha mumkin.
5. **Dissertatsiya matnida**: birinchi marotaba ishlatilganda ingliz tarjimasi qavs ichida (`promt-injinerlik (prompt engineering)`).

---

## K — Atalmagan / kelajak uchun (Reserved)

Quyidagi atamalar hali standartlashtirilmagan — kerak bo'lganda ushbu hujjatga qo'shing va commit comment'da `glossary:` prefix ishlating.

- "Federated learning" — ?
- "Active learning" — ?
- "Few-shot prompting" — ?
- "Chain-of-Thought" — ?

---

_Last reviewed: 2026-04-26 by joint authors. Bu ro'yxat doimiy ravishda kengaytiriladi._
