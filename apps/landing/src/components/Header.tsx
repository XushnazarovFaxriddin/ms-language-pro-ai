import { Link } from "@/i18n/routing";
import { useTranslations } from "next-intl";
import { Globe, User, Sparkles } from "lucide-react";

export function Header() {
  const t = useTranslations("Common");

  return (
    <header className="fixed top-0 z-50 w-full px-6 py-4">
      <div className="mx-auto flex h-16 max-w-7xl items-center justify-between rounded-2xl border border-white/10 bg-black/40 px-6 backdrop-blur-xl shadow-2xl">
        <div className="flex items-center gap-8">
          <Link href="/" className="flex items-center gap-2.5 group">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br from-blue-500 to-indigo-600 text-white shadow-lg shadow-blue-500/20 group-hover:scale-105 transition-transform">
              <Sparkles className="h-5 w-5" />
            </div>
            <span className="text-xl font-black tracking-tight text-white">
              LanguagePro <span className="text-blue-400">AI</span>
            </span>
          </Link>
          
          <nav className="hidden md:flex items-center gap-8 text-sm font-semibold text-slate-300">
            <Link href="/pricing" className="hover:text-white transition-colors relative group">
              Ta'riflar
              <span className="absolute -bottom-1 left-0 h-0.5 w-0 bg-blue-500 transition-all group-hover:w-full" />
            </Link>
            <Link href="#" className="hover:text-white transition-colors relative group">
              Imkoniyatlar
              <span className="absolute -bottom-1 left-0 h-0.5 w-0 bg-blue-500 transition-all group-hover:w-full" />
            </Link>
          </nav>
        </div>

        <div className="flex items-center gap-6">
          <div className="hidden sm:flex items-center gap-3 rounded-full bg-white/5 px-3 py-1.5 border border-white/10 text-xs font-bold text-slate-400">
            <Globe className="h-3.5 w-3.5" />
            <Link href="/uz" className="hover:text-blue-400 transition-colors uppercase">UZ</Link>
            <span className="text-white/20">|</span>
            <Link href="/en" className="hover:text-blue-400 transition-colors uppercase">EN</Link>
          </div>
          
          <div className="flex items-center gap-3">
            <a
              href="http://app.localhost/login"
              className="hidden lg:flex items-center gap-2 text-sm font-bold text-slate-300 hover:text-white transition-colors"
            >
              <User className="h-4 w-4" />
              {t("actions.login")}
            </a>
            <a
              href="http://app.localhost/login"
              className="group relative flex items-center justify-center overflow-hidden rounded-xl bg-blue-600 px-6 py-2.5 text-sm font-bold text-white transition-all hover:bg-blue-500 hover:shadow-[0_0_20px_rgba(37,99,235,0.4)]"
            >
              <span className="relative z-10">{t("actions.register")}</span>
            </a>
          </div>
        </div>
      </div>
    </header>
  );
}
