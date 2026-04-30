import { requireAdmin } from "@/lib/auth-server";
import { AdminShell } from "@/components/AdminShell";
import { getAdminCopy } from "@/lib/admin-i18n";
import { FlaskConical } from "lucide-react";
import { PracticeGenerationForms } from "./PracticeGenerationForms";

export default async function PracticeGenerationPage() {
  const user = await requireAdmin("/generation/practice");
  const copy = getAdminCopy(user.locale).practiceGeneration;
  
  return (
    <AdminShell user={user}>
      <div className="relative min-h-full p-6 sm:p-10">
        <div className="absolute top-0 right-0 h-96 w-96 -translate-y-1/2 translate-x-1/2 rounded-full bg-emerald-500/10 blur-[120px] pointer-events-none" />

        <div className="relative z-10 mx-auto max-w-5xl space-y-10">
          <div className="flex items-center gap-4 border-b border-slate-200 dark:border-slate-800/60 pb-6">
            <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-gradient-to-br from-emerald-500/20 to-teal-500/5 text-emerald-500 dark:text-emerald-400 border border-emerald-500/20 shadow-inner">
              <FlaskConical className="h-8 w-8" />
            </div>
            <div>
              <h1 className="text-3xl font-extrabold tracking-tight text-slate-900 dark:text-white sm:text-4xl">{copy.pageTitle}</h1>
              <p className="mt-2 text-lg text-slate-600 dark:text-slate-400">
                {copy.pageDescription}
              </p>
            </div>
          </div>
          
          <PracticeGenerationForms copy={copy} />
        </div>
      </div>
    </AdminShell>
  );
}
