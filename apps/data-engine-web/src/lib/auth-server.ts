import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { api, ApiError, type User } from "./api";

export async function getCookieHeader(): Promise<string> {
  const c = await cookies();
  return c.getAll().map((x) => `${x.name}=${x.value}`).join("; ");
}

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

const ADMIN_ROLES = new Set(["content_admin", "superadmin"]);

export async function requireAdmin(returnTo?: string): Promise<User> {
  const user = await tryGetUser();
  if (!user) {
    const path = returnTo ? `?returnTo=${encodeURIComponent(returnTo)}` : "";
    redirect(`/login${path}`);
  }
  if (!user.roles.some((r) => ADMIN_ROLES.has(r))) {
    redirect("/forbidden");
  }
  return user;
}
