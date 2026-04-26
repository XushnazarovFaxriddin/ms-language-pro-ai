import { redirect } from "next/navigation";
import { tryGetUser } from "@/lib/auth-server";
import { LoginForm } from "./LoginForm";

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ returnTo?: string }>;
}) {
  const sp = await searchParams;
  const user = await tryGetUser();
  if (user) redirect(sp.returnTo ?? "/exams");
  return (
    <main className="container mx-auto flex max-w-md flex-col gap-8 px-6 py-24">
      <div>
        <h1 className="text-3xl font-bold">Kirish</h1>
        <p className="mt-2 text-sm text-[var(--color-muted-fg)]">
          LanguagePro AI hisobingizga kiring.
        </p>
      </div>
      <LoginForm returnTo={sp.returnTo ?? "/exams"} />
      <div className="text-sm text-[var(--color-muted-fg)]">
        <p className="font-mono">Demo hisoblar:</p>
        <ul className="mt-1 space-y-0.5 font-mono text-xs">
          <li>student@aiexam.uz / student12345</li>
          <li>admin@aiexam.uz / admin12345</li>
        </ul>
      </div>
    </main>
  );
}
