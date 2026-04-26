import { getTranslations } from "next-intl/server";
import { DemoPageBanner } from "@/components/DemoPageBanner";
import { Award, Download } from "lucide-react";

export default async function CertificatesPage() {
  const tNav = await getTranslations("Dashboard.nav");

  return (
    <div className="mx-auto max-w-5xl space-y-8">
      <div className="mb-8 border-b border-[var(--color-border)] pb-6">
        <h1 className="text-3xl font-extrabold tracking-tight">{tNav("certificates")}</h1>
        <p className="mt-2 text-[var(--color-muted-fg)]">
          Sizning rasmiy elektron sertifikatlaringiz.
        </p>
      </div>

      <DemoPageBanner />

      <div className="grid gap-6 sm:grid-cols-2">
        {/* Mock Data */}
        {[1, 2].map((i) => (
          <div key={i} className="flex flex-col overflow-hidden rounded-2xl border border-[var(--color-border)] bg-white/5 shadow-sm transition-all hover:shadow-md dark:bg-black/20">
            <div className="flex-1 p-6">
              <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-xl bg-purple-500/10 text-purple-500">
                <Award className="h-6 w-6" />
              </div>
              <h3 className="mb-1 text-xl font-bold">CEFR B2 Level</h3>
              <p className="text-sm text-[var(--color-muted-fg)]">Berilgan sana: 12 Aprel 2026</p>
              <div className="mt-4 flex items-center justify-between border-t border-[var(--color-border)]/50 pt-4">
                <span className="text-sm font-medium">Baho: <span className="text-green-500">O'tdi</span></span>
                <span className="font-mono text-xs text-[var(--color-muted-fg)]">ID: CERT-10{i}834</span>
              </div>
            </div>
            <div className="border-t border-[var(--color-border)] bg-black/5 px-6 py-3 dark:bg-white/5">
              <button className="flex w-full items-center justify-center gap-2 text-sm font-medium text-[var(--color-primary)] hover:underline">
                <Download className="h-4 w-4" /> PDF yuklab olish
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
