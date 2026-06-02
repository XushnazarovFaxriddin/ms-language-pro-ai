/**
 * Proactive JWT token refresh for long-running exam sessions.
 *
 * Problem: IELTS exams last 2-3 hours, but access tokens typically expire
 * in 15-30 minutes. If the token expires mid-exam, the student loses their
 * work when the next API call fails with 401.
 *
 * Solution: Periodically call /v1/refresh in the background while the exam
 * is active. This keeps the access cookie fresh without interrupting the
 * student's flow. The api.ts `call()` function also has reactive 401→refresh
 * logic as a fallback, but proactive refresh prevents the latency spike.
 */

const AUTH_API = "/api/auth";

function readCookie(name: string): string | undefined {
  if (typeof window === "undefined") return undefined;
  const match = document.cookie.match(new RegExp("(?:^|; )" + name + "=([^;]*)"));
  return match?.[1] ? decodeURIComponent(match[1]) : undefined;
}

async function silentRefresh(): Promise<boolean> {
  try {
    const csrf = readCookie("lp_csrf");
    const res = await fetch(`${AUTH_API}/v1/refresh`, {
      method: "POST",
      credentials: "include",
      cache: "no-store",
      headers: csrf ? { "X-CSRF-Token": csrf } : {},
    });
    return res.ok;
  } catch {
    return false;
  }
}

/**
 * Start proactive token refresh on an interval.
 * Returns a cleanup function to clear the interval.
 *
 * @param intervalMs - refresh interval in milliseconds (default: 10 minutes)
 */
export function proactiveRefresh(intervalMs = 10 * 60 * 1000): () => void {
  // Do an immediate refresh to ensure we start with a fresh token
  void silentRefresh();

  const id = window.setInterval(() => {
    void silentRefresh();
  }, intervalMs);

  return () => window.clearInterval(id);
}

/**
 * Check if the current session appears valid (has cookies set).
 * This is a quick client-side check, not a server verification.
 */
export function hasValidSession(): boolean {
  return !!readCookie("lp_access") || !!readCookie("lp_refresh");
}
