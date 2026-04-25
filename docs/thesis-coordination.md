# Dissertatsiyalarning Muvofiqlashtirilishi (Thesis Coordination)

> **Til**: O'zbek (asosiy)
> **Auditoriya**: Bobomurod, Faxriddin va ularning ilmiy rahbarlari.
> **Maqsad**: Bitta kod bazasida ikki dissertatsiya yozilganda, har bir talabaning hissasi aniq, his-himoya kuni komissiya ikkala ishni ham mustaqil deb qabul qilishi uchun ish taqsimoti.

---

## 1. Asosiy printsip

> **"Bitta loyiha — ikki dissertatsiya"** modeli xavfli: agar chegaralar aniq qo'yilmasa, komissiya ikkala ishni ham bitta loyiha deb baholashi mumkin. Shu sababli **kod, hujjat, demo, va metrika** darajalarida aniq ajratish zarur.

| Daraja | Ajratish mexanizmi |
|---|---|
| Kod | Har bir mavzu uchun alohida `apps/` papkasi + `git blame` orqali tasdiqlash |
| Hujjat | Har bir loyihada `docs/09-thesis-mapping.md` (yoki `10-`) — kod ↔ tezis bobi xaritasi |
| Demo | Himoya kuni alohida bloklar (Bobomurod 10 daq, Faxriddin 15 daq, qo'shma 5 daq) |
| Metrika | Har bir tezisda alohida eksperiment va natija jadvallari |

---

## 2. Mas'uliyatlar matritsasi (RACI)

> **R**esponsible (bajaradi) | **A**ccountable (javobgar) | **C**onsulted (maslahat) | **I**nformed (xabardor)

| Komponent | Bobomurod | Faxriddin | Joint |
|---|---|---|---|
| **`apps/data-engine-api/`** | R, A | C, I | — |
| **`apps/data-engine-web/`** | R, A | I | — |
| **`apps/exam-platform-api/`** | C, I | R, A | — |
| **`apps/exam-platform-web/`** | I | R, A | — |
| **`apps/auth-api/`** | C | C | R, A (ikkala talaba) |
| **`apps/landing/`** | C | C | R, A |
| **`packages/ui/`** | C | C | R, A — birgalikda |
| **`packages/contracts/`** | R (data-engine qismi) | R (exam-platform qismi) | A (joint review) |
| **`packages/i18n/`** | C | C | R, A |
| **`python/languagepro_llm/`** | A (asosiy iste'molchi) | C | R |
| **`python/languagepro_irt/`** | R, A | C | — |
| **`python/languagepro_common/`** | C | C | R, A |
| **`infra/` (Docker, Caddy, k8s)** | C | C | R, A |
| **`prompts/`** | R, A | C (faqat scoring prompts) | — |
| **`docs/` (repo-root)** | C | C | R, A |
| **CI/CD pipeline** | C | C | R, A |
| **Production deploy** | I | I | R, A — birgalikda |

### 2.1. Conflict resolution

Agar ikkalasi ham bitta faylni tahrir qilishi kerak bo'lsa:
1. Avval `docs/adr/` ga ADR yoziladi (qaror sababi).
2. Ikkalasi ham PR'ni "approve" qiladi.
3. Joint kategoriyadagi fayllar uchun — ikkalasi ham "approver".

Janjal bo'lsa — ilmiy rahbar(lar) ishtirokida hal qilinadi. Kod sifatidan "kim haqligi" emas, "loyiha uchun nima yaxshiroq" mezoni.

---

## 3. Dissertatsiya boblari ↔ kod xaritasi

### 3.1. Bobomurod — "Sun'iy intellekt arxitekturasi yordamida xorijiy tilni bilish darajasini aniqlash platformasining ma'lumotlar manbaini shakllantirish"

| Tezis bobi | Kod / hujjat lokatsiyasi | Asosiy hissalar |
|---|---|---|
| 1. Kirish va muammoning qo'yilishi | — | — |
| 2. Adabiyotlar tahlili | `docs/literature-review.md` | CEFR, IRT, AES, automated test generation |
| 3. AI bilan savol generatsiya arxitekturasi | `apps/data-engine-api/src/data_engine/services/generation/` | seed → generate → embed → dedup pipeline |
| 4. Multi-jury validatsiya metodologiyasi | `apps/data-engine-api/src/data_engine/services/validation/` | 3-modelli "jury" tizimi, Cohen's κ inter-rater agreement |
| 5. CEFR klassifikatsiya algoritmi | `apps/data-engine-api/src/data_engine/services/cefr_classifier/` | EVP + CEFR-J + LLM hybrid |
| 6. IRT 2PL kalibratsiya | `python/languagepro_irt/` + `apps/data-engine-api/src/data_engine/services/calibration/` | py-irt MML estimation, Maximum Fisher Information selector |
| 7. Eksperimental natijalar | `apps/data-engine-api/docs/10-evaluation.md` | 500+ savol generatsiya, jury accuracy, calibration vs cold-start |
| 8. Xulosa va kelajak ishlar | — | — |

**Demo**: data-engine-web → live batch generation → jury validation → calibration dashboard with `b` distributions and Langfuse cost.

### 3.2. Faxriddin — "Sun'iy intellekt arxitekturalari yordamida xorijiy tilini bilish darajasini aniqlash platformasini ishlab chiqish"

| Tezis bobi | Kod / hujjat lokatsiyasi | Asosiy hissalar |
|---|---|---|
| 1. Kirish va muammoning qo'yilishi | — | — |
| 2. Adabiyotlar tahlili | `docs/literature-review.md` | DET, EF SET, Cambridge Linguaskill, AES, multimodal LLM scoring |
| 3. Platforma arxitekturasi | `apps/exam-platform-api/src/exam_platform/` + `apps/exam-platform-web/` | Hexagonal, RSC + Server Actions, ExamRunner |
| 4. Adaptiv test boshqaruvi (client-side IRT) | `apps/exam-platform-api/src/exam_platform/services/adaptive/` | θ tracking, item budget, stopping rules |
| 5. Avtomatik baholash pipeline'i | `apps/exam-platform-api/src/exam_platform/services/scoring/` | Writing rubric prompt, confidence gate, human review queue |
| 6. Audio-multimodal speaking baholash | `apps/exam-platform-api/src/exam_platform/services/scoring/speaking.py` | MediaRecorder → ffmpeg → Gemini multimodal STT+scoring |
| 7. Eksperimental natijalar | `apps/exam-platform-api/docs/11-evaluation.md` | IRR study (LLM vs human, n=30), pilot 10–20 BSU students |
| 8. Xulosa va kelajak ishlar | — | — |

**Demo**: exam-platform-web → 30-min mini-IELTS → adaptive picker → writing/speaking LLM scoring → UZ feedback → certificate PDF.

---

## 4. Joint chapter strategiyasi

Har bir tezisda **bitta** "system overview" sahifa bo'ladi (~1 bet) — butun tizimni kontekstualizatsiya qilish uchun. Lekin asosiy hissa ko'rsatkichi har bir talabada **alohida** o'z bo'limi.

Joint mavzular (har ikki tezisda paydo bo'lishi mumkin, lekin har biri o'z burchak ostida):
- **LLMRouter abstraktsiyasi**: Bobomurod uchun — generation/validation kontekstida; Faxriddin uchun — scoring kontekstida.
- **Auth & SSO**: Har biri "umumiy infratuzilma" sifatida 1 paragraph.
- **Database & API contracts**: Har birida o'z schema'siga bag'ishlangan bob.

---

## 5. Cross-thesis PR review qoidalari

| PR turi | Review talablari |
|---|---|
| `data-engine/*` ichida | 1 approve — Bobomurod o'zi |
| `exam-platform/*` ichida | 1 approve — Faxriddin o'zi |
| `apps/auth-api/*`, `infra/*`, `packages/*`, `python/*` | **2 approve** — ikkalasi ham |
| `packages/contracts/*` (API kontrakt) | **2 approve** — kontrakt o'zgarishi |
| `docs/adr/*` (cross-cutting ADR) | **2 approve** + 7 kun comment period |
| `docs/data-licensing.md` | **2 approve** + ilmiy rahbar mention |

> **Diqqat**: Cross-thesis PR'larda komment yozish — keyinchalik komissiyaga "kim qachon nima qildi" ko'rsatish uchun foydali. PR description'da "Bu o'zgarishni nimaga muhim" ni har doim yozib qo'ying.

---

## 6. Branching strategiyasi

```
main                    ← protected, faqat PR orqali
  ├─ bobo/feature-X     ← Bobomurod ishlaydi
  └─ fax/feature-Y      ← Faxriddin ishlaydi
       ├─ joint/auth-jwt-rotation  ← qo'shma feature (ikkalasi commit qiladi)
       └─ docs/...                 ← hujjat
```

- Kommit prefiks: `bobo:`, `fax:`, `joint:` — `git log` orqali statistika ajratish uchun.
- Misol: `bobo: add jury validation pipeline (closes #42)`.

---

## 7. Daily sync protokoli

- **Asynchronous standup**: kuniga 1 marta (kech) — har biri quyidagilarni Telegram/Slack guruhga yozadi:
  - Bugun nima qildim
  - Ertaga nima qilaman
  - Bloklovchi narsa bormi
- **Weekly retro** (juma): 30 daqiqa — har birining hissasini ko'rib chiqamiz, kelgusi haftaga reja.
- **Bi-weekly advisor sync**: ilmiy rahbar bilan ko'rsatish (loyiha holati + jadval).

---

## 8. Litsenziya va mualliflik huquqi

- **Loyiha rasmiy nomi**: LanguagePro AI (dastur guvohnomasi BuxDU + ikkala talaba nomida).
- **Kod IP**: Tasarrufda — ikkala talaba teng huquqli.
- **Tezis IP**: Har bir talaba o'z dissertatsiyasi mualliflik huquqiga ega. Boshqasining bo'limini sitat qilish — ilmiy iqtibos qoidalariga muvofiq.
- **Kelajak**: MVP'dan keyin loyiha tijoriylashtirilsa — hisseli investitsiya kelishuvi alohida tuzilishi kerak.

---

## 9. Himoya kunidagi rejis

| Vaqt | Tadbir | Kim |
|---|---|---|
| 0 — 5 daq | Loyihani umumiy kontekstda tanishtirish (slaydlar) | Birgalikda |
| 5 — 15 daq | Bobomurod prezentatsiya + demo (data-engine) | Bobomurod |
| 15 — 25 daq | Bobomurod savollarga javob | Bobomurod |
| 25 — 40 daq | Faxriddin prezentatsiya + demo (exam-platform) | Faxriddin |
| 40 — 50 daq | Faxriddin savollarga javob | Faxriddin |
| 50 — 55 daq | Joint demo: yopiq halqa (response → recalibration) | Birgalikda |
| 55 — 60 daq | Yakuniy savollar | Birgalikda |

> Backup: VPS ishlamasa, demo screencast video tayyor bo'ladi.

---

## 10. Hujjatlash burch

Har bir kommit (joint emas) shu kishi tomonidan o'z dissertatsiya `docs/09-thesis-mapping.md` faylida belgilanishi kerak (qaysi tezis bobi uchun ekanligini). Bu — himoya kuni komissiyaga "kim nimani qildi" ni tasdiqlash uchun.

---

_Last reviewed: 2026-04-26 by joint authors_
