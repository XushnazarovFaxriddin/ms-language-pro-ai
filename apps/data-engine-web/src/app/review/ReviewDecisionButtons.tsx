"use client";

import { api } from "@/lib/api";
import type { AdminCopy } from "@/lib/admin-i18n";
import { CheckCircle2, Eye, Loader2, XCircle } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";

export function ReviewDecisionButtons({
  itemId,
  copy,
}: {
  itemId: string;
  copy: AdminCopy["review"];
}) {
  const router = useRouter();
  const [pending, setPending] = useState<"approve" | "reject" | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function decide(action: "approve" | "reject") {
    setPending(action);
    setError(null);
    try {
      if (action === "approve") {
        await api.items.approve(itemId);
      } else {
        await api.items.reject(itemId);
      }
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : copy.decisionError);
    } finally {
      setPending(null);
    }
  }

  return (
    <div className="flex shrink-0 flex-col gap-2">
      <div className="flex flex-row gap-2 lg:flex-col">
        <button
          type="button"
          disabled={pending !== null}
          onClick={() => decide("approve")}
          className="flex flex-1 items-center justify-center gap-2 rounded-lg bg-emerald-500 px-4 py-3 text-sm font-black text-white shadow-lg shadow-emerald-500/10 transition-colors hover:bg-emerald-400 disabled:cursor-not-allowed disabled:opacity-60 lg:w-40"
        >
          {pending === "approve" ? <Loader2 className="h-4 w-4 animate-spin" /> : <CheckCircle2 className="h-4 w-4" />}
          {copy.approve}
        </button>
        <a
          href="/items?status=in_review"
          className="flex flex-1 items-center justify-center gap-2 rounded-lg border border-slate-200 bg-slate-100 px-4 py-3 text-sm font-black text-slate-700 transition-colors hover:bg-slate-200 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300 dark:hover:bg-slate-700 lg:w-40"
        >
          <Eye className="h-4 w-4" />
          {copy.view}
        </a>
        <button
          type="button"
          disabled={pending !== null}
          onClick={() => decide("reject")}
          className="flex flex-1 items-center justify-center gap-2 rounded-lg border border-red-500/20 bg-red-500/10 px-4 py-3 text-sm font-black text-red-600 transition-colors hover:bg-red-500/20 disabled:cursor-not-allowed disabled:opacity-60 dark:text-red-400 lg:w-40"
        >
          {pending === "reject" ? <Loader2 className="h-4 w-4 animate-spin" /> : <XCircle className="h-4 w-4" />}
          {copy.reject}
        </button>
      </div>
      {error ? <p className="text-xs font-bold text-red-500">{error}</p> : null}
    </div>
  );
}
