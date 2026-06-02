import { AdminShell } from "@/components/AdminShell";
import { api } from "@/lib/api";
import { getCookieHeader, requireAdmin } from "@/lib/auth-server";
import { getAdminCopy } from "@/lib/admin-i18n";
import { BrainCircuit, CheckCircle2, Database, Gauge, Microscope, ShieldCheck } from "lucide-react";

export default async function NLPLabPage() {
  const user = await requireAdmin("/nlp-lab");
  const ck = await getCookieHeader();
  const copy = getAdminCopy(user.locale).nlpLab;
  let data: Awaited<ReturnType<typeof api.research.nlpOverview>>;
  try {
    data = await api.research.nlpOverview(ck);
  } catch {
    data = {
      total_items: 0,
      validated_items: 0,
      validation_results: 0,
      semantic_embeddings: 0,
      verdicts: {},
      criteria_averages: {},
      quality_gates: {},
      coverage_by_skill: {},
      coverage_by_cefr: {},
      recent_validations: [],
    };
  }
  const gateLabels = copy.gates as Record<string, string>;
  const verdictLabels = copy.verdicts as Record<string, string>;
  const locale = user.locale === "en" ? "en-US" : "uz-UZ";

  return (
    <AdminShell user={user}>
      <div className="p-6 sm:p-10">
        <div className="mb-10 max-w-4xl">
          <div className="mb-4 inline-flex items-center gap-2 rounded-lg border border-emerald-500/20 bg-emerald-500/10 px-3 py-2 text-xs font-black uppercase tracking-widest text-emerald-700 dark:text-emerald-300">
            <Microscope className="h-4 w-4" />
            {copy.badge}
          </div>
          <h1 className="flex items-center gap-3 text-3xl font-extrabold tracking-tight text-slate-900 dark:text-white">
            <BrainCircuit className="h-8 w-8 text-emerald-500 dark:text-emerald-400" />
            {copy.pageTitle}
          </h1>
          <p className="mt-3 text-base leading-relaxed text-slate-600 dark:text-slate-400">
            {copy.pageDescription}
          </p>
        </div>

        <section className="mb-8 grid grid-cols-2 gap-4 lg:grid-cols-4">
          <MetricCard icon={Database} label={copy.metrics.totalItems} value={data.total_items} />
          <MetricCard icon={ShieldCheck} label={copy.metrics.validatedItems} value={data.validated_items} />
          <MetricCard icon={CheckCircle2} label={copy.metrics.validationResults} value={data.validation_results} />
          <MetricCard icon={Gauge} label={copy.metrics.semanticEmbeddings} value={data.semantic_embeddings} />
        </section>

        <section className="grid gap-6 xl:grid-cols-[0.9fr_1.1fr]">
          <Panel title={copy.verdictTitle}>
            <div className="grid gap-3">
              {entries(data.verdicts).map(([key, value]) => (
                <BarRow
                  key={key}
                  label={verdictLabels[key] ?? key}
                  value={value}
                  max={Math.max(data.validation_results, 1)}
                  tone={key === "approve" ? "emerald" : key === "reject" ? "red" : "amber"}
                />
              ))}
              {entries(data.verdicts).length === 0 ? <Empty copy={copy.empty} /> : null}
            </div>
          </Panel>

          <Panel title={copy.criteriaTitle}>
            <div className="grid gap-3">
              {entries(data.criteria_averages).map(([key, value]) => (
                <BarRow key={key} label={humanize(key)} value={value} max={5} tone="blue" suffix="/5" />
              ))}
              {entries(data.criteria_averages).length === 0 ? <Empty copy={copy.empty} /> : null}
            </div>
          </Panel>
        </section>

        <section className="mt-6 grid gap-6 xl:grid-cols-2">
          <Panel title={copy.gatesTitle}>
            <div className="grid gap-3 sm:grid-cols-2">
              {entries(data.quality_gates).map(([key, value]) => (
                <div key={key} className="rounded-lg border border-slate-200 bg-slate-50 p-4 dark:border-slate-800 dark:bg-slate-900/40">
                  <p className="text-[11px] font-black uppercase tracking-widest text-slate-500">
                    {gateLabels[key] ?? humanize(key)}
                  </p>
                  <p className="mt-2 text-2xl font-black text-slate-900 dark:text-white">{value}</p>
                </div>
              ))}
            </div>
          </Panel>

          <Panel title={copy.coverageTitle}>
            <div className="grid gap-5 sm:grid-cols-2">
              <CoverageList data={data.coverage_by_skill} />
              <CoverageList data={data.coverage_by_cefr} />
            </div>
          </Panel>
        </section>

        <section className="mt-6">
          <Panel title={copy.recentTitle}>
            <div className="grid gap-4">
              {data.recent_validations.map((row) => (
                <div key={row.id} className="rounded-lg border border-slate-200 bg-slate-50 p-4 dark:border-slate-800 dark:bg-slate-900/40">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="rounded-md bg-emerald-500/10 px-2 py-1 text-[11px] font-black uppercase text-emerald-700 dark:text-emerald-300">
                      {row.skill} / {row.cefr_level}
                    </span>
                    <span className="rounded-md bg-blue-500/10 px-2 py-1 text-[11px] font-black uppercase text-blue-700 dark:text-blue-300">
                      {verdictLabels[row.verdict] ?? row.verdict}
                    </span>
                    <span className="text-[11px] font-mono text-slate-500">
                      {new Intl.DateTimeFormat(locale, { dateStyle: "medium", timeStyle: "short" }).format(new Date(row.created_at))}
                    </span>
                  </div>
                  <p className="mt-3 text-sm leading-6 text-slate-700 dark:text-slate-300">
                    {row.reasoning_excerpt}
                  </p>
                </div>
              ))}
              {data.recent_validations.length === 0 ? <Empty copy={copy.empty} /> : null}
            </div>
          </Panel>
        </section>
      </div>
    </AdminShell>
  );
}

function entries<T>(obj: Record<string, T>): [string, T][] {
  return Object.entries(obj).sort(([a], [b]) => a.localeCompare(b));
}

function humanize(value: string): string {
  return value.replaceAll("_", " ");
}

function MetricCard({ icon: Icon, label, value }: { icon: any; label: string; value: number }) {
  return (
    <div className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800/60 dark:bg-black/40">
      <div className="mb-4 flex h-10 w-10 items-center justify-center rounded-lg bg-emerald-500/10 text-emerald-600 dark:text-emerald-400">
        <Icon className="h-5 w-5" />
      </div>
      <p className="text-[11px] font-black uppercase tracking-widest text-slate-500">{label}</p>
      <p className="mt-2 text-3xl font-black text-slate-900 dark:text-white">{value}</p>
    </div>
  );
}

function Panel({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="rounded-lg border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-800/60 dark:bg-black/40">
      <h2 className="mb-5 text-lg font-black text-slate-900 dark:text-white">{title}</h2>
      {children}
    </div>
  );
}

function BarRow({
  label,
  value,
  max,
  tone,
  suffix = "",
}: {
  label: string;
  value: number;
  max: number;
  tone: "emerald" | "blue" | "amber" | "red";
  suffix?: string;
}) {
  const width = Math.max(2, Math.min(100, (Number(value) / max) * 100));
  const colors = {
    emerald: "bg-emerald-500",
    blue: "bg-blue-500",
    amber: "bg-amber-500",
    red: "bg-red-500",
  };
  return (
    <div>
      <div className="mb-1.5 flex items-center justify-between gap-3 text-sm">
        <span className="font-bold capitalize text-slate-700 dark:text-slate-300">{label}</span>
        <span className="font-mono text-xs text-slate-500">
          {value}
          {suffix}
        </span>
      </div>
      <div className="h-2 rounded-full bg-slate-100 dark:bg-slate-800">
        <div className={`h-full rounded-full ${colors[tone]}`} style={{ width: `${width}%` }} />
      </div>
    </div>
  );
}

function CoverageList({ data }: { data: Record<string, number> }) {
  const max = Math.max(...Object.values(data), 1);
  return (
    <div className="grid gap-3">
      {entries(data).map(([key, value]) => (
        <BarRow key={key} label={key} value={value} max={max} tone="emerald" />
      ))}
    </div>
  );
}

function Empty({ copy }: { copy: string }) {
  return <p className="rounded-lg bg-slate-50 p-4 text-sm text-slate-500 dark:bg-slate-900/40">{copy}</p>;
}
