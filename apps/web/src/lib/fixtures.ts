import { readFile } from "node:fs/promises";
import path from "node:path";

export type Contact = {
  id: string;
  name: string;
  role: string;
  company: string;
  background: string;
};

export type Dossier = {
  id: string;
  contact_id: string;
  summary: string;
  personalization_hooks: string[];
  likely_pain_points: string[];
};

export type TranscriptTurn = {
  id: string;
  speaker: "agent" | "interviewee";
  text: string;
  timestamp_seconds: number;
};

export type Transcript = {
  id: string;
  research_goal: string;
  interview_number: number;
  interviewee_id: string;
  source: "fixture" | "deepgram" | "uploaded";
  turns: TranscriptTurn[];
  summary: string;
};

export type Question = {
  id: string;
  primary: string;
  rationale_gap: string;
  probes: string[];
  specificity_score: number;
  grounding: string[];
};

export type QuestionBank = {
  id: string;
  research_goal: string;
  interview_number: number;
  for_interviewee: string;
  personalized_opening: string;
  questions: Question[];
};

export type Finding = {
  id: string;
  text: string;
  status: "confirmed" | "challenged" | "nuanced" | "open";
  confidence: "high" | "medium" | "low";
};

export type Theme = {
  id: string;
  label: string;
  findings: Finding[];
};

export type LivingInsightDocument = {
  id: string;
  research_goal: string;
  themes: Theme[];
  open_questions: string[];
};

type DemoFixtures = {
  contact: Contact;
  dossier: Dossier;
  transcript: Transcript;
  questionBanks: QuestionBank[];
  insightDocs: LivingInsightDocument[];
};

const rootDir = path.join(process.cwd(), "../..");

async function readFixture<T>(relativePath: string): Promise<T> {
  const fixturePath = path.join(rootDir, "fixtures", relativePath);
  const raw = await readFile(fixturePath, "utf8");
  return JSON.parse(raw) as T;
}

export async function readDemoFixtures(): Promise<DemoFixtures> {
  const [
    contact,
    dossier,
    transcript,
    questionBankOne,
    questionBankTwo,
    insightInitial,
    insightAfterInterviewOne,
  ] = await Promise.all([
    readFixture<Contact>("contacts/maya_chen.json"),
    readFixture<Dossier>("dossiers/maya_chen.json"),
    readFixture<Transcript>("transcripts/interview_1_maya_chen.json"),
    readFixture<QuestionBank>("question_banks/interview_1_broad.json"),
    readFixture<QuestionBank>("question_banks/interview_2_expected.json"),
    readFixture<LivingInsightDocument>("insights/initial.json"),
    readFixture<LivingInsightDocument>("insights/after_interview_1.json"),
  ]);

  return {
    contact,
    dossier,
    transcript,
    questionBanks: [questionBankOne, questionBankTwo],
    insightDocs: [insightInitial, insightAfterInterviewOne],
  };
}
