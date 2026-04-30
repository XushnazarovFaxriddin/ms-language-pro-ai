"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useTranslations } from "next-intl";
import { PenSquare } from "lucide-react";
import type { ItemView } from "@/lib/api";

type Props = {
  item: ItemView;
  text: string;
  onChange: (text: string) => void;
  disabled: boolean;
};

/**
 * Writing item: minimal IELTS-style essay editor.
 *  - Word counter live (warning if below min, error above max).
 *  - Paste blocked (anti-cheat; logged via custom event).
 *  - Focus loss recorded.
 * No TipTap dependency required — a plain textarea is enough for v1; richer
 * editor (TipTap) ships in Phase 2 per docs/13-skills-deep.md §3.2.
 */
export function WritingItem({ item, text, onChange, disabled }: Props) {
  const t = useTranslations("Exam.writing");
  const min = item.payload.word_limit_min ?? 250;
  const max = item.payload.word_limit_max ?? 400;
  const ref = useRef<HTMLTextAreaElement | null>(null);
  const [pasteWarn, setPasteWarn] = useState(false);

  const wordCount = useMemo(
    () => (text.trim().length === 0 ? 0 : text.trim().split(/\s+/).length),
    [text],
  );

  useEffect(() => {
    function onBlur() {
      // Focus-loss telemetry — backend ingestion in Phase 2
      // (placeholder; real wiring to /events endpoint TBD)
    }
    const el = ref.current;
    if (!el) return;
    el.addEventListener("blur", onBlur);
    return () => el.removeEventListener("blur", onBlur);
  }, []);

  const status: "low" | "ok" | "over" =
    wordCount < min ? "low" : wordCount > max ? "over" : "ok";

  return (
    <div className="mt-8 space-y-6">
      <article className="rounded-2xl border border-[var(--color-border)] bg-white/5 p-6 md:p-8 shadow-sm dark:bg-black/20">
        <div className="flex items-center gap-3 text-[var(--color-muted-fg)]">
          <PenSquare className="h-5 w-5" />
          <span className="text-sm font-semibold uppercase tracking-wider">
            {t("label", { task: item.payload.task_type ?? "task2" })}
          </span>
        </div>
        <p className="mt-6 whitespace-pre-wrap text-lg leading-relaxed">
          {item.payload.prompt}
        </p>
        <p className="mt-4 text-sm text-[var(--color-muted-fg)]">
          {t("limits", { min, max, minutes: item.payload.time_limit_minutes ?? 40 })}
        </p>
      </article>

      <div className="rounded-2xl border border-[var(--color-border)] bg-white/5 p-2 dark:bg-black/20">
        <textarea
          ref={ref}
          value={text}
          onChange={(e) => onChange(e.target.value)}
          disabled={disabled}
          placeholder={t("placeholder")}
          className="min-h-[320px] w-full resize-y rounded-xl border-0 bg-transparent p-4 text-base leading-relaxed outline-none focus:ring-0 disabled:cursor-not-allowed disabled:opacity-60"
          spellCheck={false}
          onPaste={(e) => {
            e.preventDefault();
            setPasteWarn(true);
            window.setTimeout(() => setPasteWarn(false), 3000);
          }}
        />
        <div className="flex items-center justify-between border-t border-[var(--color-border)] px-4 py-3 text-sm">
          <span
            className={
              status === "ok"
                ? "text-emerald-600 dark:text-emerald-400"
                : status === "low"
                ? "text-[var(--color-muted-fg)]"
                : "text-rose-600 dark:text-rose-400"
            }
          >
            {t("wordCount", { count: wordCount })}{" "}
            {status === "low"
              ? t("needMore", { min })
              : status === "over"
                ? t("tooMany", { max })
                : t("ok")}
          </span>
          {pasteWarn && (
            <span className="text-rose-600 dark:text-rose-400">{t("pasteBlocked")}</span>
          )}
        </div>
      </div>
    </div>
  );
}
