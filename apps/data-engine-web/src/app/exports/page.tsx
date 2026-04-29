import { AdminShell } from "@/components/AdminShell";
import { api } from "@/lib/api";
import { requireAdmin } from "@/lib/auth-server";
import { getAdminCopy } from "@/lib/admin-i18n";
import { Activity, BrainCircuit, ClipboardCheck, Database, FileDown, FlaskConical } from "lucide-react";

export default async function ExportsPage() {
  const user = await requireAdmin("/exports");
  const copy = getAdminCopy(user.locale).exports;

  const cards = [
    {
      title: copy.questionTitle,
      desc: copy.questionDesc,
      icon: Database,
      links: [
        { label: copy.allQuestions, href: api.exports.questionsCsvUrl() },
        { label: copy.approvedOnly, href: api.exports.questionsCsvUrl({ status: "approved" }) },
      ],
    },
    {
      title: copy.validationTitle,
      desc: copy.validationDesc,
      icon: ClipboardCheck,
      links: [{ label: copy.download, href: api.exports.validationResultsCsvUrl() }],
    },
    {
      title: copy.jobsTitle,
      desc: copy.jobsDesc,
      icon: BrainCircuit,
      links: [{ label: copy.download, href: api.exports.generationJobsCsvUrl() }],
    },
    {
      title: copy.llmTitle,
      desc: copy.llmDesc,
      icon: Activity,
      links: [{ label: copy.download, href: api.exports.llmCallsCsvUrl("30d") }],
    },
  ];

  return (
    <AdminShell user={user}>
      <div className="p-6 sm:p-10">
        <div className="mb-10 max-w-4xl">
          <div className="mb-4 inline-flex items-center gap-2 rounded-lg border border-emerald-500/20 bg-emerald-500/10 px-3 py-2 text-xs font-black uppercase tracking-widest text-emerald-700 dark:text-emerald-300">
            <FlaskConical className="h-4 w-4" />
            {copy.badge}
          </div>
          <h1 className="flex items-center gap-3 text-3xl font-extrabold tracking-tight text-slate-900 dark:text-white">
            <FileDown className="h-8 w-8 text-emerald-500 dark:text-emerald-400" />
            {copy.pageTitle}
          </h1>
          <p className="mt-3 text-base leading-relaxed text-slate-600 dark:text-slate-400">
            {copy.pageDescription}
          </p>
        </div>

        <section className="grid gap-5 lg:grid-cols-2">
          {cards.map(({ title, desc, icon: Icon, links }) => (
            <div
              key={title}
              className="rounded-lg border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-800/60 dark:bg-black/40"
            >
              <div className="flex items-start gap-4">
                <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-lg bg-emerald-500/10 text-emerald-600 dark:text-emerald-400">
                  <Icon className="h-5 w-5" />
                </div>
                <div className="min-w-0 flex-1">
                  <h2 className="text-lg font-black text-slate-900 dark:text-white">{title}</h2>
                  <p className="mt-2 text-sm leading-6 text-slate-600 dark:text-slate-400">{desc}</p>
                  <div className="mt-5 flex flex-wrap gap-2">
                    {links.map((link) => (
                      <a
                        key={link.href}
                        href={link.href}
                        className="inline-flex items-center gap-2 rounded-lg bg-emerald-500 px-3 py-2 text-sm font-bold text-white shadow-lg shadow-emerald-500/20 transition-colors hover:bg-emerald-400"
                      >
                        <FileDown className="h-4 w-4" />
                        {link.label}
                      </a>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          ))}
        </section>

        <section className="mt-8 rounded-lg border border-slate-200 bg-slate-50 p-6 dark:border-slate-800/60 dark:bg-slate-900/30">
          <h2 className="text-lg font-black text-slate-900 dark:text-white">{copy.researchUseTitle}</h2>
          <div className="mt-5 grid gap-3 lg:grid-cols-2">
            {copy.researchUse.map((item) => (
              <div key={item} className="rounded-lg border border-slate-200 bg-white p-4 text-sm leading-6 text-slate-700 dark:border-slate-800/60 dark:bg-black/30 dark:text-slate-300">
                {item}
              </div>
            ))}
          </div>
        </section>
      </div>
    </AdminShell>
  );
}
