"use client";

import { motion } from "framer-motion";
import { Flag } from "lucide-react";

type Props = {
  currentIndex: number;      // 0-based index within section
  totalItems: number;
  answeredSet: Set<number>;  // indices that have been answered
  flaggedSet: Set<number>;   // indices flagged for review
  onFlag: (index: number) => void;
  sectionLabel: string;
};

/**
 * Bottom navigation bar mimicking the real computer-delivered IELTS exam.
 * Shows a grid of question numbers with visual status indicators:
 * - Gray: unanswered
 * - Primary: current
 * - Green: answered
 * - Orange flag: flagged for review
 */
export function QuestionNav({
  currentIndex,
  totalItems,
  answeredSet,
  flaggedSet,
  onFlag,
  sectionLabel,
}: Props) {
  return (
    <div className="fixed bottom-0 left-0 right-0 z-40 border-t border-[var(--color-border)] bg-white/80 backdrop-blur-xl dark:bg-zinc-900/80">
      <div className="container mx-auto max-w-4xl px-4 py-2.5">
        {/* Section label + flag button */}
        <div className="flex items-center justify-between mb-2">
          <span className="text-xs font-semibold uppercase tracking-wider text-[var(--color-muted-fg)]">
            {sectionLabel}
          </span>
          <button
            type="button"
            onClick={() => onFlag(currentIndex)}
            className={`flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-medium transition-all ${
              flaggedSet.has(currentIndex)
                ? "bg-amber-500/15 text-amber-700 dark:text-amber-300"
                : "text-[var(--color-muted-fg)] hover:bg-[var(--color-muted)]/20"
            }`}
          >
            <Flag className="h-3 w-3" />
            {flaggedSet.has(currentIndex) ? "Flagged" : "Flag for review"}
          </button>
        </div>

        {/* Question number grid */}
        <div className="flex flex-wrap gap-1">
          {Array.from({ length: totalItems }, (_, i) => {
            const isCurrent = i === currentIndex;
            const isAnswered = answeredSet.has(i);
            const isFlagged = flaggedSet.has(i);

            return (
              <motion.div
                key={i}
                className={`relative flex h-7 w-7 items-center justify-center rounded text-xs font-bold transition-all ${
                  isCurrent
                    ? "bg-[var(--color-primary)] text-[var(--color-primary-fg)] shadow-md ring-2 ring-[var(--color-primary)]/30"
                    : isAnswered
                    ? "bg-emerald-500/15 text-emerald-700 dark:text-emerald-400"
                    : "bg-[var(--color-muted)]/15 text-[var(--color-muted-fg)]"
                }`}
                whileHover={{ scale: 1.1 }}
              >
                {i + 1}
                {/* Flag indicator */}
                {isFlagged && (
                  <span className="absolute -top-0.5 -right-0.5 h-2 w-2 rounded-full bg-amber-500" />
                )}
              </motion.div>
            );
          })}
        </div>

        {/* Legend */}
        <div className="mt-1.5 flex items-center gap-4 text-[10px] text-[var(--color-muted-fg)]">
          <span className="flex items-center gap-1">
            <span className="inline-block h-2.5 w-2.5 rounded-sm bg-[var(--color-primary)]" /> Current
          </span>
          <span className="flex items-center gap-1">
            <span className="inline-block h-2.5 w-2.5 rounded-sm bg-emerald-500/30" /> Answered
          </span>
          <span className="flex items-center gap-1">
            <span className="inline-block h-2.5 w-2.5 rounded-sm bg-[var(--color-muted)]/30" /> Unanswered
          </span>
          <span className="flex items-center gap-1">
            <span className="inline-block h-2.5 w-2.5 rounded-full bg-amber-500" /> Flagged
          </span>
        </div>
      </div>
    </div>
  );
}
