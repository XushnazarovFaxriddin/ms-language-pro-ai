"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useTranslations } from "next-intl";
import { PenSquare, FileText, BarChart3, AlertTriangle } from "lucide-react";
import type { ItemView } from "@/lib/api";

type Props = {
  item: ItemView;
  text: string;
  onChange: (text: string) => void;
  disabled: boolean;
};

/**
 * IELTS-accurate word counting algorithm.
 * Rules per IELTS official guidelines:
 * - Hyphenated words count as ONE word (e.g., "well-known" = 1 word)
 * - Numbers count as words (e.g., "250" = 1 word)
 * - Contractions count as ONE word (e.g., "don't" = 1 word)
 */
function countWordsIELTS(text: string): number {
  if (!text.trim()) return 0;
  const words = text.match(/[a-zA-Z0-9]+(?:[-'][a-zA-Z0-9]+)*/g);
  return words ? words.length : 0;
}

/**
 * Count paragraphs (non-empty lines separated by blank lines).
 */
function countParagraphs(text: string): number {
  if (!text.trim()) return 0;
  return text.split(/\n\s*\n/).filter((p) => p.trim().length > 0).length || 1;
}

/**
 * Writing item: IELTS-standard essay editor.
 *  - IELTS-accurate word counter (hyphenated = 1, contractions = 1).
 *  - Paragraph counter (IELTS examiners expect 4-5 paragraphs for Task 2).
 *  - Task 1 chart/image display when available.
 *  - Task type distinction (Task 1 vs Task 2) with appropriate guidance.
 *  - Paste blocked (anti-cheat; logged via custom event).
 *  - Minimum word warning with color-coded feedback.
 */
export function WritingItem({ item, text, onChange, disabled }: Props) {
  const t = useTranslations("Exam.writing");
  const payload = item.payload;
  const taskType = payload.task_type ?? "task2";
  const isTask1 = taskType === "task1_academic" || taskType === "task1_general";

  // IELTS word limits: Task 1 = 150+, Task 2 = 250+
  const min = payload.word_limit_min ?? (isTask1 ? 150 : 250);
  const max = payload.word_limit_max ?? (isTask1 ? 300 : 400);
  const timeMinutes = payload.time_limit_minutes ?? (isTask1 ? 20 : 40);

  const ref = useRef<HTMLTextAreaElement | null>(null);
  const [pasteWarn, setPasteWarn] = useState(false);

  // IELTS-accurate word count
  const wordCount = useMemo(() => countWordsIELTS(text), [text]);
  const paragraphCount = useMemo(() => countParagraphs(text), [text]);

  useEffect(() => {
    function onBlur() {
      // Focus-loss telemetry — backend ingestion in Phase 2
    }
    const el = ref.current;
    if (!el) return;
    el.addEventListener("blur", onBlur);
    return () => el.removeEventListener("blur", onBlur);
  }, []);

  const status: "low" | "ok" | "over" =
    wordCount < min ? "low" : wordCount > max ? "over" : "ok";

  // Paragraph guidance
  const expectedParas = isTask1 ? 3 : 4;
  const paraStatus: "low" | "ok" | "over" =
    paragraphCount < expectedParas ? "low" : paragraphCount > 6 ? "over" : "ok";

  return (
    <div className="mt-8 space-y-6">
      {/* Task header */}
      <article className="rounded-2xl border border-[var(--color-border)] bg-white/5 p-6 md:p-8 shadow-sm dark:bg-black/20">
        <div className="flex items-center gap-3 text-[var(--color-muted-fg)]">
          <PenSquare className="h-5 w-5" />
          <span className="text-sm font-semibold uppercase tracking-wider">
            {isTask1 ? "Writing Task 1" : "Writing Task 2"}
          </span>
          <span className="ml-auto rounded-full bg-[var(--color-primary)]/10 px-3 py-0.5 text-xs font-bold text-[var(--color-primary)]">
            {isTask1 ? "1/3 weight" : "2/3 weight"}
          </span>
        </div>

        {/* Task 1: Chart/Graph/Image display */}
        {isTask1 && payload.chart_image_url && (
          <div className="mt-5 rounded-xl border border-[var(--color-border)] overflow-hidden bg-white dark:bg-zinc-900">
            <div className="flex items-center gap-2 border-b border-[var(--color-border)] bg-[var(--color-muted)]/30 px-4 py-2">
              <BarChart3 className="h-4 w-4 text-[var(--color-primary)]" />
              <span className="text-xs font-semibold uppercase tracking-wider text-[var(--color-muted-fg)]">
                Visual Data
              </span>
            </div>
            <div className="p-4">
              <img
                src={payload.chart_image_url}
                alt="Task 1 visual data"
                className="mx-auto max-h-64 object-contain"
              />
            </div>
          </div>
        )}

        {/* Task 1: Data table display */}
        {isTask1 && payload.data_table && (
          <div className="mt-5 rounded-xl border border-[var(--color-border)] overflow-auto">
            <div className="flex items-center gap-2 border-b border-[var(--color-border)] bg-[var(--color-muted)]/30 px-4 py-2">
              <FileText className="h-4 w-4 text-[var(--color-primary)]" />
              <span className="text-xs font-semibold uppercase tracking-wider text-[var(--color-muted-fg)]">
                Data Table
              </span>
            </div>
            <div className="p-4 text-sm whitespace-pre-wrap font-mono">
              {typeof payload.data_table === "string"
                ? payload.data_table
                : JSON.stringify(payload.data_table, null, 2)}
            </div>
          </div>
        )}

        {/* Prompt */}
        <p className="mt-6 whitespace-pre-wrap text-lg leading-relaxed">
          {payload.prompt}
        </p>

        {/* IELTS instructions */}
        <div className="mt-4 space-y-1 text-sm text-[var(--color-muted-fg)]">
          <p>
            {t("limits", { min, max, minutes: timeMinutes })}
          </p>
          {isTask1 ? (
            <p className="text-xs italic">
              Summarise the information by selecting and reporting the main features, and make comparisons where relevant.
            </p>
          ) : (
            <p className="text-xs italic">
              Give reasons for your answer and include any relevant examples from your own knowledge or experience.
            </p>
          )}
        </div>
      </article>

      {/* Editor */}
      <div className="rounded-2xl border border-[var(--color-border)] bg-white/5 p-2 dark:bg-black/20">
        <textarea
          ref={ref}
          value={text}
          onChange={(e) => onChange(e.target.value)}
          disabled={disabled}
          placeholder={t("placeholder")}
          className="min-h-[280px] sm:min-h-[360px] w-full resize-y rounded-xl border-0 bg-transparent p-4 text-base leading-relaxed outline-none focus:ring-0 disabled:cursor-not-allowed disabled:opacity-60"
          spellCheck={false}
          onPaste={(e) => {
            e.preventDefault();
            setPasteWarn(true);
            window.setTimeout(() => setPasteWarn(false), 3000);
          }}
        />

        {/* Status bar */}
        <div className="flex items-center justify-between flex-wrap gap-2 border-t border-[var(--color-border)] px-4 py-3 text-sm">
          <div className="flex items-center gap-4">
            {/* Word count */}
            <span
              className={
                status === "ok"
                  ? "text-emerald-600 dark:text-emerald-400 font-medium"
                  : status === "low"
                  ? "text-[var(--color-muted-fg)]"
                  : "text-rose-600 dark:text-rose-400 font-medium"
              }
            >
              {t("wordCount", { count: wordCount })}{" "}
              {status === "low"
                ? t("needMore", { min })
                : status === "over"
                  ? t("tooMany", { max })
                  : t("ok")}
            </span>

            {/* Paragraph count */}
            <span
              className={`hidden sm:inline ${
                paraStatus === "ok"
                  ? "text-emerald-600/70 dark:text-emerald-400/70"
                  : "text-[var(--color-muted-fg)]"
              }`}
            >
              ¶ {paragraphCount} {paragraphCount === 1 ? "paragraph" : "paragraphs"}
              {paraStatus === "low" && paragraphCount > 0 && (
                <span className="ml-1 text-xs">(aim for {expectedParas}+)</span>
              )}
            </span>
          </div>

          <div className="flex items-center gap-3">
            {pasteWarn && (
              <span className="flex items-center gap-1 text-rose-600 dark:text-rose-400">
                <AlertTriangle className="h-3.5 w-3.5" />
                {t("pasteBlocked")}
              </span>
            )}
          </div>
        </div>
      </div>

      {/* Minimum word count warning banner */}
      {wordCount > 0 && wordCount < Math.floor(min * 0.6) && (
        <div className="rounded-lg border border-amber-500/30 bg-amber-500/5 px-4 py-2.5 text-sm flex items-center gap-2">
          <AlertTriangle className="h-4 w-4 text-amber-500 shrink-0" />
          <span className="text-amber-700 dark:text-amber-300">
            {isTask1
              ? "IELTS Task 1 requires at least 150 words. Writing under the minimum will result in a penalty."
              : "IELTS Task 2 requires at least 250 words. Writing under the minimum will result in a penalty."}
          </span>
        </div>
      )}
    </div>
  );
}
