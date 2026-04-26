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
    <header className="sticky top-0 z-30 flex h-16 items-center justify-between border-b border-[var(--color-border)] bg-[var(--color-bg)]/80 px-6 backdrop-blur-md sm:justify-end">
      {/* Mobile Hamburger (Visible only on mobile) */}
      <button 
        onClick={onMenuClick}
        className="sm:hidden p-2 -ml-2 text-[var(--color-muted-fg)] hover:text-[var(--color-fg)]"
      >
        <Menu className="h-6 w-6" />
      </button>

      {/* Mobile Logo */}
      <div className="sm:hidden font-bold tracking-tight text-lg">
        LanguagePro <span className="text-[var(--color-primary)]">AI</span>
      </div>

      <div className="flex items-center gap-4">
        <button
          onClick={toggleLocale}
          className="flex items-center gap-2 rounded-full border border-[var(--color-border)] px-3 py-1.5 text-xs font-medium uppercase hover:bg-white/5"
        >
          <Globe className="h-3.5 w-3.5" />
          {currentLocale}
        </button>

        {user && (
          <div className="flex items-center gap-3 border-l border-[var(--color-border)] pl-4">
            <div className="hidden flex-col items-end sm:flex">
              <span className="text-sm font-medium">{user.display_name || user.email.split("@")[0]}</span>
              <span className="text-xs text-[var(--color-muted-fg)]">{user.email}</span>
            </div>
            <div className="flex h-9 w-9 items-center justify-center rounded-full bg-gradient-to-tr from-[var(--color-primary)] to-blue-400 text-sm font-bold text-white shadow-sm">
              {(user.display_name || user.email)[0].toUpperCase()}
            </div>
          </div>
        )}
      </div>
    </header>
  );
}
