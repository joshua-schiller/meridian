import IntervieweeSession from "@/components/IntervieweeSession";

export const metadata = {
  title: "Meridian · Live Interview",
};

export default function IntervieweePage() {
  return (
    <main className="flex min-h-screen flex-col items-center px-5 py-10 md:py-14">
      <header className="mb-12 flex flex-col items-center gap-2 text-center">
        <p className="text-xs font-bold uppercase tracking-[0.22em] text-[var(--accent)]">
          Meridian · Discovery Call
        </p>
        <h1 className="text-2xl font-extrabold tracking-tight text-[var(--foreground)] md:text-3xl">
          You're being interviewed
        </h1>
        <p className="max-w-md text-sm text-[var(--muted)]">
          Meridian will ask you a few questions out loud. Find a quiet spot, press begin, and
          just talk — it listens and follows up like a real researcher would.
        </p>
      </header>

      <IntervieweeSession />
    </main>
  );
}
