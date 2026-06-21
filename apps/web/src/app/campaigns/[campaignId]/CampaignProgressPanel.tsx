"use client";

import Link from "next/link";
import { useMemo, useState } from "react";

import type { Campaign } from "@/lib/campaigns";
import { PULSE_CAMPAIGN_SYNC_EVENT } from "./CampaignSyncFields";

type CampaignProgressPanelProps = {
  campaign: Campaign;
};

function getProgressState(completedCount: number, totalCount: number) {
  const progressPercent = totalCount > 0 ? Math.round((completedCount / totalCount) * 100) : 0;
  let statusLabel = "Draft";
  let progressColor = "stroke-slate-300";

  if (completedCount > 0) {
    if (completedCount === totalCount) {
      statusLabel = "Complete";
      progressColor = "stroke-emerald-500";
    } else {
      statusLabel = "In progress";
      progressColor = "stroke-[var(--accent)]";
    }
  }

  return { progressPercent, progressColor, statusLabel };
}

function SyncIcon() {
  return (
    <svg className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2.2" viewBox="0 0 24 24" aria-hidden="true">
      <path strokeLinecap="round" strokeLinejoin="round" d="M7.5 7.25A6.5 6.5 0 0 1 18 8.6" />
      <path strokeLinecap="round" strokeLinejoin="round" d="M18 4.75V8.6h-3.85" />
      <path strokeLinecap="round" strokeLinejoin="round" d="M16.5 16.75A6.5 6.5 0 0 1 6 15.4" />
      <path strokeLinecap="round" strokeLinejoin="round" d="M6 19.25V15.4h3.85" />
    </svg>
  );
}

export default function CampaignProgressPanel({ campaign }: CampaignProgressPanelProps) {
  const canSyncPulse = campaign.id === "pulse-adoption" && campaign.syncedCompletedInterviews != null;
  const [isSynced, setIsSynced] = useState(false);
  const completedCount = isSynced && campaign.syncedCompletedInterviews != null
    ? campaign.syncedCompletedInterviews
    : campaign.completedInterviews;
  const totalCount = campaign.totalInterviews;
  const { progressPercent, progressColor, statusLabel } = getProgressState(completedCount, totalCount);
  const radius = 45;
  const circumference = 2 * Math.PI * radius;
  const strokeDashoffset = circumference - (progressPercent / 100) * circumference;
  const questions = useMemo(
    () => (isSynced ? campaign.syncedCurrentQuestions : campaign.currentQuestions) ?? campaign.currentQuestions ?? [],
    [campaign.currentQuestions, campaign.syncedCurrentQuestions, isSynced],
  );

  function handleSync() {
    if (!canSyncPulse || isSynced) return;

    setIsSynced(true);
    window.dispatchEvent(new CustomEvent(PULSE_CAMPAIGN_SYNC_EVENT));
  }

  return (
    <div className="space-y-6">
      <div className="relative bg-[var(--panel)] border border-[var(--line)] p-6 shadow-sm flex flex-col items-center justify-center text-center">
        {canSyncPulse && (
          <button
            type="button"
            onClick={handleSync}
            aria-label="Sync completed interviews"
            title="Sync completed interviews"
            className={`absolute right-3 top-3 flex h-9 w-9 items-center justify-center border border-[var(--line)] bg-white text-[var(--accent-ink)] shadow-sm transition hover:border-[var(--accent)] hover:text-[var(--accent)] ${isSynced ? "opacity-60" : "hover:scale-95"}`}
          >
            <SyncIcon />
          </button>
        )}

        <div className="relative w-32 h-32 mb-4">
          <svg className="w-full h-full transform -rotate-90" viewBox="0 0 100 100">
            <circle cx="50" cy="50" r={radius} fill="none" stroke="var(--line)" strokeWidth="7" />
            <circle
              cx="50"
              cy="50"
              r={radius}
              fill="none"
              className={`${progressColor} transition-all duration-700 ease-out`}
              strokeWidth="7"
              strokeDasharray={circumference}
              strokeDashoffset={strokeDashoffset}
              strokeLinecap="round"
            />
          </svg>
          <div className="absolute inset-0 flex flex-col items-center justify-center">
            <span className="text-3xl font-extrabold text-[var(--foreground)] tracking-tight">
              {progressPercent}%
            </span>
            <span className="text-[10px] font-semibold text-[var(--muted)] uppercase tracking-wider">
              Complete
            </span>
          </div>
        </div>
        <p className="text-sm font-semibold text-[var(--foreground)]">
          {completedCount} of {totalCount} Interviews
        </p>
        <p className="text-xs text-[var(--muted)] mt-1">
          Campaign status: {statusLabel}
        </p>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div className="bg-[var(--panel)] border border-[var(--line)] p-4 shadow-sm">
          <span className="block text-2xl font-bold text-[var(--accent-ink)]">
            {campaign.report.findings?.length || 0}
          </span>
          <span className="text-[10px] font-bold text-[var(--muted)] uppercase tracking-wider block mt-1">
            Key Themes
          </span>
        </div>
        <div className="bg-[var(--panel)] border border-[var(--line)] p-4 shadow-sm">
          <span className="block text-2xl font-bold text-amber-700">
            {campaign.report.contradictions?.length || 0}
          </span>
          <span className="text-[10px] font-bold text-[var(--muted)] uppercase tracking-wider block mt-1">
            Conflicts
          </span>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3 pt-2">
        <Link
          href={`/campaigns/${campaign.id}/interviews`}
          target="_blank"
          rel="noopener noreferrer"
          className="flex items-center justify-center gap-1.5 bg-slate-800 hover:bg-slate-900 text-white text-xs font-bold uppercase tracking-wider py-3.5 px-4 shadow-sm transition-all duration-150 hover:scale-[0.98] select-none text-center cursor-pointer"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" d="M8.25 3v1.5M4.5 8.25H3m18 0h-1.5M4.5 12H3m18 0h-1.5m-15 3.75H3m18 0h-1.5M8.25 19.5V21M12 3v1.5m0 15V21m3.75-18v1.5m0 15V21m-9-1.5h10.5a2.25 2.25 0 002.25-2.25V6.75a2.25 2.25 0 00-2.25-2.25H6.75A2.25 2.25 0 004.5 6.75v10.5a2.25 2.25 0 002.25 2.25zm.075-12h9.9m-9.9 3.75h9.9m-9.9 3.75h9.9" />
          </svg>
          Console
        </Link>
        <Link
          href={`/campaigns/${campaign.id}/report`}
          className="flex items-center justify-center gap-1.5 bg-[var(--accent)] hover:bg-[#0855a1] text-white text-xs font-bold uppercase tracking-wider py-3.5 px-4 shadow-sm transition-all duration-150 hover:scale-[0.98] select-none text-center cursor-pointer"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 14.25v-2.625a3.375 3.375 0 00-3.375-3.375h-1.5A1.125 1.125 0 0113.5 7.125v-1.5a3.375 3.375 0 00-3.375-3.375H8.25m.75 12l3 3m0 0l3-3m-3 3v-6m-1.5-9H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 00-9-9z" />
          </svg>
          Report
        </Link>
      </div>

      {questions.length > 0 && (
        <section className="bg-[var(--panel)] border border-[var(--line)] p-4 shadow-sm">
          <div className="border-b border-[var(--line)] pb-3">
            <h2 className="text-xs font-bold uppercase tracking-wider text-[var(--foreground)]">
              Current Questions
            </h2>
          </div>
          <ol className="mt-4 space-y-3">
            {questions.map((item, index) => (
              <li key={`${item.question}-${index}`} className="grid grid-cols-[1.5rem_minmax(0,1fr)] gap-3 text-left">
                <span className="flex h-6 w-6 items-center justify-center border border-slate-200 bg-slate-50 text-[10px] font-extrabold text-slate-500">
                  {index + 1}
                </span>
                <span className="min-w-0">
                  <span className="block text-xs font-semibold leading-relaxed text-[var(--foreground)]">
                    {item.question}
                  </span>
                  <span className="mt-1 block text-[11px] leading-relaxed text-[var(--muted)]">
                    {item.rationale}
                  </span>
                </span>
              </li>
            ))}
          </ol>
        </section>
      )}

      {campaign.id === "pulse-adoption" && (
        <section className="bg-[var(--panel)] border border-[var(--line)] p-4 shadow-sm">
          <div className="flex items-start justify-between gap-3 border-b border-[var(--line)] pb-3">
            <div>
              <h2 className="text-xs font-bold uppercase tracking-wider text-[var(--foreground)]">
                AI Calibration Loop
              </h2>
              <p className="mt-1 text-[11px] leading-relaxed text-[var(--muted)]">
                Interview 8 shaped the Interview 9 plan.
              </p>
            </div>
            <span className={`shrink-0 border px-2 py-0.5 text-[9px] font-bold uppercase tracking-wider ${isSynced ? "border-emerald-200 bg-emerald-50 text-emerald-700" : "border-blue-200 bg-blue-50 text-[var(--accent)]"}`}>
              {isSynced ? "Interview 9 Complete" : "Interview 9 Queued"}
            </span>
          </div>

          <div className="mt-4 space-y-3">
            <div className="grid grid-cols-[4.5rem_minmax(0,1fr)] gap-3 text-xs leading-relaxed">
              <span className="text-[9px] font-extrabold uppercase tracking-widest text-slate-400">
                Signal
              </span>
              <p className="text-slate-700">
                Raj showed that power users need cross-team access, higher limits, and fewer guardrails.
              </p>
            </div>
            <div className="grid grid-cols-[4.5rem_minmax(0,1fr)] gap-3 text-xs leading-relaxed">
              <span className="text-[9px] font-extrabold uppercase tracking-widest text-[var(--accent)]">
                Shift
              </span>
              <p className="font-semibold text-[var(--foreground)]">
                Meridian used that contrast to ask Lucia whether non-technical Operations users need ready-made dashboards, clearer metric names, and freshness cues.
              </p>
            </div>
            <p className="border-t border-slate-100 pt-3 text-[11px] leading-relaxed text-[var(--muted)]">
              {isSynced
                ? "Lucia's completed interview now updates the campaign from 8/10 to 9/10 and strengthens the non-technical dashboard finding."
                : "Click sync to simulate Lucia's completed interview and promote the loop from 8/10 to 9/10."}
            </p>
          </div>
        </section>
      )}
    </div>
  );
}
