# 10 — Evaluation Plan (Bobomurod tezisi)

## Eksperimentlar

### E1 — Generation throughput & cost
- **Maqsad**: Loyihaning AI generation pipeline'i texno-iqtisodiy jihatdan amaliyligi
- **Method**: 500 savol generatsiya (4 ko'nikma × A1-C2 × ~20 each)
- **Metrika**:
  - Total cost (USD)
  - Avg cost per approved item
  - Avg latency per item
  - Approval rate (jury unanimous %)
  - Reject rate (dup, jury fail, level mismatch)
- **Kutilgan natija**: <$25 jami, ~70% approve rate, avg <30s/item

### E2 — Inter-juror agreement
- **Maqsad**: Multi-jury validatsiya metodologiyasining ishonchliligi
- **Method**: 100 ta savolga 3 ta juror voting → Cohen's κ pairwise
- **Metrika**:
  - κ_12, κ_13, κ_23 (pairwise)
  - Fleiss κ (3 raters)
  - % unanimous decisions
- **Kutilgan**: Pairwise κ ≥ 0.6, Fleiss κ ≥ 0.5 ("moderate to substantial")

### E3 — CEFR classifier accuracy
- **Maqsad**: AI-based CEFR classification real benchmark'lar bilan tasdiqlash
- **Method**:
  - Gold standard: 200 ta matn (CEFR-J labeled subset) — train/test split
  - Bizning classifier baholaydi
  - Confusion matrix, macro F1
- **Metrika**:
  - Accuracy
  - Macro F1
  - Per-level recall (especially for B2/C1 — eng muhim daraja)
  - Comparison: pure-LLM vs hybrid (LLM+EVP+CEFR-J wordlist)
- **Kutilgan**: ≥85% accuracy, hybrid > pure-LLM by ≥5pp

### E4 — IRT calibration validity
- **Maqsad**: Cold-start `b` qiymatlari empirik javoblar bilan moslashishi
- **Method**:
  - 50 savol pilot foydalanuvchilar tomonidan ishlatiladi (≥30 javob/savol)
  - Recalibration → yangi `b` vs cold-start `b`
  - Pearson korrelyatsiya
- **Metrika**:
  - r(b_cold, b_empirical)
  - RMSE
  - Cases where |Δb| > 1 (cold-start xato hollar)
- **Kutilgan**: r ≥ 0.5 (moderate), RMSE < 1.0

### E5 — Adaptive efficiency simulation
- **Maqsad**: Maximum Fisher Information selektorining adaptive testdagi samaradorligi
- **Method**: Monte-Carlo — 1000 ta simulatsiya qilingan talaba (har xil θ qiymatlari) Fisher selector vs random selector vs sequential
- **Metrika**:
  - Avg items needed for SE(θ) < 0.3
  - Avg final |θ_estimated - θ_true|
- **Kutilgan**: Fisher selector 30-40% kam savol talab qiladi random'ga nisbatan

## Vositalar
- `scripts/eval/e1_generation.py` — generatsiya batch + log
- `scripts/eval/e2_juror_agreement.py` — kappa hisoblash (sklearn)
- `scripts/eval/e3_cefr_classifier.py` — gold standard test
- `scripts/eval/e4_calibration_correlation.py`
- `scripts/eval/e5_adaptive_simulation.py`
- Hammasi natijalarni `reports/` ga JSON va PNG sifatida yozadi

## Pilot integratsiya (10-hafta)
- 10-20 BSU talaba haqiqiy test topshiradi
- Bobomurod uchun: real `analytics.item_response_data` to'planadi
- E4 ushbu ma'lumotlar bilan qaytarib hisoblanadi
- Final report: `reports/pilot-summary-bobo.md`

## Tezis uchun jadvallar (LaTeX)
- Table 4.1: Per-skill generation stats
- Table 4.2: Inter-juror agreement matrix
- Table 5.1: CEFR classifier confusion matrix
- Table 6.1: Cold-start vs empirical b correlation
- Figure 6.2: b distribution before/after calibration
- Figure 6.3: Theta convergence in adaptive simulation
