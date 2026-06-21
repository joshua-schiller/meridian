import Link from "next/link";
import { notFound } from "next/navigation";

import { campaigns, getCampaignById } from "@/lib/campaigns";
import InterviewsConsoleList from "./InterviewsConsoleList";
import CampaignCalibrationTimeline from "./CampaignCalibrationTimeline";

type CampaignInterviewsPageProps = {
  params: Promise<{
    campaignId: string;
  }>;
};

export function generateStaticParams() {
  return campaigns.map((campaign) => ({
    campaignId: campaign.id,
  }));
}

export default async function CampaignInterviewsPage({ params }: CampaignInterviewsPageProps) {
  const { campaignId } = await params;
  const campaign = getCampaignById(campaignId);

  if (!campaign) {
    notFound();
  }

  return (
    <main className="min-h-screen px-4 py-8 md:px-8 md:py-12">
      <div className="mx-auto max-w-4xl">
        {/* Banner Header */}
        <header className="relative overflow-hidden rounded-none bg-white border border-slate-200 p-6 md:p-8 shadow-[0_8px_30px_rgb(0,0,0,0.015)] mb-8">
          <div className="absolute top-0 right-0 w-64 h-64 bg-gradient-to-bl from-blue-100/30 to-transparent rounded-full blur-3xl pointer-events-none" />

          <div className="relative">
            <Link
              href={`/campaigns/${campaign.id}`}
              className="inline-flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-[var(--accent)] hover:text-[#0855a1] transition-colors"
            >
              <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M15 19l-7-7 7-7" />
              </svg>
              Campaign View
            </Link>
            <h1 className="mt-4 text-3xl font-extrabold tracking-tight text-[var(--foreground)] md:text-4xl">
              Interviews Console
            </h1>
            <h2 className="mt-2 text-sm font-bold text-slate-700">
              {campaign.title}
            </h2>
            <p className="mt-1 text-xs text-[var(--muted)]">
              Goal: {campaign.oneLineGoal}
            </p>
          </div>
        </header>

        <CampaignCalibrationTimeline campaign={campaign} />

        <section className="mt-8">
          <InterviewsConsoleList interviews={campaign.interviews} />
        </section>
      </div>
    </main>
  );
}
