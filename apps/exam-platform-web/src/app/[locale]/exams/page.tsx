import { getTranslations } from "next-intl/server";
import { Link } from "@/i18n/routing";
import { api } from "@/lib/api";
import { getCookieHeader, requireUser } from "@/lib/auth-server";
import { AppHeader } from "@/components/AppHeader";
import { StartAttemptButton } from "./StartAttemptButton";
import { MoveRight, GraduationCap } from "lucide-react";

export default async function ExamsPage() {
  const user = await requireUser("/exams");
  const ck = await getCookieHeader();
  const exams = await api.exam.listExams(ck);
  const t = await getTranslations("Dashboard");

  return (
    <>
      <AppHeader user={user} />
      <main className="container mx-auto max-w-4xl px-6 py-16">
        <header className="mb-12">
          <h1 className="text-4xl font-extrabold tracking-tight sm:text-5xl">{t("title")}</h1>
          <p className="mt-4 max-w-2xl text-lg text-[var(--color-muted-fg)]">
            {t("description")}
          </p>
        </header>

        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-2">
          {exams.map((e) => (
            <div
              key={e.id}
              className="group relative overflow-hidden rounded-2xl border border-[var(--color-border)] bg-white/5 p-6 shadow-sm backdrop-blur-md transition-all hover:shadow-md dark:bg-black/20"
            >
              <div className="mb-6 flex h-12 w-12 items-center justify-center rounded-xl bg-[var(--color-primary)]/10 text-[var(--color-primary)]">
                <GraduationCap className="h-6 w-6" />
              </div>
              <h2 className="mb-2 text-xl font-bold tracking-tight">
                {user.locale === "uz" ? e.name_uz : e.name_en}
              </h2>
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
      </main>
    </>
  );
}
