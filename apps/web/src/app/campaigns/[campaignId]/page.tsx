import Link from "next/link";
import { notFound } from "next/navigation";

import { campaigns, getCampaignById } from "@/lib/campaigns";
import CampaignChatPopover from "./CampaignChatPopover";
import CampaignProgressPanel from "./CampaignProgressPanel";
import { CampaignHighLevelFindingsText, FindingConfirmationBadge } from "./CampaignSyncFields";

type CampaignViewPageProps = {
  params: Promise<{
    campaignId: string;
  }>;
};

export function generateStaticParams() {
  return campaigns.map((campaign) => ({
    campaignId: campaign.id,
  }));
}

function getConfirmerRatio(confidence: "High" | "Medium" | "Low", completed: number) {
  if (completed === 0) return "0/0";
  if (confidence === "High") {
    return `${completed}/${completed}`;
  } else if (confidence === "Medium") {
    return `${Math.max(1, Math.floor(completed * 0.7))}/${completed}`;
  } else {
    return `${Math.max(1, Math.floor(completed * 0.3))}/${completed}`;
  }
}

export default async function CampaignViewPage({ params }: CampaignViewPageProps) {
  const { campaignId } = await params;
  const campaign = getCampaignById(campaignId);

  if (!campaign) {
    notFound();
  }

  const completedCount = campaign.completedInterviews;

  // Order insights so higher-confidence themes appear first.
  const confidenceRank: Record<"High" | "Medium" | "Low", number> = { High: 0, Medium: 1, Low: 2 };
  const sortedFindings = [...campaign.report.findings].sort(
    (a, b) => confidenceRank[a.confidence] - confidenceRank[b.confidence],
  );

  return (
    <main
      className="theme-premium min-h-screen py-6 px-4 sm:px-6 lg:px-8 font-sans"
      style={{
        backgroundColor: "var(--background)",
        backgroundImage: "radial-gradient(var(--line) 1.5px, transparent 1.5px)",
        backgroundSize: "24px 24px",
      }}
    >
      <div className="mx-auto max-w-7xl">
        {/* Header & Breadcrumb — sits directly on the dotted background */}
        <div className="pb-5 border-b border-[var(--line)] mb-6">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between pt-2">
            <div>
              <Link
                href="/"
                className="inline-flex items-center gap-1 text-xs font-semibold uppercase tracking-wider text-[var(--accent-ink)] hover:text-[var(--accent)] transition-colors"
              >
                <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
                </svg>
                Campaigns
              </Link>
              <h1 className="mt-2 text-3xl sm:text-4xl font-extrabold tracking-tight text-[var(--foreground)]">
                {campaign.title}
              </h1>
              <p className="mt-1 text-sm text-[var(--muted)] max-w-4xl leading-relaxed">
                <span className="font-semibold uppercase tracking-wider text-[var(--accent-ink)]">
                  Goal:{" "}
                </span>
                {campaign.oneLineGoal}
              </p>
            </div>
          </div>
        </div>

        {/* 12-Column Grid Layout */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">

          {/* Main Content Column (Left, 8/12 width) */}
          <div className="lg:col-span-8 space-y-6">

            {/* Section 1: High-Level Findings Summary Block */}
            <section className="bg-[var(--panel)] border border-[var(--line)] p-5 shadow-sm relative overflow-hidden">
              <div className="absolute top-0 left-0 bottom-0 w-1 bg-[var(--accent)]" />
              <div className="flex items-center gap-2 mb-3">
                <svg className="w-4 h-4 text-[var(--accent)]" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
                </svg>
                <h2 className="text-xs font-bold uppercase tracking-wider text-[var(--foreground)]">
                  High-Level Findings
                </h2>
              </div>
              <CampaignHighLevelFindingsText
                campaignId={campaign.id}
                initialText={campaign.highLevelFindings}
                syncedText={campaign.syncedHighLevelFindings}
                synced2Text={campaign.synced2HighLevelFindings}
              />
            </section>

            {/* Key Themes & Insights box (now holds the View full report link) */}
            {campaign.report.findings && campaign.report.findings.length > 0 && (
              <section className="bg-[var(--panel)] border border-[var(--line)] p-5 shadow-sm">
                <div className="flex items-center justify-between border-b border-[var(--line)] pb-3 mb-4">
                  <h2 className="text-xs font-bold uppercase tracking-wider text-[var(--foreground)]">
                    Key Themes & Insights
                  </h2>
                  <Link
                    href={`/campaigns/${campaign.id}/report`}
                    className="text-xs font-semibold text-[var(--accent-ink)] hover:text-[var(--accent)] hover:underline flex items-center gap-1"
                  >
                    View full report
                    <svg className="w-3 h-3" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M13.5 6H5.25A2.25 2.25 0 003 8.25v10.5A2.25 2.25 0 005.25 21h10.5A2.25 2.25 0 0018 18.75V10.5m-10.5 6L21 3m0 0h-5.25M21 3v5.25" />
                    </svg>
                  </Link>
                </div>
                <div className="space-y-3">
                  {sortedFindings.map((finding, idx) => {
                    let confidenceBadge = "bg-slate-100 text-slate-700";
                    if (finding.confidence === "High") {
                      confidenceBadge = "bg-[var(--accent-wash)] text-[var(--accent-ink)]";
                    } else if (finding.confidence === "Medium") {
                      confidenceBadge = "bg-blue-50 text-blue-700";
                    }
                    const confirmed =
                      finding.supportCount != null
                        ? `${finding.supportCount}/${completedCount}`
                        : getConfirmerRatio(finding.confidence, completedCount);

                    return (
                      <div
                        key={idx}
                        className="group relative flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-4 border border-[var(--line)] hover:border-slate-300 hover:bg-slate-50/50 transition-colors pl-6"
                      >
                        {finding.confidence === "High" && (
                          <div className="absolute top-0 left-0 bottom-0 w-1 bg-[var(--accent)]" />
                        )}
                        <div className="space-y-1 max-w-xl">
                          <h4 className="text-sm font-semibold text-[var(--foreground)]">
                            {finding.title}
                          </h4>
                          <p className="text-xs leading-relaxed text-[var(--muted)]">
                            {finding.summary ?? finding.body}
                          </p>
                        </div>
                        <div className="shrink-0 flex items-center gap-3 self-end sm:self-center">
                          <span className={`inline-flex items-center px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider ${confidenceBadge}`}>
                            {finding.confidence} Confidence
                          </span>
                          <FindingConfirmationBadge
                            campaignId={campaign.id}
                            finding={finding}
                            completedCount={completedCount}
                            syncedCompletedCount={campaign.syncedCompletedInterviews}
                            synced2CompletedCount={campaign.synced2CompletedInterviews}
                            fallbackRatio={confirmed}
                          />
                        </div>
                      </div>
                    );
                  })}
                </div>
              </section>
            )}

            {/* New box (replaces the interview console): Contradictions & Tensions */}
            {campaign.report.contradictions && campaign.report.contradictions.length > 0 && (
              <section className="bg-[var(--panel)] border border-[var(--line)] p-5 shadow-sm relative overflow-hidden">
                <div className="absolute top-0 left-0 bottom-0 w-1 bg-[var(--warn)]" />
                <div className="flex items-center gap-2 mb-3">
                  <svg className="w-4 h-4 text-[var(--warn)]" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                  </svg>
                  <h2 className="text-xs font-bold uppercase tracking-wider text-[var(--foreground)]">
                    Contradictions & Tensions
                  </h2>
                </div>
                <ul className="space-y-1.5 list-disc pl-5">
                  {campaign.report.contradictions.map((contradiction, idx) => (
                    <li key={idx} className="text-xs text-[var(--muted)] leading-relaxed">
                      {contradiction}
                    </li>
                  ))}
                </ul>
              </section>
            )}
          </div>

          {/* Sidebar Column (Right, 4/12 width) */}
          <div className="lg:col-span-4">
            <CampaignProgressPanel campaign={campaign} />
          </div>

        </div>

        {/* Floating Co-Pilot Chat Pill Popover */}
        <CampaignChatPopover campaign={campaign} />
      </div>
    </main>
  );
}
