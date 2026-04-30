import { useTranslations } from "next-intl";

export function Footer() {
  const t = useTranslations("Landing.footer");

  return (
    <footer className="border-t border-[var(--color-border)] bg-[var(--color-bg)] py-12">
      <div className="container mx-auto max-w-7xl px-6 flex flex-col md:flex-row justify-between items-center gap-6 text-sm text-[var(--color-muted-fg)]">
        <p>{t("copyright")}</p>
        <div className="flex gap-6">
          <a href="/legal/terms" className="hover:text-[var(--color-fg)] transition-colors">Terms of Service</a>
          <a href="/legal/privacy" className="hover:text-[var(--color-fg)] transition-colors">Privacy Policy</a>
        </div>
      </div>
    </footer>
  );
}
