"use client";

import { useEffect, useState } from "react";

type TranscriptTurn = {
  speaker: string;
  text: string;
};

type Interview = {
  id: string;
  interviewNumber: number;
  participant: string;
  role: string;
  company: string;
  status: string;
  summary: string;
  highlights: string[];
  transcript?: TranscriptTurn[];
};

export default function InterviewsConsoleList({ interviews }: { interviews: Interview[] }) {
  const completed = interviews.filter((i) => i.status === "completed");
  const inProgress = interviews.filter((i) => i.status !== "completed");

  const [isCompletedOpen, setIsCompletedOpen] = useState(false);
  const [isInProgressOpen, setIsInProgressOpen] = useState(false);

  return (
    <div className="grid gap-6">
      {/* Completed Section */}
      <div>
        <button
          type="button"
          onClick={() => setIsCompletedOpen(!isCompletedOpen)}
          className="w-full flex items-center justify-between border border-slate-200 bg-white px-6 py-4 hover:bg-slate-50/80 transition-all duration-200 cursor-pointer shadow-sm select-none"
        >
          <div className="flex items-center gap-3">
            <h3 className="text-base font-bold text-[var(--foreground)]">Completed ({completed.length})</h3>
            <span className="rounded-full bg-emerald-50 px-2 py-0.5 text-[10px] font-extrabold uppercase tracking-wider text-emerald-700 border border-emerald-200/50">
              Synthesized
            </span>
          </div>
          <svg
            className={`w-5 h-5 text-slate-400 transition-transform duration-300 ${isCompletedOpen ? "rotate-180" : ""}`}
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M19 9l-7 7-7-7" />
          </svg>
        </button>

        {isCompletedOpen && (
          <div className="mt-4 grid gap-4">
            {completed.length === 0 ? (
              <p className="text-sm text-[var(--muted)] bg-slate-50 border border-dashed border-slate-200 p-8 text-center">
                No completed interviews yet.
              </p>
            ) : (
              completed.map((interview) => (
                <InterviewCard key={interview.id} interview={interview} />
              ))
            )}
          </div>
        )}
      </div>

      {/* In Progress Section */}
      <div>
        <button
          type="button"
          onClick={() => setIsInProgressOpen(!isInProgressOpen)}
          className="w-full flex items-center justify-between border border-slate-200 bg-white px-6 py-4 hover:bg-slate-50/80 transition-all duration-200 cursor-pointer shadow-sm select-none"
        >
          <div className="flex items-center gap-3">
            <h3 className="text-base font-bold text-[var(--foreground)]">In Progress ({inProgress.length})</h3>
            <span className="rounded-full bg-amber-50 px-2 py-0.5 text-[10px] font-extrabold uppercase tracking-wider text-amber-700 border border-amber-200/50">
              Active
            </span>
          </div>
          <svg
            className={`w-5 h-5 text-slate-400 transition-transform duration-300 ${isInProgressOpen ? "rotate-180" : ""}`}
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M19 9l-7 7-7-7" />
          </svg>
        </button>

        {isInProgressOpen && (
          <div className="mt-4 grid gap-4">
            {inProgress.length === 0 ? (
              <p className="text-sm text-[var(--muted)] bg-slate-50 border border-dashed border-slate-200 p-8 text-center">
                No interviews currently in progress.
              </p>
            ) : (
              inProgress.map((interview) => (
                <InterviewCard key={interview.id} interview={interview} />
              ))
            )}
          </div>
        )}
      </div>
    </div>
  );
}

function InterviewCard({ interview }: { interview: Interview }) {
  const isCompleted = interview.status === "completed";
  const [isTranscriptOpen, setIsTranscriptOpen] = useState(false);
  // Only completed interviews have a finished transcript to view; the ones still
  // in progress are mid-conversation.
  const hasTranscript = isCompleted && Boolean(interview.transcript && interview.transcript.length > 0);
  return (
    <article className="relative overflow-hidden rounded-none border border-slate-200 bg-white p-6 md:p-8 shadow-sm hover:shadow-md transition-all duration-300 flex flex-col gap-5">
      {/* Status Vertical Bar */}
      <div className={`absolute top-0 left-0 w-1.5 h-full ${isCompleted ? "bg-emerald-500" : "bg-amber-500"}`} />

      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between border-b border-slate-100 pb-4">
        <div className="pl-2">
          <span className="text-[9px] font-extrabold uppercase tracking-widest text-[var(--muted)]">
            Interview #{interview.interviewNumber}
          </span>
          <h3 className="text-lg font-bold text-[var(--foreground)] mt-0.5">
            {interview.participant}
          </h3>
          <p className="text-xs text-[var(--muted)]">
            {interview.role} at <strong className="font-semibold text-slate-700">{interview.company}</strong>
          </p>
        </div>
        <span
          className={`w-fit rounded-full px-3 py-1 text-[10px] font-bold uppercase tracking-wider border ${
            isCompleted
              ? "bg-emerald-50 text-emerald-700 border-emerald-200"
              : "bg-amber-50 text-amber-700 border-amber-200"
          }`}
        >
          {interview.status}
        </span>
      </div>

      {isCompleted ? (
        <>
          <div className="pl-2">
            <h4 className="text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-1.5">Interview Summary</h4>
            <p className="text-sm leading-relaxed text-[var(--muted)]">{interview.summary}</p>
          </div>

          {interview.highlights.length > 0 && (
            <div className="pl-2">
              <h4 className="text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-3">Key Highlights</h4>
              <ul className="grid gap-3">
                {interview.highlights.map((highlight) => (
                  <li key={highlight} className="flex items-start gap-3 text-sm text-[var(--muted)] leading-relaxed">
                    <svg className="w-5 h-5 text-emerald-500 shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                    <span>{highlight}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}

          {hasTranscript && (
            <div className="flex justify-end -mt-1">
              <button
                type="button"
                onClick={() => setIsTranscriptOpen(true)}
                className="inline-flex items-center gap-1.5 border border-[var(--accent)]/30 bg-[var(--accent-wash)] px-3 py-1.5 text-xs font-semibold text-[var(--accent)] hover:bg-[var(--accent-soft)] hover:border-[var(--accent)]/60 transition-all duration-200 cursor-pointer"
              >
                <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 12h8M8 8h8m-8 8h5M5 4h14a1 1 0 011 1v11a1 1 0 01-1 1h-6l-4 3v-3H5a1 1 0 01-1-1V5a1 1 0 011-1z" />
                </svg>
                View transcript
              </button>
            </div>
          )}
        </>
      ) : (
        <div className="pl-2 flex items-center gap-3 py-2">
          <span className="relative flex h-2.5 w-2.5 shrink-0">
            <span className="absolute inline-flex h-full w-full rounded-full bg-amber-400 opacity-75 animate-ping" />
            <span className="relative inline-flex h-2.5 w-2.5 rounded-full bg-amber-500" />
          </span>
          <div>
            <h4 className="text-[10px] font-bold uppercase tracking-wider text-amber-600">Synthesis pending</h4>
            <p className="text-sm text-[var(--muted)]">
              Interview in progress — summary and highlights will appear once it wraps.
            </p>
          </div>
        </div>
      )}

      {isTranscriptOpen && hasTranscript && (
        <TranscriptModal interview={interview} onClose={() => setIsTranscriptOpen(false)} />
      )}
    </article>
  );
}

function TranscriptModal({ interview, onClose }: { interview: Interview; onClose: () => void }) {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    document.addEventListener("keydown", onKey);
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = prevOverflow;
    };
  }, [onClose]);

  const turns = interview.transcript ?? [];

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6"
      role="dialog"
      aria-modal="true"
      aria-label={`Transcript with ${interview.participant}`}
    >
      <div
        className="absolute inset-0 bg-slate-900/50 backdrop-blur-sm"
        onClick={onClose}
        aria-hidden="true"
      />
      <div className="relative z-10 flex max-h-[85vh] w-full max-w-2xl flex-col border border-slate-200 bg-white shadow-2xl">
        {/* Header */}
        <div className="flex items-start justify-between gap-4 border-b border-slate-200 bg-white px-6 py-5">
          <div>
            <span className="text-[9px] font-extrabold uppercase tracking-widest text-[var(--accent)]">
              Interview #{interview.interviewNumber} · Transcript
            </span>
            <h3 className="mt-0.5 text-lg font-bold text-[var(--foreground)]">{interview.participant}</h3>
            <p className="text-xs text-[var(--muted)]">
              {interview.role} at <strong className="font-semibold text-slate-700">{interview.company}</strong>
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close transcript"
            className="shrink-0 rounded-full p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-700 transition-colors cursor-pointer"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto px-6 py-6">
          <div className="grid gap-5">
            {turns.map((turn, i) => {
              const isAgent = turn.speaker === "agent";
              return (
                <div key={i} className={`flex flex-col gap-1.5 ${isAgent ? "items-start" : "items-end"}`}>
                  <span className="text-[9px] font-extrabold uppercase tracking-widest text-slate-400">
                    {isAgent ? "Meridian" : interview.participant}
                  </span>
                  <div
                    className={`max-w-[85%] px-4 py-3 text-sm leading-relaxed ${
                      isAgent
                        ? "bg-slate-50 border border-slate-200 text-slate-700"
                        : "bg-[var(--accent-wash)] border border-[var(--accent)]/20 text-[var(--foreground)]"
                    }`}
                  >
                    {turn.text}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}
