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
}

export const RILEY_DEFAULTS: RileyParams = {
  ampGrow: 0,
  amplitude: 0,
  compress: 0,
  drift: 0,
  lines: 40,
  ribbon: 0,
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
  ribbon: { max: 1, min: 0, step: 0.01 },
  spacingGrow: { max: 1, min: -1, step: 0.01 },
  wavelength: { max: 2000, min: 40, step: 1 },
  weight: { max: 12, min: 0.25, step: 0.05 },
};

interface Point { x: number; y: number }

const TAU = Math.PI * 2;

function clamp(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, value));
}

function fmt(n: number) {
  return (Math.round(n * 10) / 10).toString();
}

/** Where line i sits across the stack, 0..1, after the spacing progression. */
function stackPosition(t: number, spacingGrow: number) {
  if (spacingGrow > 0) {return 1 - (1 - t) ** (1 + 3 * spacingGrow);}
  if (spacingGrow < 0) {return t ** (1 - 3 * spacingGrow);}
  return t;
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
    if (k > 0) {theta += TAU * freq * (along / samples);}
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
    out.push(
      p.ribbon > 0
        ? { d: ribbonPath(points, phases, p), fill: true }
        : { d: strokePath(points), fill: false },
    );
  }
  return out;
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
    if (p[key] !== RILEY_DEFAULTS[key]) {q.set(key, String(p[key]));}
  }
  if (p.vertical) {q.set("vertical", "1");}
  return q.toString();
}

export function decodeRiley(query: string, base: RileyParams = RILEY_DEFAULTS): RileyParams {
  const q = new URLSearchParams(query);
  const p: RileyParams = { ...base };
  for (const key of NUMERIC_KEYS) {
    const raw = q.get(key);
    if (raw === null) {continue;}
    const n = Number(raw);
    if (Number.isFinite(n)) {p[key] = clamp(n, RILEY_RANGES[key].min, RILEY_RANGES[key].max);}
  }
  if (q.has("vertical")) {p.vertical = q.get("vertical") !== "0";}
  return p;
}
