"use client";

import { useState } from "react";
import { ErrorTaxonomy, Drill, ConversationTopic } from "@/lib/api";
import { Search, Filter, Plus, Edit2 } from "lucide-react";

export function PracticeCatalogueTabs({
  initialTaxonomy,
  initialDrills,
  initialTopics,
}: {
  initialTaxonomy: ErrorTaxonomy[];
  initialDrills: Drill[];
  initialTopics: ConversationTopic[];
}) {
  const [activeTab, setActiveTab] = useState<"taxonomy" | "drills" | "topics">("taxonomy");

  return (
    <div className="space-y-6">
      {/* Tabs */}
      <div className="flex space-x-1 rounded-xl bg-slate-200/50 dark:bg-black/40 p-1 backdrop-blur-xl border border-slate-300/50 dark:border-slate-800/60 max-w-fit">
        {[
          { id: "taxonomy", label: "Error Taxonomy" },
          { id: "drills", label: "Drills" },
          { id: "topics", label: "Conversation Topics" },
        ].map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id as any)}
            className={`rounded-lg px-4 py-2 text-sm font-bold transition-all ${
              activeTab === tab.id
                ? "bg-white dark:bg-slate-800 text-slate-900 dark:text-white shadow-sm"
                : "text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200"
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Tab Content */}
      <div className="overflow-hidden rounded-3xl border border-slate-200 dark:border-slate-800/60 bg-white dark:bg-black/40 backdrop-blur-xl">
        
        {/* Toolbar */}
        <div className="flex items-center justify-between p-4 border-b border-slate-200 dark:border-slate-800/60 bg-slate-50/50 dark:bg-slate-900/30">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
            <input 
              type="text" 
              placeholder="Qidirish..." 
              className="pl-9 pr-4 py-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl text-sm focus:outline-none focus:border-emerald-500 w-64 text-slate-900 dark:text-slate-100"
            />
          </div>
          <div className="flex items-center gap-2">
            <button className="flex items-center gap-2 rounded-xl bg-slate-100 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 px-3 py-2 text-sm font-bold text-slate-700 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-800 transition-colors">
              <Filter className="h-4 w-4" />
              Filtrlar
            </button>
            <button className="flex items-center gap-2 rounded-xl bg-emerald-500 px-3 py-2 text-sm font-bold text-white hover:bg-emerald-400 shadow-lg shadow-emerald-500/20 transition-all">
              <Plus className="h-4 w-4" />
              Qo'shish
            </button>
          </div>
        </div>

        {/* Tables */}
        <div className="overflow-x-auto">
          {activeTab === "taxonomy" && (
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-slate-200 dark:border-slate-800/60 bg-slate-50 dark:bg-slate-900/30">
                  <th className="px-6 py-4 text-xs font-bold uppercase tracking-widest text-slate-500">Code / Layer</th>
                  <th className="px-6 py-4 text-xs font-bold uppercase tracking-widest text-slate-500">Skill</th>
                  <th className="px-6 py-4 text-xs font-bold uppercase tracking-widest text-slate-500">Severity</th>
                  <th className="px-6 py-4 text-xs font-bold uppercase tracking-widest text-slate-500">Explanation</th>
                  <th className="px-6 py-4 text-xs font-bold uppercase tracking-widest text-slate-500 text-right">Amallar</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200 dark:divide-slate-800/40">
                {initialTaxonomy.map((item) => (
                  <tr key={item.code} className="group hover:bg-slate-50 dark:hover:bg-slate-800/20 transition-colors">
                    <td className="px-6 py-4">
                      <div className="font-mono text-sm font-bold text-slate-900 dark:text-slate-200">{item.code}</div>
                      <div className="text-[10px] text-slate-500 uppercase tracking-widest mt-1">{item.layer}</div>
                    </td>
                    <td className="px-6 py-4">
                      <span className="rounded-lg bg-blue-500/10 px-2 py-1 text-[10px] font-black text-blue-600 dark:text-blue-400 uppercase tracking-wider border border-blue-500/10">
                        {item.skill}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <span className={`rounded-lg px-2 py-1 text-[10px] font-black uppercase tracking-wider border ${
                        item.severity === 'major' ? 'bg-red-500/10 text-red-600 dark:text-red-400 border-red-500/10' :
                        item.severity === 'minor' ? 'bg-yellow-500/10 text-yellow-600 dark:text-yellow-400 border-yellow-500/10' :
                        'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/10'
                      }`}>
                        {item.severity}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <p className="max-w-xs truncate text-sm font-medium text-slate-700 dark:text-slate-300" title={item.explanation_uz}>
                        {item.explanation_uz}
                      </p>
                    </td>
                    <td className="px-6 py-4 text-right">
                      <button className="p-2 rounded-lg text-slate-400 hover:text-emerald-600 dark:hover:text-emerald-400 hover:bg-slate-100 dark:hover:bg-slate-800 transition-all">
                        <Edit2 className="h-4 w-4" />
                      </button>
                    </td>
                  </tr>
                ))}
                {initialTaxonomy.length === 0 && (
                  <tr>
                    <td colSpan={5} className="px-6 py-20 text-center text-slate-500">Hech narsa topilmadi.</td>
                  </tr>
                )}
              </tbody>
            </table>
          )}

          {activeTab === "drills" && (
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-slate-200 dark:border-slate-800/60 bg-slate-50 dark:bg-slate-900/30">
                  <th className="px-6 py-4 text-xs font-bold uppercase tracking-widest text-slate-500">Code</th>
                  <th className="px-6 py-4 text-xs font-bold uppercase tracking-widest text-slate-500">Skill / CEFR</th>
                  <th className="px-6 py-4 text-xs font-bold uppercase tracking-widest text-slate-500">Target Codes</th>
                  <th className="px-6 py-4 text-xs font-bold uppercase tracking-widest text-slate-500">Duration / Vars</th>
                  <th className="px-6 py-4 text-xs font-bold uppercase tracking-widest text-slate-500 text-right">Amallar</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200 dark:divide-slate-800/40">
                {initialDrills.map((drill) => (
                  <tr key={drill.id} className="group hover:bg-slate-50 dark:hover:bg-slate-800/20 transition-colors">
                    <td className="px-6 py-4 font-mono text-sm font-bold text-slate-900 dark:text-slate-200">{drill.code}</td>
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-2">
                        <span className="rounded-lg bg-emerald-500/10 px-2 py-1 text-[10px] font-black text-emerald-600 dark:text-emerald-400 uppercase tracking-wider border border-emerald-500/10">{drill.skill}</span>
                        <span className="rounded-lg bg-indigo-500/10 px-2 py-1 text-[10px] font-black text-indigo-600 dark:text-indigo-400 uppercase tracking-wider border border-indigo-500/10">{drill.cefr_level}</span>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex flex-wrap gap-1">
                        {drill.target_codes.map(c => (
                          <span key={c} className="rounded bg-slate-100 dark:bg-slate-800 px-1.5 py-0.5 font-mono text-[10px] text-slate-600 dark:text-slate-300">{c}</span>
                        ))}
                      </div>
                    </td>
                    <td className="px-6 py-4 text-sm text-slate-600 dark:text-slate-400">
                      {drill.duration_minutes} min / {drill.variant_count} vars
                    </td>
                    <td className="px-6 py-4 text-right">
                      <button className="p-2 rounded-lg text-slate-400 hover:text-emerald-600 dark:hover:text-emerald-400 hover:bg-slate-100 dark:hover:bg-slate-800 transition-all">
                        <Edit2 className="h-4 w-4" />
                      </button>
                    </td>
                  </tr>
                ))}
                {initialDrills.length === 0 && (
                  <tr>
                    <td colSpan={5} className="px-6 py-20 text-center text-slate-500">Hech narsa topilmadi.</td>
                  </tr>
                )}
              </tbody>
            </table>
          )}

          {activeTab === "topics" && (
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-slate-200 dark:border-slate-800/60 bg-slate-50 dark:bg-slate-900/30">
                  <th className="px-6 py-4 text-xs font-bold uppercase tracking-widest text-slate-500">Code</th>
                  <th className="px-6 py-4 text-xs font-bold uppercase tracking-widest text-slate-500">Title / Kind</th>
                  <th className="px-6 py-4 text-xs font-bold uppercase tracking-widest text-slate-500">CEFR</th>
                  <th className="px-6 py-4 text-xs font-bold uppercase tracking-widest text-slate-500">Status</th>
                  <th className="px-6 py-4 text-xs font-bold uppercase tracking-widest text-slate-500 text-right">Amallar</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200 dark:divide-slate-800/40">
                {initialTopics.map((topic) => (
                  <tr key={topic.id} className="group hover:bg-slate-50 dark:hover:bg-slate-800/20 transition-colors">
                    <td className="px-6 py-4 font-mono text-sm font-bold text-slate-900 dark:text-slate-200">{topic.code}</td>
                    <td className="px-6 py-4">
                      <div className="text-sm font-bold text-slate-900 dark:text-slate-200">{topic.title_uz}</div>
                      <div className="text-[10px] text-slate-500 uppercase tracking-widest mt-1">{topic.kind}</div>
                    </td>
                    <td className="px-6 py-4">
                      <span className="rounded-lg bg-indigo-500/10 px-2 py-1 text-[10px] font-black text-indigo-600 dark:text-indigo-400 uppercase tracking-wider border border-indigo-500/10">{topic.cefr_level}</span>
                    </td>
                    <td className="px-6 py-4">
                      {topic.is_active ? (
                        <div className="flex items-center gap-1.5"><div className="h-2 w-2 rounded-full bg-emerald-500" /><span className="text-xs font-bold text-emerald-600 dark:text-emerald-400">Active</span></div>
                      ) : (
                        <div className="flex items-center gap-1.5"><div className="h-2 w-2 rounded-full bg-slate-300 dark:bg-slate-600" /><span className="text-xs font-bold text-slate-500">Inactive</span></div>
                      )}
                    </td>
                    <td className="px-6 py-4 text-right">
                      <button className="p-2 rounded-lg text-slate-400 hover:text-emerald-600 dark:hover:text-emerald-400 hover:bg-slate-100 dark:hover:bg-slate-800 transition-all">
                        <Edit2 className="h-4 w-4" />
                      </button>
                    </td>
                  </tr>
                ))}
                {initialTopics.length === 0 && (
                  <tr>
                    <td colSpan={5} className="px-6 py-20 text-center text-slate-500">Hech narsa topilmadi.</td>
                  </tr>
                )}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </div>
  );
}
