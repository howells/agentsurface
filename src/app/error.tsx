"use client";

export default function Error({
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <main className="flex flex-1 flex-col items-center justify-center px-6 text-center">
      <p className="font-mono text-sm text-fd-muted-foreground">500</p>
      <h1 className="mt-3 text-2xl font-semibold tracking-tight">
        Something went wrong
      </h1>
      <p className="mt-2 text-sm text-fd-muted-foreground">
        An unexpected error occurred. Please try again.
      </p>
      <button
        onClick={reset}
        type="button"
        className="mt-6 inline-flex h-9 items-center rounded-md bg-fd-primary px-4 text-sm font-medium text-fd-primary-foreground transition-colors hover:bg-fd-primary/90"
      >
        Try again
      </button>
    </main>
  );
}
