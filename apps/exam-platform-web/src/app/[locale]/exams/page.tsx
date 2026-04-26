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
    <div className="mx-auto max-w-6xl space-y-8">
      {/* Welcome Banner */}
      <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-[var(--color-primary)]/20 via-[var(--color-primary)]/5 to-transparent p-8 border border-[var(--color-primary)]/10">
        <div className="relative z-10">
          <h1 className="text-3xl font-extrabold tracking-tight sm:text-4xl mb-2">
            {t("welcome", { name: user.display_name || user.email.split("@")[0] })}
          </h1>
          <p className="text-lg text-[var(--color-muted-fg)] max-w-2xl">
            {t("welcomeSub")}
          </p>
        </div>
        {/* Abstract background decorations */}
        <div className="absolute -right-10 -top-10 h-64 w-64 rounded-full bg-[var(--color-primary)]/10 blur-3xl pointer-events-none" />
        <div className="absolute right-40 -bottom-20 h-48 w-48 rounded-full bg-blue-500/10 blur-3xl pointer-events-none" />
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <div className="rounded-xl border border-[var(--color-border)] bg-[var(--color-bg)] p-6 shadow-sm">
          <div className="flex items-center gap-4">
            <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-blue-500/10 text-blue-500">
              <Target className="h-6 w-6" />
            </div>
            <div>
              <p className="text-sm font-medium text-[var(--color-muted-fg)]">{t("stats.totalExams")}</p>
              <p className="text-2xl font-bold">0</p>
            </div>
          </div>
        </div>
        <div className="rounded-xl border border-[var(--color-border)] bg-[var(--color-bg)] p-6 shadow-sm">
          <div className="flex items-center gap-4">
            <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-green-500/10 text-green-500">
              <Clock className="h-6 w-6" />
            </div>
            <div>
              <p className="text-sm font-medium text-[var(--color-muted-fg)]">{t("stats.avgScore")}</p>
              <p className="text-2xl font-bold">—</p>
            </div>
          </div>
        </div>
        <div className="rounded-xl border border-[var(--color-border)] bg-[var(--color-bg)] p-6 shadow-sm">
          <div className="flex items-center gap-4">
            <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-purple-500/10 text-purple-500">
              <Trophy className="h-6 w-6" />
            </div>
            <div>
              <p className="text-sm font-medium text-[var(--color-muted-fg)]">{t("stats.certificates")}</p>
              <p className="text-2xl font-bold">0</p>
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
