"use client";

import type { User } from "@/lib/api";
import { Menu, Globe, Sun, Moon } from "lucide-react";
import { Link, usePathname, useRouter } from "@/i18n/routing";
import { useParams } from "next/navigation";
import { useTheme } from "next-themes";
import { useState, useEffect } from "react";

export function DashboardHeader({ user, onMenuClick }: { user: User | null; onMenuClick?: () => void }) {
  const pathname = usePathname();
  const params = useParams();
  const router = useRouter();
  const currentLocale = params.locale as string;
  const { theme, setTheme } = useTheme();
  const [mounted, setMounted] = useState(false);

  useEffect(() => setMounted(true), []);

  const toggleLocale = () => {
    const nextLocale = currentLocale === "uz" ? "en" : "uz";
    router.replace(pathname, { locale: nextLocale });
  };

  return (
    <header className="sticky top-0 z-30 flex h-16 items-center justify-between border-b border-[var(--color-border)]/40 bg-white/40 dark:bg-black/20 px-6 backdrop-blur-xl sm:justify-end">
      {/* Mobile Hamburger (Visible only on mobile) */}
      <button 
        onClick={onMenuClick}
        className="sm:hidden p-2 -ml-2 rounded-xl text-[var(--color-muted-fg)] transition-all hover:bg-[var(--color-muted)]/30 hover:text-[var(--color-fg)]"
      >
        <Menu className="h-5 w-5" />
      </button>

      {/* Mobile Logo */}
      <div className="sm:hidden font-extrabold tracking-tight text-md flex items-center gap-1.5">
        <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-gradient-to-br from-[var(--color-primary)] to-violet-600 text-white text-xs shadow-sm font-extrabold">
          L
        </div>
        <span>LanguagePro<span className="text-[var(--color-primary)] ml-0.5">AI</span></span>
      </div>

      <div className="flex items-center gap-3">
        {/* Theme Toggle */}
        <button
          onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
          className="flex h-9 w-9 items-center justify-center rounded-xl border border-[var(--color-border)]/50 bg-white/10 text-[var(--color-muted-fg)] hover:text-[var(--color-fg)] hover:border-[var(--color-primary)]/40 hover:bg-[var(--color-muted)]/20 transition-all duration-300 dark:bg-black/20 cursor-pointer"
          aria-label="Toggle theme"
        >
          {mounted && (
            <span className="transition-transform duration-500 hover:rotate-45">
              {theme === "dark" ? <Sun className="h-4.5 w-4.5 text-amber-400" /> : <Moon className="h-4.5 w-4.5" />}
            </span>
          )}
        </button>

        {/* Language Selection */}
        <button
          onClick={toggleLocale}
          className="group flex h-9 items-center gap-2 rounded-xl border border-[var(--color-border)]/50 bg-white/10 px-3 text-xs font-bold uppercase tracking-wider transition-all duration-300 hover:border-[var(--color-primary)]/40 hover:bg-[var(--color-muted)]/20 dark:bg-black/20 cursor-pointer"
        >
          <Globe className="h-3.5 w-3.5 text-[var(--color-muted-fg)] transition-colors group-hover:text-[var(--color-primary)]" />
          <span>{currentLocale}</span>
        </button>

        {user && (
          <div className="flex items-center gap-3 border-l border-[var(--color-border)]/50 pl-3">
            <div className="hidden flex-col items-end sm:flex">
              <span className="text-sm font-bold text-[var(--color-fg)]">{user.display_name || user.email.split("@")[0]}</span>
              <span className="text-[10px] text-[var(--color-muted-fg)] font-semibold tracking-wider uppercase font-mono">{user.roles?.[0] || "student"}</span>
            </div>
            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-gradient-to-tr from-[var(--color-primary)] to-violet-500 text-sm font-extrabold text-white shadow-md shadow-[var(--color-primary)]/15 ring-2 ring-[var(--color-bg)] transition-all duration-300 hover:scale-105 hover:shadow-lg cursor-pointer">
              {((user.display_name || user.email) ?? "?")[0]?.toUpperCase() ?? "?"}
            </div>
          </div>
        )}
      </div>
    </header>

  );
}
