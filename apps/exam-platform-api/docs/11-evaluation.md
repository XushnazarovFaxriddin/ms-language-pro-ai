# 11 — Evaluation Plan (Faxriddin tezisi)

## Eksperimentlar

### E1 — Inter-Rater Reliability (IRR) — Writing
- **Maqsad**: LLM scoring odam baholashi bilan qanchalik mos kelishi
- **Method**:
  - 30 essay (har xil bandlardan) tanlanadi (pilot ma'lumotlaridan yoki TOEFL11 subset)
  - 2 ta BSU ingliz tili o'qituvchisi mustaqil baholaydi (4 IELTS criteria + overall)
  - Bizning LLM scoring pipeline ham baholaydi
  - 3 ta scorer × 30 essay = 90 score set
- **Metrika**:
  - Pearson r (LLM vs human_avg)
  - Quadratic-weighted Cohen's κ (per criterion + overall)
  - Mean Absolute Error (MAE) in band points
  - Per-band stratified analysis (LLM bands 5-7 vs 7-9)
- **Kutilgan**: r ≥ 0.75, κ ≥ 0.65, MAE ≤ 0.7

### E2 — Speaking scoring validity
- **Maqsad**: Multimodal Gemini speaking scoring sifati
- **Method**:
  - 30 ta speaking sample (Speechocean762 subset + bizning piloting)
  - Gold standard: human band rating
  - LLM scoring vs gold standard
- **Metrika**: r, κ, MAE (same as writing)
- **Kutilgan**: r ≥ 0.65 (speaking harder than writing), κ ≥ 0.5

### E3 — Adaptive efficiency (real users)
- **Maqsad**: IRT 2PL adaptive test fixed-length test'dan ko'ra samarali ekanligini ko'rsatish
- **Method**:
  - Pilot foydalanuvchilarning yarmi adaptive (n=10), yarmi fixed (n=10)
  - Ikkalasi ham final theta'ni baholaydi
- **Metrika**:
  - Avg # items needed for SE(θ) < 0.3
  - Final theta accuracy vs gold (instructor placement test)
- **Kutilgan**: Adaptive 30-40% kam savol talab qiladi

### E4 — User experience (pilot)
- **Maqsad**: Platforma haqiqiy foydalanish uchun foydali ekanligini tasdiqlash
- **Method**: Pilot post-attempt survey (UZ + EN)
- **Metrika**:
  - NPS (-100..+100)
  - SUS (System Usability Scale, 0-100)
  - Time-on-task per section (vs IELTS published)
  - Completion rate (% who finished without abandoning)
  - Self-reported "Did the score match your expectation?" (Likert 1-5)
- **Kutilgan**: NPS ≥ +20, SUS ≥ 70, completion ≥ 80%

### E5 — Cost & latency profiling
- **Maqsad**: Production deployment uchun iqtisodiy amaliylik
- **Method**: Pilot davomida har attempt'ning resource consumption'ini Langfuse + Sentry'da o'lchash
- **Metrika**:
  - LLM cost per attempt (avg, p95)
  - Total wall time per attempt
  - p95 latency for sync grading
  - p95 latency for async writing/speaking scoring
- **Target**: <$0.50 per full attempt, p95 nav <500ms, p95 async <30s

## Vositalar
- `scripts/eval/e1_writing_irr.py` — IRR statistical analysis (sklearn, scipy)
- `scripts/eval/e2_speaking_irr.py`
- `scripts/eval/e3_adaptive_efficiency.py`
- `scripts/eval/e4_ux_survey.py` — survey data analysis
- `scripts/eval/e5_cost_latency.py` — Langfuse export → analysis
- All produce CSV + PNG in `reports/`

## Pilot logistics
- N=10-20 BSU ingliz tili kafedrasi talabalari
- Voluntary participation, signed waiver (`docs/data-licensing.md` § 4)
- 1-hour session: 30-min mini-test + 15-min interview/survey + 15-min buffer
- Schedule: Week 10 (1 may - 15 may)

## Tezis uchun jadvallar
- Table 5.1: Writing IRR matrix (LLM vs Human1, LLM vs Human2, Human1 vs Human2)
- Table 5.2: Speaking IRR matrix
- Figure 5.3: Bland-Altman plot (LLM vs human avg)
- Table 6.1: Adaptive vs fixed-length efficiency
- Figure 6.2: Theta convergence curves
- Table 7.1: NPS / SUS distributions
- Figure 7.2: LLM cost per attempt distribution
