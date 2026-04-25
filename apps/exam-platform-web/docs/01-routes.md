# 01 — Routes

## Public
| Path | Maqsad |
|---|---|
| `/[locale]` | Hero + "Start a free test" → /login if anon, else /exams |
| `/[locale]/login` | Auth-api SSO redirect |
| `/[locale]/about` | Loyiha haqida |

## Authenticated (student)
| Path | Maqsad |
|---|---|
| `/[locale]/exams` | Imtihon turlari list (IELTS Academic, Quick Placement) |
| `/[locale]/exams/[blueprintId]/start` | Pre-flight (mikrofon test, instructions, "Start") |
| `/[locale]/attempt/[id]/section/[n]` | Asosiy ExamRunner |
| `/[locale]/attempt/[id]/scoring` | "Scoring..." holati (SSE listener) |
| `/[locale]/results/[attemptId]` | Natijalar |
| `/[locale]/history` | O'tgan attempts |
| `/[locale]/profile` | Akkaunt sozlamalari |

## Examiner
| Path | Maqsad |
|---|---|
| `/[locale]/review` | Review queue |

## Layout
```
src/app/[locale]/
├── (marketing)/
│   ├── page.tsx
│   ├── about/
│   └── login/
└── (student)/
    ├── layout.tsx
    ├── exams/
    ├── attempt/[id]/
    │   ├── section/[n]/page.tsx     # 'use client' inside
    │   └── scoring/page.tsx
    ├── results/[attemptId]/
    ├── history/
    └── profile/
```

## Server vs Client
- `/exams`, `/history`, `/results` — RSC + TanStack Query
- `/attempt/[id]/section/[n]` — RSC shell, ExamRunnerClient ('use client') inside
- `/profile` — Server Actions for mutations
