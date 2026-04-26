import "@languagepro/ui/styles";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "LanguagePro AI — AI-powered IELTS & CEFR assessment",
  description:
    "Sun'iy intellekt yordamida xorijiy tilini bilish darajasini onlayn aniqlang. IELTS va CEFR formatida adaptiv test, AI baholash va tushunarli fikr-mulohaza.",
  metadataBase: new URL("https://aiexam.uz"),
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="uz" suppressHydrationWarning>
      <body className="bg-[var(--color-bg)] text-[var(--color-fg)] antialiased">
        {children}
      </body>
    </html>
  );
}
