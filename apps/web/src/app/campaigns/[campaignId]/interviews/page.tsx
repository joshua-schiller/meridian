import Link from "next/link";
import { notFound } from "next/navigation";

import { campaigns, getCampaignById } from "@/lib/campaigns";

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
    <main className="min-h-screen px-4 py-6 md:px-8 md:py-8">
      <div className="mx-auto max-w-5xl">
        <header className="border-b border-[var(--line)] pb-6">
          <Link
            href={`/campaigns/${campaign.id}`}
            className="text-sm font-semibold text-[var(--accent)] transition hover:text-[var(--accent-ink)]"
          >
            Campaign View
          </Link>
          <h1 className="mt-3 text-3xl font-semibold tracking-normal text-[var(--foreground)] md:text-4xl">
            Interviews
          </h1>
          <h2 className="mt-4 text-2xl font-semibold text-[var(--foreground)]">
            {campaign.title}
          </h2>
          <p className="mt-2 max-w-3xl text-base leading-7 text-[var(--muted)]">
            {campaign.oneLineGoal}
          </p>
        </header>

        <section className="mt-6 grid gap-4">
          {campaign.interviews.map((interview) => (
            <article
              key={interview.id}
              className="rounded-lg border border-[var(--line)] bg-[var(--panel)] p-5"
            >
              <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
                <div>
                  <p className="text-sm font-semibold uppercase tracking-[0.14em] text-[var(--muted)]">
                    Interview {interview.interviewNumber}
                  </p>
                  <h3 className="mt-2 text-xl font-semibold text-[var(--foreground)]">
                    {interview.participant}
                  </h3>
                  <p className="mt-1 text-sm text-[var(--muted)]">
                    {interview.role}, {interview.company}
                  </p>
                </div>
                <span
                  className={`w-fit rounded-full px-3 py-1 text-xs font-semibold ${
                    interview.status === "completed"
                      ? "bg-[var(--accent-wash)] text-[var(--accent-ink)]"
                      : "bg-[var(--status-wash)] text-[var(--status-ink)]"
                  }`}
                >
                  {interview.status}
                </span>
              </div>

              <p className="mt-4 text-sm leading-7 text-[var(--muted)]">{interview.summary}</p>

              <ul className="mt-4 list-disc space-y-2 pl-5 text-sm leading-7 text-[var(--muted)]">
                {interview.highlights.map((highlight) => (
                  <li key={highlight}>{highlight}</li>
                ))}
              </ul>
            </article>
          ))}
        </section>
      </div>
    </main>
  );
}
