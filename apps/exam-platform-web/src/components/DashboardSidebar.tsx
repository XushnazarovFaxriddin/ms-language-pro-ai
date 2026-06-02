"use client";

import { useTranslations } from "next-intl";
import { Link, usePathname } from "@/i18n/routing";
import { LayoutDashboard, History, Award, TrendingUp, CreditCard, BookOpen, Settings, LogOut, Map, Dumbbell, MessageSquare } from "lucide-react";
import { api } from "@/lib/api";
import { useRouter } from "@/i18n/routing";

export function DashboardSidebar() {
  const tNav = useTranslations("Dashboard.nav");
  const tAction = useTranslations("Common.actions");
  const pathname = usePathname();
  const router = useRouter();

  const navItems = [
    { href: "/exams", icon: LayoutDashboard, label: tNav("dashboard") },
    { href: "/exams/roadmap", icon: Map, label: tNav("roadmap") },
    { href: "/exams/practice", icon: Dumbbell, label: tNav("practice") },
    { href: "/exams/conversation", icon: MessageSquare, label: tNav("conversation") },
    { href: "/exams/results", icon: History, label: tNav("results") },
    { href: "/exams/certificates", icon: Award, label: tNav("certificates") },
    { href: "/exams/analytics", icon: TrendingUp, label: tNav("analytics") },
    { href: "/exams/study-materials", icon: BookOpen, label: tNav("studyMaterials") },
    { href: "/exams/payments", icon: CreditCard, label: tNav("payments") },
    { href: "/exams/settings", icon: Settings, label: tNav("settings") },
  ];

  return (
    <aside className="fixed left-0 top-0 z-40 hidden h-screen w-64 flex-col border-r border-[var(--color-border)]/50 bg-white/60 dark:bg-black/40 backdrop-blur-xl transition-transform sm:flex">
      <div className="flex h-16 items-center px-6 border-b border-[var(--color-border)]/50">
        <Link href="/" className="font-extrabold tracking-tight text-lg flex items-center gap-2.5">
          <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br from-[var(--color-primary)] to-violet-600 text-white shadow-lg shadow-[var(--color-primary)]/20 font-extrabold text-lg transition-transform hover:scale-105 duration-200">
            L
          </div>
          <span className="font-bold">LanguagePro<span className="text-[var(--color-primary)] ml-0.5">AI</span></span>
        </Link>
      </div>

      <div className="flex flex-col justify-between flex-1 overflow-y-auto py-6 px-4">
        <nav className="space-y-1.5">
          {navItems.map((item) => {
            const isActive = pathname === item.href;
            return (
              <Link
                key={item.href}
                href={item.href as any}
                className={`group relative flex items-center gap-3 rounded-2xl px-4 py-3 text-sm font-semibold transition-all duration-300 ${
                  isActive
                    ? "text-[var(--color-primary)] shadow-sm bg-[var(--color-primary)]/5 border-l-2 border-[var(--color-primary)]"
                    : "text-[var(--color-muted-fg)] border-l-2 border-transparent hover:text-[var(--color-fg)] hover:bg-[var(--color-muted)]/30 hover:pl-4.5"
                }`}
              >
                {isActive && (
                  <div className="absolute inset-0 rounded-2xl bg-[var(--color-primary)]/5 dark:bg-[var(--color-primary)]/10 pointer-events-none" />
                )}
                <item.icon className={`relative z-10 h-5 w-5 transition-transform duration-300 ${isActive ? "scale-110 text-[var(--color-primary)]" : "group-hover:scale-110 text-[var(--color-muted-fg)] group-hover:text-[var(--color-fg)]"}`} />
                <span className="relative z-10 truncate">{item.label}</span>
              </Link>
            );
          })}
        </nav>

        <div className="mt-8 pt-4 border-t border-[var(--color-border)]/50">
          <button
            onClick={async () => {
              try {
                await api.auth.logout();
              } catch {
                // ignore
              }
              router.push("/login");
              router.refresh();
            }}
            className="flex w-full items-center gap-3 rounded-2xl px-4 py-3 text-sm font-bold text-red-500/80 transition-all duration-300 hover:bg-red-500/10 hover:text-red-500 hover:pl-5 cursor-pointer"
          >
            <LogOut className="h-5 w-5" />
            {tAction("logout")}
          </button>
        </div>
      </div>
    </aside>

  );
}
