import Link from "next/link";
import type { User } from "@/lib/api";
import { LogoutButton } from "./LogoutButton";

export function AppHeader({ user }: { user: User | null }) {
  return (
    <header className="border-b border-[var(--color-border)]">
      <div className="container mx-auto flex max-w-5xl items-center justify-between px-6 py-4">
        <Link href="/" className="font-semibold tracking-tight">
          LanguagePro <span className="text-[var(--color-primary)]">AI</span>
        </Link>
        <nav className="flex items-center gap-4 text-sm">
          {user ? (
            <>
              <Link href="/exams" className="hover:text-[var(--color-primary)]">
                Imtihonlar
              </Link>
              <span className="text-[var(--color-muted-fg)]">{user.email}</span>
              <LogoutButton />
            </>
          ) : (
            <Link
              href="/login"
              className="rounded bg-[var(--color-primary)] px-3 py-1.5 text-[var(--color-primary-fg)] hover:opacity-90"
            >
              Kirish
            </Link>
          )}
        </nav>
      </div>
    </header>
  );
}
