"use client";

import { useRouter } from "@/i18n/routing";
import { useState } from "react";
import { ApiError, api } from "@/lib/api";
import { Mail, Lock, Loader2, AlertCircle } from "lucide-react";

export function LoginForm({ returnTo }: { returnTo: string }) {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
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
      className="flex flex-col gap-5"
    >
      <div className="flex flex-col gap-1.5">
        <label htmlFor="email-input" className="text-xs font-bold uppercase tracking-wider text-[var(--color-muted-fg)]">
          Email
        </label>
        <div className="relative">
          <div className="absolute inset-y-0 left-0 flex items-center pl-3.5 pointer-events-none text-[var(--color-muted-fg)]">
            <Mail className="h-4.5 w-4.5" />
          </div>
          <input
            id="email-input"
            type="email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="w-full rounded-2xl glass-input pl-10 pr-4 py-3 text-sm outline-none focus:border-[var(--color-primary)] focus:ring-4 focus:ring-[var(--color-primary)]/10"
            autoComplete="email"
            placeholder="example@domain.com"
          />
        </div>
      </div>

      <div className="flex flex-col gap-1.5">
        <label htmlFor="password-input" className="text-xs font-bold uppercase tracking-wider text-[var(--color-muted-fg)]">
          Parol
        </label>
        <div className="relative">
          <div className="absolute inset-y-0 left-0 flex items-center pl-3.5 pointer-events-none text-[var(--color-muted-fg)]">
            <Lock className="h-4.5 w-4.5" />
          </div>
          <input
            id="password-input"
            type="password"
            required
            minLength={8}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="w-full rounded-2xl glass-input pl-10 pr-4 py-3 text-sm outline-none focus:border-[var(--color-primary)] focus:ring-4 focus:ring-[var(--color-primary)]/10"
            autoComplete="current-password"
            placeholder="••••••••"
          />
        </div>
      </div>

      {error && (
        <div className="flex items-start gap-2.5 rounded-2xl border border-red-500/20 bg-red-500/5 px-4 py-3.5 text-xs font-medium text-red-500">
          <AlertCircle className="h-4 w-4 mt-0.5 flex-shrink-0" />
          <p className="leading-normal">{error}</p>
        </div>
      )}

      <button
        type="submit"
        disabled={pending}
        className="mt-2 w-full rounded-2xl bg-gradient-to-r from-[var(--color-primary)] to-violet-600 px-4 py-3.5 text-sm font-bold text-white shadow-lg shadow-[var(--color-primary)]/15 transition-all duration-300 hover:shadow-xl hover:shadow-[var(--color-primary)]/20 hover:scale-[1.02] active:scale-[0.98] disabled:opacity-50 disabled:pointer-events-none flex items-center justify-center gap-2 cursor-pointer"
      >
        {pending ? (
          <>
            <Loader2 className="h-4 w-4 animate-spin" />
            Kirilmoqda…
          </>
        ) : (
          "Kirish"
        )}
      </button>
    </form>
  );
}
