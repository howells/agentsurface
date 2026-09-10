// Extension kept so `scripts/render-area-patterns.mts` can run this under plain Node.
import { RILEY_DEFAULTS } from '../lib/riley.ts';
import type { RileyParams } from '../lib/riley.ts';

export interface AreaPattern {
  id: string;
  name: string;
  params: RileyParams;
}

// One line field per area, all drawn by the same generator so they read as a series. Lines
// run across and fray out towards the bottom, so the card heading sits among the last of them.
// Edit these in the studio at /patterns, then run `pnpm patterns:render`.
export const AREA_PATTERNS: AreaPattern[] = [
  {
    id: "hatch",
    name: "Hatch",
    params: { ...RILEY_DEFAULTS },
  },
  {
    // One broad swell, sparse and open.
    id: "discoverability",
    name: "Discoverability",
    params: {
      ...RILEY_DEFAULTS,
      amplitude: 103,
      lines: 24,
      loose: 0.55,
      seed: 7563,
      wavelength: 853,
    },
  },
  {
    // Flat lines at the top gathering into waves lower down.
    id: "understandability",
    name: "Understandability",
    params: {
      ...RILEY_DEFAULTS,
      ampGrow: 0.77,
      amplitude: 56,
      compress: 0.7,
      lines: 39,
      loose: 0.55,
      seed: 8575,
      spacingGrow: 0.21,
      wavelength: 667,
    },
  },
  {
    // A crest travelling diagonally across the field.
    id: "connections",
    name: "Connections",
    params: {
      ...RILEY_DEFAULTS,
      ampGrow: 0.55,
      amplitude: 86,
      drift: -0.02,
      lines: 30,
      loose: 0.55,
      seed: 2706,
      spacingGrow: 0.18,
      wavelength: 523,
    },
  },
  {
    // Lines packed tight at the top, opening out below.
    id: "auth-identity",
    name: "Sign-in & permissions",
    params: {
      ...RILEY_DEFAULTS,
      amplitude: 120,
      compress: -0.45,
      lines: 41,
      loose: 0.55,
      seed: 5395,
      spacingGrow: -0.19,
      wavelength: 667,
    },
  },
  {
    // A long sweep rising to one side.
    id: "usability",
    name: "Usability",
    params: {
      ...RILEY_DEFAULTS,
      amplitude: 120,
      drift: 0.015,
      lines: 43,
      loose: 0.55,
      seed: 8707,
      spacingGrow: 0.36,
      wavelength: 769,
    },
  },
  {
    // Few, calm, evenly measured lines.
    id: "payments",
    name: "Payments",
    params: {
      ...RILEY_DEFAULTS,
      amplitude: 46,
      drift: 0.045,
      lines: 23,
      loose: 0.55,
      seed: 5851,
      wavelength: 756,
    },
  },
];
