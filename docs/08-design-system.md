# 08 — Design System

> **TL;DR.** Modern, calm, dual-mode (light + dark, system-detected with manual toggle). Inter for UI, JetBrains Mono for monospace; tabular numerals for scores. Brand primary is electric indigo; semantic tokens map to surface / foreground / muted / accent / success / warning / danger. shadcn/ui (new-york style) as the component base; framer-motion for choreographed transitions; tailwindcss-animate for micro-interactions. Every page is bilingual (UZ / EN) and accessible (WCAG AA). **Never** hard-code a colour, padding, radius, or English string.

---

## 1. Aesthetic direction

Reference points: **Linear** (clarity), **Vercel** (typography + monochrome accents), **Stripe** (trust + density), **Duolingo** (warmth in encouraging contexts), **Pitch** (confident dark mode), **Cursor** (subtle gradients).

Feel:
- **Quiet by default**: lots of whitespace, neutral surfaces, one accent.
- **Confident on action**: gradients and motion only on the primary CTA, hero, and result reveals.
- **Rounded but not bubbly**: `--radius-md = 0.625rem`; pill avatars only on profile.
- **Crisp typography**: Inter Tight for display; numerals tabular so band scores align.

Anti-patterns: drop-shadows on everything, glassmorphism, neon gradients, illustration mascots.

---

## 2. Tokens

All tokens live in `packages/ui/src/styles.css`. **Apps import this file once** in `app/layout.tsx`. Never define colours elsewhere.

```css
@import "tailwindcss";

/* ============== Light theme (default) ============== */
@theme inline {
  /* Surface scale */
  --color-bg:               oklch(0.99 0.005 250);   /* page background */
  --color-surface:          oklch(1.00 0 0);         /* cards, modals */
  --color-surface-2:        oklch(0.97 0.005 250);   /* nested cards */
  --color-surface-3:        oklch(0.94 0.005 250);   /* hover */
  --color-border:           oklch(0.90 0.008 250);
  --color-border-strong:    oklch(0.82 0.012 250);

  /* Foreground scale */
  --color-foreground:       oklch(0.15 0.012 250);
  --color-muted-foreground: oklch(0.45 0.010 250);
  --color-disabled:         oklch(0.65 0.008 250);

  /* Brand primary — electric indigo */
  --color-primary:          oklch(0.55 0.22 264);
  --color-primary-hover:    oklch(0.50 0.22 264);
  --color-primary-fg:       oklch(0.99 0 0);
  --color-primary-soft:     oklch(0.95 0.04 264);    /* tinted bg for badges */

  /* Semantic */
  --color-success:          oklch(0.65 0.18 155);
  --color-success-fg:       oklch(0.99 0 0);
  --color-success-soft:     oklch(0.94 0.05 155);
  --color-warning:          oklch(0.78 0.16 80);
  --color-warning-fg:       oklch(0.20 0 0);
  --color-warning-soft:     oklch(0.96 0.05 80);
  --color-danger:           oklch(0.62 0.22 25);
  --color-danger-fg:        oklch(0.99 0 0);
  --color-danger-soft:      oklch(0.96 0.04 25);

  /* Charts (categorical, ordered) */
  --color-chart-1:          oklch(0.65 0.18 264);
  --color-chart-2:          oklch(0.65 0.18 155);
  --color-chart-3:          oklch(0.78 0.16 80);
  --color-chart-4:          oklch(0.62 0.22 25);
  --color-chart-5:          oklch(0.55 0.18 310);
  --color-chart-6:          oklch(0.65 0.18 200);

  /* Radii */
  --radius-sm:              0.375rem;
  --radius-md:              0.625rem;
  --radius-lg:              0.875rem;
  --radius-xl:              1.25rem;

  /* Shadows */
  --shadow-xs:              0 1px 2px oklch(0 0 0 / 0.04);
  --shadow-sm:              0 1px 3px oklch(0 0 0 / 0.06), 0 1px 2px oklch(0 0 0 / 0.04);
  --shadow-md:              0 4px 8px oklch(0 0 0 / 0.06), 0 2px 4px oklch(0 0 0 / 0.04);
  --shadow-lg:              0 12px 24px oklch(0 0 0 / 0.08), 0 4px 8px oklch(0 0 0 / 0.04);

  /* Typography */
  --font-sans:              "Inter", "Inter Tight", system-ui, sans-serif;
  --font-mono:              "JetBrains Mono", ui-monospace, monospace;
  --font-display:           "Inter Tight", "Inter", system-ui, sans-serif;

  /* Motion */
  --ease-out:               cubic-bezier(0.16, 1, 0.3, 1);
  --ease-in-out:            cubic-bezier(0.65, 0, 0.35, 1);
  --duration-fast:          150ms;
  --duration-base:          250ms;
  --duration-slow:          450ms;
}

/* ============== Dark theme ============== */
[data-theme="dark"] {
  --color-bg:               oklch(0.13 0.012 250);
  --color-surface:          oklch(0.16 0.012 250);
  --color-surface-2:        oklch(0.19 0.012 250);
  --color-surface-3:        oklch(0.22 0.014 250);
  --color-border:           oklch(0.26 0.014 250);
  --color-border-strong:    oklch(0.34 0.016 250);

  --color-foreground:       oklch(0.96 0.005 250);
  --color-muted-foreground: oklch(0.68 0.010 250);
  --color-disabled:         oklch(0.40 0.008 250);

  --color-primary:          oklch(0.70 0.20 264);
  --color-primary-hover:    oklch(0.74 0.20 264);
  --color-primary-fg:       oklch(0.13 0 0);
  --color-primary-soft:     oklch(0.25 0.10 264);

  --color-success:          oklch(0.72 0.16 155);
  --color-success-soft:     oklch(0.25 0.08 155);
  --color-warning:          oklch(0.82 0.15 80);
  --color-warning-soft:     oklch(0.28 0.08 80);
  --color-danger:           oklch(0.70 0.20 25);
  --color-danger-soft:      oklch(0.27 0.08 25);

  --color-chart-1:          oklch(0.72 0.18 264);
  --color-chart-2:          oklch(0.72 0.18 155);
  --color-chart-3:          oklch(0.82 0.16 80);
  --color-chart-4:          oklch(0.70 0.20 25);
  --color-chart-5:          oklch(0.65 0.18 310);
  --color-chart-6:          oklch(0.72 0.18 200);

  --shadow-xs:              0 1px 2px oklch(0 0 0 / 0.30);
  --shadow-sm:              0 1px 3px oklch(0 0 0 / 0.40);
  --shadow-md:              0 4px 8px oklch(0 0 0 / 0.45);
  --shadow-lg:              0 12px 24px oklch(0 0 0 / 0.55);
}
```

> **Use `var(--color-foreground)` etc. directly in Tailwind: `class="bg-(--color-surface) text-(--color-foreground)"`** (Tailwind v4 native CSS-var syntax). Never write `bg-zinc-50` or `text-white`.

---

## 3. Theme toggle

`apps/*/src/components/ThemeProvider.tsx` (client):
- On mount: read cookie `theme` (`system` | `light` | `dark`); if `system`, listen to `prefers-color-scheme`.
- Apply `data-theme="light"` or `data-theme="dark"` to `<html>`.
- On toggle: persist to cookie + `localStorage`. PATCH `/auth/v1/me` with new value if logged in.
- **Server-side**: read cookie in `app/layout.tsx` and set `data-theme` attribute initially to avoid flash. If cookie is `system`, leave attribute off and use a tiny inline script to set it before paint.

```tsx
// app/layout.tsx (excerpt)
const cookieTheme = (await cookies()).get("theme")?.value;
const initial = cookieTheme === "light" || cookieTheme === "dark" ? cookieTheme : null;
return (
  <html lang={locale} data-theme={initial ?? undefined} suppressHydrationWarning>
    <head>
      <script dangerouslySetInnerHTML={{ __html: `
        (function() {
          var t = document.cookie.match(/theme=(\\w+)/);
          var v = t && t[1];
          if (v === 'light' || v === 'dark') document.documentElement.dataset.theme = v;
          else if (window.matchMedia('(prefers-color-scheme: dark)').matches)
            document.documentElement.dataset.theme = 'dark';
        })();
      `}} />
    </head>
    ...
```

Toggle UI: header icon button (Sun / Moon / Computer monitor) with a 3-state cycle.

---

## 4. Typography scale

| Token | Size / line-height | Use |
|---|---|---|
| `text-display-xl` | 60/64 px · -0.02em · 700 | hero |
| `text-display-lg` | 48/52 · -0.02em · 700 | landing section h1 |
| `text-display-md` | 36/40 · -0.02em · 700 | page h1 |
| `text-h1` | 30/36 · -0.01em · 600 | section |
| `text-h2` | 24/32 · -0.01em · 600 | card title |
| `text-h3` | 20/28 · 0 · 600 | subhead |
| `text-body-lg` | 18/28 · 0 · 400 | hero subhead |
| `text-body` | 16/24 · 0 · 400 | default |
| `text-body-sm` | 14/20 · 0 · 400 | dense UI |
| `text-caption` | 12/16 · 0.01em · 500 | labels |
| `text-mono-sm` | 13/18 · 0 · 400 (mono) | IDs, code |

Tabular numerals on scores: `class="tabular-nums"`.

---

## 5. Spacing & layout

- 4-px grid via Tailwind defaults; never invent values.
- Page max-widths: marketing `max-w-6xl`, app shell `max-w-7xl`, exam runner `max-w-3xl`, forms `max-w-md`.
- Vertical rhythm: section spacing `py-16 md:py-24` on marketing, `py-10` in app.
- Responsive breakpoints: `sm:640`, `md:768`, `lg:1024`, `xl:1280`, `2xl:1536`. Mobile-first.

---

## 6. Component primitives (shadcn/ui new-york)

Base set copied into `packages/ui/src/components/`:

`Button, IconButton, Input, Textarea, Select, Combobox, Checkbox, Radio, RadioGroup, Switch, Tabs, Dialog, Sheet, Drawer, Popover, Tooltip, DropdownMenu, ContextMenu, NavigationMenu, Toast, Alert, Badge, Avatar, Card, Skeleton, Separator, Progress, ScrollArea, Slider, Toggle, ToggleGroup, Label, Form (rhf+zod), Table, Pagination, Calendar, DateRangePicker, Command (cmdk).`

Brand-specific custom components:
- **`<BandBadge value={7.5} />`** — coloured pill with score; tabular numerals; size sm/md/lg.
- **`<SkillIcon skill="reading" />`** — lucide icon mapping.
- **`<ProgressRing value={0.65} />`** — SVG ring used on results.
- **`<MicLevel stream={...} />`** — animated bars from Web Audio AnalyserNode.
- **`<Countdown deadline={...} />`** — color shift at <60s.
- **`<KbdHint keys={["Cmd","Enter"]} />`** — keyboard hint chip.
- **`<EmptyState icon title description action />`** — every empty list uses this.
- **`<MetricCard label value delta sparkline />`** — admin dashboards.
- **`<PaywallSheet feature="speaking" />`** — opens upgrade flow.
- **`<LocaleSwitcher />`** — UZ ⇄ EN flag pair.
- **`<ThemeSwitcher />`** — sun / moon / system cycle.

Every primitive accepts `className` and uses `cn()` to merge. Never extend by editing the file in `@languagepro/ui` — instead, compose via wrapping.

---

## 7. Motion

- **Page transitions** (Next.js App Router): `framer-motion` `<motion.div initial={{ opacity:0, y:8 }} animate={{ opacity:1, y:0 }} transition={{ duration:0.25, ease:"easeOut" }}>`.
- **Result reveal** on the score page: stagger children with delay 0.08s; ProgressRing animates from 0 to value over 0.9s.
- **Modal**: overlay fade 150ms, panel scale 0.96→1 + fade 200ms.
- **Toast**: slide in from top-right, 250ms, ease-out.
- **Microcopy**: never animate text content; only opacity & transform.
- **Reduced motion**: respect `prefers-reduced-motion: reduce` — disable scale/translate, keep opacity at 0→1 in 80ms.

---

## 8. Iconography

- `lucide-react` only.
- Stroke `1.75`. Size 16/20/24 px depending on context.
- Skill icons: `Headphones` (listening), `BookOpen` (reading), `PenSquare` (writing), `Mic` (speaking).
- Always pair with a text label or `aria-label`.

---

## 9. Imagery

- **No stock photos.**
- Marketing illustrations: minimal vector, single accent colour stroke, neutral tones. Source: custom SVG or [`undraw.co`](https://undraw.co) tinted to brand primary.
- OG / social images: 1200×630, dark-mode-ish background, brand wordmark + page title in display font.

---

## 10. Internationalisation (UZ + EN)

- **next-intl** with `[locale]` segment.
- Catalogues: `packages/i18n/src/{en,uz}.json`. Namespaces per surface (`Common`, `Landing`, `Auth`, `Exams`, `Runner`, `Results`, `Billing`, `Admin`, `Errors`).
- **Build-time enforcement**: ESLint plugin or custom CI check rejects any string literal in JSX longer than 1 char that isn't a translation key (`t('Common.actions.save')`).
- **Pluralisation**: ICU MessageFormat (`{count, plural, one {# attempt} other {# attempts}}`).
- **Number / date / currency**: always via `useFormatter()` from next-intl with the user's locale.
- **Bidi**: not needed for UZ Latin + EN.

UZ tone:
- Use **siz** (formal you), never **sen**.
- Avoid forced loanwords ("computer" ✓, "kompyuter" ✓; "marketing-li" ✗).
- Imperative form for buttons: "Boshlash", "Yuborish", "Tasdiqlash".
- Errors: explain + suggest. "Email noto'g'ri" → "Email manzili to'g'ri ko'rinmayapti — `siz@misol.uz` shaklida kiriting".

EN tone:
- Second-person, active voice. "Take the test." not "Tests can be taken."
- Concise. Title case for buttons; sentence case for labels.

Locale switcher: UZ ⇄ EN visible in the header on every page. Persists to `auth.users.locale` for logged-in users + cookie + localStorage for guests.

---

## 11. Accessibility (WCAG AA)

- Contrast: every text/background pair must hit AA (4.5:1 normal, 3:1 large). Tested via the design tokens (already pre-checked in §2).
- Focus: visible outline 2px, brand primary, `--radius-sm`. Never `outline: none` without a replacement.
- Keyboard: every interactive element reachable; `Tab` order matches visual order; `Esc` closes modals.
- Screen reader: every icon button has `aria-label`; every form field has `<label>`; every error has `aria-describedby`.
- Skip-to-content link on every page (visible on focus).
- `prefers-reduced-motion`: respected in motion section.
- Time-based content (audio): always provide a transcript within 24h (Phase 2).

---

## 12. Forms & validation

- `react-hook-form` + `zod`, schemas in `features/<feat>/schemas.ts`.
- Validate on `blur`, not on every keystroke.
- Submit button disabled while validating or pending; show `<Spinner />` inside.
- Errors:
  - Inline below the field on blur.
  - Top-of-form summary on submit failure (`role="alert"`).
  - Server errors mapped to fields via the Problem Details `errors[]`.

---

## 13. Empty states

Every list-or-grid view has `<EmptyState>` with:
- An on-brand line icon (lucide).
- A 1-sentence explanation in user's locale.
- A primary CTA (e.g. "Take your first test").

Never an empty container with no message.

---

## 14. Loading states

- Initial paint: skeletons (`<Skeleton />`) shaped like the final content (avoid layout shift).
- In-flight mutations: button shows spinner and dims; rest of UI stays interactive unless dangerous.
- Long jobs (generation, scoring): SSE-driven progress bar + estimated time + activity log.

---

## 15. Error states

- Network errors: toast + retry CTA.
- 4xx: inline message ("Plan limit reached" → `<PaywallSheet>`).
- 5xx: full-page fallback with Sentry event id and "Try again".
- Form errors: see §12.
- Console errors in production are caught by Sentry; never `alert()` or unhandled rejection.

---

## 16. Sample components (target output)

### Primary button
```tsx
<Button variant="primary" size="md" className="gap-2">
  <Play className="size-4" /> {t('Exams.start')}
</Button>
```
Visual: `bg-(--color-primary) text-(--color-primary-fg) rounded-(--radius-md) px-4 h-10 font-medium hover:bg-(--color-primary-hover) focus-visible:ring-2 ring-(--color-primary)/40`.

### Band badge
```tsx
<BandBadge value={7.5} max={9} size="md" />
```
Background tinted by band: 0–4 danger-soft, 5–6 warning-soft, 6.5–7 primary-soft, 7.5+ success-soft.

### Section card
```tsx
<Card className="p-6 hover:bg-(--color-surface-3) transition-colors">
  <SkillIcon skill="reading" />
  <h2 className="text-h2 mt-4">{t('Skills.reading')}</h2>
  <p className="text-body-sm text-(--color-muted-foreground) mt-2">…</p>
</Card>
```

---

## 17. Acceptance

- [ ] Toggling theme persists across page reloads, across subdomains, and across login sessions.
- [ ] No FOUC (flash of unstyled content) on first paint in either theme.
- [ ] Lighthouse Accessibility ≥ 95 on landing, exam runner, results.
- [ ] Tab through `/login` reaches every interactive element in visible order.
- [ ] All copy renders correctly in both UZ and EN; no English fallback shown to a UZ user.
- [ ] All four band-badge variants (danger/warning/primary/success) are visible in both themes.
- [ ] `prefers-reduced-motion: reduce` disables scale/translate animations.
- [ ] Currency formatting uses locale-aware separators (UZ: thin space; EN: comma).
- [ ] No hard-coded hex / rgb / named colour outside `packages/ui/src/styles.css`.
- [ ] No `<p>` or `<h1>` in JSX with hard-coded English string anywhere.
