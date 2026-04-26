import { requireAdmin, getCookieHeader } from "@/lib/auth-server";
import { AdminShell } from "@/components/AdminShell";
import { api } from "@/lib/api";
import { Database, Search, Filter, ChevronRight, Eye, MoreVertical } from "lucide-react";
import Link from "next/link";

export default async function ItemsPage({
  searchParams,
}: {
  searchParams: Promise<{ skill?: string; cefr?: string; status?: string }>;
}) {
  const user = await requireAdmin("/items");
  const { skill, cefr, status } = await searchParams;
  const ck = await getCookieHeader();
  
  const items = await api.items.list({ skill, cefr, status }, ck);

  return (
    <AdminShell user={user}>
      <div className="p-6 sm:p-10">
        <div className="flex flex-col gap-6 sm:flex-row sm:items-center sm:justify-between mb-10">
          <div>
            <h1 className="text-3xl font-extrabold tracking-tight text-white flex items-center gap-3">
              <Database className="h-8 w-8 text-emerald-400" />
              Savollar banki
            </h1>
            <p className="mt-2 text-slate-400">
              Platformadagi barcha generatsiya qilingan va tasdiqlangan savollar ro'yxati.
            </p>
          </div>
          
          <div className="flex items-center gap-3">
            <button className="flex items-center gap-2 rounded-xl bg-slate-900 border border-slate-800 px-4 py-2 text-sm font-bold text-slate-300 hover:bg-slate-800 transition-colors">
              <Filter className="h-4 w-4" />
              Filtrlar
            </button>
            <Link 
              href="/generation"
              className="flex items-center gap-2 rounded-xl bg-emerald-500 px-4 py-2 text-sm font-bold text-white hover:bg-emerald-400 shadow-lg shadow-emerald-500/20 transition-all"
            >
              Yangi generatsiya
            </Link>
          </div>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-10">
          {[
            { label: "Jami savollar", value: "1,284", color: "text-emerald-400" },
            { label: "Tasdiqlangan", value: "842", color: "text-blue-400" },
            { label: "Reviewda", value: "156", color: "text-yellow-400" },
            { label: "Rad etilgan", value: "286", color: "text-red-400" },
          ].map((s) => (
            <div key={s.label} className="rounded-2xl border border-slate-800/60 bg-black/40 p-4">
              <p className="text-[10px] font-bold uppercase tracking-widest text-slate-500">{s.label}</p>
              <p className={`mt-1 text-2xl font-black ${s.color}`}>{s.value}</p>
            </div>
          ))}
        </div>

        {/* Items Table */}
        <div className="overflow-hidden rounded-3xl border border-slate-800/60 bg-black/40 backdrop-blur-xl">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-slate-800/60 bg-slate-900/30">
                <th className="px-6 py-4 text-xs font-bold uppercase tracking-widest text-slate-500">Savol ID</th>
                <th className="px-6 py-4 text-xs font-bold uppercase tracking-widest text-slate-500">Skill / Daraja</th>
                <th className="px-6 py-4 text-xs font-bold uppercase tracking-widest text-slate-500">Mavzu / Kontekst</th>
                <th className="px-6 py-4 text-xs font-bold uppercase tracking-widest text-slate-500">Holat</th>
                <th className="px-6 py-4 text-xs font-bold uppercase tracking-widest text-slate-500 text-right">Amallar</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/40">
              {items.map((item) => (
                <tr key={item.id} className="group hover:bg-slate-800/20 transition-colors">
                  <td className="px-6 py-4">
                    <span className="font-mono text-[10px] text-slate-500">{item.id.slice(0, 8)}...</span>
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-2">
                      <span className="rounded-lg bg-emerald-500/10 px-2 py-1 text-[10px] font-black text-emerald-400 uppercase tracking-wider border border-emerald-500/10">
                        {item.skill}
                      </span>
                      <span className="rounded-lg bg-blue-500/10 px-2 py-1 text-[10px] font-black text-blue-400 uppercase tracking-wider border border-blue-500/10">
                        {item.cefr_level}
                      </span>
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <p className="max-w-xs truncate text-sm font-medium text-slate-300">
                      {item.payload.passage || item.payload.prompt || "No text"}
                    </p>
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-1.5">
                      <div className="h-1.5 w-1.5 rounded-full bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.5)]" />
                      <span className="text-xs font-bold text-slate-400">Approved</span>
                    </div>
                  </td>
                  <td className="px-6 py-4 text-right">
                    <div className="flex items-center justify-end gap-2">
                      <button className="p-2 rounded-lg text-slate-500 hover:text-white hover:bg-slate-800 transition-all">
                        <Eye className="h-4 w-4" />
                      </button>
                      <button className="p-2 rounded-lg text-slate-500 hover:text-white hover:bg-slate-800 transition-all">
                        <MoreVertical className="h-4 w-4" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
              {items.length === 0 && (
                <tr>
                  <td colSpan={5} className="px-6 py-20 text-center text-slate-500">
                    Hozircha hech qanday savol topilmadi.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
        
        {/* Pagination */}
        <div className="mt-6 flex items-center justify-between">
          <p className="text-xs text-slate-500">Ko'rsatilyapti: 1 - {items.length} (jami 1,284)</p>
          <div className="flex gap-2">
            <button className="rounded-xl border border-slate-800 bg-slate-900/50 px-3 py-1.5 text-xs font-bold text-slate-400 hover:text-white disabled:opacity-30" disabled>Oldingi</button>
            <button className="rounded-xl border border-slate-800 bg-slate-900/50 px-3 py-1.5 text-xs font-bold text-slate-400 hover:text-white">Keyingi</button>
          </div>
        </div>
      </div>
    </AdminShell>
  );
}
