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
    "id": "pulse-adoption",
    "title": "Pulse adoption",
    "oneLineGoal": "Understand why internal teams aren't adopting Pulse, our internal analytics platform.",
    "completedInterviews": 10,
    "totalInterviews": 10,
    "contactsFileName": "pulse-contacts.csv",
    "supportingDocumentNames": [
      "pulse-overview.pdf"
    ],
    "questionCount": 3,
    "highLevelFindings": "Across 10 internal interviews, adoption fails on trust, not features. The strongest patterns: stale data makes pulse unusable for operational and time-critical decisions (9/10), spreadsheets, source tools, and custom-built solutions become the real source of truth (8/10), data accuracy mismatches and known bugs destroy trust in pulse numbers (7/10). People revert to spreadsheets and source systems because they don't believe Pulse's numbers.",
    "interviews": [
      {
        "id": "ic-001",
        "interviewNumber": 1,
        "participant": "Dana Whitfield",
        "role": "Sales Operations Lead",
        "company": "Lumen",
        "status": "completed",
        "summary": "Dana, a Sales Ops Lead, avoids Pulse because its query builder is too complex for simple pipeline numbers and it's painfully slow on real queries, so she defaults to exporting raw data into a shared spreadsheet.",
        "highlights": [
          "Honestly? Almost never anymore. I opened it maybe twice last quarter. I want to like it, because in theory everything I need is in there, but it just doesn't fi",
          "So last month my VP asked for total committed pipeline for the West region. Should be a thirty-second thing. But in Pulse it's too complex to get a simple pipel"
        ]
      },
      {
        "id": "ic-002",
        "interviewNumber": 2,
        "participant": "Marcus Lee",
        "role": "Customer Support Lead",
        "company": "Lumen",
        "status": "completed",
        "summary": "Marcus, a Customer Support Lead, doesn't adopt Pulse because its ticket data is hours stale rather than real-time and its counts don't reconcile with Zendesk, eroding his trust, though he'd switch if both were fixed.",
        "highlights": [
          "Honestly we live in Zendesk. I've got a dashboard there for ticket volume, first response time, backlog by queue. That's what we look at in standup every mornin",
          "It does, technically. But the ticket data in Pulse is hours stale, it's not real-time. When we had that outage spike last month, my Zendesk view showed 200+ tic"
        ]
      },
      {
        "id": "ic-003",
        "interviewNumber": 3,
        "participant": "Priya Raman",
        "role": "Data Engineer",
        "company": "Lumen",
        "status": "completed",
        "summary": "Priya, a data engineer who maintains Pulse's pipelines, attributes low adoption to a six-hour-stale sync, a known join bug that double-counts and erodes trust, and constant access-permission friction, naming the trust-killing data bug as the top fix.",
        "highlights": [
          "Yeah, I own most of the ingestion jobs. Honestly, from the inside it's rough. I want teams to use Pulse, but I also know exactly where the bodies are buried, so",
          "Freshness, easily. The sync into Pulse only runs every six hours, so the data is stale by design. When the growth team opens a dashboard at 9am, they're looking"
        ]
      },
      {
        "id": "ic-004",
        "interviewNumber": 4,
        "participant": "Tomás Herrera",
        "role": "Marketing Analyst",
        "company": "Lumen",
        "status": "completed",
        "summary": "Tomás, a technical marketing power user, avoids Pulse because its numbers don't reconcile with Google Analytics and ad spend, so he rebuilds reports in his own Google Sheet and wishes Pulse let him write raw SQL instead of using the query builder.",
        "highlights": [
          "Honestly? Maybe once, and usually just to grab a number before I leave. I'm in our marketing dashboards and Google Sheets way more than I'm in Pulse.",
          "The big one is trust. The numbers in Pulse don't match Google Analytics or our ad spend, so I can't rely on it. Last month it showed our paid sessions about 18%"
        ]
      },
      {
        "id": "ic-005",
        "interviewNumber": 5,
        "participant": "Grace Kim",
        "role": "Finance Manager",
        "company": "Lumen",
        "status": "completed",
        "summary": "Grace, a Finance Manager, won't adopt Pulse because its numbers don't reconcile with the general ledger and the data is stale during month-end close, the exact moment she needs reliable figures.",
        "highlights": [
          "Honestly? It mostly doesn't. I'll open it to eyeball a trend, but the moment something has to be official, I go back to the general ledger. Everything I produce",
          "Pulse disagrees with the general ledger, which is our actual source of truth, so finance can't use it for anything official. Last quarter a revenue number in Pu"
        ]
      },
      {
        "id": "ic-006",
        "interviewNumber": 6,
        "participant": "Owen Bradley",
        "role": "Customer Success Manager",
        "company": "Lumen",
        "status": "completed",
        "summary": "Owen, a CSM, avoids Pulse because stale account health data surfaces churn signals too late, account-level access requires slow data-team requests, and the resulting staleness and gating leave him not trusting the data enough to use it in QBRs.",
        "highlights": [
          "Honestly? It mostly doesn't. I live in account health and renewals, so in theory Pulse should be my home base. But I open it maybe once a week, glance at the da",
          "The account health data is days behind. So by the time I see a churn signal it's too late, the customer's already escalated to my VP or gone quiet. Last month a"
        ]
      },
      {
        "id": "ic-007",
        "interviewNumber": 7,
        "participant": "Hannah Ortiz",
        "role": "Engineering Manager",
        "company": "Lumen",
        "status": "completed",
        "summary": "Hannah's engineering team abandoned Pulse for a self-built Grafana dashboard on the raw tables, citing a lack of API and raw query access and a UI that lags badly on real data, with frequent SSO logouts as a minor gripe.",
        "highlights": [
          "Honestly? We don't really use Pulse for it anymore. About two months ago we gave up and built our own Grafana dashboard off the raw tables. It does exactly what",
          "A few things piled up, but the breaking point was that I kept hitting walls. Pulse gives you these pre-built views, and the second you want something slightly d"
        ]
      },
      {
        "id": "ic-008",
        "interviewNumber": 8,
        "participant": "Raj Patel",
        "role": "Product Analyst",
        "company": "Lumen",
        "status": "completed",
        "summary": "Raj, a power user, is frustrated that Pulse walls him off from cross-team data and times out on complex queries, and argues he'd adopt it fully if it offered more query power and bigger limits rather than tighter constraints.",
        "highlights": [
          "Honestly? Love-hate. I'm in Pulse every single day, I push it harder than anyone on my team. But the ceiling is low. I run into the edges constantly, and the ed",
          "Tuesday. I was doing a cross-team analysis comparing our funnel against the onboarding team's. And I keep hitting permission walls, I can't see other teams' dat"
        ]
      },
      {
        "id": "ic-009",
        "interviewNumber": 9,
        "participant": "Lucia Romano",
        "role": "Operations Coordinator",
        "company": "Lumen",
        "status": "completed",
        "summary": "Lucia, a non-technical Operations Coordinator, avoids Pulse because the query builder is intimidating and she has no idea where to start, instead wanting ready-made dashboards she can glance at rather than building anything, with confusing metric jargon adding to her distrust.",
        "highlights": [
          "Honestly? It was a couple weeks ago, and I closed it almost right away. I'm in Operations, I'm not a data person, and the second I land on that screen I feel a ",
          "It drops you into this query builder thing, and the query builder is intimidating. I open it and have no idea where to start. There are all these dropdowns and "
        ]
      },
      {
        "id": "ic-010",
        "interviewNumber": 10,
        "participant": "Derek Olsen",
        "role": "Regional Sales Director",
        "company": "Lumen",
        "status": "completed",
        "summary": "Derek, a senior non-technical sales director, dreads Pulse because it's too complex and only opens it weekly, wanting one simple pre-built summary screen of his region rather than a report builder, and routinely falls back to asking an analyst.",
        "highlights": [
          "Honestly? I only open it about once a week, and I kind of dread it. I'm running a region, I'm in and out of meetings all day. Pulse is not where I want to spend",
          "It's too complex for me. I'm not a technical guy. I open it and there are filters, datasets, some query thing, tabs everywhere. I just want my regional number a"
        ]
      }
    ],
    "report": {
      "executiveSummary": "Pulse has a confirmed trust crisis driven by three compounding bugs/gaps: a known join bug causing double-counting, a 6-hour (sometimes multi-day) sync lag, and zero data lineage or freshness transparency — together these cause users across every team to reject Pulse numbers before stakeholder meetings and revert to source systems or spreadsheets as their real source of truth. Adoption has effectively collapsed into workarounds: eight of ten interviewees have built or rely on a substitute (shared spreadsheets, Zendesk dashboards, Grafana, pandas notebooks, or manual analyst requests) — meaning Pulse is generating shadow infrastructure costs and analyst-queue backlog rather than self-serve value. There is a fundamental interface split: non-technical users (Sales, Support, CS, Finance, Ops) need pre-built, role-specific dashboards with plain-language metric names and zero query building, while technical users (Engineering, Marketing Analytics, Product Analysis) need raw SQL access, higher query/timeout limits, and an API — the current middle-ground UI satisfies neither group. Despite these barriers, latent demand is strong and conditional: all eight interviewees who described workarounds explicitly stated they would return to Pulse if trust, freshness, and access issues were resolved — this is a fixable adoption problem, not a product-concept rejection. Access permission friction compounds everything: multi-day ticket queues block new analysts at onboarding and lock power users out of cross-team data, routing work back to the data team and flooding Priya's queue — the permission model may be a legacy artifact rather than an intentional governance design.",
      "findings": [
        {
          "title": "Stale data makes Pulse unusable for operational and time-critical decisions",
          "body": "Data is stale by design (6-hour sync cycle, multi-day lags during close, or days-old account health signals), making Pulse structurally unfit for intraday, event-driven, customer-facing, or month-end decisions across multiple teams.",
          "confidence": "High"
        },
        {
          "title": "Spreadsheets, source tools, and custom-built solutions become the real source of truth",
          "body": "Users across Sales Ops, Support, Marketing, Finance, Engineering, Customer Success, Product Analysis, and Operations bypass Pulse entirely — exporting to spreadsheets, staying in source systems, building their own dashboards, pulling data manually, waiting on the data team, or escaping to notebooks — which become the team's de facto source of truth.",
          "confidence": "High"
        },
        {
          "title": "Data accuracy mismatches and known bugs destroy trust in Pulse numbers",
          "body": "When Pulse figures disagree with source-system numbers, users lose confidence in all Pulse data, stop presenting it to stakeholders, and rebuild figures manually to defend in meetings.",
          "confidence": "High"
        },
        {
          "title": "Query builder too complex for power users and non-technical users alike — but for opposite reasons",
          "body": "Non-technical users find the query builder overwhelming for simple tasks, while technical users hit a ceiling when they need advanced SQL constructs, higher query limits, or API access — the tool satisfies neither end of the spectrum.",
          "confidence": "High"
        },
        {
          "title": "Absence of data lineage, freshness indicators, and plain-language metric definitions forces users to distrust Pulse by default",
          "body": "Users cannot see when data was last refreshed or trace a Pulse number back to its source calculation; non-technical users additionally cannot decode jargon metric names to know if they've selected the right metric — forcing everyone to assume the worst and revert to source systems for anything consequential.",
          "confidence": "High"
        },
        {
          "title": "Slow query performance and timeouts undermine trust and usability",
          "body": "Full-scale queries take so long to load — or time out entirely — that users abandon Pulse mid-workflow; the lag and timeout ceiling scale with data volume and query complexity, meaning the heaviest users suffer most.",
          "confidence": "High"
        }
      ],
      "contradictions": [
        "There is a genuine tension between what different user types need from Pulse's query interface: non-technical users (Dana Whitfield, Marcus Lee, Grace Kim, Owen Bradley, Lucia Romano, Derek Olsen) want simpler pre-built dashboards, plain-language metric names, clear reconciled outputs, and less query-building complexity, while technical users (Tomás Herrera, Hannah Ortiz, Raj Patel, and implicitly Priya Raman) want more power — raw SQL access, higher query timeout limits, an API endpoint, window functions, and fewer guardrails. These are mutually exclusive interface philosophies; optimizing for one risks alienating the other. Hannah's team abandoned Pulse entirely for a custom Grafana dashboard, and Raj escapes to pandas notebooks, rather than work within the UI constraints. Derek explicitly said the new report builder is 'the opposite of what I need.'"
      ],
      "recommendedNextSteps": [
        "Fix the confirmed join bug immediately and audit all affected data models (including the finance revenue model behind Grace's $40K GL mismatch and the marketing campaign table behind Tomás's 18% GA discrepancy) — this is the single highest-leverage trust restore action and should be treated as a P0 bug, not a roadmap item.",
        "Ship a data freshness timestamp and inline metric definitions (hover-over plain-language descriptions and last-refreshed time) as a fast-follow UI change — this is a low-engineering-cost intervention that directly addresses the 'black box' and 'I can't decode this metric name' barriers cited by six interviewees and can precede any sync infrastructure work.",
        "Accelerate the sync cadence toward near-real-time (or at minimum reduce the 6-hour cycle) and investigate whether Grace's month-end 2–3 day lag and Owen's account health delay share the same pipeline root cause as the 6-hour sync — resolving staleness unblocks the Support, CS, Finance, and Operations personas who need intraday or same-day data.",
        "Run a two-track UX initiative in parallel: (a) build curated, pre-built role-specific starter dashboards for non-technical personas (Sales Director, CSM, Support Lead, Ops Coordinator, Finance) with plain-language metric names and no query-building required; (b) expose a raw SQL interface, configurable query timeout ceiling, and API endpoint for technical users (Engineering, Marketing Analytics, Product Analysis) — these tracks are not in conflict and can ship independently.",
        "Redesign the permissions model with the data team: audit whether per-team scoping is an intentional governance decision or a legacy artifact, and evaluate row-level security or data-sharing agreements as alternatives to ticket-based access requests — the current model is the direct cause of new-analyst drop-off at onboarding and blocks the cross-team analyses that represent Pulse's highest-value use cases.",
        "Present the full findings — especially the latent demand signal from all eight conditional adopters — to product and engineering leadership with a prioritized fix sequence: (1) join bug, (2) freshness timestamp + metric definitions, (3) sync cadence, (4) permissions redesign, (5) dual UX tracks — and confirm whether each item has an owner and a timeline on the current roadmap."
      ],
      "methodology": "Meridian conducted 10 voice interviews with internal Pulse users across teams. Each transcript updated a living insight document before the next interview plan was generated; findings confirmed by multiple people were promoted in confidence and one-off gripes treated as noise."
    }
  },
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
