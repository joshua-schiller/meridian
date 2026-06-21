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
              Synthesis Report
            </h1>
            <h2 className="mt-2 text-sm font-bold text-slate-700">
              {campaign.title}
            </h2>
            <p className="mt-1 text-xs text-[var(--muted)]">
              Goal: {campaign.oneLineGoal}
            </p>
          </div>
        </header>

        <article className="mt-8 flex flex-col gap-6">
          {/* Executive Summary */}
          <section className="relative overflow-hidden rounded-2xl border border-slate-200 bg-white p-6 md:p-8 shadow-sm">
            <div className="absolute top-0 left-0 w-1.5 h-full bg-[var(--accent)]" />
            <h3 className="text-xs font-bold uppercase tracking-wider text-[var(--foreground)] border-b border-slate-100 pb-3 mb-4 pl-2">
              Executive Summary
            </h3>
            <p className="text-sm leading-relaxed text-[var(--muted)] pl-2">
              {campaign.report.executiveSummary}
            </p>
          </section>

          {/* Core Findings */}
          <section className="rounded-2xl border border-slate-200 bg-white p-6 md:p-8 shadow-sm">
            <h3 className="text-xs font-bold uppercase tracking-wider text-[var(--foreground)] border-b border-slate-100 pb-3 mb-6">
              Core Findings
            </h3>
            <div className="grid gap-5">
              {campaign.report.findings.map((finding) => {
                const confidence = finding.confidence.toLowerCase();
                const confidenceBadgeColor =
                  confidence === "high"
                    ? "bg-emerald-50 text-emerald-700 border-emerald-200"
                    : confidence === "medium"
                      ? "bg-indigo-50 text-indigo-700 border-indigo-200"
                      : "bg-slate-50 text-slate-700 border-slate-200";

                const topBorderColor =
                  confidence === "high"
                    ? "border-t-4 border-t-emerald-500"
                    : confidence === "medium"
                      ? "border-t-4 border-t-indigo-500"
                      : "border-t-4 border-t-slate-400";

                return (
                  <div
                    key={finding.title}
                    className={`rounded-xl border border-slate-200 bg-slate-50/20 p-5 ${topBorderColor} shadow-[0_2px_8px_rgba(0,0,0,0.01)]`}
                  >
                    <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between border-b border-slate-100 pb-3 mb-3">
                      <h4 className="text-sm font-bold text-[var(--foreground)]">
                        {finding.title}
                      </h4>
                      <span className={`w-fit rounded-full px-2.5 py-0.5 text-[9px] font-bold uppercase tracking-wider border ${confidenceBadgeColor}`}>
                        {finding.confidence} Confidence
                      </span>
                    </div>
                    <p className="text-xs leading-relaxed text-[var(--muted)]">{finding.body}</p>
                  </div>
                );
              })}
            </div>
          </section>

          {/* Contradictions & Open Questions */}
          <section className="rounded-2xl border border-slate-200 bg-white p-6 md:p-8 shadow-sm">
            <h3 className="text-xs font-bold uppercase tracking-wider text-[var(--foreground)] border-b border-slate-100 pb-3 mb-4">
              Contradictions & Open Questions
            </h3>
            <ul className="space-y-3">
              {campaign.report.contradictions.map((contradiction) => (
                <li key={contradiction} className="flex items-start gap-3.5 text-sm text-[var(--muted)] leading-relaxed bg-amber-50/30 border border-amber-100/50 rounded-xl p-4">
                  <span className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-amber-100 text-amber-800 border border-amber-200 text-xs font-bold shadow-sm">
                    ?
                  </span>
                  <span>{contradiction}</span>
                </li>
              ))}
            </ul>
          </section>

          {/* Recommended Next Steps */}
          <section className="rounded-2xl border border-slate-200 bg-white p-6 md:p-8 shadow-sm">
            <h3 className="text-xs font-bold uppercase tracking-wider text-[var(--foreground)] border-b border-slate-100 pb-3 mb-4">
              Recommended Next Steps
            </h3>
            <ol className="grid gap-3.5">
              {campaign.report.recommendedNextSteps.map((step, idx) => (
                <li key={step} className="flex items-start gap-4 text-sm text-[var(--muted)] leading-relaxed bg-slate-50/30 border border-slate-200/50 rounded-xl p-4">
                  <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-[var(--accent)] text-white text-xs font-extrabold shadow-sm">
                    {idx + 1}
                  </span>
                  <span>{step}</span>
                </li>
              ))}
            </ol>
          </section>

          {/* Methodology */}
          <section className="rounded-2xl border border-slate-200 bg-white p-6 md:p-8 shadow-sm bg-slate-50/10">
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400 border-b border-slate-100 pb-3 mb-3">
              Methodology
            </h3>
            <p className="text-xs leading-relaxed text-[var(--muted)]">
              {campaign.report.methodology}
            </p>
          </section>
        </article>
      </div>
    </main>
  );
}
