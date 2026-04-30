"use client";

import { api, type AutoJuryReviewResult } from "@/lib/api";
import type { AdminCopy } from "@/lib/admin-i18n";
import { Bot, Loader2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";

export function AutoJuryButton({ copy }: { copy: AdminCopy["review"] }) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<AutoJuryReviewResult | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function runAutoJury() {
    setLoading(true);
    setError(null);
    try {
      const next = await api.items.autoJuryReview();
      setResult(next);
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : copy.autoJuryError);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="flex flex-col items-start gap-2 sm:items-end">
      <button
        type="button"
        onClick={runAutoJury}
        disabled={loading}
        className="inline-flex items-center gap-2 rounded-lg bg-emerald-500 px-4 py-2.5 text-sm font-black text-white shadow-lg shadow-emerald-500/20 transition-colors hover:bg-emerald-400 disabled:cursor-not-allowed disabled:opacity-60"
      >
        {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Bot className="h-4 w-4" />}
        {loading ? copy.autoJuryRunning : copy.autoJury}
      </button>
      {result ? (
        <p className="text-xs font-medium text-slate-500 dark:text-slate-400">
          {copy.autoJuryResult
            .replace("{approved}", String(result.approved))
            .replace("{rejected}", String(result.rejected))
            .replace("{skipped}", String(result.skipped))}
        </p>
      ) : null}
      {error ? <p className="text-xs font-bold text-red-500">{error}</p> : null}
    </div>
  );
}
