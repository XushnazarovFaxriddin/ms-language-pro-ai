import { getCookieHeader } from "@/lib/auth-server";
import { api, ApiError, type RoadmapOut } from "@/lib/api";
import { RoadmapSetupForm } from "./RoadmapSetupForm";
import { Map, Target, Calendar, Clock, Award, Zap } from "lucide-react";

export default async function RoadmapPage() {
  const ck = await getCookieHeader();
  if (!ck) return null;

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

  return (
    <div className="mx-auto max-w-5xl space-y-8">
      <div>
        <h1 className="text-3xl font-extrabold tracking-tight flex items-center gap-3">
          <Map className="h-8 w-8 text-[var(--color-primary)]" />
          Shaxsiy Reja (Roadmap)
        </h1>
        <p className="mt-2 text-[var(--color-muted-fg)]">
          Sizning maqsadingizga moslashtirilgan kunlik va haftalik mashg'ulotlar rejasi.
        </p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="rounded-2xl border border-[var(--color-border)]/50 bg-[var(--color-bg)] p-5 shadow-sm">
          <div className="flex items-center gap-2 text-[var(--color-muted-fg)] mb-2">
            <Target className="h-4 w-4" />
            <span className="text-xs font-bold uppercase tracking-wider">Maqsad</span>
          </div>
          <div className="text-3xl font-black">{roadmap.target_band.toFixed(1)}</div>
        </div>
        <div className="rounded-2xl border border-[var(--color-border)]/50 bg-[var(--color-bg)] p-5 shadow-sm">
          <div className="flex items-center gap-2 text-[var(--color-muted-fg)] mb-2">
            <Calendar className="h-4 w-4" />
            <span className="text-xs font-bold uppercase tracking-wider">Sana</span>
          </div>
          <div className="text-xl font-bold mt-1">{roadmap.target_date}</div>
        </div>
        <div className="rounded-2xl border border-[var(--color-border)]/50 bg-[var(--color-bg)] p-5 shadow-sm">
          <div className="flex items-center gap-2 text-[var(--color-muted-fg)] mb-2">
            <Clock className="h-4 w-4" />
            <span className="text-xs font-bold uppercase tracking-wider">Haftalik vaqt</span>
          </div>
          <div className="text-xl font-bold mt-1">{roadmap.weekly_hours} soat</div>
        </div>
        <div className="rounded-2xl border border-[var(--color-primary)]/20 bg-gradient-to-br from-[var(--color-primary)]/10 to-transparent p-5 shadow-sm">
          <div className="flex items-center gap-2 text-[var(--color-primary)] mb-2">
            <Award className="h-4 w-4" />
            <span className="text-xs font-bold uppercase tracking-wider">Prognoz (P50)</span>
          </div>
          <div className="text-3xl font-black text-[var(--color-primary)]">{p50}</div>
          <div className="text-xs text-[var(--color-muted-fg)] mt-1">P10: {p10} | P90: {p90}</div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2 space-y-6">
          <h2 className="text-xl font-bold">Haftalik bosqichlar</h2>
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
                      Kutilayotgan o'sish: <span className="font-bold text-[var(--color-fg)]">+{ms.expected_band_lift.toFixed(1)} band</span>
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
              Kunlik vazifalar
            </h2>
            <ul className="space-y-4">
              <li className="flex items-center justify-between border-b border-[var(--color-border)]/30 pb-4">
                <span className="text-sm font-medium">Lug'at kartochkalari</span>
                <span className="font-bold">{roadmap.plan.daily_targets.vocabulary_cards} ta</span>
              </li>
              <li className="flex items-center justify-between border-b border-[var(--color-border)]/30 pb-4">
                <span className="text-sm font-medium">Drill mashqlari</span>
                <span className="font-bold">{roadmap.plan.daily_targets.drill_minutes} min</span>
              </li>
              <li className="flex items-center justify-between border-b border-[var(--color-border)]/30 pb-4">
                <span className="text-sm font-medium">Mock savollar</span>
                <span className="font-bold">{roadmap.plan.daily_targets.mock_questions} ta</span>
              </li>
            </ul>
          </div>

          <div className="rounded-3xl border border-[var(--color-border)]/50 bg-[var(--color-bg)] p-6 text-sm text-[var(--color-muted-fg)] space-y-3">
            <p className="font-bold text-[var(--color-fg)]">Tavsiya:</p>
            <p>{roadmap.plan.narrative_uz}</p>
          </div>
        </div>
      </div>
    </div>
  );
}
