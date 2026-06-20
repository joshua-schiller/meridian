import { getDemoData } from "@/lib/api";
import type { Finding, Question, Theme, TranscriptTurn } from "@/lib/fixtures";

function scoreLabel(score: number) {
  return `${Math.round(score * 100)}%`;
}

function trimText(text: string, maxLength: number) {
  if (text.length <= maxLength) return text;
  return `${text.slice(0, maxLength - 1).trimEnd()}...`;
}

function averageScore(questions: Question[]) {
  if (questions.length === 0) return 0;
  return questions.reduce((sum, question) => sum + question.specificity_score, 0) / questions.length;
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
            <span className="font-mono text-xs font-semibold text-[var(--accent-ink)]">
              {scoreLabel(question.specificity_score)} specificity
            </span>
            {question.grounding.length > 0 ? (
              <span className="rounded-md bg-white px-2 py-1 text-xs font-semibold text-[var(--blue)]">
                evidence-linked
              </span>
            ) : null}
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

function Metric({
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
      <p className="text-xs font-semibold uppercase tracking-[0.14em] text-[var(--muted)]">{label}</p>
      <p className="mt-2 font-mono text-3xl font-semibold text-[var(--accent-ink)]">{value}</p>
      <p className="mt-1 text-sm text-[var(--muted)]">{detail}</p>
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
      ? { label: `Live loop: ${metrics.mode}`, cls: "bg-[var(--accent)] text-white" }
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
                {transcript.id}
              </span>
            </div>
            <p className="mt-5 text-sm font-semibold uppercase tracking-[0.16em] text-[var(--accent)]">
              Meridian Demo Console
            </p>
            <h1 className="mt-2 max-w-4xl text-3xl font-semibold tracking-normal text-balance md:text-5xl">
              One interview turns a broad guide into sharper follow-up questions.
            </h1>
            <p className="mt-4 max-w-3xl text-base leading-7 text-[var(--muted)]">
              {contact.name}, {contact.role} at {contact.company}, revealed that synthesis is the
              bottleneck. Meridian converts that signal into a focused next interview guide.
            </p>
          </div>

          <aside className="rounded-lg border border-[var(--line)] bg-[var(--panel)] p-4">
            <p className="text-xs font-semibold uppercase tracking-[0.14em] text-[var(--muted)]">
              Research goal
            </p>
            <p className="mt-2 text-base font-semibold leading-7">{transcript.research_goal}</p>
            <div className="mt-4 rounded-md bg-[var(--panel-strong)] p-3">
              <p className="text-xs font-semibold uppercase tracking-[0.12em] text-[var(--muted)]">
                Question specificity score
              </p>
              <p className="mt-2 text-sm leading-6 text-[var(--muted)]">
                Average across the generated question bank. Higher means the questions are
                narrower, more evidence-linked follow-ups.
              </p>
            </div>
            <div className="mt-4 grid grid-cols-2 gap-3 text-sm">
              <div className="rounded-md border border-[var(--line)] p-3">
                <p className="text-[var(--muted)]">First guide</p>
                <p className="mt-1 font-mono font-semibold">
                  {scoreLabel(averageScore(questionBankBefore.questions))}
                </p>
              </div>
              <div className="rounded-md bg-[var(--accent-wash)] p-3">
                <p className="text-[var(--muted)]">Next guide</p>
                <p className="mt-1 font-mono font-semibold text-[var(--accent-ink)]">
                  {scoreLabel(averageScore(questionBankAfter.questions))}
                </p>
              </div>
            </div>
          </aside>
        </header>

        <section className="grid gap-3 md:grid-cols-3">
          <Metric
            label="Question specificity lift"
            value={`+${specificityDelta} pts`}
            detail={`Average question score: ${metrics.specificity_before.toFixed(2)} to ${metrics.specificity_after.toFixed(2)}`}
          />
          <Metric
            label="Grounded questions"
            value={`${metrics.grounded_questions}/${questionBankAfter.questions.length}`}
            detail="Every strong follow-up points back to evidence."
          />
          <Metric
            label="New findings"
            value={`+${metrics.findings_added}`}
            detail="Themes captured for the stakeholder report."
          />
        </section>

        <section className="grid gap-4 xl:grid-cols-[0.9fr_1.1fr]">
          <div className="rounded-lg border border-[var(--line)] bg-[var(--panel)] p-4">
            <p className="text-xs font-semibold uppercase tracking-[0.14em] text-[var(--muted)]">
              Before Interview 1
            </p>
            <h2 className="mt-2 text-2xl font-semibold">Broad discovery guide</h2>
            <p className="mt-2 text-sm leading-6 text-[var(--muted)]">
              The first guide starts wide because Meridian has not heard from a customer yet.
            </p>
            <div className="mt-4 space-y-3">
              {beforeQuestions.map((question, index) => (
                <QuestionPreview key={question.id} question={question} index={index} />
              ))}
            </div>
          </div>

          <div className="rounded-lg border border-[var(--accent-soft)] bg-[var(--panel)] p-4 shadow-sm">
            <p className="text-xs font-semibold uppercase tracking-[0.14em] text-[var(--accent)]">
              After Interview 1
            </p>
            <h2 className="mt-2 text-2xl font-semibold">Sharper next-call guide</h2>
            <p className="mt-2 text-sm leading-6 text-[var(--muted)]">
              The next guide targets synthesis behavior, context retrieval, and trust thresholds.
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
                  What Meridian heard
                </p>
                <h2 className="mt-1 text-2xl font-semibold">Three signals from the transcript</h2>
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
                What changed
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
