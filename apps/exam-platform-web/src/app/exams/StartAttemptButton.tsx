"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { ApiError, api } from "@/lib/api";

export function StartAttemptButton({ blueprintCode }: { blueprintCode: string }) {
  const router = useRouter();
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  return (
    <div className="flex flex-col items-end gap-2">
      <button
        type="button"
        disabled={pending}
        onClick={async () => {
          setError(null);
          setPending(true);
          try {
            const r = await api.exam.startAttempt(blueprintCode);
            // Cache the first item so ExamRunner can render it immediately on the next page.
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
        className="rounded bg-[var(--color-primary)] px-4 py-2 text-sm font-medium text-[var(--color-primary-fg)] disabled:opacity-50"
      >
        {pending ? "Boshlanmoqda…" : "Boshlash"}
      </button>
      {error && <p className="text-xs text-red-600">{error}</p>}
    </div>
  );
}
