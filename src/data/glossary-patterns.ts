// Extension kept so `scripts/render-patterns.mts` can run this under plain Node.
import { RILEY_DEFAULTS } from "../lib/riley.ts";
import type { RileyParams } from "../lib/riley.ts";

export interface GlossaryPattern {
  category: string;
  slug: string;
  params: RileyParams;
}

// One line-field composition per glossary category, rendered to src/assets/glossary/*.svg by
// `pnpm patterns:render`. Wave height stays under the line spacing so lines never cross.
const BASE: RileyParams = { ...RILEY_DEFAULTS, weight: 2 };

export const GLOSSARY_PATTERNS: GlossaryPattern[] = [
  {
    category: "Foundation",
    slug: "foundation",
    params: { ...BASE, amplitude: 12, lines: 40, wavelength: 900 },
  },
  {
    category: "Memory & knowledge",
    slug: "memory-knowledge",
    params: { ...BASE, amplitude: 30, drift: 0.03, lines: 40, vertical: true, wavelength: 500 },
  },
  {
    category: "Agent infrastructure",
    slug: "agent-infrastructure",
    params: { ...BASE, amplitude: 10, kind: "chevron", lines: 44, wavelength: 150 },
  },
  {
    category: "Agent readiness",
    slug: "agent-readiness",
    params: { ...BASE, amplitude: 40, drift: 0.03, lines: 46, wavelength: 520 },
  },
  {
    category: "Data & integration",
    slug: "data-integration",
    params: { ...BASE, amplitude: 10, drift: 0.25, lines: 40, wavelength: 520 },
  },
  {
    category: "Auth & identity",
    slug: "auth-identity",
    params: { ...BASE, amplitude: 16, drift: 0.02, lines: 50, spacingGrow: 0.3, wavelength: 220 },
  },
  {
    category: "Ops & lifecycle",
    slug: "ops-lifecycle",
    params: { ...BASE, amplitude: 36, compress: 0.9, drift: 0.015, lines: 44, wavelength: 1200 },
  },
  {
    category: "Payments",
    slug: "payments",
    params: { ...BASE, amplitude: 11, drift: 0.5, lines: 40, wavelength: 260 },
  },
];
