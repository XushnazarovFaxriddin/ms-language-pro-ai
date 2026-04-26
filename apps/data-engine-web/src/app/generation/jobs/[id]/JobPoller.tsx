"use client";

import { useEffect, useState } from "react";
import { api, type GenerationJob } from "@/lib/api";

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

  return (
    <div className="mt-6 grid gap-6">
      <div>
        <div className="flex items-center justify-between text-sm">
          <span className="text-[var(--color-muted-fg)]">Holat</span>
          <span
            className={`rounded px-2 py-0.5 font-mono text-xs ${
              job.status === "done"
                ? "bg-green-500/10 text-green-700"
                : job.status === "error"
                ? "bg-red-500/10 text-red-700"
                : "bg-yellow-500/10 text-yellow-700"
            }`}
          >
            {job.status}
          </span>
        </div>
        <div className="mt-3 h-2 w-full overflow-hidden rounded bg-[var(--color-muted)]">
          <div
            className="h-full bg-[var(--color-primary)] transition-all"
            style={{ width: `${pct}%` }}
          />
        </div>
        <p className="mt-1 text-xs text-[var(--color-muted-fg)]">
          {total} / {target} ({pct}%)
        </p>
      </div>

      <div>
        <h2 className="text-sm font-medium">Parametrlar</h2>
        <pre className="mt-2 overflow-x-auto rounded bg-[var(--color-muted)] p-3 text-xs">
          {JSON.stringify(job.params, null, 2)}
        </pre>
      </div>

      <div>
        <h2 className="text-sm font-medium">Natijalar</h2>
        <div className="mt-2 grid grid-cols-2 gap-2 sm:grid-cols-3">
          {(["approved", "in_review", "rejected_dup", "rejected_jury", "draft", "error"] as const).map(
            (k) => (
              <div
                key={k}
                className="rounded border border-[var(--color-border)] p-3 text-sm"
              >
                <p className="text-xs text-[var(--color-muted-fg)]">{k}</p>
                <p className="mt-1 font-mono text-lg font-semibold">{totals[k] ?? 0}</p>
              </div>
            ),
          )}
        </div>
      </div>
    </div>
  );
}
