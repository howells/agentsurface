import Link from "next/link";

const links = [
  { href: "/about", label: "About" },
  { href: "/contact", label: "Contact" },
  { href: "/privacy", label: "Privacy" },
];

export function SiteFooter() {
  return (
    <footer className="border-t border-fd-border">
      <div className="mx-auto flex max-w-5xl flex-wrap items-center justify-between gap-x-6 gap-y-3 px-6 py-8 type-small text-fd-muted-foreground sm:px-10">
        <span>
          Agent Surface by{" "}
          <a href="https://danielhowells.com" className="hover:text-fd-foreground focus-ring">
            Daniel Howells
          </a>
        </span>
        <nav aria-label="Site" className="flex flex-wrap items-center gap-x-5 gap-y-2">
          {links.map((link) => (
            <Link key={link.href} href={link.href} className="hover:text-fd-foreground focus-ring">
              {link.label}
            </Link>
          ))}
          <a
            href="https://github.com/howells/agentsurface"
            className="hover:text-fd-foreground focus-ring"
          >
            GitHub
          </a>
          <a
            href="https://registry.modelcontextprotocol.io/v0/servers/dev.agentsurface%2Fdocs/versions/latest"
            className="hover:text-fd-foreground focus-ring"
          >
            MCP Registry
          </a>
        </nav>
      </div>
    </footer>
  );
}
