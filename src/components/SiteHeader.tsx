import Link from "next/link";

export function SiteHeader() {
  return (
    <header className="sticky top-0 z-30 w-full border-b border-fd-border bg-fd-background/80 backdrop-blur-lg">
      <div className="mx-auto flex h-12 max-w-5xl items-center justify-between px-6 sm:px-10">
        <Link href="/" className="font-mono text-xs font-medium tracking-wide text-fd-foreground">
          Agent Surface
        </Link>
        <nav className="flex items-center gap-5 text-xs text-fd-muted-foreground">
          <Link href="/docs" className="transition-colors hover:text-fd-foreground">
            Docs
          </Link>
          <Link href="/glossary" className="transition-colors hover:text-fd-foreground">
            Glossary
          </Link>
          <a
            href="https://github.com/howells/agentsurface"
            className="transition-colors hover:text-fd-foreground"
            target="_blank"
            rel="noopener noreferrer"
          >
            GitHub
          </a>
        </nav>
      </div>
    </header>
  );
}
