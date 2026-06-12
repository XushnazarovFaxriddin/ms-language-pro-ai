import { redirect } from "next/navigation";
import { tryGetUser } from "@/lib/auth-server";
import { RegisterForm } from "./RegisterForm";
import { Sparkles } from "lucide-react";
import { Link } from "@/i18n/routing";

export default async function RegisterPage({
  searchParams,
  params,
}: {
  searchParams: Promise<{ returnTo?: string }>;
  params: Promise<{ locale: string }>;
}) {
  const sp = await searchParams;
  const p = await params;
  const user = await tryGetUser();
  const locale = p.locale as "uz" | "en";
  if (user) redirect(`/${locale}${sp.returnTo ?? "/exams"}`);
  
  return (
    <main className="relative flex min-h-screen items-center justify-center overflow-hidden px-4 py-12">
      {/* Dynamic Glowing Mesh Background */}
      <div className="absolute -left-20 -top-20 h-96 w-96 rounded-full bg-[var(--color-primary)]/20 blur-3xl pointer-events-none mesh-glow" />
      <div className="absolute -right-20 -bottom-20 h-96 w-96 rounded-full bg-violet-500/20 blur-3xl pointer-events-none mesh-glow" />
      
      <div className="glass-panel relative z-10 w-full max-w-md rounded-3xl p-8 sm:p-10 shadow-2xl transition-all duration-500 hover:shadow-primary/5">
        <div className="flex flex-col items-center text-center mb-8">
          <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-br from-[var(--color-primary)] to-violet-600 text-white shadow-xl shadow-[var(--color-primary)]/20 font-extrabold text-2xl mb-4 transition-transform hover:scale-110 duration-300">
            L
          </div>
          <span className="inline-flex items-center gap-1.5 rounded-full bg-[var(--color-primary)]/10 px-3 py-1 text-xs font-bold uppercase tracking-wider text-[var(--color-primary)] mb-2">
            <Sparkles className="h-3 w-3" /> LanguagePro AI
          </span>
          <h1 className="text-3xl font-extrabold tracking-tight mt-1">
            {locale === "uz" ? "Ro'yxatdan o'tish" : "Sign Up"}
          </h1>
          <p className="mt-2 text-sm text-[var(--color-muted-fg)] max-w-xs">
            {locale === "uz" 
              ? "Platformada yangi hisob yarating va imtihonlarni topshiring" 
              : "Create a new account and start taking exams"}
          </p>
        </div>

        <RegisterForm returnTo={sp.returnTo ?? "/exams"} locale={locale} />

        <div className="mt-6 text-center">
          <p className="text-sm text-[var(--color-muted-fg)]">
            {locale === "uz" ? "Hisobingiz bormi?" : "Already have an account?"}{" "}
            <Link
              href="/login"
              className="font-bold text-[var(--color-primary)] hover:underline transition-colors"
            >
              {locale === "uz" ? "Kirish" : "Log in"}
            </Link>
          </p>
        </div>
      </div>
    </main>
  );
}
