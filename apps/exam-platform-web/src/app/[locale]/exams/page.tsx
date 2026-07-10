import { getLocale, getTranslations } from "next-intl/server";
import { Link } from "@/i18n/routing";
import { api } from "@/lib/api";
import type { AttemptListItem, ExamSummary } from "@/lib/api";
import { getCookieHeader, requireUser } from "@/lib/auth-server";
import { StartAttemptButton } from "./StartAttemptButton";
import {
  ArrowRight,
  Award,
  BarChart3,
  BookOpen,
  CheckCircle2,
  Clock,
  Headphones,
  History,
  Mic,
  PenSquare,
  PlayCircle,
  Sparkles,
  Target,
  Trophy,
} from "lucide-react";

const SKILL_HINT: Record<
  string,
  { skills: ("listening" | "reading" | "writing" | "speaking")[]; minutes: number }
> = {
  ielts_full_mock: { skills: ["listening", "reading", "writing", "speaking"], minutes: 165 },
  ielts_reading_mini: { skills: ["reading"], minutes: 20 },
  cefr_multilevel: { skills: ["listening", "reading", "writing", "speaking"], minutes: 90 },
};

const SKILL_ICON = {
  listening: Headphones,
  reading: BookOpen,
  writing: PenSquare,
  speaking: Mic,
};

const SKILL_TONE = {
  listening: "text-amber-500 bg-amber-500/10",
  reading: "text-blue-500 bg-blue-500/10",
  writing: "text-emerald-500 bg-emerald-500/10",
  speaking: "text-purple-500 bg-purple-500/10",
};

export default async function ExamsPage() {
  const user = await requireUser("/exams");
  const ck = await getCookieHeader();
  const t = await getTranslations("Dashboard");
  const locale = await getLocale();

  const [exams, attempts] = await Promise.all([
    api.exam.listExams(ck).catch(() => [] as ExamSummary[]),
    api.exam.listAttempts(ck).catch(() => [] as AttemptListItem[]),
  ]);

  const completed = attempts.filter((a) => a.state === "completed");
  const inProgress = attempts.filter((a) => a.state === "in_progress")[0];
  const totalCompleted = completed.length;
  const validScores = completed.map((a) => a.score).filter((n): n is number => typeof n === "number");
  const avgBand = validScores.length
    ? validScores.reduce((s, n) => s + n, 0) / validScores.length
    : null;
  const certificateCount = validScores.filter((n) => n >= 5.0).length;
  const recent = completed.slice(0, 3);
  const firstName = (user.display_name || user.email.split("@")[0] || "").trim();

  return (
    <div className="mx-auto max-w-6xl space-y-10 pb-16 relative">
      {/* Decorative ambient glowing mesh */}
      <div className="absolute top-0 right-1/4 h-72 w-72 rounded-full bg-[var(--color-primary)]/10 blur-3xl pointer-events-none mesh-glow" />
      <div className="absolute top-40 left-1/4 h-72 w-72 rounded-full bg-violet-500/10 blur-3xl pointer-events-none mesh-glow" />

      {/* Hero */}
      <section className="relative overflow-hidden rounded-[2.5rem] bg-gradient-to-br from-slate-900 via-indigo-950 to-violet-950 p-8 sm:p-12 shadow-2xl dark:shadow-indigo-500/5 text-white border border-white/5">
        <div className="relative z-10 grid gap-8 lg:grid-cols-[1.4fr_1fr] lg:items-end">
          <div className="space-y-4">
            <div className="inline-flex items-center gap-1.5 rounded-full bg-white/10 px-3 py-1 text-xs font-bold uppercase tracking-wider text-white/95 backdrop-blur-md border border-white/10">
              <Sparkles className="h-3.5 w-3.5 text-amber-300 animate-pulse" />
              {t("hero.eyebrow")}
            </div>
            <h1 className="text-4xl font-extrabold tracking-tight sm:text-5xl leading-tight">
              {t("welcome", { name: firstName })}
            </h1>
            <p className="text-base text-white/80 max-w-xl font-medium leading-relaxed">
              {avgBand !== null ? t("hero.subtitleWithStats", { band: avgBand.toFixed(1) }) : t("welcomeSub")}
            </p>
          </div>

          {inProgress && (
            <Link
              href={`/attempt/${inProgress.id}`}
              className="group relative flex items-center justify-between gap-4 rounded-3xl border border-white/15 bg-white/5 p-5 backdrop-blur-md transition-all duration-300 hover:bg-white/10 hover:border-white/20 shadow-lg"
            >
              <div className="flex items-center gap-3">
                <span className="flex h-11 w-11 items-center justify-center rounded-2xl bg-white/10 shadow-inner group-hover:scale-105 transition-transform duration-300">
                  <PlayCircle className="h-5.5 w-5.5 text-emerald-400" />
                </span>
                <div>
                  <p className="text-[10px] font-bold uppercase tracking-widest text-white/60">
                    {t("hero.resume")}
                  </p>
                  <p className="text-sm font-bold text-white/95 mt-0.5">
                    {locale === "uz" ? inProgress.exam_name_uz : inProgress.exam_name_en}
                  </p>
                </div>
              </div>
              <ArrowRight className="h-5 w-5 text-white/70 transition-transform group-hover:translate-x-1.5" />
            </Link>
          )}
        </div>

        {/* Decorative blobs */}
        <div className="absolute -right-24 -top-24 h-96 w-96 rounded-full bg-white/5 blur-3xl pointer-events-none mix-blend-overlay" />
        <div className="absolute right-40 -bottom-32 h-64 w-64 rounded-full bg-indigo-500/10 blur-3xl pointer-events-none mix-blend-overlay" />
        <div className="absolute left-20 -bottom-20 h-48 w-48 rounded-full bg-violet-500/10 blur-2xl pointer-events-none mix-blend-overlay" />
      </section>

      {/* Stats */}
      <section className="grid grid-cols-1 gap-5 sm:grid-cols-3">
        <StatCard
          icon={Target}
          label={t("stats.totalExams")}
          value={String(totalCompleted)}
          accent="blue"
          subtitle={totalCompleted === 0 ? t("stats.firstAttemptHint") : undefined}
        />
        <StatCard
          icon={BarChart3}
          label={t("stats.avgScore")}
          value={avgBand !== null ? avgBand.toFixed(1) : "—"}
          accent="emerald"
          subtitle={avgBand !== null ? t("stats.bandLabel") : t("stats.noScoresYet")}
        />
        <StatCard
          icon={Trophy}
          label={t("stats.certificates")}
          value={String(certificateCount)}
          accent="purple"
          subtitle={
            certificateCount === 0 ? t("stats.certHint") : t("stats.certEarned")
          }
        />
      </section>

      {/* Available exams */}
      <section>
        <div className="mb-6 flex flex-wrap items-end justify-between gap-4">
          <div>
            <h2 className="text-2xl font-bold tracking-tight">{t("title")}</h2>
            <p className="text-[var(--color-muted-fg)] mt-1 text-sm font-medium">{t("description")}</p>
          </div>
          {exams.length > 0 && (
            <span className="inline-flex rounded-full border border-[var(--color-border)] bg-[var(--color-muted)] px-3 py-1 text-xs font-bold uppercase tracking-wider text-[var(--color-muted-fg)]">
              {t("examCount", { count: exams.length })}
            </span>
          )}
        </div>

        {exams.length === 0 ? (
          <div className="flex flex-col items-center justify-center rounded-[2rem] border-2 border-dashed border-[var(--color-border)] p-16 text-center bg-white/20 dark:bg-black/10 backdrop-blur-md">
            <BookOpen className="h-10 w-10 text-[var(--color-muted-fg)] opacity-55 mb-3" />
            <p className="text-lg font-bold">{t("empty")}</p>
            <Link
              href="/"
              className="mt-6 inline-flex items-center gap-2 rounded-2xl bg-gradient-to-r from-[var(--color-primary)] to-violet-600 px-6 py-3 text-sm font-bold text-white shadow-lg shadow-[var(--color-primary)]/15 transition-all hover:shadow-xl hover:scale-[1.02] active:scale-[0.98]"
            >
              {t("goHome")} <ArrowRight className="h-4 w-4" />
            </Link>
          </div>
        ) : (
          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {exams.map((e, idx) => (
              <ExamCard key={e.id} exam={e} locale={locale} t={t} highlight={idx === 0} />
            ))}
          </div>
        )}
      </section>

      {/* Recent results */}
      {recent.length > 0 && (
        <section className="space-y-4">
          <div className="flex items-end justify-between">
            <h2 className="text-xl font-bold tracking-tight flex items-center gap-2">
              <History className="h-5 w-5 text-[var(--color-primary)]" />
              {t("recentTitle")}
            </h2>
            <Link
              href="/exams/results"
              className="text-xs font-bold text-[var(--color-primary)] hover:underline tracking-wider uppercase"
            >
              {t("viewAll")} →
            </Link>
          </div>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {recent.map((a) => (
              <Link
                key={a.id}
                href={`/results/${a.id}`}
                className="group flex items-center justify-between gap-4 rounded-3xl border border-[var(--color-border)]/50 bg-white/40 dark:bg-black/20 p-5 shadow-sm backdrop-blur-md transition-all duration-300 hover:-translate-y-1 hover:border-[var(--color-primary)]/30 hover:shadow-md"
              >
                <div className="min-w-0 flex-1 space-y-1">
                  <p className="truncate text-sm font-bold">
                    {locale === "uz" ? a.exam_name_uz : a.exam_name_en}
                  </p>
                  <p className="text-xs text-[var(--color-muted-fg)] font-medium">
                    {a.finished_at ? formatRelativeDate(a.finished_at, locale) : ""}
                  </p>
                </div>
                <div className="flex items-center gap-3">
                  <div className="text-right">
                    <p className="text-[10px] font-bold uppercase tracking-wider text-[var(--color-muted-fg)] font-mono">
                      {t("recentBand")}
                    </p>
                    <p className="text-2xl font-extrabold text-[var(--color-primary)] leading-none mt-1">
                      {typeof a.score === "number" ? a.score.toFixed(1) : "—"}
                    </p>
                  </div>
                  <ArrowRight className="h-5 w-5 text-[var(--color-muted-fg)] transition-transform group-hover:translate-x-1 group-hover:text-[var(--color-primary)]" />
                </div>
              </Link>
            ))}
          </div>
        </section>
      )}
    </div>
  );
}

function StatCard({
  icon: Icon,
  label,
  value,
  subtitle,
  accent,
}: {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  value: string;
  subtitle?: string;
  accent: "blue" | "emerald" | "purple";
}) {
  const tone = {
    blue: "from-blue-500/10 to-transparent border-blue-500/10 text-blue-500 dark:border-blue-500/20",
    emerald: "from-emerald-500/10 to-transparent border-emerald-500/10 text-emerald-500 dark:border-emerald-500/20",
    purple: "from-purple-500/10 to-transparent border-purple-500/10 text-purple-500 dark:border-purple-500/20",
  }[accent];

  return (
    <div
      className={`group relative overflow-hidden rounded-[2rem] border bg-gradient-to-br p-6 shadow-sm backdrop-blur-xl transition-all duration-300 hover:-translate-y-1 hover:shadow-xl ${tone} bg-white/50 dark:bg-black/25`}
    >
      <div className="relative z-10 flex flex-col justify-between h-full min-h-[5.5rem]">
        <div className="flex items-center gap-4">
          <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-white/70 dark:bg-zinc-900/60 shadow-inner group-hover:scale-110 transition-transform duration-300">
            <Icon className="h-6 w-6" />
          </div>
          <div>
            <p className="text-[10px] font-bold uppercase tracking-widest text-[var(--color-muted-fg)] font-mono">
              {label}
            </p>
            <p className="text-3xl font-extrabold mt-1 leading-none text-[var(--color-fg)]">{value}</p>
          </div>
        </div>
        {subtitle && (
          <p className="mt-4 text-xs font-medium text-[var(--color-muted-fg)] leading-normal">{subtitle}</p>
        )}
      </div>
    </div>
  );
}

function ExamCard({
  exam,
  locale,
  t,
  highlight,
}: {
  exam: ExamSummary;
  locale: string;
  t: (key: string, values?: any) => string;
  highlight?: boolean;
}) {
  const hint = SKILL_HINT[exam.blueprint_code] ?? { skills: ["reading"], minutes: 30 };
  const name = locale === "uz" ? exam.name_uz : exam.name_en;
  const sectionsLabel = t("sections", { count: hint.skills.length });

  return (
    <div
      className={`group relative flex flex-col overflow-hidden rounded-[2rem] border p-6 shadow-sm backdrop-blur-md transition-all duration-300 hover:-translate-y-1 hover:shadow-xl ${
        highlight
          ? "border-[var(--color-primary)] bg-gradient-to-br from-[var(--color-primary)]/5 via-white/50 to-white/50 dark:from-[var(--color-primary)]/10 dark:via-black/20 dark:to-black/20"
          : "border-[var(--color-border)]/50 bg-white/40 dark:bg-black/20 hover:border-[var(--color-primary)]/30"
      }`}
    >
      {highlight && (
        <span className="absolute right-5 top-5 inline-flex items-center gap-1.5 rounded-full bg-[var(--color-primary)] px-3 py-1 text-[9px] font-bold uppercase tracking-wider text-[var(--color-primary-fg)] shadow-sm">
          <Sparkles className="h-3 w-3" />
          {t("popular")}
        </span>
      )}
      <div className="mb-5 flex flex-wrap gap-1.5">
        {hint.skills.map((skill) => {
          const Icon = SKILL_ICON[skill];
          return (
            <span
              key={skill}
              className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider border border-current/10 ${SKILL_TONE[skill]}`}
            >
              <Icon className="h-3 w-3" />
              {t(`skills.${skill}`)}
            </span>
          );
        })}
      </div>

      <h3 className="text-xl font-bold tracking-tight leading-snug">{name}</h3>

      <div className="mt-2.5 flex items-center gap-3.5 text-xs font-semibold text-[var(--color-muted-fg)]">
        <span className="inline-flex items-center gap-1.5">
          <CheckCircle2 className="h-3.5 w-3.5 text-emerald-500" />
          {sectionsLabel}
        </span>
        <span className="inline-flex items-center gap-1.5">
          <Clock className="h-3.5 w-3.5 text-[var(--color-primary)]" />
          {t("minutes", { count: hint.minutes })}
        </span>
      </div>

      <p className="mt-4 text-xs font-medium text-[var(--color-muted-fg)] leading-relaxed line-clamp-3">
        {translateOrDefault(t, `blueprintDesc.${exam.blueprint_code}`, "blueprintDesc.default")}
      </p>

      <div className="mt-6 pt-5 flex items-center justify-between border-t border-[var(--color-border)]/40">
        <span className="font-mono text-[9px] font-bold uppercase tracking-widest text-[var(--color-muted-fg)] flex items-center gap-1.5">
          <Award className="h-3.5 w-3.5 text-[var(--color-primary)]" />
          {exam.blueprint_code}
        </span>
        <StartAttemptButton blueprintCode={exam.blueprint_code} />
      </div>
    </div>
  );
}


function translateOrDefault(
  t: (key: string, values?: any) => string,
  key: string,
  defaultKey: string,
): string {
  // next-intl returns the raw key path (e.g. "Dashboard.blueprintDesc.foo") if
  // the translation is missing. Detect that and fall back to a generic copy.
  const value = t(key);
  if (!value || value.includes(key) || value.endsWith(key.split(".").pop() || "")) {
    if (value === key || value.endsWith(`.${key.split(".").pop()}`)) {
      return t(defaultKey);
    }
  }
  // Stricter check: if value literally equals the dotted path, it's missing.
  return value === key || value.includes("blueprintDesc.") ? t(defaultKey) : value;
}

function formatRelativeDate(iso: string, locale: string): string {
  const d = new Date(iso);
  const now = new Date();
  const diffMs = now.getTime() - d.getTime();
  const days = Math.floor(diffMs / (1000 * 60 * 60 * 24));
  if (days === 0) return locale === "uz" ? "Bugun" : "Today";
  if (days === 1) return locale === "uz" ? "Kecha" : "Yesterday";
  if (days < 7) return locale === "uz" ? `${days} kun oldin` : `${days} days ago`;
  return d.toLocaleDateString(locale === "uz" ? "uz-Cyrl" : "en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}
