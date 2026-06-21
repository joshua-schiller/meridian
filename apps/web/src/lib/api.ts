import {
  readDemoFixtures,
  type Contact,
  type Dossier,
  type LivingInsightDocument,
  type QuestionBank,
  type Transcript,
} from "@/lib/fixtures";

const API_BASE = process.env.API_BASE_URL ?? "http://localhost:8001";

export type LoopMode = "deterministic" | "claude" | "auto";

export type LoopMetrics = {
  specificity_before: number;
  specificity_after: number;
  findings_added: number;
  grounded_questions: number;
  mode: string;
  requested_mode?: string;
  resolved_mode?: string;
  fallback_reason?: string | null;
};

type AdaptiveLoopResponse = {
  transcript: Transcript;
  insight_doc_before: LivingInsightDocument;
  insight_doc_after: LivingInsightDocument;
  question_bank_before: QuestionBank;
  question_bank_after: QuestionBank;
  metrics: LoopMetrics;
};

type DemoContextResponse = {
  contact: Contact;
  dossier: Dossier;
};

export type DemoData = {
  contact: Contact;
  dossier: Dossier;
  transcript: Transcript;
  questionBankBefore: QuestionBank;
  questionBankAfter: QuestionBank;
  insightAfter: LivingInsightDocument;
  metrics: LoopMetrics;
  /** Where the data came from — surfaced in the UI so the demo never silently lies. */
  source: "api" | "fixtures";
};

async function fetchJson<T>(path: string): Promise<T> {
  // Server-side fetch (this runs in the Server Component), so no CORS concern.
  const res = await fetch(`${API_BASE}${path}`, { cache: "no-store" });
  if (!res.ok) throw new Error(`GET ${path} -> ${res.status}`);
  return (await res.json()) as T;
}

function avg(bank: QuestionBank): number {
  if (bank.questions.length === 0) return 0;
  return bank.questions.reduce((s, q) => s + q.specificity_score, 0) / bank.questions.length;
}

function fixtureMetrics(
  before: QuestionBank,
  after: QuestionBank,
  insight: LivingInsightDocument,
): LoopMetrics {
  return {
    specificity_before: avg(before),
    specificity_after: avg(after),
    findings_added: insight.themes.reduce((s, t) => s + t.findings.length, 0),
    grounded_questions: after.questions.filter((q) => q.grounding.length > 0).length,
    mode: "fixtures",
    requested_mode: "fixtures",
    resolved_mode: "fixtures",
    fallback_reason: "API unavailable; rendered local fixture fallback.",
  };
}

/**
 * Live data from the adaptive-loop API, with a deterministic fallback to the
 * local fixture files if the API is unreachable. Either way the page renders.
 */
export async function getDemoData(mode: LoopMode = "deterministic"): Promise<DemoData> {
  try {
    const [loop, ctx] = await Promise.all([
      fetchJson<AdaptiveLoopResponse>(`/demo/adaptive-loop?mode=${mode}`),
      fetchJson<DemoContextResponse>("/demo/fixtures"),
    ]);
    return {
      contact: ctx.contact,
      dossier: ctx.dossier,
      transcript: loop.transcript,
      questionBankBefore: loop.question_bank_before,
      questionBankAfter: loop.question_bank_after,
      insightAfter: loop.insight_doc_after,
      metrics: loop.metrics,
      source: "api",
    };
  } catch {
    const f = await readDemoFixtures();
    const [before, after] = f.questionBanks;
    const insightAfter = f.insightDocs[1];
    return {
      contact: f.contact,
      dossier: f.dossier,
      transcript: f.transcript,
      questionBankBefore: before,
      questionBankAfter: after,
      insightAfter,
      metrics: fixtureMetrics(before, after, insightAfter),
      source: "fixtures",
    };
  }
}
