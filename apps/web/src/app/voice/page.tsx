import VoiceSession from "@/components/VoiceSession";

export default function VoicePage() {
  return (
    <main className="min-h-screen px-5 py-6 md:px-8">
      <div className="mx-auto flex max-w-3xl flex-col gap-6">
        <header className="border-b border-[var(--line)] pb-5">
          <p className="text-sm font-semibold uppercase tracking-[0.18em] text-[var(--accent)]">
            Meridian Demo
          </p>
          <h1 className="mt-2 text-3xl font-semibold">Live Discovery Call</h1>
          <p className="mt-2 text-sm text-[var(--muted)]">
            AI-driven interview with real-time voice synthesis and adaptive question generation.
            Use <strong>scripted mode</strong> for a reliable demo, or <strong>live mode</strong>{" "}
            to speak directly with the microphone.
          </p>
        </header>

        <div className="rounded-lg border border-[var(--line)] bg-[var(--panel)] p-5">
          <div className="mb-4 flex items-start justify-between gap-4">
            <div>
              <h2 className="text-lg font-semibold">Interview Session — Maya Chen</h2>
              <p className="text-sm text-[var(--muted)]">
                Head of Product, Northstar Labs · Interview 1 of the adaptive loop
              </p>
            </div>
            <span className="shrink-0 rounded-full bg-[var(--panel-strong)] px-3 py-1 text-xs font-semibold text-[var(--accent-ink)]">
              Deepgram STT/TTS
            </span>
          </div>
          <VoiceSession />
        </div>
      </div>
    </main>
  );
}
