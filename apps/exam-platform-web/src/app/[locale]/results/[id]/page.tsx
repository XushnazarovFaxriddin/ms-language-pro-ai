import { getTranslations } from "next-intl/server";
import { Link } from "@/i18n/routing";
import { api } from "@/lib/api";
import { getCookieHeader, requireUser } from "@/lib/auth-server";
import { AppHeader } from "@/components/AppHeader";
import { CheckCircle2, Clock, Trophy, ArrowLeft } from "lucide-react";
import { notFound } from "next/navigation";
import { FeedbackSection } from "./FeedbackSection";

export default async function ResultsPage({
  params,
}: {
  params: Promise<{ id: string; locale: string }>;
}) {
  const { id } = await params;
  const user = await requireUser(`/results/${id}`);
  const ck = await getCookieHeader();
  const t = await getTranslations("Results");
  
  let attempt;
  let feedback = null;
  try {
    attempt = await api.exam.getAttempt(id, ck);
  } catch {
    notFound();
  }

  try {
    feedback = await api.feedback.getAttemptFeedback(id, ck);
  } catch (err) {
    // 404 or other errors mean no feedback exists yet
  }

  const overview = feedback?.artifacts.find((artifact) => artifact.layer === "overview");
  const overallBand = overview?.payload.bands?.overall;
  const scoreLabel = typeof overallBand === "number" ? overallBand.toFixed(1) : "—";

  const finishedAt = attempt.finished_at ? new Date(attempt.finished_at) : new Date();
  const startedAt = new Date(attempt.started_at);
  const timeTakenSeconds = Math.floor((finishedAt.getTime() - startedAt.getTime()) / 1000);
  const m = Math.floor(timeTakenSeconds / 60);
  const s = timeTakenSeconds % 60;
  const timeStr = `${m}:${String(s).padStart(2, "0")}`;

  return (
    <>
      <AppHeader user={user} />
      <main className="container mx-auto max-w-3xl px-6 py-16">
        <Link
          href="/exams"
          className="mb-8 flex items-center gap-2 text-sm font-medium text-[var(--color-muted-fg)] transition-colors hover:text-[var(--color-fg)]"
        >
          <ArrowLeft className="h-4 w-4" />
          {t("backToDashboard")}
        </Link>

        <div className="overflow-hidden rounded-3xl border border-[var(--color-border)] bg-white/5 shadow-sm backdrop-blur-md dark:bg-black/20">
          <div className="border-b border-[var(--color-border)]/50 bg-[var(--color-primary)]/5 p-8 text-center sm:p-12">
            <div className="mx-auto mb-6 flex h-20 w-20 items-center justify-center rounded-full bg-[var(--color-primary)]/10 text-[var(--color-primary)]">
              <Trophy className="h-10 w-10" />
            </div>
            <h1 className="text-3xl font-extrabold tracking-tight sm:text-4xl">{t("title")}</h1>
            <p className="mt-2 text-lg text-[var(--color-muted-fg)]">
              {user.locale === "uz" ? attempt.blueprint_snapshot.name_uz : attempt.blueprint_snapshot.name_en}
            </p>
          </div>

          <div className="grid gap-px bg-[var(--color-border)]/50 sm:grid-cols-2">
            <div className="bg-[var(--color-bg)] p-8">
              <div className="flex items-center gap-3 text-[var(--color-muted-fg)]">
                <CheckCircle2 className="h-5 w-5" />
                <span className="font-medium">{t("score")}</span>
              </div>
              <p className="mt-3 text-3xl font-bold tracking-tight">
                {scoreLabel} <span className="text-sm font-medium text-[var(--color-muted-fg)]">{t("ieltsBand")}</span>
              </p>
            </div>
            <div className="bg-[var(--color-bg)] p-8">
              <div className="flex items-center gap-3 text-[var(--color-muted-fg)]">
                <Clock className="h-5 w-5" />
                <span className="font-medium">{t("timeTaken")}</span>
              </div>
              <p className="mt-3 text-3xl font-bold tracking-tight">{timeStr}</p>
            </div>
          </div>
        </div>

        <div className="mt-12">
          <FeedbackSection attemptId={id} initialFeedback={feedback} />
        </div>

      </main>
    </>
  );
}
