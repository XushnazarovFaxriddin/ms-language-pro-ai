import Link from "next/link";
import { tryGetUser } from "@/lib/auth-server";
import { AppHeader } from "@/components/AppHeader";

export default async function HomePage() {
  const user = await tryGetUser();
  return (
    <>
      <AppHeader user={user} />
      <main className="container mx-auto max-w-3xl px-6 py-24">
        <h1 className="text-5xl font-bold tracking-tight">
          LanguagePro <span className="text-[var(--color-primary)]">AI</span>
        </h1>
        <p className="mt-4 text-lg text-[var(--color-muted-fg)]">
          IELTS va CEFR ingliz tili imtihonlarini AI yordamida onlayn topshiring.
          Adaptive test, avtomatik baholash, tushunarli fikr-mulohaza.
        </p>
        <div className="mt-10 flex gap-3">
          <Link
            href={user ? "/exams" : "/login?returnTo=%2Fexams"}
            className="rounded bg-[var(--color-primary)] px-5 py-3 font-medium text-[var(--color-primary-fg)]"
          >
            {user ? "Imtihon topshirish" : "Boshlash"}
          </Link>
          <a
            href={process.env.NEXT_PUBLIC_LANDING_URL ?? "http://localhost:3000"}
            className="rounded border border-[var(--color-border)] px-5 py-3"
          >
            Loyiha haqida
          </a>
        </div>
      </main>
    </>
  );
}
