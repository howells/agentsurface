import { createMDX } from "fumadocs-mdx/next";

const withMDX = createMDX();

/** @type {import('next').NextConfig} */
const config = {
  reactCompiler: true,
  async rewrites() {
    return [
      { source: "/docs.md", destination: "/llms.mdx/docs/content.md" },
      { source: "/docs/:slug*.md", destination: "/llms.mdx/docs/:slug*/content.md" },
      { source: "/guide/:area.md", destination: "/llms.mdx/guide/:area/content.md" },
    ];
  },
  async headers() {
    return [
      {
        source: "/.well-known/api-catalog",
        headers: [
          {
            key: "Content-Type",
            value: 'application/linkset+json;profile="https://www.rfc-editor.org/info/rfc9727"',
          },
        ],
      },
    ];
  },
  // Builds run on this Apple Silicon machine, so file tracing pulls in the macOS
  // sharp binaries. Image optimisation is served by Vercel, never by the function,
  // so the darwin build is dead weight that would also fail a Linux require.
  outputFileTracingExcludes: {
    "**/*": [
      "**/@img/sharp-darwin-*",
      "**/@img/sharp-darwin-*/**",
      "**/@img/sharp-libvips-darwin-*",
      "**/@img/sharp-libvips-darwin-*/**",
    ],
  },
};

export default withMDX(config);
