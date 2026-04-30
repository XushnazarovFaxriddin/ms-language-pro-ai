import { requireAdmin, getCookieHeader } from "@/lib/auth-server";
import { AdminShell } from "@/components/AdminShell";
import { api } from "@/lib/api";
import { getAdminCopy } from "@/lib/admin-i18n";
import { ClipboardCheck } from "lucide-react";
import { AutoJuryButton } from "./AutoJuryButton";
import { ReviewDecisionButtons } from "./ReviewDecisionButtons";

export default async function ReviewPage() {
  const user = await requireAdmin("/review");
  const ck = await getCookieHeader();
  const copy = getAdminCopy(user.locale).review;
  
  // Filter for questions that need review
  const items = await api.items.list({ status: "in_review" }, ck);

  return (
    <AdminShell user={user}>
      <div className="p-6 sm:p-10">
        <div className="mb-10 flex flex-col gap-5 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <h1 className="flex items-center gap-3 text-3xl font-extrabold tracking-tight text-slate-900 dark:text-white">
              <ClipboardCheck className="h-8 w-8 text-yellow-500 dark:text-yellow-400" />
              {copy.pageTitle}
            </h1>
            <p className="mt-2 max-w-3xl text-slate-600 dark:text-slate-400">
              {copy.pageDescription}
            </p>
          </div>
          <AutoJuryButton copy={copy} />
        </div>

        <div className="grid gap-6">
          {items.map((item) => (
            <div 
              key={item.id}
              className="group relative overflow-hidden rounded-lg border border-slate-200 bg-white p-6 shadow-sm transition-all hover:border-yellow-500/30 dark:border-slate-800/60 dark:bg-black/40"
            >
              <div className="flex flex-col lg:flex-row lg:items-start gap-6">
                {/* Content Preview */}
                <div className="flex-1 space-y-4">
                  <div className="flex items-center gap-3">
                    <span className="rounded-lg bg-yellow-500/10 px-2 py-1 text-[10px] font-black text-yellow-400 uppercase tracking-widest border border-yellow-500/10">
                      {copy.inReview}
                    </span>
                    <span className="font-mono text-[10px] text-slate-500">{item.id}</span>
                  </div>
                  
                  <div className="space-y-2">
                    <h3 className="text-sm font-bold text-slate-400 uppercase tracking-wider">{copy.passagePrompt}</h3>
                    <p className="text-slate-200 line-clamp-3 leading-relaxed">
                      {item.payload.passage || item.payload.prompt || copy.noPrompt}
                    </p>
                  </div>

                  <div className="flex items-center gap-6">
                    <div>
                      <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">{copy.skill}</p>
                      <p className="text-sm font-bold text-white uppercase">{item.skill}</p>
                    </div>
                    <div>
                      <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">{copy.cefr}</p>
                      <p className="text-sm font-bold text-white uppercase">{item.cefr_level}</p>
                    </div>
                  </div>
                </div>

                <ReviewDecisionButtons itemId={item.id} copy={copy} />
              </div>
            </div>
          ))}

          {items.length === 0 && (
            <div className="flex flex-col items-center justify-center py-24 text-center">
              <div className="h-20 w-20 rounded-full bg-slate-900 flex items-center justify-center text-slate-600 mb-4 border border-slate-800">
                <ClipboardCheck className="h-10 w-10" />
              </div>
              <h2 className="text-xl font-bold text-white">{copy.emptyTitle}</h2>
              <p className="mt-2 text-slate-500 max-w-sm">
                {copy.emptyDesc}
              </p>
            </div>
          )}
        </div>
      </div>
    </AdminShell>
  );
}
