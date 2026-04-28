import { requireAdmin, getCookieHeader } from "@/lib/auth-server";
import { AdminShell } from "@/components/AdminShell";
import { getAdminCopy } from "@/lib/admin-i18n";
import { api } from "@/lib/api";
import { BookOpen } from "lucide-react";
import { PracticeCatalogueTabs } from "@/components/PracticeCatalogueTabs";

export default async function PracticeCataloguePage() {
  const user = await requireAdmin("/practice-catalogue");
  const ck = await getCookieHeader();
  const copy = getAdminCopy(user.locale);
  
  // Fetch all catalogue data concurrently
  const [errorTaxonomy, drills, conversationTopics] = await Promise.all([
    api.practiceCatalogue.errorTaxonomy.list(ck).catch(() => []),
    api.practiceCatalogue.drills.list(ck).catch(() => []),
    api.practiceCatalogue.conversationTopics.list(ck).catch(() => []),
  ]);

  return (
    <AdminShell user={user}>
      <div className="p-6 sm:p-10">
        <div className="flex flex-col gap-6 sm:flex-row sm:items-center sm:justify-between mb-10">
          <div>
            <h1 className="text-3xl font-extrabold tracking-tight text-slate-900 dark:text-white flex items-center gap-3">
              <BookOpen className="h-8 w-8 text-emerald-500" />
              {copy.catalogue.pageTitle}
            </h1>
            <p className="mt-2 text-slate-600 dark:text-slate-400">
              {copy.catalogue.pageDescription}
            </p>
          </div>
        </div>

        <PracticeCatalogueTabs 
          initialTaxonomy={errorTaxonomy} 
          initialDrills={drills} 
          initialTopics={conversationTopics} 
          copy={copy.catalogue}
        />
      </div>
    </AdminShell>
  );
}
