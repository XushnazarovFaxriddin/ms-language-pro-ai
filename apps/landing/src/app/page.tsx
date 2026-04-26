export default function HomePage() {
  return (
    <main className="container mx-auto max-w-5xl px-6 py-24">
      <header className="space-y-6">
        <p className="text-sm uppercase tracking-widest text-[var(--color-muted-fg)]">
          aiexam.uz
        </p>
        <h1 className="text-5xl font-bold sm:text-6xl">
          LanguagePro <span className="text-[var(--color-primary)]">AI</span>
        </h1>
        <p className="max-w-2xl text-xl text-[var(--color-muted-fg)]">
          Sun&apos;iy intellekt yordamida xorijiy tilini bilish darajasini
          onlayn aniqlang. IELTS Academic va CEFR formatida adaptiv test,
          avtomatik baholash va shaxsiylashtirilgan fikr-mulohaza.
        </p>
      </header>

      <section className="mt-16 grid gap-6 sm:grid-cols-2">
        <a
          href="http://app.localhost"
          className="rounded-[var(--radius)] border border-[var(--color-border)] p-8 transition hover:border-[var(--color-primary)]"
        >
          <h2 className="text-2xl font-semibold">Imtihon topshirish</h2>
          <p className="mt-2 text-[var(--color-muted-fg)]">
            IELTS yoki CEFR testini topshiring. Tezkor natija va sertifikat.
          </p>
        </a>
        <a
          href="http://admin.localhost"
          className="rounded-[var(--radius)] border border-[var(--color-border)] p-8 transition hover:border-[var(--color-primary)]"
        >
          <h2 className="text-2xl font-semibold">Content Studio</h2>
          <p className="mt-2 text-[var(--color-muted-fg)]">
            Mualliflar uchun AI bilan savollar generatsiyasi va kalibratsiyasi.
          </p>
        </a>
      </section>

      <footer className="mt-24 border-t border-[var(--color-border)] pt-8 text-sm text-[var(--color-muted-fg)]">
        <p>
          © 2026 Ismatov Bobomurod & Xushnazarov Faxriddin · Buxoro Davlat
          Universiteti · Dastur guvohnomasi: LanguagePro AI
        </p>
      </footer>
    </main>
  );
}
