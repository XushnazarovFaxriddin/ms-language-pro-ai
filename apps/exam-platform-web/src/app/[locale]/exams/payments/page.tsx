import { getTranslations } from "next-intl/server";
import { DemoPageBanner } from "@/components/DemoPageBanner";
import { CreditCard, CheckCircle2 } from "lucide-react";

export default async function PaymentsPage() {
  const tNav = await getTranslations("Dashboard.nav");

  return (
    <div className="mx-auto max-w-5xl space-y-8">
      <div className="mb-8 border-b border-[var(--color-border)] pb-6">
        <h1 className="text-3xl font-extrabold tracking-tight">{tNav("payments")}</h1>
        <p className="mt-2 text-[var(--color-muted-fg)]">
          Ta'riflar, to'lovlar tarixi va kvitansiyalar.
        </p>
      </div>

      <DemoPageBanner />

      <div className="rounded-2xl border border-[var(--color-primary)]/30 bg-[var(--color-primary)]/5 p-6 mb-8">
        <div className="flex items-center gap-4">
          <div className="flex h-12 w-12 items-center justify-center rounded-full bg-[var(--color-primary)] text-white">
            <CreditCard className="h-6 w-6" />
          </div>
          <div>
            <h3 className="text-lg font-bold">PRO Ta'rifi (Aktiv)</h3>
            <p className="text-sm text-[var(--color-muted-fg)]">Sizda cheksiz imtihonlar mavjud. Keyingi to'lov: 12 May 2026</p>
          </div>
        </div>
      </div>

      <h3 className="text-lg font-semibold mb-4">To'lovlar tarixi</h3>
      <div className="overflow-hidden rounded-xl border border-[var(--color-border)] bg-[var(--color-bg)]">
        <table className="w-full text-left text-sm">
          <thead className="bg-black/5 dark:bg-white/5 border-b border-[var(--color-border)]">
            <tr>
              <th className="px-6 py-4 font-medium">Sana</th>
              <th className="px-6 py-4 font-medium">Summa</th>
              <th className="px-6 py-4 font-medium">Holati</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-[var(--color-border)]">
            <tr>
              <td className="px-6 py-4">12 Apr 2026</td>
              <td className="px-6 py-4 font-medium">119,000 UZS</td>
              <td className="px-6 py-4 text-green-500 flex items-center gap-2"><CheckCircle2 className="h-4 w-4"/> To'langan</td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  );
}
