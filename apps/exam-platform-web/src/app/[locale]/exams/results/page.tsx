import { getTranslations } from "next-intl/server";
import { Link } from "@/i18n/routing";
import { api } from "@/lib/api";
import { getCookieHeader, requireUser } from "@/lib/auth-server";
import { MoveRight, History, FileText, CheckCircle2, Clock, Eye } from "lucide-react";

export default async function ResultsPage() {
  const user = await requireUser("/exams/results");
  const ck = await getCookieHeader();
  let attempts: Awaited<ReturnType<typeof api.exam.listAttempts>> = [];
  try {
    attempts = await api.exam.listAttempts(ck);
  } catch {
    // API may return 500 if DB has no scoring data yet — gracefully show empty
  }
  const tRes = await getTranslations("Dashboard.resultsPage");

  return (
    <div className="mx-auto max-w-5xl space-y-8">
      <div className="mb-8 border-b border-[var(--color-border)] pb-6">
        <h1 className="text-3xl font-extrabold tracking-tight">{tRes("title")}</h1>
        <p className="mt-2 text-[var(--color-muted-fg)]">
          {tRes("description")}
        </p>
      </div>

      {attempts.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-[2rem] border border-[var(--color-border)]/50 bg-white/5 dark:bg-black/20 p-16 text-center shadow-sm backdrop-blur-xl">
          <div className="flex h-20 w-20 items-center justify-center rounded-2xl bg-blue-500/10 text-blue-500 mb-6">
            <History className="h-10 w-10" />
          </div>
          <h3 className="mb-2 text-xl font-bold">{tRes("emptyTitle")}</h3>
          <p className="mb-8 text-[var(--color-muted-fg)] max-w-sm">
            {tRes("emptyDesc")}
          </p>
          <Link
            href="/exams"
            className="group flex items-center gap-2 rounded-full bg-gradient-to-r from-[var(--color-primary)] to-blue-500 px-8 py-3 text-sm font-bold text-white shadow-lg shadow-[var(--color-primary)]/20 transition-all hover:-translate-y-0.5 hover:shadow-xl"
          >
            {tRes("startExam")} <MoveRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
          </Link>
        </div>
      ) : (
        <div className="overflow-hidden rounded-2xl border border-[var(--color-border)]/50 bg-white/5 dark:bg-black/20 shadow-sm backdrop-blur-xl">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="bg-black/5 dark:bg-white/5 border-b border-[var(--color-border)]/50 text-[var(--color-muted-fg)] text-xs uppercase tracking-wider font-semibold">
                <tr>
                  <th className="px-6 py-4">{tRes("tableExam")}</th>
                  <th className="px-6 py-4">{tRes("tableDate")}</th>
                  <th className="px-6 py-4">{tRes("tableStatus")}</th>
                  <th className="px-6 py-4 text-right">{tRes("tableScore")}</th>
                  <th className="px-6 py-4 text-right">{tRes("tableAction")}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[var(--color-border)]/50">
                {attempts.map((attempt) => (
                  <tr key={attempt.id} className="group transition-colors hover:bg-black/5 dark:hover:bg-white/5">
                    <td className="px-6 py-5">
                      <div className="flex items-center gap-4">
                        <div className="flex h-12 w-12 flex-shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-indigo-500/10 to-purple-500/10 text-indigo-500 shadow-inner group-hover:from-indigo-500/20 group-hover:to-purple-500/20 transition-colors">
                          <FileText className="h-6 w-6" />
                        </div>
                        <div>
                          <p className="font-bold text-base">{user.locale === "uz" ? attempt.exam_name_uz : attempt.exam_name_en}</p>
                          <div className="mt-1 flex items-center gap-2">
                            <span className="rounded-md bg-[var(--color-muted)]/50 px-2 py-0.5 font-mono text-[10px] uppercase tracking-wider text-[var(--color-muted-fg)]">
                              {attempt.blueprint_code}
                            </span>
                            <span className="font-mono text-[10px] text-[var(--color-muted-fg)]">
                              ID: {attempt.id.split("-")[0]}
                            </span>
                          </div>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-5 text-[var(--color-muted-fg)] font-medium">
                      {new Date(attempt.started_at).toLocaleDateString(user.locale === "uz" ? "uz-UZ" : "en-US", {
                        year: "numeric",
                        month: "short",
                        day: "numeric",
                        hour: "2-digit",
                        minute: "2-digit",
                      })}
                    </td>
                    <td className="px-6 py-5">
                      {attempt.state === "completed" ? (
                        <span className="inline-flex items-center gap-1.5 rounded-full border border-green-500/20 bg-green-500/10 px-3 py-1 text-xs font-semibold text-green-600 dark:text-green-400">
                          <CheckCircle2 className="h-3.5 w-3.5" />
                          {tRes("completed")}
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1.5 rounded-full border border-blue-500/20 bg-blue-500/10 px-3 py-1 text-xs font-semibold text-blue-600 dark:text-blue-400">
                          <Clock className="h-3.5 w-3.5 animate-pulse" />
                          {tRes("inProgress")}
                        </span>
                      )}
                    </td>
                    <td className="px-6 py-5 text-right font-bold">
                      {attempt.score !== null && attempt.score !== undefined ? (
                        <div className="flex flex-col items-end">
                          <span className={`text-xl ${attempt.score >= 6 ? 'text-green-500' : 'text-amber-500'}`}>
                            {attempt.score.toFixed(1)}
                          </span>
                          <span className="text-xs text-[var(--color-muted-fg)] font-medium">{tRes("ieltsBand")}</span>
                        </div>
                      ) : (
                        <span className="text-[var(--color-muted-fg)]">—</span>
                      )}
                    </td>
                    <td className="px-6 py-5 text-right">
                      <Link
                        href={`/results/${attempt.id}`}
                        className="inline-flex items-center gap-2 rounded-xl border border-[var(--color-border)]/50 px-3 py-2 text-xs font-bold text-[var(--color-fg)] transition-colors hover:bg-[var(--color-muted)]/40"
                      >
                        <Eye className="h-4 w-4" />
                        {tRes("viewResult")}
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
