export type TranscriptTurn = {
  speaker: string;
  text: string;
};

export type CampaignInterview = {
  id: string;
  interviewNumber: number;
  participant: string;
  role: string;
  company: string;
  status: "completed" | "scheduled" | "in progress";
  summary: string;
  highlights: string[];
  transcript?: TranscriptTurn[];
};

export type CampaignReportFinding = {
  title: string;
  summary?: string;
  body: string;
  confidence: "High" | "Medium" | "Low";
  supportCount?: number;
  syncedSupportCount?: number;
};

export type CampaignReport = {
  executiveSummary: string;
  findings: CampaignReportFinding[];
  contradictions: string[];
  recommendedNextSteps: string[];
  methodology: string;
};

export type CampaignQuestion = {
  question: string;
  rationale: string;
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
  syncedCompletedInterviews?: number;
  syncedHighLevelFindings?: string;
  currentQuestions?: CampaignQuestion[];
  syncedCurrentQuestions?: CampaignQuestion[];
  interviews: CampaignInterview[];
  report: CampaignReport;
};

export const campaigns: Campaign[] = [
  {
    "id": "pulse-adoption",
    "title": "Pulse adoption",
    "oneLineGoal": "Understand why internal teams aren't adopting Pulse, our internal analytics platform.",
    "completedInterviews": 8,
    "totalInterviews": 10,
    "contactsFileName": "pulse-contacts.csv",
    "supportingDocumentNames": [
      "pulse-overview.pdf"
    ],
    "questionCount": 3,
    "highLevelFindings": "Across 8 internal interviews, adoption fails on trust, not features. The strongest patterns are stale data makes pulse unusable for operational and time-critical decisions (7/8), spreadsheets, source tools, and custom-built solutions become the real source of truth (6/8), data accuracy mismatches and known bugs destroy trust in pulse numbers (5/8). People revert to spreadsheets and source systems because they don't believe Pulse's numbers.",
    "syncedCompletedInterviews": 9,
    "syncedHighLevelFindings": "Across 9 internal interviews, adoption fails on trust, not features. The strongest patterns are stale data makes Pulse unusable for operational and time-critical decisions (8/9), spreadsheets, source tools, and custom-built solutions become the real source of truth (7/9), data accuracy mismatches and known bugs destroy trust in Pulse numbers (6/9). Lucia's interview strengthened the non-technical dashboard pattern: Operations needs ready-made views, plain-language metric names, and visible freshness before Pulse can become part of daily work.",
    "currentQuestions": [
      {
        "question": "When you open Pulse, what is the first thing that makes you feel unsure where to start?",
        "rationale": "Tests whether query-builder intimidation extends beyond Sales, Support, and Finance into Operations."
      },
      {
        "question": "Which operational metrics would you expect to be ready-made, without building a query?",
        "rationale": "Validates whether role-specific starter dashboards can replace the current build-it-yourself workflow."
      },
      {
        "question": "How do confusing metric names or missing freshness cues change whether you trust the number?",
        "rationale": "Probes the trust gap around metric definitions, lineage, and stale data."
      },
      {
        "question": "When Pulse fails, who do you ask for the number instead, and how long does that detour take?",
        "rationale": "Measures the analyst-as-middleman workaround and its operational cost."
      }
    ],
    "syncedCurrentQuestions": [
      {
        "question": "Lucia said she needs ready-made operational dashboards instead of a builder. For your region, what three numbers should be waiting when you open Pulse?",
        "rationale": "Carries forward the pre-built dashboard theme while tailoring it to Derek's sales-leadership role."
      },
      {
        "question": "When a Pulse number looks off before a QBR, do you verify it, ask an analyst, or abandon it?",
        "rationale": "Tests the trust-collapse pattern in a high-stakes leadership meeting context."
      },
      {
        "question": "How important is a mobile or lightweight view when you're away from your desk and need a number?",
        "rationale": "Adds a field-access probe from Lucia's workflow constraints and Derek's likely sales-director context."
      },
      {
        "question": "Would freshness timestamps and plain-language metric definitions make you comfortable citing Pulse in leadership meetings?",
        "rationale": "Keeps the trust and data-lineage hypothesis in the plan while checking if it changes executive-facing behavior."
      }
    ],
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
          "I opened it maybe twice last quarter.",
          "I want to like it, because in theory everything I need is in there, but it just doesn't fit how I work day to day.",
          "So last month my VP asked for total committed pipeline for the West region."
        ],
        "transcript": [
          {
            "speaker": "agent",
            "text": "Thanks for making time, Dana. To start, how often do you actually use Pulse in a given week?"
          },
          {
            "speaker": "interviewee",
            "text": "Honestly? Almost never anymore. I opened it maybe twice last quarter. I want to like it, because in theory everything I need is in there, but it just doesn't fit how I work day to day."
          },
          {
            "speaker": "agent",
            "text": "What happens when you do open it? Walk me through a recent attempt."
          },
          {
            "speaker": "interviewee",
            "text": "So last month my VP asked for total committed pipeline for the West region. Should be a thirty-second thing. But in Pulse it's too complex to get a simple pipeline number out of it. I couldn't figure out the query builder at all, all these joins and filters and dimension dropdowns. I just need one number."
          },
          {
            "speaker": "agent",
            "text": "When you couldn't get the query builder to cooperate, what did you do instead?"
          },
          {
            "speaker": "interviewee",
            "text": "What I always do. I pulled the raw opportunity export and so I just export it to a spreadsheet and do it there. Took me five minutes with a pivot table. My whole team basically lives in that shared sheet now, it's our real source of truth, not Pulse."
          },
          {
            "speaker": "agent",
            "text": "Setting the query builder aside, how does Pulse feel performance-wise when you run something real?"
          },
          {
            "speaker": "interviewee",
            "text": "That's the other killer. It's slow, it just spins when I run anything real. A small test query is fine, but the second I scope a full quarter across all reps it sits there with the little spinner forever. I've literally walked to get coffee and come back and it's still loading."
          },
          {
            "speaker": "agent",
            "text": "How does that compare to the spreadsheet workflow time-wise?"
          },
          {
            "speaker": "interviewee",
            "text": "It's not even close. The export plus pivot is faster than waiting on one Pulse query to load. When I'm in back-to-back deal reviews I can't afford to babysit a spinner, I need the number now. So the math just always lands on the spreadsheet."
          },
          {
            "speaker": "agent",
            "text": "If you could change one thing about Pulse, what would it be?"
          },
          {
            "speaker": "interviewee",
            "text": "Make getting a basic pipeline number dead simple and fast, that's the whole game. Oh, and a small thing, I wish it had a mobile app so I could glance at pipeline from my phone between meetings. But really, fix the simple-number path and you'd get me back."
          }
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
          "I've got a dashboard there for ticket volume, first response time, backlog by queue.",
          "That's what we look at in standup every morning.",
          "Pulse is kind of off to the side for us."
        ],
        "transcript": [
          {
            "speaker": "agent",
            "text": "Thanks for making time, Marcus. To start, what does your team actually use to track support metrics day to day?"
          },
          {
            "speaker": "interviewee",
            "text": "Honestly we live in Zendesk. I've got a dashboard there for ticket volume, first response time, backlog by queue. That's what we look at in standup every morning. Pulse is kind of off to the side for us."
          },
          {
            "speaker": "agent",
            "text": "Why off to the side? Pulse is supposed to pull in that same support data."
          },
          {
            "speaker": "interviewee",
            "text": "It does, technically. But the ticket data in Pulse is hours stale, it's not real-time. When we had that outage spike last month, my Zendesk view showed 200+ tickets flooding in and Pulse still said everything was calm. By the time it caught up the fire was already out. For support, hours-old is basically useless."
          },
          {
            "speaker": "agent",
            "text": "So the timing is the dealbreaker. Anything else that holds you back?"
          },
          {
            "speaker": "interviewee",
            "text": "Yeah, and this one's worse honestly. The counts don't match what I see in Zendesk, so I don't trust it. Pulse will say we closed 340 tickets yesterday, Zendesk says 312. I have no idea which is right, and if I can't trust the number I'm not going to put it in front of my VP."
          },
          {
            "speaker": "agent",
            "text": "Did you ever try to figure out where the mismatch comes from?"
          },
          {
            "speaker": "interviewee",
            "text": "A little. I think Pulse counts merged tickets differently, or maybe it's a timezone thing on the day boundary. But that's the point, right? I shouldn't have to play detective. The first time the number is wrong, people stop believing all of them. My team already rolls their eyes when I pull up Pulse."
          },
          {
            "speaker": "agent",
            "text": "That makes sense. What would it take for you to actually switch your standup over to Pulse?"
          },
          {
            "speaker": "interviewee",
            "text": "Two things. The numbers have to reconcile exactly with Zendesk, down to the ticket. And the data needs to be live, or near-live, like a few minutes behind at most. If it's real-time and the counts match, I'd happily switch because Pulse actually slices trends across teams better than Zendesk does. That part I do like."
          },
          {
            "speaker": "agent",
            "text": "Good to know there's a version of this you'd want. Anything small that just annoys you?"
          },
          {
            "speaker": "interviewee",
            "text": "Oh, the Slack alerts. Pulse fires off so many notifications that I muted the channel weeks ago, the alerts are just too noisy. Which is a bit ironic, because now if Pulse ever did surface something useful in real-time, I'd never even see it."
          }
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
          "Yeah, I own most of the ingestion jobs.",
          "Honestly, from the inside it's rough.",
          "I want teams to use Pulse, but I also know exactly where the bodies are buried, so I get why people drift back to their own spreadsheets."
        ],
        "transcript": [
          {
            "speaker": "agent",
            "text": "Thanks for making time, Priya. You maintain the pipelines that feed Pulse, right? What does adoption look like from where you sit?"
          },
          {
            "speaker": "interviewee",
            "text": "Yeah, I own most of the ingestion jobs. Honestly, from the inside it's rough. I want teams to use Pulse, but I also know exactly where the bodies are buried, so I get why people drift back to their own spreadsheets."
          },
          {
            "speaker": "agent",
            "text": "Where are the bodies buried? Start wherever feels biggest."
          },
          {
            "speaker": "interviewee",
            "text": "Freshness, easily. The sync into Pulse only runs every six hours, so the data is stale by design. When the growth team opens a dashboard at 9am, they're looking at numbers from 3am. They notice, and they stop trusting it for anything time-sensitive."
          },
          {
            "speaker": "agent",
            "text": "Has that staleness actually changed how a team uses it?"
          },
          {
            "speaker": "interviewee",
            "text": "Constantly. The sales ops folks ran their standup off Pulse for a week, then went back to a manual export because they couldn't trust intraday numbers. If the data is stale by design, you can't use it for the live decisions people actually care about."
          },
          {
            "speaker": "agent",
            "text": "You mentioned trust. Is there anything beyond freshness eroding it?"
          },
          {
            "speaker": "interviewee",
            "text": "Yeah, and this one's worse because it's silent. There's a known join bug that double-counts in one of the models, so honestly the numbers are off and people noticed. Someone in finance cross-checked revenue against the source system and it didn't match. Once that happens once, they question every number."
          },
          {
            "speaker": "agent",
            "text": "How does the access side factor in, if at all?"
          },
          {
            "speaker": "interviewee",
            "text": "It's a huge drag. I'm flooded with access-request tickets from people who can't see the tables they need. A new analyst joins, opens Pulse, and half the datasets are greyed out. By the time their permissions clear, they've already given up and asked me to just pull the data for them. Oh, and the metric naming is inconsistent between teams, 'active_users' means three different things, which drives me a little crazy too."
          },
          {
            "speaker": "agent",
            "text": "If you could fix one of these tomorrow, which moves adoption most?"
          },
          {
            "speaker": "interviewee",
            "text": "Fix the join bug first. Freshness and access are friction, but the double-count is the thing that quietly kills trust. If the numbers are off and people noticed, no amount of fresh data or smooth permissions will get them back. Earn the trust, then fix the rest."
          }
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
          "Maybe once, and usually just to grab a number before I leave.",
          "I'm in our marketing dashboards and Google Sheets way more than I'm in Pulse.",
          "The numbers in Pulse don't match Google Analytics or our ad spend, so I can't rely on it."
        ],
        "transcript": [
          {
            "speaker": "agent",
            "text": "Thanks for making time, Tomás. To start, how often do you actually open Pulse in a given week?"
          },
          {
            "speaker": "interviewee",
            "text": "Honestly? Maybe once, and usually just to grab a number before I leave. I'm in our marketing dashboards and Google Sheets way more than I'm in Pulse."
          },
          {
            "speaker": "agent",
            "text": "Why does Pulse end up being the place you leave rather than stay?"
          },
          {
            "speaker": "interviewee",
            "text": "The big one is trust. The numbers in Pulse don't match Google Analytics or our ad spend, so I can't rely on it. Last month it showed our paid sessions about 18% lower than GA for the same week. When I can't reconcile it, I just stop believing the dashboard."
          },
          {
            "speaker": "agent",
            "text": "What do you do when the numbers don't line up like that?"
          },
          {
            "speaker": "interviewee",
            "text": "I just pull the raw data and rebuild everything in a Google Sheet. I export the campaign table, drop in our GA and spend numbers next to it, and reconcile by hand. It's tedious, but at least I know exactly where every figure came from."
          },
          {
            "speaker": "agent",
            "text": "That sounds like a lot of manual work. What keeps you doing it that way?"
          },
          {
            "speaker": "interviewee",
            "text": "Because the sheet is mine and I trust it. Once I've rebuilt it, I can defend every cell in a meeting. With Pulse, if someone asks how a metric was calculated, I genuinely can't tell them, so I'd rather not put it in front of leadership."
          },
          {
            "speaker": "agent",
            "text": "If you could change one thing about how you query Pulse, what would it be?"
          },
          {
            "speaker": "interviewee",
            "text": "Honestly I wish Pulse just let me write raw SQL instead of boxing me into the query builder. The builder is fine for simple cuts, but the second I want a window function or a weird join, I hit a wall. I'm technical, I'd rather just write the query than fight the dropdowns. Oh, and a dark mode wouldn't hurt either, my eyes are fried by 6pm."
          },
          {
            "speaker": "agent",
            "text": "If the numbers reconciled and you could write SQL, would you switch off the Google Sheet?"
          },
          {
            "speaker": "interviewee",
            "text": "Probably, yeah. If I could write raw SQL and the totals actually matched GA and our ad spend, I'd have no reason to rebuild everything in a Google Sheet. The trust piece is the dealbreaker though, fix that first or I'll keep living in my own spreadsheet."
          }
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
          "I'll open it to eyeball a trend, but the moment something has to be official, I go back to the general ledger.",
          "Everything I produce has to reconcile to the penny, and Pulse can't give me that.",
          "Pulse disagrees with the general ledger, which is our actual source of truth, so finance can't use it for anything official."
        ],
        "transcript": [
          {
            "speaker": "agent",
            "text": "Thanks for making time, Grace. To start, how does Pulse fit into your day-to-day in Finance?"
          },
          {
            "speaker": "interviewee",
            "text": "Honestly? It mostly doesn't. I'll open it to eyeball a trend, but the moment something has to be official, I go back to the general ledger. Everything I produce has to reconcile to the penny, and Pulse can't give me that."
          },
          {
            "speaker": "agent",
            "text": "When you say it can't give you that, what specifically goes wrong?"
          },
          {
            "speaker": "interviewee",
            "text": "Pulse disagrees with the general ledger, which is our actual source of truth, so finance can't use it for anything official. Last quarter a revenue number in Pulse was off from the GL by about forty thousand dollars. I can't put a figure in front of the CFO that doesn't tie out. One mismatch and I lose all trust in the whole tool."
          },
          {
            "speaker": "agent",
            "text": "Do you know why those numbers diverge?"
          },
          {
            "speaker": "interviewee",
            "text": "Nobody's ever been able to tell me cleanly. I think it pulls from a different cut of the data with its own logic on refunds and intercompany entries. But because I can't trace a number in Pulse back to a journal entry, it's a black box, and a black box doesn't reconcile."
          },
          {
            "speaker": "agent",
            "text": "Are there moments where you wish you could rely on it more?"
          },
          {
            "speaker": "interviewee",
            "text": "Every single month-end. At month-end the data in Pulse is stale and lags the close, which is exactly when I need it. I'm doing accruals on the 3rd and Pulse is still showing me numbers from days ago. The one window where live analytics would actually help me, it's behind."
          },
          {
            "speaker": "agent",
            "text": "How stale are we talking?"
          },
          {
            "speaker": "interviewee",
            "text": "During close it can lag by two or three days. There's no timestamp telling me how fresh the data is, so I don't even know what I'm looking at. If the data lags the close, it's useless to me precisely in the period I care about most. Oh, and the Excel export formatting is a mess every time, merged cells and weird headers, so I reformat it by hand before I can use anything."
          },
          {
            "speaker": "agent",
            "text": "If one thing changed that made you trust Pulse, what would it be?"
          },
          {
            "speaker": "interviewee",
            "text": "Make it reconcile to the general ledger, to the dollar, with a clear lineage back to journal entries, and refresh it fast enough to keep up with the close. Until Pulse agrees with our source of truth and stops lagging at month-end, finance simply can't use it for anything that counts."
          }
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
          "I live in account health and renewals, so in theory Pulse should be my home base.",
          "But I open it maybe once a week, glance at the dashboards, and then go back to pulling things manually or pinging the data team.",
          "The account health data is days behind."
        ],
        "transcript": [
          {
            "speaker": "agent",
            "text": "Thanks for making time, Owen. To start, can you walk me through where Pulse fits in your day-to-day as a CSM?"
          },
          {
            "speaker": "interviewee",
            "text": "Honestly? It mostly doesn't. I live in account health and renewals, so in theory Pulse should be my home base. But I open it maybe once a week, glance at the dashboards, and then go back to pulling things manually or pinging the data team."
          },
          {
            "speaker": "agent",
            "text": "That's helpful. When you do open it, what's the first thing that trips you up?"
          },
          {
            "speaker": "interviewee",
            "text": "The account health data is days behind. So by the time I see a churn signal it's too late, the customer's already escalated to my VP or gone quiet. Last month a mid-market account churned and Pulse still showed them green three days after they'd told us they were leaving."
          },
          {
            "speaker": "agent",
            "text": "Ouch. So freshness is the core issue for churn signals?"
          },
          {
            "speaker": "interviewee",
            "text": "For me, yeah. A churn signal that's three days old isn't a signal, it's a postmortem. I need to act the morning a usage drop happens, not at the end of the week when the data finally rolls up."
          },
          {
            "speaker": "agent",
            "text": "Beyond freshness, is there anything about just getting to the data that slows you down?"
          },
          {
            "speaker": "interviewee",
            "text": "The permissions, completely. I have to file a request with the data team just to see account-level data, and it takes days. So for a brand-new account I'm assigned, I can't even pull their numbers until a ticket clears. That kills any momentum in the first week."
          },
          {
            "speaker": "agent",
            "text": "How does that access friction play into whether you rely on Pulse at all?"
          },
          {
            "speaker": "interviewee",
            "text": "It compounds. And because it's stale and gated, I don't fully trust it for QBRs. If I'm sitting in front of a customer presenting their own health score, I can't have the number be three days old or have just gotten unblocked that morning. I'd rather pull it myself from the source so I know it's right."
          },
          {
            "speaker": "agent",
            "text": "Last one, if you could change one thing about Pulse, what would it be?"
          },
          {
            "speaker": "interviewee",
            "text": "Fix the freshness and the access first, those are the dealbreakers. Oh, and a small wish, I'd love if Pulse could just email me a per-customer digest automatically every morning instead of me logging in to dig. But that's minor next to trusting the data enough to put it in front of a customer."
          }
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
          "We don't really use Pulse for it anymore.",
          "About two months ago we gave up and built our own Grafana dashboard off the raw tables.",
          "It does exactly what we need and nobody on my team has to fight the tool to get a number out."
        ],
        "transcript": [
          {
            "speaker": "agent",
            "text": "Thanks for making time, Hannah. To start, how does your team currently get the analytics it needs day to day?"
          },
          {
            "speaker": "interviewee",
            "text": "Honestly? We don't really use Pulse for it anymore. About two months ago we gave up and built our own Grafana dashboard off the raw tables. It does exactly what we need and nobody on my team has to fight the tool to get a number out."
          },
          {
            "speaker": "agent",
            "text": "That's a big step. What pushed you to build your own thing instead of staying in Pulse?"
          },
          {
            "speaker": "interviewee",
            "text": "A few things piled up, but the breaking point was that I kept hitting walls. Pulse gives you these pre-built views, and the second you want something slightly different, you're stuck. My engineers are perfectly capable of writing SQL. We didn't need hand-holding, we needed access."
          },
          {
            "speaker": "agent",
            "text": "When you say access, what would the ideal version of Pulse have given you?"
          },
          {
            "speaker": "interviewee",
            "text": "This is the thing people get wrong about my team. I don't want a UI, I want an API and raw query access so I can build what I need. Every time the roadmap is about prettier charts, I think, you're solving the wrong problem for me. Give me the data and an endpoint and get out of my way."
          },
          {
            "speaker": "agent",
            "text": "Got it. Setting the flexibility aside, how was the actual experience of using the Pulse interface?"
          },
          {
            "speaker": "interviewee",
            "text": "Slow. And the Pulse UI is slow anyway, it lags when you load anything real. A toy dataset is fine, but the moment you point it at a quarter of production events, you're staring at a spinner for fifteen, twenty seconds. My team just stopped opening it because waiting felt worse than writing the query ourselves."
          },
          {
            "speaker": "agent",
            "text": "Did that performance issue come up for the whole team, or mostly the heavy users?"
          },
          {
            "speaker": "interviewee",
            "text": "Mostly whoever was doing real work. The lag scales with how much you actually ask of it, so the people who needed it most got the worst experience. Oh, and the SSO logs me out constantly, which is its own little daily annoyance, but that's minor compared to the speed. The performance is the real reason it lags out of our workflow."
          },
          {
            "speaker": "agent",
            "text": "If we could change one thing to win your team back, what should it be?"
          },
          {
            "speaker": "interviewee",
            "text": "Ship the API and raw query access, and make it fast on real data. If I had an endpoint I trusted and it didn't lag when I loaded anything real, I'd kill our Grafana dashboard tomorrow. But as long as the answer is another UI, my team is going to keep routing around Pulse and building our own."
          }
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
          "I'm in Pulse every single day, I push it harder than anyone on my team.",
          "I run into the edges constantly, and the edges are where my actual work lives.",
          "I was doing a cross-team analysis comparing our funnel against the onboarding team's."
        ],
        "transcript": [
          {
            "speaker": "agent",
            "text": "Thanks for making time, Raj. You're one of the heaviest Pulse users I could find, so I want to hear the unfiltered version. How would you describe your experience with it?"
          },
          {
            "speaker": "interviewee",
            "text": "Honestly? Love-hate. I'm in Pulse every single day, I push it harder than anyone on my team. But the ceiling is low. I run into the edges constantly, and the edges are where my actual work lives."
          },
          {
            "speaker": "agent",
            "text": "Tell me about one of those edges from this week."
          },
          {
            "speaker": "interviewee",
            "text": "Tuesday. I was doing a cross-team analysis comparing our funnel against the onboarding team's. And I keep hitting permission walls, I can't see other teams' data even when I need it for a cross-team analysis. So I filed an access request, waited two days, got half of it approved. The analysis was already stale by then."
          },
          {
            "speaker": "agent",
            "text": "How often does that access friction come up for you?"
          },
          {
            "speaker": "interviewee",
            "text": "Weekly, easily. Almost every interesting question I have is cross-team, and that's exactly the data I'm walled off from. The permissions are scoped per team, so the moment I reach across a boundary I'm stuck filing tickets and pinging admins. It kills the momentum every time."
          },
          {
            "speaker": "agent",
            "text": "Set permissions aside for a second. When you do have the data, how does Pulse hold up?"
          },
          {
            "speaker": "interviewee",
            "text": "That's the other half of it. Any complex query I write just times out. The second I join more than a couple of tables or look at a wide date range, it spins and then dies. So I end up dumping raw data into my own notebook and doing the real work in pandas, which kind of defeats the whole point of having Pulse."
          },
          {
            "speaker": "agent",
            "text": "If you're already escaping to a notebook, what keeps you coming back to Pulse at all?"
          },
          {
            "speaker": "interviewee",
            "text": "The shared dashboards and the fact that it's the source of truth, when it works. And here's the thing people get wrong about adoption: I'd actually use it if it gave me more query power and bigger limits, not fewer. Everyone assumes power users churn because it's too complicated. For me it's the opposite, I churn because it's too constrained. Oh, and a small gripe, I wish dashboards had version history so I could see what changed when a number suddenly moves."
          },
          {
            "speaker": "agent",
            "text": "If you could change exactly one thing tomorrow, what would it be?"
          },
          {
            "speaker": "interviewee",
            "text": "Raise the query timeout ceiling and let me opt into bigger limits, and fix the cross-team access so I'm not walled off from the data I need. Give me more room, not guardrails. Do that and I'd move my whole workflow into Pulse tomorrow instead of treating it as a glorified export button."
          }
        ]
      },
      {
        "id": "ic-009",
        "interviewNumber": 9,
        "participant": "Lucia Romano",
        "role": "Operations Coordinator",
        "company": "Lumen",
        "status": "in progress",
        "summary": "Lucia, a non-technical Operations Coordinator, avoids Pulse because the query builder is intimidating and she has no idea where to start, instead wanting ready-made dashboards she can glance at rather than building anything, with confusing metric jargon adding to her distrust.",
        "highlights": [
          "It was a couple weeks ago, and I closed it almost right away.",
          "I'm in Operations, I'm not a data person, and the second I land on that screen I feel a little out of my depth.",
          "It drops you into this query builder thing, and the query builder is intimidating."
        ],
        "transcript": [
          {
            "speaker": "agent",
            "text": "Thanks for making time, Lucia. To start, can you tell me about the last time you opened Pulse?"
          },
          {
            "speaker": "interviewee",
            "text": "Honestly? It was a couple weeks ago, and I closed it almost right away. I'm in Operations, I'm not a data person, and the second I land on that screen I feel a little out of my depth."
          },
          {
            "speaker": "agent",
            "text": "What was it about that screen that made you want to close it?"
          },
          {
            "speaker": "interviewee",
            "text": "It drops you into this query builder thing, and the query builder is intimidating. I open it and have no idea where to start. There are all these dropdowns and fields and operators, and I just sit there thinking, what am I supposed to put here?"
          },
          {
            "speaker": "agent",
            "text": "When you needed an answer, what did you do instead?"
          },
          {
            "speaker": "interviewee",
            "text": "I pinged someone on the analytics team and asked them to pull it for me. I needed shipment turnaround times for last month, and rather than fight with Pulse I just waited two days for them to send me a spreadsheet. Slower, but at least I didn't have to build anything."
          },
          {
            "speaker": "agent",
            "text": "If Pulse could be different, what would actually work for you?"
          },
          {
            "speaker": "interviewee",
            "text": "This is going to sound lazy, but I don't want to build anything. I just want a few ready-made dashboards I can glance at. Like, here's your team's numbers for the week, done. I don't need to slice and dice, I need answers without assembling them myself."
          },
          {
            "speaker": "agent",
            "text": "Was there anything else that tripped you up beyond the query builder?"
          },
          {
            "speaker": "interviewee",
            "text": "Oh, and the metric names are confusing jargon I don't recognize. Half of them I have to guess at. Something will say 'DAU cohort delta' and I'm like, is that the thing I want? I genuinely can't tell, so I don't trust whatever I pick."
          },
          {
            "speaker": "agent",
            "text": "So if I handed you a perfect version tomorrow, what's the first thing you'd want to see?"
          },
          {
            "speaker": "interviewee",
            "text": "One simple dashboard with the three or four numbers my team cares about, in plain language, that I can open and immediately understand. No building, no guessing what a metric means. Just glance, get my answer, and get back to work."
          }
        ]
      },
      {
        "id": "ic-010",
        "interviewNumber": 10,
        "participant": "Derek Olsen",
        "role": "Regional Sales Director",
        "company": "Lumen",
        "status": "in progress",
        "summary": "Derek, a senior non-technical sales director, dreads Pulse because it's too complex and only opens it weekly, wanting one simple pre-built summary screen of his region rather than a report builder, and routinely falls back to asking an analyst.",
        "highlights": [
          "I only open it about once a week, and I kind of dread it.",
          "I'm running a region, I'm in and out of meetings all day.",
          "Pulse is not where I want to spend twenty minutes hunting around."
        ],
        "transcript": [
          {
            "speaker": "agent",
            "text": "Thanks for making time, Derek. To start, how often do you find yourself in Pulse?"
          },
          {
            "speaker": "interviewee",
            "text": "Honestly? I only open it about once a week, and I kind of dread it. I'm running a region, I'm in and out of meetings all day. Pulse is not where I want to spend twenty minutes hunting around."
          },
          {
            "speaker": "agent",
            "text": "When you say you dread it, what's the part that makes you feel that way?"
          },
          {
            "speaker": "interviewee",
            "text": "It's too complex for me. I'm not a technical guy. I open it and there are filters, datasets, some query thing, tabs everywhere. I just want my regional number and I can't find it without clicking through five screens."
          },
          {
            "speaker": "agent",
            "text": "Walk me through the last time you actually tried to pull something."
          },
          {
            "speaker": "interviewee",
            "text": "Last Monday I needed my West region bookings for the QBR. I went in, picked the wrong dataset apparently, got a number that looked off, second-guessed it, then just Slacked an analyst and asked her to send me the real figure. That's what I do every time, honestly."
          },
          {
            "speaker": "agent",
            "text": "If you could wave a wand, what would Pulse look like for you?"
          },
          {
            "speaker": "interviewee",
            "text": "I don't want to learn to build reports. I just want one simple summary screen of my region. Bookings, pipeline, attainment, the three things I actually care about, right there when I log in. No building, no filters. Just show me."
          },
          {
            "speaker": "agent",
            "text": "The team did add a report builder recently. Does that help at all?"
          },
          {
            "speaker": "interviewee",
            "text": "That's the opposite of what I need. A builder means more work for me. I'm not going to sit there assembling charts. Make it simpler, not more powerful. Give me the one screen and I'm a happy customer. Oh, and it'd be great as a mobile app, by the way, I'm on the road constantly and I'm never at my desk when I need a number."
          },
          {
            "speaker": "agent",
            "text": "That's really helpful. Last one: what would get you to actually rely on Pulse instead of pinging an analyst?"
          },
          {
            "speaker": "interviewee",
            "text": "Trust and speed. If I log in and my region's numbers are just there, simple, accurate, no hunting, I'd use it every day. Right now it's too complex for me and it's faster to ask a person. That's the whole story."
          }
        ]
      }
    ],
    "report": {
      "executiveSummary": "Pulse has a confirmed trust crisis driven by three compounding bugs/gaps: a known join bug causing double-counting, a 6-hour (sometimes multi-day) sync lag, and zero data lineage or freshness transparency — together these cause users across every team to reject Pulse numbers before stakeholder meetings and revert to source systems or spreadsheets as their real source of truth. Adoption has effectively collapsed into workarounds: six of eight interviewees have built or rely on a substitute (shared spreadsheets, Zendesk dashboards, Grafana, pandas notebooks, or manual analyst requests) — meaning Pulse is generating shadow infrastructure costs and analyst-queue backlog rather than self-serve value. There is a fundamental interface split: non-technical users (Sales, Support, CS, Finance, Ops) need pre-built, role-specific dashboards with plain-language metric names and zero query building, while technical users (Engineering, Marketing Analytics, Product Analysis) need raw SQL access, higher query/timeout limits, and an API — the current middle-ground UI satisfies neither group. Despite these barriers, latent demand is strong and conditional: all six interviewees who described workarounds explicitly stated they would return to Pulse if trust, freshness, and access issues were resolved — this is a fixable adoption problem, not a product-concept rejection. Access permission friction compounds everything: multi-day ticket queues block new analysts at onboarding and lock power users out of cross-team data, routing work back to the data team and flooding Priya's queue — the permission model may be a legacy artifact rather than an intentional governance design.",
      "findings": [
        {
          "title": "Stale data makes Pulse unusable for operational and time-critical decisions",
          "summary": "Pulse data is stale by design — a six-hour sync and multi-day close lags — so teams can't trust it for time-sensitive decisions.",
          "body": "Data is stale by design (6-hour sync cycle, multi-day lags during close, or days-old account health signals), making Pulse structurally unfit for intraday, event-driven, customer-facing, or month-end decisions across multiple teams.",
          "confidence": "High",
          "supportCount": 7,
          "syncedSupportCount": 8
        },
        {
          "title": "Spreadsheets, source tools, and custom-built solutions become the real source of truth",
          "summary": "Teams across the company bypass Pulse, falling back to spreadsheets and self-built dashboards as their real source of truth.",
          "body": "Users across Sales Ops, Support, Marketing, Finance, Engineering, Customer Success, Product Analysis, and Operations bypass Pulse entirely — exporting to spreadsheets, staying in source systems, building their own dashboards, pulling data manually, waiting on the data team, or escaping to notebooks — which become the team's de facto source of truth.",
          "confidence": "Medium",
          "supportCount": 6,
          "syncedSupportCount": 7
        },
        {
          "title": "Data accuracy mismatches and known bugs destroy trust in Pulse numbers",
          "summary": "When Pulse numbers don't match the source systems, people stop trusting all of it and rebuild the figures by hand.",
          "body": "When Pulse figures disagree with source-system numbers, users lose confidence in all Pulse data, stop presenting it to stakeholders, and rebuild figures manually to defend in meetings.",
          "confidence": "Medium",
          "supportCount": 5,
          "syncedSupportCount": 6
        },
        {
          "title": "Query builder too complex for power users and non-technical users alike — but for opposite reasons",
          "summary": "The query builder overwhelms non-technical users yet boxes in power users — it satisfies neither end of the spectrum.",
          "body": "Non-technical users find the query builder overwhelming for simple tasks, while technical users hit a ceiling when they need advanced SQL constructs, higher query limits, or API access — the tool satisfies neither end of the spectrum.",
          "confidence": "Medium",
          "supportCount": 4,
          "syncedSupportCount": 5
        },
        {
          "title": "Absence of data lineage, freshness indicators, and plain-language metric definitions forces users to distrust Pulse by default",
          "summary": "Pulse data is stale by design — a six-hour sync and multi-day close lags — so teams can't trust it for time-sensitive decisions.",
          "body": "Users cannot see when data was last refreshed or trace a Pulse number back to its source calculation; non-technical users additionally cannot decode jargon metric names to know if they've selected the right metric — forcing everyone to assume the worst and revert to source systems for anything consequential.",
          "confidence": "Medium",
          "supportCount": 4,
          "syncedSupportCount": 5
        },
        {
          "title": "Slow query performance and timeouts undermine trust and usability",
          "summary": "Full-scale queries lag or time out, so users abandon Pulse mid-task — and the heaviest users suffer the most.",
          "body": "Full-scale queries take so long to load — or time out entirely — that users abandon Pulse mid-workflow; the lag and timeout ceiling scale with data volume and query complexity, meaning the heaviest users suffer most.",
          "confidence": "Low",
          "supportCount": 3,
          "syncedSupportCount": 4
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
        "Present the full findings — especially the latent demand signal from all six conditional adopters — to product and engineering leadership with a prioritized fix sequence: (1) join bug, (2) freshness timestamp + metric definitions, (3) sync cadence, (4) permissions redesign, (5) dual UX tracks — and confirm whether each item has an owner and a timeline on the current roadmap."
      ],
      "methodology": "Meridian conducted 8 voice interviews with internal Pulse users across teams. Each transcript updated a living insight document before the next interview plan was generated; findings confirmed by multiple people were promoted in confidence and one-off gripes treated as noise."
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
