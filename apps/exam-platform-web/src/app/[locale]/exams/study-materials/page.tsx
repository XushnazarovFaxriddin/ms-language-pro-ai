import { getTranslations } from "next-intl/server";
import { DemoPageBanner } from "@/components/DemoPageBanner";
import { BookOpen, Video, FileText } from "lucide-react";

export default async function StudyMaterialsPage() {
  const tNav = await getTranslations("Dashboard.nav");

  return (
    <div className="mx-auto max-w-6xl space-y-10">
      <div className="mb-8 border-b border-[var(--color-border)]/50 pb-6">
        <h1 className="text-3xl font-extrabold tracking-tight sm:text-4xl">{tNav("studyMaterials")}</h1>
        <p className="mt-2 text-lg text-[var(--color-muted-fg)]">
          Kuchsiz tomonlaringizni kuchaytirish uchun maxsus materiallar.
        </p>
      </div>

      <DemoPageBanner />

      <div className="grid gap-8 sm:grid-cols-2 lg:grid-cols-3">
        {/* Card 1 */}
        <div className="group flex flex-col overflow-hidden rounded-3xl border border-[var(--color-border)]/50 bg-white/5 backdrop-blur-xl transition-all duration-300 hover:-translate-y-2 hover:shadow-2xl hover:border-blue-500/30 dark:bg-black/20">
          <div className="relative h-40 bg-gradient-to-br from-blue-600/30 to-indigo-600/30 flex items-center justify-center overflow-hidden">
            <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/cubes.png')] opacity-10 mix-blend-overlay"></div>
            <Video className="h-14 w-14 text-blue-400 group-hover:scale-110 transition-transform duration-500 relative z-10 drop-shadow-md" />
          </div>
          <div className="p-6">
            <h3 className="text-xl font-bold tracking-tight">IELTS Speaking Task 2</h3>
            <p className="text-sm font-medium text-[var(--color-muted-fg)] mt-2">15 daqiqalik masterklass. Band 7.0+ uchun strategiyalar.</p>
          </div>
        </div>
        
        {/* Card 2 */}
        <div className="group flex flex-col overflow-hidden rounded-3xl border border-[var(--color-border)]/50 bg-white/5 backdrop-blur-xl transition-all duration-300 hover:-translate-y-2 hover:shadow-2xl hover:border-green-500/30 dark:bg-black/20">
          <div className="relative h-40 bg-gradient-to-br from-emerald-600/30 to-teal-600/30 flex items-center justify-center overflow-hidden">
            <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/cubes.png')] opacity-10 mix-blend-overlay"></div>
            <FileText className="h-14 w-14 text-emerald-400 group-hover:scale-110 transition-transform duration-500 relative z-10 drop-shadow-md" />
          </div>
          <div className="p-6">
            <h3 className="text-xl font-bold tracking-tight">Grammar Focus: B2</h3>
            <p className="text-sm font-medium text-[var(--color-muted-fg)] mt-2">PDF qo'llanma va qoidalar toplami. Interfaol mashqlar.</p>
          </div>
        </div>

        {/* Card 3 */}
        <div className="group flex flex-col overflow-hidden rounded-3xl border border-[var(--color-border)]/50 bg-white/5 backdrop-blur-xl transition-all duration-300 hover:-translate-y-2 hover:shadow-2xl hover:border-orange-500/30 dark:bg-black/20">
          <div className="relative h-40 bg-gradient-to-br from-orange-600/30 to-rose-600/30 flex items-center justify-center overflow-hidden">
            <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/cubes.png')] opacity-10 mix-blend-overlay"></div>
            <BookOpen className="h-14 w-14 text-orange-400 group-hover:scale-110 transition-transform duration-500 relative z-10 drop-shadow-md" />
          </div>
          <div className="p-6">
            <h3 className="text-xl font-bold tracking-tight">Vocabulary: Academic</h3>
            <p className="text-sm font-medium text-[var(--color-muted-fg)] mt-2">100 ta eng kerakli akademik so'zlar ro'yxati.</p>
          </div>
        </div>
      </div>
    </div>
  );
}
