import { AdminShell } from "@/components/AdminShell";
import { api } from "@/lib/api";
import { requireAdmin, getCookieHeader } from "@/lib/auth-server";
import { getAdminCopy } from "@/lib/admin-i18n";
import { Database, FileDown, Filter, Plus } from "lucide-react";
import Link from "next/link";
import type React from "react";

const SKILLS = ["reading", "listening", "writing", "speaking"];
const CEFR_LEVELS = ["A1", "A2", "B1", "B2", "C1", "C2"];
const STATUSES = ["approved", "in_review", "draft", "rejected"];

export default async function ItemsPage({
  searchParams,
}: {
  searchParams: Promise<{ skill?: string; cefr?: string; status?: string }>;
}) {
  const user = await requireAdmin("/items");
  const { skill, cefr, status } = await searchParams;
  const ck = await getCookieHeader();
  const copy = getAdminCopy(user.locale).items;
  const statusLabels = copy.statusOptions as Record<string, string>;
  const flagLabels = copy.qualityFlags as Record<string, string>;

  const [itemsResult, summary] = await Promise.all([
    api.items.list({ skill, cefr, status, limit: 100 }, ck),
    api.items.summary({ skill, cefr, status }, ck),
  ]);
  const items = itemsResult.items;
  const exportHref = api.exports.questionsCsvUrl({ skill, cefr, status });

  return (
    <AdminShell user={user}>
      <div className="p-6 sm:p-10">
        <div className="mb-8 flex flex-col gap-6 lg:flex-row lg:items-start lg:justify-between">
          <div className="max-w-3xl">
            <h1 className="flex items-center gap-3 text-3xl font-extrabold tracking-tight text-slate-900 dark:text-white">
              <Database className="h-8 w-8 text-emerald-500 dark:text-emerald-400" />
              {copy.pageTitle}
            </h1>
            <p className="mt-2 text-slate-600 dark:text-slate-400">{copy.pageDescription}</p>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <a
              href={exportHref}
              className="inline-flex items-center gap-2 rounded-lg border border-slate-200 bg-white px-4 py-2 text-sm font-bold text-slate-700 transition-colors hover:bg-slate-50 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-200 dark:hover:bg-slate-800"
            >
              <FileDown className="h-4 w-4" />
              {copy.exportCsv}
            </a>
            <Link
              href="/generation"
              className="inline-flex items-center gap-2 rounded-lg bg-emerald-500 px-4 py-2 text-sm font-bold text-white shadow-lg shadow-emerald-500/20 transition-colors hover:bg-emerald-400"
            >
              <Plus className="h-4 w-4" />
              {copy.newGeneration}
            </Link>
          </div>
        </div>

        <form className="mb-8 rounded-lg border border-slate-200 bg-white p-4 dark:border-slate-800/60 dark:bg-black/40">
          <div className="grid gap-3 md:grid-cols-[1fr_1fr_1fr_auto_auto] md:items-end">
            <SelectFilter label={copy.filterLabels.status} name="status" defaultValue={status} options={STATUSES} labels={statusLabels} allLabel={copy.filterLabels.all} />
            <SelectFilter label={copy.filterLabels.skill} name="skill" defaultValue={skill} options={SKILLS} allLabel={copy.filterLabels.all} />
            <SelectFilter label={copy.filterLabels.cefr} name="cefr" defaultValue={cefr} options={CEFR_LEVELS} allLabel={copy.filterLabels.all} />
            <button className="inline-flex items-center justify-center gap-2 rounded-lg bg-slate-900 px-4 py-2.5 text-sm font-bold text-white transition-colors hover:bg-slate-800 dark:bg-slate-100 dark:text-slate-900 dark:hover:bg-white">
              <Filter className="h-4 w-4" />
              {copy.applyFilters}
            </button>
            <Link
              href="/items"
              className="inline-flex items-center justify-center rounded-lg border border-slate-200 px-4 py-2.5 text-sm font-bold text-slate-600 transition-colors hover:bg-slate-50 dark:border-slate-800 dark:text-slate-300 dark:hover:bg-slate-900"
            >
              {copy.resetFilters}
            </Link>
          </div>
        </form>

        <section className="mb-8 grid grid-cols-2 gap-4 lg:grid-cols-4">
          {[
            { label: copy.stats.total, value: summary.total, color: "text-slate-900 dark:text-white" },
            { label: copy.stats.exportReady, value: summary.export_ready, color: "text-emerald-600 dark:text-emerald-400" },
            { label: copy.stats.reviewBacklog, value: summary.review_backlog, color: "text-amber-600 dark:text-amber-400" },
            { label: copy.stats.missingKey, value: summary.missing_answer_key, color: "text-red-600 dark:text-red-400" },
          ].map((s) => (
            <div key={s.label} className="rounded-lg border border-slate-200 bg-white p-4 dark:border-slate-800/60 dark:bg-black/40">
              <p className="text-[10px] font-bold uppercase tracking-widest text-slate-500">{s.label}</p>
              <p className={`mt-1 text-2xl font-black ${s.color}`}>{s.value}</p>
            </div>
          ))}
        </section>

        <div className="overflow-hidden rounded-lg border border-slate-200 bg-white shadow-sm dark:border-slate-800/60 dark:bg-black/40">
          <div className="overflow-x-auto">
            <table className="w-full min-w-[1040px] border-collapse text-left">
              <thead>
                <tr className="border-b border-slate-200 bg-slate-50 dark:border-slate-800/60 dark:bg-slate-900/40">
                  <th className="px-5 py-4 text-xs font-bold uppercase tracking-widest text-slate-500">{copy.headers.itemId}</th>
                  <th className="px-5 py-4 text-xs font-bold uppercase tracking-widest text-slate-500">{copy.headers.skillLevel}</th>
                  <th className="px-5 py-4 text-xs font-bold uppercase tracking-widest text-slate-500">{copy.headers.topicContext}</th>
                  <th className="px-5 py-4 text-xs font-bold uppercase tracking-widest text-slate-500">{copy.headers.status}</th>
                  <th className="px-5 py-4 text-xs font-bold uppercase tracking-widest text-slate-500">{copy.headers.irt}</th>
                  <th className="px-5 py-4 text-xs font-bold uppercase tracking-widest text-slate-500">{copy.headers.quality}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200 dark:divide-slate-800/50">
                {items.map((item) => {
                  const flags = item.quality_flags.length ? item.quality_flags : [];
                  return (
                    <tr key={item.id} className="transition-colors hover:bg-slate-50 dark:hover:bg-slate-900/40">
                      <td className="px-5 py-4 align-top">
                        <Link href={`/items/${item.id}`} className="group">
                          <div className="font-mono text-[11px] text-emerald-600 dark:text-emerald-400 group-hover:underline">{item.id.slice(0, 8)}...</div>
                          <div className="mt-1 text-[10px] uppercase tracking-wider text-slate-400">{item.type}</div>
                        </Link>
                      </td>
                      <td className="px-5 py-4 align-top">
                        <div className="flex flex-wrap gap-2">
                          <Badge color="emerald">{item.skill}</Badge>
                          <Badge color="blue">{item.cefr_level}</Badge>
                          {item.ielts_band_target ? <Badge color="amber">IELTS {item.ielts_band_target}</Badge> : null}
                        </div>
                      </td>
                      <td className="px-5 py-4 align-top">
                        <p className="max-w-md text-sm leading-6 text-slate-700 dark:text-slate-300">
                          {item.payload.passage || item.payload.prompt || item.payload.audio_url || copy.fallbackText}
                        </p>
                        <p className="mt-2 text-[11px] text-slate-500">
                          {item.generated_by_model || item.source_license}
                          {item.prompt_version_id ? ` / ${item.prompt_version_id}` : ""}
                        </p>
                      </td>
                      <td className="px-5 py-4 align-top">
                        <StatusPill label={statusLabels[item.status] ?? item.status} status={item.status} />
                      </td>
                      <td className="px-5 py-4 align-top">
                        <div className="grid gap-1 text-xs text-slate-600 dark:text-slate-400">
                          <span>b={item.difficulty_b.toFixed(2)}</span>
                          <span>a={item.discrimination_a.toFixed(2)}</span>
                          <span>n={item.n_responses}</span>
                        </div>
                      </td>
                      <td className="px-5 py-4 align-top">
                        {flags.length ? (
                          <div className="flex max-w-xs flex-wrap gap-1.5">
                            {flags.map((flag) => (
                              <span key={flag} className="rounded-md bg-amber-500/10 px-2 py-1 text-[11px] font-bold text-amber-700 dark:text-amber-300">
                                {flagLabels[flag] ?? flag}
                              </span>
                            ))}
                          </div>
                        ) : (
                          <span className="rounded-md bg-emerald-500/10 px-2 py-1 text-[11px] font-bold text-emerald-700 dark:text-emerald-300">
                            {copy.noFlags}
                          </span>
                        )}
                      </td>
                    </tr>
                  );
                })}
                {items.length === 0 && (
                  <tr>
                    <td colSpan={6} className="px-6 py-20 text-center text-slate-500">
                      {copy.empty}
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>

        <div className="mt-6 flex items-center justify-between">
          <p className="text-xs text-slate-500">
            {copy.pagination.replace("{count}", String(items.length)).replace("{total}", String(itemsResult.total))}
          </p>
        </div>
      </div>
    </AdminShell>
  );
}

function SelectFilter({
  label,
  name,
  defaultValue,
  options,
  labels,
  allLabel,
}: {
  label: string;
  name: string;
  defaultValue?: string;
  options: string[];
  labels?: Record<string, string>;
  allLabel: string;
}) {
  return (
    <label className="grid gap-1.5 text-sm font-bold text-slate-700 dark:text-slate-300">
      {label}
      <select
        name={name}
        defaultValue={defaultValue ?? ""}
        className="rounded-lg border border-slate-200 bg-white px-3 py-2.5 text-sm text-slate-900 outline-none transition-colors focus:border-emerald-500 dark:border-slate-800 dark:bg-slate-950 dark:text-white"
      >
        <option value="">{allLabel}</option>
        {options.map((option) => (
          <option key={option} value={option}>
            {labels?.[option] ?? option}
          </option>
        ))}
      </select>
    </label>
  );
}

function Badge({ children, color }: { children: React.ReactNode; color: "emerald" | "blue" | "amber" }) {
  const colors = {
    emerald: "bg-emerald-500/10 text-emerald-700 dark:text-emerald-300",
    blue: "bg-blue-500/10 text-blue-700 dark:text-blue-300",
    amber: "bg-amber-500/10 text-amber-700 dark:text-amber-300",
  };
  return <span className={`rounded-md px-2 py-1 text-[11px] font-black uppercase tracking-wider ${colors[color]}`}>{children}</span>;
}

function StatusPill({ label, status }: { label: string; status: string }) {
  const color = status === "approved" ? "emerald" : status === "rejected" ? "red" : status === "draft" ? "slate" : "amber";
  const colors = {
    emerald: "bg-emerald-500/10 text-emerald-700 dark:text-emerald-300",
    red: "bg-red-500/10 text-red-700 dark:text-red-300",
    slate: "bg-slate-500/10 text-slate-700 dark:text-slate-300",
    amber: "bg-amber-500/10 text-amber-700 dark:text-amber-300",
  };
  return <span className={`rounded-md px-2 py-1 text-xs font-bold ${colors[color]}`}>{label}</span>;
}
