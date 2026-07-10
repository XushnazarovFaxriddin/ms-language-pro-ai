"use client";

import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useTranslations } from "next-intl";
import { Brain, FileText, Mic, BarChart3, CheckCircle2, AlertCircle, Loader2 } from "lucide-react";

const STAGES = [
  { key: "reading", icon: FileText, durationMs: 6_000 },
  { key: "writing", icon: FileText, durationMs: 22_000 },
  { key: "speaking", icon: Mic, durationMs: 25_000 },
  { key: "composing", icon: BarChart3, durationMs: 12_000 },
] as const;

type Stage = (typeof STAGES)[number]["key"];

export function AIGradingProgress({
  state,
  onRetry,
  errorMessage,
}: {
  state: "running" | "error";
  onRetry?: () => void;
  errorMessage?: string;
}) {
  const t = useTranslations("Feedback.progress");
  const [stageIdx, setStageIdx] = useState(0);
  const [elapsedMs, setElapsedMs] = useState(0);

  useEffect(() => {
    if (state !== "running") return;
    const startedAt = Date.now();
    const tick = window.setInterval(() => {
      setElapsedMs(Date.now() - startedAt);
    }, 250);
    return () => window.clearInterval(tick);
  }, [state]);

  useEffect(() => {
    if (state !== "running") return;
    let acc = 0;
    let cancel = false;
    const timers: number[] = [];
    STAGES.forEach((s, i) => {
      acc += s.durationMs;
      timers.push(
        window.setTimeout(() => {
          if (!cancel) setStageIdx(Math.min(i + 1, STAGES.length - 1));
        }, acc),
      );
    });
    return () => {
      cancel = true;
      timers.forEach((id) => window.clearTimeout(id));
    };
  }, [state]);

  if (state === "error") {
    return (
      <div className="rounded-3xl border border-red-500/20 bg-red-500/5 p-8 sm:p-10 text-center shadow-sm">
        <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-red-500/10 text-red-500">
          <AlertCircle className="h-7 w-7" />
        </div>
        <h3 className="text-xl font-bold mb-2">{t("errorTitle")}</h3>
        <p className="text-sm text-[var(--color-muted-fg)] max-w-md mx-auto mb-6">
          {errorMessage || t("errorBody")}
        </p>
        {onRetry && (
          <button
            onClick={onRetry}
            className="inline-flex items-center gap-2 rounded-2xl bg-[var(--color-primary)] px-5 py-2.5 text-sm font-semibold text-white shadow-sm transition-all hover:opacity-90"
          >
            {t("retry")}
          </button>
        )}
      </div>
    );
  }

  const elapsedSec = Math.floor(elapsedMs / 1000);
  const totalMs = STAGES.reduce((s, x) => s + x.durationMs, 0);
  const pct = Math.min(99, (elapsedMs / totalMs) * 100);

  return (
    <div className="glass-panel rounded-3xl border border-[var(--color-primary)]/20 bg-gradient-to-br from-[var(--color-primary)]/5 via-transparent to-[var(--color-primary)]/5 p-8 sm:p-10 shadow-2xl overflow-hidden relative">
      {/* Decorative ambient glowing mesh */}
      <div className="absolute -right-16 -top-16 h-48 w-48 rounded-full bg-[var(--color-primary)]/20 blur-3xl pointer-events-none mesh-glow animate-pulse" />
      <div className="absolute -left-16 -bottom-16 h-48 w-48 rounded-full bg-violet-500/20 blur-3xl pointer-events-none mesh-glow animate-pulse" />

      <div className="relative z-10">
        <div className="flex items-center gap-4 mb-2">
          <div className="relative flex h-14 w-14 items-center justify-center rounded-2xl bg-[var(--color-primary)]/10 text-[var(--color-primary)] shadow-sm">
            <motion.div
              className="absolute inset-0 rounded-2xl border-2 border-[var(--color-primary)]/40"
              animate={{ scale: [1, 1.15, 1], opacity: [0.6, 0, 0.6] }}
              transition={{ repeat: Infinity, duration: 1.8, ease: "easeOut" }}
            />
            <Brain className="h-7 w-7 relative" />
          </div>
          <div>
            <h3 className="text-xl font-bold tracking-tight">{t("title")}</h3>
            <p className="text-sm font-medium text-[var(--color-muted-fg)]">{t("subtitle")}</p>
          </div>
        </div>

        <div className="mt-6 h-2 w-full overflow-hidden rounded-full bg-[var(--color-muted)]/30 border border-[var(--color-border)]/20">
          <motion.div
            className="h-full bg-gradient-to-r from-[var(--color-primary)] via-violet-400 to-[var(--color-primary)]"
            style={{ backgroundSize: "200% 100%" }}
            animate={{ width: `${pct}%`, backgroundPosition: ["0% 0%", "200% 0%"] }}
            transition={{
              width: { duration: 0.4 },
              backgroundPosition: { repeat: Infinity, duration: 3, ease: "linear" },
            }}
          />
        </div>
        <div className="mt-2.5 flex items-center justify-between text-xs font-bold font-mono text-[var(--color-muted-fg)]">
          <span>{elapsedSec}s</span>
          <span className="text-[var(--color-primary)]">{Math.round(pct)}%</span>
        </div>

        <ul className="mt-6 space-y-3.5">
          {STAGES.map((s, i) => (
            <StageRow
              key={s.key}
              icon={s.icon}
              label={t(`stages.${s.key}` as `stages.${Stage}`)}
              status={i < stageIdx ? "done" : i === stageIdx ? "active" : "pending"}
            />
          ))}
        </ul>

        <p className="mt-6 text-[10px] font-bold uppercase tracking-wider text-[var(--color-muted-fg)] text-center font-mono">
          {t("hint")}
        </p>
      </div>
    </div>
  );

}

function StageRow({
  icon: Icon,
  label,
  status,
}: {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  status: "pending" | "active" | "done";
}) {
  return (
    <li className="flex items-center gap-3">
      <AnimatePresence mode="wait">
        {status === "done" ? (
          <motion.span
            key="done"
            initial={{ scale: 0.6, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            className="flex h-7 w-7 items-center justify-center rounded-full bg-emerald-500/15 text-emerald-500"
          >
            <CheckCircle2 className="h-4 w-4" />
          </motion.span>
        ) : status === "active" ? (
          <motion.span
            key="active"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="flex h-7 w-7 items-center justify-center rounded-full bg-[var(--color-primary)]/15 text-[var(--color-primary)]"
          >
            <Loader2 className="h-4 w-4 animate-spin" />
          </motion.span>
        ) : (
          <motion.span
            key="pending"
            initial={{ opacity: 0 }}
            animate={{ opacity: 0.7 }}
            className="flex h-7 w-7 items-center justify-center rounded-full border border-[var(--color-border)]/60 text-[var(--color-muted-fg)]"
          >
            <Icon className="h-3.5 w-3.5" />
          </motion.span>
        )}
      </AnimatePresence>
      <span
        className={`text-sm font-medium ${
          status === "active"
            ? "text-[var(--color-fg)]"
            : status === "done"
              ? "text-[var(--color-muted-fg)]"
              : "text-[var(--color-muted-fg)]/70"
        }`}
      >
        {label}
      </span>
    </li>
  );
}
