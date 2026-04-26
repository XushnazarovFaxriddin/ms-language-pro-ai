# 12 — Roadmap & Phases

> **TL;DR.** Phase 0 (week 1): repo skeleton + design system + docs. Phase 1 (weeks 2–3): auth + landing + admin shell + first generation pipeline. Phase 2 (weeks 4–6): student exam runner end-to-end (Reading + Listening), CEFR placement test. Phase 3 (weeks 7–9): writing + speaking scoring; results, certificates, history. Phase 4 (weeks 10–12): payments (Click + Payme + Stripe), plans, paywalls, billing UI. Phase 5 (weeks 13+): pilot, polish, mobile, marketing. Each phase has explicit "done" gates.

---

## Phase 0 — Foundation (week 1)

**Goal**: walking skeleton that boots cleanly; design system applied; docs are the source of truth.

| Deliverable | Doc reference |
|---|---|
| Monorepo skeleton: pnpm + Turborepo + uv workspace | [`02-architecture.md`](02-architecture.md) §4 |
| Docker Compose dev stack (Postgres + Redis + MinIO + Caddy) | [`11-deployment-and-ops.md`](11-deployment-and-ops.md) §2 |
| `@languagepro/ui` package: tokens, theme provider, primitive set | [`08-design-system.md`](08-design-system.md) §2–§7 |
| `@languagepro/i18n` with `uz`/`en` catalogs (placeholders) | [`08-design-system.md`](08-design-system.md) §10 |
| Auth-api skeleton: register, login, refresh, /me, OAuth Google | [`05-auth-and-rbac.md`](05-auth-and-rbac.md) §7–§10 |
| 3 Next.js apps booting with theme + locale switchers | [`08-design-system.md`](08-design-system.md) §3 |
| `LLMRouter` + `PromptRegistry` + `CostLogger` (Python) | [`06-ai-pipelines.md`](06-ai-pipelines.md) §3–§4 |
| `analytics.llm_calls` table + dashboard endpoints (read-only) | [`04-api-contracts.md`](04-api-contracts.md) §3.2 |
| CI: lint + type-check + unit tests + smoke E2E | [`10-engineering-conventions.md`](10-engineering-conventions.md) §11 |

**Done gate**:
- [ ] `make bootstrap && make install && make up && make migrate && make seed && make dev` from a fresh checkout boots every service in < 5 minutes.
- [ ] Open http://localhost:3000 (landing), :3001 (app), :3002 (admin) — all render the design system home with theme toggle and locale switcher working.
- [ ] Sign up + log in works in app and admin; cookie travels across `*.localhost`.
- [ ] CI green on `main`.

---

## Phase 1 — Core (weeks 2–3)

**Goal**: marketing landing page; admin can generate questions with the full pipeline; LLM dashboard live.

### Week 2 — landing + admin shell

| Deliverable | Doc reference |
|---|---|
| Landing site complete: hero, pricing teaser, FAQ, footer, legal pages | [`09-screens-and-flows.md`](09-screens-and-flows.md) §1 |
| `/[locale]/pricing` page with currency switcher | [`07-payments-and-billing.md`](07-payments-and-billing.md) §1 |
| Admin shell: sidebar, header, breadcrumbs | [`09-screens-and-flows.md`](09-screens-and-flows.md) §10 |
| Admin login + role gating (content_admin+ only) | [`05-auth-and-rbac.md`](05-auth-and-rbac.md) §3 |
| `/[locale]/dashboard` admin home with KPIs (placeholders) | [`09-screens-and-flows.md`](09-screens-and-flows.md) §11 |

### Week 3 — generation pipeline

| Deliverable | Doc reference |
|---|---|
| Full data_engine schema: questions, embeddings, banks, validation, jobs | [`03-data-model.md`](03-data-model.md) §3 |
| Question generation pipeline E2E (MCQ Reading) | [`06-ai-pipelines.md`](06-ai-pipelines.md) §5 |
| Multi-jury validation (3 Gemini variants) | [`06-ai-pipelines.md`](06-ai-pipelines.md) §6 |
| pgvector dedup + CEFR classification | [`06-ai-pipelines.md`](06-ai-pipelines.md) §7 |
| Cold-start IRT `b` from LLM rating | [`06-ai-pipelines.md`](06-ai-pipelines.md) §11 |
| `/[locale]/generation/new` form + `/jobs/[id]` SSE progress | [`09-screens-and-flows.md`](09-screens-and-flows.md) §12 |
| `/[locale]/llm-usage` dashboard — full | [`09-screens-and-flows.md`](09-screens-and-flows.md) §13 |
| `/[locale]/banks` list and edit | [`04-api-contracts.md`](04-api-contracts.md) §3.2 |

**Done gate**:
- [ ] An admin can submit a generation job for 10 MCQ Reading items at B1 and within 7 minutes see ≥ 5 `approved` questions in `/banks`.
- [ ] LLM usage dashboard shows the cost of that batch with model + purpose breakdown.
- [ ] No question reaches `approved` without passing all three jurors.

---

## Phase 2 — Exam Runner & Listening (weeks 4–6)

**Goal**: a free user can sign up, take a Reading or Listening mini test, and see a band score with feedback.

### Week 4 — student app shell + Reading

| Deliverable | Doc reference |
|---|---|
| `/[locale]/exams` exam picker | [`09-screens-and-flows.md`](09-screens-and-flows.md) §5 |
| `/[locale]/attempt/[id]` ExamRunner — MCQ types | [`09-screens-and-flows.md`](09-screens-and-flows.md) §6 |
| ExamRunner with timer, progress, sessionStorage recovery | same |
| Adaptive item selection (data-api `/items/next` with Fisher info) | [`06-ai-pipelines.md`](06-ai-pipelines.md) §11 |
| Theta update server-side (EAP) | same |
| `/[locale]/results/[attemptId]` with band breakdown | [`09-screens-and-flows.md`](09-screens-and-flows.md) §7 |

### Week 5 — Listening + TTS

| Deliverable | Doc reference |
|---|---|
| TTS integration via `gemini-2.5-flash-preview-tts` | [`06-ai-pipelines.md`](06-ai-pipelines.md) §10 |
| `synthesize_listening_audio` arq job | [`02-architecture.md`](02-architecture.md) §7 |
| ListeningPlayer component (single-play enforcement) | [`09-screens-and-flows.md`](09-screens-and-flows.md) §6 |
| Listening section + sectioned blueprints | [`03-data-model.md`](03-data-model.md) §3 |
| Audio assets stored in S3 with signed URLs | [`02-architecture.md`](02-architecture.md) §8 |

### Week 6 — placement test, history, polish

| Deliverable | Doc reference |
|---|---|
| CEFR Quick Placement (3-question adaptive screener) | [`06-ai-pipelines.md`](06-ai-pipelines.md) §11 (ALBA-style) |
| `/[locale]/history` and `/[locale]/profile` | [`09-screens-and-flows.md`](09-screens-and-flows.md) §8 |
| Skill timeline chart | [`08-design-system.md`](08-design-system.md) §6 (charts) |
| Empty states + error states pass review | [`08-design-system.md`](08-design-system.md) §13–§15 |
| Email verification (Resend) | [`05-auth-and-rbac.md`](05-auth-and-rbac.md) §9 |
| Lighthouse Performance ≥ 90 on landing + exam runner | [`10-engineering-conventions.md`](10-engineering-conventions.md) §13 |

**Done gate**:
- [ ] A new user can sign up → take CEFR Quick Placement → see their level in < 5 minutes wall-clock.
- [ ] Reading + Listening Mini blueprints have at least 50 approved questions each.
- [ ] All flows render in UZ + EN, light + dark.

---

## Phase 3 — Writing & Speaking (weeks 7–9)

**Goal**: full IELTS Academic exam supported; certificates issued (free for now); human review queue for low-confidence essays.

### Week 7 — Writing

| Deliverable | Doc reference |
|---|---|
| TipTap editor with paste-block + word count + focus tracking | [`09-screens-and-flows.md`](09-screens-and-flows.md) §6 |
| `score_writing` arq job using Gemini 2.5 Pro | [`06-ai-pipelines.md`](06-ai-pipelines.md) §8 |
| `WritingScore` schema (4 IELTS criteria + feedback_uz/en + confidence) | same |
| Confidence gate → `human_review_queue` | [`03-data-model.md`](03-data-model.md) §4 |
| `/[locale]/review-queue` examiner UI | [`09-screens-and-flows.md`](09-screens-and-flows.md) §14 |

### Week 8 — Speaking

| Deliverable | Doc reference |
|---|---|
| MediaRecorder + presigned PUT upload | [`09-screens-and-flows.md`](09-screens-and-flows.md) §6 |
| ffmpeg normalisation pipeline (worker) | [`06-ai-pipelines.md`](06-ai-pipelines.md) §9 |
| `score_speaking` job (multimodal: audio in, structured out) | same |
| WaveformVisualiser / `<MicLevel>` component | [`08-design-system.md`](08-design-system.md) §6 |
| Audio retention policy (90 days) | [`07-payments-and-billing.md`](07-payments-and-billing.md) §3 (PII §) |

### Week 9 — Certificates + IRT calibration

| Deliverable | Doc reference |
|---|---|
| PDF certificate render (worker) with signed `public_id` | [`03-data-model.md`](03-data-model.md) §4 |
| `/[locale]/verify/[publicId]` public verify page | [`09-screens-and-flows.md`](09-screens-and-flows.md) §1 |
| Nightly `recalibrate_items` job (`py-irt`) | [`06-ai-pipelines.md`](06-ai-pipelines.md) §11 |
| `/[locale]/calibration` admin dashboard | [`04-api-contracts.md`](04-api-contracts.md) §3.2 |
| Inter-rater study (n=30 essays, 2 humans + LLM) | [`06-ai-pipelines.md`](06-ai-pipelines.md) §15 (acceptance) |

**Done gate**:
- [ ] A student can complete a full IELTS Academic Mini (4 skills) attempt and receive a band score within 60 seconds of finishing.
- [ ] Pearson r between LLM and human writing graders ≥ 0.70 on the n=30 set.
- [ ] Certificate PDF is verifiable at `aiexam.uz/verify/<id>` (public, no login).

---

## Phase 4 — Payments & Plans (weeks 10–12)

**Goal**: free / paid distinction enforced; users can upgrade and pay via Click, Payme, or Stripe; billing UI complete.

### Week 10 — billing data model + entitlements

| Deliverable | Doc reference |
|---|---|
| `billing` schema: plans, subscriptions, payment_intents, invoices, webhook_events | [`03-data-model.md`](03-data-model.md) §5 |
| `check_entitlement(user_id, key)` helper | [`05-auth-and-rbac.md`](05-auth-and-rbac.md) §6 |
| Paywall enforcement on `/exam/v1/attempts` (skill, quota) | [`07-payments-and-billing.md`](07-payments-and-billing.md) §2 |
| `<PaywallSheet>` UI component | [`08-design-system.md`](08-design-system.md) §6 |
| `/[locale]/me/billing` page (read-only) | [`09-screens-and-flows.md`](09-screens-and-flows.md) §9 |

### Week 11 — Stripe + Click

| Deliverable | Doc reference |
|---|---|
| Stripe checkout flow + webhooks (subscription create / update / cancel / invoice paid) | [`07-payments-and-billing.md`](07-payments-and-billing.md) §4.1 |
| Click checkout flow + Prepare/Complete webhook | [`07-payments-and-billing.md`](07-payments-and-billing.md) §4.2 |
| Idempotency via `webhook_events` UNIQUE | [`07-payments-and-billing.md`](07-payments-and-billing.md) §6 |
| `/[locale]/checkout/start` page (provider picker) | [`09-screens-and-flows.md`](09-screens-and-flows.md) §1 |

### Week 12 — Payme + cancellation + admin

| Deliverable | Doc reference |
|---|---|
| Payme JSON-RPC merchant API handlers | [`07-payments-and-billing.md`](07-payments-and-billing.md) §4.3 |
| Subscription cancel/resume flow | [`07-payments-and-billing.md`](07-payments-and-billing.md) §3 |
| Admin: failed payment list, refund tool, manual subs | [`09-screens-and-flows.md`](09-screens-and-flows.md) §15 |
| Email automation: payment success/failure (Resend) | [`11-deployment-and-ops.md`](11-deployment-and-ops.md) §13 |
| Legal pages updated for paid product | [`07-payments-and-billing.md`](07-payments-and-billing.md) §13 |

**Done gate**:
- [ ] All three providers tested end-to-end in their sandbox modes.
- [ ] A free user clicking "Speaking" sees the paywall, completes Pro checkout, and immediately gets access to Speaking.
- [ ] Webhook replay does not double-create a subscription.
- [ ] Cancellation: user keeps Pro until period_end, then auto-downgrades; UI reflects this.

---

## Phase 4.5 — Feedback Engine + Roadmap + Practice (weeks 13–18)

> **The dissertation-grade content depth.** Reading + Listening + Writing + Speaking are functional in Phase 1–3 — but only at L1 (band) and L2 (criterion). This phase delivers L3–L5 plus the engagement loop: practice + roadmaps + analytics. This is what differentiates LangPro from "another AI grader" and makes the product **research-defensible**.

### Week 13 — Feedback L3–L4 (writing)

| Deliverable | Doc reference |
|---|---|
| spaCy + LanguageTool integration | [`20-text-analysis-pipeline.md`](20-text-analysis-pipeline.md) §2–§3 |
| Error taxonomy seed (200 codes) + LanguageTool mapper | [`14-feedback-engine.md`](14-feedback-engine.md) §2 |
| Sentence-level annotation pipeline | [`14-`](14-feedback-engine.md) §3.3 |
| Vocabulary CEFR + AWL analysis | [`20-`](20-text-analysis-pipeline.md) §4 |
| Word-upgrade prompt + UI | [`14-`](14-feedback-engine.md) §3.4 |
| `feedback_artifacts` table + API endpoints | [`04-api-contracts.md`](04-api-contracts.md) §4.3 |

### Week 14 — Feedback L5 (speaking)

| Deliverable |
|---|
| ffmpeg normalisation + webrtcvad + librosa pipeline ([`19-`](19-audio-analysis-pipeline.md)) |
| wav2vec2 phoneme alignment ([`19-`](19-audio-analysis-pipeline.md) §5.2) |
| GOP computation + Uzbek-L1 phoneme clustering ([`19-`](19-audio-analysis-pipeline.md) §6, §8) |
| Phoneme-level annotation UI |

### Week 15 — Roadmap engine

| Deliverable |
|---|
| `roadmaps` + `srs_cards` + `user_mastery` tables ([`03-data-model.md`](03-data-model.md) §6) |
| `generate_roadmap` arq job + Gemini prompt ([`15-learning-roadmap.md`](15-learning-roadmap.md) §3) |
| FSRS-4 scheduler ([`15-`](15-learning-roadmap.md) §5) |
| Cohort-similarity + Monte-Carlo prediction ([`15-`](15-learning-roadmap.md) §4) |
| `/[locale]/roadmap` student UI ([`09-screens-and-flows.md`](09-screens-and-flows.md)) |

### Week 16 — Practice Mode

| Deliverable |
|---|
| `drills` catalogue + admin CRUD ([`16-practice-mode.md`](16-practice-mode.md) §2) |
| Drill runner UI + 12 drill types ([`16-`](16-practice-mode.md) §2.1) |
| FSRS flashcard surface ([`16-`](16-practice-mode.md) §3) |
| Pronunciation Lab UI ([`16-`](16-practice-mode.md) §5) |
| Mastery score updates from drills |

### Week 17 — AI Conversation Partner

| Deliverable |
|---|
| `conversation_sessions/turns` tables + Gemini multimodal per-turn pipeline ([`16-`](16-practice-mode.md) §4) |
| Topic catalogue (200+ cue cards seeded) |
| Per-turn structured feedback persisted |
| Conversation UI with transcript + annotations |

### Week 18 — Analytics dashboards

| Deliverable |
|---|
| 4 materialised views (mastery, band history, errors, time-spent) ([`17-`](17-analytics-and-insights.md) §3) |
| 6 student dashboard surfaces ([`17-`](17-analytics-and-insights.md) §2) |
| Gating by entitlement ([`07-payments-and-billing.md`](07-payments-and-billing.md) §2) |

**Done gate**:
- [ ] An essay graded at 7.0 produces ≥ 1 sentence annotation per paragraph and ≥ 5 word-upgrade suggestions.
- [ ] A speaking response produces phoneme-level GOP for every word.
- [ ] First-time user with target band 7.0 in 8 weeks gets a full roadmap within 30s.
- [ ] FSRS queue produces non-empty results after 5 graded cards.
- [ ] All 6 analytics dashboards load under 1s.

---

## Phase 4.7 — Research artifacts (weeks 19–22)

> **For Bobomurod's dissertation chapter on data-engine science.** This phase produces measurable scientific output that the dissertation cites.

| Week | Deliverable | Doc |
|---|---|---|
| 19 | Multi-jury κ time series + dashboard | [`18-`](18-research-and-psychometrics.md) §2 |
| 19 | Cold-start `b` validation + scatter plot | [`18-`](18-research-and-psychometrics.md) §3.3 |
| 20 | DIF detection (Mantel-Haenszel) + flagging | [`18-`](18-research-and-psychometrics.md) §4 |
| 20 | Multi-dimensional 2PL extension | [`18-`](18-research-and-psychometrics.md) §3.1 |
| 21 | IRR study (n=30 essays + speaking) with 2 BSU instructors | [`18-`](18-research-and-psychometrics.md) §5 |
| 21 | Experiment harness + first A/B (`generate_question` v1 vs v2) | [`18-`](18-research-and-psychometrics.md) §6 |
| 22 | Reproducible notebooks `docs/research/*.ipynb` | [`18-`](18-research-and-psychometrics.md) §10 |
| 22 | Parquet exports + `RESEARCH-LICENSE.md` | [`18-`](18-research-and-psychometrics.md) §9 |

**Done gate**:
- [ ] Pairwise Cohen's κ ≥ 0.6 on 200-question gold set.
- [ ] Pearson r(b_cold, b_empirical) ≥ 0.5 after ≥ 30 responses per item.
- [ ] LLM ↔ human Pearson r ≥ 0.75 on writing IRR study.
- [ ] All 6 research notebooks run end-to-end on the latest dataset export.
- [ ] At least 1 prompt A/B experiment shipped with bootstrapped CI.

---

## Phase 5 — Pilot, polish, mobile (weeks 23+)

**Goal**: real users, monetised, polished, expanding.

### Week 13–14 — pilot

| Deliverable |
|---|
| 50–100 invited beta users (universities, language schools) |
| Bug bash; Sentry triage; feedback survey |
| Cost analysis: refine LLM profiles to hit ≤ $0.20 per Pro attempt |
| Performance pass: hit budgets in [`10-engineering-conventions.md`](10-engineering-conventions.md) §13 |

### Week 15+ — public launch + growth

| Deliverable |
|---|
| Public marketing launch: blog, Telegram, partnerships with UZ language schools |
| Affiliate program (Phase 5.1) |
| Real-time speaking via LiveKit + Gemini Live (replaces async) |
| Mobile: PWA polish; React Native (Phase 5.2) |
| Public API (Pro+) with API keys |
| Russian-language UI for KZ/UZ Russian-speaking market |

---

## Cross-phase tracks

These run alongside every phase — they're not "done" in any one phase.

| Track | What | Owner |
|---|---|---|
| Quality | growing question bank to 500+ approved per skill | content squad |
| Observability | Sentry + Langfuse coverage; runbooks updated | exam squad |
| Security | quarterly secret rotation; pen-test (Phase 5) | shared |
| Marketing | Telegram, content calendar | founder |
| Compliance | UZ legal entity setup; UZ data-residency review | founder |

---

## Acceptance for "production-ready"

Cross-phase. Hits "production-ready" when **all** are true:

- [ ] Lighthouse Perf ≥ 90 mobile on landing, exam runner, results.
- [ ] Lighthouse Accessibility ≥ 95 on every authenticated route.
- [ ] CI green; coverage ≥ 80% on backend `services/`.
- [ ] All three payment providers tested in sandbox + at least one real-money test transaction per provider.
- [ ] DB backup + restore drill performed and documented.
- [ ] Legal pages (Terms, Privacy, Refunds, Public Offer) live in UZ + EN.
- [ ] Sentry capturing errors with `request_id` + `user_id` redacted PII.
- [ ] Telegram alert wired for P0 incidents.
- [ ] Customer support inbox (`hi@aiexam.uz`) live; SLA documented.
- [ ] Marketing site has at least 3 testimonials and the verify page is indexed.
- [ ] Billing emails (success / failure / cancellation) tested.
- [ ] Free user → Pro user → cancelled → re-subscribed flow works without bugs.

---

## Anti-goals during ramp

- Do **not** start the mobile app until Phase 5; PWA quality must be excellent first.
- Do **not** add a second language (RU, KK) until UZ + EN are bug-free.
- Do **not** add WebRTC real-time speaking until async speaking is solid and IRR is verified.
- Do **not** chase enterprise (Team) deals before Pro converts.
