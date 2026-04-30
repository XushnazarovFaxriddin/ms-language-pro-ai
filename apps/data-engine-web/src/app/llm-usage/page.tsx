import { api } from "@/lib/api";
import { getCookieHeader, requireAdmin } from "@/lib/auth-server";
import { AdminShell } from "@/components/AdminShell";
import { getAdminCopy } from "@/lib/admin-i18n";
import { TimeseriesChart } from "./TimeseriesChart";
import { ModelBreakdownChart } from "./ModelBreakdownChart";
import { CallsTable } from "./CallsTable";
import { Activity } from "lucide-react";

export default async function LLMUsagePage({
  searchParams,
}: {
  searchParams: Promise<{ period?: "24h" | "7d" | "30d" }>;
}) {
  const sp = await searchParams;
  const period = sp.period ?? "7d";
  const user = await requireAdmin("/llm-usage");
  const ck = await getCookieHeader();
  const copy = getAdminCopy(user.locale).usage;
  const locale = user.locale === "en" ? "en-US" : "uz-UZ";
  const [summary, byPurpose, byModel, timeseries, calls] = await Promise.all([
    api.usage.summary(period, ck).catch(() => null),
    api.usage.byPurpose(period, ck).catch(() => []),
    api.usage.byModel(period, ck).catch(() => []),
    api.usage.timeseries(period, "day", ck).catch(() => []),
    api.usage.calls(50, ck).catch(() => []),
  ]);

  return (
    <AdminShell user={user}>
      <div className="relative min-h-full p-6 sm:p-10">
        <div className="absolute top-0 right-1/4 h-96 w-96 -translate-y-1/2 translate-x-1/2 rounded-full bg-teal-500/10 blur-[120px] pointer-events-none" />

        <div className="relative z-10 mx-auto max-w-6xl space-y-10">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-6 border-b border-slate-800/60 pb-6">
            <div className="flex items-center gap-4">
              <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-gradient-to-br from-teal-500/20 to-emerald-500/5 text-teal-400 border border-teal-500/20 shadow-inner">
                <Activity className="h-8 w-8" />
              </div>
              <div>
                <h1 className="text-3xl font-extrabold tracking-tight text-white sm:text-4xl">{copy.pageTitle}</h1>
                <p className="mt-2 text-lg text-slate-400">
                  {copy.pageDescription}
                </p>
              </div>
            </div>
            <PeriodPicker current={period} />
          </div>

          <section className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
            <Stat title={copy.totalCost} value={summary ? `$${Number(summary.total_cost_usd).toFixed(4)}` : "—"} color="emerald" />
            <Stat title={copy.calls} value={summary ? String(summary.total_calls) : "—"} color="blue" />
            <Stat
              title={copy.tokens}
              value={summary ? `${summary.total_tokens_in.toLocaleString()} / ${summary.total_tokens_out.toLocaleString()}` : "—"}
              color="amber"
            />
            <Stat title={copy.avgLatency} value={summary ? `${summary.avg_latency_ms} ms` : "—"} color="teal" />
          </section>

          <section className="overflow-hidden rounded-3xl border border-slate-800/60 bg-black/40 p-8 shadow-xl backdrop-blur-xl">
            <h2 className="text-xl font-bold text-white mb-6">{copy.timeseries.replace("{period}", period)}</h2>
            <div className="h-72">
              <TimeseriesChart data={timeseries} noDataLabel={copy.noData} locale={locale} />
            </div>
          </section>

          <section className="grid gap-6 lg:grid-cols-2">
            <div className="overflow-hidden rounded-3xl border border-slate-800/60 bg-black/40 p-8 shadow-xl backdrop-blur-xl">
              <h2 className="text-xl font-bold text-white mb-6">{copy.byPurpose}</h2>
              <div className="overflow-x-auto">
                <table className="w-full text-sm text-left">
                  <thead className="border-b border-slate-800/60 text-xs uppercase tracking-wider text-slate-400 font-semibold bg-black/20">
                    <tr>
                      <th className="px-4 py-3 rounded-tl-xl">{copy.table.purpose}</th>
                      <th className="px-4 py-3 text-right">{copy.calls}</th>
                      <th className="px-4 py-3 text-right">{copy.table.tokens}</th>
                      <th className="px-4 py-3 text-right rounded-tr-xl">{copy.table.cost}</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800/60">
                    {byPurpose.map((p) => (
                      <tr key={p.purpose} className="hover:bg-slate-800/20 transition-colors">
                        <td className="px-4 py-3 font-mono text-xs text-emerald-400">{p.purpose}</td>
                        <td className="px-4 py-3 text-right text-slate-300">{p.calls}</td>
                        <td className="px-4 py-3 text-right text-xs text-slate-400">
                          {p.tokens_in.toLocaleString()} / {p.tokens_out.toLocaleString()}
                        </td>
                        <td className="px-4 py-3 text-right font-mono font-semibold text-white">${Number(p.cost_usd).toFixed(4)}</td>
                      </tr>
                    ))}
                    {byPurpose.length === 0 && (
                      <tr>
                        <td colSpan={4} className="py-8 text-center text-slate-500">
                          {copy.noData}
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>

            <div className="overflow-hidden rounded-3xl border border-slate-800/60 bg-black/40 p-8 shadow-xl backdrop-blur-xl">
              <h2 className="text-xl font-bold text-white mb-6">{copy.byModel}</h2>
              <div className="h-64">
                <ModelBreakdownChart data={byModel} noDataLabel={copy.noData} />
              </div>
            </div>
          </section>

          <section className="overflow-hidden rounded-3xl border border-slate-800/60 bg-black/40 p-8 shadow-xl backdrop-blur-xl">
            <h2 className="text-xl font-bold text-white mb-6">{copy.recentCalls}</h2>
            <div className="rounded-xl overflow-hidden border border-slate-800/60">
              <CallsTable rows={calls} copy={copy} locale={locale} />
            </div>
          </section>
        </div>
      </div>
    </AdminShell>
  );
}

function Stat({ title, value, color }: { title: string; value: string; color: "emerald" | "blue" | "amber" | "teal" }) {
  const colorMap = {
    emerald: "from-emerald-500/20 to-emerald-500/5 border-emerald-500/20 text-emerald-400",
    blue: "from-blue-500/20 to-blue-500/5 border-blue-500/20 text-blue-400",
    amber: "from-amber-500/20 to-amber-500/5 border-amber-500/20 text-amber-400",
    teal: "from-teal-500/20 to-teal-500/5 border-teal-500/20 text-teal-400",
  };

  return (
    <div className="relative overflow-hidden rounded-3xl border border-slate-800/60 bg-black/40 p-6 shadow-xl backdrop-blur-xl flex flex-col justify-center">
      <div className={`absolute -right-6 -bottom-6 h-24 w-24 rounded-full bg-gradient-to-br ${colorMap[color].split(" ")[0]} blur-2xl opacity-40`} />
      <p className="text-xs uppercase tracking-wider text-slate-400 font-semibold mb-2">{title}</p>
      <p className={`text-3xl font-black tracking-tight ${colorMap[color].split(" ")[2]}`}>{value}</p>
    </div>
  );
}

function PeriodPicker({ current }: { current: string }) {
  return (
    <div className="flex bg-black/50 p-1.5 rounded-xl border border-slate-800/60 backdrop-blur-md">
      {(["24h", "7d", "30d"] as const).map((p) => (
        <a
          key={p}
          href={`?period=${p}`}
          className={`rounded-lg px-4 py-2 text-sm font-semibold transition-all duration-200 ${
            p === current
              ? "bg-emerald-500 text-white shadow-md shadow-emerald-500/20"
              : "text-slate-400 hover:text-white hover:bg-slate-800"
          }`}
        >
          {p}
        </a>
      ))}
    </div>
  );
}
