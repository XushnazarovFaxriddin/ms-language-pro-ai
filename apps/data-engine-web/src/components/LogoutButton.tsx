"use client";

import { useRouter } from "next/navigation";
import { api } from "@/lib/api";

export function LogoutButton({ label }: { label: string }) {
  const router = useRouter();
  return (
    <button
      type="button"
      onClick={async () => {
        try {
          await api.auth.logout();
        } catch {
          /* ignore */
        }
        router.push("/login");
        router.refresh();
      }}
      className="mt-2 text-xs underline hover:text-[var(--color-fg)]"
    >
      {label}
    </button>
  );
}
