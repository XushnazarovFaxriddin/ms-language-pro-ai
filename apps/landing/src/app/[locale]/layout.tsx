import "@languagepro/ui/styles";
import type { Metadata } from "next";
import { NextIntlClientProvider } from "next-intl";
import { getMessages } from "next-intl/server";

export const metadata: Metadata = {
  title: "LanguagePro AI — AI-powered IELTS & CEFR assessment",
  description:
    "Sun'iy intellekt yordamida xorijiy tilini bilish darajasini onlayn aniqlang. IELTS va CEFR formatida adaptiv test, AI baholash va tushunarli fikr-mulohaza.",
  metadataBase: new URL("https://aiexam.uz"),
};

export default async function RootLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  const messages = await getMessages();

  return (
    <html lang={locale} suppressHydrationWarning>
      <body className="bg-[var(--color-bg)] text-[var(--color-fg)] antialiased" suppressHydrationWarning>
        <NextIntlClientProvider messages={messages}>
          {children}
        </NextIntlClientProvider>
      </body>
    </html>
  );
}
