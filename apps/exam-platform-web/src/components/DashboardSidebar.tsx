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
    <aside className="fixed left-0 top-0 z-40 hidden h-screen w-64 flex-col border-r border-[var(--color-border)]/50 bg-[var(--color-bg)] transition-transform sm:flex">
      <div className="flex h-16 items-center px-6 border-b border-[var(--color-border)]/50">
        <Link href="/" className="font-extrabold tracking-tight text-xl flex items-center gap-2">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-to-br from-[var(--color-primary)] to-blue-500 text-white shadow-lg shadow-[var(--color-primary)]/20">
            L
          </div>
          <span>LanguagePro<span className="text-[var(--color-primary)] ml-0.5">AI</span></span>
        </Link>
      </div>

      <div className="flex flex-col justify-between flex-1 overflow-y-auto py-6 px-4">
        <nav className="space-y-1">
          {navItems.map((item) => {
            const isActive = pathname === item.href;
            return (
              <Link
                key={item.href}
                href={item.href as any}
                className={`group relative flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-all duration-200 ${
                  isActive
                    ? "text-[var(--color-primary)]"
                    : "text-[var(--color-muted-fg)] hover:text-[var(--color-fg)]"
                }`}
              >
                {isActive && (
                  <div className="absolute inset-0 rounded-xl bg-[var(--color-primary)]/10 dark:bg-[var(--color-primary)]/20" />
                )}
                {!isActive && (
                  <div className="absolute inset-0 rounded-xl bg-transparent transition-colors group-hover:bg-[var(--color-muted)]/50" />
                )}
                <item.icon className={`relative z-10 h-5 w-5 transition-transform duration-200 ${isActive ? "scale-110" : "group-hover:scale-110"}`} />
                <span className="relative z-10">{item.label}</span>
              </Link>
            );
          })}
        </nav>

        <div className="mt-8">
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
            className="flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium text-red-500/80 transition-colors hover:bg-red-500/10 hover:text-red-500"
          >
            <LogOut className="h-5 w-5" />
            {tAction("logout")}
          </button>
        </div>
      </div>
    </aside>
  );
}
