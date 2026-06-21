"use client";

import { Campaign } from "@/lib/campaigns";

export default function CampaignCalibrationTimeline({ campaign }: { campaign: Campaign }) {
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
