import { getTranslations } from "next-intl/server";
import { Link } from "@/i18n/routing";
import { getCookieHeader } from "@/lib/auth-server";
import { api, SRSCardOut, MasteryOut } from "@/lib/api";
import { Dumbbell, Brain, Sparkles } from "lucide-react";
import { PracticeClient } from "./PracticeClient";

export default async function PracticePage() {
  const ck = await getCookieHeader();
  if (!ck) return null;
  const t = await getTranslations("Practice");

  let queue: SRSCardOut[] = [];
  let mastery: MasteryOut[] = [];

  try {
    const [qRes, mRes] = await Promise.all([
      api.practice.getSRSQueue(ck).catch(() => []),
      api.practice.getMastery(ck).catch(() => []),
    ]);
    queue = qRes;
    mastery = mRes;
  } catch (err) {
    console.error("Failed to fetch practice data", err);
  }

  mastery.sort((a, b) => a.mastery - b.mastery);

  return (
    <div className="mx-auto max-w-5xl space-y-8">
      <div>
        <h1 className="text-3xl font-extrabold tracking-tight flex items-center gap-3">
          <Dumbbell className="h-8 w-8 text-[var(--color-primary)]" />
          {t("title")}
        </h1>
        <p className="mt-2 text-[var(--color-muted-fg)]">{t("description")}</p>
      </div>

      <div className="rounded-2xl border border-[var(--color-primary)]/20 bg-[var(--color-primary)]/5 p-5 flex items-start gap-3">
        <Sparkles className="h-5 w-5 text-[var(--color-primary)] shrink-0 mt-0.5" />
        <p className="text-sm text-[var(--color-muted-fg)] leading-relaxed">{t("intro")}</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2">
          {queue.length === 0 ? (
            <EmptyQueue
              title={t("empty.title")}
              hint={t("empty.hint")}
              cta={t("empty.cta")}
            />
          ) : (
            <PracticeClient initialQueue={queue} />
          )}
        </div>

        <div className="space-y-6">
          <div className="rounded-3xl border border-[var(--color-border)]/50 bg-[var(--color-bg)] p-6 shadow-sm">
            <h2 className="text-lg font-bold flex items-center gap-2 mb-6">
              <Brain className="h-5 w-5 text-purple-500" />
              {t("mastery.title")}
            </h2>

            {mastery.length === 0 ? (
              <p className="text-sm text-[var(--color-muted-fg)] text-center py-4">
                {t("mastery.empty")}
              </p>
            ) : (
              <div className="space-y-4">
                {mastery.slice(0, 10).map((m) => (
                  <div key={m.code}>
                    <div className="flex justify-between text-xs font-bold mb-1">
                      <span className="font-mono text-[var(--color-fg)]">
                        {prettyCode(m.code)}
                      </span>
                      <span
                        className={
                          m.mastery < 0.5
                            ? "text-red-500"
                            : m.mastery < 0.8
                              ? "text-yellow-500"
                              : "text-emerald-500"
                        }
                      >
                        {Math.round(m.mastery * 100)}%
                      </span>
                    </div>
                    <div className="h-2 w-full bg-[var(--color-muted)]/30 rounded-full overflow-hidden">
                      <div
                        className={`h-full rounded-full ${
                          m.mastery < 0.5
                            ? "bg-red-500"
                            : m.mastery < 0.8
                              ? "bg-yellow-500"
                              : "bg-emerald-500"
                        }`}
                        style={{ width: `${Math.max(5, m.mastery * 100)}%` }}
                      />
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

function EmptyQueue({ title, hint, cta }: { title: string; hint: string; cta: string }) {
  return (
    <div className="rounded-3xl border border-[var(--color-border)]/50 bg-[var(--color-bg)] p-12 text-center shadow-sm">
      <div className="mx-auto mb-5 flex h-16 w-16 items-center justify-center rounded-2xl bg-[var(--color-primary)]/10 text-[var(--color-primary)]">
        <Sparkles className="h-8 w-8" />
      </div>
      <h2 className="text-xl font-bold">{title}</h2>
      <p className="mt-2 text-sm text-[var(--color-muted-fg)] max-w-md mx-auto leading-relaxed">
        {hint}
      </p>
      <Link
        href="/exams"
        className="mt-6 inline-flex items-center gap-2 rounded-2xl bg-[var(--color-primary)] px-5 py-2.5 text-sm font-semibold text-white shadow-sm transition-all hover:opacity-90"
      >
        {cta}
      </Link>
    </div>
  );
}

function prettyCode(code: string): string {
  if (code.startsWith("skill_")) return code.slice(6).replace(/^./, (c) => c.toUpperCase());
  return code;
}
