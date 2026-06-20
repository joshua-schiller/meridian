import { getDemoData } from "@/lib/api";
import type { Finding, Question, Theme, TranscriptTurn } from "@/lib/fixtures";

function scoreLabel(score: number) {
  return `${Math.round(score * 100)}%`;
}

function trimText(text: string, maxLength: number) {
  if (text.length <= maxLength) return text;
  return `${text.slice(0, maxLength - 1).trimEnd()}...`;
}

function QuestionPreview({
  question,
  index,
  emphasis = false,
}: {
  question: Question;
  index: number;
  emphasis?: boolean;
}) {
  return (
    <article
      className={`rounded-lg border p-4 ${
        emphasis
          ? "border-[var(--accent-soft)] bg-[var(--accent-wash)]"
          : "border-[var(--line)] bg-[var(--panel)]"
      }`}
    >
      <div className="flex items-start gap-3">
        <span
          className={`grid h-7 w-7 shrink-0 place-items-center rounded-md font-mono text-xs font-semibold ${
            emphasis ? "bg-[var(--accent)] text-white" : "bg-[var(--panel-strong)] text-[var(--muted)]"
          }`}
        >
          {index + 1}
        </span>
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            {question.grounding.length > 0 ? (
              <span className="rounded-md bg-white px-2 py-1 text-xs font-semibold text-[var(--blue)]">
                evidence-linked
              </span>
            ) : (
              <span className="rounded-md bg-[var(--panel-strong)] px-2 py-1 text-xs font-semibold text-[var(--muted)]">
                broad baseline
              </span>
            )}
            <span className="font-mono text-xs font-semibold text-[var(--muted)]">
              {scoreLabel(question.specificity_score)} specificity
            </span>
          </div>
          <h3 className="mt-2 text-base font-semibold leading-6">{question.primary}</h3>
          {emphasis ? (
            <p className="mt-3 text-sm leading-6 text-[var(--muted)]">
              {trimText(question.rationale_gap, 190)}
            </p>
          ) : null}
        </div>
      </div>
    </article>
  );
}

function LoopStep({
  step,
  title,
  body,
}: {
  step: string;
  title: string;
  body: string;
}) {
  return (
    <article className="rounded-lg border border-[var(--line)] bg-[var(--panel)] p-4">
      <span className="grid h-8 w-8 place-items-center rounded-md bg-[var(--accent)] font-mono text-sm font-semibold text-white">
        {step}
      </span>
      <h3 className="mt-4 text-lg font-semibold">{title}</h3>
      <p className="mt-2 text-sm leading-6 text-[var(--muted)]">{body}</p>
    </article>
  );
}

function QualityCheck({
  label,
  value,
  detail,
}: {
  label: string;
  value: string;
  detail: string;
}) {
  return (
    <div className="rounded-lg border border-[var(--line)] bg-[var(--panel)] p-4">
      <div className="flex items-baseline justify-between gap-3">
        <p className="text-sm font-semibold">{label}</p>
        <p className="font-mono text-lg font-semibold text-[var(--accent-ink)]">{value}</p>
      </div>
      <p className="mt-2 text-sm leading-6 text-[var(--muted)]">{detail}</p>
    </div>
  );
}

function EvidenceCard({ turn }: { turn: TranscriptTurn }) {
  return (
    <article className="rounded-lg border border-[var(--line)] bg-[var(--panel)] p-4">
      <p className="font-mono text-xs font-semibold uppercase tracking-[0.12em] text-[var(--muted)]">
        {turn.speaker}
      </p>
      <p className="mt-3 text-sm leading-6">{turn.text}</p>
    </article>
  );
}

function ThemeCard({ theme, finding }: { theme: Theme; finding: Finding }) {
  return (
    <article className="rounded-lg border border-[var(--line)] bg-[var(--panel)] p-4">
      <div className="flex flex-wrap items-center gap-2">
        <span className="rounded-md bg-[var(--panel-strong)] px-2 py-1 text-xs font-semibold text-[var(--accent-ink)]">
          {finding.confidence} confidence
        </span>
        <span className="rounded-md bg-[var(--status-wash)] px-2 py-1 text-xs font-semibold text-[var(--status-ink)]">
          {finding.status}
        </span>
      </div>
      <h3 className="mt-3 text-base font-semibold">{theme.label}</h3>
      <p className="mt-2 text-sm leading-6 text-[var(--muted)]">{finding.text}</p>
    </article>
  );
}

export default async function Home() {
  const {
    contact,
    dossier,
    transcript,
    questionBankBefore,
    questionBankAfter,
    insightAfter,
    metrics,
    source,
  } = await getDemoData("deterministic");

  const liveBadge =
    source === "api"
      ? { label: `Live adaptive loop: ${metrics.mode}`, cls: "bg-[var(--accent)] text-white" }
      : { label: "Fixture fallback", cls: "bg-[var(--warn)] text-white" };
  const specificityDelta = Math.round(
    (metrics.specificity_after - metrics.specificity_before) * 100,
  );
  const beforeQuestions = questionBankBefore.questions.slice(0, 3);
  const afterQuestions = questionBankAfter.questions.slice(0, 3);
  const intervieweeSignals = transcript.turns
    .filter((turn) => turn.speaker === "interviewee")
    .slice(0, 3);
  const topFindings = insightAfter.themes.flatMap((theme) =>
    theme.findings.slice(0, 1).map((finding) => ({ theme, finding })),
  );

  return (
    <main className="min-h-screen px-4 py-5 md:px-8 md:py-7">
      <div className="mx-auto flex max-w-7xl flex-col gap-5">
        <header className="grid gap-5 border-b border-[var(--line)] pb-5 xl:grid-cols-[1fr_25rem]">
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <span className={`rounded-md px-3 py-1 text-xs font-semibold ${liveBadge.cls}`}>
                {liveBadge.label}
              </span>
              <span className="rounded-md bg-[var(--panel-strong)] px-3 py-1 font-mono text-xs font-semibold text-[var(--accent-ink)]">
                transcript in, next guide out
              </span>
            </div>
            <p className="mt-5 text-sm font-semibold uppercase tracking-[0.16em] text-[var(--accent)]">
              Meridian Demo Console
            </p>
            <h1 className="mt-2 max-w-4xl text-3xl font-semibold tracking-normal text-balance md:text-5xl">
              Meridian turns every discovery call into a sharper next interview.
            </h1>
            <p className="mt-4 max-w-3xl text-base leading-7 text-[var(--muted)]">
              The product closes the gap between interviews. It reads the transcript, updates the
              living insight document, and produces the next question guide so teams stop repeating
              the same broad discovery script.
            </p>
          </div>

          <aside className="rounded-lg border border-[var(--line)] bg-[var(--panel)] p-4">
            <p className="text-xs font-semibold uppercase tracking-[0.14em] text-[var(--muted)]">
              Current research goal
            </p>
            <p className="mt-2 text-base font-semibold leading-7">{transcript.research_goal}</p>
            <div className="mt-4 space-y-3 text-sm leading-6">
              <div className="rounded-md bg-[var(--panel-strong)] p-3">
                <p className="font-semibold text-[var(--accent-ink)]">Input</p>
                <p className="text-[var(--muted)]">
                  Interview 1 transcript from {contact.name}, {contact.company}.
                </p>
              </div>
              <div className="rounded-md bg-[var(--accent-wash)] p-3">
                <p className="font-semibold text-[var(--accent-ink)]">Output</p>
                <p className="text-[var(--muted)]">
                  Updated insights plus an Interview 2 guide grounded in what changed.
                </p>
              </div>
            </div>
          </aside>
        </header>

        <section className="rounded-lg border border-[var(--accent-soft)] bg-[var(--accent-wash)] p-4">
          <div className="grid gap-4 lg:grid-cols-[20rem_1fr]">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.14em] text-[var(--accent)]">
                What the product does
              </p>
              <h2 className="mt-2 text-2xl font-semibold">Runs the discovery loop between calls</h2>
              <p className="mt-3 text-sm leading-6 text-[var(--muted)]">
                Meridian is not a note viewer. It is an adaptive research operator: each transcript
                changes the artifact the next interview starts from.
              </p>
            </div>
            <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
              <LoopStep
                step="1"
                title="Capture the transcript"
                body="A live or fallback interview transcript becomes the shared input for the loop."
              />
              <LoopStep
                step="2"
                title="Extract what changed"
                body="The system identifies new themes, evidence, open questions, and contradictions."
              />
              <LoopStep
                step="3"
                title="Update the insight doc"
                body="Findings are added to a living research artifact with confidence and source context."
              />
              <LoopStep
                step="4"
                title="Generate the next guide"
                body="The next question bank targets the gaps and evidence from the prior interview."
              />
            </div>
          </div>
        </section>

        <section className="grid gap-4 xl:grid-cols-[0.9fr_1.1fr]">
          <div className="rounded-lg border border-[var(--line)] bg-[var(--panel)] p-4">
            <p className="text-xs font-semibold uppercase tracking-[0.14em] text-[var(--muted)]">
              Starting point
            </p>
            <h2 className="mt-2 text-2xl font-semibold">Interview 1 guide is broad</h2>
            <p className="mt-2 text-sm leading-6 text-[var(--muted)]">
              Before customer evidence, the guide asks general workflow questions.
            </p>
            <div className="mt-4 space-y-3">
              {beforeQuestions.map((question, index) => (
                <QuestionPreview key={question.id} question={question} index={index} />
              ))}
            </div>
          </div>

          <div className="rounded-lg border border-[var(--accent-soft)] bg-[var(--panel)] p-4 shadow-sm">
            <p className="text-xs font-semibold uppercase tracking-[0.14em] text-[var(--accent)]">
              Result of the loop
            </p>
            <h2 className="mt-2 text-2xl font-semibold">Interview 2 guide is aimed at the gaps</h2>
            <p className="mt-2 text-sm leading-6 text-[var(--muted)]">
              After the transcript is synthesized, the next guide targets synthesis behavior,
              context retrieval, and trust thresholds.
            </p>
            <div className="mt-4 space-y-3">
              {afterQuestions.map((question, index) => (
                <QuestionPreview key={question.id} question={question} index={index} emphasis />
              ))}
            </div>
          </div>
        </section>

        <section className="grid gap-4 xl:grid-cols-[1fr_1fr]">
          <div>
            <div className="mb-3 flex items-end justify-between gap-4">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.14em] text-[var(--muted)]">
                  Evidence from Interview 1
                </p>
                <h2 className="mt-1 text-2xl font-semibold">The transcript shows the synthesis bottleneck</h2>
              </div>
              <span className="font-mono text-xs text-[var(--muted)]">{transcript.source}</span>
            </div>
            <div className="grid gap-3">
              {intervieweeSignals.map((turn) => (
                <EvidenceCard key={turn.id} turn={turn} />
              ))}
            </div>
          </div>

          <div>
            <div className="mb-3">
              <p className="text-xs font-semibold uppercase tracking-[0.14em] text-[var(--muted)]">
                Updated research artifact
              </p>
              <h2 className="mt-1 text-2xl font-semibold">Living insight document</h2>
            </div>
            <div className="grid gap-3">
              {topFindings.map(({ theme, finding }) => (
                <ThemeCard key={finding.id} theme={theme} finding={finding} />
              ))}
            </div>
          </div>
        </section>

        <section className="rounded-lg border border-[var(--line)] bg-[var(--panel)] p-4">
          <div className="grid gap-3 md:grid-cols-3">
            <QualityCheck
              label="Specificity check"
              value={`+${specificityDelta} pts`}
              detail={`The question-bank average moved from ${metrics.specificity_before.toFixed(2)} to ${metrics.specificity_after.toFixed(2)}.`}
            />
            <QualityCheck
              label="Grounding check"
              value={`${metrics.grounded_questions}/${questionBankAfter.questions.length}`}
              detail="Generated follow-ups point back to evidence from the transcript."
            />
            <QualityCheck
              label="Synthesis check"
              value={`+${metrics.findings_added}`}
              detail="New findings were added to the living insight document."
            />
          </div>
        </section>

        <section className="rounded-lg border border-[var(--line)] bg-[var(--panel)] p-4">
          <div className="grid gap-4 lg:grid-cols-[22rem_1fr]">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.14em] text-[var(--muted)]">
                Dossier context
              </p>
              <h2 className="mt-2 text-xl font-semibold">
                {contact.name}, {contact.company}
              </h2>
              <p className="mt-2 text-sm leading-6 text-[var(--muted)]">
                {trimText(dossier.summary, 250)}
              </p>
            </div>
            <div className="grid gap-3 md:grid-cols-3">
              {dossier.personalization_hooks.slice(0, 3).map((hook) => (
                <div key={hook} className="rounded-md border border-[var(--line)] p-3 text-sm leading-6">
                  {hook}
                </div>
              ))}
            </div>
          </div>
        </section>
      </div>
    </main>
  );
}
