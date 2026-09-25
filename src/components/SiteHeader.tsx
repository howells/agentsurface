import Link from "next/link";
import { ThemeToggle } from "@/components/ThemeToggle";
import { cn } from "@/lib/utils";

interface SiteHeaderProps {
  /** Span the docs grid, sidebar to contents, instead of the page column. On phones it scrolls away. */
  wide?: boolean;
}

export function SiteHeader({ wide = false }: SiteHeaderProps) {
  return (
    <header
      className={cn(
        "sticky top-0 z-30 w-full border-b border-fd-border bg-fd-background/80 backdrop-blur-lg",
        wide && "max-md:static",
      )}
    >
      <div
        className={cn(
          "mx-auto flex h-12 items-center justify-between",
          wide ? "max-w-[97rem] px-4" : "max-w-5xl px-6 sm:px-10",
        )}
      >
        <Link href="/" className="type-small font-mono text-fd-foreground focus-ring">
          Agent Surface
        </Link>
        <nav className="flex items-center gap-5 type-small text-fd-muted-foreground">
          <Link href="/docs" className="transition-colors hover:text-fd-foreground focus-ring">
            Docs
          </Link>
          <Link href="/glossary" className="transition-colors hover:text-fd-foreground focus-ring">
            Glossary
          </Link>
          <a
            href="https://github.com/howells/agentsurface"
            className="transition-colors hover:text-fd-foreground focus-ring"
            target="_blank"
            rel="noopener noreferrer"
          >
            GitHub
          </a>
          <ThemeToggle className="ml-1" />
        </nav>
      </div>
    </header>
  );
}
