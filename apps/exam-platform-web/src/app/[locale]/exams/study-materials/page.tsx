import { getTranslations } from "next-intl/server";
import { DemoPageBanner } from "@/components/DemoPageBanner";
import { BookOpen, Video, FileText } from "lucide-react";

export default async function StudyMaterialsPage() {
  const tNav = await getTranslations("Dashboard.nav");

  return (
    <div className="mx-auto max-w-5xl space-y-8">
      <div className="mb-8 border-b border-[var(--color-border)] pb-6">
        <h1 className="text-3xl font-extrabold tracking-tight">{tNav("studyMaterials")}</h1>
        <p className="mt-2 text-[var(--color-muted-fg)]">
          Kuchsiz tomonlaringizni kuchaytirish uchun maxsus materiallar.
        </p>
      </div>

      <DemoPageBanner />

      <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
        <div className="flex flex-col overflow-hidden rounded-2xl border border-[var(--color-border)] bg-[var(--color-bg)] transition-all hover:shadow-md">
          <div className="h-32 bg-gradient-to-br from-blue-500/20 to-purple-500/20 flex items-center justify-center">
            <Video className="h-10 w-10 text-blue-500" />
          </div>
          <div className="p-4">
            <h3 className="font-bold">IELTS Speaking Task 2</h3>
            <p className="text-sm text-[var(--color-muted-fg)] mt-1">15 daqiqalik masterklass</p>
          </div>
        </div>
        <div className="flex flex-col overflow-hidden rounded-2xl border border-[var(--color-border)] bg-[var(--color-bg)] transition-all hover:shadow-md">
          <div className="h-32 bg-gradient-to-br from-green-500/20 to-teal-500/20 flex items-center justify-center">
            <FileText className="h-10 w-10 text-green-500" />
          </div>
          <div className="p-4">
            <h3 className="font-bold">Grammar Focus: B2</h3>
            <p className="text-sm text-[var(--color-muted-fg)] mt-1">PDF qo'llanma va mashqlar</p>
          </div>
        </div>
        <div className="flex flex-col overflow-hidden rounded-2xl border border-[var(--color-border)] bg-[var(--color-bg)] transition-all hover:shadow-md">
          <div className="h-32 bg-gradient-to-br from-orange-500/20 to-red-500/20 flex items-center justify-center">
            <BookOpen className="h-10 w-10 text-orange-500" />
          </div>
          <div className="p-4">
            <h3 className="font-bold">Vocabulary: Academic</h3>
            <p className="text-sm text-[var(--color-muted-fg)] mt-1">100 ta eng kerakli so'zlar</p>
          </div>
        </div>
      </div>
    </div>
  );
}
