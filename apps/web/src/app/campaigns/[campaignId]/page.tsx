import Link from "next/link";
import { notFound } from "next/navigation";

import { campaigns, getCampaignById } from "@/lib/campaigns";

import CampaignChat from "./CampaignChat";

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

  return (
    <main className="min-h-screen px-4 py-6 md:px-8 md:py-8">
      <div className="mx-auto max-w-6xl">
        <header className="flex flex-col gap-5 border-b border-[var(--line)] pb-6 md:flex-row md:items-end md:justify-between">
          <div className="min-w-0">
            <Link
              href="/"
              className="text-sm font-semibold text-[var(--accent)] transition hover:text-[var(--accent-ink)]"
            >
              Campaigns
            </Link>
            <h1 className="mt-3 text-3xl font-semibold tracking-normal text-[var(--foreground)] md:text-4xl">
              Campaign View
            </h1>
            <h2 className="mt-5 text-2xl font-semibold tracking-normal text-[var(--foreground)]">
              {campaign.title}
            </h2>
            <p className="mt-2 max-w-3xl text-base leading-7 text-[var(--muted)]">
              {campaign.oneLineGoal}
            </p>
          </div>

          <div className="shrink-0 rounded-lg border border-[var(--line)] bg-[var(--panel)] px-5 py-4 text-right">
            <p className="font-mono text-3xl font-semibold text-[var(--accent-ink)]">
              {campaign.completedInterviews}/{campaign.totalInterviews}
            </p>
            <p className="mt-1 text-xs font-semibold uppercase tracking-[0.12em] text-[var(--muted)]">
              interviews completed
            </p>
          </div>
        </header>

        <section className="mt-6">
          <div className="mb-3 flex justify-end">
            <Link
              href={`/campaigns/${campaign.id}/report`}
              className="inline-flex h-10 items-center justify-center rounded-md bg-[var(--accent)] px-4 text-sm font-semibold text-white transition hover:opacity-90 focus:outline-none focus:ring-2 focus:ring-[var(--accent)] focus:ring-offset-2 focus:ring-offset-[var(--background)]"
            >
              Report
            </Link>
          </div>

          <div className="rounded-lg border border-[var(--line)] bg-[var(--panel)] p-5 md:p-6">
            <h2 className="text-base font-semibold text-[var(--foreground)]">
              High-level findings
            </h2>
            <p className="mt-3 text-base leading-8 text-[var(--muted)]">
              {campaign.highLevelFindings}
            </p>
          </div>
        </section>

        <div className="mt-5">
          <Link
            href={`/campaigns/${campaign.id}/interviews`}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex h-10 items-center justify-center rounded-md border border-[var(--line)] bg-[var(--panel)] px-4 text-sm font-semibold text-[var(--accent-ink)] transition hover:bg-[var(--accent-wash)] focus:outline-none focus:ring-2 focus:ring-[var(--accent)] focus:ring-offset-2 focus:ring-offset-[var(--background)]"
          >
            Interviews
          </Link>
        </div>

        <CampaignChat campaign={campaign} />
      </div>
    </main>
  );
}
