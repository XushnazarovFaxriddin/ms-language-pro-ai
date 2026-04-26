import "@languagepro/ui/styles";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "LanguagePro AI — Content Studio",
  description: "Admin panel for question generation, validation, and IRT calibration",
};

import { ThemeProvider } from "@/components/ThemeProvider";

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="uz" suppressHydrationWarning>
      <body className="bg-white dark:bg-[#050505] text-slate-900 dark:text-slate-100 antialiased min-h-screen transition-colors duration-300" suppressHydrationWarning>
        <ThemeProvider attribute="class" defaultTheme="system" enableSystem>
          {children}
        </ThemeProvider>
      </body>
    </html>
  );
}
