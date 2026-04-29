"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "@/i18n/routing";
import { useTranslations } from "next-intl";
import { motion, AnimatePresence } from "framer-motion";
import { Clock, CheckCircle2, XCircle } from "lucide-react";
import { ApiError, api, type AttemptOut, type ItemView, type SubmitResponseIn } from "@/lib/api";
import { createAntiCheatTracker } from "@/lib/anti-cheat";
import { MCQItem } from "./items/MCQItem";
import { ListeningItem } from "./items/ListeningItem";
import { WritingItem } from "./items/WritingItem";
import { SpeakingItem } from "./items/SpeakingItem";
import { SectionTransition } from "./items/SectionTransition";

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

export function ExamRunner({
  attemptId,
  initialAttempt,
}: {
  attemptId: string;
  initialAttempt: AttemptOut;
}) {
  const router = useRouter();
  const t = useTranslations("Exam");

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

  // Progress tracking (per current section)
  const [itemsAnsweredInSection, setItemsAnsweredInSection] = useState<number>(0);
  const [feedback, setFeedback] = useState<{ ok: boolean | null; msg: string } | null>(null);
  const [submitting, setSubmitting] = useState(false);

  // Section transition gating
  const [showSectionIntro, setShowSectionIntro] = useState<boolean>(true);
  const [previousSkill, setPreviousSkill] = useState<Skill | null>(null);

  // Timer
  const [sectionStartedAt, setSectionStartedAt] = useState<number>(Date.now());
  const [sectionRemaining, setSectionRemaining] = useState<number>(sectionTimeLimit);
  const [itemStartTime, setItemStartTime] = useState<number>(Date.now());

  useEffect(() => {
    const id = window.setInterval(() => {
      const elapsed = Math.floor((Date.now() - sectionStartedAt) / 1000);
      setSectionRemaining(Math.max(0, sectionTimeLimit - elapsed));
    }, 1000);
    return () => window.clearInterval(id);
  }, [sectionStartedAt, sectionTimeLimit]);

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
    setFeedback(null);
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
    // listening + reading → MCQ
    if (!mcqChoice) return null;
    return { item_id: item.id, type: item.type, mcq_choice_id: mcqChoice, time_ms };
  }

  const submitDisabled = useMemo(() => {
    if (!item || submitting) return true;
    if (item.skill === "writing") {
      return writingText.trim().length === 0;
    }
    if (item.skill === "speaking") return audioBase64 === null;
    return mcqChoice === null;
  }, [item, submitting, writingText, audioBase64, mcqChoice]);

  async function submit() {
    const body = buildBody();
    if (!body || !item) return;
    setSubmitting(true);
    setError(null);
    try {
      const r = await api.exam.submitResponse(attemptId, body);
      const wasObjective = r.graded_synchronously && r.is_correct !== null;
      setItemsAnsweredInSection((n) => n + 1);
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
          router.replace(`/results/${attemptId}`);
          return;
        }
        if (r.section_complete && r.next_item) {
          // Show transition screen for the next section
          setPreviousSkill(item.skill as Skill);
          setSectionIndex(r.next_section_index ?? sectionIndex + 1);
          setItemsAnsweredInSection(0);
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
      setError(e instanceof ApiError ? e.detail : String(e));
    } finally {
      setSubmitting(false);
    }
  }

  // ── Render ──

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
  if (!item || !currentSection) return null;

  // Section transition intro screen
  if (showSectionIntro && isSkill(currentSection.skill)) {
    return (
      <SectionTransition
        fromSkill={previousSkill}
        toSkill={currentSection.skill}
        sectionIndex={sectionIndex}
        totalSections={sections.length}
        onContinue={() => {
          setShowSectionIntro(false);
          setSectionStartedAt(Date.now());
          setSectionRemaining(sectionTimeLimit);
          setItemStartTime(Date.now());
        }}
      />
    );
  }

  return (
    <main className="container mx-auto max-w-3xl px-6 py-8">
      {/* Status bar */}
      <div className="mb-6 flex items-center justify-between text-sm">
        <div className="flex flex-wrap items-center gap-2 text-[var(--color-muted-fg)] font-medium">
          <span className="rounded-full bg-[var(--color-primary)]/10 px-3 py-1 text-[var(--color-primary)]">
            {currentSection.name_uz ?? item.skill} · {sectionIndex + 1}/{sections.length}
          </span>
          <span>
            {t("question")} {itemsAnsweredInSection + 1} / {totalItemsInSection}
          </span>
          <span className="hidden sm:inline">· {item.cefr_level}</span>
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

      {/* Progress */}
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
          {item.skill === "reading" && (
            <MCQItem item={item} choice={mcqChoice} onChange={setMcqChoice} disabled={submitting} />
          )}
          {item.skill === "listening" && (
            <ListeningItem item={item} choice={mcqChoice} onChange={setMcqChoice} disabled={submitting} />
          )}
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

          <div className="mt-10 flex items-center gap-6 border-t border-[var(--color-border)] pt-6">
            <button
              type="button"
              disabled={submitDisabled}
              onClick={submit}
              className="rounded-full bg-[var(--color-primary)] px-8 py-3 text-sm font-semibold text-[var(--color-primary-fg)] shadow-sm transition-all hover:bg-[var(--color-primary)]/90 hover:shadow-md disabled:cursor-not-allowed disabled:opacity-50"
            >
              {submitting ? t("submitted") : t("submit")}
            </button>
            {feedback && (
              <motion.div
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                className={`flex items-center gap-2 font-medium ${
                  feedback.ok === true
                    ? "text-green-600"
                    : feedback.ok === false
                    ? "text-red-600"
                    : "text-[var(--color-muted-fg)]"
                }`}
              >
                {feedback.ok === true && <CheckCircle2 className="h-5 w-5" />}
                {feedback.ok === false && <XCircle className="h-5 w-5" />}
                {feedback.msg}
              </motion.div>
            )}
            {error && <span className="text-red-600 font-medium">{error}</span>}
          </div>
        </motion.div>
      </AnimatePresence>
    </main>
  );
}

function fmtTime(s: number): string {
  const m = Math.floor(s / 60);
  const sec = s % 60;
  return `${String(m).padStart(2, "0")}:${String(sec).padStart(2, "0")}`;
}
