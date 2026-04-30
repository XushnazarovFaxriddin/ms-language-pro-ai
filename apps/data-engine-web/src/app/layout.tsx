import "@languagepro/ui/styles";
import type { Metadata } from "next";
import { cookies } from "next/headers";
import { adminLocale } from "@/lib/admin-i18n";

export const metadata: Metadata = {
  title: "LanguagePro AI — Content Studio",
  description: "Admin panel for question generation, validation, and IRT calibration",
};

import { ThemeProvider } from "@/components/ThemeProvider";

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  const cookieStore = await cookies();
  const locale = adminLocale(cookieStore.get("admin_locale")?.value);

  return (
    <html lang={locale} suppressHydrationWarning>
      <body className="bg-white dark:bg-[#050505] text-slate-900 dark:text-slate-100 antialiased min-h-screen transition-colors duration-300" suppressHydrationWarning>
        <ThemeProvider attribute="class" defaultTheme="system" enableSystem>
          {children}
        </ThemeProvider>
      </body>
    </html>
  );
}
