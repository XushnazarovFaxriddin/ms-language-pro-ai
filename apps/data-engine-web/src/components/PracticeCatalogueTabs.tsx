"use client";

import { useMemo, useState } from "react";
import { api, type ConversationTopic, type Drill, type ErrorTaxonomy } from "@/lib/api";
import type { AdminCopy } from "@/lib/admin-i18n";
import { CheckCircle2, Edit2, Filter, Loader2, Plus, Search, X } from "lucide-react";

type TabId = "taxonomy" | "drills" | "topics";
type EditableRow = ErrorTaxonomy | Drill | ConversationTopic | null;

const CEFR_LEVELS = ["A1", "A2", "B1", "B2", "C1", "C2"] as const;
const SEVERITIES = ["info", "minor", "major"] as const;
const SKILLS = ["listening", "reading", "writing", "speaking", "vocabulary", "grammar"];

export function PracticeCatalogueTabs({
  initialTaxonomy,
  initialDrills,
  initialTopics,
  copy,
  locale,
}: {
  initialTaxonomy: ErrorTaxonomy[];
  initialDrills: Drill[];
  initialTopics: ConversationTopic[];
  copy: AdminCopy["catalogue"];
  locale: "uz" | "en";
}) {
  const [activeTab, setActiveTab] = useState<TabId>("taxonomy");
  const [taxonomy, setTaxonomy] = useState(initialTaxonomy);
  const [drills, setDrills] = useState(initialDrills);
  const [topics, setTopics] = useState(initialTopics);
  const [query, setQuery] = useState("");
  const [modalRow, setModalRow] = useState<EditableRow>(null);
  const [isCreating, setIsCreating] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");

  const normalizedQuery = query.trim().toLowerCase();
  const filteredTaxonomy = useMemo(
    () => filterRows(taxonomy, normalizedQuery, (item) => [
      item.code,
      item.skill,
      item.layer,
      item.severity,
      item.explanation_uz,
      item.explanation_en,
    ]),
    [taxonomy, normalizedQuery],
  );
  const filteredDrills = useMemo(
    () => filterRows(drills, normalizedQuery, (item) => [
      item.code,
      item.skill,
      item.cefr_level,
      ...item.target_codes,
    ]),
    [drills, normalizedQuery],
  );
  const filteredTopics = useMemo(
    () => filterRows(topics, normalizedQuery, (item) => [
      item.code,
      item.title_uz,
      item.title_en,
      item.cefr_level,
      item.kind,
      item.prompt,
    ]),
    [topics, normalizedQuery],
  );

  const openCreate = () => {
    setError("");
    setNotice("");
    setIsCreating(true);
    setModalRow(null);
  };

  const openEdit = (row: EditableRow) => {
    setError("");
    setNotice("");
    setIsCreating(false);
    setModalRow(row);
  };

  const closeModal = () => {
    setIsCreating(false);
    setModalRow(null);
    setSaving(false);
  };

  const handleSubmit = async (formData: FormData) => {
    setSaving(true);
    setError("");
    setNotice("");
    try {
      if (activeTab === "taxonomy") {
        const original = !isCreating && modalRow && "layer" in modalRow ? modalRow : null;
        const body: ErrorTaxonomy = {
          code: getFormString(formData, "code"),
          skill: getFormString(formData, "skill"),
          layer: getFormString(formData, "layer"),
          severity: getFormString(formData, "severity") as ErrorTaxonomy["severity"],
          explanation_uz: getFormString(formData, "explanation_uz"),
          explanation_en: getFormString(formData, "explanation_en"),
          example_wrong: getOptionalFormString(formData, "example_wrong"),
          example_correct: getOptionalFormString(formData, "example_correct"),
          recommended_drill_ids: parseCsv(getOptionalFormString(formData, "recommended_drill_ids") ?? ""),
        };
        const saved = original
          ? await api.practiceCatalogue.errorTaxonomy.update(original.code, body)
          : await api.practiceCatalogue.errorTaxonomy.create(body);
        setTaxonomy((rows) => upsertBy(rows, saved, (row) => row.code, original?.code));
      }

      if (activeTab === "drills") {
        const original = !isCreating && modalRow && "duration_minutes" in modalRow ? modalRow : null;
        const body = {
          code: getFormString(formData, "code"),
          skill: getFormString(formData, "skill"),
          target_codes: parseCsv(getFormString(formData, "target_codes")),
          cefr_level: getFormString(formData, "cefr_level") as Drill["cefr_level"],
          duration_minutes: getFormNumber(formData, "duration_minutes", copy.validation.number),
          payload: parseJsonObject(
            getOptionalFormString(formData, "payload") ?? "{}",
            copy.validation.payloadObject,
          ),
          variant_count: getFormNumber(formData, "variant_count", copy.validation.number),
        };
        const saved = original
          ? await api.practiceCatalogue.drills.update(original.id, body)
          : await api.practiceCatalogue.drills.create(body);
        setDrills((rows) => upsertBy(rows, saved, (row) => row.id, original?.id));
      }

      if (activeTab === "topics") {
        const original = !isCreating && modalRow && "prompt" in modalRow ? modalRow : null;
        const body = {
          code: getFormString(formData, "code"),
          title_uz: getFormString(formData, "title_uz"),
          title_en: getFormString(formData, "title_en"),
          prompt: getFormString(formData, "prompt"),
          cefr_level: getFormString(formData, "cefr_level") as ConversationTopic["cefr_level"],
          kind: getFormString(formData, "kind"),
          is_active: formData.get("is_active") === "on",
        };
        const saved = original
          ? await api.practiceCatalogue.conversationTopics.update(original.id, body)
          : await api.practiceCatalogue.conversationTopics.create(body);
        setTopics((rows) => upsertBy(rows, saved, (row) => row.id, original?.id));
      }

      setNotice(copy.saved);
      closeModal();
    } catch (err) {
      setError(err instanceof Error ? err.message : copy.saveError);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap gap-2 rounded-xl border border-slate-300/50 bg-slate-200/50 p-1 backdrop-blur-xl dark:border-slate-800/60 dark:bg-black/40">
        {[
          { id: "taxonomy", label: copy.tabs.taxonomy },
          { id: "drills", label: copy.tabs.drills },
          { id: "topics", label: copy.tabs.topics },
        ].map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id as TabId)}
            className={`rounded-lg px-4 py-2 text-sm font-bold transition-all ${
              activeTab === tab.id
                ? "bg-white text-slate-900 shadow-sm dark:bg-slate-800 dark:text-white"
                : "text-slate-600 hover:text-slate-900 dark:text-slate-400 dark:hover:text-slate-200"
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {notice && (
        <div className="flex items-center gap-2 rounded-xl border border-emerald-500/20 bg-emerald-500/10 px-4 py-3 text-sm font-semibold text-emerald-700 dark:text-emerald-300">
          <CheckCircle2 className="h-4 w-4" />
          {notice}
        </div>
      )}

      <div className="overflow-hidden rounded-3xl border border-slate-200 bg-white backdrop-blur-xl dark:border-slate-800/60 dark:bg-black/40">
        <div className="flex flex-col gap-3 border-b border-slate-200 bg-slate-50/50 p-4 dark:border-slate-800/60 dark:bg-slate-900/30 sm:flex-row sm:items-center sm:justify-between">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder={copy.searchPlaceholder}
              className="w-full rounded-xl border border-slate-200 bg-white py-2 pl-9 pr-4 text-sm text-slate-900 focus:border-emerald-500 focus:outline-none dark:border-slate-800 dark:bg-slate-900 dark:text-slate-100 sm:w-96"
            />
          </div>
          <div className="flex items-center gap-2">
            <div className="flex items-center gap-2 rounded-xl border border-slate-200 bg-slate-100 px-3 py-2 text-sm font-bold text-slate-700 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-300">
              <Filter className="h-4 w-4" />
              {activeTab === "taxonomy" && `${filteredTaxonomy.length}/${taxonomy.length}`}
              {activeTab === "drills" && `${filteredDrills.length}/${drills.length}`}
              {activeTab === "topics" && `${filteredTopics.length}/${topics.length}`}
            </div>
            <button
              onClick={openCreate}
              className="flex items-center gap-2 rounded-xl bg-emerald-500 px-3 py-2 text-sm font-bold text-white shadow-lg shadow-emerald-500/20 transition-all hover:bg-emerald-400"
            >
              <Plus className="h-4 w-4" />
              {copy.add}
            </button>
          </div>
        </div>

        <div className="overflow-x-auto">
          {activeTab === "taxonomy" && (
            <TaxonomyTable rows={filteredTaxonomy} copy={copy} locale={locale} onEdit={openEdit} />
          )}
          {activeTab === "drills" && <DrillsTable rows={filteredDrills} copy={copy} onEdit={openEdit} />}
          {activeTab === "topics" && <TopicsTable rows={filteredTopics} copy={copy} locale={locale} onEdit={openEdit} />}
        </div>
      </div>

      {(isCreating || modalRow) && (
        <CatalogueModal
          activeTab={activeTab}
          row={modalRow}
          isCreating={isCreating}
          saving={saving}
          error={error}
          copy={copy}
          onClose={closeModal}
          onSubmit={handleSubmit}
        />
      )}
    </div>
  );
}

function TaxonomyTable({
  rows,
  copy,
  locale,
  onEdit,
}: {
  rows: ErrorTaxonomy[];
  copy: AdminCopy["catalogue"];
  locale: "uz" | "en";
  onEdit: (row: ErrorTaxonomy) => void;
}) {
  return (
    <table className="w-full border-collapse text-left">
      <thead>
        <tr className="border-b border-slate-200 bg-slate-50 dark:border-slate-800/60 dark:bg-slate-900/30">
          <Th>{copy.headers.codeLayer}</Th>
          <Th>{copy.headers.skill}</Th>
          <Th>{copy.headers.severity}</Th>
          <Th>{copy.headers.explanation}</Th>
          <Th align="right">{copy.headers.actions}</Th>
        </tr>
      </thead>
      <tbody className="divide-y divide-slate-200 dark:divide-slate-800/40">
        {rows.map((item) => (
          <tr key={item.code} className="group transition-colors hover:bg-slate-50 dark:hover:bg-slate-800/20">
            <td className="px-6 py-4">
              <div className="font-mono text-sm font-bold text-slate-900 dark:text-slate-200">{item.code}</div>
              <div className="mt-1 text-[10px] uppercase tracking-widest text-slate-500">{item.layer}</div>
            </td>
            <td className="px-6 py-4"><Badge tone="blue">{item.skill}</Badge></td>
            <td className="px-6 py-4"><SeverityBadge severity={item.severity} /></td>
            <td className="px-6 py-4">
              <p
                className="max-w-md truncate text-sm font-medium text-slate-700 dark:text-slate-300"
                title={locale === "en" ? item.explanation_en : item.explanation_uz}
              >
                {locale === "en" ? item.explanation_en : item.explanation_uz}
              </p>
            </td>
            <td className="px-6 py-4 text-right">
              <IconButton label={copy.edit} onClick={() => onEdit(item)} />
            </td>
          </tr>
        ))}
        {rows.length === 0 && <EmptyRow colSpan={5} copy={copy} />}
      </tbody>
    </table>
  );
}

function DrillsTable({ rows, copy, onEdit }: { rows: Drill[]; copy: AdminCopy["catalogue"]; onEdit: (row: Drill) => void }) {
  return (
    <table className="w-full border-collapse text-left">
      <thead>
        <tr className="border-b border-slate-200 bg-slate-50 dark:border-slate-800/60 dark:bg-slate-900/30">
          <Th>{copy.headers.code}</Th>
          <Th>{copy.headers.skillCefr}</Th>
          <Th>{copy.headers.targetCodes}</Th>
          <Th>{copy.headers.durationVariants}</Th>
          <Th align="right">{copy.headers.actions}</Th>
        </tr>
      </thead>
      <tbody className="divide-y divide-slate-200 dark:divide-slate-800/40">
        {rows.map((drill) => (
          <tr key={drill.id} className="group transition-colors hover:bg-slate-50 dark:hover:bg-slate-800/20">
            <td className="px-6 py-4 font-mono text-sm font-bold text-slate-900 dark:text-slate-200">{drill.code}</td>
            <td className="px-6 py-4">
              <div className="flex items-center gap-2">
                <Badge tone="emerald">{drill.skill}</Badge>
                <Badge tone="indigo">{drill.cefr_level}</Badge>
              </div>
            </td>
            <td className="px-6 py-4">
              <div className="flex max-w-lg flex-wrap gap-1">
                {drill.target_codes.map((code) => (
                  <span key={code} className="rounded bg-slate-100 px-1.5 py-0.5 font-mono text-[10px] text-slate-600 dark:bg-slate-800 dark:text-slate-300">
                    {code}
                  </span>
                ))}
              </div>
            </td>
            <td className="px-6 py-4 text-sm text-slate-600 dark:text-slate-400">
              {copy.meta.durationVariants
                .replace("{minutes}", String(drill.duration_minutes))
                .replace("{variants}", String(drill.variant_count))}
            </td>
            <td className="px-6 py-4 text-right">
              <IconButton label={copy.edit} onClick={() => onEdit(drill)} />
            </td>
          </tr>
        ))}
        {rows.length === 0 && <EmptyRow colSpan={5} copy={copy} />}
      </tbody>
    </table>
  );
}

function TopicsTable({
  rows,
  copy,
  locale,
  onEdit,
}: {
  rows: ConversationTopic[];
  copy: AdminCopy["catalogue"];
  locale: "uz" | "en";
  onEdit: (row: ConversationTopic) => void;
}) {
  return (
    <table className="w-full border-collapse text-left">
      <thead>
        <tr className="border-b border-slate-200 bg-slate-50 dark:border-slate-800/60 dark:bg-slate-900/30">
          <Th>{copy.headers.code}</Th>
          <Th>{copy.headers.titleKind}</Th>
          <Th>{copy.headers.cefr}</Th>
          <Th>{copy.headers.status}</Th>
          <Th align="right">{copy.headers.actions}</Th>
        </tr>
      </thead>
      <tbody className="divide-y divide-slate-200 dark:divide-slate-800/40">
        {rows.map((topic) => (
          <tr key={topic.id} className="group transition-colors hover:bg-slate-50 dark:hover:bg-slate-800/20">
            <td className="px-6 py-4 font-mono text-sm font-bold text-slate-900 dark:text-slate-200">{topic.code}</td>
            <td className="px-6 py-4">
              <div className="text-sm font-bold text-slate-900 dark:text-slate-200">
                {locale === "en" ? topic.title_en : topic.title_uz}
              </div>
              <div className="mt-1 text-[10px] uppercase tracking-widest text-slate-500">{topic.kind}</div>
            </td>
            <td className="px-6 py-4"><Badge tone="indigo">{topic.cefr_level}</Badge></td>
            <td className="px-6 py-4">
              <span className={`inline-flex items-center gap-1.5 text-xs font-bold ${topic.is_active ? "text-emerald-600 dark:text-emerald-400" : "text-slate-500"}`}>
                <span className={`h-2 w-2 rounded-full ${topic.is_active ? "bg-emerald-500" : "bg-slate-400"}`} />
                {topic.is_active ? copy.status.active : copy.status.inactive}
              </span>
            </td>
            <td className="px-6 py-4 text-right">
              <IconButton label={copy.edit} onClick={() => onEdit(topic)} />
            </td>
          </tr>
        ))}
        {rows.length === 0 && <EmptyRow colSpan={5} copy={copy} />}
      </tbody>
    </table>
  );
}

function CatalogueModal({
  activeTab,
  row,
  isCreating,
  saving,
  error,
  copy,
  onClose,
  onSubmit,
}: {
  activeTab: TabId;
  row: EditableRow;
  isCreating: boolean;
  saving: boolean;
  error: string;
  copy: AdminCopy["catalogue"];
  onClose: () => void;
  onSubmit: (formData: FormData) => Promise<void>;
}) {
  return (
    <div className="fixed inset-0 z-[80] flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm">
      <div className="max-h-[90vh] w-full max-w-2xl overflow-y-auto rounded-2xl border border-slate-200 bg-white shadow-2xl dark:border-slate-800 dark:bg-slate-950">
        <div className="flex items-center justify-between border-b border-slate-200 px-6 py-4 dark:border-slate-800">
          <div>
            <h2 className="text-xl font-black text-slate-900 dark:text-white">
              {isCreating ? copy.createTitle : copy.editTitle}
            </h2>
            <p className="text-sm text-slate-500">
              {activeTab === "taxonomy" && copy.taxonomyHelp}
              {activeTab === "drills" && copy.drillHelp}
              {activeTab === "topics" && copy.topicHelp}
            </p>
          </div>
          <button onClick={onClose} className="rounded-lg p-2 text-slate-400 hover:bg-slate-100 hover:text-slate-900 dark:hover:bg-slate-800 dark:hover:text-white">
            <X className="h-5 w-5" />
          </button>
        </div>

        <form action={onSubmit} className="space-y-5 p-6">
          {error && (
            <div className="rounded-xl border border-red-500/20 bg-red-500/10 px-4 py-3 text-sm font-semibold text-red-600">
              {error}
            </div>
          )}
          {activeTab === "taxonomy" && <TaxonomyFields row={row && "layer" in row ? row : null} copy={copy} />}
          {activeTab === "drills" && <DrillFields row={row && "duration_minutes" in row ? row : null} copy={copy} />}
          {activeTab === "topics" && <TopicFields row={row && "prompt" in row ? row : null} copy={copy} />}

          <div className="flex justify-end gap-3 border-t border-slate-200 pt-5 dark:border-slate-800">
            <button type="button" onClick={onClose} className="rounded-xl border border-slate-200 px-4 py-2 text-sm font-bold text-slate-700 hover:bg-slate-100 dark:border-slate-800 dark:text-slate-300 dark:hover:bg-slate-900">
              {copy.cancel}
            </button>
            <button disabled={saving} type="submit" className="inline-flex items-center gap-2 rounded-xl bg-emerald-500 px-4 py-2 text-sm font-bold text-white hover:bg-emerald-400 disabled:opacity-50">
              {saving && <Loader2 className="h-4 w-4 animate-spin" />}
              {copy.save}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

function TaxonomyFields({ row, copy }: { row: ErrorTaxonomy | null; copy: AdminCopy["catalogue"] }) {
  return (
    <div className="grid gap-4 sm:grid-cols-2">
      <TextField name="code" label={copy.fields.code} required defaultValue={row?.code ?? "grammar.article_missing"} />
      <SelectField name="skill" label={copy.fields.skill} defaultValue={row?.skill ?? "writing"} options={SKILLS} />
      <TextField name="layer" label={copy.fields.layer} required defaultValue={row?.layer ?? "sentence"} />
      <SelectField name="severity" label={copy.fields.severity} defaultValue={row?.severity ?? "minor"} options={SEVERITIES} />
      <TextArea name="explanation_uz" label={copy.fields.explanationUz} required defaultValue={row?.explanation_uz ?? ""} />
      <TextArea name="explanation_en" label={copy.fields.explanationEn} required defaultValue={row?.explanation_en ?? ""} />
      <TextField name="example_wrong" label={copy.fields.wrongExample} defaultValue={row?.example_wrong ?? ""} />
      <TextField name="example_correct" label={copy.fields.correctExample} defaultValue={row?.example_correct ?? ""} />
      <TextField
        name="recommended_drill_ids"
        label={copy.fields.recommendedDrillIds}
        defaultValue={(row?.recommended_drill_ids ?? []).join(", ")}
        helper={copy.fields.csvHelper}
      />
    </div>
  );
}

function DrillFields({ row, copy }: { row: Drill | null; copy: AdminCopy["catalogue"] }) {
  return (
    <div className="grid gap-4 sm:grid-cols-2">
      <TextField name="code" label={copy.fields.code} required defaultValue={row?.code ?? "writing.article-focus.b1"} />
      <SelectField name="skill" label={copy.fields.skill} defaultValue={row?.skill ?? "writing"} options={SKILLS} />
      <SelectField name="cefr_level" label={copy.fields.cefr} defaultValue={row?.cefr_level ?? "B1"} options={CEFR_LEVELS} />
      <TextField name="duration_minutes" label={copy.fields.durationMinutes} type="number" required defaultValue={String(row?.duration_minutes ?? 10)} />
      <TextField name="variant_count" label={copy.fields.variantCount} type="number" required defaultValue={String(row?.variant_count ?? 3)} />
      <TextField name="target_codes" label={copy.fields.targetCodes} required defaultValue={(row?.target_codes ?? ["grammar.article_missing"]).join(", ")} helper={copy.fields.csvHelper} />
      <TextArea name="payload" label={copy.fields.payloadJson} defaultValue={JSON.stringify(row?.payload ?? { instruction: "" }, null, 2)} className="sm:col-span-2" />
    </div>
  );
}

function TopicFields({ row, copy }: { row: ConversationTopic | null; copy: AdminCopy["catalogue"] }) {
  return (
    <div className="grid gap-4 sm:grid-cols-2">
      <TextField name="code" label={copy.fields.code} required defaultValue={row?.code ?? copy.defaults.topicCode} />
      <TextField name="title_uz" label={copy.fields.titleUz} required defaultValue={row?.title_uz ?? copy.defaults.topicTitleUz} />
      <TextField name="title_en" label={copy.fields.titleEn} required defaultValue={row?.title_en ?? copy.defaults.topicTitleEn} />
      <SelectField name="cefr_level" label={copy.fields.cefr} defaultValue={row?.cefr_level ?? "B2"} options={CEFR_LEVELS} />
      <TextField name="kind" label={copy.fields.kind} required defaultValue={row?.kind ?? "ielts_part_3"} />
      <label className="flex items-center gap-2 pt-8 text-sm font-bold text-slate-700 dark:text-slate-300">
        <input name="is_active" type="checkbox" defaultChecked={row?.is_active ?? true} className="h-4 w-4 rounded border-slate-300 text-emerald-500 focus:ring-emerald-500" />
        {copy.fields.active}
      </label>
      <TextArea name="prompt" label={copy.fields.prompt} required defaultValue={row?.prompt ?? copy.defaults.topicPrompt} className="sm:col-span-2" />
    </div>
  );
}

function TextField({
  name,
  label,
  defaultValue,
  required,
  type = "text",
  helper,
}: {
  name: string;
  label: string;
  defaultValue?: string;
  required?: boolean;
  type?: string;
  helper?: string;
}) {
  return (
    <label className="block">
      <span className="text-xs font-black uppercase tracking-widest text-slate-500">{label}</span>
      <input
        name={name}
        type={type}
        required={required}
        defaultValue={defaultValue}
        className="mt-2 w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 focus:border-emerald-500 focus:outline-none dark:border-slate-800 dark:bg-slate-900 dark:text-slate-100"
      />
      {helper && <span className="mt-1 block text-xs text-slate-500">{helper}</span>}
    </label>
  );
}

function TextArea({
  name,
  label,
  defaultValue,
  required,
  className = "",
}: {
  name: string;
  label: string;
  defaultValue?: string;
  required?: boolean;
  className?: string;
}) {
  return (
    <label className={`block ${className}`}>
      <span className="text-xs font-black uppercase tracking-widest text-slate-500">{label}</span>
      <textarea
        name={name}
        required={required}
        defaultValue={defaultValue}
        rows={4}
        className="mt-2 w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 focus:border-emerald-500 focus:outline-none dark:border-slate-800 dark:bg-slate-900 dark:text-slate-100"
      />
    </label>
  );
}

function SelectField({
  name,
  label,
  defaultValue,
  options,
}: {
  name: string;
  label: string;
  defaultValue: string;
  options: readonly string[];
}) {
  return (
    <label className="block">
      <span className="text-xs font-black uppercase tracking-widest text-slate-500">{label}</span>
      <select
        name={name}
        defaultValue={defaultValue}
        className="mt-2 w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 focus:border-emerald-500 focus:outline-none dark:border-slate-800 dark:bg-slate-900 dark:text-slate-100"
      >
        {options.map((option) => (
          <option key={option} value={option}>{option}</option>
        ))}
      </select>
    </label>
  );
}

function Th({ children, align = "left" }: { children: React.ReactNode; align?: "left" | "right" }) {
  return (
    <th className={`px-6 py-4 text-xs font-bold uppercase tracking-widest text-slate-500 ${align === "right" ? "text-right" : "text-left"}`}>
      {children}
    </th>
  );
}

function Badge({ children, tone }: { children: React.ReactNode; tone: "blue" | "emerald" | "indigo" }) {
  const tones = {
    blue: "bg-blue-500/10 text-blue-600 border-blue-500/10 dark:text-blue-400",
    emerald: "bg-emerald-500/10 text-emerald-600 border-emerald-500/10 dark:text-emerald-400",
    indigo: "bg-indigo-500/10 text-indigo-600 border-indigo-500/10 dark:text-indigo-400",
  };
  return (
    <span className={`rounded-lg border px-2 py-1 text-[10px] font-black uppercase tracking-wider ${tones[tone]}`}>
      {children}
    </span>
  );
}

function SeverityBadge({ severity }: { severity: ErrorTaxonomy["severity"] }) {
  const className =
    severity === "major"
      ? "bg-red-500/10 text-red-600 border-red-500/10 dark:text-red-400"
      : severity === "minor"
        ? "bg-yellow-500/10 text-yellow-600 border-yellow-500/10 dark:text-yellow-400"
        : "bg-emerald-500/10 text-emerald-600 border-emerald-500/10 dark:text-emerald-400";
  return (
    <span className={`rounded-lg border px-2 py-1 text-[10px] font-black uppercase tracking-wider ${className}`}>
      {severity}
    </span>
  );
}

function IconButton({ label, onClick }: { label: string; onClick: () => void }) {
  return (
    <button
      type="button"
      aria-label={label}
      onClick={onClick}
      className="rounded-lg p-2 text-slate-400 transition-all hover:bg-slate-100 hover:text-emerald-600 dark:hover:bg-slate-800 dark:hover:text-emerald-400"
    >
      <Edit2 className="h-4 w-4" />
    </button>
  );
}

function EmptyRow({ colSpan, copy }: { colSpan: number; copy: AdminCopy["catalogue"] }) {
  return (
    <tr>
      <td colSpan={colSpan} className="px-6 py-20 text-center text-slate-500">
        {copy.noRows}
      </td>
    </tr>
  );
}

function filterRows<T>(rows: T[], query: string, values: (row: T) => unknown[]): T[] {
  if (!query) return rows;
  return rows.filter((row) =>
    values(row).some((value) => String(value ?? "").toLowerCase().includes(query)),
  );
}

function upsertBy<T>(rows: T[], saved: T, getKey: (row: T) => string, originalKey?: string): T[] {
  const savedKey = getKey(saved);
  const keyToReplace = originalKey ?? savedKey;
  const exists = rows.some((row) => getKey(row) === keyToReplace || getKey(row) === savedKey);
  if (!exists) return [saved, ...rows];
  return rows.map((row) => (getKey(row) === keyToReplace || getKey(row) === savedKey ? saved : row));
}

function getFormString(formData: FormData, key: string): string {
  const value = formData.get(key);
  return typeof value === "string" ? value.trim() : "";
}

function getOptionalFormString(formData: FormData, key: string): string | null {
  const value = getFormString(formData, key);
  return value ? value : null;
}

function getFormNumber(formData: FormData, key: string, errorTemplate: string): number {
  const value = Number(getFormString(formData, key));
  if (!Number.isFinite(value)) {
    throw new Error(errorTemplate.replace("{field}", key));
  }
  return value;
}

function parseCsv(value: string): string[] {
  return value.split(",").map((part) => part.trim()).filter(Boolean);
}

function parseJsonObject(value: string, objectError: string): Record<string, unknown> {
  const parsed = JSON.parse(value || "{}");
  if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) {
    throw new Error(objectError);
  }
  return parsed as Record<string, unknown>;
}
