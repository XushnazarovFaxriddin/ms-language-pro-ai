import { useTranslations } from "next-intl";
import { Info } from "lucide-react";

export function DemoPageBanner() {
  const t = useTranslations("Dashboard");

  return (
    <div className="mb-8 flex items-start gap-3 rounded-xl border border-blue-500/20 bg-blue-500/10 p-4 text-blue-600 dark:text-blue-400">
      <Info className="mt-0.5 h-5 w-5 flex-shrink-0" />
      <div>
        <h3 className="font-semibold">{t("futurePlan")}</h3>
        <p className="mt-1 text-sm opacity-90">{t("demoDisclaimer")}</p>
      </div>
    </div>
  );
}
