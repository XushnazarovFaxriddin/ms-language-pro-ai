// Server-side helpers to read cookies and call /me from RSC.
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { api, ApiError, type User } from "./api";

/** Build a Cookie header from the incoming Next request. */
export async function getCookieHeader(): Promise<string> {
  const c = await cookies();
  return c.getAll().map((x) => `${x.name}=${x.value}`).join("; ");
}

/** Returns the current user or null. Does NOT redirect. */
export async function tryGetUser(): Promise<User | null> {
  try {
    const ck = await getCookieHeader();
    if (!ck) return null;
    return await api.auth.me(ck);
  } catch (e) {
    if (e instanceof ApiError && (e.status === 401 || e.status === 403)) return null;
    return null;
  }
}

/** Returns the current user; redirects to /login if not signed in. */
export async function requireUser(returnTo?: string): Promise<User> {
  const user = await tryGetUser();
  if (!user) {
    const path = returnTo ? `?returnTo=${encodeURIComponent(returnTo)}` : "";
    redirect(`/login${path}`);
  }
  return user;
}
