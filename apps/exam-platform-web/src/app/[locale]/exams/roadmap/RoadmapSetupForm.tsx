"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { api } from "@/lib/api";
import { Loader2, Map, Calendar, Target, X } from "lucide-react";

export type RoadmapFormInitial = {
  target_band?: number;
  target_date?: string;
  weekly_hours?: number;
  weeks_until_target?: number;
  focus_skill?: "listening" | "reading" | "writing" | "speaking";
};

export function RoadmapSetupForm({
  mode = "setup",
  initial,
  onCancel,
}: {
  mode?: "setup" | "regenerate";
  initial?: RoadmapFormInitial;
  onCancel?: () => void;
}) {
  const t = useTranslations("Roadmap.setup");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const defaults: Required<RoadmapFormInitial> = {
    target_band: initial?.target_band ?? 7.0,
    target_date:
      initial?.target_date ??
      (new Date(Date.now() + 60 * 24 * 60 * 60 * 1000).toISOString().split("T")[0] as string),
    weekly_hours: initial?.weekly_hours ?? 10,
    weeks_until_target: initial?.weeks_until_target ?? 8,
    focus_skill: initial?.focus_skill ?? "writing",
  };

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setLoading(true);
    setError("");

    const formData = new FormData(e.currentTarget);
    try {
      await api.roadmap.regenerate({
        target_band: parseFloat(formData.get("target_band") as string),
        target_date: formData.get("target_date") as string,
        weekly_hours: parseInt(formData.get("weekly_hours") as string, 10),
        focus_skill: formData.get("focus_skill") as any,
        weeks_until_target: parseInt(formData.get("weeks_until_target") as string, 10),
      });
      window.location.reload();
    } catch (err: any) {
      setError(err instanceof Error ? err.message : t("error"));
      setLoading(false);
    }
  };

  const showHero = mode === "setup";

  return (
    <div className="mx-auto max-w-2xl space-y-8 py-12">
      {showHero && (
        <>
          <div className="flex justify-center">
            <div className="flex h-20 w-20 items-center justify-center rounded-3xl bg-[var(--color-primary)]/10 text-[var(--color-primary)] shadow-inner">
              <Map className="h-10 w-10" />
            </div>
          </div>
          <div className="text-center">
            <h1 className="text-4xl font-black tracking-tight">{t("title")}</h1>
            <p className="mt-4 text-lg text-[var(--color-muted-fg)]">{t("description")}</p>
          </div>
        </>
      )}

      <div className="rounded-3xl border border-[var(--color-border)]/50 bg-[var(--color-bg)] p-8 shadow-xl text-left">
        {!showHero && (
          <div className="mb-6 flex items-start justify-between gap-4">
            <div>
              <h2 className="text-xl font-bold">{t("regenerateTitle")}</h2>
              <p className="mt-1 text-sm text-[var(--color-muted-fg)]">{t("regenerateDescription")}</p>
            </div>
            {onCancel && (
              <button
                type="button"
                onClick={onCancel}
                className="rounded-full p-2 text-[var(--color-muted-fg)] transition-colors hover:bg-[var(--color-muted)]/30 hover:text-[var(--color-fg)]"
                aria-label={t("cancel")}
              >
                <X className="h-5 w-5" />
              </button>
            )}
          </div>
        )}

        {error && (
          <div className="mb-6 rounded-xl bg-red-500/10 border border-red-500/20 p-4 text-sm font-medium text-red-600">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="grid grid-cols-2 gap-6">
            <div>
              <label htmlFor="rm-target-band" className="block text-sm font-bold mb-2">{t("targetBand")}</label>
              <div className="relative">
                <Target className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-[var(--color-muted-fg)]" />
                <input id="rm-target-band" aria-label={t("targetBand")} required type="number" step="0.5" min="4.0" max="9.0" defaultValue={defaults.target_band} name="target_band" className="w-full rounded-xl border border-[var(--color-border)]/50 bg-[var(--color-muted)]/20 pl-12 pr-4 py-3 font-medium focus:border-[var(--color-primary)] focus:outline-none" />
              </div>
            </div>
            <div>
              <label htmlFor="rm-target-date" className="block text-sm font-bold mb-2">{t("examDate")}</label>
              <div className="relative">
                <Calendar className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-[var(--color-muted-fg)]" />
                <input id="rm-target-date" aria-label={t("examDate")} required type="date" name="target_date" defaultValue={defaults.target_date} className="w-full rounded-xl border border-[var(--color-border)]/50 bg-[var(--color-muted)]/20 pl-12 pr-4 py-3 font-medium focus:border-[var(--color-primary)] focus:outline-none" />
              </div>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-6">
            <div>
              <label htmlFor="rm-weekly-hours" className="block text-sm font-bold mb-2">{t("weeklyHours")}</label>
              <input id="rm-weekly-hours" aria-label={t("weeklyHours")} required type="number" min="1" max="40" defaultValue={defaults.weekly_hours} name="weekly_hours" className="w-full rounded-xl border border-[var(--color-border)]/50 bg-[var(--color-muted)]/20 px-4 py-3 font-medium focus:border-[var(--color-primary)] focus:outline-none" />
            </div>
            <div>
              <label htmlFor="rm-weeks-left" className="block text-sm font-bold mb-2">{t("weeksLeft")}</label>
              <input id="rm-weeks-left" aria-label={t("weeksLeft")} required type="number" min="4" max="12" defaultValue={defaults.weeks_until_target} name="weeks_until_target" className="w-full rounded-xl border border-[var(--color-border)]/50 bg-[var(--color-muted)]/20 px-4 py-3 font-medium focus:border-[var(--color-primary)] focus:outline-none" />
            </div>
          </div>

          <div>
            <label htmlFor="rm-focus-skill" className="block text-sm font-bold mb-2">{t("focusSkill")}</label>
            <select id="rm-focus-skill" aria-label={t("focusSkill")} name="focus_skill" defaultValue={defaults.focus_skill} className="w-full rounded-xl border border-[var(--color-border)]/50 bg-[var(--color-muted)]/20 px-4 py-3 font-medium focus:border-[var(--color-primary)] focus:outline-none">
              <option value="listening">Listening</option>
              <option value="reading">Reading</option>
              <option value="writing">Writing</option>
              <option value="speaking">Speaking</option>
            </select>
          </div>

          <button disabled={loading} type="submit" className="flex w-full items-center justify-center gap-2 rounded-xl bg-[var(--color-primary)] py-4 text-sm font-bold text-white transition-all hover:opacity-90 disabled:opacity-50 mt-4">
            {loading ? <Loader2 className="h-5 w-5 animate-spin" /> : <Map className="h-5 w-5" />}
            {mode === "regenerate" ? t("submitRegenerate") : t("submit")}
          </button>
        </form>
      </div>
    </div>
  );
}
