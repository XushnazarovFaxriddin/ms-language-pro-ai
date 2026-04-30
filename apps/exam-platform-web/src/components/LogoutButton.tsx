"use client";

import { useRouter } from "@/i18n/routing";
import { api } from "@/lib/api";

export function LogoutButton() {
  const router = useRouter();
  return (
    <button
      type="button"
      onClick={async () => {
        try {
          await api.auth.logout();
        } catch {
          // ignore
        }
        router.push("/login");
        router.refresh();
      }}
      className="text-[var(--color-muted-fg)] hover:text-[var(--color-fg)]"
    >
      Chiqish
    </button>
  );
}
