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
    <main className="min-h-screen px-4 py-8 md:px-8 md:py-12">
      <div className="mx-auto max-w-4xl">
        {/* Banner Header */}
        <header className="relative overflow-hidden rounded-2xl bg-white border border-slate-200 p-6 md:p-8 shadow-[0_8px_30px_rgb(0,0,0,0.015)] mb-8">
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

        <section className="mt-8 grid gap-6">
          {campaign.interviews.map((interview) => {
            const isCompleted = interview.status === "completed";
            return (
              <article
                key={interview.id}
                className="relative overflow-hidden rounded-2xl border border-slate-200 bg-white p-6 md:p-8 shadow-sm hover:shadow-md transition-all duration-300 flex flex-col gap-5"
              >
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
          })}
        </section>
      </div>
    </main>
  );
}
