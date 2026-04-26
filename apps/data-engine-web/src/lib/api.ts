// data-engine-web API client. Talks to auth-api + data-engine-api directly.

const isBrowser = typeof window !== "undefined";

const AUTH_API = isBrowser 
  ? "/api/auth" 
  : (process.env.NEXT_PUBLIC_AUTH_API ?? "http://api.localhost/auth");

const DATA_API = isBrowser 
  ? "/api/data" 
  : (process.env.NEXT_PUBLIC_DATA_API ?? "http://api.localhost/data");

export class ApiError extends Error {
  constructor(public status: number, public detail: string, public payload?: unknown) {
    super(`${status} ${detail}`);
  }
}

type FetchOpts = {
  method?: string;
  body?: unknown;
  headers?: Record<string, string>;
  cookieHeader?: string;
  api: "auth" | "data";
};

async function call<T>(path: string, opts: FetchOpts): Promise<T> {
  const base = opts.api === "auth" ? AUTH_API : DATA_API;
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    ...opts.headers,
  };
  if (opts.cookieHeader) headers.Cookie = opts.cookieHeader;
  const res = await fetch(`${base}${path}`, {
    method: opts.method ?? "GET",
    headers,
    credentials: "include",
    cache: "no-store",
    body: opts.body !== undefined ? JSON.stringify(opts.body) : undefined,
  });
  if (!res.ok) {
    let detail = res.statusText;
    let payload: unknown;
    try {
      payload = await res.json();
      detail = (payload as { detail?: string }).detail ?? detail;
    } catch {
      /* ignore */
    }
    throw new ApiError(res.status, detail, payload);
  }
  if (res.status === 204) return undefined as T;
  return (await res.json()) as T;
}

// ---------------------------------------------------------------- types
export type User = {
  id: string;
  email: string;
  display_name: string | null;
  roles: string[];
  locale: "uz" | "en";
  theme: "system" | "light" | "dark";
  created_at: string;
};

export type GenerationJob = {
  id: string;
  status: string;
  params: Record<string, unknown>;
  totals: Record<string, number>;
  started_at: string | null;
  finished_at: string | null;
  created_at: string;
};

export type UsageSummary = {
  period: string;
  total_calls: number;
  total_cost_usd: string;
  total_tokens_in: number;
  total_tokens_out: number;
  avg_latency_ms: number;
};

export type UsageByPurpose = {
  purpose: string;
  calls: number;
  tokens_in: number;
  tokens_out: number;
  cost_usd: string;
  avg_latency_ms: number;
};

export type UsageByModel = {
  model: string;
  calls: number;
  cost_usd: string;
  avg_latency_ms: number;
};

export type UsageTimeBucket = {
  bucket: string;
  purpose: string;
  calls: number;
  cost_usd: string;
};

export type LLMCallRow = {
  request_id: string;
  ts: string;
  service: string;
  purpose: string;
  model: string;
  tokens_in: number;
  tokens_out: number;
  cost_usd: string;
  latency_ms: number;
  status: string;
};

export type Item = {
  id: string;
  type: string;
  skill: string;
  cefr_level: string;
  payload: {
    passage?: string;
    prompt?: string;
    options?: { id: string; label: string }[];
    audio_url?: string;
  };
  estimated_seconds: number;
};

// ---------------------------------------------------------------- API
export const api = {
  auth: {
    login: (email: string, password: string) =>
      call<{ user: User }>("/v1/login", { api: "auth", method: "POST", body: { email, password } }),
    logout: () => call<void>("/v1/logout", { api: "auth", method: "POST" }),
    me: (cookieHeader?: string) => call<User>("/v1/me", { api: "auth", cookieHeader }),
  },
  generation: {
    create: (body: { skill: string; cefr_level: string; topic: string; count: number }) =>
      call<GenerationJob>("/v1/generation/jobs", { api: "data", method: "POST", body }),
    get: (id: string, cookieHeader?: string) =>
      call<GenerationJob>(`/v1/generation/jobs/${id}`, { api: "data", cookieHeader }),
  },
  items: {
    list: (params: { status?: string; skill?: string; cefr?: string; limit?: number; offset?: number } = {}, cookieHeader?: string) => {
      const sp = new URLSearchParams();
      if (params.status) sp.set("status", params.status);
      if (params.skill) sp.set("skill", params.skill);
      if (params.cefr) sp.set("cefr", params.cefr);
      if (params.limit) sp.set("limit", String(params.limit));
      if (params.offset) sp.set("offset", String(params.offset));
      const query = sp.toString() ? `?${sp.toString()}` : "";
      return call<Item[]>(`/v1/items${query}`, { api: "data", cookieHeader });
    },
  },
  usage: {
    summary: (period: "24h" | "7d" | "30d" = "7d", cookieHeader?: string) =>
      call<UsageSummary>(`/v1/analytics/llm-usage/summary?period=${period}`, {
        api: "data",
        cookieHeader,
      }),
    byPurpose: (period: "24h" | "7d" | "30d" = "7d", cookieHeader?: string) =>
      call<UsageByPurpose[]>(`/v1/analytics/llm-usage/by-purpose?period=${period}`, {
        api: "data",
        cookieHeader,
      }),
    byModel: (period: "24h" | "7d" | "30d" = "7d", cookieHeader?: string) =>
      call<UsageByModel[]>(`/v1/analytics/llm-usage/by-model?period=${period}`, {
        api: "data",
        cookieHeader,
      }),
    timeseries: (
      period: "24h" | "7d" | "30d" = "7d",
      granularity: "hour" | "day" = "day",
      cookieHeader?: string,
    ) =>
      call<UsageTimeBucket[]>(
        `/v1/analytics/llm-usage/timeseries?period=${period}&granularity=${granularity}`,
        { api: "data", cookieHeader },
      ),
    calls: (limit = 50, cookieHeader?: string) =>
      call<LLMCallRow[]>(`/v1/analytics/llm-usage/calls?limit=${limit}`, {
        api: "data",
        cookieHeader,
      }),
  },
};
