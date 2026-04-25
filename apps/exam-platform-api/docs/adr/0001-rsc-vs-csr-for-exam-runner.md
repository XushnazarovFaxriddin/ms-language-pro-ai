# ADR EP-0001 — Exam Runner uses Client Components (CSR)

- **Status**: Accepted
- **Date**: 2026-04-26

## Context
Next.js 15 App Router defaults to RSC. Exam Runner needs:
- Real-time timer (every 1s update)
- Audio playback control (single-play enforcement)
- MediaRecorder API access
- TipTap editor with focus tracking
- Zustand store with `sessionStorage` persistence

All require browser APIs.

## Decision
Exam Runner shell (`/attempt/[id]/section/[n]/page.tsx`) is RSC for initial data fetch. Inner `<ExamRunnerClient />` is `'use client'` and owns interaction state.

Pattern:
```tsx
// page.tsx (RSC)
export default async function Page({ params }) {
  const attempt = await fetchAttempt(params.id);  // server-side
  return <ExamRunnerClient initialAttempt={attempt} />;
}

// ExamRunnerClient.tsx ('use client')
export function ExamRunnerClient({ initialAttempt }) {
  const [state, ...] = useExamStore();
  // ...
}
```

## Consequences
- Initial paint via RSC (fast, SEO not relevant for auth-protected page)
- Interactivity via CS as fallback
- Smaller client bundle for non-runner pages
- Server Actions used for navigation (start, finish), not for in-section item submit (latency matters → use TanStack Query for instant UX)
