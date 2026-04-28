import type { LLMCallRow } from "@/lib/api";
import type { AdminCopy } from "@/lib/admin-i18n";

export function CallsTable({ rows, copy, locale }: { rows: LLMCallRow[]; copy: AdminCopy["usage"]; locale: string }) {
  if (rows.length === 0) {
    return (
      <p className="mt-3 rounded border border-dashed border-[var(--color-border)] py-8 text-center text-sm text-[var(--color-muted-fg)]">
        {copy.emptyCalls}
      </p>
    );
  }
  return (
    <div className="mt-3 overflow-x-auto rounded border border-[var(--color-border)]">
      <table className="w-full text-xs">
        <thead className="bg-[var(--color-muted)]/40 text-left uppercase tracking-wider">
          <tr>
            <th className="px-3 py-2">{copy.table.time}</th>
            <th className="px-3 py-2">{copy.table.service}</th>
            <th className="px-3 py-2">{copy.table.purpose}</th>
            <th className="px-3 py-2">{copy.table.model}</th>
            <th className="px-3 py-2 text-right">{copy.table.tokens}</th>
            <th className="px-3 py-2 text-right">{copy.table.cost}</th>
            <th className="px-3 py-2 text-right">{copy.table.latency}</th>
            <th className="px-3 py-2">{copy.table.status}</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((r) => (
            <tr key={r.request_id} className="border-t border-[var(--color-border)]">
              <td className="px-3 py-1.5 font-mono">
                {new Date(r.ts).toLocaleTimeString(locale, { hour12: false })}
              </td>
              <td className="px-3 py-1.5 font-mono">{r.service}</td>
              <td className="px-3 py-1.5 font-mono">{r.purpose}</td>
              <td className="px-3 py-1.5 font-mono">{r.model}</td>
              <td className="px-3 py-1.5 text-right font-mono">
                {r.tokens_in.toLocaleString()} / {r.tokens_out.toLocaleString()}
              </td>
              <td className="px-3 py-1.5 text-right font-mono">${Number(r.cost_usd).toFixed(5)}</td>
              <td className="px-3 py-1.5 text-right font-mono">{r.latency_ms}ms</td>
              <td className="px-3 py-1.5">
                <span
                  className={`rounded px-1.5 py-0.5 font-mono ${
                    r.status === "success"
                      ? "bg-green-500/10 text-green-700"
                      : "bg-red-500/10 text-red-700"
                  }`}
                >
                  {r.status}
                </span>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
