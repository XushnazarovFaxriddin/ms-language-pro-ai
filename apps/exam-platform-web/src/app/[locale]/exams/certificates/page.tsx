import { getTranslations } from "next-intl/server";
import { DemoPageBanner } from "@/components/DemoPageBanner";
import { Award, Download } from "lucide-react";

export default async function CertificatesPage() {
  const tNav = await getTranslations("Dashboard.nav");

  return (
    <div className="mx-auto max-w-6xl space-y-10">
      <div className="mb-8 border-b border-[var(--color-border)]/50 pb-6">
        <h1 className="text-3xl font-extrabold tracking-tight sm:text-4xl">{tNav("certificates")}</h1>
        <p className="mt-2 text-lg text-[var(--color-muted-fg)]">
          Sizning rasmiy elektron sertifikatlaringiz va yutuqlaringiz.
        </p>
      </div>

      <DemoPageBanner />

      <div className="grid gap-8 sm:grid-cols-2 lg:grid-cols-3">
        {/* Mock Data */}
        {[1, 2, 3].map((i) => (
          <div key={i} className="group flex flex-col overflow-hidden rounded-3xl border border-[var(--color-border)]/50 bg-white/5 shadow-lg backdrop-blur-xl transition-all duration-300 hover:-translate-y-2 hover:shadow-2xl hover:border-[var(--color-primary)]/40 dark:bg-black/20">
            <div className="relative flex-1 p-8">
              <div className="absolute top-0 right-0 p-6 opacity-10 transition-opacity duration-300 group-hover:opacity-20">
                <Award className="h-24 w-24 text-[var(--color-primary)]" />
              </div>
              <div className="relative z-10">
                <div className="mb-6 flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-br from-amber-400/20 to-orange-500/20 text-amber-500 shadow-inner group-hover:scale-110 transition-transform duration-300">
                  <Award className="h-7 w-7" />
                </div>
                <h3 className="mb-2 text-2xl font-black tracking-tight">{i === 1 ? 'CEFR B2 Level' : i === 2 ? 'IELTS Academic 7.0' : 'CEFR C1 Level'}</h3>
                <p className="text-sm font-medium text-[var(--color-muted-fg)]">Berilgan sana: {10 + i} May 2026</p>
                <div className="mt-6 flex items-center justify-between border-t border-[var(--color-border)]/50 pt-6">
                  <span className="inline-flex items-center gap-1.5 rounded-full border border-green-500/20 bg-green-500/10 px-3 py-1 text-xs font-bold text-green-600 dark:text-green-400 uppercase tracking-wider">
                    Tasdiqlangan
                  </span>
                  <span className="font-mono text-xs font-semibold text-[var(--color-muted-fg)]">CERT-10{i}834</span>
                </div>
              </div>
            </div>
            <div className="border-t border-[var(--color-border)]/50 bg-black/5 px-8 py-4 dark:bg-white/5">
              <button className="flex w-full items-center justify-center gap-2 text-sm font-bold text-[var(--color-primary)] hover:text-blue-500 transition-colors">
                <Download className="h-4 w-4" /> PDF yuklab olish
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
