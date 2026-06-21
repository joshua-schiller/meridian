import Link from "next/link";
import { notFound } from "next/navigation";

import { campaigns, getCampaignById } from "@/lib/campaigns";

type CampaignReportPageProps = {
  params: Promise<{
    campaignId: string;
  }>;
};

export function generateStaticParams() {
  return campaigns.map((campaign) => ({
    campaignId: campaign.id,
  }));
}

export default async function CampaignReportPage({ params }: CampaignReportPageProps) {
  const { campaignId } = await params;
  const campaign = getCampaignById(campaignId);

  if (!campaign) {
    notFound();
  }

  return (
    <main className="min-h-screen px-4 py-6 md:px-8 md:py-8">
      <div className="mx-auto max-w-4xl">
        <header className="border-b border-[var(--line)] pb-6">
          <Link
            href={`/campaigns/${campaign.id}`}
            className="text-sm font-semibold text-[var(--accent)] transition hover:text-[var(--accent-ink)]"
          >
            Campaign View
          </Link>
          <h1 className="mt-3 text-3xl font-semibold tracking-normal text-[var(--foreground)] md:text-4xl">
            Detailed Report
          </h1>
          <h2 className="mt-4 text-2xl font-semibold text-[var(--foreground)]">
            {campaign.title}
          </h2>
          <p className="mt-2 text-base leading-7 text-[var(--muted)]">
            {campaign.oneLineGoal}
          </p>
        </header>

        <article className="mt-6 rounded-lg border border-[var(--line)] bg-[var(--panel)] p-5 md:p-6">
          <section>
            <h3 className="text-lg font-semibold text-[var(--foreground)]">Executive Summary</h3>
            <p className="mt-3 text-base leading-8 text-[var(--muted)]">
              {campaign.report.executiveSummary}
            </p>
          </section>

          <section className="mt-8">
            <h3 className="text-lg font-semibold text-[var(--foreground)]">Findings</h3>
            <div className="mt-4 grid gap-4">
              {campaign.report.findings.map((finding) => (
                <div
                  key={finding.title}
                  className="rounded-lg border border-[var(--line)] bg-[var(--panel-strong)] p-4"
                >
                  <div className="flex flex-col gap-2 md:flex-row md:items-start md:justify-between">
                    <h4 className="text-base font-semibold text-[var(--foreground)]">
                      {finding.title}
                    </h4>
                    <span className="w-fit rounded-full bg-[var(--accent-wash)] px-3 py-1 text-xs font-semibold text-[var(--accent-ink)]">
                      {finding.confidence} confidence
                    </span>
                  </div>
                  <p className="mt-3 text-sm leading-7 text-[var(--muted)]">{finding.body}</p>
                </div>
              ))}
            </div>
          </section>

          <section className="mt-8">
            <h3 className="text-lg font-semibold text-[var(--foreground)]">
              Contradictions and Open Questions
            </h3>
            <ul className="mt-3 list-disc space-y-2 pl-5 text-sm leading-7 text-[var(--muted)]">
              {campaign.report.contradictions.map((contradiction) => (
                <li key={contradiction}>{contradiction}</li>
              ))}
            </ul>
          </section>

          <section className="mt-8">
            <h3 className="text-lg font-semibold text-[var(--foreground)]">
              Recommended Next Steps
            </h3>
            <ol className="mt-3 list-decimal space-y-2 pl-5 text-sm leading-7 text-[var(--muted)]">
              {campaign.report.recommendedNextSteps.map((step) => (
                <li key={step}>{step}</li>
              ))}
            </ol>
          </section>

          <section className="mt-8 border-t border-[var(--line)] pt-6">
            <h3 className="text-lg font-semibold text-[var(--foreground)]">Methodology</h3>
            <p className="mt-3 text-sm leading-7 text-[var(--muted)]">
              {campaign.report.methodology}
            </p>
          </section>
        </article>
      </div>
    </main>
  );
}
