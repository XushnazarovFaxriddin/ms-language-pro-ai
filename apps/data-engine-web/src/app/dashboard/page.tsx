import Link from "next/link";
import { api } from "@/lib/api";
import { getCookieHeader, requireAdmin } from "@/lib/auth-server";
import { getAdminCopy } from "@/lib/admin-i18n";
import { AdminShell } from "@/components/AdminShell";
import { DollarSign, Activity, Zap, BrainCircuit, BarChart3, ChevronRight, BookOpen, ScrollText } from "lucide-react";

export default async function DashboardPage() {
  const user = await requireAdmin("/dashboard");
  const ck = await getCookieHeader();
  let summary: Awaited<ReturnType<typeof api.usage.summary>> | null = null;
  try {
    summary = await api.usage.summary("7d", ck);
  } catch {
    /* ignore — empty DB on first run */
  }
  const copy = getAdminCopy(user.locale);
  const firstName = user.display_name?.split(" ")[0] || "Admin";

  return (
    <AdminShell user={user}>
      <div className="relative min-h-full p-6 sm:p-10">
        {/* Background Gradients */}
        <div className="absolute top-0 left-1/4 h-96 w-96 -translate-y-1/2 translate-x-1/2 rounded-full bg-emerald-500/10 blur-[120px] pointer-events-none" />
        <div className="absolute bottom-0 right-1/4 h-96 w-96 translate-y-1/2 rounded-full bg-teal-500/10 blur-[120px] pointer-events-none" />

        <div className="relative z-10 mx-auto max-w-6xl space-y-10">
          <div>
            <h1 className="text-3xl font-extrabold tracking-tight text-white sm:text-4xl">
              {copy.dashboard.welcome.replace("{name}", firstName)}
            </h1>
            <p className="mt-2 text-lg text-slate-400 max-w-2xl">
              {copy.dashboard.description}
            </p>
          </div>

          <section className="grid gap-6 sm:grid-cols-3">
            <StatCard
              title={copy.dashboard.totalCost}
              value={summary ? `$${Number(summary.total_cost_usd).toFixed(4)}` : "$0.0000"}
              icon={DollarSign}
              color="emerald"
            />
            <StatCard
              title={copy.dashboard.totalCalls}
              value={summary ? String(summary.total_calls) : "0"}
              icon={Activity}
              color="blue"
            />
            <StatCard
              title={copy.dashboard.avgLatency}
              value={summary ? String(summary.avg_latency_ms) : "0"}
              icon={Zap}
              color="amber"
            />
          </section>

          <section className="grid gap-6 lg:grid-cols-2">
            <ActionCard
              href="/generation"
              title={copy.dashboard.generationTitle}
              desc={copy.dashboard.generationDesc}
              icon={BrainCircuit}
              color="emerald"
            />
            <ActionCard
              href="/practice-catalogue"
              title={copy.dashboard.catalogueTitle}
              desc={copy.dashboard.catalogueDesc}
              icon={BookOpen}
              color="blue"
            />
            <ActionCard
              href="/methodology"
              title={copy.dashboard.methodologyTitle}
              desc={copy.dashboard.methodologyDesc}
              icon={ScrollText}
              color="amber"
            />
            <ActionCard
              href="/llm-usage"
              title={copy.dashboard.usageTitle}
              desc={copy.dashboard.usageDesc}
              icon={BarChart3}
              color="teal"
            />
          </section>
        </div>
      </div>
    </AdminShell>
  );
}

function StatCard({ title, value, icon: Icon, color }: { title: string; value: string; icon: any; color: "emerald" | "blue" | "amber" }) {
  const colorMap = {
    emerald: "from-emerald-500/20 to-teal-500/5 text-emerald-400 border-emerald-500/20",
    blue: "from-blue-500/20 to-indigo-500/5 text-blue-400 border-blue-500/20",
    amber: "from-amber-500/20 to-orange-500/5 text-amber-400 border-amber-500/20",
  };

  return (
    <div className="relative overflow-hidden rounded-3xl border border-slate-800/60 bg-black/40 p-6 shadow-xl backdrop-blur-xl">
      <div className={`absolute -right-10 -top-10 h-32 w-32 rounded-full bg-gradient-to-br ${colorMap[color]} blur-2xl opacity-50`} />
      <div className="relative z-10">
        <div className="flex items-center justify-between mb-4">
          <p className="text-sm font-medium text-slate-400">{title}</p>
          <div className={`flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br ${colorMap[color]} shadow-inner`}>
            <Icon className="h-5 w-5" />
          </div>
        </div>
        <p className="text-4xl font-black text-white tracking-tight">{value}</p>
      </div>
    </div>
  );
}

function ActionCard({ href, title, desc, icon: Icon, color }: { href: string; title: string; desc: string; icon: any; color: "emerald" | "teal" | "blue" | "amber" }) {
  const colorMap = {
    emerald: "group-hover:border-emerald-500/40 text-emerald-400",
    teal: "group-hover:border-teal-500/40 text-teal-400",
    blue: "group-hover:border-blue-500/40 text-blue-400",
    amber: "group-hover:border-amber-500/40 text-amber-400",
  };

  return (
    <Link
      href={href}
      className={`group relative flex overflow-hidden rounded-3xl border border-slate-800/60 bg-black/40 p-8 shadow-xl backdrop-blur-xl transition-all duration-300 hover:-translate-y-1 hover:shadow-2xl hover:bg-slate-900/50 ${colorMap[color].split(" ")[0]}`}
    >
      <div className="relative z-10 flex items-start gap-6 w-full">
        <div className={`flex h-16 w-16 flex-shrink-0 items-center justify-center rounded-2xl bg-slate-800/50 shadow-inner transition-transform duration-300 group-hover:scale-110 ${colorMap[color].split(" ")[1]}`}>
          <Icon className="h-8 w-8" />
        </div>
        <div className="flex-1">
          <h2 className="text-2xl font-bold text-white mb-2">{title}</h2>
          <p className="text-slate-400 leading-relaxed">{desc}</p>
        </div>
        <div className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-full bg-slate-800/50 text-slate-400 transition-transform duration-300 group-hover:translate-x-2 group-hover:bg-slate-700">
          <ChevronRight className="h-5 w-5" />
        </div>
      </div>
    </Link>
  );
}
