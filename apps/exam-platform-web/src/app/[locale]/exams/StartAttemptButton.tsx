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
        className="group inline-flex items-center gap-2 rounded-2xl bg-gradient-to-r from-[var(--color-primary)] to-violet-600 px-5 py-2.5 text-xs font-bold text-white shadow-md shadow-[var(--color-primary)]/10 transition-all duration-300 hover:shadow-lg hover:shadow-[var(--color-primary)]/15 hover:scale-[1.03] active:scale-[0.97] disabled:opacity-50 cursor-pointer"
      >
        {pending ? (
          <Loader2 className="h-3.5 w-3.5 animate-spin" />
        ) : (
          <Play className="h-3.5 w-3.5 fill-current transition-transform group-hover:scale-110" />
        )}
        {pending ? t("starting") : t("startAttempt")}
      </button>
      {error && <p className="max-w-[14rem] text-right text-[10px] font-medium text-red-500">{error}</p>}
    </div>
  );
}
