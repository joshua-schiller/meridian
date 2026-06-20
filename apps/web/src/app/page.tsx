import { readDemoFixtures } from "@/lib/fixtures";

function scoreLabel(score: number) {
  return `${Math.round(score * 100)}% specificity`;
}

export default async function Home() {
  const { contact, dossier, transcript, questionBanks, insightDocs } = await readDemoFixtures();
  const [questionBankOne, questionBankTwo] = questionBanks;
  const [, insightAfterInterviewOne] = insightDocs;

  return (
    <main className="min-h-screen px-5 py-6 md:px-8">
      <div className="mx-auto flex max-w-7xl flex-col gap-6">
        <header className="flex flex-col gap-4 border-b border-[var(--line)] pb-5 md:flex-row md:items-end md:justify-between">
          <div className="max-w-3xl">
            <p className="text-sm font-semibold uppercase tracking-[0.18em] text-[var(--accent)]">
              Meridian Demo Console
            </p>
            <h1 className="mt-2 text-3xl font-semibold tracking-normal md:text-5xl">
              Discovery research that gets sharper after each interview.
            </h1>
          </div>
          <div className="grid gap-1 text-sm text-[var(--muted)] md:text-right">
            <span>Research goal</span>
            <strong className="max-w-xl font-medium text-[var(--foreground)]">
              {transcript.research_goal}
            </strong>
          </div>
        </header>

        <section className="grid gap-4 lg:grid-cols-[0.95fr_1.05fr]">
          <div className="rounded-lg border border-[var(--line)] bg-[var(--panel)] p-4">
            <div className="flex items-start justify-between gap-4">
              <div>
                <h2 className="text-lg font-semibold">Interviewee Dossier</h2>
                <p className="text-sm text-[var(--muted)]">
                  {contact.name}, {contact.role} at {contact.company}
                </p>
              </div>
              <span className="rounded-full bg-[var(--panel-strong)] px-3 py-1 text-xs font-semibold text-[var(--accent-ink)]">
                Offline artifact
              </span>
            </div>
            <p className="mt-4 text-sm leading-6">{dossier.summary}</p>
            <div className="mt-4 grid gap-3 md:grid-cols-2">
              {dossier.personalization_hooks.map((hook) => (
                <div key={hook} className="rounded-md border border-[var(--line)] p-3 text-sm">
                  {hook}
                </div>
              ))}
            </div>
          </div>

          <div className="rounded-lg border border-[var(--line)] bg-[var(--panel)] p-4">
            <div className="flex items-center justify-between gap-4">
              <h2 className="text-lg font-semibold">Transcript Seam</h2>
              <span className="font-mono text-xs text-[var(--muted)]">{transcript.id}</span>
            </div>
            <div className="mt-4 max-h-72 space-y-3 overflow-auto pr-1">
              {transcript.turns.slice(0, 7).map((turn) => (
                <div
                  key={turn.id}
                  className="grid grid-cols-[7rem_1fr] gap-3 rounded-md border border-[var(--line)] p-3 text-sm"
                >
                  <span className="font-mono text-xs uppercase text-[var(--muted)]">
                    {turn.speaker}
                  </span>
                  <p className="leading-6">{turn.text}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        <section className="grid gap-4 lg:grid-cols-2">
          {[questionBankOne, questionBankTwo].map((bank) => (
            <article key={bank.id} className="rounded-lg border border-[var(--line)] bg-[var(--panel)] p-4">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <h2 className="text-lg font-semibold">Interview {bank.interview_number} Questions</h2>
                  <p className="text-sm text-[var(--muted)]">{bank.personalized_opening}</p>
                </div>
                <span className="rounded-full bg-[var(--panel-strong)] px-3 py-1 text-xs font-semibold text-[var(--accent-ink)]">
                  {bank.questions.length} questions
                </span>
              </div>
              <div className="mt-4 space-y-3">
                {bank.questions.map((question) => (
                  <div key={question.id} className="rounded-md border border-[var(--line)] p-3">
                    <div className="flex items-start justify-between gap-3">
                      <h3 className="text-base font-semibold leading-6">{question.primary}</h3>
                      <span className="shrink-0 rounded-full bg-white px-2 py-1 font-mono text-xs text-[var(--blue)]">
                        {scoreLabel(question.specificity_score)}
                      </span>
                    </div>
                    <p className="mt-2 text-sm leading-6 text-[var(--muted)]">{question.rationale_gap}</p>
                    {question.grounding.length > 0 ? (
                      <p className="mt-2 text-sm font-medium text-[var(--accent-ink)]">
                        Grounded in: {question.grounding.join("; ")}
                      </p>
                    ) : null}
                  </div>
                ))}
              </div>
            </article>
          ))}
        </section>

        <section className="rounded-lg border border-[var(--line)] bg-[var(--panel)] p-4">
          <div className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
            <div>
              <h2 className="text-lg font-semibold">Living Insight Document After Interview 1</h2>
              <p className="text-sm text-[var(--muted)]">
                Updated themes, open questions, and contradictions become the next question bank.
              </p>
            </div>
            <span className="font-mono text-xs text-[var(--muted)]">{insightAfterInterviewOne.id}</span>
          </div>
          <div className="mt-4 grid gap-4 md:grid-cols-3">
            {insightAfterInterviewOne.themes.map((theme) => (
              <div key={theme.id} className="rounded-md border border-[var(--line)] p-3">
                <h3 className="font-semibold">{theme.label}</h3>
                <ul className="mt-3 space-y-3 text-sm leading-6">
                  {theme.findings.map((finding) => (
                    <li key={finding.id}>
                      <span className="font-medium text-[var(--accent-ink)]">{finding.status}</span>:{" "}
                      {finding.text}
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        </section>
      </div>
    </main>
  );
}
