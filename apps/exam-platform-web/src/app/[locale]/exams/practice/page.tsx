import { getCookieHeader } from "@/lib/auth-server";
import { api, SRSCardOut, MasteryOut } from "@/lib/api";
import { Dumbbell, Brain, Target } from "lucide-react";
import { PracticeClient } from "./PracticeClient";

export default async function PracticePage() {
  const ck = await getCookieHeader();
  if (!ck) return null;

  let queue: SRSCardOut[] = [];
  let mastery: MasteryOut[] = [];

  try {
    const [qRes, mRes] = await Promise.all([
      api.practice.getSRSQueue(ck).catch(() => []),
      api.practice.getMastery(ck).catch(() => [])
    ]);
    queue = qRes;
    mastery = mRes;
  } catch (err) {
    console.error("Failed to fetch practice data", err);
  }

  // Sort mastery: weakest first
  mastery.sort((a, b) => a.mastery - b.mastery);

  return (
    <div className="mx-auto max-w-5xl space-y-8">
      <div>
        <h1 className="text-3xl font-extrabold tracking-tight flex items-center gap-3">
          <Dumbbell className="h-8 w-8 text-[var(--color-primary)]" />
          Amaliyot (Practice)
        </h1>
        <p className="mt-2 text-[var(--color-muted-fg)]">
          Kuchsiz tomonlaringizni mustahkamlash uchun SRS va Drill mashqlari.
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2">
          <PracticeClient initialQueue={queue} />
        </div>
        
        <div className="space-y-6">
          <div className="rounded-3xl border border-[var(--color-border)]/50 bg-[var(--color-bg)] p-6 shadow-sm">
            <h2 className="text-lg font-bold flex items-center gap-2 mb-6">
              <Brain className="h-5 w-5 text-purple-500" />
              O'zlashtirish (Mastery)
            </h2>
            
            {mastery.length === 0 ? (
              <p className="text-sm text-[var(--color-muted-fg)] text-center py-4">
                Hozircha ma'lumot yo'q. Imtihon topshiring.
              </p>
            ) : (
              <div className="space-y-4">
                {mastery.slice(0, 10).map(m => (
                  <div key={m.code}>
                    <div className="flex justify-between text-xs font-bold mb-1">
                      <span className="font-mono text-[var(--color-fg)]">{m.code}</span>
                      <span className={m.mastery < 0.5 ? "text-red-500" : m.mastery < 0.8 ? "text-yellow-500" : "text-emerald-500"}>
                        {Math.round(m.mastery * 100)}%
                      </span>
                    </div>
                    <div className="h-2 w-full bg-[var(--color-muted)]/30 rounded-full overflow-hidden">
                      <div 
                        className={`h-full rounded-full ${m.mastery < 0.5 ? "bg-red-500" : m.mastery < 0.8 ? "bg-yellow-500" : "bg-emerald-500"}`} 
                        style={{ width: `${Math.max(5, m.mastery * 100)}%` }} 
                      />
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
