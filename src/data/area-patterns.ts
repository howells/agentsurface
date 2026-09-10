// Extension kept so `scripts/render-area-patterns.mts` can run this under plain Node.
import { RILEY_DEFAULTS } from "../lib/riley.ts";
import type { RileyParams } from "../lib/riley.ts";

export interface AreaPattern {
  id: string;
  name: string;
  params: RileyParams;
}

// Six shuffled wave fields from the generator. Each stops about halfway down, so the card
// heading sits below whole lines, none cut. Edit them in the studio at /patterns,
// then run `pnpm patterns:render`.
export const AREA_PATTERNS: AreaPattern[] = [
  {
    id: "hatch",
    name: "Hatch",
    params: { ...RILEY_DEFAULTS },
  },
  {
    // One broad swell with a travelling crest.
    id: "discoverability",
    name: "Discoverability",
    params: {
      ...RILEY_DEFAULTS,
      amplitude: 106,
      compress: -0.07,
      drift: 0.057,
      lines: 12,
      extent: 0.46,
      seed: 5101,
      wavelength: 897,
    },
  },
  {
    // Near-straight lines settling into order.
    id: "understandability",
    name: "Understandability",
    params: {
      ...RILEY_DEFAULTS,
      ampGrow: 0.33,
      amplitude: 18,
      drift: 0.097,
      lines: 20,
      extent: 0.46,
      seed: 3784,
      wavelength: 1005,
    },
  },
  {
    // A crest running diagonally across the field.
    id: "connections",
    name: "Connections",
    params: {
      ...RILEY_DEFAULTS,
      ampGrow: -0.34,
      amplitude: 49,
      compress: -0.5,
      drift: 0.053,
      lines: 20,
      extent: 0.46,
      seed: 2860,
      wavelength: 408,
    },
  },
  {
    // Tight on the left, opening out to the right.
    id: "auth-identity",
    name: "Sign-in & permissions",
    params: {
      ...RILEY_DEFAULTS,
      amplitude: 120,
      compress: -0.56,
      drift: -0.012,
      lines: 18,
      extent: 0.46,
      seed: 4134,
      wavelength: 745,
    },
  },
  {
    // A long sweep rising to one side.
    id: "usability",
    name: "Usability",
    params: {
      ...RILEY_DEFAULTS,
      amplitude: 120,
      drift: 0.033,
      lines: 16,
      extent: 0.46,
      seed: 5826,
      wavelength: 741,
    },
  },
  {
    // Few, calm, evenly measured lines.
    id: "payments",
    name: "Payments",
    params: {
      ...RILEY_DEFAULTS,
      ampGrow: 0.53,
      amplitude: 32,
      drift: -0.072,
      lines: 12,
      extent: 0.46,
      seed: 4485,
      wavelength: 310,
    },
  },
];
