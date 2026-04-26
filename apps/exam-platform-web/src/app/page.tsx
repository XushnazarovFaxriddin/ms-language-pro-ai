export default function HomePage() {
  return (
    <main className="container mx-auto max-w-3xl px-6 py-24">
      <h1 className="text-4xl font-bold">Imtihon platformasi</h1>
      <p className="mt-4 text-[var(--color-muted-fg)]">
        Talaba interfeysi (Faxriddin). MVP qurilmoqda — Phase 2da to&apos;liq
        ExamRunner ishga tushadi.
      </p>
      <ul className="mt-8 list-disc space-y-2 pl-6">
        <li>Reading: 60 daqiqa, 40 savol</li>
        <li>Writing: 60 daqiqa, 2 task</li>
        <li>Listening: 30 daqiqa, 40 savol</li>
        <li>Speaking: 11–14 daqiqa, 3 part</li>
      </ul>
    </main>
  );
}
