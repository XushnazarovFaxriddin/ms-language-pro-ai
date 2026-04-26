import "@languagepro/ui/styles";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "LanguagePro AI — Imtihon platformasi",
  description: "IELTS va CEFR onlayn imtihon platformasi",
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
