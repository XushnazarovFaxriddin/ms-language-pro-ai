import { requireAdmin } from "@/lib/auth-server";
import { AdminShell } from "@/components/AdminShell";
import { getAdminCopy } from "@/lib/admin-i18n";
import {
  ArrowRight,
  BrainCircuit,
  CheckCircle2,
  Database,
  FlaskConical,
  GitBranch,
  GraduationCap,
  LineChart,
  ScrollText,
  ShieldCheck,
} from "lucide-react";

const PIPELINE = [
  {
    icon: Database,
  },
  {
    icon: ScrollText,
  },
  {
    icon: BrainCircuit,
  },
  {
    icon: FlaskConical,
  },
  {
    icon: BrainCircuit,
  },
  {
    icon: ShieldCheck,
  },
  {
    icon: LineChart,
  },
  {
    icon: GitBranch,
  },
];

export default async function MethodologyPage() {
  const user = await requireAdmin("/methodology");
  const copy = getAdminCopy(user.locale).methodology;
  const pipeline = PIPELINE.map((step, index) => {
    const [title, desc] = copy.pipeline[index] ?? ["", ""];
    return { ...step, title, desc };
  });

  return (
    <AdminShell user={user}>
      <div className="p-6 sm:p-10">
        <div className="mx-auto max-w-6xl space-y-10">
          <header className="border-b border-slate-200 pb-8 dark:border-slate-800/60">
            <div className="mb-4 inline-flex items-center gap-2 rounded-xl border border-emerald-500/20 bg-emerald-500/10 px-3 py-2 text-xs font-black uppercase tracking-widest text-emerald-700 dark:text-emerald-300">
              <GraduationCap className="h-4 w-4" />
              {copy.badge}
            </div>
            <h1 className="max-w-5xl text-3xl font-extrabold tracking-tight text-slate-950 dark:text-white sm:text-4xl">
              {copy.title}
            </h1>
            <p className="mt-4 max-w-3xl text-base leading-7 text-slate-600 dark:text-slate-400">
              {copy.description}
            </p>
          </header>

          <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
            {pipeline.map((step, index) => (
              <div key={step.title} className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800/60 dark:bg-black/40">
                <div className="mb-4 flex items-center justify-between">
                  <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400">
                    <step.icon className="h-5 w-5" />
                  </div>
                  <span className="font-mono text-xs font-black text-slate-400">
                    {String(index + 1).padStart(2, "0")}
                  </span>
                </div>
                <h2 className="text-sm font-black text-slate-950 dark:text-white">{step.title}</h2>
                <p className="mt-2 text-sm leading-6 text-slate-600 dark:text-slate-400">{step.desc}</p>
              </div>
            ))}
          </section>

          <section className="grid gap-8 lg:grid-cols-[1fr_0.9fr]">
            <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-800/60 dark:bg-black/40">
              <div className="mb-5 flex items-center gap-3">
                <ScrollText className="h-6 w-6 text-emerald-500" />
                <h2 className="text-xl font-black text-slate-950 dark:text-white">{copy.noveltyTitle}</h2>
              </div>
              <div className="space-y-3">
                {copy.novelty.map((item) => (
                  <div key={item} className="flex gap-3 rounded-xl border border-slate-200 p-4 dark:border-slate-800/60">
                    <CheckCircle2 className="mt-0.5 h-5 w-5 flex-shrink-0 text-emerald-500" />
                    <p className="text-sm leading-6 text-slate-700 dark:text-slate-300">{item}</p>
                  </div>
                ))}
              </div>
            </div>

            <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-800/60 dark:bg-black/40">
              <div className="mb-5 flex items-center gap-3">
                <FlaskConical className="h-6 w-6 text-blue-500" />
                <h2 className="text-xl font-black text-slate-950 dark:text-white">{copy.workflowTitle}</h2>
              </div>
              <div className="space-y-4">
                {copy.operatorTasks.map(([title, desc]) => (
                  <div key={title} className="flex gap-3">
                    <ArrowRight className="mt-1 h-4 w-4 flex-shrink-0 text-blue-500" />
                    <div>
                      <p className="text-sm font-black text-slate-900 dark:text-white">{title}</p>
                      <p className="mt-1 text-sm leading-6 text-slate-600 dark:text-slate-400">{desc}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </section>

          <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-800/60 dark:bg-black/40">
            <h2 className="text-xl font-black text-slate-950 dark:text-white">{copy.evidenceTitle}</h2>
            <div className="mt-5 grid gap-4 sm:grid-cols-3">
              {copy.evidence.map(([title, desc]) => (
                <EvidenceCard key={title} title={title} desc={desc} />
              ))}
            </div>
          </section>
        </div>
      </div>
    </AdminShell>
  );
}

function EvidenceCard({ title, desc }: { title: string; desc: string }) {
  return (
    <div className="rounded-xl border border-slate-200 bg-slate-50 p-4 dark:border-slate-800 dark:bg-slate-900/40">
      <p className="font-mono text-xs font-black uppercase tracking-widest text-emerald-600 dark:text-emerald-400">
        {title}
      </p>
      <p className="mt-2 text-sm leading-6 text-slate-600 dark:text-slate-400">{desc}</p>
    </div>
  );
}
