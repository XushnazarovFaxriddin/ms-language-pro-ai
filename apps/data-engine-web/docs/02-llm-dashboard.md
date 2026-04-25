# 02 — LLM Token Usage Dashboard

> Sahifa: `/[locale]/llm-usage` (data-engine-web)
> Backend: `/data/v1/analytics/llm-usage/*` (data-engine-api)
> Manba: `analytics.llm_calls` jadvali (har LLM chaqiruv yoziladi)

## Maqsad
- Real-time va tarixiy LLM xarajatini ko'rinishini ta'minlash
- Qaysi `purpose`, `model`, `user`, `service` ko'p tokens yeyayotganini aniqlash
- Budget'dan oshish xavfini oldindan ko'rsatish
- Dissertatsiya uchun "LLM cost per generated item / per attempt" raqamlar manbai

## UI tarkibi (single page)

### Block 1 — Top stat cards (top of page)
4 ta katta card, 24h / 7d / 30d / all-time dropdown bilan:
- **Total cost** (USD) — bugun + delta vs kecha
- **Total calls** — soni
- **Total tokens** — input / output ajralgan
- **Avg latency p50 / p95** — LLM call samaradorligi

### Block 2 — Time series chart (asosiy)
- recharts area chart yoki line chart
- X — time (granularity: hour / day / week dropdown)
- Y — cost (USD) yoki tokens (toggle)
- Series: per-purpose stacked area (generate_question, validate_question, score_writing, score_speaking, classify_cefr, embed)
- Hover: tooltip bilan exact numbers
- Date range picker (preset: 24h, 7d, 30d, custom)

### Block 3 — Breakdown tables (3 tab)
**Tab "By purpose"** (default):
| Purpose | Calls | Tokens (in/out) | Cost | Avg latency | % of total |
|---|---|---|---|---|---|
| generate_question | 234 | 120k / 180k | $1.85 | 4.2s | 38% |
| score_writing | 89 | 45k / 22k | $0.95 | 12.1s | 19% |
| ... | | | | | |

**Tab "By model"**:
| Model | Calls | Tokens | Cost | Avg latency |
|---|---|---|---|---|
| gemini-2.5-pro | 312 | ... | $3.20 | 8.4s |
| gemini-2.5-flash | 421 | ... | $0.45 | 2.1s |
| ... |

**Tab "By user"**:
| User | Role | Calls | Cost | Top purpose |
|---|---|---|---|---|
| Bobomurod | content_admin | 234 | $2.30 | generate_question |
| (anonymous students) | student | 542 | $5.40 | score_writing |
| ... |

### Block 4 — Budget widget (right column / sticky)
- Monthly budget (e.g. $50)
- Spent so far (e.g. $32, 64%)
- Progress bar (green → yellow → red as approaching threshold)
- Projected end-of-month (linear extrapolation)
- "Edit budget" button (opens modal, superadmin only)
- Alert thresholds shown (e.g. notify at 80%, 100%)

### Block 5 — Recent calls table (bottom)
- Last 50 calls (paginated)
- Cols: timestamp, service, purpose, model, tokens_in/out, cost, latency, status
- Click row → full call detail page (`/llm-usage/calls/[id]`) with prompt + response + JSON

### Block 6 — Anomalies / alerts (top right banner)
- "⚠️ score_writing avg cost spiked 3x this hour" (auto-detected via simple z-score)
- "⚠️ 5 timeouts on generate_question in last 30min"
- Click to filter chart to that anomaly window

## Filters (sticky top bar)
- Date range
- Service (data-engine | exam-platform | all)
- Purpose (multi-select)
- Model (multi-select)
- User (search)
- Status (success | error | timeout)
- Cache hit (yes | no | all) — to evaluate cache effectiveness

## Export
- "Export CSV" button → calls API `/analytics/llm-usage/export.csv` with current filters

## Real-time updates
- WebSocket / SSE subscription to `/analytics/llm-usage/live` (Phase 2 — MVP polls every 30s)

## Implementation pointers
- **Page**: `src/app/[locale]/(admin)/llm-usage/page.tsx`
- **Charts**: `recharts` (Area, Bar, Pie); `dayjs` for time formatting
- **Server Components**: top stat cards (RSC fetch initial; revalidate on focus)
- **Client Components**: charts, filters, real-time updates
- **Detail page**: `src/app/[locale]/(admin)/llm-usage/calls/[requestId]/page.tsx` — RSC, fetches full prompt/response from DB

## Backend queries (efficient)
```sql
-- Time series (granularity = hour, last 7 days)
SELECT
  date_trunc('hour', ts) AS bucket,
  purpose,
  COUNT(*) AS calls,
  SUM(tokens_in) AS tokens_in,
  SUM(tokens_out) AS tokens_out,
  SUM(cost_usd) AS cost
FROM analytics.llm_calls
WHERE ts >= now() - interval '7 days'
GROUP BY bucket, purpose
ORDER BY bucket;

-- Breakdown by purpose (last 30d)
SELECT purpose, COUNT(*), SUM(tokens_in), SUM(tokens_out), SUM(cost_usd),
       AVG(latency_ms), AVG(latency_ms) FILTER (WHERE TRUE) -- placeholder for percentile
FROM analytics.llm_calls
WHERE ts >= now() - interval '30 days'
GROUP BY purpose
ORDER BY SUM(cost_usd) DESC;
```

Add Postgres `tdigest` extension or use `percentile_cont` window for p95 latency.

For dashboards >100k rows: precompute hourly aggregates in `analytics.llm_calls_hourly` (refreshed every 5min via materialized view + arq cron).

## Cost computation
Per-call `cost_usd` written at insert time:
```python
cost = (tokens_in / 1_000_000) * model_pricing.input_per_1m + \
       (tokens_out / 1_000_000) * model_pricing.output_per_1m
```
Pricing in `analytics.llm_pricing` (seed). Refreshed manually when Google updates rates.

## Acceptance
- [ ] Page loads in <1s with last 7d data
- [ ] All 6 blocks render correctly
- [ ] Filters update charts without full page reload
- [ ] Drilling from breakdown table → calls list works
- [ ] Single call detail shows full prompt + response + tokens
- [ ] Budget widget shows projection, alerts at threshold
- [ ] CSV export works for filtered data (10k+ rows)
- [ ] EN/UZ translations complete
- [ ] Mobile responsive (sidebar collapses)

## Tezis hissasi
- Bobomurod 10-bob (evaluation): "Total LLM cost per 500-question batch: $X" — bu dashboard'dan to'g'ridan-to'g'ri raqam
- Faxriddin 11-bob (evaluation): "LLM cost per attempt p95: $Y" — bu dashboard'dan
- Demo: live ko'rsatish, bir batch generation → counter ko'tariladi
