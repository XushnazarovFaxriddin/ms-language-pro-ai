# 00 — Overview

## Nima qiladi
- Talabalar uchun IELTS/CEFR online imtihon platformasi
- Adaptiv test (data-engine'dan items oladi, theta tracking)
- Writing essay'larni Gemini 2.5-pro bilan baholaydi (4 IELTS criteria)
- Speaking audio'larni Gemini 2.5 Flash multimodal bilan baholaydi (transkriptsiya + scoring bitta call'da)
- Sertifikat PDF generatsiya qiladi
- Foydalanuvchi tarixi va analitika

## Foydalanuvchilar
- **student** — asosiy: imtihon topshiradi, natija oladi
- **examiner** — past confidence LLM bahosini ko'rib chiqadi (review queue)
- **admin** — barcha attempts'ni ko'radi

## Subdomain
- API: `https://api.aiexam.uz/exam/v1/*`
- Student UI: `https://app.aiexam.uz`

## Eng muhim chegaralar
1. Hech qachon to'g'ridan-to'g'ri DB'da savollarni saqlamaydi — har doim `data-engine-api` orqali oladi (S2S JWT)
2. Audio fayllar S3'ga yuklanadi, DB'da faqat `s3_key` saqlanadi
3. Real attempt davomida foydalanuvchi audio replay qila olmasligi (IELTS qoidasi)

## DoD (Phase 2 oxirida)
- [ ] To'liq IELTS Reading happy path E2E ishlaydi
- [ ] Writing Task 2 essay → 20s ichida band 0-9 + feedback (UZ + EN)
- [ ] Speaking Part 2 audio → 30s ichida transkriptsiya + 4-criteria scoring
- [ ] Adaptive: 30 ta savoldan keyin SE(theta) < 0.3
- [ ] Certificate PDF generatsiya + S3'ga yuklash
