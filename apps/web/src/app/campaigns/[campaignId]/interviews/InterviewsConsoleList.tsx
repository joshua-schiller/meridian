"use client";

import { useState } from "react";

type Interview = {
  id: string;
  interviewNumber: number;
  participant: string;
  role: string;
  company: string;
  status: string;
  summary: string;
  highlights: string[];
};

export default function InterviewsConsoleList({ interviews }: { interviews: Interview[] }) {
  const completed = interviews.filter((i) => i.status === "completed");
  const inProgress = interviews.filter((i) => i.status !== "completed");

  const [isCompletedOpen, setIsCompletedOpen] = useState(true);
  const [isInProgressOpen, setIsInProgressOpen] = useState(true);

  return (
    <div className="grid gap-6">
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
    </div>
  );
}

function InterviewCard({ interview }: { interview: Interview }) {
  const isCompleted = interview.status === "completed";
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
                {isCompleted ? (
                  <svg className="w-5 h-5 text-emerald-500 shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                ) : (
                  <svg className="w-5 h-5 text-amber-500 shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                )}
                <span>{highlight}</span>
              </li>
            ))}
          </ul>
        </div>
      )}
    </article>
  );
}
