import { requireAdmin, getCookieHeader } from "@/lib/auth-server";
import { AdminShell } from "@/components/AdminShell";
import { api } from "@/lib/api";
import { ClipboardCheck, CheckCircle2, XCircle, ChevronRight, Eye } from "lucide-react";

export default async function ReviewPage() {
  const user = await requireAdmin("/review");
  const ck = await getCookieHeader();
  
  // Filter for questions that need review
  const items = await api.items.list({ status: "in_review" }, ck);

  return (
    <AdminShell user={user}>
      <div className="p-6 sm:p-10">
        <div className="mb-10">
          <h1 className="text-3xl font-extrabold tracking-tight text-white flex items-center gap-3">
            <ClipboardCheck className="h-8 w-8 text-yellow-400" />
            Tasdiqlash navbati
          </h1>
          <p className="mt-2 text-slate-400">
            AI tomonidan yaratilgan va "Review" holatidagi savollarni ko'rib chiqing va tasdiqlang.
          </p>
        </div>

        <div className="grid gap-6">
          {items.map((item) => (
            <div 
              key={item.id}
              className="group relative overflow-hidden rounded-3xl border border-slate-800/60 bg-black/40 p-6 backdrop-blur-xl transition-all hover:border-yellow-500/30"
            >
              <div className="flex flex-col lg:flex-row lg:items-start gap-6">
                {/* Content Preview */}
                <div className="flex-1 space-y-4">
                  <div className="flex items-center gap-3">
                    <span className="rounded-lg bg-yellow-500/10 px-2 py-1 text-[10px] font-black text-yellow-400 uppercase tracking-widest border border-yellow-500/10">
                      In Review
                    </span>
                    <span className="font-mono text-[10px] text-slate-500">{item.id}</span>
                  </div>
                  
                  <div className="space-y-2">
                    <h3 className="text-sm font-bold text-slate-400 uppercase tracking-wider">Passage / Prompt</h3>
                    <p className="text-slate-200 line-clamp-3 leading-relaxed">
                      {item.payload.passage || item.payload.prompt}
                    </p>
                  </div>

                  <div className="flex items-center gap-6">
                    <div>
                      <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Skill</p>
                      <p className="text-sm font-bold text-white uppercase">{item.skill}</p>
                    </div>
                    <div>
                      <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">CEFR</p>
                      <p className="text-sm font-bold text-white uppercase">{item.cefr_level}</p>
                    </div>
                  </div>
                </div>

                {/* Actions */}
                <div className="flex flex-row lg:flex-col gap-2 shrink-0">
                  <button className="flex-1 lg:w-40 flex items-center justify-center gap-2 rounded-xl bg-emerald-500 px-4 py-3 text-sm font-black text-white hover:bg-emerald-400 transition-all shadow-lg shadow-emerald-500/10">
                    <CheckCircle2 className="h-4 w-4" />
                    Tasdiqlash
                  </button>
                  <button className="flex-1 lg:w-40 flex items-center justify-center gap-2 rounded-xl bg-slate-800 px-4 py-3 text-sm font-black text-slate-300 hover:bg-slate-700 transition-all border border-slate-700">
                    <Eye className="h-4 w-4" />
                    Ko'rish
                  </button>
                  <button className="flex-1 lg:w-40 flex items-center justify-center gap-2 rounded-xl bg-red-500/10 px-4 py-3 text-sm font-black text-red-500 hover:bg-red-500/20 transition-all border border-red-500/20">
                    <XCircle className="h-4 w-4" />
                    Rad etish
                  </button>
                </div>
              </div>
            </div>
          ))}

          {items.length === 0 && (
            <div className="flex flex-col items-center justify-center py-24 text-center">
              <div className="h-20 w-20 rounded-full bg-slate-900 flex items-center justify-center text-slate-600 mb-4 border border-slate-800">
                <ClipboardCheck className="h-10 w-10" />
              </div>
              <h2 className="text-xl font-bold text-white">Review navbati bo'sh</h2>
              <p className="mt-2 text-slate-500 max-w-sm">
                Hozircha ko'rib chiqilishi kerak bo'lgan savollar yo'q. Yangi savollar yaratish uchun generatsiyani boshlang.
              </p>
            </div>
          )}
        </div>
      </div>
    </AdminShell>
  );
}
