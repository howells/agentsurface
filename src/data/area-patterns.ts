// Extension kept so `scripts/render-area-patterns.mts` can run this under plain Node.
import { RILEY_DEFAULTS } from "../lib/riley.ts";
import type { RileyParams } from "../lib/riley.ts";

export interface AreaPattern {
  id: string;
  name: string;
  params: RileyParams;
}

// One structure per area, all drawn by the same hairline generator so they read as a series,
// and all fraying out towards the bottom so the card heading sits among the last lines.
// Edit these in the studio at /patterns, then run `pnpm patterns:render`.
export const AREA_PATTERNS: AreaPattern[] = [
  {
    id: "hatch",
    name: "Hatch",
    params: { ...RILEY_DEFAULTS },
  },
  {
    // A signal spreading from a point.
    id: "discoverability",
    name: "Discoverability",
    params: {
      ...RILEY_DEFAULTS,
      focusX: 0.2,
      focusY: 0.08,
      kind: "ripple",
      lines: 30,
      loose: 0.55,
      seed: 11,
      spacingGrow: 0.25,
    },
  },
  {
    // Bars gathering to a fold, after Movement in Squares.
    id: "understandability",
    name: "Understandability",
    params: {
      ...RILEY_DEFAULTS,
      focusX: 0.6,
      kind: "bars",
      lines: 44,
      loose: 0.55,
      seed: 22,
      spacingGrow: 0.7,
    },
  },
  {
    // Two sets woven together.
    id: "connections",
    name: "Connections",
    params: {
      ...RILEY_DEFAULTS,
      amplitude: 12,
      kind: "weave",
      lines: 28,
      loose: 0.55,
      seed: 33,
      wavelength: 700,
    },
  },
  {
    // Lines parting around an opening.
    id: "auth-identity",
    name: "Sign-in & permissions",
    params: {
      ...RILEY_DEFAULTS,
      amplitude: 30,
      focusX: 0.55,
      focusY: 0.32,
      kind: "lens",
      lines: 36,
      loose: 0.55,
      seed: 44,
      wavelength: 800,
    },
  },
  {
    // A route converging on its destination.
    id: "usability",
    name: "Usability",
    params: {
      ...RILEY_DEFAULTS,
      focusX: 1.05,
      focusY: 0.98,
      kind: "fan",
      lines: 40,
      loose: 0.55,
      seed: 55,
      wavelength: 700,
    },
  },
  {
    // Measured zigzag bands.
    id: "payments",
    name: "Payments",
    params: {
      ...RILEY_DEFAULTS,
      amplitude: 18,
      kind: "chevron",
      lines: 30,
      loose: 0.55,
      seed: 66,
      wavelength: 260,
    },
  },
];
