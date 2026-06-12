"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "@/i18n/routing";
import { useTranslations, useLocale } from "next-intl";
import { motion, AnimatePresence } from "framer-motion";
import { Clock, CheckCircle2, XCircle, SkipForward, AlertTriangle, Save, Loader2 } from "lucide-react";
import { ApiError, api, type AttemptOut, type ItemView, type SubmitResponseIn } from "@/lib/api";
import { createAntiCheatTracker } from "@/lib/anti-cheat";
import { proactiveRefresh } from "@/lib/token-refresh";
import { MCQItem } from "./items/MCQItem";
import { TrueFalseNGItem } from "./items/TrueFalseNGItem";
import { CompletionItem } from "./items/CompletionItem";
import { MatchingItem } from "./items/MatchingItem";
import { ListeningItem } from "./items/ListeningItem";
import { WritingItem } from "./items/WritingItem";
import { SpeakingItem } from "./items/SpeakingItem";
import { SectionTransition } from "./items/SectionTransition";
import { QuestionNav } from "./items/QuestionNav";
import { ExamToolbar, fontSizeClass, type FontSize } from "./items/ExamToolbar";

type Skill = "listening" | "reading" | "writing" | "speaking";

type Section = {
  skill: Skill;
  name_uz?: string;
  name_en?: string;
  item_count?: number;
  time_limit_seconds: number;
  stop_rule?: { type?: string; max_items?: number };
};

function isSkill(v: string | undefined | null): v is Skill {
  return v === "listening" || v === "reading" || v === "writing" || v === "speaking";
}

// ── Timer persistence helpers ──
function timerKey(attemptId: string, sectionIndex: number) {
  return `exam_timer_${attemptId}_${sectionIndex}`;
}
function saveTimerStart(attemptId: string, sectionIndex: number, startedAt: number) {
  try {
    localStorage.setItem(timerKey(attemptId, sectionIndex), String(startedAt));
  } catch { /* SSR or quota */ }
}
function loadTimerStart(attemptId: string, sectionIndex: number): number | null {
  try {
    const v = localStorage.getItem(timerKey(attemptId, sectionIndex));
    return v ? Number(v) : null;
  } catch {
    return null;
  }
}
function clearTimerStart(attemptId: string, sectionIndex: number) {
  try {
    localStorage.removeItem(timerKey(attemptId, sectionIndex));
  } catch { /* ignore */ }
}

export function ExamRunner({
  attemptId,
  initialAttempt,
}: {
  attemptId: string;
  initialAttempt: AttemptOut;
}) {
  const router = useRouter();
  const t = useTranslations("Exam");
  const tSkill = useTranslations("Exam.skills");
  const locale = useLocale();

  // Redirect if attempt is already completed
  useEffect(() => {
    if (initialAttempt.state === "completed") {
      router.replace(`/results/${attemptId}`);
    }
  }, [initialAttempt.state, attemptId, router]);

  const sections = (initialAttempt.blueprint_snapshot.sections ?? []) as Section[];

  // Section + item state
  const [sectionIndex, setSectionIndex] = useState<number>(initialAttempt.current_section_index);
  const currentSection: Section | undefined = sections[sectionIndex];
  const totalItemsInSection = currentSection?.stop_rule?.max_items ?? currentSection?.item_count ?? 5;
  const sectionTimeLimit = currentSection?.time_limit_seconds ?? 600;

  const [item, setItem] = useState<ItemView | null>(initialAttempt.current_item);
  const [loading, setLoading] = useState<boolean>(initialAttempt.current_item === null);
  const [error, setError] = useState<string | null>(null);

  // Per-skill answer state
  const [mcqChoice, setMcqChoice] = useState<string | null>(null);
  const [writingText, setWritingText] = useState<string>("");
  const [audioBase64, setAudioBase64] = useState<string | null>(null);
  const [audioFormat, setAudioFormat] = useState<string>("webm");
  const [audioDurationMs, setAudioDurationMs] = useState<number>(0);
  const [completionText, setCompletionText] = useState<string>("");
  const [matchingAnswer, setMatchingAnswer] = useState<string>("");

  // Progress tracking (per current section)
  const [itemsAnsweredInSection, setItemsAnsweredInSection] = useState<number>(0);
  const [feedback, setFeedback] = useState<{ ok: boolean | null; msg: string } | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [saved, setSaved] = useState(false); // Save indicator

  // Navigation bar state
  const [answeredSet, setAnsweredSet] = useState<Set<number>>(new Set());
  const [flaggedSet, setFlaggedSet] = useState<Set<number>>(new Set());
  const handleFlag = useCallback((idx: number) => {
    setFlaggedSet((prev) => {
      const next = new Set(prev);
      if (next.has(idx)) next.delete(idx);
      else next.add(idx);
      return next;
    });
  }, []);

  // Exam toolbar state
  const [fontSize, setFontSize] = useState<FontSize>("base");
  const [highlightMode, setHighlightMode] = useState(false);

  // Section transition gating
  const [showSectionIntro, setShowSectionIntro] = useState<boolean>(true);
  const [previousSkill, setPreviousSkill] = useState<Skill | null>(null);

  // Time's up modal
  const [showTimeUpModal, setShowTimeUpModal] = useState(false);
  const timeUpHandledRef = useRef(false);

  // Timer — persisted across reloads
  const [sectionStartedAt, setSectionStartedAt] = useState<number>(() => {
    const saved = loadTimerStart(attemptId, initialAttempt.current_section_index);
    return saved ?? Date.now();
  });
  const [sectionRemaining, setSectionRemaining] = useState<number>(sectionTimeLimit);
  const [itemStartTime, setItemStartTime] = useState<number>(Date.now());

  // Timer tick
  useEffect(() => {
    if (showSectionIntro || showTimeUpModal) return;
    const id = window.setInterval(() => {
      const elapsed = Math.floor((Date.now() - sectionStartedAt) / 1000);
      const remaining = Math.max(0, sectionTimeLimit - elapsed);
      setSectionRemaining(remaining);
    }, 1000);
    return () => window.clearInterval(id);
  }, [sectionStartedAt, sectionTimeLimit, showSectionIntro, showTimeUpModal]);

  // ── CRITICAL: Auto-submit when time expires (real IELTS behavior) ──
  useEffect(() => {
    if (sectionRemaining > 0 || showSectionIntro || showTimeUpModal || timeUpHandledRef.current) return;
    timeUpHandledRef.current = true;
    handleTimeExpiry();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sectionRemaining, showSectionIntro, showTimeUpModal]);

  const handleTimeExpiry = useCallback(async () => {
    setShowTimeUpModal(true);

    // Auto-submit current answer if any content exists
    const body = buildBody();
    if (body && item && !submitting) {
      try {
        setSubmitting(true);
        const r = await api.exam.submitResponse(attemptId, body);
        if (r.attempt_complete) {
          setTimeout(() => router.replace(`/results/${attemptId}`), 2000);
          return;
        }
        if (r.section_complete && r.next_item) {
          setTimeout(() => {
            setShowTimeUpModal(false);
            timeUpHandledRef.current = false;
            clearTimerStart(attemptId, sectionIndex);
            setPreviousSkill(item.skill as Skill);
            setSectionIndex(r.next_section_index ?? sectionIndex + 1);
            setItemsAnsweredInSection(0);
            setItem(r.next_item);
            setShowSectionIntro(true);
          }, 2500);
          return;
        }
      } catch {
        // Ignore submit errors on timeout
      } finally {
        setSubmitting(false);
      }
    }

    // No answer or can't submit: auto-advance after delay
    setTimeout(() => {
      setShowTimeUpModal(false);
      timeUpHandledRef.current = false;
      clearTimerStart(attemptId, sectionIndex);
      // Move to next section
      const nextSectionIdx = sectionIndex + 1;
      if (nextSectionIdx >= sections.length) {
        router.replace(`/results/${attemptId}`);
        return;
      }
      setPreviousSkill(currentSection?.skill as Skill);
      setSectionIndex(nextSectionIdx);
      setItemsAnsweredInSection(0);
      setAnsweredSet(new Set());
      setFlaggedSet(new Set());
      setShowSectionIntro(true);
      // Fetch next item
      api.exam.getNextItem(attemptId).then((nx) => {
        if (nx.current_item) {
          setItem(nx.current_item);
        } else {
          router.replace(`/results/${attemptId}`);
        }
      }).catch(() => router.replace(`/results/${attemptId}`));
    }, 2500);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [item, submitting, attemptId, sectionIndex, sections.length, currentSection, router]);

  // Bootstrap: if we don't yet have an item (e.g. user reloaded mid-section), fetch it.
  useEffect(() => {
    let cancelled = false;
    async function bootstrap() {
      if (item) return;
      try {
        const next = await api.exam.getNextItem(attemptId);
        if (cancelled) return;
        setSectionIndex(next.current_section_index);
        setItem(next.current_item);
        setLoading(false);
        setItemStartTime(Date.now());
      } catch (e) {
        if (!cancelled) {
          setError(e instanceof ApiError ? e.detail : String(e));
          setLoading(false);
        }
      }
    }
    void bootstrap();
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [attemptId]);

  // Reset per-item state when a new item arrives
  useEffect(() => {
    setMcqChoice(null);
    setWritingText("");
    setAudioBase64(null);
    setAudioFormat("webm");
    setAudioDurationMs(0);
    setCompletionText("");
    setMatchingAnswer("");
    setFeedback(null);
    setSaved(false);
    setItemStartTime(Date.now());
  }, [item?.id]);

  // Anti-cheat tracker — registers DOM listeners for focus loss / paste / etc
  // and batches events to /v1/anti-cheat/events. Lives for the duration of the
  // attempt (i.e. as long as ExamRunner is mounted).
  useEffect(() => {
    if (!attemptId) return;
    const tracker = createAntiCheatTracker(attemptId);
    tracker.start();
    return () => {
      tracker.stop();
    };
  }, [attemptId]);

  // ── beforeunload: warn user before leaving mid-exam ──
  useEffect(() => {
    function handler(e: BeforeUnloadEvent) {
      e.preventDefault();
    }
    window.addEventListener("beforeunload", handler);
    return () => window.removeEventListener("beforeunload", handler);
  }, []);

  // ── Proactive token refresh: prevent JWT expiry mid-exam ──
  // IELTS exams last 2-3 hours; typical access tokens expire in 15-30 min.
  // We silently refresh every 10 minutes to keep the session alive.
  useEffect(() => {
    const cleanup = proactiveRefresh(10 * 60 * 1000); // every 10 min
    return cleanup;
  }, []);

  // ── Keyboard shortcuts for MCQ (1-4 / A-D) ──
  useEffect(() => {
    if (!item || submitting || showSectionIntro || showTimeUpModal) return;
    const opts = item.payload.options;
    if (!opts || opts.length === 0) return;
    function onKeyDown(e: KeyboardEvent) {
      if (!opts) return;
      const key = e.key.toLowerCase();
      // Number keys: 1-9
      const numIdx = parseInt(key) - 1;
      if (numIdx >= 0 && numIdx < opts.length) {
        setMcqChoice(opts[numIdx]!.id);
        return;
      }
      // Letter keys: a-z
      const letterIdx = key.charCodeAt(0) - 97; // 'a' = 0
      if (letterIdx >= 0 && letterIdx < opts.length && key.length === 1) {
        setMcqChoice(opts[letterIdx]!.id);
        return;
      }
      // Enter to submit
      if (e.key === "Enter" && mcqChoice !== null && !submitting) {
        e.preventDefault();
        void submit();
      }
    }
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [item?.id, item?.payload.options, submitting, showSectionIntro, showTimeUpModal, mcqChoice]);

  const progress = useMemo(
    () => itemsAnsweredInSection / Math.max(1, totalItemsInSection),
    [itemsAnsweredInSection, totalItemsInSection],
  );

  function buildBody(): SubmitResponseIn | null {
    if (!item) return null;
    const time_ms = Date.now() - itemStartTime;
    if (item.skill === "writing") {
      return { item_id: item.id, type: item.type, text_answer: writingText.trim(), time_ms };
    }
    if (item.skill === "speaking") {
      return audioBase64
        ? {
            item_id: item.id,
            type: item.type,
            audio_base64: audioBase64,
            audio_format: audioFormat,
            time_ms: audioDurationMs || time_ms,
          }
        : null;
    }
    // True/False/Not Given & Yes/No/Not Given
    if (item.type === "true_false_ng" || item.type === "yes_no_ng") {
      if (!mcqChoice) return null;
      return { item_id: item.id, type: item.type, mcq_choice_id: mcqChoice, time_ms };
    }
    // Completion types (sentence, summary, note, table, short answer)
    const completionTypes = ["sentence_completion", "summary_completion", "note_completion", "table_completion", "short_answer"];
    if (completionTypes.includes(item.type)) {
      if (!completionText.trim()) return null;
      return { item_id: item.id, type: item.type, text_answer: completionText.trim(), time_ms };
    }
    // Matching types
    const matchingTypes = ["matching_headings", "matching_features", "matching_information", "matching_sentence_endings"];
    if (matchingTypes.includes(item.type)) {
      if (!matchingAnswer) return null;
      return { item_id: item.id, type: item.type, mcq_choice_id: matchingAnswer, time_ms };
    }
    // listening + reading → MCQ
    if (!mcqChoice) return null;
    return { item_id: item.id, type: item.type, mcq_choice_id: mcqChoice, time_ms };
  }

  const submitDisabled = useMemo(() => {
    if (!item || submitting) return true;
    if (item.skill === "writing") return writingText.trim().length === 0;
    if (item.skill === "speaking") return audioBase64 === null;
    if (item.type === "true_false_ng" || item.type === "yes_no_ng") return mcqChoice === null;
    const completionTypes = ["sentence_completion", "summary_completion", "note_completion", "table_completion", "short_answer"];
    if (completionTypes.includes(item.type)) return completionText.trim().length === 0;
    const matchingTypes = ["matching_headings", "matching_features", "matching_information", "matching_sentence_endings"];
    if (matchingTypes.includes(item.type)) return matchingAnswer.length === 0;
    return mcqChoice === null;
  }, [item, submitting, writingText, audioBase64, mcqChoice, completionText, matchingAnswer]);

  // Can this item be skipped? (subjective items like writing/speaking)
  const canSkip = item && (item.skill === "writing" || item.skill === "speaking");

  async function submit() {
    const body = buildBody();
    if (!body || !item) return;
    setSubmitting(true);
    setError(null);
    try {
      const r = await api.exam.submitResponse(attemptId, body);
      const wasObjective = r.graded_synchronously && r.is_correct !== null;
      setItemsAnsweredInSection((n) => n + 1);
      setAnsweredSet((prev) => new Set(prev).add(itemsAnsweredInSection));

      // Show save indicator
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);

      setFeedback({
        ok: wasObjective ? r.is_correct : null,
        msg: wasObjective
          ? r.is_correct
            ? t("correct")
            : t("incorrect")
          : t("submitted"),
      });

      window.setTimeout(() => {
        setFeedback(null);
        if (r.attempt_complete) {
          clearTimerStart(attemptId, sectionIndex);
          router.replace(`/results/${attemptId}`);
          return;
        }
        if (r.section_complete && r.next_item) {
          // Show transition screen for the next section
          clearTimerStart(attemptId, sectionIndex);
          setPreviousSkill(item.skill as Skill);
          setSectionIndex(r.next_section_index ?? sectionIndex + 1);
          setItemsAnsweredInSection(0);
          setAnsweredSet(new Set());
          setFlaggedSet(new Set());
          setItem(r.next_item);
          setShowSectionIntro(true);
          return;
        }
        if (r.next_item) {
          setItem(r.next_item);
          return;
        }
        // No next item but not complete? Fetch one.
        api.exam
          .getNextItem(attemptId)
          .then((nx) => {
            if (nx.current_item) {
              setSectionIndex(nx.current_section_index);
              setItem(nx.current_item);
            } else {
              router.replace(`/results/${attemptId}`);
            }
          })
          .catch((e) => setError(e instanceof ApiError ? e.detail : String(e)));
      }, 700);
    } catch (e) {
      if (e instanceof ApiError && (e.status === 401 || e.status === 403)) {
        setError("Session expired. Your answers have been saved. Please refresh the page and log in again to continue.");
      } else if (e instanceof ApiError && e.status === 429) {
        setError("Too many requests. Please wait a moment and try again.");
      } else {
        setError(e instanceof ApiError ? e.detail : String(e));
      }
    } finally {
      setSubmitting(false);
    }
  }

  async function skipItem() {
    if (!item || submitting) return;
    setSubmitting(true);
    setError(null);
    try {
      // Submit empty answer for subjective items
      const time_ms = Date.now() - itemStartTime;
      const body: SubmitResponseIn = {
        item_id: item.id,
        type: item.type,
        text_answer: (item.skill === "writing" || item.skill === "speaking") ? "" : undefined,
        time_ms,
      };
      const r = await api.exam.submitResponse(attemptId, body);
      setItemsAnsweredInSection((n) => n + 1);
      setFeedback({ ok: null, msg: t("skipped") });
      window.setTimeout(() => {
        setFeedback(null);
        if (r.attempt_complete) {
          clearTimerStart(attemptId, sectionIndex);
          router.replace(`/results/${attemptId}`);
          return;
        }
        if (r.section_complete && r.next_item) {
          clearTimerStart(attemptId, sectionIndex);
          setPreviousSkill(item.skill as Skill);
          setSectionIndex(r.next_section_index ?? sectionIndex + 1);
          setItemsAnsweredInSection(0);
          setAnsweredSet(new Set());
          setFlaggedSet(new Set());
          setItem(r.next_item);
          setShowSectionIntro(true);
          return;
        }
        if (r.next_item) {
          setItem(r.next_item);
        }
      }, 500);
    } catch (e) {
      setError(e instanceof ApiError ? e.detail : String(e));
    } finally {
      setSubmitting(false);
    }
  }

  // ── Render ──

  if (loading) {
    return (
      <main className="container mx-auto max-w-3xl px-6 py-12" role="status" aria-label={t("loading")}>
        {/* Skeleton: Status bar */}
        <div className="mb-6 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="h-7 w-24 animate-pulse rounded-full bg-[var(--color-muted)]/20" />
            <div className="h-5 w-16 animate-pulse rounded bg-[var(--color-muted)]/15" />
          </div>
          <div className="h-7 w-16 animate-pulse rounded-full bg-[var(--color-muted)]/20" />
        </div>
        {/* Skeleton: Progress bar */}
        <div className="h-1.5 w-full animate-pulse rounded-full bg-[var(--color-muted)]/20 mb-8" />
        {/* Skeleton: Question passage */}
        <div className="rounded-2xl border border-[var(--color-border)]/30 p-6 space-y-3 mb-6">
          <div className="h-4 w-3/4 animate-pulse rounded bg-[var(--color-muted)]/15" />
          <div className="h-4 w-full animate-pulse rounded bg-[var(--color-muted)]/15" />
          <div className="h-4 w-5/6 animate-pulse rounded bg-[var(--color-muted)]/15" />
          <div className="h-4 w-2/3 animate-pulse rounded bg-[var(--color-muted)]/15" />
        </div>
        {/* Skeleton: Answer options */}
        <div className="space-y-3">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="h-14 w-full animate-pulse rounded-xl border border-[var(--color-border)]/20 bg-[var(--color-muted)]/10" />
          ))}
        </div>
        {/* Skeleton: Submit button */}
        <div className="mt-10 pt-6 border-t border-[var(--color-border)]/20">
          <div className="h-11 w-32 animate-pulse rounded-full bg-[var(--color-muted)]/20" />
        </div>
        <span className="sr-only">{t("loading")}</span>
      </main>
    );
  }
  if (error && !item) {
    return (
      <main className="container mx-auto max-w-3xl px-6 py-12 text-center">
        <div className="rounded-2xl border border-red-500/20 bg-red-500/5 p-8">
          <AlertTriangle className="mx-auto h-10 w-10 text-red-500 mb-4" />
          <p className="text-red-600 font-medium mb-4">{error}</p>
          <button
            type="button"
            onClick={() => router.push("/exams")}
            className="rounded-full bg-[var(--color-primary)] px-6 py-2.5 text-sm font-semibold text-[var(--color-primary-fg)] shadow-sm transition-all hover:opacity-90"
          >
            {t("backToExams")}
          </button>
        </div>
      </main>
    );
  }
  if (!item || !currentSection) return null;

  // ── Time's Up Modal ──
  if (showTimeUpModal) {
    return (
      <main className="container mx-auto max-w-3xl px-6 py-20 text-center">
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          className="rounded-3xl border border-red-500/30 bg-gradient-to-br from-red-500/5 via-transparent to-orange-500/5 p-12 shadow-lg"
        >
          <div className="mx-auto mb-6 flex h-20 w-20 items-center justify-center rounded-full bg-red-500/10">
            <Clock className="h-10 w-10 text-red-500" />
          </div>
          <h1 className="text-3xl font-extrabold tracking-tight">{t("timeUp")}</h1>
          <p className="mt-3 text-lg text-[var(--color-muted-fg)]">{t("timeUpDesc")}</p>
          <div className="mt-6 inline-flex items-center gap-2">
            <div className="h-4 w-4 animate-spin rounded-full border-2 border-[var(--color-primary)] border-t-transparent" />
            <span className="text-sm font-medium text-[var(--color-muted-fg)]">{t("autoAdvancing")}</span>
          </div>
        </motion.div>
      </main>
    );
  }

  // Section transition intro screen
  if (showSectionIntro && isSkill(currentSection.skill)) {
    return (
      <SectionTransition
        fromSkill={previousSkill}
        toSkill={currentSection.skill}
        sectionIndex={sectionIndex}
        totalSections={sections.length}
        onContinue={() => {
          const now = Date.now();
          setShowSectionIntro(false);
          setSectionStartedAt(now);
          saveTimerStart(attemptId, sectionIndex, now);
          setSectionRemaining(sectionTimeLimit);
          setItemStartTime(now);
          timeUpHandledRef.current = false;
        }}
      />
    );
  }

  return (
    <main className="container mx-auto max-w-4xl px-4 py-8 pb-36 relative">
      {/* Decorative ambient glowing mesh */}
      <div className="absolute top-10 left-10 h-64 w-64 rounded-full bg-[var(--color-primary)]/5 blur-3xl pointer-events-none mesh-glow" />
      <div className="absolute bottom-40 right-10 h-64 w-64 rounded-full bg-violet-500/5 blur-3xl pointer-events-none mesh-glow" />

      {/* Premium Header Panel */}
      <div className="glass-panel p-5 rounded-3xl mb-8 shadow-sm flex flex-col gap-4 border border-[var(--color-border)]/40 relative z-10">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div className="flex flex-wrap items-center gap-2.5 text-xs font-semibold text-[var(--color-muted-fg)]">
            <span className="inline-flex items-center gap-1.5 rounded-xl bg-[var(--color-primary)]/10 px-3 py-1.5 text-[var(--color-primary)] font-bold">
              {(locale === "en" ? currentSection.name_en : currentSection.name_uz) ??
                tSkill(item.skill as "listening" | "reading" | "writing" | "speaking")}{" "}
              · {sectionIndex + 1}/{sections.length}
            </span>
            <span className="bg-[var(--color-muted)]/60 px-3 py-1.5 rounded-xl font-bold">
              {t("question")} {itemsAnsweredInSection + 1} / {totalItemsInSection}
            </span>
            <span className="bg-[var(--color-muted)]/60 px-3 py-1.5 rounded-xl font-bold font-mono">
              CEFR {item.cefr_level}
            </span>
            {/* Save indicator */}
            <AnimatePresence>
              {saved && (
                <motion.span
                  initial={{ opacity: 0, x: -5 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0 }}
                  className="flex items-center gap-1 text-emerald-600 dark:text-emerald-400 font-bold bg-emerald-500/10 px-3 py-1.5 rounded-xl"
                >
                  <Save className="h-3.5 w-3.5" />
                  {t("saved")}
                </motion.span>
              )}
            </AnimatePresence>
          </div>

          <div className="flex items-center gap-3">
            {/* Exam toolbar: font size + highlighter */}
            <ExamToolbar
              fontSize={fontSize}
              onFontSizeChange={setFontSize}
              highlightMode={highlightMode}
              onHighlightToggle={() => setHighlightMode((h) => !h)}
            />

            {/* Countdown timer */}
            <div
              className={`flex h-9 items-center gap-2 rounded-xl px-4.5 font-mono font-bold shadow-sm border text-xs tracking-wider transition-all duration-300 ${
                sectionRemaining < 60
                  ? "bg-red-500 border-red-500 text-white animate-pulse"
                  : sectionRemaining < 300
                  ? "bg-amber-500/10 border-amber-500/20 text-amber-600 dark:text-amber-400"
                  : "bg-white/10 border-[var(--color-border)] text-[var(--color-fg)]"
              }`}
            >
              <Clock className="h-4 w-4" />
              <span>{fmtTime(sectionRemaining)}</span>
            </div>
          </div>
        </div>

        {/* Progress bar inside header */}
        <div className="h-1.5 w-full overflow-hidden rounded-full bg-[var(--color-muted)]/50">
          <motion.div
            initial={{ width: 0 }}
            animate={{ width: `${progress * 100}%` }}
            className="h-full bg-gradient-to-r from-[var(--color-primary)] to-violet-500"
            layout
          />
        </div>
      </div>

      {/* Main active item container in a gorgeous glass panel */}
      <div className="glass-panel p-6 sm:p-8 rounded-[2.5rem] border border-[var(--color-border)]/40 shadow-xl relative z-10 bg-white/50 dark:bg-black/20">
        <AnimatePresence mode="wait">
          <motion.div
            key={item.id}
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -12 }}
            transition={{ duration: 0.3 }}
            className={`${fontSizeClass(fontSize)} ${highlightMode ? "cursor-crosshair [&_::selection]:bg-amber-300/60 dark:[&_::selection]:bg-amber-500/40" : ""}`}
          >
            {/* Reading / Listening item rendering — dispatch by item.type */}
            {(item.skill === "reading" || item.skill === "listening") && (() => {
              // True/False/Not Given or Yes/No/Not Given
              if (item.type === "true_false_ng" || item.type === "yes_no_ng") {
                return <TrueFalseNGItem item={item} choice={mcqChoice} onChange={setMcqChoice} disabled={submitting} />;
              }
              // Completion types
              const completionTypes = ["sentence_completion", "summary_completion", "note_completion", "table_completion", "short_answer"];
              if (completionTypes.includes(item.type)) {
                return <CompletionItem item={item} answer={completionText} onChange={setCompletionText} disabled={submitting} />;
              }
              // Matching types
              const matchingTypes = ["matching_headings", "matching_features", "matching_information", "matching_sentence_endings"];
              if (matchingTypes.includes(item.type)) {
                return <MatchingItem item={item} answer={matchingAnswer} onChange={setMatchingAnswer} disabled={submitting} />;
              }
              // Default: MCQ with listening audio support
              if (item.skill === "listening") {
                return <ListeningItem item={item} choice={mcqChoice} onChange={setMcqChoice} disabled={submitting} />;
              }
              return <MCQItem item={item} choice={mcqChoice} onChange={setMcqChoice} disabled={submitting} />;
            })()}
            {item.skill === "writing" && (
              <WritingItem item={item} text={writingText} onChange={setWritingText} disabled={submitting} />
            )}
            {item.skill === "speaking" && (
              <SpeakingItem
                item={item}
                audioReady={audioBase64 !== null}
                onAudioReady={(base64, ms, format) => {
                  setAudioBase64(base64);
                  setAudioFormat(format);
                  setAudioDurationMs(ms);
                }}
                disabled={submitting}
              />
            )}

            {/* Actions Bar */}
            <div className="mt-10 flex items-center gap-4 border-t border-[var(--color-border)]/40 pt-6 flex-wrap">
              <button
                id="exam-submit-btn"
                type="button"
                disabled={submitDisabled}
                onClick={submit}
                aria-busy={submitting}
                className="rounded-2xl bg-gradient-to-r from-[var(--color-primary)] to-violet-600 px-8 py-3.5 text-xs font-bold text-white shadow-md shadow-[var(--color-primary)]/10 transition-all duration-300 hover:shadow-lg hover:scale-[1.03] active:scale-[0.97] disabled:cursor-not-allowed disabled:opacity-50 cursor-pointer flex items-center justify-center gap-2"
              >
                {submitting && <Loader2 className="h-4 w-4 animate-spin" />}
                {submitting ? t("submitting") : t("submit")}
              </button>

              {/* Skip button for subjective items */}
              {canSkip && (
                <button
                  type="button"
                  disabled={submitting}
                  onClick={skipItem}
                  className="flex items-center gap-2 rounded-2xl border border-[var(--color-border)] bg-white/10 dark:bg-black/10 px-6 py-3.5 text-xs font-bold text-[var(--color-muted-fg)] transition-all duration-300 hover:bg-[var(--color-muted)]/20 hover:text-[var(--color-fg)] hover:scale-[1.03] active:scale-[0.97] disabled:opacity-50 cursor-pointer"
                >
                  <SkipForward className="h-4 w-4" />
                  {t("skip")}
                </button>
              )}

              {feedback && (
                <motion.div
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  className={`flex items-center gap-2 font-bold text-sm ${
                    feedback.ok === true
                      ? "text-green-600 dark:text-green-400"
                      : feedback.ok === false
                      ? "text-red-600 dark:text-red-400"
                      : "text-[var(--color-muted-fg)] bg-[var(--color-muted)]/40 px-4 py-2 rounded-xl border border-[var(--color-border)]/30"
                  }`}
                >
                  {feedback.ok === true && <CheckCircle2 className="h-5 w-5" />}
                  {feedback.ok === false && <XCircle className="h-5 w-5" />}
                  <span>{feedback.msg}</span>
                </motion.div>
              )}
              {error && <span className="text-red-500 font-bold text-xs bg-red-500/10 px-4 py-2 rounded-xl border border-red-500/20">{error}</span>}
            </div>
          </motion.div>
        </AnimatePresence>
      </div>

      {/* Bottom navigation bar — question numbers like real IELTS */}
      <QuestionNav
        currentIndex={itemsAnsweredInSection}
        totalItems={totalItemsInSection}
        answeredSet={answeredSet}
        flaggedSet={flaggedSet}
        onFlag={handleFlag}
        sectionLabel={`${(locale === "en" ? currentSection.name_en : currentSection.name_uz) ?? tSkill(item.skill as "listening" | "reading" | "writing" | "speaking")} · ${sectionIndex + 1}/${sections.length}`}
      />
    </main>
  );

}

function fmtTime(s: number): string {
  const m = Math.floor(s / 60);
  const sec = s % 60;
  return `${String(m).padStart(2, "0")}:${String(sec).padStart(2, "0")}`;
}
