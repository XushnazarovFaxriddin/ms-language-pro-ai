import { getTranslations } from "next-intl/server";
import { Link } from "@/i18n/routing";
import { api } from "@/lib/api";
import { getCookieHeader, requireUser } from "@/lib/auth-server";
import { StartAttemptButton } from "./StartAttemptButton";
import { MoveRight, GraduationCap, Target, Trophy, Clock } from "lucide-react";

export default async function ExamsPage() {
  const user = await requireUser("/exams");
  const ck = await getCookieHeader();
  const exams = await api.exam.listExams(ck);
  const t = await getTranslations("Dashboard");

  return (
    <div className="mx-auto max-w-6xl space-y-10">
      {/* Welcome Banner */}
      <div className="relative overflow-hidden rounded-[2rem] bg-gradient-to-br from-blue-600 via-indigo-600 to-purple-600 p-10 shadow-2xl shadow-indigo-500/20 text-white">
        <div className="relative z-10">
          <h1 className="text-4xl font-black tracking-tight sm:text-5xl mb-3 drop-shadow-sm">
            {t("welcome", { name: user.display_name || user.email.split("@")[0] })}
          </h1>
          <p className="text-lg text-white/80 max-w-2xl font-medium">
            {t("welcomeSub")}
          </p>
        </div>
        {/* Abstract background decorations */}
        <div className="absolute -right-20 -top-20 h-96 w-96 rounded-full bg-white/10 blur-3xl pointer-events-none mix-blend-overlay" />
        <div className="absolute right-40 -bottom-32 h-64 w-64 rounded-full bg-blue-400/20 blur-3xl pointer-events-none mix-blend-overlay" />
        <div className="absolute left-20 -bottom-20 h-48 w-48 rounded-full bg-purple-400/20 blur-2xl pointer-events-none mix-blend-overlay" />
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 gap-6 sm:grid-cols-3">
        <div className="group relative overflow-hidden rounded-2xl border border-[var(--color-border)]/50 bg-white/5 dark:bg-black/20 p-6 shadow-sm backdrop-blur-xl transition-all duration-300 hover:-translate-y-1 hover:shadow-xl hover:border-blue-500/30">
          <div className="absolute inset-0 bg-gradient-to-br from-blue-500/5 to-transparent opacity-0 transition-opacity duration-300 group-hover:opacity-100" />
          <div className="relative z-10 flex items-center gap-5">
            <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-br from-blue-500/20 to-blue-600/20 text-blue-500 shadow-inner">
              <Target className="h-7 w-7" />
            </div>
            <div>
              <p className="text-sm font-semibold text-[var(--color-muted-fg)] uppercase tracking-wider">{t("stats.totalExams")}</p>
              <p className="text-3xl font-black mt-0.5">0</p>
            </div>
          </div>
        </div>
        
        <div className="group relative overflow-hidden rounded-2xl border border-[var(--color-border)]/50 bg-white/5 dark:bg-black/20 p-6 shadow-sm backdrop-blur-xl transition-all duration-300 hover:-translate-y-1 hover:shadow-xl hover:border-green-500/30">
          <div className="absolute inset-0 bg-gradient-to-br from-green-500/5 to-transparent opacity-0 transition-opacity duration-300 group-hover:opacity-100" />
          <div className="relative z-10 flex items-center gap-5">
            <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-br from-green-500/20 to-emerald-600/20 text-green-500 shadow-inner">
              <Clock className="h-7 w-7" />
            </div>
            <div>
              <p className="text-sm font-semibold text-[var(--color-muted-fg)] uppercase tracking-wider">{t("stats.avgScore")}</p>
              <p className="text-3xl font-black mt-0.5">—</p>
            </div>
          </div>
        </div>

        <div className="group relative overflow-hidden rounded-2xl border border-[var(--color-border)]/50 bg-white/5 dark:bg-black/20 p-6 shadow-sm backdrop-blur-xl transition-all duration-300 hover:-translate-y-1 hover:shadow-xl hover:border-purple-500/30">
          <div className="absolute inset-0 bg-gradient-to-br from-purple-500/5 to-transparent opacity-0 transition-opacity duration-300 group-hover:opacity-100" />
          <div className="relative z-10 flex items-center gap-5">
            <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-br from-purple-500/20 to-fuchsia-600/20 text-purple-500 shadow-inner">
              <Trophy className="h-7 w-7" />
            </div>
            <div>
              <p className="text-sm font-semibold text-[var(--color-muted-fg)] uppercase tracking-wider">{t("stats.certificates")}</p>
              <p className="text-3xl font-black mt-0.5">0</p>
            </div>
          </div>
        </div>
      </div>

      {/* Available Exams Section */}
      <div>
        <div className="mb-6">
          <h2 className="text-2xl font-bold tracking-tight">{t("title")}</h2>
          <p className="text-[var(--color-muted-fg)] mt-1">{t("description")}</p>
        </div>

        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {exams.map((e) => (
            <div
              key={e.id}
              className="group flex flex-col relative overflow-hidden rounded-2xl border border-[var(--color-border)] bg-white/5 p-6 shadow-sm backdrop-blur-md transition-all hover:shadow-md hover:border-[var(--color-primary)]/30 dark:bg-black/20"
            >
              <div className="mb-6 flex h-12 w-12 items-center justify-center rounded-xl bg-[var(--color-primary)]/10 text-[var(--color-primary)]">
                <GraduationCap className="h-6 w-6" />
              </div>
              <h3 className="mb-2 text-xl font-bold tracking-tight">
                {user.locale === "uz" ? e.name_uz : e.name_en}
              </h3>
              <p className="mb-6 text-sm text-[var(--color-muted-fg)]">
                {t("blueprint")} <span className="rounded bg-[var(--color-muted)] px-2 py-0.5 font-mono text-xs">{e.blueprint_code}</span>
              </p>
              
              <div className="mt-auto pt-4 border-t border-[var(--color-border)]/50">
                <StartAttemptButton blueprintCode={e.blueprint_code} />
              </div>
            </div>
          ))}

          {exams.length === 0 && (
            <div className="col-span-full flex flex-col items-center justify-center rounded-2xl border border-dashed border-[var(--color-border)] p-12 text-center text-[var(--color-muted-fg)]">
              <p className="mb-4 text-lg">{t("empty")}</p>
              <Link
                href="/"
                className="inline-flex items-center gap-2 rounded-full bg-[var(--color-primary)] px-6 py-2 text-sm font-medium text-[var(--color-primary-fg)] transition-colors hover:bg-[var(--color-primary)]/90"
              >
                {t("goHome")} <MoveRight className="h-4 w-4" />
              </Link>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
