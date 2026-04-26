import { getTranslations } from "next-intl/server";
import { DemoPageBanner } from "@/components/DemoPageBanner";
import { TrendingUp, BarChart2 } from "lucide-react";

export default async function AnalyticsPage() {
  const tNav = await getTranslations("Dashboard.nav");

  return (
    <div className="mx-auto max-w-5xl space-y-8">
      <div className="mb-8 border-b border-[var(--color-border)] pb-6">
        <h1 className="text-3xl font-extrabold tracking-tight">{tNav("analytics")}</h1>
        <p className="mt-2 text-[var(--color-muted-fg)]">
          Sizning o'sish dinamikangiz va kuchsiz tomonlaringiz tahlili.
        </p>
      </div>

      <DemoPageBanner />

      <div className="grid gap-6 lg:grid-cols-2">
        <div className="flex flex-col items-center justify-center rounded-2xl border border-[var(--color-border)] bg-white/5 p-12 shadow-sm dark:bg-black/20 text-center">
          <TrendingUp className="mb-4 h-12 w-12 text-[var(--color-primary)] opacity-80" />
          <h3 className="text-lg font-medium">Baho o'sish dinamikasi</h3>
          <p className="mt-2 text-sm text-[var(--color-muted-fg)]">Oy davomida Writing va Speaking ko'nikmalari 15% ga yaxshilangan.</p>
        </div>
        <div className="flex flex-col items-center justify-center rounded-2xl border border-[var(--color-border)] bg-white/5 p-12 shadow-sm dark:bg-black/20 text-center">
          <BarChart2 className="mb-4 h-12 w-12 text-blue-500 opacity-80" />
          <h3 className="text-lg font-medium">Kuchli va kuchsiz tomonlar</h3>
          <p className="mt-2 text-sm text-[var(--color-muted-fg)]">Grammar Range - B1, Lexical Resource - B2.</p>
        </div>
      </div>
    </div>
  );
}
