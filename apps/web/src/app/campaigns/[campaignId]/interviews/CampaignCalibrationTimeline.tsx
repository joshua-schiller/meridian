"use client";

import { Campaign } from "@/lib/campaigns";

const pulseQuestionProgression = [
  {
    before: "What makes you reach for another tool instead of Pulse?",
    evidence: "Dana's team treats a shared spreadsheet as the real source of truth.",
    after: "Outside of Pulse, where does your team actually go to get the numbers it relies on day-to-day?",
  },
  {
    before: "Walk me through the last time you tried to get an answer from Pulse.",
    evidence: "The blocker was not awareness; it was the query builder, joins, filters, and slow full-quarter loads.",
    after: "Have you ever tried to build a custom query or filter in Pulse, and what was that experience like?",
  },
  {
    before: "What would make Pulse part of your daily workflow?",
    evidence: "Dana's unlock was a simple, fast path to the few numbers she needs in meetings.",
    after: "If Pulse showed the three or four numbers most relevant to your work, no query building required, would that change how often you opened it?",
  },
];

export default function CampaignCalibrationTimeline({ campaign }: { campaign: Campaign }) {
  if (campaign.id === "pulse-adoption") {
    return <PulseCalibrationTimeline />;
  }

  let step1Title = "";
  let step1Desc = "";
  let step1Label = "";
  let step1Status = "";

  let step2Title = "";
  let step2Desc = "";
  let step2Label = "";

  let step3Title = "";
  let step3Desc = "";
  let step3Label = "";
  let step3Status = "";

  if (campaign.id === "startup-pm-discovery") {
    step1Title = "Interview #1 (Completed)";
    step1Desc = "Maya Chen (Northstar Labs) noted discovery notes scatter; synthesis is postponed until deadlines.";
    step1Label = "Insight: Handoff & Follow-through gap";
    step1Status = "completed";

    step2Title = "AI Adaptation Loop";
    step2Desc = "AI calibrated the question bank to target ownership structure and founder-led teams.";
    step2Label = "Calibrated Question Bank";

    step3Title = "Interview #2 (Scheduled)";
    step3Desc = "Noah Singh (Orbit Finch) will be probed on ownership gaps in founder-led environments.";
    step3Label = "Next Focus: Validate founder ownership";
    step3Status = "scheduled";
  } else if (campaign.id === "ai-support-handoff") {
    step1Title = "Interviews #1 & #2 (Completed)";
    step1Desc = "Riley Gomez & Samira Wu noted trust in AI order status drafts, but want billing exceptions isolated.";
    step1Label = "Insight: Bounded vs. Billing exceptions";
    step1Status = "completed";

    step2Title = "AI Adaptation Loop";
    step2Desc = "AI refined the Interview #3 plan to test transparency thresholds (confidence vs. evidence).";
    step2Label = "Calibrated Question Bank";

    step3Title = "Interview #3 (Scheduled)";
    step3Desc = "Owen Lee (Marble Bay) will test if confidence/evidence labels alter human-agent trust boundaries.";
    step3Label = "Next Focus: Transparency validation";
    step3Status = "scheduled";
  } else {
    // Default or "report-readiness"
    step1Title = "Campaign Setup";
    step1Desc = "Scaffolded campaign target: Validate qualitative report trust factors with VP level product executives.";
    step1Label = "Baseline Research Plan";
    step1Status = "completed";

    step2Title = "AI Adaptation Loop";
    step2Desc = "Calibration loop queued. Questions ready to adapt dynamically post-Interview #1 transcript.";
    step2Label = "Calibration Engine Active";

    step3Title = "Interview #1 (Scheduled)";
    step3Desc = "Talia Morgan (Lumen Ridge) will evaluate executive confidence level indicators.";
    step3Label = "Next Focus: Report reading habits";
    step3Status = "scheduled";
  }

  return (
    <div className="border border-slate-200 bg-white p-6 shadow-sm mb-8 rounded-none">
      <div className="flex items-center justify-between border-b border-slate-100 pb-4 mb-5">
        <div>
          <h3 className="text-base font-bold text-[var(--foreground)]">AI Calibration Loop</h3>
          <p className="text-xs text-[var(--muted)] mt-0.5">
            How the AI Operator adapts the question bank from interview to interview based on transcripts.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <span className="relative flex h-2 w-2">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
            <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
          </span>
          <span className="text-[10px] font-extrabold uppercase tracking-wider text-emerald-700">Loop Active</span>
        </div>
      </div>

      <div className="flex flex-col md:flex-row items-stretch gap-4 md:gap-2">
        {/* Step 1 */}
        <div className="flex-1 bg-slate-50/50 border border-slate-100 p-4 flex flex-col justify-between rounded-none hover:bg-slate-50 transition-colors duration-200">
          <div>
            <div className="flex items-center justify-between mb-2">
              <span className="text-[9px] font-extrabold uppercase tracking-widest text-[var(--muted)]">Step 1</span>
              <span className={`text-[9px] font-bold uppercase tracking-wider px-2 py-0.5 border ${step1Status === "completed" ? "bg-emerald-50 text-emerald-700 border-emerald-200" : "bg-blue-50 text-[var(--accent)] border-blue-200"}`}>
                {step1Status}
              </span>
            </div>
            <h4 className="text-sm font-bold text-[var(--foreground)]">{step1Title}</h4>
            <p className="text-xs leading-relaxed text-[var(--muted)] mt-2">{step1Desc}</p>
          </div>
          <div className="mt-4 border-t border-slate-100 pt-3">
            <span className="text-[10px] font-bold text-slate-700 block truncate">{step1Label}</span>
          </div>
        </div>

        {/* Arrow 1 */}
        <div className="flex items-center justify-center text-slate-300 font-bold self-center md:rotate-0 rotate-90 my-2 md:my-0 px-1">
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M9 5l7 7-7 7" />
          </svg>
        </div>

        {/* Step 2 */}
        <div className="flex-1 bg-blue-50/20 border border-blue-100/50 p-4 flex flex-col justify-between rounded-none hover:bg-blue-50/30 transition-colors duration-200">
          <div>
            <div className="flex items-center justify-between mb-2">
              <span className="text-[9px] font-extrabold uppercase tracking-widest text-[var(--accent)]">Step 2</span>
              <span className="inline-flex items-center text-[9px] font-bold uppercase tracking-wider px-2 py-0.5 bg-blue-50 text-[var(--accent)] border border-blue-200">
                Calibrating
              </span>
            </div>
            <h4 className="text-sm font-bold text-[var(--foreground)] flex items-center gap-1.5">
              {step2Title}
            </h4>
            <p className="text-xs leading-relaxed text-[var(--muted)] mt-2">{step2Desc}</p>
          </div>
          <div className="mt-4 border-t border-blue-100/50 pt-3">
            <span className="text-[10px] font-bold text-[var(--accent)] block truncate">{step2Label}</span>
          </div>
        </div>

        {/* Arrow 2 */}
        <div className="flex items-center justify-center text-slate-300 font-bold self-center md:rotate-0 rotate-90 my-2 md:my-0 px-1">
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M9 5l7 7-7 7" />
          </svg>
        </div>

        {/* Step 3 */}
        <div className="flex-1 bg-slate-50/50 border border-slate-100 p-4 flex flex-col justify-between rounded-none hover:bg-slate-50 transition-colors duration-200">
          <div>
            <div className="flex items-center justify-between mb-2">
              <span className="text-[9px] font-extrabold uppercase tracking-widest text-[var(--muted)]">Step 3</span>
              <span className={`text-[9px] font-bold uppercase tracking-wider px-2 py-0.5 border ${step3Status === "completed" ? "bg-emerald-50 text-emerald-700 border-emerald-200" : "bg-amber-50 text-amber-700 border-amber-200"}`}>
                {step3Status}
              </span>
            </div>
            <h4 className="text-sm font-bold text-[var(--foreground)]">{step3Title}</h4>
            <p className="text-xs leading-relaxed text-[var(--muted)] mt-2">{step3Desc}</p>
          </div>
          <div className="mt-4 border-t border-slate-100 pt-3">
            <span className="text-[10px] font-bold text-slate-700 block truncate">{step3Label}</span>
          </div>
        </div>
      </div>
    </div>
  );
}

function PulseCalibrationTimeline() {
  return (
    <div className="border border-slate-200 bg-white p-5 shadow-sm mb-8 rounded-none md:p-6">
      <div className="border-b border-slate-100 pb-5 mb-5">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <h3 className="text-base font-bold text-[var(--foreground)]">AI Calibration Loop</h3>
            <span className="rounded-full border border-emerald-200 bg-emerald-50 px-2 py-0.5 text-[10px] font-extrabold uppercase tracking-wider text-emerald-700">
              Seeded run complete
            </span>
          </div>
          <p className="mt-1 max-w-2xl text-xs leading-relaxed text-[var(--muted)]">
            Pulse adoption: Meridian used Dana's Interview 1 transcript to rewrite the Interview 2 plan for Marcus.
          </p>
        </div>
      </div>

      <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.05fr)_minmax(0,1fr)]">
        <PlanColumn
          eyebrow="Interview 1 plan"
          title="Broad starting questions"
          detail="Dana Whitfield, Sales Operations Lead"
          questions={[
            "What makes you reach for another tool instead of Pulse?",
            "Walk me through the last time you tried to get an answer from Pulse.",
            "What would make Pulse part of your daily workflow?",
          ]}
        />

        <div className="border border-blue-100 bg-blue-50/30 p-4">
          <div className="flex items-center justify-between gap-3">
            <span className="text-[9px] font-extrabold uppercase tracking-widest text-[var(--accent)]">
              Interview 1 transcript
            </span>
          </div>
          <h4 className="mt-2 text-sm font-bold text-[var(--foreground)]">What changed after Dana</h4>
          <p className="mt-2 text-xs leading-relaxed text-[var(--muted)]">
            Meridian stopped asking generic adoption questions and targeted the exact failure modes Dana revealed.
          </p>

          <ul className="mt-4 grid gap-3">
            {[
              "The spreadsheet is not a side workflow; it has replaced Pulse as the team's source of truth.",
              "The query builder is too heavy for simple pipeline questions.",
              "Slow real-data queries make Pulse unusable during back-to-back deal reviews.",
            ].map((learning) => (
              <li key={learning} className="flex gap-2 text-xs leading-relaxed text-slate-700">
                <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-[var(--accent)]" />
                <span>{learning}</span>
              </li>
            ))}
          </ul>

          <blockquote className="mt-4 border-l-2 border-[var(--accent)] pl-3 text-xs leading-relaxed text-slate-700">
            "My whole team basically lives in that shared sheet now, it's our real source of truth, not Pulse."
          </blockquote>
        </div>

        <PlanColumn
          eyebrow="Interview 2 plan"
          title="Sharper validation questions"
          detail="Marcus Lee, Customer Support Lead"
          questions={[
            "Outside of Pulse, where does your team actually go to get the numbers it relies on day-to-day?",
            "Have you ever tried to build a custom query or filter in Pulse, and what was that experience like?",
            "If Pulse showed the three or four numbers most relevant to your work, no query building required, would that change how often you opened it?",
          ]}
        />
      </div>

      <div className="mt-5 border-t border-slate-100 pt-5">
        <div className="grid gap-3 lg:grid-cols-3">
          {pulseQuestionProgression.map((shift) => (
            <div key={shift.before} className="min-w-0 border border-slate-200 bg-slate-50/60 p-4">
              <span className="text-[9px] font-extrabold uppercase tracking-widest text-slate-400">
                Before
              </span>
              <p className="mt-1 text-xs leading-relaxed text-slate-700">{shift.before}</p>

              <div className="my-3 flex items-center gap-2 text-[10px] font-bold uppercase tracking-wider text-[var(--accent)]">
                <span className="h-px flex-1 bg-blue-100" />
                Dana taught Meridian
                <span className="h-px flex-1 bg-blue-100" />
              </div>

              <p className="text-xs leading-relaxed text-[var(--muted)]">{shift.evidence}</p>

              <div className="mt-3 border-t border-slate-200 pt-3">
                <span className="text-[9px] font-extrabold uppercase tracking-widest text-[var(--accent)]">
                  Interview 2
                </span>
                <p className="mt-1 text-xs font-semibold leading-relaxed text-[var(--foreground)]">
                  {shift.after}
                </p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function PlanColumn({
  eyebrow,
  title,
  detail,
  questions,
}: {
  eyebrow: string;
  title: string;
  detail: string;
  questions: string[];
}) {
  return (
    <div className="border border-slate-200 bg-white p-4">
      <span className="text-[9px] font-extrabold uppercase tracking-widest text-slate-400">
        {eyebrow}
      </span>
      <h4 className="mt-2 text-sm font-bold text-[var(--foreground)]">{title}</h4>
      <p className="mt-1 text-xs text-[var(--muted)]">{detail}</p>

      <ol className="mt-4 grid gap-3">
        {questions.map((question, index) => (
          <li key={question} className="grid grid-cols-[1.5rem_minmax(0,1fr)] gap-2 text-xs leading-relaxed text-slate-700">
            <span className="flex h-6 w-6 items-center justify-center border border-slate-200 bg-slate-50 text-[10px] font-extrabold text-slate-500">
              {index + 1}
            </span>
            <span className="min-w-0">{question}</span>
          </li>
        ))}
      </ol>
    </div>
  );
}
