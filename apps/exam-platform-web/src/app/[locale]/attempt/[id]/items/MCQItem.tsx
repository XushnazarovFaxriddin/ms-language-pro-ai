"use client";

import { motion } from "framer-motion";
import type { ItemView } from "@/lib/api";

type Props = {
  item: ItemView;
  choice: string | null;
  onChange: (id: string) => void;
  disabled: boolean;
};

export function MCQItem({ item, choice, onChange, disabled }: Props) {
  const opts = item.payload.options ?? [];
  return (
    <>
      {item.payload.passage && (
        <article className="mt-8 rounded-2xl border border-[var(--color-border)] bg-white/5 p-6 md:p-8 shadow-sm backdrop-blur-md leading-relaxed dark:bg-black/20 text-lg whitespace-pre-wrap">
          {item.payload.passage}
        </article>
      )}
      <p className="mt-8 text-xl font-bold tracking-tight">{item.payload.prompt}</p>
      <fieldset className="mt-6 grid gap-3" disabled={disabled}>
        {opts.map((o) => (
          <motion.label
            key={o.id}
            whileHover={!disabled ? { scale: 1.005 } : undefined}
            whileTap={!disabled ? { scale: 0.995 } : undefined}
            className={`group relative flex cursor-pointer items-center gap-4 rounded-xl border p-4 transition-all ${
              choice === o.id
                ? "border-[var(--color-primary)] bg-[var(--color-primary)]/5 shadow-[0_0_0_1px_var(--color-primary)]"
                : "border-[var(--color-border)] bg-white/5 hover:border-[var(--color-primary)]/50 hover:bg-[var(--color-primary)]/5 dark:bg-black/10"
            } ${disabled ? "cursor-not-allowed opacity-60" : ""}`}
          >
            <div
              className={`flex h-5 w-5 items-center justify-center rounded-full border ${
                choice === o.id
                  ? "border-[var(--color-primary)]"
                  : "border-[var(--color-muted-fg)]"
              }`}
            >
              {choice === o.id && <div className="h-2.5 w-2.5 rounded-full bg-[var(--color-primary)]" />}
            </div>
            <input
              type="radio"
              name="mcq"
              value={o.id}
              checked={choice === o.id}
              onChange={() => onChange(o.id)}
              className="hidden"
              disabled={disabled}
            />
            <span className="font-semibold text-[var(--color-muted-fg)]">{o.id}.</span>
            <span className="text-lg">{o.label}</span>
          </motion.label>
        ))}
      </fieldset>
    </>
  );
}
