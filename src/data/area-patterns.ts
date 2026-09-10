// Extension kept so `scripts/render-area-patterns.mts` can run this under plain Node.
import { RILEY_DEFAULTS } from "../lib/riley.ts";
import type { RileyParams } from "../lib/riley.ts";

export interface AreaPattern {
  id: string;
  name: string;
  params: RileyParams;
}

// One full-square composition per area, all from the same generator so they read as a series.
// Wave height stays under the line spacing so lines never cross. Edit them in the studio at
// /patterns, then run `pnpm patterns:render`.
const BASE: RileyParams = { ...RILEY_DEFAULTS, weight: 2 };

export const AREA_PATTERNS: AreaPattern[] = [
  {
    id: "hatch",
    name: "Hatch",
    params: { ...RILEY_DEFAULTS },
  },
  {
    // A crest travelling diagonally through parallel waves, after Current.
    id: "discoverability",
    name: "Discoverability",
    params: { ...BASE, amplitude: 40, drift: 0.03, lines: 46, wavelength: 520 },
  },
  {
    // Waves tightening towards the bottom, after Fall.
    id: "understandability",
    name: "Understandability",
    params: { ...BASE, amplitude: 16, drift: 0.02, lines: 50, spacingGrow: 0.3, wavelength: 220 },
  },
  {
    // The same crest running across vertical lines.
    id: "connections",
    name: "Connections",
    params: { ...BASE, amplitude: 40, drift: 0.035, lines: 46, vertical: true, wavelength: 560 },
  },
  {
    // Each line a quarter-cycle behind the last, so pairs braid.
    id: "auth-identity",
    name: "Sign-in & permissions",
    params: { ...BASE, amplitude: 10, drift: 0.25, lines: 40, wavelength: 520 },
  },
  {
    // A long sweep that tightens towards the right.
    id: "usability",
    name: "Usability",
    params: { ...BASE, amplitude: 36, compress: 0.9, drift: 0.015, lines: 44, wavelength: 1200 },
  },
  {
    // Stacked chevrons, evenly measured.
    id: "payments",
    name: "Payments",
    params: { ...BASE, amplitude: 10, kind: "chevron", lines: 48, wavelength: 150 },
  },
];
