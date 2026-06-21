export type CampaignInterview = {
  id: string;
  interviewNumber: number;
  participant: string;
  role: string;
  company: string;
  status: "completed" | "scheduled";
  summary: string;
  highlights: string[];
};

export type CampaignReportFinding = {
  title: string;
  body: string;
  confidence: "High" | "Medium" | "Low";
};

export type CampaignReport = {
  executiveSummary: string;
  findings: CampaignReportFinding[];
  contradictions: string[];
  recommendedNextSteps: string[];
  methodology: string;
};

export type Campaign = {
  id: string;
  title: string;
  oneLineGoal: string;
  completedInterviews: number;
  totalInterviews: number;
  contactsFileName: string;
  supportingDocumentNames: string[];
  questionCount: number;
  highLevelFindings: string;
  interviews: CampaignInterview[];
  report: CampaignReport;
};

export const campaigns: Campaign[] = [
  {
    id: "startup-pm-discovery",
    title: "Startup PM discovery research",
    oneLineGoal:
      "Understand why early-stage PMs struggle to keep discovery learning alive between calls.",
    completedInterviews: 1,
    totalInterviews: 3,
    contactsFileName: "startup-pms.csv",
    supportingDocumentNames: ["research-brief.pdf"],
    questionCount: 7,
    highLevelFindings:
      "The first interview suggests that discovery is not blocked by a lack of customer access; it is blocked by the follow-through after calls. Notes scatter across docs, synthesis waits until there is a deadline, and teams lose the thread between one interview and the next. Meridian should prove that each transcript can immediately sharpen the next AI-led interview plan.",
    interviews: [
      {
        id: "maya-chen",
        interviewNumber: 1,
        participant: "Maya Chen",
        role: "Head of Product",
        company: "Northstar Labs",
        status: "completed",
        summary:
          "Maya described a recurring gap between strong calls and weak follow-through, especially when the team is shipping fast.",
        highlights: [
          "Discovery notes are usually captured, but rarely synthesized before the next interview.",
          "The team trusts evidence more when it is tied to exact customer language.",
          "A sharper second interview should probe ownership, not just tooling.",
        ],
      },
      {
        id: "noah-singh",
        interviewNumber: 2,
        participant: "Noah Singh",
        role: "Founder and PM",
        company: "Orbit Finch",
        status: "scheduled",
        summary:
          "Next interview should validate whether ownership gaps appear in smaller founder-led teams.",
        highlights: [
          "Probe whether founder-led teams skip synthesis for the same reasons.",
          "Ask what would make an auto-generated insight document credible.",
        ],
      },
      {
        id: "elena-park",
        interviewNumber: 3,
        participant: "Elena Park",
        role: "Product Lead",
        company: "Copperline",
        status: "scheduled",
        summary:
          "Final planned interview should test how stakeholders read synthesized findings.",
        highlights: [
          "Compare stakeholder-ready reporting needs against interview-plan needs.",
          "Ask which evidence formats would change product direction.",
        ],
      },
    ],
    report: {
      executiveSummary:
        "Early signal points to a handoff problem: PMs can run discovery calls, but the learning does not reliably compound. The product opportunity is to turn each transcript into an updated insight document and a visibly sharper AI interview plan.",
      findings: [
        {
          title: "Synthesis happens too late",
          body:
            "The team captures notes during calls but waits to synthesize until a planning meeting or stakeholder request creates pressure.",
          confidence: "Medium",
        },
        {
          title: "Evidence needs traceability",
          body:
            "Findings become more credible when they preserve the participant quote or interview context that produced them.",
          confidence: "Medium",
        },
        {
          title: "The next question bank must show learning",
          body:
            "A useful second interview plan should name the specific gap from interview one and explain why the follow-up matters.",
          confidence: "High",
        },
      ],
      contradictions: [
        "Participants may value fast summaries, but stakeholders may still demand quote-level evidence before trusting the output.",
      ],
      recommendedNextSteps: [
        "Use Interview 2 to probe ownership: who is responsible for turning a transcript into the next interview plan?",
        "Show the question bank before and after Interview 1 side by side in the demo.",
        "Keep the report grounded in quotes and confidence levels, not generic research language.",
      ],
      methodology:
        "This report is based on one completed AI-led interview, one updated living insight document, and the regenerated plan for the next scheduled interview.",
    },
  },
  {
    id: "ai-support-handoff",
    title: "AI support handoff study",
    oneLineGoal:
      "Learn where operators trust an AI teammate to resolve customer escalations.",
    completedInterviews: 2,
    totalInterviews: 5,
    contactsFileName: "support-operators.csv",
    supportingDocumentNames: ["handoff-notes.md", "call-summary.pdf"],
    questionCount: 8,
    highLevelFindings:
      "Operators are comfortable letting AI handle repeatable support work when the system explains the customer state and escalation path clearly. Trust drops when the AI obscures uncertainty, touches billing policy, or fails to show why it chose a handoff. The next interviews should test how much transparency is enough before speed stops feeling risky.",
    interviews: [
      {
        id: "riley-gomez",
        interviewNumber: 1,
        participant: "Riley Gomez",
        role: "Support Operations Manager",
        company: "Threadhouse",
        status: "completed",
        summary:
          "Riley trusts AI for order status and policy explanations but wants humans in billing exceptions.",
        highlights: [
          "The acceptable automation boundary is repeatable, auditable work.",
          "Confidence improves when the agent states why it handed off.",
        ],
      },
      {
        id: "samira-wu",
        interviewNumber: 2,
        participant: "Samira Wu",
        role: "CX Lead",
        company: "Fieldkit",
        status: "completed",
        summary:
          "Samira wants AI to draft next steps, but not close escalations that could affect refunds.",
        highlights: [
          "Refund and retention moments need policy context.",
          "A useful AI teammate should summarize the handoff in operator language.",
        ],
      },
      {
        id: "owen-lee",
        interviewNumber: 3,
        participant: "Owen Lee",
        role: "Support Lead",
        company: "Marble Bay",
        status: "scheduled",
        summary:
          "Upcoming interview should test whether transparent confidence labels change operator trust.",
        highlights: [
          "Probe whether operators want confidence, evidence, or both.",
          "Ask how AI should recover after a bad suggested response.",
        ],
      },
    ],
    report: {
      executiveSummary:
        "Trust is highest when AI handles repeatable support tasks and exposes its reasoning. The main research gap is how transparent the handoff must be before operators feel safe moving quickly.",
      findings: [
        {
          title: "Automation is acceptable for bounded work",
          body:
            "Participants support AI ownership for order status, policy lookups, and response drafts with clear source context.",
          confidence: "High",
        },
        {
          title: "Billing exceptions are a hard boundary",
          body:
            "Refunds, retention decisions, and policy exceptions still require human review.",
          confidence: "Medium",
        },
        {
          title: "Handoffs need operator language",
          body:
            "A helpful AI handoff should summarize the customer state, recommended action, and risk in concise terms.",
          confidence: "Medium",
        },
      ],
      contradictions: [
        "Operators want speed, but they also want enough evidence to slow down before risky actions.",
      ],
      recommendedNextSteps: [
        "Interview operators who manage refund-heavy queues.",
        "Prototype confidence and evidence labels in the handoff surface.",
        "Measure whether transparent handoffs reduce review time without reducing trust.",
      ],
      methodology:
        "This report combines two completed operator interviews with the current Meridian synthesis and planned follow-up prompts.",
    },
  },
  {
    id: "report-readiness",
    title: "Stakeholder report readiness",
    oneLineGoal:
      "Validate what makes an interview synthesis credible enough to share with leadership.",
    completedInterviews: 0,
    totalInterviews: 4,
    contactsFileName: "product-leaders.csv",
    supportingDocumentNames: [],
    questionCount: 6,
    highLevelFindings:
      "This campaign has not completed an interview yet. The current hypothesis is that stakeholder-ready reports need a short executive summary, confidence labels, contradictions, and traceable quotes. The first interview should pressure-test which of those elements actually changes whether leaders trust the research.",
    interviews: [
      {
        id: "talia-morgan",
        interviewNumber: 1,
        participant: "Talia Morgan",
        role: "VP Product",
        company: "Lumen Ridge",
        status: "scheduled",
        summary:
          "Opening interview should discover what executives need before they share qualitative findings.",
        highlights: [
          "Ask which report sections are read first.",
          "Probe when a quote is more persuasive than a metric.",
        ],
      },
      {
        id: "devin-kapoor",
        interviewNumber: 2,
        participant: "Devin Kapoor",
        role: "Product Director",
        company: "Pine Labs",
        status: "scheduled",
        summary:
          "Second interview should validate whether confidence labels make findings easier to act on.",
        highlights: [
          "Ask how leaders judge a small-sample discovery report.",
          "Probe what makes a contradiction useful rather than confusing.",
        ],
      },
    ],
    report: {
      executiveSummary:
        "No interviews have been completed yet, so the report is a readiness scaffold. The first call should test what evidence makes qualitative research shareable with leadership.",
      findings: [
        {
          title: "Report standards are still hypothetical",
          body:
            "The campaign starts from the assumption that leaders need summaries, confidence labels, contradictions, and quote evidence.",
          confidence: "Low",
        },
      ],
      contradictions: [
        "No participant contradictions have been observed yet.",
      ],
      recommendedNextSteps: [
        "Run Interview 1 with a product executive who regularly reads research summaries.",
        "Ask participants to rank report sections by trust impact.",
        "Regenerate the second question bank from the first report-readiness transcript.",
      ],
      methodology:
        "This report is a pre-interview scaffold generated from the campaign goal and planned interview sequence.",
    },
  },
];

export function getCampaignById(campaignId: string): Campaign | undefined {
  return campaigns.find((campaign) => campaign.id === campaignId);
}
