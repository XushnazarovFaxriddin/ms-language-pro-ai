# 02 — ExamRunner Component

> Eng murakkab komponent. Imtihon davomida talabaning butun tajribasini boshqaradi.

## Mas'uliyat
- Joriy savolni ko'rsatish (per-type variant)
- Timer (per-section + per-attempt)
- Javob yig'ish va submit
- Keyingi savolni olish
- Audio playback control (Listening: bir marta, Speaking: record)
- Section o'tish
- Crash recovery (sessionStorage)

## State (Zustand)
```ts
// features/exam-runner/store.ts
interface ExamState {
  attemptId: string;
  currentSectionIndex: number;
  currentItem: Item | null;
  itemsAnswered: Map<string, AnswerSnapshot>;
  thetaPerSkill: Record<Skill, number>;
  sectionStartedAt: number;
  sectionTimeLimit: number;  // seconds
  audioPlayed: Set<string>;  // listening: which items already played
  // Actions:
  loadNextItem: () => Promise<void>;
  submitAnswer: (answer: AnswerInput) => Promise<void>;
  finishSection: () => Promise<void>;
  hydrateFromServer: (attempt: Attempt) => void;
}
```

Persisted to `sessionStorage` on every state change.

## Per-type variants (`features/exam-runner/items/`)
- `MCQSingleItem.tsx`
- `MCQMultiItem.tsx`
- `TrueFalseNGItem.tsx`
- `MatchingItem.tsx`
- `MatchingHeadingsItem.tsx`
- `SentenceCompletionItem.tsx`
- `SummaryCompletionItem.tsx`
- `ShortAnswerItem.tsx`
- `WritingTask1Item.tsx` — TipTap editor
- `WritingTask2Item.tsx`
- `SpeakingPart1Item.tsx` — MediaRecorder
- `SpeakingPart2Item.tsx` — cue card + 1min prep + 2min speak
- `SpeakingPart3Item.tsx`

Each renders item payload + collects `AnswerInput`.

## Timer
```tsx
// features/exam-runner/timer.tsx
function SectionTimer({ startedAt, limitSeconds }) {
  const [remaining, setRemaining] = useState(limitSeconds);
  useEffect(() => {
    const interval = setInterval(() => {
      const elapsed = Math.floor((Date.now() - startedAt) / 1000);
      const rem = limitSeconds - elapsed;
      setRemaining(rem);
      if (rem <= 0) finishSection();
    }, 1000);
    return () => clearInterval(interval);
  }, []);
  return <Badge variant={remaining < 60 ? "destructive" : "default"}>
    {formatTime(remaining)}
  </Badge>;
}
```

## Crash recovery
```tsx
// On mount
useEffect(() => {
  const stored = sessionStorage.getItem(`exam:${attemptId}`);
  if (stored) {
    hydrateFromStorage(JSON.parse(stored));
  } else {
    // Fetch from server
    fetchAttempt(attemptId).then(hydrateFromServer);
  }
}, [attemptId]);

// Persist
useExamStore.subscribe(state => {
  sessionStorage.setItem(`exam:${attemptId}`, JSON.stringify(state));
});
```

## Anti-cheat hooks
- `document.visibilitychange` → log focus loss to backend (telemetry only, doesn't pause timer)
- `beforeunload` event → confirm dialog
- Writing: TipTap `handlePaste` blocked, `onBlur`/`onFocus` logged
- DevTools detection: out of scope (best-effort cheating mitigation; thesis focuses on AI scoring quality, not anti-cheat)

## Submit pattern
```ts
async function submitAnswer(input: AnswerInput) {
  const response = await api.submitResponse({
    attemptId, itemId: currentItem.id, ...input,
    idempotencyKey: ulid()  // prevent double-submit
  });
  if (response.graded_synchronously) {
    updateTheta(response.theta_estimate);
  }
  if (response.next_item) {
    setCurrentItem(response.next_item);
  } else {
    setSectionComplete();
  }
}
```

## Acceptance
- [ ] Reload mid-section preserves progress (sessionStorage)
- [ ] Timer counts down accurately (drift < 1s over 30 min)
- [ ] All 13 item types render and accept input
- [ ] Submit is idempotent (retry safe)
- [ ] Section auto-finishes at 0 remaining
- [ ] No double-play of listening audio
