"use client";

import { useRouter } from "next/navigation";
import { type FormEvent, type KeyboardEvent, useState } from "react";

import { campaigns as campaignFixtures } from "@/lib/campaigns";

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

function CampaignRowContent({ campaign }: { campaign: Campaign }) {
  return (
    <>
      <div className="min-w-0">
        <h2 className="truncate text-base font-semibold text-[var(--foreground)]">
          {campaign.name}
        </h2>
        {campaign.contactsFileName ? (
          <p className="mt-1 truncate font-mono text-xs text-[var(--muted)] md:hidden">
            {campaign.contactsFileName}
          </p>
        ) : null}
      </div>
      <p className="min-w-0 text-sm leading-6 text-[var(--muted)] md:truncate">
        {campaign.goal}
      </p>
      <div className="flex flex-wrap gap-2 text-xs font-semibold text-[var(--accent-ink)]">
        <span className="rounded bg-[var(--accent-wash)] px-2 py-1">
          {campaign.totalInterviews} contacts
        </span>
        <span className="rounded bg-[var(--panel-strong)] px-2 py-1">
          {campaign.supportingDocumentNames?.length ?? 0} docs
        </span>
        <span className="rounded bg-[var(--panel-strong)] px-2 py-1">
          {campaign.questionCount} questions
        </span>
      </div>
      <p className="font-mono text-sm font-semibold text-[var(--accent-ink)] md:text-right">
        {campaign.completedInterviews}/{campaign.totalInterviews} interviews completed
      </p>
    </>
  );
}

function CampaignRow({ campaign, onOpen }: { campaign: Campaign; onOpen: (href: string) => void }) {
  const rowClassName =
    "grid w-full gap-3 px-4 py-4 transition md:grid-cols-[18rem_1fr_14rem_13rem] md:items-center md:gap-4 md:px-5";
  const isLinkedCampaign = Boolean(campaign.detailHref);

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
    <div
      role={isLinkedCampaign ? "link" : undefined}
      tabIndex={isLinkedCampaign ? 0 : undefined}
      aria-label={isLinkedCampaign ? `Open ${campaign.name}` : undefined}
      onClick={isLinkedCampaign ? openCampaign : undefined}
      onKeyDown={isLinkedCampaign ? handleKeyDown : undefined}
      className={`${rowClassName} ${
        isLinkedCampaign
          ? "cursor-pointer hover:bg-[var(--accent-wash)] focus:bg-[var(--accent-wash)] focus:outline-none focus:ring-2 focus:ring-inset focus:ring-[var(--accent)]"
          : ""
      }`}
    >
      <CampaignRowContent campaign={campaign} />
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

  return (
    <main className="min-h-screen px-4 py-6 md:px-8 md:py-8">
      <div className="mx-auto max-w-6xl">
        <header className="flex items-center justify-between gap-4 border-b border-[var(--line)] pb-5">
          <h1 className="text-3xl font-semibold tracking-normal text-[var(--foreground)] md:text-4xl">
            Campaigns
          </h1>
          <button
            type="button"
            onClick={openCreateCampaign}
            className="inline-flex h-10 items-center justify-center rounded-md bg-[var(--accent)] px-4 text-sm font-semibold text-white transition hover:opacity-90 focus:outline-none focus:ring-2 focus:ring-[var(--accent)] focus:ring-offset-2 focus:ring-offset-[var(--background)]"
          >
            New
          </button>
        </header>

        <section className="mt-6 overflow-hidden rounded-lg border border-[var(--line)] bg-[var(--panel)]">
          <div className="grid grid-cols-[1fr_auto] gap-4 border-b border-[var(--line)] bg-[var(--panel-strong)] px-4 py-3 text-xs font-semibold uppercase tracking-[0.12em] text-[var(--muted)] md:grid-cols-[18rem_1fr_14rem_13rem] md:px-5">
            <span>Name</span>
            <span className="hidden md:block">Goal</span>
            <span className="hidden md:block">Inputs</span>
            <span className="text-right">Status</span>
          </div>

          <ul className="divide-y divide-[var(--line)]">
            {campaigns.map((campaign) => (
              <li key={campaign.id}>
                <CampaignRow campaign={campaign} onOpen={openCampaign} />
              </li>
            ))}
          </ul>
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
