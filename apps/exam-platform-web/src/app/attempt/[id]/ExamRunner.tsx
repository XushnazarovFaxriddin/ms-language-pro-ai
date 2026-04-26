"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { ApiError, api, type AttemptOut, type ItemView } from "@/lib/api";

type Result = {
  itemId: string;
  isCorrect: boolean | null;
  thetaAfter: number | null;
};

export function ExamRunner({
  attemptId,
  initialAttempt,
}: {
  attemptId: string;
  initialAttempt: AttemptOut;
}) {
  const router = useRouter();
  const section = initialAttempt.blueprint_snapshot.sections[0];
  const totalItems = section?.item_count ?? 5;
  const sectionTimeLimit = section?.time_limit_seconds ?? 600;

  const [item, setItem] = useState<ItemView | null>(null);
  const [loading, setLoading] = useState(true);
  const [choice, setChoice] = useState<string | null>(null);
  const [results, setResults] = useState<Result[]>([]);
  const [theta, setTheta] = useState<number>(initialAttempt.theta_estimates[section?.skill ?? "reading"] ?? 0);
  const [startTime, setStartTime] = useState<number>(Date.now());
  const [sectionStartedAt] = useState<number>(Date.now());
  const [sectionRemaining, setSectionRemaining] = useState<number>(sectionTimeLimit);
  const [feedback, setFeedback] = useState<{ ok: boolean; msg: string } | null>(null);
  const [done, setDone] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Load first item
  useEffect(() => {
    let cancelled = false;
    async function bootstrap() {
      try {
        // We piggy-back on submitResponse(...) returning next_item, but for the very
        // first item we hit an internal "get next" endpoint. MVP: use an empty submit?
        // Simpler: if attempt has been started, the SSR didn't pass current_item.
        // So we restart by calling /attempts (start) — but that creates new. Instead,
        // call the data-engine via exam API by submitting nothing.
        //
        // For now: fall back to calling startAttempt again is destructive. The cleanest
        // path is to add /attempts/{id}/next-item. Until then, fetch via a minimal
        // helper using attempt_complete=false signal.
        //
        // Pragmatic: if the user just landed here, we kick off by submitting a
        // sentinel — but that's wrong. Instead we expose `current_item` via initialAttempt
        // (server enriched). For the MVP, attempt_id was created in /exams flow
        // which already gave us current_item; we cache it in sessionStorage.
        const cached = typeof window !== "undefined" ? sessionStorage.getItem(`first-item:${attemptId}`) : null;
        if (cached) {
          if (!cancelled) {
            setItem(JSON.parse(cached));
            setLoading(false);
            setStartTime(Date.now());
          }
          return;
        }
        // Fallback: load via a probe submit (won't run in normal flow)
        if (!cancelled) {
          setError("Birinchi savol topilmadi. Iltimos, /exams sahifasiga qayting va imtihonni qaytadan boshlang.");
          setLoading(false);
        }
      } catch (e) {
        if (!cancelled) {
          setError(e instanceof ApiError ? e.detail : String(e));
          setLoading(false);
        }
      }
    }
    bootstrap();
    return () => {
      cancelled = true;
    };
  }, [attemptId]);

  // Timer
  useEffect(() => {
    const t = setInterval(() => {
      const elapsed = Math.floor((Date.now() - sectionStartedAt) / 1000);
      setSectionRemaining(Math.max(0, sectionTimeLimit - elapsed));
    }, 1000);
    return () => clearInterval(t);
  }, [sectionStartedAt, sectionTimeLimit]);

  const progress = useMemo(() => results.length / Math.max(1, totalItems), [results.length, totalItems]);

  async function submit() {
    if (!item || !choice) return;
    setFeedback(null);
    try {
      const r = await api.exam.submitResponse(attemptId, {
        item_id: item.id,
        type: item.type,
        mcq_choice_id: choice,
        time_ms: Date.now() - startTime,
      });
      setResults((prev) => [
        ...prev,
        { itemId: item.id, isCorrect: r.is_correct, thetaAfter: null },
      ]);
      setFeedback({
        ok: !!r.is_correct,
        msg: r.is_correct ? "✓ To'g'ri" : r.is_correct === false ? "✗ Noto'g'ri" : "Yuborildi",
      });
      // brief feedback flash, then advance
      setTimeout(() => {
        setFeedback(null);
        setChoice(null);
        if (r.next_item) {
          setItem(r.next_item);
          setStartTime(Date.now());
        } else if (r.attempt_complete) {
          setDone(true);
        } else {
          setItem(null);
          setError("Keyingi savol topilmadi.");
        }
      }, 800);
    } catch (e) {
      setError(e instanceof ApiError ? e.detail : String(e));
    }
  }

  if (loading) {
    return <main className="container mx-auto max-w-3xl px-6 py-12 text-center">Yuklanmoqda…</main>;
  }
  if (error && !item) {
    return (
      <main className="container mx-auto max-w-3xl px-6 py-12 text-center text-red-600">
        {error}
        <div className="mt-4">
          <button
            type="button"
            onClick={() => router.push("/exams")}
            className="rounded bg-[var(--color-primary)] px-4 py-2 text-sm text-[var(--color-primary-fg)]"
          >
            Imtihonlarga qaytish
          </button>
        </div>
      </main>
    );
  }
  if (done) {
    return (
      <main className="container mx-auto max-w-2xl px-6 py-16">
        <h1 className="text-3xl font-bold">Imtihon tugadi 🎉</h1>
        <p className="mt-3 text-[var(--color-muted-fg)]">
          {results.filter((r) => r.isCorrect).length} / {results.length} to&apos;g&apos;ri javob
        </p>
        <div className="mt-8 grid gap-2">
          {results.map((r, i) => (
            <div
              key={r.itemId}
              className={`flex items-center justify-between rounded border px-4 py-2 text-sm ${
                r.isCorrect
                  ? "border-green-500/40 bg-green-500/10"
                  : "border-red-500/40 bg-red-500/10"
              }`}
            >
              <span>Savol #{i + 1}</span>
              <span>{r.isCorrect ? "To'g'ri" : "Noto'g'ri"}</span>
            </div>
          ))}
        </div>
        <button
          type="button"
          onClick={() => router.push("/exams")}
          className="mt-8 rounded bg-[var(--color-primary)] px-4 py-2 text-sm text-[var(--color-primary-fg)]"
        >
          Yana imtihon
        </button>
      </main>
    );
  }
  if (!item) return null;

  const opts = item.payload.options ?? [];

  return (
    <main className="container mx-auto max-w-3xl px-6 py-8">
      {/* Status bar */}
      <div className="mb-6 flex items-center justify-between text-sm">
        <span className="text-[var(--color-muted-fg)]">
          Savol {results.length + 1} / {totalItems} · Skill: {item.skill} · {item.cefr_level}
        </span>
        <span
          className={`rounded px-2 py-0.5 font-mono ${
            sectionRemaining < 60
              ? "bg-red-500/10 text-red-600"
              : "bg-[var(--color-muted)] text-[var(--color-fg)]"
          }`}
        >
          {fmtTime(sectionRemaining)}
        </span>
      </div>

      {/* Progress bar */}
      <div className="h-1 w-full overflow-hidden rounded bg-[var(--color-muted)]">
        <div
          className="h-full bg-[var(--color-primary)] transition-all"
          style={{ width: `${progress * 100}%` }}
        />
      </div>

      {/* Passage */}
      {item.payload.passage && (
        <article className="mt-8 rounded border border-[var(--color-border)] bg-[var(--color-muted)]/40 p-6 leading-relaxed">
          {item.payload.passage}
        </article>
      )}

      {/* Prompt */}
      <p className="mt-6 text-lg font-medium">{item.payload.prompt}</p>

      {/* Options */}
      <fieldset className="mt-4 grid gap-2">
        {opts.map((o) => (
          <label
            key={o.id}
            className={`flex cursor-pointer items-center gap-3 rounded border px-4 py-3 transition ${
              choice === o.id
                ? "border-[var(--color-primary)] bg-[var(--color-primary)]/10"
                : "border-[var(--color-border)] hover:border-[var(--color-primary)]/60"
            }`}
          >
            <input
              type="radio"
              name="mcq"
              value={o.id}
              checked={choice === o.id}
              onChange={() => setChoice(o.id)}
              className="h-4 w-4"
            />
            <span className="font-medium">{o.id}.</span>
            <span>{o.label}</span>
          </label>
        ))}
      </fieldset>

      {/* Submit / feedback */}
      <div className="mt-6 flex items-center gap-4">
        <button
          type="button"
          disabled={!choice || feedback !== null}
          onClick={submit}
          className="rounded bg-[var(--color-primary)] px-4 py-2 text-sm font-medium text-[var(--color-primary-fg)] disabled:opacity-50"
        >
          Yuborish
        </button>
        {feedback && (
          <span
            className={feedback.ok ? "text-green-600" : "text-red-600"}
          >
            {feedback.msg}
          </span>
        )}
        {error && <span className="text-red-600">{error}</span>}
      </div>

      {/* Theta debug (only visible in dev) */}
      {process.env.NODE_ENV !== "production" && (
        <p className="mt-8 text-xs text-[var(--color-muted-fg)]">
          θ ({item.skill}) ≈ {theta.toFixed(2)}
        </p>
      )}
    </main>
  );
}

function fmtTime(s: number): string {
  const m = Math.floor(s / 60);
  const sec = s % 60;
  return `${String(m).padStart(2, "0")}:${String(sec).padStart(2, "0")}`;
}
