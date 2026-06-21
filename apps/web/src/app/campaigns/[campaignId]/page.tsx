import Link from "next/link";
import { notFound } from "next/navigation";

import { campaigns, getCampaignById } from "@/lib/campaigns";

import CampaignChatPopover from "./CampaignChatPopover";

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

export default async function CampaignViewPage({ params }: CampaignViewPageProps) {
  const { campaignId } = await params;
  const campaign = getCampaignById(campaignId);

  if (!campaign) {
    notFound();
  }

  const isAllCompleted = campaign.completedInterviews === campaign.totalInterviews;

  return (
    <main className="min-h-screen px-4 py-8 md:px-8 md:py-12">
      <div className="mx-auto max-w-5xl">
        <header className="relative overflow-hidden rounded-2xl bg-white border border-slate-200 p-6 md:p-8 shadow-[0_8px_30px_rgb(0,0,0,0.015)] mb-8">
          <div className="absolute top-0 right-0 w-64 h-64 bg-gradient-to-bl from-blue-100/30 to-transparent rounded-full blur-3xl pointer-events-none" />

          <div className="relative flex flex-col gap-6 md:flex-row md:items-start md:justify-between">
            <div className="min-w-0">
              <Link
                href="/"
                className="inline-flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-[var(--accent)] hover:text-[#0855a1] transition-colors"
              >
                <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M15 19l-7-7 7-7" />
                </svg>
                Campaigns
              </Link>
              <h1 className="mt-4 text-3xl font-extrabold tracking-tight text-[var(--foreground)] md:text-4xl">
                {campaign.title}
              </h1>
              <p className="mt-3 max-w-3xl text-sm leading-relaxed text-[var(--muted)]">
                {campaign.oneLineGoal}
              </p>
            </div>

            <div className="shrink-0 rounded-xl border border-slate-200/80 bg-slate-50/50 px-6 py-4 text-center md:text-right shadow-sm">
              <p className={`font-mono text-3xl font-extrabold ${isAllCompleted ? "text-emerald-600" : "text-[var(--accent)]"}`}>
                {campaign.completedInterviews}/{campaign.totalInterviews}
              </p>
              <p className="mt-1.5 text-[9px] font-bold uppercase tracking-widest text-[var(--muted)]">
                interviews completed
              </p>
            </div>
          </div>
        </header>

        <section className="mt-6">
          <div className="rounded-2xl border border-slate-200 bg-white/95 backdrop-blur-md p-6 md:p-8 shadow-sm relative overflow-hidden">
            <div className="absolute top-0 left-0 w-1.5 h-full bg-[var(--accent)]" />
            <h2 className="text-xs font-bold uppercase tracking-wider text-[var(--foreground)] border-b border-slate-100 pb-3">
              High-level findings
            </h2>
            <p className="mt-4 text-sm leading-relaxed text-[var(--muted)]">
              {campaign.highLevelFindings}
            </p>
          </div>
        </section>

        {/* Large Rectangular Actions at the Bottom with Thinner, Larger Font & One Word Per Line */}
        <section className="mt-8 grid grid-cols-1 md:grid-cols-2 gap-0 border border-slate-200 overflow-hidden shadow-sm">
          <Link
            href={`/campaigns/${campaign.id}/interviews`}
            target="_blank"
            rel="noopener noreferrer"
            className="flex flex-col items-center justify-center bg-slate-800 hover:bg-slate-900 text-white font-light text-3xl md:text-4xl py-12 md:py-16 tracking-wider transition-colors duration-200 rounded-none text-center cursor-pointer uppercase leading-tight select-none"
          >
            <span>Interviews</span>
            <span>Console</span>
          </Link>
          <Link
            href={`/campaigns/${campaign.id}/report`}
            className="flex flex-col items-center justify-center bg-[var(--accent)] hover:bg-[#0855a1] text-white font-light text-3xl md:text-4xl py-12 md:py-16 tracking-wider transition-colors duration-200 rounded-none text-center cursor-pointer uppercase leading-tight select-none"
          >
            <span>Detailed</span>
            <span>Report</span>
          </Link>
        </section>

        {/* Floating Co-Pilot Chat Pill Popover */}
        <CampaignChatPopover campaign={campaign} />
      </div>
    </main>
  );
}
