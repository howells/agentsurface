import "fumadocs-ui/style.css";
import "./global.css";
import { RootProvider } from "fumadocs-ui/provider/next";
import type { Metadata } from "next";
import type { ReactNode } from "react";

const BASE_URL = "https://agentsurface.dev";

const jsonLd = {
  "@context": "https://schema.org",
  "@type": "SoftwareApplication",
  name: "Agent Surface",
  description:
    "A guide and implementation kit for agent-readable software, production agent systems, protocols, tooling, retrieval, evaluation, and operational skills.",
  url: BASE_URL,
  applicationCategory: "DeveloperApplication",
  operatingSystem: "Any",
  author: {
    "@type": "Person",
    name: "Daniel Howells",
    url: "https://github.com/howells",
  },
  codeRepository: "https://github.com/howells/agentsurface",
  license: "https://opensource.org/licenses/MIT",
  offers: {
    "@type": "Offer",
    price: "0",
    priceCurrency: "USD",
  },
};

export const metadata: Metadata = {
  metadataBase: new URL(BASE_URL),
  title: {
    default: "Agent Surface — Make Software Legible to Agents",
    template: "%s — Agent Surface",
  },
  description:
    "A dense guide to agent-readable software, production agent systems, protocols, tooling, retrieval, evaluation, and the surface skill.",
  openGraph: {
    type: "website",
    siteName: "Agent Surface",
    title: "Agent Surface — Make Software Legible to Agents",
    description:
      "A dense guide to agent-readable software, production agent systems, protocols, tooling, retrieval, evaluation, and the surface skill.",
    images: [{ url: "/og/Agent%20Surface", width: 1200, height: 630 }],
  },
  twitter: {
    card: "summary_large_image",
    title: "Agent Surface — Make Software Legible to Agents",
    description:
      "A dense guide to agent-readable software, production agent systems, protocols, tooling, retrieval, evaluation, and the surface skill.",
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
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
        />
      </head>
      <body className="flex flex-col min-h-screen antialiased">
        <RootProvider>{children}</RootProvider>
      </body>
    </html>
  );
}
