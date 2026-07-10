import { redirect } from "next/navigation";
import { headers } from "next/headers";
import { tryGetUser } from "@/lib/auth-server";
import { adminLocale, getAdminCopy } from "@/lib/admin-i18n";
import { LoginForm } from "./LoginForm";
import { Sparkles, ShieldCheck } from "lucide-react";

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ returnTo?: string; lang?: string }>;
}) {
  const sp = await searchParams;
  const user = await tryGetUser();
  if (user) redirect(sp.returnTo ?? "/dashboard");
  const headerStore = await headers();
  const locale = adminLocale(sp.lang ?? (headerStore.get("accept-language")?.toLowerCase().startsWith("en") ? "en" : "uz"));
  const copy = getAdminCopy(locale).login;
  const returnTo = sp.returnTo ?? "/dashboard";
  const langHref = (lang: "uz" | "en") => {
    const params = new URLSearchParams({ lang });
    if (sp.returnTo) params.set("returnTo", sp.returnTo);
    return `/login?${params.toString()}`;
  };
  
  return (
    <main className="relative flex min-h-screen items-center justify-center bg-slate-50 dark:bg-[#0a0a0a] p-6 text-slate-900 dark:text-slate-200 transition-colors">
      {/* Background Gradients */}
      <div className="absolute top-0 left-0 h-full w-full overflow-hidden pointer-events-none">
        <div className="absolute -left-1/4 -top-1/4 h-1/2 w-1/2 rounded-full bg-emerald-500/10 blur-[120px]" />
        <div className="absolute -right-1/4 -bottom-1/4 h-1/2 w-1/2 rounded-full bg-teal-500/10 blur-[120px]" />
      </div>

      <div className="relative z-10 w-full max-w-[420px] space-y-8">
        <div className="text-center">
          <div className="mx-auto mb-6 flex h-16 w-16 items-center justify-center rounded-2xl bg-gradient-to-br from-emerald-400 to-teal-600 text-white shadow-xl shadow-emerald-500/20">
            <Sparkles className="h-8 w-8" />
          </div>
          <h1 className="text-4xl font-black tracking-tight text-slate-900 dark:text-white">
            Content<span className="text-emerald-400">Studio</span>
          </h1>
          <p className="mt-3 text-slate-600 dark:text-slate-400">
            {copy.welcome}
          </p>
        </div>

        <div className="overflow-hidden rounded-3xl border border-slate-200/60 dark:border-slate-800/60 bg-white/80 dark:bg-black/40 p-8 shadow-2xl backdrop-blur-2xl">
          <div className="mb-6 flex justify-center gap-2">
            {(["uz", "en"] as const).map((lang) => (
              <a
                key={lang}
                href={langHref(lang)}
                className={`rounded-lg border px-3 py-1.5 text-xs font-black transition-colors ${
                  locale === lang
                    ? "border-emerald-500/40 bg-emerald-500/10 text-emerald-600 dark:text-emerald-300"
                    : "border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900/60 text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white"
                }`}
              >
                {lang === "uz" ? copy.languageUz : copy.languageEn}
              </a>
            ))}
          </div>

          <LoginForm returnTo={returnTo} copy={copy} locale={locale} />
        </div>

        <p className="text-center text-sm text-slate-500">
          {copy.footer}
        </p>
      </div>
    </main>
  );
}
