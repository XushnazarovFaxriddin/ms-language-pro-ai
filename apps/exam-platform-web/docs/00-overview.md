# 00 — Overview (exam-platform-web)

## Nima qiladi
Talaba foydalanuvchisi uchun:
- Imtihon turini tanlash
- Imtihonni topshirish (Listening, Reading, Writing, Speaking)
- Natijalarni ko'rish (band, criteria, feedback UZ/EN)
- Sertifikat PDF yuklab olish
- O'tgan urinishlar tarixi

## Stack
Next.js 15 App Router, TypeScript strict, Tailwind v4, shadcn/ui, next-intl (UZ default + EN), TanStack Query (lists), Zustand (ExamRunner state), TipTap (writing), MediaRecorder (speaking).

## Subdomain
`https://app.languagepro.ai`

## Kritik UX talablar
- **Imtihon davomida** sahifani tark etish — uchqun ogohlantirish, time pauza qilinmaydi
- **Listening audio** — bir marta ijro etiladi, seek bar yo'q
- **Writing essay** — paste bloklangan, focus loss tracking
- **Speaking** — mikrofon ruxsati birinchi savoldan oldin so'raladi
- **Mobile** — responsive, lekin imtihon kompyuterdan tavsiya etiladi (banner)
