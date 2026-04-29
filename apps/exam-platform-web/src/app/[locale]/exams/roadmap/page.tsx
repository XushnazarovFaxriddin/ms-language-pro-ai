import { getLocale, getTranslations } from "next-intl/server";
import { getCookieHeader } from "@/lib/auth-server";
import { api, ApiError, type RoadmapOut } from "@/lib/api";
import { RoadmapSetupForm } from "./RoadmapSetupForm";
import { RoadmapRegenerateButton } from "./RoadmapRegenerateButton";
import { Map, Target, Calendar, Clock, Award, Zap } from "lucide-react";

export default async function RoadmapPage() {
  const ck = await getCookieHeader();
  if (!ck) return null;
  const t = await getTranslations("Roadmap");
  const locale = await getLocale();

  let roadmap: RoadmapOut | null = null;
  try {
    roadmap = await api.roadmap.get(ck);
  } catch (err: unknown) {
    if (!(err instanceof ApiError) || err.status !== 404) {
      console.error("Failed to fetch roadmap:", err);
    }
  }

  if (!roadmap) {
    return <RoadmapSetupForm />;
  }

  // Calculate some simple stats based on the returned roadmap
  const p10 = roadmap.predicted_band_at_target?.p10?.toFixed(1) || "-";
  const p50 = roadmap.predicted_band_at_target?.p50?.toFixed(1) || "-";
  const p90 = roadmap.predicted_band_at_target?.p90?.toFixed(1) || "-";
  const narrative = locale === "en" ? roadmap.plan.narrative_en : roadmap.plan.narrative_uz;

  const focusSkill = (roadmap.plan.milestones[0]?.skill_focus[0] ?? "writing") as
    | "listening"
    | "reading"
    | "writing"
    | "speaking";

  return (
    <div className="mx-auto max-w-5xl space-y-8">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h1 className="text-3xl font-extrabold tracking-tight flex items-center gap-3">
            <Map className="h-8 w-8 text-[var(--color-primary)]" />
            {t("title")}
          </h1>
          <p className="mt-2 text-[var(--color-muted-fg)]">
            {t("description")}
          </p>
        </div>
        <RoadmapRegenerateButton
          initial={{
            target_band: roadmap.target_band,
            target_date: roadmap.target_date,
            weekly_hours: roadmap.weekly_hours,
            weeks_until_target: roadmap.plan.milestones.length || 8,
            focus_skill: focusSkill,
          }}
        />
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="rounded-2xl border border-[var(--color-border)]/50 bg-[var(--color-bg)] p-5 shadow-sm">
          <div className="flex items-center gap-2 text-[var(--color-muted-fg)] mb-2">
            <Target className="h-4 w-4" />
            <span className="text-xs font-bold uppercase tracking-wider">{t("stats.target")}</span>
          </div>
          <div className="text-3xl font-black">{roadmap.target_band.toFixed(1)}</div>
        </div>
        <div className="rounded-2xl border border-[var(--color-border)]/50 bg-[var(--color-bg)] p-5 shadow-sm">
          <div className="flex items-center gap-2 text-[var(--color-muted-fg)] mb-2">
            <Calendar className="h-4 w-4" />
            <span className="text-xs font-bold uppercase tracking-wider">{t("stats.date")}</span>
          </div>
          <div className="text-xl font-bold mt-1">{roadmap.target_date}</div>
        </div>
        <div className="rounded-2xl border border-[var(--color-border)]/50 bg-[var(--color-bg)] p-5 shadow-sm">
          <div className="flex items-center gap-2 text-[var(--color-muted-fg)] mb-2">
            <Clock className="h-4 w-4" />
            <span className="text-xs font-bold uppercase tracking-wider">{t("stats.weeklyTime")}</span>
          </div>
          <div className="text-xl font-bold mt-1">{t("stats.hours", { count: roadmap.weekly_hours })}</div>
        </div>
        <div className="rounded-2xl border border-[var(--color-primary)]/20 bg-gradient-to-br from-[var(--color-primary)]/10 to-transparent p-5 shadow-sm">
          <div className="flex items-center gap-2 text-[var(--color-primary)] mb-2">
            <Award className="h-4 w-4" />
            <span className="text-xs font-bold uppercase tracking-wider">{t("stats.forecast")}</span>
          </div>
          <div className="text-3xl font-black text-[var(--color-primary)]">{p50}</div>
          <div className="text-xs text-[var(--color-muted-fg)] mt-1">P10: {p10} | P90: {p90}</div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2 space-y-6">
          <h2 className="text-xl font-bold">{t("weeklyMilestones")}</h2>
          <div className="space-y-4">
            {roadmap.plan.milestones.map((ms, i) => (
              <div key={i} className="flex gap-4 relative">
                <div className="flex flex-col items-center">
                  <div className="h-8 w-8 rounded-full bg-[var(--color-primary)]/10 flex items-center justify-center text-sm font-bold text-[var(--color-primary)]">
                    {ms.week}
                  </div>
                  {i < roadmap.plan.milestones.length - 1 && (
                    <div className="w-0.5 h-full bg-[var(--color-border)]/50 my-1" />
                  )}
                </div>
                <div className="pb-8 flex-1">
                  <div className="rounded-2xl border border-[var(--color-border)]/50 bg-[var(--color-bg)] p-5 shadow-sm">
                    <h3 className="font-bold text-lg">{ms.theme}</h3>
                    <div className="flex gap-2 mt-2">
                      {ms.skill_focus.map(s => (
                        <span key={s} className="px-2 py-1 rounded text-xs font-bold bg-[var(--color-muted)]/50 text-[var(--color-muted-fg)] uppercase">
                          {s}
                        </span>
                      ))}
                    </div>
                    <p className="mt-4 text-sm text-[var(--color-muted-fg)]">
                      {t.rich("expectedGrowth", {
                        value: ms.expected_band_lift.toFixed(1),
                        span: (chunks) => <span className="font-bold text-[var(--color-fg)]">{chunks}</span>,
                      })}
                    </p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
        
        <div className="space-y-6">
          <div className="rounded-3xl border border-[var(--color-border)]/50 bg-gradient-to-b from-[var(--color-muted)]/20 to-[var(--color-bg)] p-6">
            <h2 className="text-lg font-bold flex items-center gap-2 mb-6">
              <Zap className="h-5 w-5 text-yellow-500" />
              {t("dailyTasks")}
            </h2>
            <ul className="space-y-4">
              <li className="flex items-center justify-between border-b border-[var(--color-border)]/30 pb-4">
                <span className="text-sm font-medium">{t("daily.vocabulary")}</span>
                <span className="font-bold">{t("daily.cardsUnit", { count: roadmap.plan.daily_targets.vocabulary_cards })}</span>
              </li>
              <li className="flex items-center justify-between border-b border-[var(--color-border)]/30 pb-4">
                <span className="text-sm font-medium">{t("daily.drills")}</span>
                <span className="font-bold">{t("daily.minutesUnit", { count: roadmap.plan.daily_targets.drill_minutes })}</span>
              </li>
              <li className="flex items-center justify-between border-b border-[var(--color-border)]/30 pb-4">
                <span className="text-sm font-medium">{t("daily.mock")}</span>
                <span className="font-bold">{t("daily.cardsUnit", { count: roadmap.plan.daily_targets.mock_questions })}</span>
              </li>
            </ul>
          </div>

          <div className="rounded-3xl border border-[var(--color-border)]/50 bg-[var(--color-bg)] p-6 text-sm text-[var(--color-muted-fg)] space-y-3">
            <p className="font-bold text-[var(--color-fg)]">{t("recommendation")}</p>
            <p>{narrative}</p>
          </div>
        </div>
      </div>
    </div>
  );
}
