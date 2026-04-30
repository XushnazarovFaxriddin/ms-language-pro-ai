"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { ApiError, api } from "@/lib/api";
import type { AdminCopy } from "@/lib/admin-i18n";
import { Zap, Target, BookOpen, Layers, Loader2, Sparkles } from "lucide-react";

const SKILLS = [
  { v: "reading", l: "Reading" },
  { v: "listening", l: "Listening" },
  { v: "writing", l: "Writing" },
  { v: "speaking", l: "Speaking" },
];

const LEVELS = ["A2", "B1", "B2", "C1", "C2"];

export function GenerationForm({ copy }: { copy: AdminCopy["generation"] }) {
  const router = useRouter();
  const [skill, setSkill] = useState("reading");
  const [cefr, setCefr] = useState("B1");
  const [topic, setTopic] = useState<string>(copy.defaultTopic);
  const [count, setCount] = useState(3);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  return (
    <form
      onSubmit={async (e) => {
        e.preventDefault();
        setError(null);
        setPending(true);
        try {
          const job = await api.generation.create({
            skill,
            cefr_level: cefr,
            topic,
            count,
          });
          router.push(`/generation/jobs/${job.id}`);
        } catch (err) {
          setError(err instanceof ApiError ? err.detail : copy.errorFallback);
          setPending(false);
        }
      }}
      className="grid gap-8"
    >
      <div className="grid gap-6 sm:grid-cols-2">
        <div className="space-y-2">
          <label className="flex items-center gap-2 text-sm font-semibold text-slate-700 dark:text-slate-300 ml-1">
            <Zap className="h-4 w-4 text-emerald-400" />
            {copy.fields.skill}
          </label>
          <select 
            value={skill} 
            onChange={(e) => setSkill(e.target.value)} 
            className="w-full rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900/50 px-4 py-3 text-slate-900 dark:text-white outline-none focus:border-emerald-500/50 focus:ring-2 focus:ring-emerald-500/20 transition-all appearance-none cursor-pointer"
          >
            {SKILLS.map((s) => (
              <option key={s.v} value={s.v} className="bg-white dark:bg-slate-900 text-slate-900 dark:text-white">
                {s.l}
              </option>
            ))}
          </select>
        </div>

        <div className="space-y-2">
          <label className="flex items-center gap-2 text-sm font-semibold text-slate-700 dark:text-slate-300 ml-1">
            <Layers className="h-4 w-4 text-emerald-400" />
            {copy.fields.cefr}
          </label>
          <div className="flex flex-wrap gap-2">
            {LEVELS.map((l) => (
              <button
                key={l}
                type="button"
                onClick={() => setCefr(l)}
                className={`flex-1 rounded-xl border px-3 py-2.5 text-sm font-bold transition-all ${
                  cefr === l
                    ? "bg-emerald-500 text-white border-emerald-500 shadow-lg shadow-emerald-500/20"
                    : "bg-white dark:bg-slate-900/50 text-slate-600 dark:text-slate-400 border-slate-200 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700"
                }`}
              >
                {l}
              </button>
            ))}
          </div>
        </div>
      </div>

      <div className="space-y-2">
        <label className="flex items-center gap-2 text-sm font-semibold text-slate-700 dark:text-slate-300 ml-1">
          <BookOpen className="h-4 w-4 text-emerald-400" />
          {copy.fields.topic}
        </label>
        <input
          type="text"
          required
          placeholder={copy.topicPlaceholder}
          value={topic}
          onChange={(e) => setTopic(e.target.value)}
          className="w-full rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900/50 px-4 py-3 text-slate-900 dark:text-white placeholder-slate-400 dark:placeholder-slate-600 outline-none focus:border-emerald-500/50 focus:ring-2 focus:ring-emerald-500/20 transition-all"
        />
      </div>

      <div className="space-y-2">
        <label className="flex items-center gap-2 text-sm font-semibold text-slate-700 dark:text-slate-300 ml-1">
          <Target className="h-4 w-4 text-emerald-400" />
          {copy.fields.count}
        </label>
        <div className="flex items-center gap-4">
          <input
            type="range"
            min={1}
            max={50}
            step={1}
            value={count}
            onChange={(e) => setCount(Number(e.target.value))}
            className="flex-1 accent-emerald-500"
          />
          <span className="flex h-12 w-16 items-center justify-center rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-lg font-black text-emerald-600 dark:text-emerald-400">
            {count}
          </span>
        </div>
      </div>

      {error && (
        <div className="rounded-2xl border border-red-500/20 bg-red-500/5 px-4 py-3 text-sm text-red-400">
          {error}
        </div>
      )}

      <button
        type="submit"
        disabled={pending}
        className="group relative flex w-full items-center justify-center gap-3 overflow-hidden rounded-2xl bg-gradient-to-br from-emerald-500 to-teal-600 px-8 py-4 font-bold text-white shadow-xl shadow-emerald-500/20 transition-all hover:scale-[1.01] hover:shadow-emerald-500/30 active:scale-[0.99] disabled:opacity-50"
      >
        {pending ? (
          <Loader2 className="h-5 w-5 animate-spin" />
        ) : (
          <>
            <Sparkles className="h-5 w-5" />
            {copy.start}
          </>
        )}
      </button>

      <div className="rounded-2xl bg-emerald-500/5 p-4 border border-emerald-500/10 text-xs text-slate-600 dark:text-slate-400 leading-relaxed">
        <span className="font-bold text-emerald-400 uppercase tracking-widest block mb-1">{copy.noteTitle}</span>
        {copy.note}
      </div>
    </form>
  );
}
