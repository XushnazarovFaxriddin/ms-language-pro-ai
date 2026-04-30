"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { ApiError, api } from "@/lib/api";
import type { AdminCopy } from "@/lib/admin-i18n";
import { Mail, Lock, Loader2, ArrowRight } from "lucide-react";

const COOKIE_MAX_AGE_SECONDS = 60 * 60 * 24 * 365;

export function LoginForm({
  returnTo,
  copy,
  locale,
}: {
  returnTo: string;
  copy: AdminCopy["login"];
  locale: "uz" | "en";
}) {
  const router = useRouter();
  const [email, setEmail] = useState("admin@aiexam.uz");
  const [password, setPassword] = useState("admin12345");
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
          await api.auth.updateMe({ locale });
          document.cookie = `admin_locale=${locale}; Path=/; Max-Age=${COOKIE_MAX_AGE_SECONDS}; SameSite=Lax`;
          document.documentElement.lang = locale;
          router.push(returnTo);
          router.refresh();
        } catch (err) {
          setError(err instanceof ApiError ? err.detail : String(err));
        } finally {
          setPending(false);
        }
      }}
      className="space-y-5"
    >
      <div className="space-y-2">
        <label className="text-sm font-semibold text-slate-700 dark:text-slate-300 ml-1">{copy.email}</label>
        <div className="relative group">
          <div className="absolute inset-y-0 left-0 flex items-center pl-4 text-slate-500 group-focus-within:text-emerald-400 transition-colors">
            <Mail className="h-5 w-5" />
          </div>
          <input
            type="email"
            required
            placeholder="admin@example.com"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="w-full rounded-2xl border border-slate-200 dark:border-slate-800 bg-white/50 dark:bg-slate-900/50 py-3 pl-12 pr-4 text-slate-900 dark:text-white placeholder-slate-400 dark:placeholder-slate-600 outline-none ring-offset-white dark:ring-offset-black transition-all focus:border-emerald-500/50 focus:ring-2 focus:ring-emerald-500/20"
          />
        </div>
      </div>

      <div className="space-y-2">
        <div className="flex items-center justify-between ml-1">
          <label className="text-sm font-semibold text-slate-700 dark:text-slate-300">{copy.password}</label>
        </div>
        <div className="relative group">
          <div className="absolute inset-y-0 left-0 flex items-center pl-4 text-slate-500 group-focus-within:text-emerald-400 transition-colors">
            <Lock className="h-5 w-5" />
          </div>
          <input
            type="password"
            required
            placeholder="••••••••"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="w-full rounded-2xl border border-slate-200 dark:border-slate-800 bg-white/50 dark:bg-slate-900/50 py-3 pl-12 pr-4 text-slate-900 dark:text-white placeholder-slate-400 dark:placeholder-slate-600 outline-none ring-offset-white dark:ring-offset-black transition-all focus:border-emerald-500/50 focus:ring-2 focus:ring-emerald-500/20"
          />
        </div>
      </div>

      {error && (
        <div className="rounded-xl border border-red-500/20 bg-red-500/5 px-4 py-3 text-sm text-red-400 animate-in fade-in slide-in-from-top-2">
          {error}
        </div>
      )}

      <button
        type="submit"
        disabled={pending}
        className="group relative flex w-full items-center justify-center gap-2 overflow-hidden rounded-2xl bg-gradient-to-br from-emerald-500 to-teal-600 px-6 py-3.5 font-bold text-white shadow-lg shadow-emerald-500/20 transition-all hover:scale-[1.02] hover:shadow-emerald-500/30 active:scale-[0.98] disabled:opacity-50 disabled:hover:scale-100"
      >
        {pending ? (
          <Loader2 className="h-5 w-5 animate-spin" />
        ) : (
          <>
            {copy.submit} <ArrowRight className="h-5 w-5 transition-transform group-hover:translate-x-1" />
          </>
        )}
      </button>
    </form>
  );
}
