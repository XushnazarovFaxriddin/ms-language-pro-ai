"use client";

import { useTranslations } from "next-intl";
import { Link, usePathname } from "@/i18n/routing";
import { LayoutDashboard, History, Award, Settings, LogOut } from "lucide-react";
import { api } from "@/lib/api";
import { useRouter } from "@/i18n/routing";

export function DashboardSidebar() {
  const tNav = useTranslations("Dashboard.nav");
  const tAction = useTranslations("Common.actions");
  const pathname = usePathname();
  const router = useRouter();

  const navItems = [
    { href: "/exams", icon: LayoutDashboard, label: tNav("dashboard") },
    { href: "/exams/results", icon: History, label: tNav("results") },
    { href: "/exams/certificates", icon: Award, label: tNav("certificates") },
    { href: "/exams/settings", icon: Settings, label: tNav("settings") },
  ];

  return (
    <aside className="fixed left-0 top-0 z-40 hidden h-screen w-64 flex-col border-r border-[var(--color-border)] bg-[var(--color-bg)] transition-transform sm:flex">
      <div className="flex h-16 items-center px-6 border-b border-[var(--color-border)]">
        <Link href="/" className="font-bold tracking-tight text-xl">
          LanguagePro <span className="text-[var(--color-primary)]">AI</span>
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
                className={`flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors ${
                  isActive
                    ? "bg-[var(--color-primary)]/10 text-[var(--color-primary)]"
                    : "text-[var(--color-muted-fg)] hover:bg-white/5 hover:text-[var(--color-fg)]"
                }`}
              >
                <item.icon className={`h-5 w-5 ${isActive ? "text-[var(--color-primary)]" : ""}`} />
                {item.label}
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
