import IntervieweeSession from "@/components/IntervieweeSession";

export const metadata = {
  title: "Meridian · Live Interview",
};

export default function IntervieweePage() {
  return (
    <main className="flex min-h-screen flex-col items-center px-5 py-10 md:py-14">
      <header className="mb-12 flex flex-col items-center gap-2 text-center">
        <h1 className="text-2xl font-extrabold tracking-tight text-[var(--foreground)] md:text-3xl">
          Welcome
        </h1>
        <p className="max-w-md text-sm text-[var(--muted)]">
          Find a quiet spot, and press begin to enter the call.
        </p>
      </header>

      <IntervieweeSession />
    </main>
  );
}
