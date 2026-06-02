"use client";

import { motion } from "framer-motion";
import type { ItemView } from "@/lib/api";

type Props = {
  item: ItemView;
  choice: string | null;
  onChange: (id: string) => void;
  disabled?: boolean;
};

/**
 * True / False / Not Given (or Yes / No / Not Given) selector.
 * Renders exactly three options in a horizontal card layout — visually
 * distinct from the generic MCQ vertical radio list so students
 * immediately recognise this IELTS question type.
 */
export function TrueFalseNGItem({ item, choice, onChange, disabled }: Props) {
  const isYesNo = item.type === "yes_no_ng";

  const options = isYesNo
    ? [
        { id: "yes", label: "YES", color: "emerald" },
        { id: "no", label: "NO", color: "red" },
        { id: "not_given", label: "NOT GIVEN", color: "slate" },
      ]
    : [
        { id: "true", label: "TRUE", color: "emerald" },
        { id: "false", label: "FALSE", color: "red" },
        { id: "not_given", label: "NOT GIVEN", color: "slate" },
      ];

  const colorClasses: Record<string, { active: string; border: string }> = {
    emerald: {
      active: "border-emerald-500 bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 shadow-emerald-500/15",
      border: "hover:border-emerald-400/50",
    },
    red: {
      active: "border-red-500 bg-red-500/10 text-red-700 dark:text-red-300 shadow-red-500/15",
      border: "hover:border-red-400/50",
    },
    slate: {
      active: "border-slate-500 bg-slate-500/10 text-slate-700 dark:text-slate-300 shadow-slate-500/15",
      border: "hover:border-slate-400/50",
    },
  };

  return (
    <div className="mt-8 space-y-6">
      {/* Statement */}
      <div className="rounded-2xl border border-[var(--color-border)] bg-[var(--color-muted)]/30 p-6">
        <p className="text-xs font-semibold uppercase tracking-wider text-[var(--color-muted-fg)] mb-2">
          {isYesNo ? "Does the writer's opinion match?" : "Does this agree with the information?"}
        </p>
        <p className="text-lg font-medium leading-relaxed">
          {item.payload.stem ?? item.payload.question ?? ""}
        </p>
      </div>

      {/* Passage context (if provided) */}
      {item.payload.passage && (
        <div className="rounded-2xl border border-[var(--color-border)] p-5 text-sm leading-relaxed text-[var(--color-muted-fg)] max-h-80 overflow-y-auto">
          <p className="text-xs font-semibold uppercase tracking-wider mb-2 text-[var(--color-primary)]">
            Reading Passage
          </p>
          {item.payload.passage}
        </div>
      )}

      {/* Three-option horizontal selector */}
      <div className="grid grid-cols-3 gap-3">
        {options.map((opt) => {
          const isSelected = choice === opt.id;
          const colors = colorClasses[opt.color]!;
          return (
            <motion.button
              key={opt.id}
              type="button"
              disabled={disabled}
              whileTap={{ scale: 0.97 }}
              onClick={() => onChange(opt.id)}
              className={`relative flex flex-col items-center justify-center gap-1 rounded-xl border-2 px-4 py-5 text-center font-bold transition-all duration-200 ${
                isSelected
                  ? `${colors.active} shadow-md border-2`
                  : `border-[var(--color-border)] ${colors.border} text-[var(--color-muted-fg)]`
              } ${disabled ? "cursor-not-allowed opacity-60" : "cursor-pointer"}`}
            >
              {/* Selection indicator */}
              <div
                className={`mb-1 flex h-6 w-6 items-center justify-center rounded-full border-2 transition-all ${
                  isSelected
                    ? `border-current bg-current`
                    : "border-[var(--color-border)]"
                }`}
              >
                {isSelected && (
                  <motion.div
                    initial={{ scale: 0 }}
                    animate={{ scale: 1 }}
                    className="h-2.5 w-2.5 rounded-full bg-white"
                  />
                )}
              </div>
              <span className="text-sm tracking-wide">{opt.label}</span>
            </motion.button>
          );
        })}
      </div>
    </div>
  );
}
