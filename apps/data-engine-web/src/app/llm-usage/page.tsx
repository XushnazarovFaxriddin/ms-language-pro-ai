import { api } from "@/lib/api";
import { getCookieHeader, requireAdmin } from "@/lib/auth-server";
import { AdminShell } from "@/components/AdminShell";
import { TimeseriesChart } from "./TimeseriesChart";
import { ModelBreakdownChart } from "./ModelBreakdownChart";
import { CallsTable } from "./CallsTable";

export default async function LLMUsagePage({
  searchParams,
}: {
  searchParams: Promise<{ period?: "24h" | "7d" | "30d" }>;
}) {
  const sp = await searchParams;
  const period = sp.period ?? "7d";
  const user = await requireAdmin("/llm-usage");
  const ck = await getCookieHeader();
  const [summary, byPurpose, byModel, timeseries, calls] = await Promise.all([
    api.usage.summary(period, ck).catch(() => null),
    api.usage.byPurpose(period, ck).catch(() => []),
    api.usage.byModel(period, ck).catch(() => []),
    api.usage.timeseries(period, "day", ck).catch(() => []),
    api.usage.calls(50, ck).catch(() => []),
  ]);

  return (
    <AdminShell user={user}>
      <main className="px-8 py-10">
        <div className="flex items-center justify-between">
          <h1 className="text-3xl font-bold">LLM xarajat dashboardi</h1>
          <PeriodPicker current={period} />
        </div>

        <section className="mt-8 grid gap-4 sm:grid-cols-4">
          <Stat title="Jami xarajat" value={summary ? `$${Number(summary.total_cost_usd).toFixed(4)}` : "—"} />
          <Stat title="Chaqiruvlar" value={summary ? String(summary.total_calls) : "—"} />
          <Stat
            title="Tokenlar (in / out)"
            value={summary ? `${summary.total_tokens_in.toLocaleString()} / ${summary.total_tokens_out.toLocaleString()}` : "—"}
          />
          <Stat title="O'rtacha latency" value={summary ? `${summary.avg_latency_ms} ms` : "—"} />
        </section>

        <section className="mt-10">
          <h2 className="text-lg font-semibold">Vaqt bo&apos;yicha ({period}, kun)</h2>
          <div className="mt-3 rounded border border-[var(--color-border)] p-4">
            <TimeseriesChart data={timeseries} />
          </div>
        </section>

        <section className="mt-10 grid gap-6 lg:grid-cols-2">
          <div>
            <h2 className="text-lg font-semibold">Maqsad bo&apos;yicha</h2>
            <table className="mt-3 w-full text-sm">
              <thead className="border-b border-[var(--color-border)] text-left text-xs uppercase tracking-wider text-[var(--color-muted-fg)]">
                <tr>
                  <th className="py-2">Purpose</th>
                  <th className="py-2 text-right">Calls</th>
                  <th className="py-2 text-right">Tokens (in/out)</th>
                  <th className="py-2 text-right">Cost</th>
                </tr>
              </thead>
              <tbody>
                {byPurpose.map((p) => (
                  <tr key={p.purpose} className="border-b border-[var(--color-border)]/50">
                    <td className="py-2 font-mono text-xs">{p.purpose}</td>
                    <td className="py-2 text-right">{p.calls}</td>
                    <td className="py-2 text-right text-xs">
                      {p.tokens_in.toLocaleString()} / {p.tokens_out.toLocaleString()}
                    </td>
                    <td className="py-2 text-right font-mono">${Number(p.cost_usd).toFixed(4)}</td>
                  </tr>
                ))}
                {byPurpose.length === 0 && (
                  <tr>
                    <td colSpan={4} className="py-4 text-center text-[var(--color-muted-fg)]">
                      Ma&apos;lumot yo&apos;q
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>

          <div>
            <h2 className="text-lg font-semibold">Model bo&apos;yicha</h2>
            <div className="mt-3 rounded border border-[var(--color-border)] p-4">
              <ModelBreakdownChart data={byModel} />
            </div>
          </div>
        </section>

        <section className="mt-10">
          <h2 className="text-lg font-semibold">So&apos;nggi qo&apos;ng&apos;iroqlar (50)</h2>
          <CallsTable rows={calls} />
        </section>
      </main>
    </AdminShell>
  );
}

function Stat({ title, value }: { title: string; value: string }) {
  return (
    <div className="rounded border border-[var(--color-border)] p-5">
      <p className="text-xs uppercase tracking-wider text-[var(--color-muted-fg)]">{title}</p>
      <p className="mt-2 text-2xl font-bold">{value}</p>
    </div>
  );
}

function PeriodPicker({ current }: { current: string }) {
  return (
    <div className="flex gap-2">
      {(["24h", "7d", "30d"] as const).map((p) => (
        <a
          key={p}
          href={`?period=${p}`}
          className={`rounded px-3 py-1.5 text-sm ${
            p === current
              ? "bg-[var(--color-primary)] text-[var(--color-primary-fg)]"
              : "border border-[var(--color-border)] hover:border-[var(--color-primary)]"
          }`}
        >
          {p}
        </a>
      ))}
    </div>
  );
}
