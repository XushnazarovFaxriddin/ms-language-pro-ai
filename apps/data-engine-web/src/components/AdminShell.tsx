"use client";

import { useTheme } from "next-themes";
import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import type { User } from "@/lib/api";
import { getAdminCopy } from "@/lib/admin-i18n";
import { LanguageSwitcher } from "./LanguageSwitcher";
import { LogoutButton } from "./LogoutButton";
import { LayoutDashboard, BrainCircuit, Activity, Menu, Sparkles, ChevronRight, Database, ClipboardCheck, Settings, Sun, Moon, BookOpen, FlaskConical, ScrollText, FileDown, Microscope } from "lucide-react";

const NAV = [
  { href: "/dashboard", labelKey: "dashboard", icon: LayoutDashboard },
  { href: "/generation", labelKey: "generation", icon: BrainCircuit },
  { href: "/generation/practice", labelKey: "practiceGeneration", icon: FlaskConical },
  { href: "/items", labelKey: "items", icon: Database },
  { href: "/practice-catalogue", labelKey: "practiceCatalogue", icon: BookOpen },
  { href: "/nlp-lab", labelKey: "nlpLab", icon: Microscope },
  { href: "/methodology", labelKey: "methodology", icon: ScrollText },
  { href: "/review", labelKey: "review", icon: ClipboardCheck },
  { href: "/llm-usage", labelKey: "usage", icon: Activity },
  { href: "/exports", labelKey: "exports", icon: FileDown },
  { href: "/settings", labelKey: "settings", icon: Settings },
] as const;

export function AdminShell({
  user,
  children,
}: {
  user: User;
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const copy = getAdminCopy(user.locale);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const { theme, setTheme } = useTheme();
  const [mounted, setMounted] = useState(false);

  useEffect(() => setMounted(true), []);

  return (
    <div className="flex min-h-screen bg-slate-50 dark:bg-[#0a0a0a] text-slate-900 dark:text-slate-200 transition-colors duration-300">
      {/* Mobile Sidebar Overlay */}
      {isMobileMenuOpen && (
        <div 
          className="fixed inset-0 z-40 bg-black/60 backdrop-blur-sm sm:hidden"
          onClick={() => setIsMobileMenuOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside className={`fixed inset-y-0 left-0 z-50 w-64 transform flex-col border-r border-slate-200 dark:border-slate-800/60 bg-white dark:bg-black/50 backdrop-blur-2xl transition-transform duration-300 ease-in-out sm:translate-x-0 sm:flex sm:sticky sm:top-0 sm:h-screen ${isMobileMenuOpen ? "translate-x-0 flex" : "-translate-x-full hidden"}`}>
        <div className="flex h-16 shrink-0 items-center px-6 border-b border-slate-200 dark:border-slate-800/60">
          <Link href="/dashboard" className="font-extrabold tracking-tight text-xl flex items-center gap-2 group">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-to-br from-emerald-400 to-teal-600 text-white shadow-lg shadow-emerald-500/20 group-hover:scale-105 transition-transform">
              <Sparkles className="h-4 w-4" />
            </div>
            <span className="text-slate-900 dark:text-white">Content<span className="text-emerald-400 ml-1">Studio</span></span>
          </Link>
        </div>

        <nav className="flex-1 overflow-y-auto px-4 py-6 space-y-1.5 custom-scrollbar">
          {NAV.map((n) => {
            const isActive = pathname === n.href;
            return (
              <Link
                key={n.href}
                href={n.href}
                className={`group relative flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-all duration-200 ${
                  isActive
                    ? "text-emerald-600 dark:text-emerald-400"
                    : "text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-100"
                }`}
              >
                {isActive && (
                  <div className="absolute inset-0 rounded-xl bg-emerald-500/10 dark:bg-emerald-400/10 border border-emerald-500/20 dark:border-emerald-400/20" />
                )}
                {!isActive && (
                  <div className="absolute inset-0 rounded-xl bg-transparent transition-colors group-hover:bg-slate-200/50 dark:group-hover:bg-slate-800/50" />
                )}
                <n.icon className={`relative z-10 h-5 w-5 transition-transform duration-200 ${isActive ? "scale-110" : "group-hover:scale-110"}`} />
                <span className="relative z-10">{copy.nav[n.labelKey]}</span>
                {isActive && <ChevronRight className="relative z-10 h-4 w-4 ml-auto opacity-70" />}
              </Link>
            );
          })}
        </nav>

        <div className="p-4 border-t border-slate-200 dark:border-slate-800/60 bg-slate-100 dark:bg-black/20">
          <div className="flex items-center gap-3 px-2 py-2">
            <div className="flex h-9 w-9 items-center justify-center rounded-full bg-gradient-to-tr from-slate-200 to-slate-300 dark:from-slate-700 dark:to-slate-600 text-sm font-bold text-slate-700 dark:text-white shadow-sm ring-1 ring-slate-400/30 dark:ring-slate-500/30">
              {((user.display_name || user.email) ?? "?")[0]?.toUpperCase() ?? "?"}
            </div>
            <div className="flex flex-col overflow-hidden">
              <span className="text-sm font-semibold truncate text-slate-900 dark:text-slate-200">{user.display_name || user.email.split("@")[0]}</span>
              <span className="text-[10px] font-mono text-emerald-600 dark:text-emerald-400/80 uppercase tracking-wider truncate">{user.roles.join(", ")}</span>
            </div>
          </div>
          <div className="mt-2 flex justify-end px-2">
            <LogoutButton label={copy.shell.logout} />
          </div>
        </div>
      </aside>

      <div className="flex flex-1 flex-col min-w-0">
        {/* Header */}
        <header className="sticky top-0 z-30 flex h-16 items-center justify-between border-b border-slate-200 dark:border-slate-800/60 bg-white/60 dark:bg-black/40 px-6 backdrop-blur-xl sm:justify-end">
          <button 
            onClick={() => setIsMobileMenuOpen(true)}
            className="sm:hidden p-2 -ml-2 rounded-lg text-slate-500 dark:text-slate-400 transition-colors hover:bg-slate-100 dark:hover:bg-slate-800 hover:text-slate-900 dark:hover:text-slate-100"
          >
            <Menu className="h-6 w-6" />
          </button>
          
          <div className="sm:hidden font-extrabold tracking-tight text-lg flex items-center gap-1.5">
            <span className="text-slate-900 dark:text-white">Content<span className="text-emerald-400 ml-1">Studio</span></span>
          </div>
          
          <div className="flex items-center gap-4">
            <LanguageSwitcher locale={user.locale} copy={copy.shell} />
             {/* Theme Toggle */}
             <button
              onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
              aria-label={copy.shell.themeToggle}
              title={copy.shell.themeToggle}
              className="flex h-9 w-9 items-center justify-center rounded-lg border border-slate-200 dark:border-slate-800/60 bg-slate-100 dark:bg-white/5 text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white transition-all"
            >
              {mounted && (theme === "dark" ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />)}
            </button>
            <div className="hidden sm:flex items-center text-xs font-mono text-slate-400 dark:text-slate-500">
              v1.2.0-beta
            </div>
          </div>
        </header>

        {/* Main Content */}
        <main className="flex-1 overflow-x-hidden">{children}</main>
      </div>
    </div>
  );
}
