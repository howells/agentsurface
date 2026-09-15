import { createMDX } from "fumadocs-mdx/next";

const withMDX = createMDX();

/** @type {import('next').NextConfig} */
const config = {
  reactCompiler: true,
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
