"use client";

import { useState } from "react";
import { api } from "@/lib/api";
import { Loader2, Map, Calendar, Target } from "lucide-react";
import { useRouter } from "next/navigation";

export function RoadmapSetupForm() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const router = useRouter();

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
      // Refresh page to load the new roadmap
      window.location.reload();
    } catch (err: any) {
      setError(err.message || "Xatolik yuz berdi");
      setLoading(false);
    }
  };

  return (
    <div className="mx-auto max-w-2xl text-center space-y-8 py-12">
      <div className="flex justify-center">
        <div className="flex h-20 w-20 items-center justify-center rounded-3xl bg-[var(--color-primary)]/10 text-[var(--color-primary)] shadow-inner">
          <Map className="h-10 w-10" />
        </div>
      </div>
      
      <div>
        <h1 className="text-4xl font-black tracking-tight">Shaxsiy reja yarating</h1>
        <p className="mt-4 text-lg text-[var(--color-muted-fg)]">
          Maqsadingiz va bo'sh vaqtingizni kiriting. AI siz uchun eng optimal tayyorgarlik strategiyasini ishlab chiqadi.
        </p>
      </div>

      <div className="rounded-3xl border border-[var(--color-border)]/50 bg-[var(--color-bg)] p-8 shadow-xl text-left">
        {error && (
          <div className="mb-6 rounded-xl bg-red-500/10 border border-red-500/20 p-4 text-sm font-medium text-red-600">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="grid grid-cols-2 gap-6">
            <div>
              <label className="block text-sm font-bold mb-2">Maqsad (IELTS Band)</label>
              <div className="relative">
                <Target className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-[var(--color-muted-fg)]" />
                <input required type="number" step="0.5" min="4.0" max="9.0" defaultValue="7.0" name="target_band" className="w-full rounded-xl border border-[var(--color-border)]/50 bg-[var(--color-muted)]/20 pl-12 pr-4 py-3 font-medium focus:border-[var(--color-primary)] focus:outline-none" />
              </div>
            </div>
            <div>
              <label className="block text-sm font-bold mb-2">Imtihon sanasi</label>
              <div className="relative">
                <Calendar className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-[var(--color-muted-fg)]" />
                <input required type="date" name="target_date" defaultValue={new Date(Date.now() + 60 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]} className="w-full rounded-xl border border-[var(--color-border)]/50 bg-[var(--color-muted)]/20 pl-12 pr-4 py-3 font-medium focus:border-[var(--color-primary)] focus:outline-none" />
              </div>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-6">
            <div>
              <label className="block text-sm font-bold mb-2">Haftalik ajratiladigan vaqt (soat)</label>
              <input required type="number" min="1" max="40" defaultValue="10" name="weekly_hours" className="w-full rounded-xl border border-[var(--color-border)]/50 bg-[var(--color-muted)]/20 px-4 py-3 font-medium focus:border-[var(--color-primary)] focus:outline-none" />
            </div>
            <div>
              <label className="block text-sm font-bold mb-2">Necha hafta qoldi?</label>
              <input required type="number" min="4" max="12" defaultValue="8" name="weeks_until_target" className="w-full rounded-xl border border-[var(--color-border)]/50 bg-[var(--color-muted)]/20 px-4 py-3 font-medium focus:border-[var(--color-primary)] focus:outline-none" />
            </div>
          </div>

          <div>
            <label className="block text-sm font-bold mb-2">Asosiy e'tibor (Skill)</label>
            <select name="focus_skill" defaultValue="writing" className="w-full rounded-xl border border-[var(--color-border)]/50 bg-[var(--color-muted)]/20 px-4 py-3 font-medium focus:border-[var(--color-primary)] focus:outline-none">
              <option value="listening">Listening</option>
              <option value="reading">Reading</option>
              <option value="writing">Writing</option>
              <option value="speaking">Speaking</option>
            </select>
          </div>

          <button disabled={loading} type="submit" className="flex w-full items-center justify-center gap-2 rounded-xl bg-[var(--color-primary)] py-4 text-sm font-bold text-white transition-all hover:opacity-90 disabled:opacity-50 mt-4">
            {loading ? <Loader2 className="h-5 w-5 animate-spin" /> : <Map className="h-5 w-5" />}
            Rejani shakllantirish
          </button>
        </form>
      </div>
    </div>
  );
}
