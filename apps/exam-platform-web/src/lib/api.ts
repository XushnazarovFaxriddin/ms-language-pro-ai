// Universal fetch wrapper. Works in RSC, Server Actions, and Client Components.
// Includes credentials so cookies cross app.localhost/admin.localhost/api.localhost.

const AUTH_API = process.env.NEXT_PUBLIC_AUTH_API ?? "http://api.localhost/auth";
const EXAM_API = process.env.NEXT_PUBLIC_EXAM_API ?? "http://api.localhost/exam";

export class ApiError extends Error {
  constructor(
    public status: number,
    public detail: string,
    public payload?: unknown,
  ) {
    super(`${status} ${detail}`);
  }
}

type FetchOpts = {
  method?: string;
  body?: unknown;
  headers?: Record<string, string>;
  cookieHeader?: string; // pass through cookies from RSC
  api: "auth" | "exam";
};

async function call<T>(path: string, opts: FetchOpts): Promise<T> {
  const base = opts.api === "auth" ? AUTH_API : EXAM_API;
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    ...opts.headers,
  };
  if (opts.cookieHeader) {
    headers.Cookie = opts.cookieHeader;
  }
  const res = await fetch(`${base}${path}`, {
    method: opts.method ?? "GET",
    headers,
    credentials: "include",
    cache: "no-store",
    body: opts.body !== undefined ? JSON.stringify(opts.body) : undefined,
  });
  if (!res.ok) {
    let detail = res.statusText;
    let payload: unknown = undefined;
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

export const api = {
  auth: {
    login: (email: string, password: string) =>
      call<{ user: User }>("/v1/login", {
        api: "auth",
        method: "POST",
        body: { email, password },
      }),
    logout: () => call<void>("/v1/logout", { api: "auth", method: "POST" }),
    register: (email: string, password: string, locale: "uz" | "en" = "uz") =>
      call<{ user: User }>("/v1/register", {
        api: "auth",
        method: "POST",
        body: { email, password, locale },
      }),
    me: (cookieHeader?: string) =>
      call<User>("/v1/me", { api: "auth", cookieHeader }),
  },
  exam: {
    listExams: (cookieHeader?: string) =>
      call<ExamSummary[]>("/v1/exams", { api: "exam", cookieHeader }),
    startAttempt: (blueprint_code: string, locale: "uz" | "en" = "uz") =>
      call<StartAttemptResponse>("/v1/attempts", {
        api: "exam",
        method: "POST",
        body: { blueprint_code, locale },
      }),
    getAttempt: (id: string, cookieHeader?: string) =>
      call<AttemptOut>(`/v1/attempts/${id}`, { api: "exam", cookieHeader }),
    listAttempts: (cookieHeader?: string) =>
      call<AttemptListItem[]>(`/v1/attempts`, { api: "exam", cookieHeader }),
    getNextItem: (id: string) =>
      call<NextItemResponse>(`/v1/attempts/${id}/next-item`, { api: "exam" }),
    submitResponse: (
      attemptId: string,
      body: SubmitResponseIn,
    ) =>
      call<SubmitResponseOut>(`/v1/attempts/${attemptId}/responses`, {
        api: "exam",
        method: "POST",
        body,
      }),
  },
};

// ----- Types (mirror packages/contracts; inlined for simplicity) -----
export type User = {
  id: string;
  email: string;
  display_name: string | null;
  roles: string[];
  locale: "uz" | "en";
  theme: "system" | "light" | "dark";
  created_at: string;
};

export type ExamSummary = {
  id: string;
  blueprint_code: string;
  name_uz: string;
  name_en: string;
};

export type ItemView = {
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

export type StartAttemptResponse = {
  attempt_id: string;
  blueprint_snapshot: { sections: { skill: string; name_uz?: string; name_en?: string; item_count?: number; time_limit_seconds: number }[] };
  current_section_index: number;
  current_item: ItemView | null;
};

export type AttemptOut = {
  id: string;
  state: string;
  blueprint_snapshot: StartAttemptResponse["blueprint_snapshot"];
  current_section_index: number;
  current_item: ItemView | null;
  theta_estimates: Record<string, number>;
  started_at: string;
  finished_at: string | null;
};

export type AttemptListItem = {
  id: string;
  exam_id: string;
  exam_name_uz: string;
  exam_name_en: string;
  blueprint_code: string;
  state: string;
  score?: number;
  started_at: string;
  finished_at: string | null;
};

export type NextItemResponse = {
  current_section_index: number;
  current_item: ItemView | null;
};

export type SubmitResponseIn = {
  item_id: string;
  type: string;
  mcq_choice_id?: string;
  text_answer?: string;
  audio_s3_key?: string;
  time_ms: number;
};

export type SubmitResponseOut = {
  response_id: string;
  graded_synchronously: boolean;
  is_correct: boolean | null;
  next_item: ItemView | null;
  section_complete: boolean;
  attempt_complete: boolean;
};
