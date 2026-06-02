import { AdminShell } from "@/components/AdminShell";
import { api, type Item } from "@/lib/api";
import { requireAdmin, getCookieHeader } from "@/lib/auth-server";
import { getAdminCopy } from "@/lib/admin-i18n";
import {
  ArrowLeft,
  CheckCircle2,
  Clock,
  Database,
  FileText,
  Hash,
  ShieldAlert,
  Tag,
  XCircle,
} from "lucide-react";
import Link from "next/link";
import { ReviewDecisionButtons } from "@/app/review/ReviewDecisionButtons";

export default async function ItemDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const user = await requireAdmin(`/items/${id}`);
  const ck = await getCookieHeader();
  const copy = getAdminCopy(user.locale);
  const itemsCopy = copy.items;
  const statusLabels = itemsCopy.statusOptions as Record<string, string>;
  const flagLabels = itemsCopy.qualityFlags as Record<string, string>;

  let item: Item | null = null;
  let error: string | null = null;
  try {
    const result = await api.items.list({ limit: 1 }, ck);
    // Find item from paginated result or fetch the list with a broader search
    const allResult = await api.items.list({ limit: 500 }, ck);
    item = allResult.items.find((i) => i.id === id) ?? null;
    if (!item) {
      error = "Item not found";
    }
  } catch (e) {
    error = e instanceof Error ? e.message : "Failed to load item";
  }

  return (
    <AdminShell user={user}>
      <div className="p-6 sm:p-10">
        <div className="mx-auto max-w-5xl">
          {/* Back link */}
          <Link
            href="/items"
            className="mb-6 inline-flex items-center gap-2 text-sm font-bold text-slate-500 transition-colors hover:text-emerald-500"
          >
            <ArrowLeft className="h-4 w-4" />
            {itemsCopy.pageTitle}
          </Link>

          {error && (
            <div className="rounded-2xl border border-red-500/20 bg-red-500/5 p-8 text-center">
              <ShieldAlert className="mx-auto mb-4 h-12 w-12 text-red-500/60" />
              <p className="text-lg font-bold text-red-600 dark:text-red-400">
                {error}
              </p>
              <Link
                href="/items"
                className="mt-4 inline-flex items-center gap-2 rounded-lg bg-slate-900 px-4 py-2 text-sm font-bold text-white hover:bg-slate-800 dark:bg-slate-100 dark:text-slate-900"
              >
                {itemsCopy.pageTitle}
              </Link>
            </div>
          )}

          {item && (
            <div className="space-y-6">
              {/* Header */}
              <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <h1 className="flex items-center gap-3 text-2xl font-extrabold tracking-tight text-slate-900 dark:text-white">
                    <Database className="h-7 w-7 text-emerald-500" />
                    Item Detail
                  </h1>
                  <p className="mt-1 font-mono text-sm text-slate-500">
                    {item.id}
                  </p>
                </div>
                <div className="flex items-center gap-3">
                  <StatusBadge
                    status={item.status}
                    label={statusLabels[item.status] ?? item.status}
                  />
                  {item.status === "in_review" && (
                    <ReviewDecisionButtons
                      itemId={item.id}
                      copy={copy.review}
                    />
                  )}
                </div>
              </div>

              {/* Main grid */}
              <div className="grid gap-6 lg:grid-cols-[1.3fr_0.7fr]">
                {/* Left: Content preview */}
                <div className="space-y-6">
                  {/* Passage */}
                  {item.payload.passage && (
                    <Card title="Passage" icon={FileText}>
                      <p className="whitespace-pre-wrap text-sm leading-7 text-slate-700 dark:text-slate-300">
                        {item.payload.passage}
                      </p>
                    </Card>
                  )}

                  {/* Prompt */}
                  {item.payload.prompt && (
                    <Card title="Prompt / Question" icon={Hash}>
                      <p className="text-sm font-medium leading-7 text-slate-800 dark:text-slate-200">
                        {item.payload.prompt}
                      </p>
                    </Card>
                  )}

                  {/* Options (MCQ) */}
                  {item.payload.options &&
                    item.payload.options.length > 0 && (
                      <Card title="Options" icon={Tag}>
                        <div className="grid gap-3 sm:grid-cols-2">
                          {item.payload.options.map((opt) => (
                            <div
                              key={opt.id}
                              className="flex items-start gap-3 rounded-xl border border-slate-200 p-4 dark:border-slate-800"
                            >
                              <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-slate-100 text-sm font-black text-slate-600 dark:bg-slate-800 dark:text-slate-300">
                                {opt.id}
                              </span>
                              <p className="text-sm text-slate-700 dark:text-slate-300">
                                {opt.label}
                              </p>
                            </div>
                          ))}
                        </div>
                      </Card>
                    )}

                  {/* Audio URL */}
                  {item.payload.audio_url && (
                    <Card title="Audio" icon={FileText}>
                      <audio
                        controls
                        className="w-full"
                        src={item.payload.audio_url}
                      />
                    </Card>
                  )}

                  {/* No content at all */}
                  {!item.payload.passage &&
                    !item.payload.prompt &&
                    !item.payload.audio_url && (
                      <Card title="Content" icon={FileText}>
                        <p className="text-sm text-slate-500">
                          {itemsCopy.fallbackText}
                        </p>
                      </Card>
                    )}
                </div>

                {/* Right: Metadata sidebar */}
                <div className="space-y-6">
                  {/* Skill / CEFR / Type */}
                  <Card title="Classification" icon={Tag}>
                    <div className="grid gap-4">
                      <MetaRow label="Type" value={item.type} />
                      <MetaRow label="Skill" value={item.skill} />
                      <MetaRow label="CEFR" value={item.cefr_level} />
                      {item.ielts_band_target && (
                        <MetaRow
                          label="IELTS Band"
                          value={String(item.ielts_band_target)}
                        />
                      )}
                      <MetaRow
                        label="Est. Time"
                        value={`${item.estimated_seconds}s`}
                      />
                    </div>
                  </Card>

                  {/* IRT Parameters */}
                  <Card title="IRT Parameters" icon={Database}>
                    <div className="grid gap-4">
                      <MetaRow
                        label="Difficulty (b)"
                        value={item.difficulty_b.toFixed(3)}
                      />
                      <MetaRow
                        label="Discrimination (a)"
                        value={item.discrimination_a.toFixed(3)}
                      />
                      <MetaRow
                        label="Guessing (c)"
                        value={item.guessing_c.toFixed(3)}
                      />
                      <MetaRow
                        label="Responses (n)"
                        value={String(item.n_responses)}
                      />
                    </div>
                  </Card>

                  {/* Quality Flags */}
                  <Card title="Quality Flags" icon={ShieldAlert}>
                    {item.quality_flags.length > 0 ? (
                      <div className="flex flex-wrap gap-2">
                        {item.quality_flags.map((flag) => (
                          <span
                            key={flag}
                            className="rounded-lg bg-amber-500/10 px-3 py-1.5 text-xs font-bold text-amber-700 dark:text-amber-300"
                          >
                            {flagLabels[flag] ?? flag}
                          </span>
                        ))}
                      </div>
                    ) : (
                      <span className="rounded-lg bg-emerald-500/10 px-3 py-1.5 text-xs font-bold text-emerald-700 dark:text-emerald-300">
                        {itemsCopy.noFlags}
                      </span>
                    )}
                  </Card>

                  {/* Provenance */}
                  <Card title="Provenance" icon={Clock}>
                    <div className="grid gap-4">
                      <MetaRow
                        label="Source"
                        value={item.source_license}
                      />
                      {item.generated_by_model && (
                        <MetaRow
                          label="Model"
                          value={item.generated_by_model}
                        />
                      )}
                      {item.prompt_version_id && (
                        <MetaRow
                          label="Prompt version"
                          value={item.prompt_version_id}
                        />
                      )}
                      {item.generation_run_id && (
                        <MetaRow
                          label="Run ID"
                          value={item.generation_run_id.slice(0, 8) + "..."}
                        />
                      )}
                      <MetaRow label="Bank ID" value={item.bank_id} />
                      <MetaRow
                        label="Created"
                        value={new Date(item.created_at).toLocaleString()}
                      />
                      <MetaRow
                        label="Updated"
                        value={new Date(item.updated_at).toLocaleString()}
                      />
                    </div>
                  </Card>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </AdminShell>
  );
}

function Card({
  title,
  icon: Icon,
  children,
}: {
  title: string;
  icon: React.ComponentType<{ className?: string }>;
  children: React.ReactNode;
}) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-800/60 dark:bg-black/40">
      <div className="mb-4 flex items-center gap-2">
        <Icon className="h-5 w-5 text-emerald-500" />
        <h2 className="text-sm font-black uppercase tracking-widest text-slate-500">
          {title}
        </h2>
      </div>
      {children}
    </div>
  );
}

function MetaRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between gap-4">
      <span className="text-xs font-bold text-slate-500">{label}</span>
      <span className="font-mono text-sm font-medium text-slate-900 dark:text-slate-100">
        {value}
      </span>
    </div>
  );
}

function StatusBadge({ status, label }: { status: string; label: string }) {
  const color =
    status === "approved"
      ? "bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 border-emerald-500/20"
      : status === "rejected"
        ? "bg-red-500/10 text-red-700 dark:text-red-300 border-red-500/20"
        : status === "draft"
          ? "bg-slate-500/10 text-slate-700 dark:text-slate-300 border-slate-500/20"
          : "bg-amber-500/10 text-amber-700 dark:text-amber-300 border-amber-500/20";
  return (
    <span className={`rounded-xl border px-4 py-2 text-sm font-bold ${color}`}>
      {label}
    </span>
  );
}
