"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { RefreshCw } from "lucide-react";
import { RoadmapSetupForm, type RoadmapFormInitial } from "./RoadmapSetupForm";

export function RoadmapRegenerateButton({ initial }: { initial: RoadmapFormInitial }) {
  const t = useTranslations("Roadmap");
  const [open, setOpen] = useState(false);

  if (open) {
    return (
      <div className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-black/40 px-4 py-10 backdrop-blur-sm">
        <div className="relative w-full max-w-2xl rounded-3xl bg-[var(--color-bg)] shadow-2xl">
          <RoadmapSetupForm mode="regenerate" initial={initial} onCancel={() => setOpen(false)} />
        </div>
      </div>
    );
  }

  return (
    <button
      type="button"
      onClick={() => setOpen(true)}
      className="inline-flex items-center gap-2 rounded-2xl border border-[var(--color-border)] bg-white/5 px-4 py-2 text-sm font-semibold transition-all hover:bg-white/10"
    >
      <RefreshCw className="h-4 w-4" />
      {t("regenerate")}
    </button>
  );
}
