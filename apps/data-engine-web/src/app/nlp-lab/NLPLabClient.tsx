"use client";

import React, { useState, useEffect } from "react";
import { api, NLPOverview, CalibrationRun, DIFFinding, IRRResult } from "@/lib/api";
import { getAdminCopy } from "@/lib/admin-i18n";
import {
  BrainCircuit,
  CheckCircle2,
  Database,
  Gauge,
  Microscope,
  ShieldCheck,
  RefreshCw,
  Sliders,
  BarChart3,
  Play,
  Check,
  AlertCircle,
  HelpCircle,
  Calendar,
  Hash,
  Scale,
  ListFilter
} from "lucide-react";

interface NLPLabClientProps {
  initialOverview: NLPOverview;
  user: {
    locale: "uz" | "en";
  };
}

type TabType = "overview" | "calibration" | "dif" | "irr";

export default function NLPLabClient({ initialOverview, user }: NLPLabClientProps) {
  const [activeTab, setActiveTab] = useState<TabType>("overview");
  const copy = getAdminCopy(user.locale).nlpLab;
  const locale = user.locale === "en" ? "en-US" : "uz-UZ";
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  // State for Calibration
  const [calibrationRuns, setCalibrationRuns] = useState<CalibrationRun[]>([]);
  const [isCalibrating, setIsCalibrating] = useState(false);
  const [calibError, setCalibError] = useState<string | null>(null);
  const [calibSuccess, setCalibSuccess] = useState<string | null>(null);
  const [minResponses, setMinResponses] = useState(30);

  // State for DIF
  const [difFindings, setDifFindings] = useState<DIFFinding[]>([]);
  const [isRunningDif, setIsRunningDif] = useState(false);
  const [difError, setDifError] = useState<string | null>(null);
  const [difSuccess, setDifSuccess] = useState<string | null>(null);
  const [groupA, setGroupA] = useState("uz");
  const [groupB, setGroupB] = useState("ru");

  // State for IRR
  const [raterAInput, setRaterAInput] = useState("6.0, 5.5, 7.0, 6.5, 8.0, 5.0");
  const [raterBInput, setRaterBInput] = useState("6.5, 5.5, 7.0, 6.0, 7.5, 5.5");
  const [isComputingIrr, setIsComputingIrr] = useState(false);
  const [irrResult, setIrrResult] = useState<IRRResult | null>(null);
  const [irrError, setIrrError] = useState<string | null>(null);

  // Fetch Calibration runs
  const fetchCalibrationRuns = async () => {
    try {
      const runs = await api.research.calibration.runs();
      setCalibrationRuns(runs);
    } catch (err: any) {
      console.error("Error fetching calibration runs:", err);
    }
  };

  // Fetch DIF findings
  const fetchDifFindings = async () => {
    try {
      const findings = await api.research.dif.findings();
      setDifFindings(findings);
    } catch (err: any) {
      console.error("Error fetching DIF findings:", err);
    }
  };

  useEffect(() => {
    if (activeTab === "calibration") {
      fetchCalibrationRuns();
    } else if (activeTab === "dif") {
      fetchDifFindings();
    }
  }, [activeTab]);

  const handleTriggerCalibration = async () => {
    setIsCalibrating(true);
    setCalibError(null);
    setCalibSuccess(null);
    try {
      await api.research.calibration.run();
      setCalibSuccess(copy.calibration.triggeredSuccess);
      fetchCalibrationRuns();
    } catch (err: any) {
      setCalibError(err.detail || err.message || "Failed to trigger calibration");
    } finally {
      setIsCalibrating(false);
    }
  };

  const handleTriggerDif = async () => {
    setIsRunningDif(true);
    setDifError(null);
    setDifSuccess(null);
    try {
      await api.research.dif.run(groupA, groupB);
      setDifSuccess(copy.dif.triggeredSuccess);
      fetchDifFindings();
    } catch (err: any) {
      setDifError(err.detail || err.message || "Failed to run DIF analysis");
    } finally {
      setIsRunningDif(false);
    }
  };

  const handleComputeIrr = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsComputingIrr(true);
    setIrrError(null);
    setIrrResult(null);

    const parseScores = (input: string) =>
      input
        .split(",")
        .map((s) => parseFloat(s.trim()))
        .filter((n) => !isNaN(n));

    const scoresA = parseScores(raterAInput);
    const scoresB = parseScores(raterBInput);

    if (scoresA.length !== scoresB.length || scoresA.length < 2) {
      setIrrError(copy.irr.errorInvalidInputs);
      setIsComputingIrr(false);
      return;
    }

    try {
      const result = await api.research.irr.compute(scoresA, scoresB);
      setIrrResult(result);
    } catch (err: any) {
      setIrrError(err.detail || err.message || "Failed to compute IRR");
    } finally {
      setIsComputingIrr(false);
    }
  };

  const formatDateTime = (isoString: string) => {
    if (!mounted) return "";
    try {
      return new Intl.DateTimeFormat(locale, {
        dateStyle: "medium",
        timeStyle: "short",
      }).format(new Date(isoString));
    } catch {
      return isoString;
    }
  };

  const gateLabels = copy.gates as Record<string, string>;
  const verdictLabels = copy.verdicts as Record<string, string>;

  return (
    <div className="p-6 sm:p-10">
      {/* Page Header */}
      <div className="mb-8 max-w-4xl">
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

      {/* Premium Tabs Selection */}
      <div className="mb-8 border-b border-slate-200 dark:border-slate-800">
        <nav className="-mb-px flex gap-6" aria-label="Tabs">
          {(["overview", "calibration", "dif", "irr"] as TabType[]).map((tab) => {
            const isActive = activeTab === tab;
            return (
              <button
                key={tab}
                onClick={() => setActiveTab(tab)}
                className={`group border-b-2 py-4 px-1 text-sm font-black transition-all duration-200 ${
                  isActive
                    ? "border-emerald-500 text-emerald-600 dark:text-emerald-400"
                    : "border-transparent text-slate-500 hover:border-slate-300 hover:text-slate-700 dark:hover:text-slate-300"
                }`}
              >
                <span className="flex items-center gap-2">
                  {tab === "overview" && <BarChart3 className="h-4 w-4" />}
                  {tab === "calibration" && <RefreshCw className="h-4 w-4" />}
                  {tab === "dif" && <Sliders className="h-4 w-4" />}
                  {tab === "irr" && <Scale className="h-4 w-4" />}
                  {copy.tabs[tab]}
                </span>
              </button>
            );
          })}
        </nav>
      </div>

      {/* Tab Contents */}
      <div className="transition-all duration-300">
        {activeTab === "overview" && (
          <div className="space-y-8 animate-in fade-in duration-200">
            {/* Overview Stats Grid */}
            <section className="grid grid-cols-2 gap-4 lg:grid-cols-4">
              <MetricCard icon={Database} label={copy.metrics.totalItems} value={initialOverview.total_items} />
              <MetricCard icon={ShieldCheck} label={copy.metrics.validatedItems} value={initialOverview.validated_items} />
              <MetricCard icon={CheckCircle2} label={copy.metrics.validationResults} value={initialOverview.validation_results} />
              <MetricCard icon={Gauge} label={copy.metrics.semanticEmbeddings} value={initialOverview.semantic_embeddings} />
            </section>

            {/* AI Jury & Average NLP Criteria */}
            <section className="grid gap-6 xl:grid-cols-[0.9fr_1.1fr]">
              <Panel title={copy.verdictTitle}>
                <div className="grid gap-3">
                  {Object.entries(initialOverview.verdicts)
                    .sort(([a], [b]) => a.localeCompare(b))
                    .map(([key, value]) => (
                      <BarRow
                        key={key}
                        label={verdictLabels[key] ?? key}
                        value={value}
                        max={Math.max(initialOverview.validation_results, 1)}
                        tone={key === "approve" ? "emerald" : key === "reject" ? "red" : "amber"}
                      />
                    ))}
                  {Object.keys(initialOverview.verdicts).length === 0 ? (
                    <Empty copy={copy.empty} />
                  ) : null}
                </div>
              </Panel>

              <Panel title={copy.criteriaTitle}>
                <div className="grid gap-3">
                  {Object.entries(initialOverview.criteria_averages)
                    .sort(([a], [b]) => a.localeCompare(b))
                    .map(([key, value]) => (
                      <BarRow key={key} label={key.replaceAll("_", " ")} value={value} max={5} tone="blue" suffix="/5" />
                    ))}
                  {Object.keys(initialOverview.criteria_averages).length === 0 ? (
                    <Empty copy={copy.empty} />
                  ) : null}
                </div>
              </Panel>
            </section>

            {/* Quality Gates & Skill/CEFR Coverage */}
            <section className="grid gap-6 xl:grid-cols-2">
              <Panel title={copy.gatesTitle}>
                <div className="grid gap-3 sm:grid-cols-2">
                  {Object.entries(initialOverview.quality_gates)
                    .sort(([a], [b]) => a.localeCompare(b))
                    .map(([key, value]) => (
                      <div
                        key={key}
                        className="rounded-lg border border-slate-200 bg-slate-50 p-4 dark:border-slate-800 dark:bg-slate-900/40"
                      >
                        <p className="text-[11px] font-black uppercase tracking-widest text-slate-500">
                          {gateLabels[key] ?? key.replaceAll("_", " ")}
                        </p>
                        <p className="mt-2 text-2xl font-black text-slate-900 dark:text-white">{value}</p>
                      </div>
                    ))}
                </div>
              </Panel>

              <Panel title={copy.coverageTitle}>
                <div className="grid gap-5 sm:grid-cols-2">
                  <CoverageList data={initialOverview.coverage_by_skill} />
                  <CoverageList data={initialOverview.coverage_by_cefr} />
                </div>
              </Panel>
            </section>

            {/* Recent Validations */}
            <section>
              <Panel title={copy.recentTitle}>
                <div className="grid gap-4">
                  {initialOverview.recent_validations.map((row) => (
                    <div
                      key={row.id}
                      className="rounded-lg border border-slate-200 bg-slate-50 p-4 dark:border-slate-800 dark:bg-slate-900/40"
                    >
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="rounded-md bg-emerald-500/10 px-2 py-1 text-[11px] font-black uppercase text-emerald-700 dark:text-emerald-300">
                          {row.skill} / {row.cefr_level}
                        </span>
                        <span className="rounded-md bg-blue-500/10 px-2 py-1 text-[11px] font-black uppercase text-blue-700 dark:text-blue-300">
                          {verdictLabels[row.verdict] ?? row.verdict}
                        </span>
                        <span className="text-[11px] font-mono text-slate-500">
                          {formatDateTime(row.created_at)}
                        </span>
                      </div>
                      <p className="mt-3 text-sm leading-6 text-slate-700 dark:text-slate-300">
                        {row.reasoning_excerpt}
                      </p>
                    </div>
                  ))}
                  {initialOverview.recent_validations.length === 0 ? (
                    <Empty copy={copy.empty} />
                  ) : null}
                </div>
              </Panel>
            </section>
          </div>
        )}

        {activeTab === "calibration" && (
          <div className="space-y-6 animate-in fade-in duration-200">
            {/* Panel Description and Trigger */}
            <div className="rounded-lg border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-800/60 dark:bg-black/40">
              <h2 className="text-xl font-black text-slate-900 dark:text-white mb-2">
                {copy.calibration.title}
              </h2>
              <p className="text-sm text-slate-600 dark:text-slate-400 mb-6 max-w-4xl leading-relaxed">
                {copy.calibration.desc}
              </p>

              {/* Status messages */}
              {calibError && (
                <div className="mb-4 flex items-center gap-2 rounded-lg border border-red-500/20 bg-red-500/10 p-4 text-sm text-red-700 dark:text-red-300">
                  <AlertCircle className="h-5 w-5 shrink-0" />
                  {calibError}
                </div>
              )}
              {calibSuccess && (
                <div className="mb-4 flex items-center gap-2 rounded-lg border border-emerald-500/20 bg-emerald-500/10 p-4 text-sm text-emerald-700 dark:text-emerald-300">
                  <Check className="h-5 w-5 shrink-0" />
                  {calibSuccess}
                </div>
              )}

              <div className="flex flex-wrap items-center gap-4">
                <button
                  onClick={handleTriggerCalibration}
                  disabled={isCalibrating}
                  className="inline-flex items-center gap-2 rounded-lg bg-emerald-600 px-5 py-3 text-sm font-bold text-white transition-all hover:bg-emerald-500 disabled:opacity-50"
                >
                  <Play className={`h-4 w-4 ${isCalibrating ? "animate-spin" : ""}`} />
                  {isCalibrating ? copy.calibration.triggering : copy.calibration.triggerBtn}
                </button>
              </div>
            </div>

            {/* Past Calibration Runs List */}
            <div className="rounded-lg border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-800/60 dark:bg-black/40">
              <h3 className="text-lg font-black text-slate-900 dark:text-white mb-4">
                Calibration Runs History
              </h3>
              {calibrationRuns.length === 0 ? (
                <div className="rounded-lg bg-slate-50 p-6 text-center text-sm text-slate-500 dark:bg-slate-900/40">
                  {copy.calibration.noRuns}
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-sm border-collapse">
                    <thead>
                      <tr className="border-b border-slate-200 dark:border-slate-800 text-[11px] font-black uppercase tracking-widest text-slate-400">
                        <th className="py-3 px-4">{copy.calibration.table.id}</th>
                        <th className="py-3 px-4">{copy.calibration.table.startedAt}</th>
                        <th className="py-3 px-4">{copy.calibration.table.finishedAt}</th>
                        <th className="py-3 px-4">{copy.calibration.table.method}</th>
                        <th className="py-3 px-4 text-right">{copy.calibration.table.itemsCount}</th>
                        <th className="py-3 px-4 text-right">{copy.calibration.table.responsesCount}</th>
                        <th className="py-3 px-4 text-center">{copy.calibration.table.status}</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 dark:divide-slate-800/50">
                      {calibrationRuns.map((run) => (
                        <tr key={run.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-900/20 transition-colors">
                          <td className="py-3 px-4 font-mono text-xs text-slate-500">{run.id.substring(0, 8)}...</td>
                          <td className="py-3 px-4 text-slate-700 dark:text-slate-300">{formatDateTime(run.started_at)}</td>
                          <td className="py-3 px-4 text-slate-500">
                            {run.finished_at ? formatDateTime(run.finished_at) : "-"}
                          </td>
                          <td className="py-3 px-4 font-semibold text-slate-700 dark:text-slate-300">{run.method}</td>
                          <td className="py-3 px-4 text-right font-mono font-bold text-slate-900 dark:text-white">
                            {run.n_items_recalibrated}
                          </td>
                          <td className="py-3 px-4 text-right font-mono text-slate-600 dark:text-slate-400">
                            {run.n_responses_used}
                          </td>
                          <td className="py-3 px-4 text-center">
                            <span
                              className={`inline-flex rounded-full px-2 py-0.5 text-xs font-black uppercase ${
                                run.status === "completed"
                                  ? "bg-emerald-100 text-emerald-800 dark:bg-emerald-500/10 dark:text-emerald-400"
                                  : run.status === "failed"
                                  ? "bg-red-100 text-red-800 dark:bg-red-500/10 dark:text-red-400"
                                  : "bg-amber-100 text-amber-800 dark:bg-amber-500/10 dark:text-amber-400"
                              }`}
                            >
                              {run.status}
                            </span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </div>
        )}

        {activeTab === "dif" && (
          <div className="space-y-6 animate-in fade-in duration-200">
            {/* Panel Description and Trigger Form */}
            <div className="rounded-lg border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-800/60 dark:bg-black/40">
              <h2 className="text-xl font-black text-slate-900 dark:text-white mb-2">
                {copy.dif.title}
              </h2>
              <p className="text-sm text-slate-600 dark:text-slate-400 mb-6 max-w-4xl leading-relaxed">
                {copy.dif.desc}
              </p>

              {/* Status messages */}
              {difError && (
                <div className="mb-4 flex items-center gap-2 rounded-lg border border-red-500/20 bg-red-500/10 p-4 text-sm text-red-700 dark:text-red-300">
                  <AlertCircle className="h-5 w-5 shrink-0" />
                  {difError}
                </div>
              )}
              {difSuccess && (
                <div className="mb-4 flex items-center gap-2 rounded-lg border border-emerald-500/20 bg-emerald-500/10 p-4 text-sm text-emerald-700 dark:text-emerald-300">
                  <Check className="h-5 w-5 shrink-0" />
                  {difSuccess}
                </div>
              )}

              <div className="flex flex-wrap gap-4 items-end max-w-2xl bg-slate-50 dark:bg-slate-900/40 p-4 rounded-lg border border-slate-200 dark:border-slate-800">
                <div className="flex-1 min-w-[150px]">
                  <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">
                    {copy.dif.groupA}
                  </label>
                  <input
                    type="text"
                    value={groupA}
                    onChange={(e) => setGroupA(e.target.value)}
                    className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm bg-white dark:bg-black text-slate-900 dark:text-white focus:outline-none focus:ring-1 focus:ring-emerald-500 dark:border-slate-800"
                  />
                </div>
                <div className="flex-1 min-w-[150px]">
                  <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">
                    {copy.dif.groupB}
                  </label>
                  <input
                    type="text"
                    value={groupB}
                    onChange={(e) => setGroupB(e.target.value)}
                    className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm bg-white dark:bg-black text-slate-900 dark:text-white focus:outline-none focus:ring-1 focus:ring-emerald-500 dark:border-slate-800"
                  />
                </div>
                <div>
                  <button
                    onClick={handleTriggerDif}
                    disabled={isRunningDif}
                    className="inline-flex items-center gap-2 rounded-lg bg-emerald-600 px-5 py-2.5 text-sm font-bold text-white transition-all hover:bg-emerald-500 disabled:opacity-50"
                  >
                    <Play className={`h-4 w-4 ${isRunningDif ? "animate-spin" : ""}`} />
                    {isRunningDif ? copy.dif.triggering : copy.dif.triggerBtn}
                  </button>
                </div>
              </div>
            </div>

            {/* Flagged DIF Findings */}
            <div className="rounded-lg border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-800/60 dark:bg-black/40">
              <h3 className="text-lg font-black text-slate-900 dark:text-white mb-4">
                Flagged DIF Items
              </h3>
              {difFindings.length === 0 ? (
                <div className="rounded-lg bg-slate-50 p-6 text-center text-sm text-slate-500 dark:bg-slate-900/40">
                  {copy.dif.noFindings}
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-sm border-collapse">
                    <thead>
                      <tr className="border-b border-slate-200 dark:border-slate-800 text-[11px] font-black uppercase tracking-widest text-slate-400">
                        <th className="py-3 px-4">{copy.dif.table.questionId}</th>
                        <th className="py-3 px-4">{copy.dif.table.groups}</th>
                        <th className="py-3 px-4">{copy.dif.table.method}</th>
                        <th className="py-3 px-4 text-right">{copy.dif.table.effectSize}</th>
                        <th className="py-3 px-4 text-right">{copy.dif.table.pValue}</th>
                        <th className="py-3 px-4 text-center">{copy.dif.table.flagged}</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 dark:divide-slate-800/50">
                      {difFindings.map((finding, idx) => (
                        <tr key={idx} className="hover:bg-slate-50/50 dark:hover:bg-slate-900/20 transition-colors">
                          <td className="py-3 px-4 font-mono text-xs text-slate-500">{finding.question_id.substring(0, 8)}...</td>
                          <td className="py-3 px-4 font-semibold text-slate-700 dark:text-slate-300">
                            {finding.group_a} vs {finding.group_b}
                          </td>
                          <td className="py-3 px-4 text-slate-600 dark:text-slate-400">{finding.method}</td>
                          <td className="py-3 px-4 text-right font-mono font-bold text-amber-600 dark:text-amber-400">
                            {finding.effect_size.toFixed(4)}
                          </td>
                          <td className="py-3 px-4 text-right font-mono text-slate-600 dark:text-slate-400">
                            {finding.p_value.toFixed(4)}
                          </td>
                          <td className="py-3 px-4 text-center">
                            <span className="inline-flex rounded-full bg-red-100 px-2 py-0.5 text-xs font-black uppercase text-red-800 dark:bg-red-500/10 dark:text-red-400">
                              {String(finding.flagged)}
                            </span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </div>
        )}

        {activeTab === "irr" && (
          <div className="space-y-6 animate-in fade-in duration-200">
            {/* Panel Description & Calculator Form */}
            <div className="rounded-lg border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-800/60 dark:bg-black/40">
              <h2 className="text-xl font-black text-slate-900 dark:text-white mb-2">
                {copy.irr.title}
              </h2>
              <p className="text-sm text-slate-600 dark:text-slate-400 mb-6 max-w-4xl leading-relaxed">
                {copy.irr.desc}
              </p>

              {irrError && (
                <div className="mb-4 flex items-center gap-2 rounded-lg border border-red-500/20 bg-red-500/10 p-4 text-sm text-red-700 dark:text-red-300">
                  <AlertCircle className="h-5 w-5 shrink-0" />
                  {irrError}
                </div>
              )}

              <form onSubmit={handleComputeIrr} className="space-y-4 max-w-3xl">
                <div>
                  <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">
                    {copy.irr.raterALabel}
                  </label>
                  <input
                    type="text"
                    value={raterAInput}
                    onChange={(e) => setRaterAInput(e.target.value)}
                    placeholder={copy.irr.raterAPlaceholder}
                    className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm bg-white dark:bg-black text-slate-900 dark:text-white focus:outline-none focus:ring-1 focus:ring-emerald-500 dark:border-slate-800 font-mono"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">
                    {copy.irr.raterBLabel}
                  </label>
                  <input
                    type="text"
                    value={raterBInput}
                    onChange={(e) => setRaterBInput(e.target.value)}
                    placeholder={copy.irr.raterBPlaceholder}
                    className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm bg-white dark:bg-black text-slate-900 dark:text-white focus:outline-none focus:ring-1 focus:ring-emerald-500 dark:border-slate-800 font-mono"
                  />
                </div>
                <div>
                  <button
                    type="submit"
                    disabled={isComputingIrr}
                    className="inline-flex items-center gap-2 rounded-lg bg-emerald-600 px-5 py-3 text-sm font-bold text-white transition-all hover:bg-emerald-500 disabled:opacity-50"
                  >
                    <Play className={`h-4 w-4 ${isComputingIrr ? "animate-spin" : ""}`} />
                    {isComputingIrr ? copy.irr.computing : copy.irr.computeBtn}
                  </button>
                </div>
              </form>
            </div>

            {/* Results Panel */}
            {irrResult && (
              <div className="rounded-lg border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-800/60 dark:bg-black/40 animate-in slide-in-from-bottom duration-200">
                <h3 className="text-lg font-black text-slate-900 dark:text-white mb-4">
                  {copy.irr.resultTitle}
                </h3>
                <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
                  <div className="rounded-lg bg-emerald-500/5 border border-emerald-500/10 p-4">
                    <p className="text-[11px] font-black uppercase tracking-widest text-emerald-600 dark:text-emerald-400">
                      {copy.irr.kappa}
                    </p>
                    <p className="mt-2 text-3xl font-black text-emerald-700 dark:text-emerald-300">
                      {irrResult.kappa.toFixed(4)}
                    </p>
                  </div>
                  {irrResult.pearson_r !== undefined && (
                    <div className="rounded-lg bg-blue-500/5 border border-blue-500/10 p-4">
                      <p className="text-[11px] font-black uppercase tracking-widest text-blue-600 dark:text-blue-400">
                        {copy.irr.pearson}
                      </p>
                      <p className="mt-2 text-3xl font-black text-blue-700 dark:text-blue-300">
                        {irrResult.pearson_r.toFixed(4)}
                      </p>
                    </div>
                  )}
                  {irrResult.mae !== undefined && (
                    <div className="rounded-lg bg-slate-500/5 border border-slate-500/10 p-4">
                      <p className="text-[11px] font-black uppercase tracking-widest text-slate-500">
                        {copy.irr.mae}
                      </p>
                      <p className="mt-2 text-3xl font-black text-slate-700 dark:text-slate-300">
                        {irrResult.mae.toFixed(4)}
                      </p>
                    </div>
                  )}
                  <div className="rounded-lg bg-slate-500/5 border border-slate-500/10 p-4">
                    <p className="text-[11px] font-black uppercase tracking-widest text-slate-500">
                      {copy.irr.sampleSize}
                    </p>
                    <p className="mt-2 text-3xl font-black text-slate-700 dark:text-slate-300">
                      {irrResult.n}
                    </p>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
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
      {Object.entries(data)
        .sort(([a], [b]) => a.localeCompare(b))
        .map(([key, value]) => (
          <BarRow key={key} label={key} value={value} max={max} tone="emerald" />
        ))}
    </div>
  );
}

function Empty({ copy }: { copy: string }) {
  return <p className="rounded-lg bg-slate-50 p-4 text-sm text-slate-500 dark:bg-slate-900/40">{copy}</p>;
}
