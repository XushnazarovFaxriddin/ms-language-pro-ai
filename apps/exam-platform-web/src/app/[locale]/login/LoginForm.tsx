"use client";

import { useRouter } from "@/i18n/routing";
import { useState } from "react";
import { ApiError, api } from "@/lib/api";

export function LoginForm({ returnTo }: { returnTo: string }) {
  const router = useRouter();
  const [email, setEmail] = useState("student@aiexam.uz");
  const [password, setPassword] = useState("student12345");
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  return (
    <form
      onSubmit={async (e) => {
        e.preventDefault();
        setError(null);
        setPending(true);
        try {
          await api.auth.login(email, password);
          router.push(returnTo);
          router.refresh();
        } catch (err) {
          const errorMessage = err instanceof ApiError ? err.detail : String(err);
          setError(typeof errorMessage === "string" ? errorMessage : JSON.stringify(errorMessage));
        } finally {
          setPending(false);
        }
      }}
      className="flex flex-col gap-4"
    >
      <label className="flex flex-col gap-1.5">
        <span className="text-sm font-medium">Email</span>
        <input
          type="email"
          required
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          className="rounded border border-[var(--color-border)] bg-[var(--color-bg)] px-3 py-2 outline-none focus:border-[var(--color-primary)]"
          autoComplete="email"
        />
      </label>
      <label className="flex flex-col gap-1.5">
        <span className="text-sm font-medium">Parol</span>
        <input
          type="password"
          required
          minLength={8}
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          className="rounded border border-[var(--color-border)] bg-[var(--color-bg)] px-3 py-2 outline-none focus:border-[var(--color-primary)]"
          autoComplete="current-password"
        />
      </label>
      {error && (
        <p className="rounded border border-red-500/40 bg-red-500/10 px-3 py-2 text-sm text-red-600">
          {error}
        </p>
      )}
      <button
        type="submit"
        disabled={pending}
        className="rounded bg-[var(--color-primary)] px-4 py-2 font-medium text-[var(--color-primary-fg)] disabled:opacity-50"
      >
        {pending ? "Kirilmoqda…" : "Kirish"}
      </button>
    </form>
  );
}
