"use client";

import { useRouter } from "next/navigation";
import { type FormEvent, type KeyboardEvent, useState } from "react";

import {
  campaigns as campaignFixtures,
  type CampaignInterview,
  type CampaignReport,
} from "@/lib/campaigns";

type View = "home" | "create" | "questions" | "success";

type Campaign = {
  id: string;
  name: string;
  goal: string;
  completedInterviews: number;
  totalInterviews: number;
  contactsFileName?: string;
  supportingDocumentNames?: string[];
  additionalContext?: string;
  questionCount: number;
  detailHref?: string;
  highLevelFindings?: string;
  interviews?: CampaignInterview[];
  report?: CampaignReport;
};

type CampaignDraft = {
  name: string;
  goal: string;
  supportingDocumentNames: string[];
  additionalContext: string;
  contactsFileName: string;
  contactCount: number;
};

const initialCampaigns: Campaign[] = campaignFixtures.map((campaign) => ({
  id: campaign.id,
  name: campaign.title,
  goal: campaign.oneLineGoal,
  completedInterviews: campaign.completedInterviews,
  totalInterviews: campaign.totalInterviews,
  contactsFileName: campaign.contactsFileName,
  supportingDocumentNames: campaign.supportingDocumentNames,
  questionCount: campaign.questionCount,
  detailHref: `/campaigns/${campaign.id}`,
  highLevelFindings: campaign.highLevelFindings,
  interviews: campaign.interviews,
  report: campaign.report,
}));

const emptyDraft = (): CampaignDraft => ({
  name: "",
  goal: "",
  supportingDocumentNames: [],
  additionalContext: "",
  contactsFileName: "",
  contactCount: 0,
});

function normalizeGoalForQuestion(goal: string) {
  const trimmedGoal = goal.trim().replace(/[.!?]+$/, "");
  return trimmedGoal.length > 0 ? trimmedGoal[0].toLowerCase() + trimmedGoal.slice(1) : "this topic";
}

function buildInitialQuestions(goal: string) {
  const goalFragment = normalizeGoalForQuestion(goal);

  return [
    `What is your current relationship to ${goalFragment}?`,
    "Walk me through the last time this came up in a real workflow.",
    "What made that moment frustrating, slow, or expensive?",
    "What workarounds have you tried, and where did they break down?",
    "Who else gets involved when this problem appears?",
    "What would need to be true for you to trust a better approach?",
    "If this were solved well, what would change in your week?",
  ];
}

async function countCsvContacts(file: File) {
  try {
    const text = await file.text();
    const nonEmptyLines = text
      .split(/\r?\n/)
      .map((line) => line.trim())
      .filter(Boolean);

    if (nonEmptyLines.length === 0) {
      return 0;
    }

    const firstLine = nonEmptyLines[0].toLowerCase();
    const firstRowLooksLikeHeader = ["name", "email", "company", "title"].some((header) =>
      firstLine.includes(header),
    );
    const contactRows = firstRowLooksLikeHeader ? nonEmptyLines.slice(1) : nonEmptyLines;

    return contactRows.length;
  } catch {
    return 0;
  }
}

function scrollToTop() {
  window.scrollTo({ top: 0, behavior: "smooth" });
}

function pluralize(count: number, singular: string, plural = `${singular}s`) {
  return `${count} ${count === 1 ? singular : plural}`;
}

function getCompletionPercent(campaign: Campaign) {
  if (campaign.totalInterviews <= 0) {
    return 0;
  }

  return Math.min(
    100,
    Math.round((campaign.completedInterviews / campaign.totalInterviews) * 100),
  );
}

function getReportReadiness(campaign: Campaign) {
  if (campaign.totalInterviews > 0 && campaign.completedInterviews >= campaign.totalInterviews) {
    return 100;
  }

  const completionScore = Math.round(getCompletionPercent(campaign) * 0.7);
  const inputScore = campaign.totalInterviews > 0 ? 10 : 0;
  const docScore = (campaign.supportingDocumentNames?.length ?? 0) > 0 ? 10 : 0;
  const planScore = campaign.questionCount > 0 ? 10 : 0;

  return Math.min(95, completionScore + inputScore + docScore + planScore);
}

function getCampaignStage(campaign: Campaign) {
  if (campaign.totalInterviews <= 0) {
    return "Needs contacts";
  }

  if (campaign.completedInterviews >= campaign.totalInterviews) {
    return "Report ready";
  }

  if (campaign.completedInterviews === 0) {
    return "Interview 1 plan ready";
  }

  return `Interview ${campaign.completedInterviews + 1} plan ready`;
}

function getNextInterview(campaign: Campaign) {
  const interviews = campaign.interviews ?? [];
  return (
    interviews.find((interview) => interview.status === "scheduled") ??
    interviews[interviews.length - 1]
  );
}

function getWorkflowState(
  campaign: Campaign,
  module: "setup" | "interviews" | "evidence" | "plan" | "report",
) {
  if (module === "setup") {
    return campaign.totalInterviews > 0 && campaign.questionCount > 0 ? "Complete" : "Needs input";
  }

  if (module === "interviews") {
    if (campaign.totalInterviews <= 0) return "Waiting";
    if (campaign.completedInterviews >= campaign.totalInterviews) return "Complete";
    return `Interview ${campaign.completedInterviews + 1} ready`;
  }

  if (module === "evidence") {
    return campaign.completedInterviews > 0 ? "Evidence captured" : "Waiting for call";
  }

  if (module === "plan") {
    return campaign.completedInterviews > 0 ? "Sharper plan ready" : "Baseline plan";
  }

  return getReportReadiness(campaign) >= 100 ? "Ready to share" : "Drafting";
}

function StatusPill({
  children,
  tone = "neutral",
}: {
  children: string;
  tone?: "accent" | "warm" | "neutral";
}) {
  const toneClassName =
    tone === "accent"
      ? "bg-[var(--accent-wash)] text-[var(--accent-ink)]"
      : tone === "warm"
        ? "bg-[var(--status-wash)] text-[var(--status-ink)]"
        : "bg-[var(--panel-strong)] text-[var(--muted)]";

  return (
    <span className={`w-fit rounded-md px-2.5 py-1 text-xs font-semibold ${toneClassName}`}>
      {children}
    </span>
  );
}

function ProgressBar({ value }: { value: number }) {
  return (
    <div className="h-2 overflow-hidden rounded-full bg-[var(--panel-strong)]">
      <div
        className="h-full rounded-full bg-[var(--accent)]"
        style={{ width: `${Math.max(0, Math.min(100, value))}%` }}
      />
    </div>
  );
}

function StatTile({ label, value, detail }: { label: string; value: string; detail: string }) {
  return (
    <article className="rounded-lg border border-[var(--line)] bg-[var(--panel)] p-4">
      <p className="text-xs font-semibold uppercase tracking-[0.12em] text-[var(--muted)]">
        {label}
      </p>
      <p className="mt-3 font-mono text-2xl font-semibold text-[var(--accent-ink)]">{value}</p>
      <p className="mt-2 text-sm leading-6 text-[var(--muted)]">{detail}</p>
    </article>
  );
}

function WorkflowModule({
  title,
  status,
  detail,
  active = false,
}: {
  title: string;
  status: string;
  detail: string;
  active?: boolean;
}) {
  return (
    <article
      className={`rounded-lg border p-4 ${
        active
          ? "border-[var(--accent-soft)] bg-[var(--accent-wash)]"
          : "border-[var(--line)] bg-[var(--panel)]"
      }`}
    >
      <div className="flex items-start justify-between gap-3">
        <h3 className="text-sm font-semibold text-[var(--foreground)]">{title}</h3>
        <span
          className={`h-2.5 w-2.5 rounded-full ${
            active ? "bg-[var(--accent)]" : "bg-[var(--line)]"
          }`}
          aria-hidden="true"
        />
      </div>
      <p className="mt-3 text-base font-semibold text-[var(--accent-ink)]">{status}</p>
      <p className="mt-2 text-sm leading-6 text-[var(--muted)]">{detail}</p>
    </article>
  );
}

function CampaignCard({ campaign, onOpen }: { campaign: Campaign; onOpen: (href: string) => void }) {
  const isLinkedCampaign = Boolean(campaign.detailHref);
  const completionPercent = getCompletionPercent(campaign);

  function openCampaign() {
    if (campaign.detailHref) {
      onOpen(campaign.detailHref);
    }
  }

  function handleKeyDown(event: KeyboardEvent<HTMLDivElement>) {
    if (!isLinkedCampaign) {
      return;
    }

    if (event.key === "Enter" || event.key === " ") {
      event.preventDefault();
      openCampaign();
    }
  }

  return (
    <article
      role={isLinkedCampaign ? "link" : undefined}
      tabIndex={isLinkedCampaign ? 0 : undefined}
      aria-label={isLinkedCampaign ? `Open ${campaign.name}` : undefined}
      onClick={isLinkedCampaign ? openCampaign : undefined}
      onKeyDown={isLinkedCampaign ? handleKeyDown : undefined}
      className={`rounded-lg border border-[var(--line)] bg-[var(--panel)] p-4 transition ${
        isLinkedCampaign
          ? "cursor-pointer hover:-translate-y-0.5 hover:border-[var(--accent-soft)] hover:shadow-sm focus:outline-none focus:ring-2 focus:ring-[var(--accent-soft)]"
          : ""
      }`}
    >
      <div className="flex min-h-40 flex-col">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <StatusPill tone={completionPercent > 0 ? "accent" : "warm"}>
              {getCampaignStage(campaign)}
            </StatusPill>
            <h3 className="mt-3 text-lg font-semibold leading-6 text-[var(--foreground)]">
              {campaign.name}
            </h3>
          </div>
          <p className="shrink-0 font-mono text-sm font-semibold text-[var(--accent-ink)]">
            {campaign.completedInterviews}/{campaign.totalInterviews}
          </p>
        </div>

        <p className="mt-3 line-clamp-3 text-sm leading-6 text-[var(--muted)]">{campaign.goal}</p>

        <div className="mt-auto pt-5">
          <ProgressBar value={completionPercent} />
          <div className="mt-3 flex flex-wrap gap-2 text-xs font-semibold text-[var(--accent-ink)]">
            <span className="rounded bg-[var(--accent-wash)] px-2 py-1">
              {pluralize(campaign.totalInterviews, "contact")}
            </span>
            <span className="rounded bg-[var(--panel-strong)] px-2 py-1">
              {pluralize(campaign.supportingDocumentNames?.length ?? 0, "doc")}
            </span>
            <span className="rounded bg-[var(--panel-strong)] px-2 py-1">
              {pluralize(campaign.questionCount, "AI prompt")}
            </span>
          </div>
        </div>
      </div>
    </article>
  );
}

function InterviewPanel({ interview }: { interview?: CampaignInterview }) {
  if (!interview) {
    return (
      <div className="rounded-lg border border-[var(--line)] bg-[var(--panel)] p-4">
        <p className="text-sm font-semibold text-[var(--foreground)]">Next interview</p>
        <p className="mt-2 text-sm leading-6 text-[var(--muted)]">
          Add contacts to place the next participant in the campaign queue.
        </p>
      </div>
    );
  }

  return (
    <div className="rounded-lg border border-[var(--line)] bg-[var(--panel)] p-4">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.12em] text-[var(--muted)]">
            Next interview
          </p>
          <h3 className="mt-2 text-lg font-semibold text-[var(--foreground)]">
            {interview.participant}
          </h3>
          <p className="mt-1 text-sm text-[var(--muted)]">
            {interview.role}, {interview.company}
          </p>
        </div>
        <StatusPill tone={interview.status === "completed" ? "accent" : "warm"}>
          {interview.status}
        </StatusPill>
      </div>
      <p className="mt-4 text-sm leading-6 text-[var(--muted)]">{interview.summary}</p>
    </div>
  );
}

export default function Home() {
  const router = useRouter();
  const [view, setView] = useState<View>("home");
  const [campaigns, setCampaigns] = useState(initialCampaigns);
  const [draft, setDraft] = useState<CampaignDraft>(emptyDraft);
  const [pendingCampaign, setPendingCampaign] = useState<CampaignDraft | null>(null);
  const [questions, setQuestions] = useState<string[]>(buildInitialQuestions(""));

  function openCreateCampaign() {
    setDraft(emptyDraft());
    setPendingCampaign(null);
    setQuestions(buildInitialQuestions(""));
    setView("create");
    scrollToTop();
  }

  function goHome() {
    setView("home");
    scrollToTop();
  }

  function openCampaign(href: string) {
    router.push(href);
  }

  async function handleCreateSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    const form = event.currentTarget;
    const formData = new FormData(form);
    const supportingDocuments = Array.from(formData.getAll("supportingDocuments")).filter(
      (value): value is File => value instanceof File && value.name.length > 0,
    );
    const contactsCsv = formData.get("contactsCsv");

    if (!(contactsCsv instanceof File) || contactsCsv.name.length === 0) {
      return;
    }

    const nextDraft = {
      ...draft,
      supportingDocumentNames: supportingDocuments.map((file) => file.name),
      contactsFileName: contactsCsv.name,
      contactCount: await countCsvContacts(contactsCsv),
    };

    setDraft(nextDraft);
    setPendingCampaign(nextDraft);
    setQuestions(buildInitialQuestions(nextDraft.goal));
    setView("questions");
    scrollToTop();
  }

  function updateQuestion(index: number, value: string) {
    setQuestions((currentQuestions) =>
      currentQuestions.map((question, questionIndex) =>
        questionIndex === index ? value : question,
      ),
    );
  }

  function removeQuestion(index: number) {
    setQuestions((currentQuestions) =>
      currentQuestions.filter((_, questionIndex) => questionIndex !== index),
    );
  }

  function addQuestion() {
    setQuestions((currentQuestions) => [...currentQuestions, ""]);
  }

  function startCampaign() {
    if (!pendingCampaign) {
      return;
    }

    const cleanedQuestions = questions.map((question) => question.trim()).filter(Boolean);

    setCampaigns((currentCampaigns) => [
      {
        id: `campaign-${Date.now()}`,
        name: pendingCampaign.name,
        goal: pendingCampaign.goal,
        completedInterviews: 0,
        totalInterviews: pendingCampaign.contactCount,
        contactsFileName: pendingCampaign.contactsFileName,
        supportingDocumentNames: pendingCampaign.supportingDocumentNames,
        additionalContext: pendingCampaign.additionalContext,
        questionCount: cleanedQuestions.length,
      },
      ...currentCampaigns,
    ]);
    setView("success");
    scrollToTop();
  }

  if (view === "create") {
    return (
      <main className="min-h-screen px-4 py-6 md:px-8 md:py-8">
        <div className="mx-auto max-w-5xl">
          <PageHeader title="Create Campaign" onHome={goHome} />

          <form onSubmit={handleCreateSubmit} className="relative mt-8 pb-24">
            <section className="grid gap-5 rounded-lg border border-[var(--line)] bg-[var(--panel)] p-4 shadow-sm md:p-6">
              <label className="grid gap-2">
                <span className="text-sm font-semibold text-[var(--foreground)]">Name</span>
                <input
                  required
                  type="text"
                  value={draft.name}
                  onChange={(event) => setDraft({ ...draft, name: event.target.value })}
                  className="h-11 rounded-md border border-[var(--line)] bg-white px-3 text-base text-[var(--foreground)] outline-none transition focus:border-[var(--accent)] focus:ring-2 focus:ring-[var(--accent-soft)]"
                />
              </label>

              <label className="grid gap-2">
                <span className="text-sm font-semibold text-[var(--foreground)]">Goal</span>
                <input
                  required
                  type="text"
                  value={draft.goal}
                  onChange={(event) => setDraft({ ...draft, goal: event.target.value })}
                  className="h-11 rounded-md border border-[var(--line)] bg-white px-3 text-base text-[var(--foreground)] outline-none transition focus:border-[var(--accent)] focus:ring-2 focus:ring-[var(--accent-soft)]"
                />
              </label>

              <label className="grid gap-2">
                <span className="text-sm font-semibold text-[var(--foreground)]">
                  Supporting documents
                </span>
                <input
                  type="file"
                  name="supportingDocuments"
                  multiple
                  accept=".pdf,.doc,.docx,.md,application/pdf,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document,text/markdown"
                  className="block min-h-11 rounded-md border border-dashed border-[var(--line)] bg-white px-3 py-2.5 text-sm text-[var(--muted)] file:mr-4 file:rounded-md file:border-0 file:bg-[var(--panel-strong)] file:px-3 file:py-1.5 file:text-sm file:font-semibold file:text-[var(--foreground)] hover:border-[var(--accent-soft)]"
                />
              </label>

              <label className="grid gap-2">
                <span className="text-sm font-semibold text-[var(--foreground)]">
                  Additional context
                </span>
                <textarea
                  rows={8}
                  value={draft.additionalContext}
                  onChange={(event) =>
                    setDraft({ ...draft, additionalContext: event.target.value })
                  }
                  className="min-h-40 resize-y rounded-md border border-[var(--line)] bg-white px-3 py-3 text-base leading-6 text-[var(--foreground)] outline-none transition focus:border-[var(--accent)] focus:ring-2 focus:ring-[var(--accent-soft)]"
                />
              </label>

              <label className="grid gap-2">
                <span className="text-sm font-semibold text-[var(--foreground)]">
                  Contacts CSV
                </span>
                <input
                  required
                  type="file"
                  name="contactsCsv"
                  accept=".csv,text/csv"
                  className="block min-h-11 rounded-md border border-dashed border-[var(--line)] bg-white px-3 py-2.5 text-sm text-[var(--muted)] file:mr-4 file:rounded-md file:border-0 file:bg-[var(--panel-strong)] file:px-3 file:py-1.5 file:text-sm file:font-semibold file:text-[var(--foreground)] hover:border-[var(--accent-soft)]"
                />
              </label>
            </section>

            <div className="fixed bottom-6 right-4 z-10 md:right-8">
              <button
                type="submit"
                className="inline-flex h-12 min-w-32 items-center justify-center rounded-md bg-[var(--accent)] px-6 text-base font-semibold text-white shadow-lg shadow-slate-900/10 transition hover:opacity-90 focus:outline-none focus:ring-2 focus:ring-[var(--accent)] focus:ring-offset-2 focus:ring-offset-[var(--background)]"
              >
                Next
              </button>
            </div>
          </form>
        </div>
      </main>
    );
  }

  if (view === "questions") {
    return (
      <main className="min-h-screen px-4 py-6 md:px-8 md:py-8">
        <div className="mx-auto max-w-5xl">
          <PageHeader title="Questions" onHome={goHome} />

          <section className="mt-8 overflow-hidden rounded-lg border border-[var(--line)] bg-[var(--panel)] shadow-sm">
            <ul className="divide-y divide-[var(--line)]">
              {questions.map((question, index) => (
                <li key={`question-${index}`} className="grid grid-cols-[1fr_3rem]">
                  <textarea
                    value={question}
                    rows={2}
                    onChange={(event) => updateQuestion(index, event.target.value)}
                    className="min-h-20 resize-y border-0 bg-transparent px-4 py-4 text-base leading-6 text-[var(--foreground)] outline-none transition focus:bg-[var(--accent-wash)] md:px-5"
                    aria-label={`Question ${index + 1}`}
                  />
                  <button
                    type="button"
                    onClick={() => removeQuestion(index)}
                    className="flex min-h-20 items-center justify-center border-l border-[var(--line)] text-xl font-semibold text-[var(--muted)] transition hover:bg-[var(--status-wash)] hover:text-[var(--warn)] focus:outline-none focus:ring-2 focus:ring-inset focus:ring-[var(--warn)]"
                    aria-label={`Remove question ${index + 1}`}
                  >
                    X
                  </button>
                </li>
              ))}
            </ul>
          </section>

          <div className="mt-5 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <button
              type="button"
              onClick={addQuestion}
              className="inline-flex h-11 items-center justify-center rounded-md border border-[var(--line)] bg-white px-4 text-sm font-semibold text-[var(--foreground)] transition hover:bg-[var(--panel-strong)] focus:outline-none focus:ring-2 focus:ring-[var(--accent-soft)]"
            >
              Add question
            </button>
            <button
              type="button"
              onClick={startCampaign}
              className="inline-flex h-11 items-center justify-center rounded-md bg-[var(--accent)] px-5 text-sm font-semibold text-white transition hover:opacity-90 focus:outline-none focus:ring-2 focus:ring-[var(--accent)] focus:ring-offset-2 focus:ring-offset-[var(--background)]"
            >
              Start campaign
            </button>
          </div>
        </div>
      </main>
    );
  }

  if (view === "success") {
    return (
      <main className="min-h-screen px-4 py-6 md:px-8 md:py-8">
        <div className="mx-auto max-w-5xl">
          <PageHeader title="" onHome={goHome} />

          <section className="flex min-h-[55vh] items-center justify-center">
            <h1 className="text-center text-3xl font-semibold tracking-normal text-[var(--foreground)] md:text-5xl">
              Campaign successfully started!
            </h1>
          </section>
        </div>
      </main>
    );
  }

  const activeCampaign = campaigns[0];
  const completedInterviewCount = campaigns.reduce(
    (total, campaign) => total + campaign.completedInterviews,
    0,
  );
  const totalInterviewCount = campaigns.reduce(
    (total, campaign) => total + campaign.totalInterviews,
    0,
  );
  const activeCampaignCount = campaigns.filter(
    (campaign) => campaign.completedInterviews < campaign.totalInterviews,
  ).length;
  const nextInterview = getNextInterview(activeCampaign);
  const activeCompletionPercent = getCompletionPercent(activeCampaign);
  const reportReadiness = getReportReadiness(activeCampaign);
  const activeCampaignHref = activeCampaign.detailHref;

  return (
    <main className="min-h-screen px-4 py-6 md:px-8 md:py-8">
      <div className="mx-auto flex max-w-7xl flex-col gap-5">
        <header className="flex flex-col gap-5 border-b border-[var(--line)] pb-5 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <p className="text-sm font-semibold uppercase tracking-[0.16em] text-[var(--accent)]">
              Meridian
            </p>
            <h1 className="mt-2 text-3xl font-semibold tracking-normal text-[var(--foreground)] md:text-5xl">
              Campaign Operations
            </h1>
            <p className="mt-3 max-w-3xl text-base leading-7 text-[var(--muted)]">
              Manage AI-led discovery campaigns from research setup through interviews, synthesis,
              adaptive plans, and stakeholder reports.
            </p>
          </div>

          <div className="flex flex-col gap-2 sm:flex-row">
            {activeCampaignHref ? (
              <button
                type="button"
                onClick={() => openCampaign(activeCampaignHref)}
                className="inline-flex h-10 items-center justify-center rounded-md border border-[var(--line)] bg-white px-4 text-sm font-semibold text-[var(--foreground)] transition hover:bg-[var(--panel-strong)] focus:outline-none focus:ring-2 focus:ring-[var(--accent-soft)]"
              >
                Open active campaign
              </button>
            ) : null}
            <button
              type="button"
              onClick={openCreateCampaign}
              className="inline-flex h-10 items-center justify-center rounded-md bg-[var(--accent)] px-4 text-sm font-semibold text-white transition hover:opacity-90 focus:outline-none focus:ring-2 focus:ring-[var(--accent)] focus:ring-offset-2 focus:ring-offset-[var(--background)]"
            >
              New campaign
            </button>
          </div>
        </header>

        <section className="grid gap-3 md:grid-cols-3">
          <StatTile
            label="Campaigns"
            value={String(campaigns.length)}
            detail={`${activeCampaignCount} active, ${campaigns.length - activeCampaignCount} complete or paused`}
          />
          <StatTile
            label="Interviews"
            value={`${completedInterviewCount}/${totalInterviewCount}`}
            detail="Completed across the current research portfolio"
          />
          <StatTile
            label="Report readiness"
            value={`${reportReadiness}%`}
            detail={`${activeCampaign.name} is the active campaign`}
          />
        </section>

        <section className="grid gap-5 lg:grid-cols-[1fr_24rem]">
          <article className="rounded-lg border border-[var(--accent-soft)] bg-[var(--panel)] p-5 shadow-sm md:p-6">
            <div className="flex flex-col gap-5 xl:flex-row xl:items-start xl:justify-between">
              <div className="max-w-3xl">
                <div className="flex flex-wrap items-center gap-2">
                  <StatusPill tone="accent">{getCampaignStage(activeCampaign)}</StatusPill>
                  <StatusPill>{activeCampaign.contactsFileName ?? "No contact file"}</StatusPill>
                </div>
                <h2 className="mt-4 text-2xl font-semibold tracking-normal text-[var(--foreground)] md:text-3xl">
                  {activeCampaign.name}
                </h2>
                <p className="mt-3 text-base leading-7 text-[var(--muted)]">
                  {activeCampaign.goal}
                </p>
              </div>

              <div className="min-w-48 rounded-lg border border-[var(--line)] bg-[var(--panel-strong)] p-4">
                <p className="font-mono text-3xl font-semibold text-[var(--accent-ink)]">
                  {activeCampaign.completedInterviews}/{activeCampaign.totalInterviews}
                </p>
                <p className="mt-1 text-xs font-semibold uppercase tracking-[0.12em] text-[var(--muted)]">
                  interviews completed
                </p>
                <div className="mt-4">
                  <ProgressBar value={activeCompletionPercent} />
                </div>
              </div>
            </div>

            <div className="mt-6 grid gap-3 md:grid-cols-5">
              <WorkflowModule
                title="Setup"
                status={getWorkflowState(activeCampaign, "setup")}
                detail={`${pluralize(activeCampaign.totalInterviews, "contact")} and ${pluralize(
                  activeCampaign.supportingDocumentNames?.length ?? 0,
                  "doc",
                )}`}
              />
              <WorkflowModule
                title="Interview Ops"
                status={getWorkflowState(activeCampaign, "interviews")}
                detail="Queue, voice session, transcript fallback"
                active={activeCampaign.completedInterviews < activeCampaign.totalInterviews}
              />
              <WorkflowModule
                title="Evidence"
                status={getWorkflowState(activeCampaign, "evidence")}
                detail={`${activeCampaign.completedInterviews} transcript source${
                  activeCampaign.completedInterviews === 1 ? "" : "s"
                }`}
                active={activeCampaign.completedInterviews > 0}
              />
              <WorkflowModule
                title="Adaptive Plan"
                status={getWorkflowState(activeCampaign, "plan")}
                detail={`${pluralize(activeCampaign.questionCount, "AI prompt")} in the plan`}
                active={activeCampaign.completedInterviews > 0}
              />
              <WorkflowModule
                title="Synthesis"
                status={getWorkflowState(activeCampaign, "report")}
                detail={`${reportReadiness}% report readiness`}
                active={reportReadiness >= 50}
              />
            </div>
          </article>

          <aside className="grid gap-4">
            <InterviewPanel interview={nextInterview} />

            <div className="rounded-lg border border-[var(--line)] bg-[var(--panel)] p-4">
              <div className="flex items-center justify-between gap-4">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-[0.12em] text-[var(--muted)]">
                    Report
                  </p>
                  <h3 className="mt-2 text-lg font-semibold text-[var(--foreground)]">
                    Stakeholder draft
                  </h3>
                </div>
                <p className="font-mono text-lg font-semibold text-[var(--accent-ink)]">
                  {reportReadiness}%
                </p>
              </div>
              <div className="mt-4">
                <ProgressBar value={reportReadiness} />
              </div>
              <p className="mt-4 text-sm leading-6 text-[var(--muted)]">
                {activeCampaign.report?.executiveSummary ??
                  "The report will appear after Meridian has evidence from the campaign."}
              </p>
            </div>
          </aside>
        </section>

        <section className="grid gap-5 lg:grid-cols-[0.95fr_1.05fr]">
          <article className="rounded-lg border border-[var(--line)] bg-[var(--panel)] p-5">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.12em] text-[var(--muted)]">
                  Living insights
                </p>
                <h2 className="mt-2 text-xl font-semibold text-[var(--foreground)]">
                  Current campaign signal
                </h2>
              </div>
              <StatusPill tone={activeCampaign.completedInterviews > 0 ? "accent" : "warm"}>
                {activeCampaign.completedInterviews > 0 ? "Evidence-backed" : "Pre-interview"}
              </StatusPill>
            </div>
            <p className="mt-4 text-sm leading-7 text-[var(--muted)]">
              {activeCampaign.highLevelFindings ??
                "No findings yet. Meridian will update this once interviews complete."}
            </p>
          </article>

          <article className="rounded-lg border border-[var(--line)] bg-[var(--panel)] p-5">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.12em] text-[var(--muted)]">
                  Campaign assets
                </p>
                <h2 className="mt-2 text-xl font-semibold text-[var(--foreground)]">
                  Inputs tied to this run
                </h2>
              </div>
              <StatusPill>{pluralize(activeCampaign.questionCount, "AI prompt")}</StatusPill>
            </div>

            <div className="mt-5 grid gap-3 sm:grid-cols-3">
              <div className="rounded-lg bg-[var(--panel-strong)] p-4">
                <p className="text-xs font-semibold uppercase tracking-[0.12em] text-[var(--muted)]">
                  Contacts
                </p>
                <p className="mt-2 text-sm font-semibold text-[var(--foreground)]">
                  {activeCampaign.contactsFileName ?? "Not uploaded"}
                </p>
              </div>
              <div className="rounded-lg bg-[var(--panel-strong)] p-4">
                <p className="text-xs font-semibold uppercase tracking-[0.12em] text-[var(--muted)]">
                  Documents
                </p>
                <p className="mt-2 text-sm font-semibold text-[var(--foreground)]">
                  {(activeCampaign.supportingDocumentNames ?? []).join(", ") || "None"}
                </p>
              </div>
              <div className="rounded-lg bg-[var(--panel-strong)] p-4">
                <p className="text-xs font-semibold uppercase tracking-[0.12em] text-[var(--muted)]">
                  Next stage
                </p>
                <p className="mt-2 text-sm font-semibold text-[var(--foreground)]">
                  {getCampaignStage(activeCampaign)}
                </p>
              </div>
            </div>
          </article>
        </section>

        <section>
          <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.12em] text-[var(--muted)]">
                Portfolio
              </p>
              <h2 className="mt-2 text-2xl font-semibold text-[var(--foreground)]">
                Discovery campaigns
              </h2>
            </div>
            <button
              type="button"
              onClick={openCreateCampaign}
              className="inline-flex h-10 items-center justify-center rounded-md border border-[var(--line)] bg-white px-4 text-sm font-semibold text-[var(--foreground)] transition hover:bg-[var(--panel-strong)] focus:outline-none focus:ring-2 focus:ring-[var(--accent-soft)]"
            >
              Add campaign
            </button>
          </div>

          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
            {campaigns.map((campaign) => (
              <CampaignCard key={campaign.id} campaign={campaign} onOpen={openCampaign} />
            ))}
          </div>
        </section>
      </div>
    </main>
  );
}

function PageHeader({ title, onHome }: { title: string; onHome: () => void }) {
  return (
    <header className="flex min-h-14 items-center justify-between gap-4 border-b border-[var(--line)] pb-5">
      {title ? (
        <h1 className="text-3xl font-semibold tracking-normal text-[var(--foreground)] md:text-4xl">
          {title}
        </h1>
      ) : (
        <span aria-hidden="true" />
      )}
      <button
        type="button"
        onClick={onHome}
        className="inline-flex h-10 items-center justify-center rounded-md border border-[var(--line)] bg-white px-4 text-sm font-semibold text-[var(--foreground)] transition hover:bg-[var(--panel-strong)] focus:outline-none focus:ring-2 focus:ring-[var(--accent-soft)]"
      >
        Home
      </button>
    </header>
  );
}
