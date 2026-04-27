// Universal fetch wrapper. Works in RSC, Server Actions, and Client Components.
// Includes credentials so cookies cross app.localhost/admin.localhost/api.localhost.

const isBrowser = typeof window !== "undefined";

const AUTH_API = isBrowser 
  ? "/api/auth" 
  : (process.env.NEXT_PUBLIC_AUTH_API ?? "http://api.localhost/auth");

const EXAM_API = isBrowser 
  ? "/api/exam" 
  : (process.env.NEXT_PUBLIC_EXAM_API ?? "http://api.localhost/exam");

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
  feedback: {
    getAttemptFeedback: (attemptId: string, cookieHeader?: string) => call<AttemptFeedbackOut>(`/v1/attempts/${attemptId}/feedback`, { api: "exam", cookieHeader }),
    generateOverview: (attemptId: string, body: { target_band?: number } = {}) => call<AttemptFeedbackOut>(`/v1/attempts/${attemptId}/feedback/overview`, { api: "exam", method: "POST", body }),
    getRecent: (cookieHeader?: string) => call<AttemptFeedbackOut[]>("/v1/me/feedback/recent", { api: "exam", cookieHeader }),
    getResponseFeedback: (responseId: string) => call<ResponseFeedbackOut>(`/v1/responses/${responseId}/feedback`, { api: "exam" }),
    analyseWriting: (responseId: string, body: any) => call<ResponseFeedbackOut>(`/v1/responses/${responseId}/feedback/analyse-writing`, { api: "exam", method: "POST", body }),
    getTextAnalysis: (responseId: string) => call<any>(`/v1/responses/${responseId}/text-analysis`, { api: "exam" }),
    getSentenceFeedback: (responseId: string) => call<any>(`/v1/responses/${responseId}/sentence-feedback`, { api: "exam" }),
    getWordUpgrades: (responseId: string) => call<any>(`/v1/responses/${responseId}/word-upgrades`, { api: "exam" }),
    getPhonemeFeedback: (responseId: string) => call<any>(`/v1/responses/${responseId}/phoneme-feedback`, { api: "exam" }),
  },
  roadmap: {
    get: (cookieHeader?: string) => call<RoadmapOut>("/v1/me/roadmap", { api: "exam", cookieHeader }),
    regenerate: (body: { target_band: number; target_date: string; weekly_hours: number; focus_skill: string; weeks_until_target: number }) => call<RoadmapOut>("/v1/me/roadmap/regenerate", { api: "exam", method: "POST", body }),
    getToday: (cookieHeader?: string) => call<any>("/v1/me/roadmap/today", { api: "exam", cookieHeader }),
  },
  practice: {
    getSRSQueue: (cookieHeader?: string) => call<SRSCardOut[]>("/v1/me/srs/queue", { api: "exam", cookieHeader }),
    gradeSRS: (body: { card_id: string; grade: "again" | "hard" | "good" | "easy" }) => call<any>("/v1/me/srs/grade", { api: "exam", method: "POST", body }),
    getMastery: (cookieHeader?: string) => call<MasteryOut[]>("/v1/me/mastery", { api: "exam", cookieHeader }),
    startDrill: (drillId: string, body: { items_total?: number } = {}) => call<DrillAttemptOut>(`/v1/practice/drills/${drillId}/attempts`, { api: "exam", method: "POST", body }),
    submitDrillItem: (drillId: string, attemptId: string, body: { correct: boolean; target_codes?: string[] }) => call<any>(`/v1/practice/drills/${drillId}/attempts/${attemptId}/items`, { api: "exam", method: "POST", body }),
    completeDrill: (drillId: string, attemptId: string, body: { duration_ms: number }) => call<DrillAttemptOut>(`/v1/practice/drills/${drillId}/attempts/${attemptId}/complete`, { api: "exam", method: "POST", body }),
  },
  conversation: {
    startSession: (body: { topic: string; topic_id?: string; cefr_level?: string; mode?: "async" | "realtime" }) => call<ConversationSessionOut>("/v1/practice/conversation/sessions", { api: "exam", method: "POST", body }),
    submitTurn: (sessionId: string, body: { audio_base64: string; audio_format?: string }) => call<ConversationTurnOut>(`/v1/practice/conversation/sessions/${sessionId}/turns`, { api: "exam", method: "POST", body }),
    endSession: (sessionId: string) => call<ConversationSessionOut>(`/v1/practice/conversation/sessions/${sessionId}/end`, { api: "exam", method: "POST" }),
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
  blueprint_snapshot: { name_uz?: string; name_en?: string; sections: { skill: string; name_uz?: string; name_en?: string; item_count?: number; time_limit_seconds: number }[] };
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

// ----- New DTOs -----
export type AttemptFeedbackOut = {
  attempt_id: string;
  artifacts: any[];
};

export type ResponseFeedbackOut = {
  response_id: string;
  artifacts: any[];
};

export type RoadmapMilestone = {
  week: number;
  theme: string;
  skill_focus: string[];
  expected_band_lift: number;
  items: any[];
};

export type RoadmapOut = {
  id: string;
  target_band: number;
  target_date: string;
  weekly_hours: number;
  current_band_estimate?: number | null;
  predicted_band_at_target: Record<string, any>;
  plan: { milestones: RoadmapMilestone[]; daily_targets: any; spaced_repetition: any; unmet_codes: string[]; narrative_uz: string; narrative_en: string; };
  status: string;
  created_at: string;
  updated_at: string;
};

export type SRSCardOut = {
  id: string;
  ref_type: string;
  ref_id: string;
  payload: Record<string, any>;
  stability: number;
  difficulty: number;
  due_at: string;
  reps: number;
  lapses: number;
  last_grade?: string | null;
};

export type MasteryOut = {
  code: string;
  mastery: number;
  last_practiced_at: string;
};

export type DrillAttemptOut = {
  id: string;
  drill_id: string;
  items_correct: number;
  items_total: number;
  duration_ms?: number | null;
  started_at: string;
  completed_at?: string | null;
};

export type ConversationSessionOut = {
  id: string;
  topic_id?: string | null;
  topic: string;
  cefr_level: string;
  mode: string;
  status: string;
  started_at: string;
  ended_at?: string | null;
};

export type ConversationTurnOut = {
  id: string;
  session_id: string;
  turn_index: number;
  user_audio_s3_key?: string | null;
  user_transcript: string;
  agent_response_text: string;
  agent_audio_url?: string | null;
  feedback: any;
  model?: string | null;
  created_at: string;
};
