"use client";

import { useEffect, useState } from "react";
import { api, type GenerationJob } from "@/lib/api";
import { Loader2, CheckCircle2, AlertCircle, Clock, BarChart3, Settings2 } from "lucide-react";

export function JobPoller({ jobId, initial }: { jobId: string; initial: GenerationJob }) {
  const [job, setJob] = useState(initial);

  useEffect(() => {
    if (job.status === "done" || job.status === "error") return;
    const t = setInterval(async () => {
      try {
        const j = await api.generation.get(jobId);
        setJob(j);
        if (j.status === "done" || j.status === "error") clearInterval(t);
      } catch {
        /* ignore transient errors */
      }
    }, 2000);
    return () => clearInterval(t);
  }, [jobId, job.status]);

  const totals = job.totals ?? {};
  const total = Object.values(totals).reduce((a, b) => a + (b ?? 0), 0);
  const target = Number(job.params?.count ?? 0);
  const pct = target > 0 ? Math.min(100, Math.round((total / target) * 100)) : 0;

  const getStatusIcon = () => {
    if (job.status === "done") return <CheckCircle2 className="h-5 w-5 text-emerald-400" />;
    if (job.status === "error") return <AlertCircle className="h-5 w-5 text-red-400" />;
    return <Loader2 className="h-5 w-5 text-emerald-400 animate-spin" />;
  };

  return (
    <div className="space-y-8 animate-in fade-in duration-700">
      {/* Status Card */}
      <div className="overflow-hidden rounded-3xl border border-slate-800/60 bg-slate-900/40 p-6 backdrop-blur-xl">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <div className={`flex h-10 w-10 items-center justify-center rounded-xl ${job.status === "done" ? "bg-emerald-500/20" : "bg-emerald-500/10"}`}>
              {getStatusIcon()}
            </div>
            <div>
              <p className="text-xs font-bold uppercase tracking-widest text-slate-500">Job Status</p>
              <h3 className="text-xl font-black text-white capitalize">{job.status}</h3>
            </div>
          </div>
          <div className="text-right">
            <p className="text-xs font-bold uppercase tracking-widest text-slate-500">Progress</p>
            <p className="text-xl font-black text-emerald-400">{pct}%</p>
          </div>
        </div>

        <div className="relative h-3 w-full overflow-hidden rounded-full bg-slate-800 shadow-inner">
          <div
            className="h-full bg-gradient-to-r from-emerald-500 to-teal-400 transition-all duration-1000 ease-out shadow-[0_0_15px_rgba(16,185,129,0.4)]"
            style={{ width: `${pct}%` }}
          />
        </div>
        <div className="mt-3 flex justify-between text-xs font-bold text-slate-500 uppercase tracking-tighter">
          <span>{total} savol tayyor</span>
          <span>{target} jami kutilmoqda</span>
        </div>
      </div>

      <div className="grid gap-8 lg:grid-cols-2">
        {/* Parameters */}
        <div className="space-y-4">
          <div className="flex items-center gap-2 text-sm font-bold uppercase tracking-widest text-slate-400">
            <Settings2 className="h-4 w-4" />
            Parametrlar
          </div>
          <div className="rounded-3xl border border-slate-800/60 bg-black/40 p-6 font-mono text-sm">
            <div className="grid grid-cols-2 gap-4">
              {Object.entries(job.params || {}).map(([k, v]) => (
                <div key={k} className="space-y-1">
                  <p className="text-[10px] text-slate-500 uppercase font-bold">{k}</p>
                  <p className="text-slate-200 truncate">{String(v)}</p>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Breakdown */}
        <div className="space-y-4">
          <div className="flex items-center gap-2 text-sm font-bold uppercase tracking-widest text-slate-400">
            <BarChart3 className="h-4 w-4" />
            Natijalar tahlili
          </div>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
            {([
              { key: "approved", label: "Tasdiqlandi", color: "text-emerald-400" },
              { key: "in_review", label: "Ko'rib chiqilmoqda", color: "text-yellow-400" },
              { key: "rejected_jury", label: "Jury rad etdi", color: "text-orange-400" },
              { key: "rejected_dup", label: "Dublikat", color: "text-purple-400" },
              { key: "draft", label: "Qoralama", color: "text-slate-400" },
              { key: "error", label: "Xatolik", color: "text-red-400" },
            ]).map(({ key, label, color }) => (
              <div
                key={key}
                className="group relative overflow-hidden rounded-2xl border border-slate-800/60 bg-black/40 p-4 transition-all hover:border-emerald-500/30"
              >
                <div className="absolute -right-4 -top-4 h-12 w-12 rounded-full bg-white/5 opacity-0 transition-opacity group-hover:opacity-100" />
                <p className="text-[10px] font-bold uppercase tracking-tighter text-slate-500">{label}</p>
                <p className={`mt-1 text-2xl font-black ${color}`}>{totals[key] ?? 0}</p>
              </div>
            ))}
          </div>
        </div>
      </div>

      {job.status === "done" && (
        <div className="rounded-2xl bg-emerald-500/5 p-4 border border-emerald-500/10 flex items-center gap-4 animate-in slide-in-from-bottom-4">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-emerald-500/20 text-emerald-400">
            <CheckCircle2 className="h-6 w-6" />
          </div>
          <div>
            <p className="text-sm font-bold text-white">Generatsiya yakunlandi!</p>
            <p className="text-xs text-slate-400">Barcha savollar muvaffaqiyatli saqlandi. Endi ularni savollar bankida ko'rishingiz mumkin.</p>
          </div>
          <button 
            onClick={() => window.location.href = "/items"}
            className="ml-auto rounded-xl bg-emerald-500 px-4 py-2 text-xs font-bold text-white hover:bg-emerald-400 transition-colors"
          >
            Bankka o'tish
          </button>
        </div>
      )}
    </div>
  );
}
