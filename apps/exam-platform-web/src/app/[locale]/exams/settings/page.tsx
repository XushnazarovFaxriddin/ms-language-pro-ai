import { getTranslations } from "next-intl/server";
import { DemoPageBanner } from "@/components/DemoPageBanner";

export default async function SettingsPage() {
  const tNav = await getTranslations("Dashboard.nav");

  return (
    <div className="mx-auto max-w-5xl space-y-8">
      <div className="mb-8 border-b border-[var(--color-border)] pb-6">
        <h1 className="text-3xl font-extrabold tracking-tight">{tNav("settings")}</h1>
        <p className="mt-2 text-[var(--color-muted-fg)]">
          Shaxsiy profilingiz va tizim sozlamalarini boshqaring.
        </p>
      </div>

      <DemoPageBanner />

      <div className="max-w-2xl rounded-2xl border border-[var(--color-border)] bg-[var(--color-bg)] p-6 shadow-sm">
        <form className="space-y-6">
          <div>
            <label className="block text-sm font-medium mb-2">Ism va Familiya</label>
            <input type="text" disabled defaultValue="Demo Talaba" className="w-full rounded-md border border-[var(--color-border)] bg-black/5 px-3 py-2 text-sm opacity-50 dark:bg-white/5" />
          </div>
          <div>
            <label className="block text-sm font-medium mb-2">Email</label>
            <input type="email" disabled defaultValue="student@aiexam.uz" className="w-full rounded-md border border-[var(--color-border)] bg-black/5 px-3 py-2 text-sm opacity-50 dark:bg-white/5" />
          </div>
          <hr className="border-[var(--color-border)]" />
          <div>
            <label className="block text-sm font-medium mb-2">Tizim Tili</label>
            <select disabled className="w-full rounded-md border border-[var(--color-border)] bg-black/5 px-3 py-2 text-sm opacity-50 dark:bg-white/5">
              <option>O'zbekcha</option>
            </select>
          </div>
          <button type="button" disabled className="rounded-md bg-[var(--color-primary)] px-4 py-2 text-sm text-white opacity-50">
            Saqlash
          </button>
        </form>
      </div>
    </div>
  );
}
