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
  const isCompleted = campaign.completedInterviews === campaign.totalInterviews;
  return (
    <>
      <div className="min-w-0">
        <h2 className="truncate text-base font-bold text-[var(--foreground)] group-hover:text-[var(--accent)] transition-colors">
          {campaign.name}
        </h2>
      </div>
      <p className="min-w-0 text-sm leading-relaxed text-[var(--muted)] md:truncate">
        {campaign.goal}
      </p>
      <div className="flex flex-wrap gap-2 text-[11px] font-bold">
        <span className="inline-flex items-center rounded-lg bg-[var(--accent-wash)] px-2.5 py-1 text-[var(--accent)] border border-blue-100">
          <svg className="w-3.5 h-3.5 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a3 3 0 11-6 0 3 3 0 016 0z" />
          </svg>
          {campaign.totalInterviews} contacts
        </span>
        <span className="inline-flex items-center rounded-lg bg-slate-100 px-2.5 py-1 text-slate-600 border border-slate-200">
          <svg className="w-3.5 h-3.5 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
          </svg>
          {campaign.supportingDocumentNames?.length ?? 0} docs
        </span>
        <span className="inline-flex items-center rounded-lg bg-slate-100 px-2.5 py-1 text-slate-600 border border-slate-200">
          <svg className="w-3.5 h-3.5 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8.228 9c.549-1.165 2.03-2 3.772-2 2.21 0 4 1.343 4 3 0 1.4-1.278 2.575-3.006 2.907-.542.104-.994.54-.994 1.093m0 3h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          {campaign.questionCount} questions
        </span>
      </div>
      <div className="flex flex-col gap-1.5 items-end justify-center">
        <p className={`font-mono text-xs font-extrabold px-2 py-0.5 rounded-full border ${isCompleted ? "bg-emerald-50 text-emerald-700 border-emerald-200" : "bg-[var(--accent-wash)] text-[var(--accent)] border-blue-100"}`}>
          {campaign.completedInterviews}/{campaign.totalInterviews} completed
        </p>
        <div className="w-24 bg-slate-200 h-1 rounded-full overflow-hidden hidden md:block">
          <div
            className={`h-full rounded-full transition-all duration-500 ${isCompleted ? "bg-emerald-500" : "bg-[var(--accent)]"}`}
            style={{ width: `${(campaign.completedInterviews / campaign.totalInterviews) * 100}%` }}
          />
        </div>
      </div>
    </>
  );
}

function CampaignRow({ campaign, onOpen }: { campaign: Campaign; onOpen: (href: string) => void }) {
  const rowClassName =
    "grid w-full gap-3 px-6 py-5 transition-all duration-200 md:grid-cols-[18rem_1fr_15rem_12rem] md:items-center md:gap-6 border-b border-slate-100 last:border-0 group";
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
          ? "cursor-pointer hover:bg-[var(--accent-wash)]/40 focus:bg-[var(--accent-wash)]/40 focus:outline-none"
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
  const [supportingFilesText, setSupportingFilesText] = useState<string>("");
  const [contactsFileText, setContactsFileText] = useState<string>("");
  const [createStep, setCreateStep] = useState<number>(1);

  function openCreateCampaign() {
    setDraft(emptyDraft());
    setPendingCampaign(null);
    setQuestions(buildInitialQuestions(""));
    setSupportingFilesText("");
    setContactsFileText("");
    setCreateStep(1);
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

  function handleSupportingDocsChange(e: React.ChangeEvent<HTMLInputElement>) {
    const files = e.target.files;
    if (files && files.length > 0) {
      const names = Array.from(files).map((f) => f.name).join(", ");
      setSupportingFilesText(names);
    } else {
      setSupportingFilesText("");
    }
  }

  function handleContactsChange(e: React.ChangeEvent<HTMLInputElement>) {
    const files = e.target.files;
    if (files && files.length > 0) {
      setContactsFileText(files[0].name);
    } else {
      setContactsFileText("");
    }
  }

  function nextStep() {
    if (createStep === 1 && !draft.name.trim()) return;
    if (createStep === 2 && !draft.goal.trim()) return;
    setCreateStep((s) => s + 1);
    scrollToTop();
  }

  function prevStep() {
    if (createStep > 1) {
      setCreateStep((s) => s - 1);
      scrollToTop();
    }
  }

  if (view === "create") {
    return (
      <main className="min-h-screen px-4 py-8 md:px-8 md:py-12 flex flex-col justify-center items-center">
        <div className="w-full max-w-3xl">
          <PageHeader title="Create Campaign" onHome={goHome} />

          <form onSubmit={handleCreateSubmit} noValidate className="relative mt-8 w-full">
            <section className="rounded-none border border-slate-200 bg-white/95 p-8 md:p-14 shadow-[0_12px_40px_rgba(10,102,194,0.04)] min-h-[420px] flex flex-col justify-between relative overflow-hidden">
              <div className="absolute top-0 right-0 w-64 h-64 bg-gradient-to-bl from-blue-100/20 to-transparent rounded-full blur-3xl pointer-events-none" />

              {/* Multi-step progress bar */}
              <div className="mb-10">
                <div className="w-full bg-slate-100 h-2.5 rounded-full overflow-hidden shadow-inner">
                  <div
                    className="h-full bg-[var(--accent)] transition-all duration-300 rounded-full"
                    style={{ width: `${(createStep / 5) * 100}%` }}
                  />
                </div>
              </div>

              {/* Step Contents */}
              <div className="flex-1 flex flex-col justify-center">
                {/* Step 1: Campaign Name */}
                <div className={createStep === 1 ? "block animate-step-in" : "hidden"}>
                  <label className="grid gap-4">
                    <div>
                      <h3 className="text-2xl md:text-3xl font-black tracking-tight text-[var(--foreground)]">What is the campaign name?</h3>
                      <p className="text-sm text-[var(--muted)] mt-1.5">Give your discovery research campaign a clear, identifiable name.</p>
                    </div>
                    <input
                      required={createStep === 1}
                      type="text"
                      placeholder="e.g. Developer APIs Feedback loop"
                      value={draft.name}
                      onChange={(event) => setDraft({ ...draft, name: event.target.value })}
                      className="h-14 rounded-2xl border border-slate-200 bg-white px-5 text-base text-[var(--foreground)] outline-none transition focus:border-[var(--accent)] focus:ring-4 focus:ring-blue-100/70 shadow-sm mt-3 w-full"
                    />
                  </label>
                </div>

                {/* Step 2: Research Goal */}
                <div className={createStep === 2 ? "block animate-step-in" : "hidden"}>
                  <label className="grid gap-4">
                    <div>
                      <h3 className="text-2xl md:text-3xl font-black tracking-tight text-[var(--foreground)]">What is the research goal?</h3>
                      <p className="text-sm text-[var(--muted)] mt-1.5">Define what you want the AI operator to learn from the participants.</p>
                    </div>
                    <input
                      required={createStep === 2}
                      type="text"
                      placeholder="e.g. Find out why developers struggle with OAuth setup in React"
                      value={draft.goal}
                      onChange={(event) => setDraft({ ...draft, goal: event.target.value })}
                      className="h-14 rounded-2xl border border-slate-200 bg-white px-5 text-base text-[var(--foreground)] outline-none transition focus:border-[var(--accent)] focus:ring-4 focus:ring-blue-100/70 shadow-sm mt-3 w-full"
                    />
                  </label>
                </div>

                {/* Step 3: Supporting Documents */}
                <div className={createStep === 3 ? "block animate-step-in" : "hidden"}>
                  <div className="grid gap-4">
                    <div>
                      <h3 className="text-2xl md:text-3xl font-black tracking-tight text-[var(--foreground)]">Attach supporting documents</h3>
                      <p className="text-sm text-[var(--muted)] mt-1.5">Provide background docs (PRDs, design briefs, notes) to help the AI prepare.</p>
                    </div>
                    
                    {/* Green confirmation box - always rendered conditionally, but inputs remain in DOM */}
                    {supportingFilesText && (
                      <div key="supporting-confirmation" className="flex items-center justify-between gap-3 bg-emerald-50/50 border border-emerald-200/60 rounded-2xl p-5 transition mt-3">
                        <div className="flex items-center gap-3 text-emerald-700 min-w-0">
                          <svg className="w-6 h-6 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                          </svg>
                          <span className="text-sm font-bold truncate">{supportingFilesText}</span>
                        </div>
                        <button
                          type="button"
                          onClick={() => {
                            setSupportingFilesText("");
                            const el = document.getElementById("supportingDocumentsInput") as HTMLInputElement;
                            if (el) el.value = "";
                          }}
                          className="text-sm font-bold text-slate-400 hover:text-rose-600 transition"
                        >
                          Clear
                        </button>
                      </div>
                    )}
                    
                    {/* Dropzone container - stays in DOM, toggles hidden style */}
                    <div key="supporting-dropzone" className={`relative border-2 border-dashed border-slate-300 hover:border-[var(--accent)] rounded-2xl py-12 px-8 bg-slate-50/40 hover:bg-slate-50/80 transition-all flex flex-col items-center justify-center text-center cursor-pointer mt-3 ${supportingFilesText ? "hidden" : "flex"}`}>
                      <svg className="w-10 h-10 text-slate-400 mb-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.8" d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
                      </svg>
                      <span className="text-sm font-bold text-slate-700">Select supporting documents</span>
                      <span className="text-xs text-slate-500 mt-1">PDF, DOC, DOCX, MD (optional)</span>
                      <input
                        id="supportingDocumentsInput"
                        type="file"
                        name="supportingDocuments"
                        multiple
                        accept=".pdf,.doc,.docx,.md,application/pdf,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document,text/markdown"
                        onChange={handleSupportingDocsChange}
                        className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                      />
                    </div>
                  </div>
                </div>

                {/* Step 4: Additional Context */}
                <div className={createStep === 4 ? "block animate-step-in" : "hidden"}>
                  <label className="grid gap-4">
                    <div>
                      <h3 className="text-2xl md:text-3xl font-black tracking-tight text-[var(--foreground)]">Provide additional context</h3>
                      <p className="text-sm text-[var(--muted)] mt-1.5">Add details, guidelines, or persona summaries to calibrate the AI operator.</p>
                    </div>
                    <textarea
                      rows={5}
                      placeholder="Context details or instructions to guide the AI operator..."
                      value={draft.additionalContext}
                      onChange={(event) =>
                        setDraft({ ...draft, additionalContext: event.target.value })
                      }
                      className="min-h-36 resize-y rounded-2xl border border-slate-200 bg-white px-5 py-4 text-base leading-relaxed text-[var(--foreground)] outline-none transition focus:border-[var(--accent)] focus:ring-4 focus:ring-blue-100/70 shadow-sm mt-3"
                    />
                  </label>
                </div>

                {/* Step 5: Contacts CSV */}
                <div className={createStep === 5 ? "block animate-step-in" : "hidden"}>
                  <div className="grid gap-4">
                    <div>
                      <h3 className="text-2xl md:text-3xl font-black tracking-tight text-[var(--foreground)]">Upload contacts CSV</h3>
                      <p className="text-sm text-[var(--muted)] mt-1.5">Specify who the AI should call. Must contain headers: Name, Email, Company, Title.</p>
                    </div>
                    
                    {/* Green confirmation box */}
                    {contactsFileText && (
                      <div key="contacts-confirmation" className="flex items-center justify-between gap-3 bg-emerald-50/50 border border-emerald-200/60 rounded-2xl p-5 transition mt-3">
                        <div className="flex items-center gap-3 text-emerald-700 min-w-0">
                          <svg className="w-6 h-6 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                          </svg>
                          <span className="text-sm font-bold truncate">{contactsFileText}</span>
                        </div>
                        <button
                          type="button"
                          onClick={() => {
                            setContactsFileText("");
                            const el = document.getElementById("contactsCsvInput") as HTMLInputElement;
                            if (el) el.value = "";
                          }}
                          className="text-xs font-bold text-slate-400 hover:text-rose-600 transition"
                        >
                          Clear
                        </button>
                      </div>
                    )}
                    
                    {/* Dropzone container - always in DOM, toggle display classes */}
                    <div key="contacts-dropzone" className={`relative border-2 border-dashed border-slate-300 hover:border-[var(--accent)] rounded-2xl py-12 px-8 bg-slate-50/40 hover:bg-slate-50/80 transition-all flex flex-col items-center justify-center text-center cursor-pointer mt-3 ${contactsFileText ? "hidden" : "flex"}`}>
                      <svg className="w-10 h-10 text-slate-400 mb-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.8" d="M12 4v16m8-8H4" />
                      </svg>
                      <span className="text-sm font-bold text-slate-700">Upload Contacts CSV</span>
                      <span className="text-xs text-slate-500 mt-1">Required · CSV format containing name, email, company, title</span>
                      <input
                        id="contactsCsvInput"
                        required={createStep === 5}
                        type="file"
                        name="contactsCsv"
                        accept=".csv,text/csv"
                        onChange={handleContactsChange}
                        className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                      />
                    </div>
                  </div>
                </div>
              </div>
            </section>

            {/* Stepper Navigation Buttons */}
            <div className="mt-8 flex justify-between gap-4">
              {createStep > 1 ? (
                <button
                  type="button"
                  onClick={prevStep}
                  className="inline-flex h-12 items-center justify-center rounded-none border border-slate-200 bg-white px-6 text-sm font-bold text-[var(--foreground)] hover:bg-slate-50 transition shadow-sm active:scale-95 cursor-pointer"
                >
                  <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M15 19l-7-7 7-7" />
                  </svg>
                  Back
                </button>
              ) : (
                <button
                  type="button"
                  onClick={goHome}
                  className="inline-flex h-12 items-center justify-center rounded-none border border-slate-200 bg-white px-6 text-sm font-bold text-[var(--foreground)] hover:bg-slate-50 transition shadow-sm active:scale-95 cursor-pointer"
                >
                  Cancel
                </button>
              )}

              {createStep < 5 ? (
                <button
                  type="button"
                  onClick={nextStep}
                  disabled={
                    (createStep === 1 && !draft.name.trim()) ||
                    (createStep === 2 && !draft.goal.trim())
                  }
                  className="inline-flex h-12 min-w-36 items-center justify-center rounded-none bg-[var(--accent)] hover:bg-[#0855a1] px-6 text-sm font-bold text-white shadow-[0_4px_14px_rgba(10,102,194,0.18)] hover:shadow-[0_4px_24px_rgba(10,102,194,0.35)] transition-all duration-300 transform active:scale-95 ml-auto cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Next
                  <svg className="w-4 h-4 ml-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M9 5l7 7-7 7" />
                  </svg>
                </button>
              ) : (
                <button
                  type="submit"
                  disabled={!contactsFileText}
                  className="inline-flex h-12 min-w-36 items-center justify-center rounded-none bg-[var(--accent)] hover:bg-[#0855a1] px-6 text-sm font-bold text-white shadow-[0_4px_14px_rgba(10,102,194,0.18)] hover:shadow-[0_4px_24px_rgba(10,102,194,0.35)] transition-all duration-300 transform active:scale-95 ml-auto cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Create
                </button>
              )}
            </div>
          </form>
        </div>
      </main>
    );
  }

  if (view === "questions") {
    return (
      <main className="min-h-screen px-4 py-8 md:px-8 md:py-12">
        <div className="mx-auto max-w-3xl">
          <PageHeader title="Review Question Bank" onHome={goHome} />

          <p className="text-sm text-[var(--muted)] mt-2">
            These questions were compiled from your goal. Edit them or add new questions before initiating the operator.
          </p>

          <section className="mt-6 overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
            <ul className="divide-y divide-slate-100">
              {questions.map((question, index) => (
                <li key={`question-${index}`} className="grid grid-cols-[1fr_3.5rem] items-stretch group transition">
                  <textarea
                    value={question}
                    rows={1}
                    onChange={(event) => {
                      updateQuestion(index, event.target.value);
                      event.target.style.height = "auto";
                      event.target.style.height = `${event.target.scrollHeight}px`;
                    }}
                    ref={(el) => {
                      if (el) {
                        el.style.height = "auto";
                        el.style.height = `${el.scrollHeight}px`;
                      }
                    }}
                    className="resize-none overflow-hidden border-0 bg-transparent px-5 py-3 text-sm leading-relaxed text-[var(--foreground)] outline-none transition focus:bg-[var(--accent-wash)]/20"
                    aria-label={`Question ${index + 1}`}
                  />
                  <button
                    type="button"
                    onClick={() => removeQuestion(index)}
                    className="flex h-full items-center justify-center border-l border-slate-100 text-slate-400 hover:bg-rose-50 hover:text-rose-600 transition focus:outline-none"
                    aria-label={`Remove question ${index + 1}`}
                  >
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                    </svg>
                  </button>
                </li>
              ))}
            </ul>
          </section>

          <div className="mt-6 flex flex-col gap-3.5 sm:flex-row sm:items-center sm:justify-between">
            <button
              type="button"
              onClick={addQuestion}
              className="inline-flex h-11 items-center justify-center rounded-xl border border-slate-200 bg-white px-5 text-sm font-semibold text-[var(--foreground)] transition hover:bg-slate-50 active:scale-95"
            >
              Add question
            </button>
            <button
              type="button"
              onClick={startCampaign}
              className="inline-flex h-11 items-center justify-center rounded-xl bg-[var(--accent)] hover:bg-[#0855a1] px-6 text-sm font-semibold text-white shadow-[0_4px_12px_rgba(10,102,194,0.15)] transition active:scale-95"
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
      <main className="min-h-screen px-4 py-8 md:px-8 md:py-12 flex items-center justify-center">
        <div className="mx-auto max-w-md w-full rounded-2xl border border-slate-200 bg-white/90 backdrop-blur-md p-8 md:p-10 shadow-[0_12px_40px_rgba(0,0,0,0.03)] relative overflow-hidden">
          <div className="absolute top-0 right-0 w-32 h-32 bg-emerald-100/30 rounded-full blur-xl pointer-events-none" />
          <div className="flex flex-col items-center text-center">
            <div className="w-16 h-16 bg-emerald-100 text-emerald-600 rounded-full flex items-center justify-center mb-6 shadow-inner animate-pulse">
              <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M5 13l4 4L19 7" />
              </svg>
            </div>
            <h1 className="text-2xl font-bold tracking-tight text-[var(--foreground)] mb-2">
              Campaign started!
            </h1>
            <p className="text-xs text-[var(--muted)] mb-8 leading-relaxed">
              Your AI research operator is now preparing personalized dossiers and scheduling discovery interviews.
            </p>
            <button
              type="button"
              onClick={goHome}
              className="w-full inline-flex h-11 items-center justify-center rounded-xl bg-[var(--accent)] hover:bg-[#0855a1] px-6 text-sm font-semibold text-white shadow-sm transition active:scale-95"
            >
              Return to Dashboard
            </button>
          </div>
        </div>
      </main>
    );
  }

  const totalCompleted = campaigns.reduce((sum, c) => sum + c.completedInterviews, 0);
  const totalContacts = campaigns.reduce((sum, c) => sum + c.totalInterviews, 0);
  const totalQuestions = campaigns.reduce((sum, c) => sum + c.questionCount, 0);
  const schedulingRate = totalContacts > 0 ? Math.min(100, Math.round((totalCompleted / totalContacts) * 100 + 12)) : 0;

  return (
    <main className="min-h-screen px-4 py-8 md:px-8 md:py-12">
      <div className="mx-auto max-w-6xl">
        {/* Banner header */}
        <div className="relative overflow-hidden rounded-none bg-white border border-slate-200/70 p-6 md:p-8 shadow-[0_8px_30px_rgb(0,0,0,0.015)] mb-8">
          <div className="absolute top-0 right-0 w-64 h-64 bg-gradient-to-bl from-blue-100/40 to-transparent rounded-full blur-3xl pointer-events-none" />
          <div className="relative flex flex-col md:flex-row md:items-center md:justify-between gap-4">
            <div>
              <h1 className="text-3xl font-extrabold tracking-tight text-[var(--foreground)] md:text-4xl">
                Campaign Management
              </h1>
              <p className="text-sm text-[var(--muted)] mt-1.5 max-w-xl">
                Manage your autonomous research operators, configure discovery loops, and synthesize stakeholder reports.
              </p>
            </div>
            <button
              type="button"
              onClick={openCreateCampaign}
              className="inline-flex h-11 items-center justify-center rounded-none bg-[var(--accent)] hover:bg-[#0855a1] px-5 text-sm font-semibold text-white shadow-[0_4px_12px_rgba(10,102,194,0.15)] hover:shadow-[0_4px_20px_rgba(10,102,194,0.3)] transition-all duration-300 transform active:scale-95"
            >
              <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M12 4v16m8-8H4" />
              </svg>
              New Campaign
            </button>
          </div>
        </div>

        {/* High-level stats section */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
          <div className="bg-white border border-slate-200 p-5 rounded-none shadow-sm flex flex-col justify-between">
            <span className="text-[10px] font-bold uppercase tracking-wider text-[var(--muted)]">Interviews Conducted</span>
            <div className="mt-2 flex items-baseline gap-2">
              <span className="text-3xl font-black text-[var(--foreground)]">{totalCompleted}</span>
              <span className="text-[10px] text-emerald-600 font-bold">Live</span>
            </div>
          </div>
          <div className="bg-white border border-slate-200 p-5 rounded-none shadow-sm flex flex-col justify-between">
            <span className="text-[10px] font-bold uppercase tracking-wider text-[var(--muted)]">Scheduling Rate</span>
            <div className="mt-2 flex items-baseline gap-2">
              <span className="text-3xl font-black text-[var(--foreground)]">{schedulingRate}%</span>
              <span className="text-[10px] text-[var(--accent)] font-bold">Target 80%+</span>
            </div>
          </div>
          <div className="bg-white border border-slate-200 p-5 rounded-none shadow-sm flex flex-col justify-between">
            <span className="text-[10px] font-bold uppercase tracking-wider text-[var(--muted)]">Active Campaigns</span>
            <div className="mt-2 flex items-baseline gap-2">
              <span className="text-3xl font-black text-[var(--foreground)]">{campaigns.length}</span>
              <span className="text-[10px] text-slate-400 font-medium">Running</span>
            </div>
          </div>
          <div className="bg-white border border-slate-200 p-5 rounded-none shadow-sm flex flex-col justify-between">
            <span className="text-[10px] font-bold uppercase tracking-wider text-[var(--muted)]">Questions Calibrated</span>
            <div className="mt-2 flex items-baseline gap-2">
              <span className="text-3xl font-black text-[var(--foreground)]">{totalQuestions}</span>
              <span className="text-[10px] text-[var(--accent)] font-bold">Across loops</span>
            </div>
          </div>
        </div>

        <section className="overflow-hidden rounded-none border border-slate-200 bg-white/95 backdrop-blur-md shadow-sm">
          <div className="grid grid-cols-[1fr_auto] gap-4 border-b border-slate-100 bg-slate-50/50 px-6 py-4 text-[10px] font-bold uppercase tracking-wider text-[var(--muted)] md:grid-cols-[18rem_1fr_15rem_12rem]">
            <span>Name</span>
            <span className="hidden md:block">Goal</span>
            <span className="hidden md:block">Inputs</span>
            <span className="text-right">Status</span>
          </div>

          <ul className="divide-y divide-slate-100">
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
    <header className="flex min-h-14 items-center justify-between gap-4 border-b border-slate-200 pb-5">
      {title ? (
        <h1 className="text-2xl font-extrabold tracking-tight text-[var(--foreground)] md:text-3xl">
          {title}
        </h1>
      ) : (
        <span aria-hidden="true" />
      )}
      <button
        type="button"
        onClick={onHome}
        className="inline-flex h-10 items-center justify-center rounded-xl border border-slate-200 bg-white px-4 text-sm font-semibold text-[var(--foreground)] transition hover:bg-slate-50 shadow-sm active:scale-95"
      >
        Home
      </button>
    </header>
  );
}
