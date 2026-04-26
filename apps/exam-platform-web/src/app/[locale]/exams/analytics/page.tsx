import { getTranslations } from "next-intl/server";
import { DemoPageBanner } from "@/components/DemoPageBanner";
import { TrendingUp, BarChart2 } from "lucide-react";

export default async function AnalyticsPage() {
  const tNav = await getTranslations("Dashboard.nav");
  const tPage = await getTranslations("Dashboard.analyticsPage");

  return (
    <div className="mx-auto max-w-6xl space-y-10">
      <div className="mb-8 border-b border-[var(--color-border)]/50 pb-6">
        <h1 className="text-3xl font-extrabold tracking-tight sm:text-4xl">{tPage("title")}</h1>
        <p className="mt-2 text-lg text-[var(--color-muted-fg)]">
          {tPage("description")}
        </p>
      </div>

      <DemoPageBanner />

      <div className="grid gap-8 lg:grid-cols-2">
        {/* Growth Card */}
        <div className="group relative overflow-hidden rounded-3xl border border-[var(--color-border)]/50 bg-white/5 p-12 shadow-lg backdrop-blur-xl dark:bg-black/20 transition-all hover:shadow-2xl hover:border-blue-500/30">
          <div className="absolute -right-20 -top-20 h-64 w-64 rounded-full bg-blue-500/10 blur-3xl transition-opacity duration-500 group-hover:opacity-100 opacity-50" />
          <div className="relative z-10 flex flex-col items-center text-center">
            <div className="mb-6 flex h-20 w-20 items-center justify-center rounded-2xl bg-gradient-to-br from-blue-500/20 to-indigo-600/20 text-blue-500 shadow-inner group-hover:scale-110 transition-transform duration-500">
              <TrendingUp className="h-10 w-10" />
            </div>
            <h3 className="text-2xl font-bold tracking-tight">{tPage("growthTitle")}</h3>
            <p className="mt-3 text-[var(--color-muted-fg)]" dangerouslySetInnerHTML={{ __html: tPage("growthDesc").replace('<growth>', '<span class="text-blue-500 font-bold">').replace('</growth>', '</span>') }} />
          </div>
        </div>

        {/* Strengths Card */}
        <div className="group relative overflow-hidden rounded-3xl border border-[var(--color-border)]/50 bg-white/5 p-12 shadow-lg backdrop-blur-xl dark:bg-black/20 transition-all hover:shadow-2xl hover:border-purple-500/30">
          <div className="absolute -left-20 -bottom-20 h-64 w-64 rounded-full bg-purple-500/10 blur-3xl transition-opacity duration-500 group-hover:opacity-100 opacity-50" />
          <div className="relative z-10 flex flex-col items-center text-center">
            <div className="mb-6 flex h-20 w-20 items-center justify-center rounded-2xl bg-gradient-to-br from-purple-500/20 to-fuchsia-600/20 text-purple-500 shadow-inner group-hover:scale-110 transition-transform duration-500">
              <BarChart2 className="h-10 w-10" />
            </div>
            <h3 className="text-2xl font-bold tracking-tight">{tPage("strengthTitle")}</h3>
            <p className="mt-3 text-[var(--color-muted-fg)]" dangerouslySetInnerHTML={{ __html: tPage("strengthDesc").replace(/<level>/g, '<span class="text-purple-500 font-bold">').replace(/<\/level>/g, '</span>') }} />
          </div>
        </div>
      </div>
    </div>
  );
}
