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

export type ErrorTaxonomy = {
  code: string;
  skill: string;
  layer: string;
  severity: "info" | "minor" | "major";
  explanation_uz: string;
  explanation_en: string;
  example_correct?: string | null;
  example_wrong?: string | null;
  recommended_drill_ids: string[];
};

export type Drill = {
  id: string;
  code: string;
  skill: string;
  target_codes: string[];
  cefr_level: "A1" | "A2" | "B1" | "B2" | "C1" | "C2";
  duration_minutes: number;
  payload: Record<string, unknown>;
  variant_count: number;
  created_at: string;
  updated_at: string;
};

export type ConversationTopic = {
  id: string;
  code: string;
  title_uz: string;
  title_en: string;
  prompt: string;
  cefr_level: "A1" | "A2" | "B1" | "B2" | "C1" | "C2";
  kind: string;
  is_active: boolean;
  created_at: string;
};

export type DrillGenerateOut = {
  draft: any;
  model: string;
  prompt_version_id?: string | null;
};

export type ListeningPassageGenerateOut = {
  passage: any;
  model: string;
  prompt_version_id?: string | null;
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
    drills: {
      generate: (body: { target_codes: string[]; cefr_level: string; drill_type: string; item_count: number }) =>
        call<DrillGenerateOut>("/v1/drills/generate", { api: "data", method: "POST", body }),
    },
    listeningPassages: {
      generate: (body: { part: number; cefr_level: string; topic: string; duration_target_seconds: number }) =>
        call<ListeningPassageGenerateOut>("/v1/listening-passages/generate", { api: "data", method: "POST", body }),
    },
  },
  practiceCatalogue: {
    errorTaxonomy: {
      list: (cookieHeader?: string) => call<ErrorTaxonomy[]>("/v1/error-taxonomy", { api: "data", cookieHeader }),
      create: (body: ErrorTaxonomy) => call<ErrorTaxonomy>("/v1/error-taxonomy", { api: "data", method: "POST", body }),
      update: (code: string, body: Partial<ErrorTaxonomy>) => call<ErrorTaxonomy>(`/v1/error-taxonomy/${code}`, { api: "data", method: "PATCH", body }),
    },
    drills: {
      list: (cookieHeader?: string) => call<Drill[]>("/v1/drills", { api: "data", cookieHeader }),
      create: (body: Omit<Drill, "id" | "created_at" | "updated_at">) => call<Drill>("/v1/drills", { api: "data", method: "POST", body }),
      update: (id: string, body: Partial<Drill>) => call<Drill>(`/v1/drills/${id}`, { api: "data", method: "PATCH", body }),
    },
    conversationTopics: {
      list: (cookieHeader?: string) => call<ConversationTopic[]>("/v1/conversation-topics", { api: "data", cookieHeader }),
      create: (body: Omit<ConversationTopic, "id" | "created_at">) => call<ConversationTopic>("/v1/conversation-topics", { api: "data", method: "POST", body }),
      update: (id: string, body: Partial<ConversationTopic>) => call<ConversationTopic>(`/v1/conversation-topics/${id}`, { api: "data", method: "PATCH", body }),
    },
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
