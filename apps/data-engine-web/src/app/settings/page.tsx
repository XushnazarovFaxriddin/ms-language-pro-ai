import { requireAdmin } from "@/lib/auth-server";
import { AdminShell } from "@/components/AdminShell";
import { LanguageSwitcher } from "@/components/LanguageSwitcher";
import { getAdminCopy } from "@/lib/admin-i18n";
import { Settings, Shield, Bell, Cpu, Globe, Lock, Languages } from "lucide-react";

export default async function SettingsPage() {
  const user = await requireAdmin("/settings");
  const copy = getAdminCopy(user.locale).settings;
  const securityIcons = [Lock, Globe, Bell];

  return (
    <AdminShell user={user}>
      <div className="p-6 sm:p-10">
        <div className="mb-10">
          <h1 className="text-3xl font-extrabold tracking-tight text-slate-900 dark:text-white flex items-center gap-3">
            <Settings className="h-8 w-8 text-slate-600 dark:text-slate-400" />
            {copy.pageTitle}
          </h1>
          <p className="mt-2 text-slate-600 dark:text-slate-400">
            {copy.pageDescription}
          </p>
        </div>

        <div className="grid gap-8 max-w-4xl">
          <section className="space-y-6">
            <h2 className="text-lg font-black text-slate-900 dark:text-white uppercase tracking-widest flex items-center gap-2">
              <Languages className="h-5 w-5 text-emerald-400" />
              {copy.interface}
            </h2>
            <div className="flex items-center justify-between gap-4 p-6 rounded-3xl border border-slate-200/60 dark:border-slate-800/60 bg-white/80 dark:bg-black/40 backdrop-blur-xl">
              <div>
                <h3 className="font-bold text-slate-800 dark:text-slate-200">{copy.languageTitle}</h3>
                <p className="text-xs text-slate-600 dark:text-slate-500 mt-1">{copy.languageDescription}</p>
              </div>
              <LanguageSwitcher locale={user.locale} copy={getAdminCopy(user.locale).shell} />
            </div>
          </section>

          <section className="space-y-6">
            <h2 className="text-lg font-black text-slate-900 dark:text-white uppercase tracking-widest flex items-center gap-2">
              <Cpu className="h-5 w-5 text-emerald-400" />
              {copy.aiModels}
            </h2>
            <div className="grid gap-4">
              {copy.models.map(([name, current, desc]) => (
                <div key={name} className="flex items-center justify-between p-6 rounded-3xl border border-slate-200/60 dark:border-slate-800/60 bg-white/80 dark:bg-black/40 backdrop-blur-xl">
                  <div>
                    <h3 className="font-bold text-slate-800 dark:text-slate-200">{name}</h3>
                    <p className="text-xs text-slate-600 dark:text-slate-500 mt-1">{desc}</p>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="text-sm font-mono text-emerald-400 bg-emerald-500/10 px-3 py-1 rounded-lg border border-emerald-500/20">{current}</span>
                    <button className="text-xs font-bold text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white transition-colors">{copy.change}</button>
                  </div>
                </div>
              ))}
            </div>
          </section>

          <section className="space-y-6">
            <h2 className="text-lg font-black text-slate-900 dark:text-white uppercase tracking-widest flex items-center gap-2">
              <Shield className="h-5 w-5 text-blue-400" />
              {copy.security}
            </h2>
            <div className="grid gap-4">
              {copy.securityItems.map(([name, desc], index) => {
                const Icon = securityIcons[index] ?? Lock;
                return (
                  <div key={name} className="group flex items-center justify-between p-6 rounded-3xl border border-slate-200/60 dark:border-slate-800/60 bg-white/80 dark:bg-black/40 backdrop-blur-xl hover:border-blue-500/30 transition-all cursor-pointer">
                    <div className="flex items-center gap-4">
                      <div className="p-3 rounded-2xl bg-blue-500/10 text-blue-400 group-hover:scale-110 transition-transform">
                        <Icon className="h-5 w-5" />
                      </div>
                      <div>
                        <h3 className="font-bold text-slate-800 dark:text-slate-200">{name}</h3>
                        <p className="text-xs text-slate-600 dark:text-slate-500 mt-1">{desc}</p>
                      </div>
                    </div>
                    <button className="text-slate-400 group-hover:text-slate-900 dark:group-hover:text-white transition-colors">
                      <Settings className="h-5 w-5" />
                    </button>
                  </div>
                );
              })}
            </div>
          </section>
        </div>

        <div className="mt-12 rounded-2xl bg-yellow-500/5 p-4 border border-yellow-500/10 text-xs text-slate-600 dark:text-slate-400">
          <span className="font-bold text-yellow-500 uppercase tracking-widest block mb-1">{copy.demoTitle}</span>
          {copy.demoDescription}
        </div>
      </div>
    </AdminShell>
  );
}
