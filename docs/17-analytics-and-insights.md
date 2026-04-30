# 17 — Analytics & Insights (student-facing)

> **TL;DR.** Six dashboards in `app.aiexam.uz` for every paying student: **Skill Heatmap** (4×N grid of skill × CEFR level mastery), **Growth Chart** (band over time with prediction band), **Error Profile** (top 20 error codes; weekly delta), **Vocabulary Tracker** (CEFR coverage + AWL coverage growth), **Time Spent** (where the hours go), and **Mock-vs-Practice Correlation** (does practice predict mock band?). Powered by `analytics.*` materialised views refreshed nightly. Free users see only the Growth Chart skeleton; Pro users see all six.

---

## 1. Why a separate doc

[`13`](13-skills-deep.md) and [`14`](14-feedback-engine.md) cover **per-attempt** feedback. This doc covers **across-attempt** insights. Different audience (the studying user, not the test taker) and different cadence (weekly review, not post-test reflection).

---

## 2. Dashboards

### 2.1 Skill Heatmap

A 4 × 6 grid: rows = `[listening, reading, writing, speaking]`, columns = CEFR `[A1, A2, B1, B2, C1, C2]`. Each cell shows mastery 0–1 (heatmap colour) and the number of items practised.

Source: aggregated `user_mastery` per skill × CEFR.

UI: chunky cells, hover for "X correct of Y, last practised 3d ago".

### 2.2 Growth Chart

A line chart of overall band over time, with:

- Solid line: actual band per attempt.
- Shaded ribbon: P10–P90 prediction (from [`15-learning-roadmap.md`](15-learning-roadmap.md) §4).
- Dotted horizontal line: `me.target_band`.
- Markers on x-axis for completed milestones.

Toggle: per-skill view (4 lines instead of 1).

### 2.3 Error Profile

Top 20 error codes by frequency in the user's last 30 days, with weekly delta. Click an error → see exemplar quotes from past essays + recommended drill.

```
┌──────────────────────────────────────────────────────────────┐
│  Top error codes (last 30 days)                              │
├──────────────────────────────────────────────────────────────┤
│  grammar.article_missing            ▰▰▰▰▰▰▰▰  41    ↓ 12     │
│  lexis.collocation                  ▰▰▰▰▰▰    32    ↑  4     │
│  pronunciation.consonant_th         ▰▰▰▰▰     27    ↓  8     │
│  cohesion.weak_topic_sentence       ▰▰▰▰      22    ↓  3     │
│  ...                                                          │
└──────────────────────────────────────────────────────────────┘
```

### 2.4 Vocabulary Tracker

Two stacked bar charts:

- CEFR coverage of words used in writing (per attempt). Stacked: A1 / A2 / B1 / B2 / C1 / C2.
- AWL (Academic Word List) coverage (% of AWL words used at least once across last 5 attempts).

Trend line on top of both showing growth.

### 2.5 Time Spent

A donut + bar:

- Donut: this-week distribution across `[mocks, drills, flashcards, conversation, pronunciation_lab]`.
- Bar: weekly hours over the last 8 weeks.

Helps the user see whether their practice mix matches the planner's recommendation. Misalignment → call-out: "You're spending most time on Reading, but Writing is your weakest skill."

### 2.6 Mock-vs-Practice Correlation

For Pro users with ≥ 5 mocks: scatter plot of "weekly practice minutes" (x) vs "next-mock band" (y), with a fitted line. Adds the user's own r² and a one-sentence explanation: "Practising 90+ minutes/week correlates with band gain ≥ 0.5."

This is **honest**: if r² is low for this user, it says so. Never fabricated.

---

## 3. Data model

### `analytics.user_mastery_daily_mat` (materialised view)

| col | type |
|---|---|
| user_id | UUID |
| date | DATE |
| skill | TEXT |
| cefr_level | TEXT |
| mastery_avg | NUMERIC |
| items_practised | INT |

Refreshed nightly. Indexed on `(user_id, date)`.

### `analytics.user_band_history_mat`

| col | type |
|---|---|
| user_id | UUID |
| attempt_id | UUID |
| ts | TIMESTAMPTZ |
| skill | TEXT |
| band | NUMERIC(3,1) |
| confidence | NUMERIC(4,3) |

### `analytics.user_error_freq_mat`

| col | type |
|---|---|
| user_id | UUID |
| period | TEXT (`d7`, `d30`) |
| error_code | TEXT |
| occurrences | INT |
| delta_vs_prev | INT |
| last_seen_at | TIMESTAMPTZ |

### `analytics.user_time_spent_mat`

| col | type |
|---|---|
| user_id | UUID |
| date | DATE |
| activity | TEXT (`mock`, `drill`, `flashcard`, `conversation`, `pronunciation`) |
| seconds | INT |

All four materialised views refreshed via `arq` cron daily 03:30 UTC.

---

## 4. Endpoints

| Method | Path | Returns |
|---|---|---|
| GET | `/exam/v1/me/analytics/heatmap` | per-skill × CEFR mastery |
| GET | `/exam/v1/me/analytics/growth?range=30d|90d|all` | band history + prediction |
| GET | `/exam/v1/me/analytics/errors?range=30d` | top error codes + delta |
| GET | `/exam/v1/me/analytics/vocabulary` | CEFR coverage + AWL coverage |
| GET | `/exam/v1/me/analytics/time-spent?range=7d` | activity breakdown |
| GET | `/exam/v1/me/analytics/correlation` | mock-vs-practice scatter |

All paginated where relevant; default range queries return ≤ 100 KB.

Entitlement gating:
- Free: only `growth` (skeleton view, blurred future predictions).
- Starter: `growth + errors + vocabulary`.
- Pro / Team: all six.

---

## 5. Privacy

These dashboards are user-only — never shown to admin views (admin sees aggregates over many users in `admin.aiexam.uz`, never per-user time-spent). Anonymised cohort stats power Roadmap predictions but never expose individual rows.

GDPR-style data export endpoint (Phase 4) returns all analytics data in CSV.

---

## 6. Acceptance

- [ ] Dashboards load under 1 s on a Pro user with 50 attempts and 1k drill completions (materialised views avoid joins at request time).
- [ ] Free user dashboards show the Growth Chart with a "Upgrade for full insights" overlay over predictions.
- [ ] Error profile delta correctly indicates ↓ when the user has reduced an error count week-over-week.
- [ ] Vocabulary tracker handles a fresh user (zero attempts) without empty-state errors.
- [ ] Time-spent donut matches the sum of `practice_completed` events for the period.
- [ ] Correlation chart shows "Not enough data yet" if attempts < 5.
