import { requireAdmin } from "@/lib/auth-server";
import { AdminShell } from "@/components/AdminShell";
import { getAdminCopy } from "@/lib/admin-i18n";
import { GenerationForm } from "./GenerationForm";
import { BrainCircuit } from "lucide-react";

export default async function GenerationPage() {
  const user = await requireAdmin("/generation");
  const copy = getAdminCopy(user.locale).generation;

  return (
    <AdminShell user={user}>
      <div className="relative min-h-full p-6 sm:p-10">
        <div className="absolute top-0 right-0 h-96 w-96 -translate-y-1/2 translate-x-1/2 rounded-full bg-emerald-500/10 blur-[120px] pointer-events-none" />

        <div className="relative z-10 mx-auto max-w-4xl space-y-10">
          <div className="flex items-center gap-4 border-b border-slate-800/60 pb-6">
            <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-gradient-to-br from-emerald-500/20 to-teal-500/5 text-emerald-400 border border-emerald-500/20 shadow-inner">
              <BrainCircuit className="h-8 w-8" />
            </div>
            <div>
              <h1 className="text-3xl font-extrabold tracking-tight text-white sm:text-4xl">{copy.pageTitle}</h1>
              <p className="mt-2 text-lg text-slate-400">
                {copy.pageDescription}
              </p>
            </div>
          </div>
          
          <div className="overflow-hidden rounded-3xl border border-slate-800/60 bg-black/40 p-8 shadow-xl backdrop-blur-xl">
            <GenerationForm copy={copy} />
          </div>
        </div>
      </div>
    </AdminShell>
  );
}
