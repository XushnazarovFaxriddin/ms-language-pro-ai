import Link from "next/link";
import { api } from "@/lib/api";
import { getCookieHeader, requireUser } from "@/lib/auth-server";
import { AppHeader } from "@/components/AppHeader";
import { StartAttemptButton } from "./StartAttemptButton";

export default async function ExamsPage() {
  const user = await requireUser("/exams");
  const ck = await getCookieHeader();
  const exams = await api.exam.listExams(ck);

  return (
    <>
      <AppHeader user={user} />
      <main className="container mx-auto max-w-3xl px-6 py-12">
        <h1 className="text-3xl font-bold">Mavjud imtihonlar</h1>
        <p className="mt-2 text-sm text-[var(--color-muted-fg)]">
          Bitta imtihonni tanlang va boshlang. Adaptive: javoblaringizga qarab keyingi
          savollar tanlanadi.
        </p>
        <ul className="mt-8 grid gap-4">
          {exams.map((e) => (
            <li
              key={e.id}
              className="flex items-center justify-between rounded border border-[var(--color-border)] p-6"
            >
              <div>
                <h2 className="font-semibold">{user.locale === "uz" ? e.name_uz : e.name_en}</h2>
                <p className="mt-1 text-sm text-[var(--color-muted-fg)]">
                  Blueprint: <span className="font-mono">{e.blueprint_code}</span>
                </p>
              </div>
              <StartAttemptButton blueprintCode={e.blueprint_code} />
            </li>
          ))}
          {exams.length === 0 && (
            <li className="rounded border border-dashed border-[var(--color-border)] p-6 text-center text-[var(--color-muted-fg)]">
              Hozircha imtihonlar yo&apos;q. <Link href="/" className="underline">Bosh sahifa</Link>
            </li>
          )}
        </ul>
      </main>
    </>
  );
}
