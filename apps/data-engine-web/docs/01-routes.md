# 01 — Routes

## Authenticated routes (require role)

| Path | Role | Maqsad |
|---|---|---|
| `/[locale]/dashboard` | content_admin+ | Umumiy ko'rinish: latest jobs, queue size, this month's costs |
| `/[locale]/banks` | content_admin+ | Question bank list |
| `/[locale]/banks/[id]` | content_admin+ | Single bank — questions list |
| `/[locale]/banks/[id]/questions/[qid]` | content_admin+ | Single question editor |
| `/[locale]/generation/new` | content_admin+ | New batch generation form |
| `/[locale]/generation/jobs` | content_admin+ | All jobs list |
| `/[locale]/generation/jobs/[jobId]` | content_admin+ | Job detail + SSE progress |
| `/[locale]/review-queue` | examiner+ | Items needing human review |
| `/[locale]/review-queue/[qid]` | examiner+ | Single review |
| `/[locale]/taxonomies` | content_admin+ | Edit CEFR levels, skills, topics |
| `/[locale]/calibration` | content_admin+ | Calibration runs + b distributions |
| `/[locale]/calibration/items/[id]` | content_admin+ | Per-item parameter history chart |
| `/[locale]/prompts` | content_admin+ | Prompt list per purpose |
| `/[locale]/prompts/[purpose]/[id]` | content_admin+ | Prompt versions, diff, "test" runner |
| `/[locale]/llm-config` | superadmin | Per-purpose LLM profile editor (hot-swap) |
| **`/[locale]/llm-usage`** | content_admin+ | **LLM token usage dashboard** (see `02-llm-dashboard.md`) |
| `/[locale]/llm-usage/calls` | content_admin+ | Per-call audit log |
| `/[locale]/llm-usage/calls/[requestId]` | content_admin+ | Full call detail |
| `/[locale]/llm-usage/budget` | superadmin | Budget config + alerts |
| `/[locale]/exports` | researcher+ | CSV export forms |
| `/[locale]/settings` | self | Profile, API keys (researcher) |

## Public
| Path | Maqsad |
|---|---|
| `/[locale]/login` | Login form (delegates to auth-api) |
| `/[locale]` | Redirect to `/dashboard` if authed, else `/login` |

## Layout
```
src/app/[locale]/
├── (auth)/                  # public auth routes
│   └── login/
└── (admin)/                 # require auth
    ├── layout.tsx           # sidebar + top bar + user menu
    ├── dashboard/
    ├── banks/
    ├── generation/
    ├── review-queue/
    ├── taxonomies/
    ├── calibration/
    ├── prompts/
    ├── llm-config/
    ├── llm-usage/           # see 02-llm-dashboard.md
    ├── exports/
    └── settings/
```

## Server vs Client
- List pages: RSC for initial fetch + TanStack Query for filters/refetch
- Dashboards (`llm-usage`, `calibration`): Client (charts library + interactivity)
- Forms (generation/new, prompts edit, llm-config): Server Actions
- Real-time progress (`generation/jobs/[id]`): Client + EventSource (SSE)
