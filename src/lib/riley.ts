/**
 * Line-field generator after Bridget Riley's curve paintings.
 *
 * One curve unit is repeated across the field. Everything else is a progression applied to
 * that repetition: amplitude growing across the stack, lines bunching towards one edge, the
 * wave compressing along its length, a phase shift per line so the wave travels diagonally,
 * and (after Cataract) a ribbon whose width rises and falls with the curve.
 *
 * Output is deterministic: the same params always produce the same SVG.
 */

export interface RileyParams {
  /** Lines run top to bottom instead of left to right. */
  vertical: boolean;
  /** Number of lines in the field. */
  lines: number;
  /** Stroke width in px. */
  weight: number;
  /** Wave height in px. 0 gives straight hatching like the glossary cards. */
  amplitude: number;
  /** Wave length in px. */
  wavelength: number;
  /** Phase shift per line in cycles. Makes the wave crest travel diagonally. */
  drift: number;
  /** Amplitude change across the stack, -1 (fades out) to 1 (grows). */
  ampGrow: number;
  /** Lines bunch towards the end (+) or start (-) of the stack. */
  spacingGrow: number;
  /** Wavelength shrinks along the line (+) or stretches (-). */
  compress: number;
  /** 0 keeps a hairline; higher values swell the line into a ribbon on each crest. */
  ribbon: number;
  /** Fraction of the square, from the bottom, where lines drop out and end short. */
  loose: number;
  /** Picks which lines fray. Any integer. */
  seed: number;
}

export const RILEY_DEFAULTS: RileyParams = {
  ampGrow: 0,
  amplitude: 0,
  compress: 0,
  drift: 0,
  lines: 40,
  loose: 0,
  ribbon: 0,
  seed: 1,
  spacingGrow: 0,
  vertical: false,
  wavelength: 320,
  weight: 0.75,
};

/** Ranges the studio exposes; also used to clamp params read from a URL. */
export const RILEY_RANGES: Record<
  Exclude<keyof RileyParams, "vertical">,
  { max: number; min: number; step: number }
> = {
  ampGrow: { max: 1, min: -1, step: 0.01 },
  amplitude: { max: 200, min: 0, step: 1 },
  compress: { max: 1, min: -1, step: 0.01 },
  drift: { max: 0.5, min: -0.5, step: 0.005 },
  lines: { max: 160, min: 2, step: 1 },
  loose: { max: 1, min: 0, step: 0.01 },
  ribbon: { max: 1, min: 0, step: 0.01 },
  seed: { max: 9999, min: 0, step: 1 },
  spacingGrow: { max: 1, min: -1, step: 0.01 },
  wavelength: { max: 2000, min: 40, step: 1 },
  weight: { max: 12, min: 0.25, step: 0.05 },
};

interface Point {
  x: number;
  y: number;
}

const TAU = Math.PI * 2;

function clamp(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, value));
}

function fmt(n: number) {
  return (Math.round(n * 10) / 10).toString();
}

/** Small deterministic generator so a seed always frays the same lines. */
function rng(seed: number) {
  let a = seed >>> 0 || 1;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** Where line i sits across the stack, 0..1, after the spacing progression. */
function stackPosition(t: number, spacingGrow: number) {
  if (spacingGrow > 0) {
    return 1 - (1 - t) ** (1 + 3 * spacingGrow);
  }
  if (spacingGrow < 0) {
    return t ** (1 - 3 * spacingGrow);
  }
  return t;
}

/**
 * Which samples of a line survive the loose bottom. Depth runs 0 at the top of the loose
 * zone to 1 where nothing is left. Each line draws its own threshold, so lines drop out one
 * by one, and the survivors are trimmed from a random side the deeper they sit.
 */
function keepMask(points: Point[], index: number, p: RileyParams, size: number): boolean[] {
  if (p.loose <= 0) {
    return points.map(() => true);
  }
  const random = rng(p.seed * 1000003 + index * 7919);
  const threshold = random();
  const fromStart = random();
  const fromEnd = random();
  const zoneStart = (1 - p.loose) * size;
  const zoneLength = p.loose * 0.6 * size;
  return points.map((pt, i) => {
    const depth = clamp((pt.y - zoneStart) / zoneLength, 0, 1);
    if (depth === 0) {
      return true;
    }
    if (depth >= threshold) {
      return false;
    }
    const s = i / (points.length - 1);
    return s >= fromStart * depth && s <= 1 - fromEnd * depth;
  });
}

/** Split points into the runs that survive the mask. Short runs read as specks, so drop them. */
function runs(mask: boolean[]): [number, number][] {
  const out: [number, number][] = [];
  let start = -1;
  for (let i = 0; i <= mask.length; i++) {
    if (i < mask.length && mask[i]) {
      if (start < 0) {
        start = i;
      }
    } else if (start >= 0) {
      if (i - start >= mask.length * 0.12) {
        out.push([start, i]);
      }
      start = -1;
    }
  }
  return out;
}

/** Sample one line as points in field coordinates, plus the wave phase at each sample. */
function sampleLine(
  index: number,
  p: RileyParams,
  size: number,
): { phases: number[]; points: Point[] } {
  const along = size;
  const across = size;
  const t = p.lines > 1 ? index / (p.lines - 1) : 0.5;
  const amp = p.amplitude * clamp(1 + p.ampGrow * (2 * t - 1), 0, 2);
  // Overshoot the edges by the wave height so waves never leave a bare margin.
  const margin = p.amplitude;
  const base = -margin + (across + 2 * margin) * stackPosition(t, p.spacingGrow);
  const phase0 = TAU * p.drift * index;

  const samples = clamp(Math.round(along / 6), 48, 320);
  const points: Point[] = [];
  const phases: number[] = [];
  let theta = 0;
  for (let k = 0; k <= samples; k++) {
    const s = k / samples;
    // Frequency drifts along the line: integrate it so the wave compresses smoothly.
    const freq = Math.max(0.05, 1 + p.compress * (2 * s - 1)) / p.wavelength;
    if (k > 0) {
      theta += TAU * freq * (along / samples);
    }
    const phase = theta + phase0;
    const u = s * along;
    const v = base + amp * Math.sin(phase);
    points.push(p.vertical ? { x: v, y: u } : { x: u, y: v });
    phases.push(phase);
  }
  return { phases, points };
}

function strokePath(points: Point[]) {
  return points.map((pt, i) => `${i === 0 ? "M" : "L"}${fmt(pt.x)} ${fmt(pt.y)}`).join("");
}

/** A filled shape whose width swells on each crest, after Cataract. */
function ribbonPath(points: Point[], phases: number[], p: RileyParams) {
  const half = p.weight / 2;
  const swell = half * 10 * p.ribbon;
  const left: string[] = [];
  const right: string[] = [];
  for (let i = 0; i < points.length; i++) {
    const prev = points[Math.max(0, i - 1)];
    const next = points[Math.min(points.length - 1, i + 1)];
    const tx = next.x - prev.x;
    const ty = next.y - prev.y;
    const len = Math.hypot(tx, ty) || 1;
    const nx = -ty / len;
    const ny = tx / len;
    // Widest a quarter-cycle after the crest, where the curve is steepest.
    const w = half + swell * (0.5 + 0.5 * Math.sin(phases[i] + Math.PI / 2));
    left.push(`${fmt(points[i].x + nx * w)} ${fmt(points[i].y + ny * w)}`);
    right.push(`${fmt(points[i].x - nx * w)} ${fmt(points[i].y - ny * w)}`);
  }
  return `M${left.join("L")}L${right.toReversed().join("L")}Z`;
}

/** Path data for every line in the field. Ribbons are fills, hairlines are strokes. */
export function rileyPaths(p: RileyParams, size = 1024): { d: string; fill: boolean }[] {
  const out: { d: string; fill: boolean }[] = [];
  for (let i = 0; i < p.lines; i++) {
    const { phases, points } = sampleLine(i, p, size);
    for (const [start, end] of runs(keepMask(points, i, p, size))) {
      const pts = points.slice(start, end);
      out.push(
        p.ribbon > 0
          ? { d: ribbonPath(pts, phases.slice(start, end), p), fill: true }
          : { d: strokePath(pts), fill: false },
      );
    }
  }
  return out;
}

/** A tasteful random field: wave height stays under the line spacing so lines never cross. */
export function randomRiley(seed: number, base: Partial<RileyParams> = {}): RileyParams {
  const random = rng(seed);
  const pick = (min: number, max: number) => min + (max - min) * random();
  const maybe = (chance: number, min: number, max: number) =>
    random() < chance ? pick(min, max) : 0;
  const lines = Math.round(pick(22, 44));
  const spacing = 1024 / lines;
  const drift = maybe(0.7, -0.12, 0.12);
  const ampGrow = Math.round(maybe(0.6, -1, 1) * 100) / 100;
  // Neighbours are 2A·sin(π·drift) apart at worst, and growth can double A at one edge.
  const peak = 1 + Math.abs(ampGrow);
  const limit =
    drift === 0 ? spacing * 2.5 : spacing / (2 * Math.sin(Math.PI * Math.abs(drift)) * peak);
  const amplitude = Math.round(clamp(pick(0.25, 1) * limit, 6, 120));
  return {
    ...RILEY_DEFAULTS,
    ampGrow,
    amplitude,
    compress: Math.round(maybe(0.5, -0.8, 0.8) * 100) / 100,
    drift: Math.round(drift * 200) / 200,
    lines,
    seed: Math.round(pick(0, 9999)),
    spacingGrow: Math.round(maybe(0.4, -0.5, 0.5) * 100) / 100,
    vertical: random() < 0.25,
    wavelength: Math.round(pick(180, 900)),
    ...base,
  };
}

/** A standalone SVG document. Lines take `color` (currentColor) so hosts can theme them. */
export function rileySvg(p: RileyParams, size = 1024, color = "#000"): string {
  const paths = rileyPaths(p, size)
    .map(({ d, fill }) =>
      fill
        ? `<path d="${d}" fill="currentColor"/>`
        : `<path d="${d}" fill="none" stroke="currentColor" stroke-width="${p.weight}" stroke-linecap="round"/>`,
    )
    .join("\n");
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${size} ${size}" width="${size}" height="${size}" color="${color}">\n${paths}\n</svg>\n`;
}

const NUMERIC_KEYS = Object.keys(RILEY_RANGES) as (keyof typeof RILEY_RANGES)[];

/** Compact query-string form, e.g. `lines=40&amplitude=60&vertical=1`. */
export function encodeRiley(p: RileyParams): string {
  const q = new URLSearchParams();
  for (const key of NUMERIC_KEYS) {
    if (p[key] !== RILEY_DEFAULTS[key]) {
      q.set(key, String(p[key]));
    }
  }
  if (p.vertical) {
    q.set("vertical", "1");
  }
  return q.toString();
}

export function decodeRiley(query: string, base: RileyParams = RILEY_DEFAULTS): RileyParams {
  const q = new URLSearchParams(query);
  const p: RileyParams = { ...base };
  for (const key of NUMERIC_KEYS) {
    const raw = q.get(key);
    if (raw === null) {
      continue;
    }
    const n = Number(raw);
    if (Number.isFinite(n)) {
      p[key] = clamp(n, RILEY_RANGES[key].min, RILEY_RANGES[key].max);
    }
  }
  if (q.has("vertical")) {
    p.vertical = q.get("vertical") !== "0";
  }
  return p;
}
