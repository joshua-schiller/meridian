"use client";

import { useState } from "react";

type Campaign = {
  id: string;
  name: string;
  goal: string;
  completedInterviews: number;
  totalInterviews: number;
};

const initialCampaigns: Campaign[] = [
  {
    id: "startup-pm-discovery",
    name: "Startup PM discovery research",
    goal: "Understand why early-stage PMs struggle to keep discovery learning alive between calls.",
    completedInterviews: 1,
    totalInterviews: 3,
  },
  {
    id: "ai-support-handoff",
    name: "AI support handoff study",
    goal: "Learn where operators trust an AI teammate to resolve customer escalations.",
    completedInterviews: 2,
    totalInterviews: 5,
  },
  {
    id: "report-readiness",
    name: "Stakeholder report readiness",
    goal: "Validate what makes an interview synthesis credible enough to share with leadership.",
    completedInterviews: 0,
    totalInterviews: 4,
  },
];

export default function Home() {
  const [campaigns, setCampaigns] = useState(initialCampaigns);

  function createCampaign() {
    setCampaigns((currentCampaigns) => {
      const draftCount =
        currentCampaigns.filter((campaign) => campaign.id.startsWith("draft-")).length + 1;

      return [
        {
          id: `draft-${Date.now()}`,
          name: `Untitled campaign ${draftCount}`,
          goal: "Draft research goal",
          completedInterviews: 0,
          totalInterviews: 0,
        },
        ...currentCampaigns,
      ];
    });
  }

  return (
    <main className="min-h-screen px-4 py-6 md:px-8 md:py-8">
      <div className="mx-auto max-w-6xl">
        <header className="flex items-center justify-between gap-4 border-b border-[var(--line)] pb-5">
          <h1 className="text-3xl font-semibold tracking-normal text-[var(--foreground)] md:text-4xl">
            Campaigns
          </h1>
          <button
            type="button"
            onClick={createCampaign}
            className="inline-flex h-10 items-center justify-center rounded-md bg-[var(--accent)] px-4 text-sm font-semibold text-white transition hover:opacity-90 focus:outline-none focus:ring-2 focus:ring-[var(--accent)] focus:ring-offset-2 focus:ring-offset-[var(--background)]"
          >
            New
          </button>
        </header>

        <section className="mt-6 overflow-hidden rounded-lg border border-[var(--line)] bg-[var(--panel)]">
          <div className="grid grid-cols-[1fr_auto] gap-4 border-b border-[var(--line)] bg-[var(--panel-strong)] px-4 py-3 text-xs font-semibold uppercase tracking-[0.12em] text-[var(--muted)] md:grid-cols-[18rem_1fr_13rem] md:px-5">
            <span>Name</span>
            <span className="hidden md:block">Goal</span>
            <span className="text-right">Status</span>
          </div>

          <ul className="divide-y divide-[var(--line)]">
            {campaigns.map((campaign) => (
              <li
                key={campaign.id}
                className="grid gap-2 px-4 py-4 transition hover:bg-[var(--accent-wash)] md:grid-cols-[18rem_1fr_13rem] md:items-center md:gap-4 md:px-5"
              >
                <div className="min-w-0">
                  <h2 className="truncate text-base font-semibold text-[var(--foreground)]">
                    {campaign.name}
                  </h2>
                </div>
                <p className="min-w-0 text-sm leading-6 text-[var(--muted)] md:truncate">
                  {campaign.goal}
                </p>
                <p className="font-mono text-sm font-semibold text-[var(--accent-ink)] md:text-right">
                  {campaign.completedInterviews}/{campaign.totalInterviews} interviews completed
                </p>
              </li>
            ))}
          </ul>
        </section>
      </div>
    </main>
  );
}
