# 03 — Key Components

## Shared (from `@languagepro/ui`)
- shadcn/ui primitives: Button, Card, Dialog, Tabs, Sheet, Sidebar, Toast, Form, Input, Select, ...
- Custom: `<DataTable />` (TanStack Table wrapper), `<EmptyState />`, `<DateRangePicker />`

## App-specific (`src/components/`, `src/features/`)

### features/generation/
- `GenerationForm.tsx` — start a batch (skill, level, count, blueprint)
- `GenerationProgress.tsx` — SSE listener, progress bar, live items list
- `JobsList.tsx` — past jobs table

### features/review-queue/
- `ReviewItemCard.tsx` — single question review (approve/reject/edit)
- `ReviewQueueList.tsx` — paginated queue

### features/calibration/
- `BDistributionChart.tsx` — recharts histogram of difficulty values
- `ItemHistoryChart.tsx` — time-series b/a per item
- `CalibrationRunsTable.tsx`

### features/llm-usage/  (LLM dashboard)
- `StatCards.tsx` — 4 top cards (cost / calls / tokens / latency)
- `UsageTimeSeries.tsx` — area chart (per-purpose stacked)
- `BreakdownTabs.tsx` — by purpose / model / user
- `BudgetWidget.tsx` — monthly budget + projection
- `RecentCallsTable.tsx` — last 50 calls
- `AnomaliesBanner.tsx` — auto-detected spikes
- `CallDetailView.tsx` — full prompt + response + metadata

### features/prompts/
- `PromptVersionsList.tsx`
- `PromptDiffView.tsx` — git-style text diff
- `PromptTestRunner.tsx` — try prompt on sample inputs

### features/llm-config/
- `LLMProfileForm.tsx` — per-purpose model/temperature editor
- `RuntimeOverrideToggle.tsx` — env vs DB override status

## State patterns
- **Server state** (lists, dashboards): TanStack Query `useQuery`
- **Mutations** (CRUD): Server Actions `'use server'`
- **UI state** (dialogs, filters): React `useState` or Zustand if cross-component
- **Real-time**: native `EventSource` for SSE (jobs progress, LLM usage live)

## Forms
- react-hook-form + zod
- Schemas in `src/features/<feat>/schemas.ts`
- Submit via Server Action, validate server-side too
