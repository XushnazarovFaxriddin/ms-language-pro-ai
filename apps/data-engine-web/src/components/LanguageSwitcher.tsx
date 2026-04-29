"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { Languages, Loader2 } from "lucide-react";
import { api, type User } from "@/lib/api";
import type { AdminCopy } from "@/lib/admin-i18n";

type Locale = User["locale"];

const COOKIE_MAX_AGE_SECONDS = 60 * 60 * 24 * 365;

export function LanguageSwitcher({
  locale,
  copy,
}: {
  locale: Locale;
  copy: AdminCopy["shell"];
}) {
  const router = useRouter();
  const [pendingLocale, setPendingLocale] = useState<Locale | null>(null);

  const changeLocale = async (nextLocale: Locale) => {
    if (nextLocale === locale || pendingLocale) return;
    setPendingLocale(nextLocale);
    try {
      await api.auth.updateMe({ locale: nextLocale });
      document.cookie = `admin_locale=${nextLocale}; Path=/; Max-Age=${COOKIE_MAX_AGE_SECONDS}; SameSite=Lax`;
      document.documentElement.lang = nextLocale;
      router.refresh();
    } finally {
      setPendingLocale(null);
    }
  };

  return (
    <div
      className="flex items-center gap-1 rounded-lg border border-slate-200 bg-slate-100 p-1 dark:border-slate-800/60 dark:bg-white/5"
      aria-label={copy.language}
      title={copy.language}
    >
      <Languages className="ml-1 h-4 w-4 text-slate-500 dark:text-slate-400" />
      {(["uz", "en"] as const).map((option) => {
        const isActive = locale === option;
        const isPending = pendingLocale === option;
        return (
          <button
            key={option}
            type="button"
            onClick={() => changeLocale(option)}
            disabled={Boolean(pendingLocale)}
            className={`flex h-7 min-w-9 items-center justify-center rounded-md px-2 text-xs font-black transition-colors ${
              isActive
                ? "bg-white text-slate-900 shadow-sm dark:bg-slate-800 dark:text-white"
                : "text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white"
            } disabled:cursor-not-allowed disabled:opacity-60`}
            aria-label={`${copy.switchLanguage}: ${option === "uz" ? copy.languageUz : copy.languageEn}`}
          >
            {isPending ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : option.toUpperCase()}
          </button>
        );
      })}
    </div>
  );
}
