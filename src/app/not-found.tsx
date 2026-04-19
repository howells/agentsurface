import Link from "next/link";

export default function NotFound() {
  return (
    <main className="flex flex-1 flex-col items-center justify-center px-6 text-center">
      <p className="font-mono text-sm text-fd-muted-foreground">404</p>
      <h1 className="mt-3 text-2xl font-semibold tracking-tight">
        Page not found
      </h1>
      <p className="mt-2 text-sm text-fd-muted-foreground">
        The page you're looking for doesn't exist or has been moved.
      </p>
      <Link
        href="/"
        className="mt-6 inline-flex h-9 items-center rounded-md bg-fd-primary px-4 text-sm font-medium text-fd-primary-foreground transition-colors hover:bg-fd-primary/90"
      >
        Back to home
      </Link>
    </main>
  );
}
