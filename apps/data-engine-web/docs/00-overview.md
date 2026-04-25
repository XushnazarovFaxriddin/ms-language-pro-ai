# 00 — Overview (data-engine-web)

## Nima qiladi
Content adminlar (Bobomurod va kelajakdagi tilshunoslar) uchun browser-based admin paneli:
- Question banks ko'rish, yaratish
- AI bilan savollar generatsiya (form + real-time progress)
- Review queue (jury kelishmovchilik)
- Taxonomy editor (CEFR levels, skills, topics)
- Calibration analytics (b distribution, recalibration history)
- Prompt versioning va testing
- LLM config hot-swap (provider/model almashtirish)
- **LLM token usage dashboard** — token sarfi, xarajat, model bo'yicha breakdown

## Roles
- `content_admin` — to'liq access
- `examiner` — faqat review queue
- `superadmin` — yuqoridagilar + LLM config + budget

## Stack
Next.js 15, App Router, Tailwind v4, shadcn/ui, TanStack Query + Server Actions, recharts (dashboards)

## Subdomain
`https://data-engine.languagepro.ai`
