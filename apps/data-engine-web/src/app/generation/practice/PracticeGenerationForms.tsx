"use client";

import { useState } from "react";
import { api, DrillGenerateOut, ListeningPassageGenerateOut } from "@/lib/api";
import { Loader2, Copy, Check, Play } from "lucide-react";

export function PracticeGenerationForms() {
  const [activeTab, setActiveTab] = useState<"drill" | "listening">("drill");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [copied, setCopied] = useState(false);
  
  const [drillResult, setDrillResult] = useState<DrillGenerateOut | null>(null);
  const [listeningResult, setListeningResult] = useState<ListeningPassageGenerateOut | null>(null);

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleDrillSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setLoading(true);
    setError("");
    setDrillResult(null);
    setListeningResult(null);
    
    const formData = new FormData(e.currentTarget);
    const target_codes = (formData.get("target_codes") as string).split(",").map(s => s.trim()).filter(Boolean);
    
    try {
      const res = await api.generation.drills.generate({
        target_codes,
        cefr_level: formData.get("cefr_level") as string,
        drill_type: formData.get("drill_type") as string,
        item_count: parseInt(formData.get("item_count") as string, 10),
      });
      setDrillResult(res);
    } catch (err: any) {
      setError(err.message || "Failed to generate drill");
    } finally {
      setLoading(false);
    }
  };

  const handleListeningSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setLoading(true);
    setError("");
    setDrillResult(null);
    setListeningResult(null);
    
    const formData = new FormData(e.currentTarget);
    
    try {
      const res = await api.generation.listeningPassages.generate({
        part: parseInt(formData.get("part") as string, 10),
        cefr_level: formData.get("cefr_level") as string,
        topic: formData.get("topic") as string,
        duration_target_seconds: parseInt(formData.get("duration_target_seconds") as string, 10),
      });
      setListeningResult(res);
    } catch (err: any) {
      setError(err.message || "Failed to generate listening passage");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
      {/* Forms Column */}
      <div className="space-y-6">
        <div className="flex space-x-1 rounded-xl bg-slate-200/50 dark:bg-black/40 p-1 backdrop-blur-xl border border-slate-300/50 dark:border-slate-800/60 max-w-fit">
          <button
            onClick={() => setActiveTab("drill")}
            className={`rounded-lg px-4 py-2 text-sm font-bold transition-all ${
              activeTab === "drill"
                ? "bg-white dark:bg-slate-800 text-slate-900 dark:text-white shadow-sm"
                : "text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200"
            }`}
          >
            Drill Generatsiya
          </button>
          <button
            onClick={() => setActiveTab("listening")}
            className={`rounded-lg px-4 py-2 text-sm font-bold transition-all ${
              activeTab === "listening"
                ? "bg-white dark:bg-slate-800 text-slate-900 dark:text-white shadow-sm"
                : "text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200"
            }`}
          >
            Listening Matni
          </button>
        </div>

        <div className="overflow-hidden rounded-3xl border border-slate-200 dark:border-slate-800/60 bg-white dark:bg-black/40 p-6 backdrop-blur-xl">
          {error && (
            <div className="mb-6 rounded-xl bg-red-500/10 border border-red-500/20 p-4 text-sm font-medium text-red-600 dark:text-red-400">
              {error}
            </div>
          )}

          {activeTab === "drill" && (
            <form onSubmit={handleDrillSubmit} className="space-y-5">
              <div>
                <label className="block text-sm font-bold text-slate-700 dark:text-slate-300 mb-2">Target Codes (vergul bilan)</label>
                <input required name="target_codes" defaultValue="G1.1, V2.3" className="w-full rounded-xl border border-slate-300 dark:border-slate-700 bg-transparent px-4 py-3 text-sm focus:border-emerald-500 focus:outline-none dark:text-white" />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-bold text-slate-700 dark:text-slate-300 mb-2">CEFR Level</label>
                  <select name="cefr_level" defaultValue="B1" className="w-full rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-black px-4 py-3 text-sm focus:border-emerald-500 focus:outline-none dark:text-white">
                    <option value="A1">A1</option><option value="A2">A2</option><option value="B1">B1</option>
                    <option value="B2">B2</option><option value="C1">C1</option><option value="C2">C2</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-bold text-slate-700 dark:text-slate-300 mb-2">Drill Type</label>
                  <select name="drill_type" defaultValue="mcq" className="w-full rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-black px-4 py-3 text-sm focus:border-emerald-500 focus:outline-none dark:text-white">
                    <option value="mcq">Multiple Choice</option>
                    <option value="fill_in_the_blank">Fill in the blank</option>
                    <option value="sentence_rewrite">Sentence Rewrite</option>
                  </select>
                </div>
              </div>
              <div>
                <label className="block text-sm font-bold text-slate-700 dark:text-slate-300 mb-2">Item Count</label>
                <input type="number" required min={3} max={20} defaultValue={8} name="item_count" className="w-full rounded-xl border border-slate-300 dark:border-slate-700 bg-transparent px-4 py-3 text-sm focus:border-emerald-500 focus:outline-none dark:text-white" />
              </div>
              <button disabled={loading} type="submit" className="flex w-full items-center justify-center gap-2 rounded-xl bg-emerald-500 py-3.5 text-sm font-bold text-white transition-all hover:bg-emerald-400 disabled:opacity-50">
                {loading ? <Loader2 className="h-5 w-5 animate-spin" /> : <Play className="h-5 w-5" />}
                Generatsiya qilish
              </button>
            </form>
          )}

          {activeTab === "listening" && (
            <form onSubmit={handleListeningSubmit} className="space-y-5">
              <div>
                <label className="block text-sm font-bold text-slate-700 dark:text-slate-300 mb-2">Topic</label>
                <input required name="topic" defaultValue="A conversation about university life" className="w-full rounded-xl border border-slate-300 dark:border-slate-700 bg-transparent px-4 py-3 text-sm focus:border-emerald-500 focus:outline-none dark:text-white" />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-bold text-slate-700 dark:text-slate-300 mb-2">Part</label>
                  <select name="part" defaultValue="1" className="w-full rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-black px-4 py-3 text-sm focus:border-emerald-500 focus:outline-none dark:text-white">
                    <option value="1">Part 1 (Conversation)</option>
                    <option value="2">Part 2 (Monologue)</option>
                    <option value="3">Part 3 (Academic Conversation)</option>
                    <option value="4">Part 4 (Academic Lecture)</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-bold text-slate-700 dark:text-slate-300 mb-2">CEFR Level</label>
                  <select name="cefr_level" defaultValue="B2" className="w-full rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-black px-4 py-3 text-sm focus:border-emerald-500 focus:outline-none dark:text-white">
                    <option value="A1">A1</option><option value="A2">A2</option><option value="B1">B1</option>
                    <option value="B2">B2</option><option value="C1">C1</option><option value="C2">C2</option>
                  </select>
                </div>
              </div>
              <div>
                <label className="block text-sm font-bold text-slate-700 dark:text-slate-300 mb-2">Duration (seconds)</label>
                <input type="number" required min={30} max={900} defaultValue={180} name="duration_target_seconds" className="w-full rounded-xl border border-slate-300 dark:border-slate-700 bg-transparent px-4 py-3 text-sm focus:border-emerald-500 focus:outline-none dark:text-white" />
              </div>
              <button disabled={loading} type="submit" className="flex w-full items-center justify-center gap-2 rounded-xl bg-emerald-500 py-3.5 text-sm font-bold text-white transition-all hover:bg-emerald-400 disabled:opacity-50">
                {loading ? <Loader2 className="h-5 w-5 animate-spin" /> : <Play className="h-5 w-5" />}
                Generatsiya qilish
              </button>
            </form>
          )}
        </div>
      </div>

      {/* Preview Column */}
      <div className="overflow-hidden rounded-3xl border border-slate-200 dark:border-slate-800/60 bg-slate-50 dark:bg-slate-900/50 backdrop-blur-xl flex flex-col h-[600px] lg:h-auto">
        <div className="flex items-center justify-between border-b border-slate-200 dark:border-slate-800/60 bg-white dark:bg-black/40 px-6 py-4">
          <h3 className="font-bold text-slate-900 dark:text-white">Natija (JSON)</h3>
          {(drillResult || listeningResult) && (
            <button 
              onClick={() => copyToClipboard(JSON.stringify(drillResult || listeningResult, null, 2))}
              className="flex items-center gap-2 rounded-lg bg-slate-100 dark:bg-slate-800 px-3 py-1.5 text-xs font-bold text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700 transition-all"
            >
              {copied ? <Check className="h-3.5 w-3.5 text-emerald-500" /> : <Copy className="h-3.5 w-3.5" />}
              {copied ? "Nusxalandi" : "Nusxalash"}
            </button>
          )}
        </div>
        <div className="flex-1 overflow-y-auto p-6">
          {drillResult || listeningResult ? (
            <pre className="text-xs text-slate-700 dark:text-slate-300 whitespace-pre-wrap font-mono">
              {JSON.stringify(drillResult || listeningResult, null, 2)}
            </pre>
          ) : (
            <div className="flex h-full items-center justify-center text-sm font-medium text-slate-500">
              {loading ? "Generatsiya qilinmoqda..." : "Natija bu yerda ko'rinadi"}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
