import "fumadocs-ui/style.css";
import "./global.css";
import { RootProvider } from "fumadocs-ui/provider/next";
import type { Metadata } from "next";
import type { ReactNode } from "react";

const BASE_URL = "https://agentsurface.dev";

const jsonLd = {
  "@context": "https://schema.org",
  "@type": "SoftwareApplication",
  applicationCategory: "DeveloperApplication",
  author: {
    "@type": "Person",
    name: "Daniel Howells",
    url: "https://github.com/howells",
  },
  codeRepository: "https://github.com/howells/agentsurface",
  description:
    "A guide and implementation kit for agent-readable software, production agent systems, protocols, tooling, retrieval, evaluation, and operational skills.",
  license: "https://opensource.org/licenses/MIT",
  name: "Agent Surface",
  offers: {
    "@type": "Offer",
    price: "0",
    priceCurrency: "USD",
  },
  operatingSystem: "Any",
  url: BASE_URL,
};

export const metadata: Metadata = {
  description:
    "A dense guide to agent-readable software, production agent systems, protocols, tooling, retrieval, evaluation, and the surface skill.",
  metadataBase: new URL(BASE_URL),
  openGraph: {
    description:
      "A dense guide to agent-readable software, production agent systems, protocols, tooling, retrieval, evaluation, and the surface skill.",
    images: [{ url: "/og/Agent%20Surface", width: 1200, height: 630 }],
    siteName: "Agent Surface",
    title: "Agent Surface — Make Software Legible to Agents",
    type: "website",
  },
  title: {
    default: "Agent Surface — Make Software Legible to Agents",
    template: "%s — Agent Surface",
  },
  twitter: {
    card: "summary_large_image",
    description:
      "A dense guide to agent-readable software, production agent systems, protocols, tooling, retrieval, evaluation, and the surface skill.",
    images: ["/og/Agent%20Surface"],
    title: "Agent Surface — Make Software Legible to Agents",
  },
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <meta name="theme-color" content="#fafaf9" media="(prefers-color-scheme: light)" />
        <meta name="theme-color" content="#0f0f0f" media="(prefers-color-scheme: dark)" />
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
