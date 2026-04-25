# 00 — Overview

## Nima qiladi
- AI (Gemini 2.5) bilan IELTS/CEFR savollar generatsiya qiladi
- Multi-jury (3 LLM) validatsiya orqali sifatni nazorat qiladi
- pgvector orqali dublikat aniqlaydi (cosine > 0.92)
- CEFR darajasini matn xususiyatlari + LLM bo'yicha klassifikatsiya qiladi
- IRT 2PL parametrlar (`a`, `b`) ni kalibratsiya qiladi
- `exam-platform-api`'ga sof savollarni REST API orqali beradi

## Foydalanuvchilar
- **content_admin** (Bobomurod, content team) → `data-engine-web` orqali
- **exam-platform-api** → S2S JWT orqali (`/v1/items/next`, `/v1/items/{id}/key`, ...)
- **researcher** → `/v1/exports/responses.csv` (api-key auth)

## Subdomain
- API: `https://api.languagepro.ai/data/v1/*`
- Admin UI: `https://data-engine.languagepro.ai`

## Eng muhim chegaralar
1. **Rasmiy IELTS/Cambridge kontentini hech qachon DB'ga import qilmaydi** (lits. cheklov — `docs/data-licensing.md`)
2. Hamma generatsiyalangan savollar `data_engine.questions.generated_by_model` + `prompt_version_id` bilan provenance saqlaydi
3. `status='approved'` bo'lmagan savollar exam-platform'ga berilmaydi

## DoD (Phase 2 oxirida)
- [ ] 500+ savol generatsiya qilingan, jury validation o'tgan
- [ ] CEFR classifier accuracy ≥ 0.85 (Speechocean762 va EVP'ga qarshi)
- [ ] `/v1/items/next` endpoint Faxriddin platformasi tomonidan ishlatib bo'linadi
- [ ] Calibration dashboard'da `b` distribution ko'rinadi
