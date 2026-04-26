# 09 — Screens & Flows

> **TL;DR.** Wireframes, content rules, and behaviours for every screen across the three web apps. Layouts are mobile-first; mid-fidelity ASCII mockups show structure not visual polish — the polish comes from the design system in [`08-design-system.md`](08-design-system.md). Every screen shipped with UZ + EN copy and light + dark themes. Routes use the `[locale]` segment.

---

## App index

| Subdomain | App | Routes covered |
|---|---|---|
| `aiexam.uz` | landing | §1 |
| `app.aiexam.uz` | exam-platform-web | §2–§7 |
| `admin.aiexam.uz` | data-engine-web | §8–§13 |

---

## 1. Landing site (`aiexam.uz`)

### Routes

| Path | Purpose |
|---|---|
| `/[locale]` | hero, features, social proof, pricing teaser, FAQ, CTA |
| `/[locale]/pricing` | full pricing table + currency switcher + provider list |
| `/[locale]/about` | company story, team, contact |
| `/[locale]/exams` | landing-side preview of available exams (links to `app.`) |
| `/[locale]/blog` | optional Phase 5; static MDX |
| `/[locale]/legal/{terms,privacy,refunds,offer}` | static legal pages |
| `/[locale]/verify/[publicId]` | public certificate verification page |

### `/[locale]` — Hero

```
┌──────────────────────────────────────────────────────────────────┐
│ LangPro AI                            UZ▾  ☀︎/☾  Login [Sign up] │
├──────────────────────────────────────────────────────────────────┤
│                                                                  │
│        Ingliz tilingiz                                           │
│        darajasini biling.                                        │
│        30 daqiqada.                                              │
│                                                                  │
│   AI baholash · IELTS / CEFR · Sertifikat                        │
│                                                                  │
│   [Bepul boshlash] [Demo ko'rish]                                │
│                                                                  │
│              ⌜ 5,000+ talaba sinovdan o'tdi ⌝                    │
└──────────────────────────────────────────────────────────────────┘
```

- Hero h1 in `text-display-xl` (60/64 px), max width 16ch.
- Sub-copy `text-body-lg` muted-foreground.
- CTAs: primary "Bepul boshlash" → `app.aiexam.uz/login?returnTo=/exams`; secondary "Demo ko'rish" scrolls to a 30-second loop video.
- Social proof line uses `text-caption` with two custom triangle quote marks.
- Below the fold: "How it works" 3-step strip → "Why us vs DET / Cambridge" → testimonial cards → pricing teaser → FAQ accordion → footer.

### `/[locale]/pricing`

Currency switcher pill (`UZS | USD`) auto-detected from IP, manual override.

```
┌────────────┐ ┌────────────┐ ┌──────────────┐ ┌────────────┐
│   Free     │ │  Starter   │ │   Pro ★      │ │   Team     │
│   0 so'm   │ │ 49 000     │ │ 119 000      │ │ Aloqa      │
│            │ │ /oy        │ │ /oy          │ │            │
│ ✓ 1 test/  │ │ ✓ 5 test/  │ │ ✓ Cheksiz    │ │ ✓ 10+ seat │
│   oy       │ │   oy       │ │ ✓ Sertifikat │ │ ✓ Brending │
│ ✗ Sertif   │ │ ✓ 4 ko'nik │ │ ✓ Tarix      │ │ ✓ CSV      │
│ ✗ Yozma/   │ │   ma       │ │ ✓ Priority   │ │ ✓ SSO      │
│   gapirish │ │            │ │   support    │ │            │
│ [Boshlash] │ │ [Tanlash]  │ │ [Tanlash]    │ │ [Aloqa]    │
└────────────┘ └────────────┘ └──────────────┘ └────────────┘
```

- Pro card has `border-(--color-primary)` and a "Eng mashhur" badge.
- Yearly toggle (top): switches all prices to `/yil` with a "−17% chegirma" pill.
- Below table: provider strip ("Click · Payme · Stripe"), trust badges, FAQ.

### `/[locale]/verify/[publicId]`

Single-card layout: name, exam, band, date, signature hash. No login required. Used by employers / universities to verify a certificate. SSR for SEO.

---

## 2. Auth flows (`app.aiexam.uz`)

### `/[locale]/login`

```
┌────────────────────────────┐
│  Hisobingizga kiring        │
│                             │
│  [ Email                  ] │
│  [ Parol               👁  ] │
│  [    Kirish              ] │
│                             │
│  ─── yoki ───               │
│  [ G  Google bilan kirish ] │
│                             │
│  Akkountingiz yo'qmi?       │
│  Ro'yxatdan o'tish          │
│  Parolni unutdim            │
└────────────────────────────┘
```

- Centred card max-w-md.
- After login: redirect to `?returnTo` or `/exams`.
- Magic-link option: Phase 2.

### `/[locale]/signup`

Same shape; password strength meter under the field; ToS + Privacy link below button. After submit → email verification banner persists across the app for 7 days but does not block usage.

### `/[locale]/forgot` and `/[locale]/reset/[token]`

Phase 2 (Resend integration).

---

## 3. App shell (every authenticated route on `app.aiexam.uz`)

```
┌────────────────────────────────────────────────────────────────────┐
│ ⌘ LangPro    Imtihonlar   Tarix   Profile      ☀︎/☾  UZ ▾  ⌬ Aziza│
├────────────────────────────────────────────────────────────────────┤
│                                                                    │
│   …page content (see sections below)…                              │
│                                                                    │
└────────────────────────────────────────────────────────────────────┘
```

- Header sticky, `bg-(--color-surface)/80 backdrop-blur` on scroll.
- Avatar dropdown: profile, billing, theme, locale, log out.
- On mobile: replace nav with a hamburger that opens a `<Sheet>` from the right.

---

## 4. `/[locale]` — Student home

```
┌──────────────────────────────────────────────────────────┐
│  Salom, Aziza! 👋                                         │
│                                                          │
│  Sizning so'nggi natijangiz:                             │
│  ┌───────────────────────────┐                           │
│  │  Overall  6.5  ●─────●─── │  ← BandBadge + sparkline   │
│  │  Reading  7.0   Listen 6.5│                           │
│  │  20 mart, 2026             │  [Tafsilot]              │
│  └───────────────────────────┘                           │
│                                                          │
│  Tavsiya qilamiz:                                        │
│  ┌──────────┐ ┌──────────┐ ┌──────────┐                  │
│  │ Reading  │ │ Writing  │ │ Speaking │                  │
│  │ Mini     │ │ Task 2   │ │ Part 2   │                  │
│  │ 10 daq   │ │ 40 daq   │ │ 4 daq    │                  │
│  │ [Boshla] │ │ [Boshla] │ │ [Boshla] │                  │
│  └──────────┘ └──────────┘ └──────────┘                  │
│                                                          │
│  Joriy reja: Pro · Cheksiz attempts · keyingi: 28 mart   │
└──────────────────────────────────────────────────────────┘
```

- Empty state for first-time user: replace with "Birinchi testingizni boshlang" hero + skill cards.

---

## 5. `/[locale]/exams` — exam picker

3-column grid of `<ExamCard>`s. Each card:

```
┌────────────────────────────┐
│  [Reading]                 │  ← SkillIcon + colored stripe
│  IELTS Reading Mini        │
│  10 daqiqa · 5 savol       │
│  Adaptive · CEFR B1–C1     │
│                            │
│  Bepul rejada mavjud  ✓    │
│                            │
│  [ Boshlash → ]            │
└────────────────────────────┘
```

If user's plan does not include this exam, show a `<PaywallSheet>` instead of starting.

Filter chips on top: All / Reading / Listening / Writing / Speaking / Quick placement.

---

## 6. `/[locale]/attempt/[id]` — Exam Runner

The most-used screen. Three layouts: passage-style (Reading), audio-style (Listening), input-style (Writing/Speaking).

### Reading / Listening / MCQ layout

```
┌────────────────────────────────────────────────────────────┐
│  Bo'lim 1/4 · O'qish · Savol 7/13              09:42 ⏱   │
│  ──────●──────────────────────────────  Progress           │
├──────────────────────┬─────────────────────────────────────┤
│                      │                                     │
│  Passage scroll-     │   Q7. According to the passage,    │
│  able panel          │   what was the cost in 2023?        │
│                      │                                     │
│  Lorem ipsum dolor   │   ○ A. $2.50                        │
│  sit amet, consect…  │   ○ B. $1.00                        │
│  …                   │   ◉ C. $0.30                        │
│                      │   ○ D. $0.50                        │
│                      │                                     │
│                      │  [ ← Oldingi ]   [ Yuborish → ]    │
└──────────────────────┴─────────────────────────────────────┘
```

- Resizable split (default 1:1) on desktop; tabs (Passage | Question) on mobile.
- Timer turns `text-(--color-warning)` < 60s, `text-(--color-danger)` < 15s.
- Selecting an option enables the submit button. `Enter` keyboard shortcut (with `<KbdHint>`).
- After submit → 800ms ✓/✗ feedback flash (optional in production; A/B test) → fetch next item.
- Crash recovery: ExamRunner state stored in `sessionStorage`; on reload we re-fetch attempt + last item.

### Writing layout

```
┌──────────────────────────────────────────────────────────────┐
│  Writing Task 2 · 40 daqiqa qoldi   So'zlar: 142/250  ⏱     │
├──────────────────────────────────────────────────────────────┤
│                                                              │
│   Prompt: Some people believe that…                           │
│                                                              │
│   ┌────────────────────────────────────────────────────────┐ │
│   │ TipTap editor area                                     │ │
│   │ paste blocked, focus tracked                           │ │
│   │                                                        │ │
│   │ Bold paragraph one. Then a counter-argument...         │ │
│   │                                                        │ │
│   └────────────────────────────────────────────────────────┘ │
│                                                              │
│   [ Saqlash va keyingi ]                                     │
└──────────────────────────────────────────────────────────────┘
```

- Word counter live; turns warning when below min or above max.
- Auto-save every 10s (idempotent `PATCH /attempts/{id}/responses/{rid}` with text).
- On submit: response goes to async `score_writing` job; UI moves to next item or section finish.

### Speaking layout

```
┌──────────────────────────────────────────────────────────────┐
│  Speaking Part 2 · 1:30 tayyorgarlik · 2:00 javob   ⏱       │
├──────────────────────────────────────────────────────────────┤
│   Cue card: Describe a memorable trip you took.              │
│   You should say:                                            │
│     - where you went                                         │
│     - who you went with                                      │
│     - what you did                                           │
│   …                                                          │
│                                                              │
│   ┌─────────────────────────────────────────┐                │
│   │   ▮▮▮▮▯▯▯▯  ●                           │  ← MicLevel    │
│   │   00:42                                 │                │
│   └─────────────────────────────────────────┘                │
│                                                              │
│   [ ⏺ Yozishni boshlash ]   [ ⏹ Stop ]                       │
│                                                              │
│   Mikrofon: ENABLED ✓                                        │
└──────────────────────────────────────────────────────────────┘
```

- Pre-flight permission request before Part 1.
- WaveformVisualizer / MicLevel from Web Audio AnalyserNode.
- After `Stop`: presigned PUT upload → status indicator → submit response. UI advances to next part.
- Listening section uses an `<audio>` with single-play enforcement (no seek bar; click-to-play once).

---

## 7. `/[locale]/results/[attemptId]`

```
┌──────────────────────────────────────────────────────────────┐
│                          Tabriklaymiz!                        │
│                                                              │
│                     ╭─────────────────╮                      │
│                     │       7.5        │  ← ProgressRing     │
│                     │   Overall band   │     animates 0→7.5  │
│                     ╰─────────────────╯                      │
│                                                              │
│   Reading 8.0    Listening 7.0    Writing 7.0    Speaking 7.5│
│   ──●──────────  ──────●──────    ──────●──────  ────●──────│
│                                                              │
│   ─── Sizning kuchli tomonlaringiz ────────────────────────  │
│   ✓ Vocabulary range — C1 darajada                          │
│   ✓ Reading detail savollarida 90% to'g'ri                  │
│                                                              │
│   ─── Yaxshilash uchun ─────────────────────────────────────  │
│   ⚠ Writing Task 2 da paragraf strukturasi …                │
│   ⚠ Speaking — fluency: kichik pauzalar                     │
│                                                              │
│   [ Sertifikatni yuklab olish ]  [ Mukammal javoblarni ko'r ]│
└──────────────────────────────────────────────────────────────┘
```

- Free / Starter: certificate button shows `<PaywallSheet>`.
- "Per-question review" expandable section: each item with the user's answer, the correct answer, and rationale (Pro+ only — Starter sees a summary teaser).
- Share: Telegram / X / link copy.

---

## 8. `/[locale]/history` and `/[locale]/profile`

History: list of past attempts, filter by skill / period, line chart of overall band over time, table.

Profile: avatar (initials placeholder), display name, locale, theme preference, password change, "Delete account" (Phase 2).

---

## 9. `/[locale]/billing` (Phase 4)

```
┌────────────────────────────────────────────────────────────────┐
│  Billing                                                        │
│                                                                │
│  Joriy reja:  Pro · 119 000 so'm/oy                            │
│  Keyingi to'lov:  28 mart 2026                                  │
│  To'lov usuli:    Click · ****1234            [O'zgartirish]   │
│                                                                │
│  [ Rejani bekor qilish ]                                        │
│                                                                │
│  ─── Hisob-fakturalar ─────────────────────────────────────────│
│  28 fev 2026   Pro monthly   119 000 so'm    Click   [PDF]    │
│  28 yan 2026   Pro monthly   119 000 so'm    Click   [PDF]    │
│  …                                                             │
└────────────────────────────────────────────────────────────────┘
```

Cancel button → confirmation dialog → "Pro siz uchun aktiv bo'ladi 28 mart kungacha. Keyin Free ga o'tasiz." → `POST /v1/checkout/cancel`.

---

## 10. Admin shell (`admin.aiexam.uz`)

```
┌──────────────┬─────────────────────────────────────────────────┐
│ LangPro      │  Admin > Generation                              │
│ Content      │                                                  │
│ ─────────    │                                                  │
│ ▸ Dashboard  │   …page content…                                 │
│ ▸ Banks      │                                                  │
│ ▸ Generation │                                                  │
│ ▸ Review     │                                                  │
│ ▸ Calibration│                                                  │
│ ▸ Prompts    │                                                  │
│ ▸ LLM Usage  │                                                  │
│ ▸ Users      │                                                  │
│ ▸ Settings   │                                                  │
│              │                                                  │
│ admin@…      │                                                  │
│ Chiqish      │                                                  │
└──────────────┴─────────────────────────────────────────────────┘
```

Sidebar collapsible on mobile (Sheet). Active route highlighted with primary-soft bg.

---

## 11. `/[locale]/dashboard` (admin)

Top-level KPIs: signups (today/week/month), MRR, active subscriptions, attempts today, LLM cost MTD, alerts.

Cards use `<MetricCard>` with sparkline (recharts). Click any card → drill to the relevant detail page.

---

## 12. `/[locale]/generation` (admin)

Form (left): skill, CEFR level, topic (autocomplete from `topics` table), count (1–50), bank.

Live jobs panel (right): list of running/queued jobs with status pill + progress bar; clicking opens `/generation/jobs/[id]`.

Job detail page: SSE-driven progress, per-item table (id, status, jury verdicts, latency, cost), stop button.

---

## 13. `/[locale]/llm-usage` (admin)

```
┌──────────────────────────────────────────────────────────────┐
│  LLM Usage                                  Period: 7d ▾    │
│                                                              │
│  ┌──────┐ ┌──────┐ ┌────────────┐ ┌──────┐                   │
│  │$8.34 │ │ 642  │ │ 124k / 38k │ │7.2 s │                   │
│  │Cost  │ │Calls │ │ Tokens     │ │Latency│                  │
│  └──────┘ └──────┘ └────────────┘ └──────┘                   │
│                                                              │
│  [Stacked area chart: cost over time, by purpose]            │
│                                                              │
│  By purpose                       By model                   │
│  generate_question  $4.20         gemini-2.5-pro   $5.10     │
│  validate_question  $2.10         gemini-2.5-flash $1.60     │
│  score_writing      $1.40         gemini-2.0-flash $0.30     │
│  …                                gemini-embedding-001 $1.34 │
│                                                              │
│  Recent calls (50)                            [Export CSV]   │
│  [Table: ts | service | purpose | model | tokens | cost ]   │
└──────────────────────────────────────────────────────────────┘
```

Filters: date range, purpose, model, user. Drill into any row → call detail page (full prompt, response, metadata).

Budget widget on the right column: progress ring of MTD vs configured `monthly_budget_usd`; alerts at 80% / 100%.

---

## 14. `/[locale]/review-queue` (examiner)

Two-pane: list of `in_review` items on the left, full editor on the right (passage, question, options, jury verdicts, edit form, approve / reject / edit buttons). Keyboard shortcuts: `J/K` next/prev, `A` approve, `R` reject.

---

## 15. `/[locale]/users` (admin) and `/[locale]/billing-admin` (superadmin)

User search by email / id; user detail shows roles (toggle), subscription state, override entitlements (granting promo), recent attempts.

Billing admin: failed payments list, refund tool, manual subscription creator, webhook event log search.

---

## 16. Toasts & system-wide messages

- Locale-aware toast queue, max 3 visible.
- Variants: `success`, `error`, `info`, `warn`.
- Auto-dismiss 4s; pause on hover; close button.
- Position: top-right (desktop), top-center (mobile).

---

## 17. Empty states catalogue

| Surface | Empty copy (UZ) | Action |
|---|---|---|
| `/exams` (none active) | "Hozircha imtihonlar yo'q. Tez orada qaytib keling." | — |
| `/history` (no attempts) | "Birinchi natijangizni shu yerda ko'rasiz." | "Boshlash" → `/exams` |
| `/admin/banks` (no banks) | "Yangi savol bazasi yarating." | "Bank yaratish" |
| `/admin/review-queue` (empty) | "🎉 Hech narsa qolmagan. Yaxshi ish!" | — |
| `/admin/llm-usage` (no calls) | "Hali LLM chaqiruvlari yo'q." | "Generatsiyani boshlash" |

---

## 18. Acceptance

- [ ] Every route renders cleanly in both UZ and EN, both light and dark.
- [ ] Hero on `/[locale]` reaches Lighthouse Performance ≥ 90 mobile.
- [ ] Reading-passage layout has a perceptible split-pane on desktop and tabs on mobile.
- [ ] Speaking page asks for mic permission only after the user clicks the start button (not on page load).
- [ ] Theme + locale switchers persist across sessions and across subdomains.
- [ ] Pricing page currency switcher updates all prices instantly (client-side).
- [ ] PaywallSheet opens when a Free user tries Speaking; closing it returns to `/exams`, not a 403 page.
- [ ] Admin sidebar collapses to a hamburger sheet under 768px.
- [ ] All forms have keyboard-only happy-path coverage.
- [ ] Verify-certificate page is SSR'd and indexed by Google.
