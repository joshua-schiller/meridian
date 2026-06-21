# Meridian — Design Brief

A self-contained brief for designing the Meridian web app. You have full creative
freedom on the visual direction — this document gives you the product, the user,
the key moments, and real content so the designs are grounded, not generic.

---

## 1. One-liner

**Meridian is an AI research operator that conducts discovery interviews by voice
and makes every interview sharper than the last.**

Research goal in → a stakeholder-ready insight report out, with the interview
questions visibly getting smarter between conversations. No human in the middle.

## 2. The problem it solves

Good qualitative research isn't a pile of interviews — it's a **loop**: what you
learn in interview 1 should sharpen the questions you ask in interview 2. That
between-interview synthesis (turning a transcript into "here's what we now believe,
here's what to dig into next") is the **highest-value part of the work, and the
first thing time pressure kills.**

In practice, synthesis takes ~48 hours, by which point the decision is already
made — so it gets skipped, and every interview keeps asking the same broad,
generic questions. Existing tools each own one slice (outreach, scheduling,
transcription, note storage) but **none close the loop from research goal → report
with adaptive questioning in between.**

Meridian automates exactly that loop. Pointedly, **it is NOT a scheduler or a note
viewer** — one of its own core findings is *"synthesis, not scheduling, is the
bottleneck."* The product's whole stance is that the questions getting smarter is
the magic, and that's what the design should celebrate.

## 3. Who it's for

**Internal Product Managers at tech companies who run qualitative discovery
research** — talking to users/customers to understand a problem before building.

- Non-technical to moderately technical. The bar: **they should never need an
  engineer to use it.**
- Time-poor, evidence-driven, skeptical of "AI magic" — they trust things that
  show their work.
- Anchor persona for all mockups: **Maya Chen, Head of Product at Northstar Labs.**

Tone they respond to: intelligent, calm, trustworthy, premium-but-not-flashy.
Think the polish of Linear / Vercel / Dovetail / Notion, not a consumer app.

## 4. How it works (the flow)

1. PM enters a **research goal** + a short contact list.
2. System builds a **dossier** per contact (for personalization).
3. AI generates a **broad, exploratory question bank** (Interview 1).
4. **The interview runs live by voice** — the AI interviewer (warm, human,
   reactive) conducts it; a transcript streams in real time.
5. The AI **synthesizes** the transcript into a **living insight document**
   (themes, findings, confidence levels, contradictions, open questions).
6. The **question bank regenerates** — now sharp, each question grounded in a
   specific thing the interviewee said.
7. **Interview 2** uses the sharper bank. Repeat.
8. A **stakeholder PDF report** is generated live from the accumulated insights.

## 5. The screens to design

### A. The Dashboard / "Demo Console" (the hero screen)
The command center that tells the whole story. It needs to surface:
- The **research goal** (the anchor of everything).
- **The money shot** (see §6) — Interview 1's broad questions vs Interview 2's
  sharp, grounded ones, side by side, with the specificity jump made obvious.
- The **living insight document** — themes with findings, confidence labels
  (confirmed / challenged / nuanced / open), contradictions, open questions. It
  should feel *alive*, like it's been updated, not static.
- The **interviewee dossier** (who we're talking to + personalization hooks).
- The **transcript** (the raw material, the "seam" everything flows from).
- An entry point to **start a live interview**.

### B. The Live Discovery Call page
A calm, focused voice-interview interface:
- A **voice picker** (choose the AI interviewer's voice — preview by clicking).
- The **live conversation** — alternating turns between the AI interviewer
  ("Meridian") and the interviewee ("Maya Chen"), appearing as they're spoken.
- A clear **live/recording** state.
- After the interview: a **results panel** showing the freshly-run adaptive loop
  (the new sharper questions + evidence) and a **"Download PDF report"** action.

## 6. The hero moment — "the money shot"

The single image that proves the whole product in one glance: **Interview 1's
question bank next to Interview 2's.**

- **Interview 1 (broad):** generic, low "specificity" (~0.30), no grounding.
- **Interview 2 (sharp):** specific, high specificity (~0.80), every question
  traceable to a real quote from the last interview.

Design this so a stranger *gets it instantly*: broad → grounded, dumb → smart.
Lean into the contrast — the specificity score going up, the questions visibly
sharpening, the little quotes that ground each new question. This is the emotional
peak of the product; make it sing.

## 7. Brand personality

- **Intelligent & evidence-driven** — it shows its work; nothing is a black box.
- **Calm & confident** — a senior researcher, not a chatbot.
- **Trustworthy** — "trust depends on visible evidence" is literally a finding;
  surfacing sources/quotes/what-changed should be a first-class visual element.
- **A moment of delight at the money shot**, restraint everywhere else.

Visual direction is open — could be a refined light theme, a focused dark
"console," or a duotone editorial look. Color should probably anchor on one
confident accent (current app uses a deep green) with lots of calm neutral space.
Typography should feel editorial/precise. Data and quotes are the texture.

## 8. Technical constraints (so designs are buildable)

- It's a **web app: Next.js + Tailwind CSS**, component-based, responsive
  (desktop-first, but should hold up on a laptop projector for a demo).
- Uses a **design-token system** (CSS variables for accent/panel/border/etc.) —
  a cohesive token palette will translate cleanly.
- Real-time elements (live transcript, voice state) need clear motion/state cues.
- Keep it implementable — favor strong layout, hierarchy, and type over effects
  that are hard to reproduce in CSS.

## 9. What a great design nails (priorities, in order)

1. **The money shot is legible and beautiful** — broad→grounded in one glance.
2. **The living insight document feels alive and trustworthy** — evidence visible.
3. **The live call feels like a real, calm conversation**, not a form.
4. Cohesive, premium, confident system that a PM would trust with their research.

---

## 10. Real content to use in mockups (don't invent — use this)

**Research goal:** *"Understand why PMs at early-stage startups struggle with
discovery research."*

**Interviewee:** Maya Chen — Head of Product, Northstar Labs.

**Personalized opening (Interview 1):** *"Maya, I saw your note about replacing
long research cycles with weekly customer conversations…"*

**Interview 1 — broad questions (low specificity):**
- `0.24` — "What makes discovery research difficult for your team right now?"
- `0.31` — "How do you prepare for a discovery call today?"
- `0.36` — "What happens to notes and transcripts after a customer interview?"

**Interview 2 — sharp, grounded questions (high specificity):**
- `0.78` — "In your last discovery sprint, what specifically changed in the
  interview guide after the first call?"
  *(grounded in: "teams keep asking broad workflow questions even by the fourth call")*
- `0.84` — "When customer context is scattered across CRM notes, Slack, docs, and
  support threads, which source actually shapes the next interview?"
  *(grounded in: "sales notes, support Slack threads, and call docs are not together")*
- `0.81` — "If an agent proposed the next question bank, what evidence would it
  need to show before you would approve it?"
  *(grounded in: "show me what changed, why it changed, and what evidence it came from")*

**Living insight document — themes (each with findings, confidence, status):**
- **"Synthesis, not scheduling, is the bottleneck"** — *(open, medium confidence)*
  "The team can get customers on calls, but post-call synthesis is skipped because
  it takes too long."
- **"Question banks stay broad for too long"** — *(open, medium)* "By later calls,
  PMs should be testing sharper hypotheses, but they often continue asking broad
  questions."
- **"Trust depends on visible evidence"** — *(open, medium)* "PMs may accept
  agent-generated questions if the system shows what changed, why, and what
  evidence it came from."

**Open questions (drive the next interview):**
- "Do other PMs also see synthesis as a bigger blocker than recruiting?"
- "What evidence format makes an AI-generated question bank trustworthy?"

**Status labels for findings:** confirmed · challenged · nuanced · open
**Confidence labels:** high · medium · low

**Final output:** a stakeholder PDF report — exec summary, findings by theme,
confidence levels, contradictions/open questions, recommended next steps,
methodology appendix.

---

### How to use this with Claude
Paste this whole document, then ask for what you want — e.g. *"Design the
dashboard hero screen for this product as a React/HTML artifact, emphasizing the
money shot,"* or *"Give me 3 distinct visual directions for the whole app."*
Iterate from there.
