"use client";

import type { User } from "@/lib/api";
import { Menu, Globe } from "lucide-react";
import { Link, usePathname, useRouter } from "@/i18n/routing";
import { useParams } from "next/navigation";

export function DashboardHeader({ user, onMenuClick }: { user: User | null; onMenuClick?: () => void }) {
  const pathname = usePathname();
  const params = useParams();
  const router = useRouter();
  const currentLocale = params.locale as string;

  const toggleLocale = () => {
    const nextLocale = currentLocale === "uz" ? "en" : "uz";
    router.replace(pathname, { locale: nextLocale });
  };

  return (
    <header className="sticky top-0 z-30 flex h-16 items-center justify-between border-b border-[var(--color-border)]/50 bg-[var(--color-bg)]/60 px-6 backdrop-blur-xl sm:justify-end">
      {/* Mobile Hamburger (Visible only on mobile) */}
      <button 
        onClick={onMenuClick}
        className="sm:hidden p-2 -ml-2 rounded-lg text-[var(--color-muted-fg)] transition-colors hover:bg-[var(--color-muted)]/30 hover:text-[var(--color-fg)]"
      >
        <Menu className="h-6 w-6" />
      </button>

      {/* Mobile Logo */}
      <div className="sm:hidden font-extrabold tracking-tight text-lg flex items-center gap-1.5">
        <div className="flex h-6 w-6 items-center justify-center rounded-md bg-gradient-to-br from-[var(--color-primary)] to-blue-500 text-white text-xs shadow-sm">
          L
        </div>
        <span>LanguagePro<span className="text-[var(--color-primary)] ml-0.5">AI</span></span>
      </div>

      <div className="flex items-center gap-4">
        <button
          onClick={toggleLocale}
          className="group flex items-center gap-2 rounded-full border border-[var(--color-border)]/50 bg-white/5 px-3 py-1.5 text-xs font-semibold uppercase tracking-wider transition-all hover:border-[var(--color-border)] hover:bg-white/10 dark:bg-black/20"
        >
          <Globe className="h-3.5 w-3.5 text-[var(--color-muted-fg)] transition-colors group-hover:text-[var(--color-primary)]" />
          {currentLocale}
        </button>

        {user && (
          <div className="flex items-center gap-3 border-l border-[var(--color-border)]/50 pl-4">
            <div className="hidden flex-col items-end sm:flex">
              <span className="text-sm font-semibold">{user.display_name || user.email.split("@")[0]}</span>
              <span className="text-xs text-[var(--color-muted-fg)] font-medium">{user.email}</span>
            </div>
            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-gradient-to-tr from-[var(--color-primary)] to-blue-400 text-sm font-bold text-white shadow-lg shadow-[var(--color-primary)]/20 ring-2 ring-[var(--color-bg)] transition-transform hover:scale-105 cursor-pointer">
              {(user.display_name || user.email)[0].toUpperCase()}
            </div>
          </div>
        )}
      </div>
    </header>
  );
}
