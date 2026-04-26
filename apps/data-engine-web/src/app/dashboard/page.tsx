import Link from "next/link";
import { api } from "@/lib/api";
import { getCookieHeader, requireAdmin } from "@/lib/auth-server";
import { AdminShell } from "@/components/AdminShell";

export default async function DashboardPage() {
  const user = await requireAdmin("/dashboard");
  const ck = await getCookieHeader();
  let summary: Awaited<ReturnType<typeof api.usage.summary>> | null = null;
  try {
    summary = await api.usage.summary("7d", ck);
  } catch {
    /* ignore — empty DB on first run */
  }

  return (
    <AdminShell user={user}>
      <main className="px-8 py-10">
        <h1 className="text-3xl font-bold">Bosh sahifa</h1>
        <p className="mt-2 text-sm text-[var(--color-muted-fg)]">
          LanguagePro AI — Content Studio. Savollar generatsiyasi, IRT kalibratsiyasi,
          va LLM xarajatlarini boshqaring.
        </p>

        <section className="mt-10 grid gap-4 sm:grid-cols-3">
          <StatCard
            title="LLM jami xarajat (7 kun)"
            value={summary ? `$${Number(summary.total_cost_usd).toFixed(4)}` : "—"}
          />
          <StatCard
            title="LLM chaqiruvlar (7 kun)"
            value={summary ? String(summary.total_calls) : "—"}
          />
          <StatCard
            title="O'rtacha latency (ms)"
            value={summary ? String(summary.avg_latency_ms) : "—"}
          />
        </section>

        <section className="mt-12 grid gap-4 sm:grid-cols-2">
          <ActionCard
            href="/generation"
            title="Yangi savollar generatsiya qilish"
            desc="Gemini 2.5-pro orqali IELTS Reading MCQ savollari yaratish"
          />
          <ActionCard
            href="/llm-usage"
            title="LLM xarajat dashboardi"
            desc="Token sarfi, model bo'yicha breakdown, qo'ng'iroqlar tarixi"
          />
        </section>
      </main>
    </AdminShell>
  );
}

function StatCard({ title, value }: { title: string; value: string }) {
  return (
    <div className="rounded border border-[var(--color-border)] p-6">
      <p className="text-sm text-[var(--color-muted-fg)]">{title}</p>
      <p className="mt-2 text-3xl font-bold">{value}</p>
    </div>
  );
}

function ActionCard({ href, title, desc }: { href: string; title: string; desc: string }) {
  return (
    <Link
      href={href}
      className="rounded border border-[var(--color-border)] p-6 transition hover:border-[var(--color-primary)]"
    >
      <h2 className="font-semibold">{title}</h2>
      <p className="mt-2 text-sm text-[var(--color-muted-fg)]">{desc}</p>
    </Link>
  );
}
