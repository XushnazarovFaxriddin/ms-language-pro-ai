"use client";

import { useState } from "react";
import { useRouter } from "@/i18n/routing";
import { useTranslations } from "next-intl";
import { Loader2, Play } from "lucide-react";
import { ApiError, api } from "@/lib/api";

export function StartAttemptButton({ blueprintCode }: { blueprintCode: string }) {
  const router = useRouter();
  const t = useTranslations("Dashboard");
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  return (
    <div className="flex flex-col items-end gap-1.5">
      <button
        type="button"
        disabled={pending}
        onClick={async () => {
          setError(null);
          setPending(true);
          try {
            const r = await api.exam.startAttempt(blueprintCode);
            if (typeof window !== "undefined" && r.current_item) {
              sessionStorage.setItem(
                `first-item:${r.attempt_id}`,
                JSON.stringify(r.current_item),
              );
            }
            router.push(`/attempt/${r.attempt_id}`);
          } catch (err) {
            setError(err instanceof ApiError ? err.detail : String(err));
            setPending(false);
          }
        }}
        className="group inline-flex items-center gap-2 rounded-full bg-[var(--color-primary)] px-4 py-2 text-sm font-semibold text-[var(--color-primary-fg)] shadow-sm transition-all hover:opacity-90 hover:shadow-md disabled:opacity-50"
      >
        {pending ? (
          <Loader2 className="h-4 w-4 animate-spin" />
        ) : (
          <Play className="h-4 w-4 transition-transform group-hover:translate-x-0.5" />
        )}
        {pending ? t("starting") : t("startAttempt")}
      </button>
      {error && <p className="max-w-[14rem] text-right text-[10px] text-red-500">{error}</p>}
    </div>
  );
}
