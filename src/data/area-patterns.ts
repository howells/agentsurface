// Extension kept so `scripts/render-area-patterns.mts` can run this under plain Node.
import { RILEY_DEFAULTS } from '../lib/riley.ts';
import type { RileyParams } from '../lib/riley.ts';

export interface AreaPattern { id: string; name: string; params: RileyParams }

// One line field per area, all drawn by the same generator so they read as a series.
// Edit these in the studio at /patterns, then run `pnpm patterns:render`.
export const AREA_PATTERNS: AreaPattern[] = [
  {
    id: "hatch",
    name: "Hatch",
    params: { ...RILEY_DEFAULTS },
  },
  {
    // A signal spreading: waves at the top settle to calm lines below.
    id: "discoverability",
    name: "Discoverability",
    params: {
      ...RILEY_DEFAULTS,
      ampGrow: -1,
      amplitude: 56,
      drift: 0.035,
      lines: 34,
      wavelength: 480,
    },
  },
  {
    // Noise on the left resolving into order on the right.
    id: "understandability",
    name: "Understandability",
    params: {
      ...RILEY_DEFAULTS,
      amplitude: 26,
      compress: -0.9,
      drift: 0.07,
      lines: 38,
      wavelength: 260,
    },
  },
  {
    // Two fields woven: a travelling crest across vertical lines.
    id: "connections",
    name: "Connections",
    params: {
      ...RILEY_DEFAULTS,
      amplitude: 30,
      drift: 0.12,
      lines: 38,
      vertical: true,
      wavelength: 380,
    },
  },
  {
    // Lines gathering towards one boundary.
    id: "auth-identity",
    name: "Sign-in & permissions",
    params: {
      ...RILEY_DEFAULTS,
      amplitude: 22,
      lines: 38,
      spacingGrow: 0.4,
      vertical: true,
      wavelength: 620,
    },
  },
  {
    // A long sweep tightening towards its destination.
    id: "usability",
    name: "Usability",
    params: {
      ...RILEY_DEFAULTS,
      amplitude: 48,
      compress: 0.7,
      drift: 0.025,
      lines: 34,
      wavelength: 760,
    },
  },
  {
    // Measured bands: alternate lines inverted so they meet in lenses.
    id: "payments",
    name: "Payments",
    params: { ...RILEY_DEFAULTS, amplitude: 9, drift: 0.5, lines: 30, wavelength: 210 },
  },
];
