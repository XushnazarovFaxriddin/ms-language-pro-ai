"use client";

import { useState } from "react";
import { api, SRSCardOut } from "@/lib/api";
import { Loader2, ArrowRight, PlayCircle, Target, CheckCircle2 } from "lucide-react";

export function PracticeClient({ initialQueue }: { initialQueue: SRSCardOut[] }) {
  const [queue, setQueue] = useState(initialQueue);
  const [loading, setLoading] = useState(false);

  // Drill state
  const [drillActive, setDrillActive] = useState(false);
  const [drillAttemptId, setDrillAttemptId] = useState<string | null>(null);
  const [drillLoading, setDrillLoading] = useState(false);

  const handleGrade = async (cardId: string, grade: "again" | "hard" | "good" | "easy") => {
    setLoading(true);
    try {
      await api.practice.gradeSRS({ card_id: cardId, grade });
      // Remove graded card
      setQueue(q => q.filter(c => c.id !== cardId));
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const startDrill = async () => {
    setDrillLoading(true);
    try {
      // Mock Drill ID for demonstration. In reality, user selects a drill.
      const drillId = "00000000-0000-0000-0000-000000000000"; 
      const attempt = await api.practice.startDrill(drillId, { items_total: 5 });
      setDrillAttemptId(attempt.id);
      setDrillActive(true);
    } catch (err) {
      console.error(err);
      // For demo purposes if API fails:
      setDrillActive(true);
    } finally {
      setDrillLoading(false);
    }
  };

  const completeDrill = async () => {
    setDrillLoading(true);
    try {
      if (drillAttemptId) {
        await api.practice.completeDrill("00000000-0000-0000-0000-000000000000", drillAttemptId, { duration_ms: 120000 });
      }
    } catch (err) {
      console.error(err);
    } finally {
      setDrillActive(false);
      setDrillAttemptId(null);
      setDrillLoading(false);
    }
  };

  if (drillActive) {
    return (
      <div className="rounded-3xl border border-[var(--color-border)]/50 bg-[var(--color-bg)] p-8 shadow-xl text-center space-y-6">
        <Target className="h-12 w-12 text-[var(--color-primary)] mx-auto" />
        <h2 className="text-2xl font-bold">Drill Mashg'uloti Jarayonda</h2>
        <p className="text-[var(--color-muted-fg)] max-w-md mx-auto">
          Bu yerda haqiqiy drill savollari ketma-ket chiqadi. Har biriga javob berganingizda submitDrillItem ishlaydi.
        </p>
        <button 
          onClick={completeDrill}
          disabled={drillLoading}
          className="flex items-center justify-center gap-2 rounded-xl bg-[var(--color-primary)] px-6 py-3 font-bold text-white transition-all hover:opacity-90 mx-auto"
        >
          {drillLoading ? <Loader2 className="h-5 w-5 animate-spin" /> : <CheckCircle2 className="h-5 w-5" />}
          Mashqni yakunlash
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {/* Drill CTA */}
      <div className="rounded-3xl border border-[var(--color-primary)]/20 bg-gradient-to-r from-[var(--color-primary)]/10 to-transparent p-6 shadow-sm flex flex-col sm:flex-row items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-[var(--color-primary)]">Yangi Drill Boshlash</h2>
          <p className="text-sm text-[var(--color-muted-fg)] mt-1">Siz uchun eng kerakli mavzularda 5 ta savol.</p>
        </div>
        <button 
          onClick={startDrill}
          disabled={drillLoading}
          className="flex whitespace-nowrap items-center gap-2 rounded-xl bg-[var(--color-primary)] px-5 py-3 font-bold text-white transition-all hover:opacity-90 shadow-lg shadow-[var(--color-primary)]/20"
        >
          {drillLoading ? <Loader2 className="h-5 w-5 animate-spin" /> : <PlayCircle className="h-5 w-5" />}
          Boshlash
        </button>
      </div>

      {/* SRS Queue */}
      <div>
        <h2 className="text-xl font-bold mb-4">Takrorlash uchun ({queue.length})</h2>
        {queue.length === 0 ? (
          <div className="rounded-2xl border border-[var(--color-border)]/50 bg-[var(--color-bg)] p-12 text-center text-[var(--color-muted-fg)]">
            Hozircha takrorlash uchun hech narsa yo'q! 🎉
          </div>
        ) : (
          <div className="space-y-4">
            {queue.slice(0, 1).map(card => (
              <div key={card.id} className="rounded-3xl border border-[var(--color-border)]/50 bg-[var(--color-bg)] p-6 sm:p-8 shadow-xl">
                <div className="mb-8">
                  <span className="text-xs font-bold uppercase tracking-wider text-[var(--color-muted-fg)]">{card.ref_type}</span>
                  <pre className="mt-4 p-4 rounded-xl bg-[var(--color-muted)]/20 overflow-x-auto text-sm font-mono whitespace-pre-wrap border border-[var(--color-border)]/30">
                    {JSON.stringify(card.payload, null, 2)}
                  </pre>
                </div>
                
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 sm:gap-4">
                  <button onClick={() => handleGrade(card.id, "again")} disabled={loading} className="rounded-xl border border-red-500/20 bg-red-500/10 py-3 text-sm font-bold text-red-500 hover:bg-red-500/20 transition-colors">Qayta</button>
                  <button onClick={() => handleGrade(card.id, "hard")} disabled={loading} className="rounded-xl border border-orange-500/20 bg-orange-500/10 py-3 text-sm font-bold text-orange-500 hover:bg-orange-500/20 transition-colors">Qiyin</button>
                  <button onClick={() => handleGrade(card.id, "good")} disabled={loading} className="rounded-xl border border-emerald-500/20 bg-emerald-500/10 py-3 text-sm font-bold text-emerald-500 hover:bg-emerald-500/20 transition-colors">Yaxshi</button>
                  <button onClick={() => handleGrade(card.id, "easy")} disabled={loading} className="rounded-xl border border-blue-500/20 bg-blue-500/10 py-3 text-sm font-bold text-blue-500 hover:bg-blue-500/20 transition-colors">Oson</button>
                </div>
              </div>
            ))}
            {queue.length > 1 && (
              <div className="text-center text-sm font-bold text-[var(--color-muted-fg)] pt-2">
                Va yana {queue.length - 1} ta karta bor...
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
