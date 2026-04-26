export default function HomePage() {
  return (
    <main className="container mx-auto max-w-3xl px-6 py-24">
      <h1 className="text-4xl font-bold">Content Studio (admin)</h1>
      <p className="mt-4 text-[var(--color-muted-fg)]">
        Bobomurod admin paneli. Phase 2da to&apos;liq ishga tushadi: question
        generation, multi-jury validation, IRT calibration, LLM token usage
        dashboard.
      </p>
      <div className="mt-12 grid gap-4 sm:grid-cols-2">
        <Card title="Generation" desc="AI bilan savollar yaratish (batch jobs, SSE progress)" />
        <Card title="Review queue" desc="Past confidence elementlarni ko'rib chiqish" />
        <Card title="Calibration" desc="2PL parametrlar (a, b) tarixi va distribution" />
        <Card title="LLM Usage" desc="Token sarfi, model breakdown, budget" />
      </div>
    </main>
  );
}

function Card({ title, desc }: { title: string; desc: string }) {
  return (
    <div className="rounded-[var(--radius)] border border-[var(--color-border)] p-6">
      <h2 className="font-semibold">{title}</h2>
      <p className="mt-2 text-sm text-[var(--color-muted-fg)]">{desc}</p>
    </div>
  );
}
