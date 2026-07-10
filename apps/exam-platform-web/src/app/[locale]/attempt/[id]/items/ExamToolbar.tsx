"use client";

import { useState } from "react";
import { Type, Minus, Plus, Highlighter } from "lucide-react";

type FontSize = "sm" | "base" | "lg" | "xl";

const FONT_SIZES: { key: FontSize; label: string; class: string }[] = [
  { key: "sm", label: "A", class: "text-sm" },
  { key: "base", label: "A", class: "text-base" },
  { key: "lg", label: "A", class: "text-lg" },
  { key: "xl", label: "A", class: "text-xl" },
];

type Props = {
  fontSize: FontSize;
  onFontSizeChange: (size: FontSize) => void;
  highlightMode: boolean;
  onHighlightToggle: () => void;
};

/**
 * Compact toolbar for exam screen — font size A+/A- buttons and
 * text highlighter toggle, matching real computer-delivered IELTS.
 */
export function ExamToolbar({ fontSize, onFontSizeChange, highlightMode, onHighlightToggle }: Props) {
  const currentIdx = FONT_SIZES.findIndex((f) => f.key === fontSize);

  function decrease() {
    if (currentIdx > 0) onFontSizeChange(FONT_SIZES[currentIdx - 1]!.key);
  }
  function increase() {
    if (currentIdx < FONT_SIZES.length - 1) onFontSizeChange(FONT_SIZES[currentIdx + 1]!.key);
  }

  return (
    <div className="flex items-center gap-1">
      {/* Font size controls */}
      <div className="flex items-center gap-0.5 rounded-lg border border-[var(--color-border)] bg-white/50 dark:bg-zinc-800/50 p-0.5">
        <button
          type="button"
          onClick={decrease}
          disabled={currentIdx <= 0}
          className="flex h-7 w-7 items-center justify-center rounded text-xs font-bold transition-colors hover:bg-[var(--color-muted)]/30 disabled:opacity-30"
          aria-label="Decrease font size"
        >
          <Minus className="h-3 w-3" />
        </button>
        <span className="flex h-7 items-center px-1 text-xs font-bold text-[var(--color-muted-fg)]">
          <Type className="h-3.5 w-3.5" />
        </span>
        <button
          type="button"
          onClick={increase}
          disabled={currentIdx >= FONT_SIZES.length - 1}
          className="flex h-7 w-7 items-center justify-center rounded text-xs font-bold transition-colors hover:bg-[var(--color-muted)]/30 disabled:opacity-30"
          aria-label="Increase font size"
        >
          <Plus className="h-3 w-3" />
        </button>
      </div>

      {/* Highlight toggle */}
      <button
        type="button"
        onClick={onHighlightToggle}
        className={`flex h-8 items-center gap-1 rounded-lg border px-2 text-xs font-medium transition-all ${
          highlightMode
            ? "border-amber-500 bg-amber-500/10 text-amber-700 dark:text-amber-300"
            : "border-[var(--color-border)] bg-white/50 dark:bg-zinc-800/50 text-[var(--color-muted-fg)] hover:bg-[var(--color-muted)]/20"
        }`}
        aria-label="Toggle text highlighting"
        aria-pressed={highlightMode}
      >
        <Highlighter className="h-3.5 w-3.5" />
      </button>
    </div>
  );
}

/** CSS class for the active font size */
export function fontSizeClass(size: FontSize): string {
  return FONT_SIZES.find((f) => f.key === size)?.class ?? "text-base";
}

export type { FontSize };
