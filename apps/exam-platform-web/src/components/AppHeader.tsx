"use client";

import { useEffect, useState } from "react";
import { useTranslations } from "next-intl";
import { useTheme } from "next-themes";
import { Globe, Sun, Moon } from "lucide-react";
import { useParams } from "next/navigation";
import { Link, usePathname, useRouter } from "@/i18n/routing";
import type { User } from "@/lib/api";
import { LogoutButton } from "./LogoutButton";

export function AppHeader({ user }: { user: User | null }) {
  const tNav = useTranslations("Dashboard.nav");
  const tAction = useTranslations("Common.actions");
  const { theme, setTheme } = useTheme();
  const pathname = usePathname();
  const router = useRouter();
  const params = useParams();
  const currentLocale = (params.locale as string) || "uz";
  const [mounted, setMounted] = useState(false);

  useEffect(() => setMounted(true), []);

  const toggleLocale = () => {
    const next = currentLocale === "uz" ? "en" : "uz";
    router.replace(pathname, { locale: next });
  };

  return (
    <header className="border-b border-[var(--color-border)]/50 bg-[var(--color-bg)]/60 backdrop-blur-xl">
      <div className="container mx-auto flex max-w-5xl items-center justify-between px-6 py-4">
        <Link href="/" className="flex items-center gap-2 font-extrabold tracking-tight text-lg">
          <div className="flex h-7 w-7 items-center justify-center rounded-md bg-gradient-to-br from-[var(--color-primary)] to-blue-500 text-white shadow-sm text-xs">
            L
          </div>
          <span>
            LanguagePro<span className="text-[var(--color-primary)] ml-0.5">AI</span>
          </span>
        </Link>

        <nav className="flex items-center gap-3 text-sm">
          <button
            type="button"
            onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
            className="flex h-9 w-9 items-center justify-center rounded-lg border border-[var(--color-border)]/50 bg-white/5 text-[var(--color-muted-fg)] transition-all hover:text-[var(--color-fg)] dark:bg-black/20"
            aria-label="Toggle theme"
          >
            {mounted && (theme === "dark" ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />)}
          </button>

          <button
            type="button"
            onClick={toggleLocale}
            className="group flex items-center gap-2 rounded-full border border-[var(--color-border)]/50 bg-white/5 px-3 py-1.5 text-xs font-semibold uppercase tracking-wider transition-all hover:border-[var(--color-border)] hover:bg-white/10 dark:bg-black/20"
          >
            <Globe className="h-3.5 w-3.5 text-[var(--color-muted-fg)] transition-colors group-hover:text-[var(--color-primary)]" />
            {currentLocale}
          </button>

          {user ? (
            <>
              <Link
                href="/exams"
                className="hidden sm:inline rounded-full px-3 py-1.5 font-medium text-[var(--color-muted-fg)] transition-colors hover:bg-[var(--color-muted)]/30 hover:text-[var(--color-fg)]"
              >
                {tNav("dashboard")}
              </Link>
              <span className="hidden sm:inline text-[var(--color-muted-fg)]">{user.email}</span>
              <LogoutButton />
            </>
          ) : (
            <Link
              href="/login"
              className="rounded-full bg-[var(--color-primary)] px-4 py-1.5 font-semibold text-[var(--color-primary-fg)] transition-all hover:opacity-90"
            >
              {tAction("login")}
            </Link>
          )}
        </nav>
      </div>
    </header>
  );
}
