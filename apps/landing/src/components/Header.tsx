import { Link } from "@/i18n/routing";
import { useTranslations } from "next-intl";

export function Header() {
  const t = useTranslations("Common");

  return (
    <header className="sticky top-0 z-50 w-full border-b border-[var(--color-border)] bg-[var(--color-bg)]/80 backdrop-blur-md">
      <div className="container mx-auto flex h-16 max-w-7xl items-center justify-between px-6">
        <div className="flex items-center gap-6">
          <Link href="/" className="flex items-center gap-2">
            <span className="text-xl font-bold tracking-tight">
              LanguagePro <span className="text-[var(--color-primary)]">AI</span>
            </span>
          </Link>
          <nav className="hidden md:flex items-center gap-6 text-sm font-medium text-[var(--color-muted-fg)]">
            <Link href="/pricing" className="hover:text-[var(--color-fg)] transition-colors">
              Ta'riflar
            </Link>
          </nav>
        </div>

        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2 text-sm text-[var(--color-muted-fg)]">
            <Link href="/uz" className="hover:text-[var(--color-fg)] transition-colors">UZ</Link>
            <span>/</span>
            <Link href="/en" className="hover:text-[var(--color-fg)] transition-colors">EN</Link>
          </div>
          <a
            href="http://app.localhost/login"
            className="text-sm font-medium text-[var(--color-muted-fg)] hover:text-[var(--color-fg)] transition-colors"
          >
            {t("actions.login")}
          </a>
          <a
            href="http://app.localhost/login"
            className="rounded-[var(--radius-md)] bg-[var(--color-primary)] px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-[var(--color-primary-hover)] shadow-sm"
          >
            {t("actions.register")}
          </a>
        </div>
      </div>
    </header>
  );
}
