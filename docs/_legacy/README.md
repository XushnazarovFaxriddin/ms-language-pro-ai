# Repository-Level Documentation

> **Til**: O'zbek (asosiy) + English (texnik). Har bir faylda til alohida belgilangan.

Bu papkada **butun monorepo'ga taalluqli** umumiy hujjatlar joylashgan. Loyiha-spetsifik (data-engine yoki exam-platform) hujjatlar tegishli `apps/*/docs/` papkalarida joylashgan.

## Indeks

| # | Fayl | Tavsif | Til |
|---|---|---|---|
| 1 | [`system-overview.md`](system-overview.md) | LanguagePro AI butun tizim arxitekturasi: 6 ta servis, ma'lumot oqimi, deploy topologiyasi | UZ + EN |
| 2 | [`api-contracts.md`](api-contracts.md) | Servislararo API shartnomalari (auth ↔ frontend, exam-platform ↔ data-engine, S2S JWT) | EN |
| 3 | [`thesis-coordination.md`](thesis-coordination.md) | 2 ta dissertatsiya o'rtasidagi mas'uliyatlarning aniq taqsimoti, cross-thesis PR review qoidalari | UZ |
| 4 | [`data-licensing.md`](data-licensing.md) | Ma'lumotlar manbalarining litsenziya matritsasi (CEFR-J, EVP, Speechocean762, Project Gutenberg, ...) | UZ + EN |
| 5 | [`security.md`](security.md) | Threat model, auth strategy, secrets boshqaruvi, audit logs | EN |
| 6 | [`coding-standards.md`](coding-standards.md) | Python (ruff/mypy strict), TypeScript (ESLint/Biome), commit konvensiyasi, kod review | EN |
| 7 | [`contributor-guide.md`](contributor-guide.md) | Lokal ishga tushirish, yangi servis qo'shish, branch strategy | UZ + EN |
| 8 | [`glossary-uz-en.md`](glossary-uz-en.md) | Texnik atamalar lug'ati: o'zbekcha ↔ inglizcha kanonik tarjimalar | UZ + EN |
| 9 | [`adr/`](adr/) | Cross-cutting Architecture Decision Records (auth, db, deployment, monorepo tooling) | EN |

## Konvensiyalar

- **Diagrammalar**: Mermaid (`mermaid` code block) yoki D2 (`.d2` fayl + render). CI'da PNG generatsiya qilinadi (`scripts/render-diagrams.sh`).
- **ADR formati**: [MADR](https://adr.github.io/madr/) template, status: `proposed | accepted | superseded by ADR-NNNN | deprecated`.
- **Til ko'rsatkichi**: Har bir `.md` fayl boshida `> Til: ...` qatori yoziladi.
- **Versiyalash**: Har bir muhim hujjat oxirida `_Last reviewed: YYYY-MM-DD by @username_`.

## Per-project hujjatlar

- [`apps/data-engine-api/docs/`](../apps/data-engine-api/docs/) — Bobomurod (1-mavzu)
- [`apps/exam-platform-api/docs/`](../apps/exam-platform-api/docs/) — Faxriddin (2-mavzu)
- [`apps/data-engine-web/docs/`](../apps/data-engine-web/docs/) — admin UI
- [`apps/exam-platform-web/docs/`](../apps/exam-platform-web/docs/) — student UI
- [`apps/auth-api/docs/`](../apps/auth-api/docs/) — shared auth
- [`apps/landing/docs/`](../apps/landing/docs/) — landing page
