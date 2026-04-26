# LanguagePro AI / aiexam.uz — Engineering Spec

> **For implementers.** This `docs/` folder is the source of truth for the production system.
> Read sequentially the first time; later, jump to a single doc per task.
> Code in `apps/`, `packages/`, `python/` is reference — **the spec wins on every disagreement**.

---

## Read order

| # | File | Topic | Read when |
|---|---|---|---|
| 0 | [`00-product-spec.md`](00-product-spec.md) | Vision, users, value prop, success metrics | Always start here |
| 1 | [`01-tech-stack.md`](01-tech-stack.md) | Pinned versions and library choices | Picking a dependency |
| 2 | [`02-architecture.md`](02-architecture.md) | Services, data flow, deploy topology | Adding a new service |
| 3 | [`03-data-model.md`](03-data-model.md) | All Postgres schemas + DDL | Touching DB |
| 4 | [`04-api-contracts.md`](04-api-contracts.md) | Every HTTP endpoint, every payload | Wiring backend ↔ frontend |
| 5 | [`05-auth-and-rbac.md`](05-auth-and-rbac.md) | JWT cookies, S2S tokens, roles | Auth-related code |
| 6 | [`06-ai-pipelines.md`](06-ai-pipelines.md) | Gemini Router, prompts, IRT, scoring | LLM features |
| 7 | [`07-payments-and-billing.md`](07-payments-and-billing.md) | Plans, Click / Payme / Stripe, webhooks | Subscriptions, paywalls |
| 8 | [`08-design-system.md`](08-design-system.md) | Tokens, typography, components, motion | Any UI work |
| 9 | [`09-screens-and-flows.md`](09-screens-and-flows.md) | Per-page specs with mockups | Building a page |
| 10 | [`10-engineering-conventions.md`](10-engineering-conventions.md) | Coding standards, testing, CI | Writing any code |
| 11 | [`11-deployment-and-ops.md`](11-deployment-and-ops.md) | Docker, infra, monitoring, runbooks | Deploying / on-call |
| 12 | [`12-roadmap-and-phases.md`](12-roadmap-and-phases.md) | Phase 0–5 milestones | Planning sprints |
| · | [`prompts/`](prompts/) | LLM prompt templates (YAML) | Editing prompts |

---

## Quick facts (memorise)

- **Product name**: LanguagePro AI · **Domain**: `aiexam.uz`
- **Brand promise**: AI-powered IELTS / CEFR English assessment in 30 minutes, with instant feedback in your language.
- **Primary market**: Uzbekistan (UZ-first UI), then global.
- **Tech stack**: Python 3.12 · FastAPI · Postgres 17 + pgvector · Redis · Next.js 15 · TypeScript · Tailwind v4 · shadcn/ui.
- **AI (single rule, no exceptions)**: every model call — chat, embeddings, STT, TTS, vision — goes through the official `openai` SDK pointed at Google's Gemini OpenAI-compatible endpoint (`OPENAI_BASE_URL=https://generativelanguage.googleapis.com/v1beta/openai/`). **No ChatGPT, no other vendor SDKs.** Models: `gemini-2.5-pro` (heavy reasoning), `gemini-2.5-flash` (cheap + multimodal audio in/out), `gemini-2.0-flash` (juror diversity), `gemini-embedding-001` (768-dim embeddings), `gemini-2.5-flash-preview-tts` (text-to-speech for listening prompts).
- **Payments**: Click + Payme (UZ), Stripe (international).
- **Tariffs**: Free · Starter · Pro · Team — full pricing in `07-payments-and-billing.md`.
- **Locales (hard rule)**: every user-facing surface ships in **two languages** — Uzbek (`uz`, default) and English (`en`). Routes use `[locale]` segment (`/uz/...`, `/en/...`); a hard-coded English string in JSX is a build error. Server-side errors include both `feedback_uz` and `feedback_en` for student-visible content.
- **Theme (hard rule)**: every page supports **light + dark** themes. Defaults to system preference; a toggle in the header persists the choice in `localStorage` + a `theme` cookie. **Never** hard-code a colour — always use a CSS variable from the design system token set in [`08-design-system.md`](08-design-system.md). Use semantic tokens (`bg-surface`, `text-foreground`) so dark mode is automatic; never `bg-white` or `text-zinc-900`.
- **Apex cookie domain**: `.aiexam.uz` (production), `.localhost` (dev). Auth cookies are `lp_access`, `lp_refresh`, `lp_csrf`; do not use `__Host-` because cross-subdomain cookies require an explicit `Domain`.
- **Subdomains**: `aiexam.uz` (landing) · `app.aiexam.uz` (student) · `admin.aiexam.uz` (content team) · `api.aiexam.uz` (REST).

---

## Conventions inside these docs

- **TL;DR** at the top of every doc (≤ 120 words, scannable).
- **Tables for spec, prose for rationale.**
- **Code blocks** are runnable / copy-pasteable, not pseudo-code.
- **Cross-references** use repo-relative paths so `Cmd-Click` works in editors.
- **Acceptance** sections at the end of every spec — what "done" looks like.

---

## Implementation guidance for AI assistants

When writing code based on this spec:

1. **Always cite the doc + section** in commit messages (`feat(api): items/next per docs/04-api-contracts.md §5.3`).
2. **Don't invent endpoints, schemas, or roles** — if a need isn't in the spec, ask before adding it.
3. **Match the design system tokens exactly** — no ad-hoc colours, paddings, radii.
4. **Match the data model column-for-column** — don't rename, don't omit.
5. **Use the prompt templates verbatim** — don't paraphrase prompts in inline strings.
6. **Stop at the spec boundary**: if a feature is marked "Phase 4 — payments" and you're in Phase 2, leave the Stripe code out.

---

## Glossary (one-liner each)

- **Attempt** — a single exam session a student starts and finishes.
- **Item** — a single question (MCQ, completion, essay, speaking task).
- **Skill** — `listening | reading | writing | speaking`.
- **Section** — a contiguous block of items in one skill, with its own timer.
- **Theta (θ)** — IRT-estimated student ability; updates after every objective answer.
- **Blueprint** — composition spec for an exam (e.g. IELTS Academic Full = 4 sections).
- **Bank** — a pool of approved questions an admin owns.
- **Juror** — one of three Gemini calls that vote on a generated question's quality.
- **Plan** — a paid subscription tier (Free, Starter, Pro, Team).
- **Period** — billing window (monthly, yearly).
- **Entitlement** — a thing a plan grants (e.g. "unlimited attempts", "PDF certificate").
