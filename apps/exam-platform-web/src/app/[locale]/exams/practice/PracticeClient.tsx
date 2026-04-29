"use client";

import { useMemo, useState } from "react";
import { useTranslations } from "next-intl";
import { api, SRSCardOut } from "@/lib/api";
import { CheckCircle2, XCircle, Eye, EyeOff, Loader2 } from "lucide-react";

type CardPayload = {
  skill?: string;
  type?: string;
  prompt?: string;
  options?: { id: string; text: string }[];
  correct_option_id?: string | null;
  correct_answer?: string | null;
  user_answer?: Record<string, unknown> | null;
  cefr_level?: string;
};

export function PracticeClient({ initialQueue }: { initialQueue: SRSCardOut[] }) {
  const t = useTranslations("Practice");
  const [queue, setQueue] = useState(initialQueue);
  const [reveal, setReveal] = useState(false);
  const [busy, setBusy] = useState(false);

  const card = queue[0];
  const payload = (card?.payload as CardPayload | undefined) ?? null;
  const total = useMemo(() => initialQueue.length, [initialQueue]);
  const remaining = queue.length;

  const handleGrade = async (
    cardId: string,
    grade: "again" | "hard" | "good" | "easy",
  ) => {
    setBusy(true);
    try {
      await api.practice.gradeSRS({ card_id: cardId, grade });
      setQueue((q) => q.slice(1));
      setReveal(false);
    } catch (err) {
      console.error(err);
    } finally {
      setBusy(false);
    }
  };

  if (!card || !payload) {
    return (
      <div className="rounded-3xl border border-[var(--color-border)]/50 bg-[var(--color-bg)] p-12 text-center text-[var(--color-muted-fg)]">
        {t("doneTitle")}
      </div>
    );
  }

  const userPicked = (payload.user_answer as { option_id?: string } | null)?.option_id;
  const userText = (payload.user_answer as { text?: string; answer?: string } | null)?.text
    ?? (payload.user_answer as { answer?: string } | null)?.answer
    ?? "";

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between text-xs font-bold uppercase tracking-wider text-[var(--color-muted-fg)]">
        <span>
          {t("progress", {
            current: total - remaining + 1,
            total,
          })}
        </span>
        <div className="flex items-center gap-2">
          {payload.skill && <Pill>{payload.skill}</Pill>}
          {payload.cefr_level && <Pill>{payload.cefr_level}</Pill>}
        </div>
      </div>

      <div className="rounded-3xl border border-[var(--color-border)]/50 bg-[var(--color-bg)] p-6 sm:p-8 shadow-xl space-y-6">
        <p className="text-base leading-relaxed font-medium text-[var(--color-fg)]">
          {payload.prompt || t("noPrompt")}
        </p>

        {payload.options && payload.options.length > 0 ? (
          <div className="space-y-2">
            {payload.options.map((opt) => {
              const isCorrect = reveal && payload.correct_option_id === opt.id;
              const isUserPick = userPicked === opt.id;
              const isUserWrong = reveal && isUserPick && !isCorrect;
              return (
                <div
                  key={opt.id}
                  className={`flex items-start gap-3 rounded-2xl border p-3 text-sm transition-colors ${
                    isCorrect
                      ? "border-emerald-500/40 bg-emerald-500/10"
                      : isUserWrong
                        ? "border-red-500/40 bg-red-500/10"
                        : "border-[var(--color-border)]/50 bg-[var(--color-muted)]/10"
                  }`}
                >
                  <span className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full border border-[var(--color-border)]/60 text-[10px] font-bold uppercase">
                    {opt.id.toUpperCase()}
                  </span>
                  <span className="flex-1">{opt.text}</span>
                  {isCorrect && <CheckCircle2 className="h-4 w-4 text-emerald-500 shrink-0" />}
                  {isUserWrong && <XCircle className="h-4 w-4 text-red-500 shrink-0" />}
                </div>
              );
            })}
          </div>
        ) : userText || payload.correct_answer ? (
          <div className="space-y-3 text-sm">
            {userText && (
              <Row
                label={t("yourAnswer")}
                value={userText}
                tone="warn"
              />
            )}
            {reveal && payload.correct_answer && (
              <Row label={t("correctAnswer")} value={payload.correct_answer} tone="ok" />
            )}
          </div>
        ) : null}

        <div className="flex items-center justify-between border-t border-[var(--color-border)]/40 pt-4">
          <button
            type="button"
            onClick={() => setReveal((r) => !r)}
            className="inline-flex items-center gap-2 rounded-xl border border-[var(--color-border)]/60 px-4 py-2 text-xs font-bold transition-colors hover:bg-[var(--color-muted)]/20"
          >
            {reveal ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
            {reveal ? t("hideAnswer") : t("showAnswer")}
          </button>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 sm:gap-3 pt-2">
          <GradeBtn
            disabled={busy}
            onClick={() => handleGrade(card.id, "again")}
            tone="red"
            label={t("grade.again")}
            sub={t("grade.againSub")}
          />
          <GradeBtn
            disabled={busy}
            onClick={() => handleGrade(card.id, "hard")}
            tone="orange"
            label={t("grade.hard")}
            sub={t("grade.hardSub")}
          />
          <GradeBtn
            disabled={busy}
            onClick={() => handleGrade(card.id, "good")}
            tone="green"
            label={t("grade.good")}
            sub={t("grade.goodSub")}
          />
          <GradeBtn
            disabled={busy}
            onClick={() => handleGrade(card.id, "easy")}
            tone="blue"
            label={t("grade.easy")}
            sub={t("grade.easySub")}
          />
        </div>
        {busy && (
          <div className="flex items-center justify-center pt-2 text-xs text-[var(--color-muted-fg)]">
            <Loader2 className="h-4 w-4 animate-spin" />
          </div>
        )}
      </div>
    </div>
  );
}

function Pill({ children }: { children: React.ReactNode }) {
  return (
    <span className="rounded-full border border-[var(--color-border)]/50 bg-[var(--color-muted)]/20 px-3 py-1 text-[10px] uppercase tracking-wider">
      {children}
    </span>
  );
}

function Row({ label, value, tone }: { label: string; value: string; tone: "ok" | "warn" }) {
  const cls =
    tone === "ok"
      ? "border-emerald-500/30 bg-emerald-500/10"
      : "border-orange-500/30 bg-orange-500/10";
  return (
    <div className={`rounded-2xl border ${cls} p-3`}>
      <div className="text-[10px] font-bold uppercase tracking-wider text-[var(--color-muted-fg)] mb-1">
        {label}
      </div>
      <div className="text-sm font-medium">{value}</div>
    </div>
  );
}

function GradeBtn({
  disabled,
  onClick,
  tone,
  label,
  sub,
}: {
  disabled: boolean;
  onClick: () => void;
  tone: "red" | "orange" | "green" | "blue";
  label: string;
  sub: string;
}) {
  const cls = {
    red: "border-red-500/20 bg-red-500/10 text-red-500 hover:bg-red-500/20",
    orange: "border-orange-500/20 bg-orange-500/10 text-orange-500 hover:bg-orange-500/20",
    green: "border-emerald-500/20 bg-emerald-500/10 text-emerald-500 hover:bg-emerald-500/20",
    blue: "border-blue-500/20 bg-blue-500/10 text-blue-500 hover:bg-blue-500/20",
  }[tone];
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className={`flex flex-col items-center justify-center rounded-xl border ${cls} py-3 text-sm font-bold transition-colors disabled:opacity-50`}
    >
      <span>{label}</span>
      <span className="mt-0.5 text-[10px] font-medium opacity-70">{sub}</span>
    </button>
  );
}
