import Link from "next/link";
import type { User } from "@/lib/api";
import { LogoutButton } from "./LogoutButton";

const NAV = [
  { href: "/dashboard", label: "Bosh sahifa" },
  { href: "/generation", label: "Savol generatsiyasi" },
  { href: "/llm-usage", label: "LLM xarajat" },
];

export function AdminShell({
  user,
  children,
}: {
  user: User;
  children: React.ReactNode;
}) {
  return (
    <div className="grid min-h-screen grid-cols-[240px_1fr]">
      <aside className="border-r border-[var(--color-border)] bg-[var(--color-muted)]/30 p-6">
        <Link href="/dashboard" className="block text-lg font-semibold">
          LanguagePro <span className="text-[var(--color-primary)]">AI</span>
          <p className="mt-0.5 text-xs font-normal text-[var(--color-muted-fg)]">Content Studio</p>
        </Link>
        <nav className="mt-8 flex flex-col gap-1 text-sm">
          {NAV.map((n) => (
            <Link
              key={n.href}
              href={n.href}
              className="rounded px-3 py-2 hover:bg-[var(--color-muted)]"
            >
              {n.label}
            </Link>
          ))}
        </nav>
        <div className="mt-auto border-t border-[var(--color-border)] pt-4 text-xs text-[var(--color-muted-fg)]">
          <p>{user.email}</p>
          <p className="mt-0.5 font-mono">{user.roles.join(", ")}</p>
          <LogoutButton />
        </div>
      </aside>
      <div>{children}</div>
    </div>
  );
}
