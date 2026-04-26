"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "@/i18n/routing";
import { useTranslations } from "next-intl";
import { ApiError, api, type AttemptOut, type ItemView } from "@/lib/api";
import { motion, AnimatePresence } from "framer-motion";
import { Clock, CheckCircle2, XCircle } from "lucide-react";

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
  const t = useTranslations("Exam");
  
  // If attempt is already completed, redirect immediately
  useEffect(() => {
    if (initialAttempt.state === "completed") {
      router.replace(`/results/${attemptId}`);
    }
  }, [initialAttempt.state, attemptId, router]);

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

  // Load current item from the server snapshot; sessionStorage is only a fast path
  // for the first client-side navigation after starting an attempt.
  useEffect(() => {
    let cancelled = false;
    async function bootstrap() {
      try {
        const cached = typeof window !== "undefined" ? sessionStorage.getItem(`first-item:${attemptId}`) : null;
        const current = initialAttempt.current_item ?? (cached ? JSON.parse(cached) as ItemView : null);
        if (current) {
          if (!cancelled) {
            setItem(current);
            setLoading(false);
            setStartTime(Date.now());
          }
          return;
        }

        const next = await api.exam.getNextItem(attemptId);
        if (!cancelled) {
          setItem(next.current_item);
          if (!next.current_item) {
            setError("Keyingi savol topilmadi.");
          }
          setLoading(false);
          setStartTime(Date.now());
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
          sessionStorage.setItem(`first-item:${attemptId}`, JSON.stringify(r.next_item));
          setStartTime(Date.now());
        } else if (r.attempt_complete) {
          sessionStorage.removeItem(`first-item:${attemptId}`);
          router.replace(`/results/${attemptId}`);
        } else {
          sessionStorage.removeItem(`first-item:${attemptId}`);
          setItem(null);
          setError(t("errorNotFound"));
        }
      }, 800);
    } catch (e) {
      setError(e instanceof ApiError ? e.detail : String(e));
    }
  }

  if (loading) {
    return <main className="container mx-auto max-w-3xl px-6 py-12 text-center">{t("loading")}</main>;
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
            {t("backToExams")}
          </button>
        </div>
      </main>
    );
  }
  if (done) {
    // This is a fallback in case the redirect takes a moment
    return <main className="container mx-auto max-w-2xl px-6 py-16 text-center">{t("loading")}</main>;
  }
  if (!item) return null;

  const opts = item.payload.options ?? [];

  return (
    <main className="container mx-auto max-w-3xl px-6 py-8">
      {/* Status bar */}
      <div className="mb-6 flex items-center justify-between text-sm">
        <div className="flex items-center gap-2 text-[var(--color-muted-fg)] font-medium">
          <span className="rounded-full bg-[var(--color-primary)]/10 px-3 py-1 text-[var(--color-primary)]">
            {t("question")} {results.length + 1} / {totalItems}
          </span>
          <span className="hidden sm:inline">· {t("skill")}: {item.skill} · {item.cefr_level}</span>
        </div>
        <div
          className={`flex items-center gap-1.5 rounded-full px-3 py-1 font-mono font-medium shadow-sm ${
            sectionRemaining < 60
              ? "bg-red-500 text-white animate-pulse"
              : "bg-white text-black dark:bg-zinc-800 dark:text-white"
          }`}
        >
          <Clock className="h-4 w-4" />
          {fmtTime(sectionRemaining)}
        </div>
      </div>

      {/* Progress bar */}
      <div className="h-1.5 w-full overflow-hidden rounded-full bg-[var(--color-muted)]">
        <motion.div
          initial={{ width: 0 }}
          animate={{ width: `${progress * 100}%` }}
          className="h-full bg-[var(--color-primary)]"
          layout
        />
      </div>

      <AnimatePresence mode="wait">
        <motion.div
          key={item.id}
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -10 }}
          transition={{ duration: 0.3 }}
        >
          {/* Passage */}
          {item.payload.passage && (
            <article className="mt-8 rounded-2xl border border-[var(--color-border)] bg-white/5 p-6 md:p-8 shadow-sm backdrop-blur-md leading-relaxed dark:bg-black/20 text-lg">
              {item.payload.passage}
            </article>
          )}

          {/* Prompt */}
          <p className="mt-8 text-xl font-bold tracking-tight">{item.payload.prompt}</p>

          {/* Options */}
          <fieldset className="mt-6 grid gap-3">
            {opts.map((o) => (
              <label
                key={o.id}
                className={`group relative flex cursor-pointer items-center gap-4 rounded-xl border p-4 transition-all ${
                  choice === o.id
                    ? "border-[var(--color-primary)] bg-[var(--color-primary)]/5 shadow-[0_0_0_1px_var(--color-primary)]"
                    : "border-[var(--color-border)] bg-white/5 hover:border-[var(--color-primary)]/50 hover:bg-[var(--color-primary)]/5 dark:bg-black/10"
                }`}
              >
                <div className={`flex h-5 w-5 items-center justify-center rounded-full border ${
                  choice === o.id ? "border-[var(--color-primary)]" : "border-[var(--color-muted-fg)]"
                }`}>
                  {choice === o.id && <div className="h-2.5 w-2.5 rounded-full bg-[var(--color-primary)]" />}
                </div>
                <input
                  type="radio"
                  name="mcq"
                  value={o.id}
                  checked={choice === o.id}
                  onChange={() => setChoice(o.id)}
                  className="hidden"
                />
                <span className="font-semibold text-[var(--color-muted-fg)]">{o.id}.</span>
                <span className="text-lg">{o.label}</span>
              </label>
            ))}
          </fieldset>

          {/* Submit / feedback */}
          <div className="mt-10 flex items-center gap-6 border-t border-[var(--color-border)] pt-6">
            <button
              type="button"
              disabled={!choice || feedback !== null}
              onClick={submit}
              className="rounded-full bg-[var(--color-primary)] px-8 py-3 text-sm font-semibold text-[var(--color-primary-fg)] shadow-sm transition-all hover:bg-[var(--color-primary)]/90 hover:shadow-md disabled:opacity-50"
            >
              {t("submit")}
            </button>
            {feedback && (
              <motion.div
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                className={`flex items-center gap-2 font-medium ${
                  feedback.ok ? "text-green-600" : "text-red-600"
                }`}
              >
                {feedback.ok ? <CheckCircle2 className="h-5 w-5" /> : <XCircle className="h-5 w-5" />}
                {feedback.ok ? t("correct") : t("incorrect")}
              </motion.div>
            )}
            {error && <span className="text-red-600 font-medium">{error}</span>}
          </div>
        </motion.div>
      </AnimatePresence>

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
