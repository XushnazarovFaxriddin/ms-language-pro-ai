import { getTranslations } from "next-intl/server";
import { Link } from "@/i18n/routing";
import { api, type AttemptFeedbackOut } from "@/lib/api";
import { getCookieHeader, requireUser } from "@/lib/auth-server";
import { AppHeader } from "@/components/AppHeader";
import { CheckCircle2, Clock, Trophy, ArrowLeft } from "lucide-react";
import { notFound } from "next/navigation";
import { FeedbackSection } from "./FeedbackSection";
import { CertificatePanel } from "./CertificatePanel";

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
  let feedback: AttemptFeedbackOut | null = null;
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

  // Don't block server render on the LLM call — FeedbackSection auto-triggers
  // the upgrade on the client with animated progress. (30–60s of LLM latency
  // hanging the page was the old behavior; users thought the page was broken.)
  const overview = latestOverview(feedback);
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

        {/* Ambient background glows */}
        <div className="absolute top-10 left-1/4 h-80 w-80 rounded-full bg-[var(--color-primary)]/10 blur-3xl pointer-events-none mesh-glow" />
        <div className="absolute top-40 right-1/4 h-80 w-80 rounded-full bg-violet-500/10 blur-3xl pointer-events-none mesh-glow" />

        <div className="glass-panel overflow-hidden rounded-[2.5rem] border border-[var(--color-border)]/40 shadow-2xl relative z-10 bg-white/50 dark:bg-black/20">
          <div className="border-b border-[var(--color-border)]/40 bg-gradient-to-b from-[var(--color-primary)]/5 to-transparent p-8 text-center sm:p-12 flex flex-col items-center">
            {/* Elegant Circular Score Badge */}
            <div className="relative mb-6 flex h-32 w-32 items-center justify-center rounded-full bg-gradient-to-tr from-[var(--color-primary)] to-violet-600 shadow-xl shadow-[var(--color-primary)]/20 ring-4 ring-white/10 dark:ring-white/5 text-white">
              <div className="absolute inset-2 rounded-full border border-dashed border-white/20 animate-[spin_40s_linear_infinite]" />
              <div className="flex flex-col items-center justify-center">
                <span className="text-4xl font-extrabold tracking-tight">{scoreLabel}</span>
                <span className="text-[10px] font-bold uppercase tracking-wider text-white/70">{t("ieltsBand")}</span>
              </div>
            </div>
            
            <h1 className="text-3xl font-extrabold tracking-tight sm:text-4xl">{t("title")}</h1>
            <p className="mt-2 text-sm font-semibold text-[var(--color-muted-fg)] uppercase tracking-wider">
              {user.locale === "uz" ? attempt.blueprint_snapshot.name_uz : attempt.blueprint_snapshot.name_en}
            </p>
          </div>

          <div className="grid gap-px bg-[var(--color-border)]/40 sm:grid-cols-2">
            <div className="bg-white/30 dark:bg-black/10 p-8 flex items-center gap-4">
              <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-[var(--color-primary)]/10 text-[var(--color-primary)] shadow-sm">
                <CheckCircle2 className="h-6 w-6" />
              </div>
              <div>
                <p className="text-[10px] font-bold uppercase tracking-widest text-[var(--color-muted-fg)] font-mono">{t("score")}</p>
                <p className="mt-1 text-2xl font-extrabold tracking-tight">
                  {scoreLabel} <span className="text-xs font-semibold text-[var(--color-muted-fg)]">/ 9.0</span>
                </p>
              </div>
            </div>
            <div className="bg-white/30 dark:bg-black/10 p-8 flex items-center gap-4">
              <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-violet-500/10 text-violet-500 shadow-sm">
                <Clock className="h-6 w-6" />
              </div>
              <div>
                <p className="text-[10px] font-bold uppercase tracking-widest text-[var(--color-muted-fg)] font-mono">{t("timeTaken")}</p>
                <p className="mt-1 text-2xl font-extrabold tracking-tight">{timeStr}</p>
              </div>
            </div>
          </div>
        </div>


        <div className="mt-12">
          <FeedbackSection
            attemptId={id}
            initialFeedback={feedback}
            attemptCompleted={attempt.state === "completed"}
          />
        </div>

        {attempt.state === "completed" && (
          <div className="mt-8">
            <CertificatePanel attemptId={id} />
          </div>
        )}

      </main>
    </>
  );
}

function latestOverview(feedback: AttemptFeedbackOut | null) {
  const overviews = feedback?.artifacts.filter((artifact) => artifact.layer === "overview") ?? [];
  return overviews[overviews.length - 1];
}
