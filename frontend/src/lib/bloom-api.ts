/**
 * Browser → Next.js API routes (`/api/bloom/*`) → FastAPI (`BLOOM_API_URL`).
 * Keeps a single env var on the server for the Python backend URL.
 */

const clientPrefix = "/api/bloom";

export async function bloomProfileStart(): Promise<{
  session_id: string;
  history: { role: string; content: string; timestamp?: number }[];
}> {
  const res = await fetch(`${clientPrefix}/profile/start`, {
    method: "POST",
    credentials: "same-origin",
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error((err as { detail?: string }).detail ?? res.statusText);
  }
  return res.json();
}

export async function bloomProfileChat(
  sessionId: string,
  message: string,
): Promise<{
  session_id: string;
  history: { role: string; content: string; timestamp?: number }[];
  is_complete?: boolean;
}> {
  const q = new URLSearchParams({ session_id: sessionId });
  const res = await fetch(`${clientPrefix}/profile/chat?${q}`, {
    method: "POST",
    credentials: "same-origin",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ message }),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error((err as { detail?: string }).detail ?? res.statusText);
  }
  return res.json();
}

export async function bloomProfileReport(
  sessionId: string,
): Promise<Record<string, unknown>> {
  const q = new URLSearchParams({ session_id: sessionId });
  const res = await fetch(`${clientPrefix}/profile/report?${q}`, {
    method: "GET",
    credentials: "same-origin",
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error((err as { detail?: string }).detail ?? res.statusText);
  }
  return res.json();
}

// ---- Syllabus / test plan / adaptive session ----

export type TopicBreakdown = { topic: string; subtopics: string[] };

export async function bloomSyllabusUpload(fd: FormData): Promise<{
  topics: TopicBreakdown[];
  resources?: string[];
  enhanced?: boolean;
}> {
  const res = await fetch(`${clientPrefix}/syllabus/upload`, {
    method: "POST",
    credentials: "same-origin",
    body: fd,
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(
      (err as { detail?: string }).detail ?? JSON.stringify(err) ?? res.statusText,
    );
  }
  return res.json();
}

export async function bloomGenerateTestPlan(body: {
  topics: TopicBreakdown[];
  marking_scheme: Record<string, unknown>;
  exam_type?: string;
  trait_profile?: Record<string, unknown> | null;
}): Promise<{ test_plan: BloomTestPlanItem[] }> {
  const res = await fetch(`${clientPrefix}/test/generate-test-plan`, {
    method: "POST",
    credentials: "same-origin",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error((err as { detail?: string }).detail ?? res.statusText);
  }
  return res.json();
}

export type BloomTestPlanItem = {
  topic: string;
  num_questions: number;
  types: string[];
  bloom_distribution?: Record<string, number>;
  trait_bias?: Record<string, string>;
};

export async function bloomSessionStart(body: {
  test_plan: BloomTestPlanItem[];
  exam_type?: string;
  trait_profile_id?: string | null;
}): Promise<{ message: string; user_id: string }> {
  const res = await fetch(`${clientPrefix}/session/start`, {
    method: "POST",
    credentials: "same-origin",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error((err as { detail?: string }).detail ?? res.statusText);
  }
  return res.json();
}

export type BloomQuestion = {
  id: string;
  topic: string;
  difficulty: string;
  type: string;
  question_text: string;
  options?: string[] | null;
  correct_answer: string;
  explanation: string;
};

export async function bloomSessionNext(): Promise<{
  question: BloomQuestion;
  adaptation: Record<string, unknown>;
}> {
  const res = await fetch(`${clientPrefix}/session/next`, {
    method: "POST",
    credentials: "same-origin",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({}),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error((err as { detail?: string }).detail ?? res.statusText);
  }
  return res.json();
}

export async function bloomSessionAnswer(body: {
  question_id: string;
  user_answer: string;
  time_taken: number;
}): Promise<{
  is_correct: boolean;
  correct_answer: string;
  explanation: string;
  insight: Record<string, string>;
}> {
  const res = await fetch(`${clientPrefix}/session/answer`, {
    method: "POST",
    credentials: "same-origin",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error((err as { detail?: string }).detail ?? res.statusText);
  }
  return res.json();
}

export async function bloomSessionReport(): Promise<Record<string, unknown>> {
  const res = await fetch(`${clientPrefix}/report`, {
    method: "GET",
    credentials: "same-origin",
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error((err as { detail?: string }).detail ?? res.statusText);
  }
  return res.json();
}

export function totalQuestionsFromPlan(plan: BloomTestPlanItem[]): number {
  return plan.reduce((s, p) => s + (p.num_questions ?? 0), 0);
}
