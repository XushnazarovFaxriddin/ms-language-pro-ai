import "@languagepro/ui/styles";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "LanguagePro AI — Content Studio",
  description: "Admin panel for question generation, validation, and IRT calibration",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="uz" suppressHydrationWarning>
      <body className="bg-[var(--color-bg)] text-[var(--color-fg)] antialiased" suppressHydrationWarning>
        {children}
      </body>
    </html>
  );
}
