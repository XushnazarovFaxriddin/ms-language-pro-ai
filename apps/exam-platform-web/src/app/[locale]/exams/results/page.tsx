import { getTranslations } from "next-intl/server";
import { Link } from "@/i18n/routing";
import { api } from "@/lib/api";
import { getCookieHeader, requireUser } from "@/lib/auth-server";
import { MoveRight, History, FileText, CheckCircle2, Clock } from "lucide-react";

export default async function ResultsPage() {
  const user = await requireUser("/exams/results");
  const ck = await getCookieHeader();
  const attempts = await api.exam.listAttempts(ck);
  const tNav = await getTranslations("Dashboard.nav");
  const tStats = await getTranslations("Dashboard.stats");

  return (
    <div className="mx-auto max-w-5xl space-y-8">
      <div className="mb-8 border-b border-[var(--color-border)] pb-6">
        <h1 className="text-3xl font-extrabold tracking-tight">{tNav("results")}</h1>
        <p className="mt-2 text-[var(--color-muted-fg)]">
          Barcha topshirgan imtihonlaringiz va ularning natijalari tarixi.
        </p>
      </div>

      {attempts.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-[var(--color-border)] p-12 text-center text-[var(--color-muted-fg)]">
          <History className="mb-4 h-12 w-12 opacity-50" />
          <p className="mb-4 text-lg">Siz hali birorta ham imtihon topshirmagansiz.</p>
          <Link
            href="/exams"
            className="inline-flex items-center gap-2 rounded-full bg-[var(--color-primary)] px-6 py-2 text-sm font-medium text-[var(--color-primary-fg)] transition-colors hover:bg-[var(--color-primary)]/90"
          >
            Imtihonlarni ko'rish <MoveRight className="h-4 w-4" />
          </Link>
        </div>
      ) : (
        <div className="overflow-hidden rounded-xl border border-[var(--color-border)] bg-[var(--color-bg)] shadow-sm">
          <table className="w-full text-left text-sm">
            <thead className="bg-black/5 dark:bg-white/5 border-b border-[var(--color-border)] text-[var(--color-muted-fg)]">
              <tr>
                <th className="px-6 py-4 font-medium">Imtihon</th>
                <th className="px-6 py-4 font-medium">Sana</th>
                <th className="px-6 py-4 font-medium">Holati</th>
                <th className="px-6 py-4 font-medium text-right">Natija</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[var(--color-border)]">
              {attempts.map((attempt) => (
                <tr key={attempt.id} className="transition-colors hover:bg-black/5 dark:hover:bg-white/5">
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-3">
                      <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-[var(--color-primary)]/10 text-[var(--color-primary)]">
                        <FileText className="h-5 w-5" />
                      </div>
                      <div>
                        <p className="font-semibold">{user.locale === "uz" ? attempt.exam_name_uz : attempt.exam_name_en}</p>
                        <p className="text-xs text-[var(--color-muted-fg)] font-mono">{attempt.blueprint_code}</p>
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4 text-[var(--color-muted-fg)]">
                    {new Date(attempt.started_at).toLocaleDateString(user.locale === "uz" ? "uz-UZ" : "en-US", {
                      year: "numeric",
                      month: "short",
                      day: "numeric",
                      hour: "2-digit",
                      minute: "2-digit",
                    })}
                  </td>
                  <td className="px-6 py-4">
                    {attempt.state === "completed" ? (
                      <span className="inline-flex items-center gap-1.5 rounded-full bg-green-500/10 px-2.5 py-0.5 text-xs font-medium text-green-600 dark:text-green-400">
                        <CheckCircle2 className="h-3.5 w-3.5" />
                        Tugallangan
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1.5 rounded-full bg-blue-500/10 px-2.5 py-0.5 text-xs font-medium text-blue-600 dark:text-blue-400">
                        <Clock className="h-3.5 w-3.5" />
                        Jarayonda
                      </span>
                    )}
                  </td>
                  <td className="px-6 py-4 text-right font-medium">
                    {attempt.score !== null && attempt.score !== undefined ? (
                      <span className="text-lg">{attempt.score}%</span>
                    ) : (
                      <span className="text-[var(--color-muted-fg)]">—</span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
