import "fumadocs-ui/style.css";
import "./global.css";
import { RootProvider } from "fumadocs-ui/provider/next";
import type { Metadata } from "next";
import type { ReactNode } from "react";

const BASE_URL = "https://agentsurface.dev";

export const metadata: Metadata = {
  metadataBase: new URL(BASE_URL),
  title: {
    default: "Agent Surface — Make Software Legible to Agents",
    template: "%s — Agent Surface",
  },
  description:
    "A practical resource for designing codebases, APIs, CLIs, docs, tools, and skills that AI agents can understand and use.",
  openGraph: {
    type: "website",
    siteName: "Agent Surface",
    title: "Agent Surface — Make Software Legible to Agents",
    description:
      "A practical resource for designing codebases, APIs, CLIs, docs, tools, and skills that AI agents can understand and use.",
    images: [{ url: "/og/Agent%20Surface", width: 1200, height: 630 }],
  },
  twitter: {
    card: "summary_large_image",
    title: "Agent Surface — Make Software Legible to Agents",
    description:
      "A practical resource for designing codebases, APIs, CLIs, docs, tools, and skills that AI agents can understand and use.",
    images: ["/og/Agent%20Surface"],
  },
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <meta
          name="theme-color"
          content="#fafaf9"
          media="(prefers-color-scheme: light)"
        />
        <meta
          name="theme-color"
          content="#0f0f0f"
          media="(prefers-color-scheme: dark)"
        />
        <link href="https://rsms.me/" rel="preconnect" />
        <link href="https://rsms.me/inter/inter.css" rel="stylesheet" />
      </head>
      <body className="flex flex-col min-h-screen antialiased">
        <RootProvider>{children}</RootProvider>
      </body>
    </html>
  );
}
