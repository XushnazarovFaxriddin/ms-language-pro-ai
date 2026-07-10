"use client";

import { Link, useRouter, usePathname } from "@/i18n/routing";
import { useTranslations, useLocale } from "next-intl";
import { Globe, User, Sparkles, Menu, Moon, Sun, Laptop } from "lucide-react";
import { useState, useEffect } from "react";
import { useTheme } from "next-themes";
import { motion } from "framer-motion";

const EXAM_APP_URL = process.env.NEXT_PUBLIC_EXAM_WEB_URL || "https://app.aiexam.uz";

export function Header() {
  const t = useTranslations("Common");
  const locale = useLocale();
  const router = useRouter();
  const pathname = usePathname();
  const { theme, setTheme } = useTheme();
  const [mounted, setMounted] = useState(false);
  const [isMenuOpen, setIsMenuOpen] = useState(false);

  useEffect(() => setMounted(true), []);

  const toggleLocale = (newLocale: "uz" | "en") => {
    router.replace(pathname, { locale: newLocale });
  };

  const loginUrl = `${EXAM_APP_URL}/login`;

  return (
    <header className="fixed top-0 z-50 w-full px-6 py-4">
      <div className="mx-auto flex h-16 max-w-7xl items-center justify-between rounded-2xl border border-black/5 dark:border-white/10 bg-white/40 dark:bg-black/40 px-6 backdrop-blur-xl shadow-2xl">
        <div className="flex items-center gap-8">
          <Link href="/" className="flex items-center gap-2.5 group">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br from-blue-500 to-indigo-600 text-white shadow-lg shadow-blue-500/20 group-hover:scale-105 transition-transform">
              <Sparkles className="h-5 w-5" />
            </div>
            <span className="text-xl font-black tracking-tight text-slate-900 dark:text-white">
              LanguagePro <span className="text-blue-400">AI</span>
            </span>
          </Link>
          
          <nav className="hidden md:flex items-center gap-8 text-sm font-semibold text-slate-600 dark:text-slate-300">
            <Link href="/pricing" className="hover:text-blue-600 dark:hover:text-white transition-colors relative group">
              {t("nav.pricing") || "Ta'riflar"}
              <span className="absolute -bottom-1 left-0 h-0.5 w-0 bg-blue-500 transition-all group-hover:w-full" />
            </Link>
            <Link href="#" className="hover:text-blue-600 dark:hover:text-white transition-colors relative group">
              {t("nav.features") || "Imkoniyatlar"}
              <span className="absolute -bottom-1 left-0 h-0.5 w-0 bg-blue-500 transition-all group-hover:w-full" />
            </Link>
          </nav>
        </div>

        <div className="flex items-center gap-4 sm:gap-6">
          {/* Theme Toggle */}
          <button
            onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
            className="flex h-9 w-9 items-center justify-center rounded-xl border border-black/10 dark:border-white/10 bg-black/5 dark:bg-white/5 text-slate-600 dark:text-slate-400 hover:text-blue-600 dark:hover:text-white transition-all"
          >
            {mounted && (theme === "dark" ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />)}
          </button>

          {/* Locale Switcher */}
          <div className="flex items-center gap-2 rounded-xl bg-black/5 dark:bg-white/5 px-3 py-1.5 border border-black/10 dark:border-white/10 text-[10px] font-black text-slate-500">
            <button 
              onClick={() => toggleLocale("uz")}
              className={`hover:text-blue-400 transition-colors uppercase ${locale === "uz" ? "text-blue-400" : ""}`}
            >
              UZ
            </button>
            <span className="text-black/10 dark:text-white/10">|</span>
            <button 
              onClick={() => toggleLocale("en")}
              className={`hover:text-blue-400 transition-colors uppercase ${locale === "en" ? "text-blue-400" : ""}`}
            >
              EN
            </button>
          </div>
          
          <div className="flex items-center gap-3">
            <a
              href={loginUrl}
              className="hidden lg:flex items-center gap-2 text-sm font-bold text-slate-600 dark:text-slate-300 hover:text-blue-600 dark:hover:text-white transition-colors"
            >
              <User className="h-4 w-4" />
              {t("actions.login")}
            </a>
            <a
              href={loginUrl}
              className="group relative flex items-center justify-center overflow-hidden rounded-xl bg-blue-600 px-6 py-2.5 text-sm font-bold text-white transition-all hover:bg-blue-500 hover:shadow-[0_0_20px_rgba(37,99,235,0.4)]"
            >
              <span className="relative z-10">{t("actions.register")}</span>
            </a>
            <button 
              onClick={() => setIsMenuOpen(!isMenuOpen)}
              className="md:hidden p-2 text-slate-600 dark:text-slate-400 hover:text-blue-600 dark:hover:text-white transition-colors"
            >
              <Menu className="h-6 w-6" />
            </button>
          </div>
        </div>
      </div>

      {/* Mobile Menu Overlay */}
      {isMenuOpen && (
        <motion.div 
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="absolute left-6 right-6 top-24 z-50 rounded-3xl border border-white/10 bg-black/90 p-8 backdrop-blur-3xl md:hidden shadow-2xl"
        >
          <nav className="flex flex-col gap-6 text-xl font-bold">
            <Link href="/pricing" onClick={() => setIsMenuOpen(false)} className="text-white hover:text-blue-400 transition-colors">
              {t("nav.pricing") || "Ta'riflar"}
            </Link>
            <Link href="#" onClick={() => setIsMenuOpen(false)} className="text-white hover:text-blue-400 transition-colors">
              {t("nav.features") || "Imkoniyatlar"}
            </Link>
            <hr className="border-white/10" />
            <a href={loginUrl} className="flex items-center gap-3 text-slate-300">
              <User className="h-5 w-5" />
              {t("actions.login")}
            </a>
            <a href={loginUrl} className="rounded-2xl bg-blue-600 py-4 text-center text-white">
              {t("actions.register")}
            </a>
          </nav>
        </motion.div>
      )}
    </header>
  );
}
