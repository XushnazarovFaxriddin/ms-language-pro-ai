"use client";

import { useState } from "react";
import type { ItemView } from "@/lib/api";

type Props = {
  item: ItemView;
  answer: string;
  onChange: (text: string) => void;
  disabled?: boolean;
};

/**
 * Handles IELTS completion question types:
 * - sentence_completion
 * - summary_completion
 * - note_completion
 * - table_completion
 * - short_answer
 *
 * Renders a text input field with word limit guidance, matching the
 * real IELTS computer-delivered test format.
 */
export function CompletionItem({ item, answer, onChange, disabled }: Props) {
  const payload = item.payload;
  const wordLimitMax = payload.word_limit_max ?? 3;
  const wordLimitHint = payload.word_limit_hint ?? `Write NO MORE THAN ${wordLimitMax} WORDS`;

  // Current word count
  const words = answer.trim() ? answer.trim().split(/\s+/) : [];
  const wordCount = words.length;
  const isOverLimit = wordCount > wordLimitMax;

  // Type-specific labels
  const typeLabels: Record<string, string> = {
    sentence_completion: "Complete the sentence",
    summary_completion: "Complete the summary",
    note_completion: "Complete the notes",
    table_completion: "Complete the table",
    short_answer: "Answer the question",
  };

  return (
    <div className="mt-8 space-y-6">
      {/* Passage context (if provided) */}
      {payload.passage && (
        <div className="rounded-2xl border border-[var(--color-border)] p-5 text-sm leading-relaxed text-[var(--color-fg)] max-h-72 overflow-y-auto">
          <p className="text-xs font-semibold uppercase tracking-wider mb-3 text-[var(--color-primary)]">
            Reading Passage
          </p>
          <div className="whitespace-pre-wrap">{payload.passage}</div>
        </div>
      )}

      {/* Question / stem */}
      <div className="rounded-2xl border border-[var(--color-border)] bg-[var(--color-muted)]/30 p-6">
        <p className="text-xs font-semibold uppercase tracking-wider text-[var(--color-muted-fg)] mb-1">
          {typeLabels[item.type] ?? "Complete the answer"}
        </p>
        <p className="text-lg font-medium leading-relaxed">
          {payload.prompt ?? payload.stem ?? payload.question ?? ""}
        </p>
      </div>

      {/* Word limit instruction */}
      <div className="flex items-center gap-2 rounded-lg bg-blue-500/5 border border-blue-500/20 px-4 py-2.5 text-sm">
        <svg className="h-4 w-4 text-blue-500 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
        <span className="text-blue-700 dark:text-blue-300 font-medium">{wordLimitHint}</span>
      </div>

      {/* Answer input */}
      <div className="relative">
        <input
          type="text"
          value={answer}
          onChange={(e) => onChange(e.target.value)}
          disabled={disabled}
          placeholder="Type your answer here..."
          autoComplete="off"
          autoCapitalize="sentences"
          className={`w-full rounded-xl border-2 px-5 py-4 text-base font-medium transition-all
            focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)]/30
            bg-[var(--color-bg)] text-[var(--color-fg)]
            placeholder:text-[var(--color-muted-fg)]/50
            ${isOverLimit
              ? "border-red-500 focus:border-red-500"
              : "border-[var(--color-border)] focus:border-[var(--color-primary)]"
            }
            ${disabled ? "cursor-not-allowed opacity-60" : ""}
          `}
        />
        {/* Word count badge */}
        <span
          className={`absolute right-3 top-1/2 -translate-y-1/2 rounded-full px-2.5 py-0.5 text-xs font-bold ${
            isOverLimit
              ? "bg-red-500/10 text-red-600"
              : wordCount > 0
              ? "bg-emerald-500/10 text-emerald-600"
              : "bg-[var(--color-muted)] text-[var(--color-muted-fg)]"
          }`}
        >
          {wordCount}/{wordLimitMax}
        </span>
      </div>

      {isOverLimit && (
        <p className="text-sm font-medium text-red-600">
          ⚠ You have exceeded the word limit. Your answer must be no more than {wordLimitMax} words.
        </p>
      )}
    </div>
  );
}
