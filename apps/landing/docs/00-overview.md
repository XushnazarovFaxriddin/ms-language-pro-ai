# 00 — Overview (landing)

## Maqsad
- LanguagePro AI haqida birinchi kirish nuqtasi
- 2 ta mahsulotni reklama qilish: imtihon (`app.aiexam.uz`) + content studio (`admin.aiexam.uz`)
- Demo video, narxlash, FAQ
- Privacy Policy + Terms of Service (pilot uchun shart)

## Sahifalar
| Path | Mazmun |
|---|---|
| `/[locale]` | Hero, value props, demo CTA |
| `/[locale]/about` | Loyiha, mualliflar, BSU dissertatsiya |
| `/[locale]/exams` | Test turlari (IELTS, CEFR placement) — link to app.aiexam.uz |
| `/[locale]/for-teachers` | Content studio sotuv sahifasi |
| `/[locale]/pricing` | Free / Pro plans (kelajakda) |
| `/[locale]/faq` | Tez-tez beriladigan savollar |
| `/[locale]/privacy` | Privacy Policy (UZ + EN) |
| `/[locale]/terms` | Terms of Service |
| `/[locale]/contact` | Email, manzil |

## Stack
Next.js 15 (mostly RSC, static where possible), Tailwind v4, shadcn/ui, next-intl. SEO: full metadata, sitemap, OG images. Hosted as static via Caddy.

## Performance
- Hero JS bundle <50KB
- Lighthouse Performance ≥ 95 (mobile)
- All images optimized (Next/Image)

## Acceptance
- [ ] All public pages render in EN + UZ
- [ ] Privacy Policy and ToS exist before pilot
- [ ] Sitemap.xml served
- [ ] OG images per page
- [ ] Linked from app + data-engine subdomains (footer)
