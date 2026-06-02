"use client";

import { motion } from "framer-motion";
import type { ItemView } from "@/lib/api";

type Props = {
  item: ItemView;
  /** Comma-separated pairs like "A:3,B:1,C:2" (leftId:rightId) */
  answer: string;
  onChange: (answer: string) => void;
  disabled?: boolean;
};

type MatchPair = {
  leftId: string;
  leftLabel: string;
};

type MatchOption = {
  id: string;
  label: string;
};

/**
 * Matching question types (matching_headings, matching_features,
 * matching_information, matching_sentence_endings).
 *
 * Renders left-side items paired with dropdown selectors from a
 * pool of right-side options, matching real IELTS format.
 */
export function MatchingItem({ item, answer, onChange, disabled }: Props) {
  const payload = item.payload;

  // Parse left items to match and right options pool
  const leftItems: MatchPair[] = (payload.match_items ?? payload.items_to_match ?? []).map(
    (it, idx) => ({
      leftId: it.id ?? String(idx),
      leftLabel: it.stem ?? `Item ${idx + 1}`,
    })
  );

  const rightOptions: MatchOption[] = (payload.match_options ?? payload.options ?? []).map(
    (opt, idx) => ({
      id: opt.id ?? String.fromCharCode(65 + idx),
      label: opt.label ?? `Option ${String.fromCharCode(65 + idx)}`,
    })
  );

  // Parse current answer: "leftId:rightId,leftId:rightId"
  const selections: Record<string, string> = {};
  if (answer) {
    answer.split(",").forEach((pair) => {
      const [left, right] = pair.split(":");
      if (left && right) selections[left] = right;
    });
  }

  function updateSelection(leftId: string, rightId: string) {
    const next = { ...selections };
    if (rightId) {
      next[leftId] = rightId;
    } else {
      delete next[leftId];
    }
    const encoded = Object.entries(next)
      .map(([l, r]) => `${l}:${r}`)
      .join(",");
    onChange(encoded);
  }

  // Type-specific instructions
  const typeLabels: Record<string, string> = {
    matching_headings: "Match each paragraph to the correct heading",
    matching_features: "Match each statement to the correct feature",
    matching_information: "Match each statement to the correct paragraph",
    matching_sentence_endings: "Complete each sentence with the correct ending",
  };

  return (
    <div className="mt-8 space-y-6">
      {/* Passage (if provided) */}
      {payload.passage && (
        <div className="rounded-2xl border border-[var(--color-border)] p-5 text-sm leading-relaxed text-[var(--color-fg)] max-h-72 overflow-y-auto">
          <p className="text-xs font-semibold uppercase tracking-wider mb-3 text-[var(--color-primary)]">
            Reading Passage
          </p>
          <div className="whitespace-pre-wrap">{payload.passage}</div>
        </div>
      )}

      {/* Question / stem */}
      <div className="rounded-2xl border border-[var(--color-border)] bg-[var(--color-muted)]/30 p-5">
        <p className="text-sm font-semibold text-[var(--color-primary)]">
          {typeLabels[item.type] ?? "Match the items below"}
        </p>
        {payload.stem && (
          <p className="mt-2 text-base leading-relaxed">
            {payload.stem}
          </p>
        )}
      </div>

      {/* Options legend */}
      <div className="rounded-xl border border-[var(--color-border)] bg-[var(--color-muted)]/20 p-4">
        <p className="text-xs font-semibold uppercase tracking-wider text-[var(--color-muted-fg)] mb-2">
          Options
        </p>
        <div className="grid gap-1.5 sm:grid-cols-2">
          {rightOptions.map((opt) => (
            <div key={opt.id} className="flex items-start gap-2 text-sm">
              <span className="shrink-0 font-bold text-[var(--color-primary)]">{opt.id}.</span>
              <span>{opt.label}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Matching pairs */}
      <div className="space-y-3">
        {leftItems.map((left, idx) => (
          <motion.div
            key={left.leftId}
            initial={{ opacity: 0, y: 5 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: idx * 0.05 }}
            className="flex items-center gap-4 rounded-xl border border-[var(--color-border)] p-4 transition-all hover:border-[var(--color-primary)]/30"
          >
            {/* Left item label */}
            <div className="flex-1 text-sm font-medium">
              <span className="mr-2 inline-flex h-6 w-6 items-center justify-center rounded-full bg-[var(--color-primary)]/10 text-xs font-bold text-[var(--color-primary)]">
                {idx + 1}
              </span>
              {left.leftLabel}
            </div>

            {/* Dropdown selector */}
            <select
              value={selections[left.leftId] ?? ""}
              onChange={(e) => updateSelection(left.leftId, e.target.value)}
              disabled={disabled}
              className={`rounded-lg border-2 px-3 py-2 text-sm font-medium transition-all
                bg-[var(--color-bg)] text-[var(--color-fg)]
                focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)]/30
                ${selections[left.leftId]
                  ? "border-[var(--color-primary)] bg-[var(--color-primary)]/5"
                  : "border-[var(--color-border)]"
                }
                ${disabled ? "cursor-not-allowed opacity-60" : "cursor-pointer"}
              `}
            >
              <option value="">— Select —</option>
              {rightOptions.map((opt) => (
                <option key={opt.id} value={opt.id}>
                  {opt.id}. {opt.label.substring(0, 50)}
                </option>
              ))}
            </select>
          </motion.div>
        ))}
      </div>

      {/* Completion indicator */}
      <div className="text-sm text-[var(--color-muted-fg)]">
        {Object.keys(selections).length} / {leftItems.length} matched
      </div>
    </div>
  );
}
