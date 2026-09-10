/**
 * Line-field generator after Bridget Riley.
 *
 * Every kind is one unit repeated with a progression: a wave repeated down the field, rings
 * spreading from a point, bars compressing to a fold (Movement in Squares), two diagonal sets
 * woven together, straight lines flowing around an opening, or lines converging on a point.
 * All of them are hairlines in one colour, and all can fray out towards the bottom.
 *
 * Output is deterministic: the same params always produce the same SVG.
 */

export const RILEY_KINDS = ["wave", "chevron", "ripple", "bars", "weave", "lens", "fan"] as const;
export type RileyKind = (typeof RILEY_KINDS)[number];

export const KIND_LABELS: Record<RileyKind, string> = {
  bars: "Bars",
  chevron: "Chevron",
  fan: "Fan",
  lens: "Lens",
  ripple: "Ripple",
  wave: "Wave",
  weave: "Weave",
};

export interface RileyParams {
  /** Which structure repeats. */
  kind: RileyKind;
  /** Lines run top to bottom instead of left to right. */
  vertical: boolean;
  /** Number of lines in the field. */
  lines: number;
  /** Stroke width in px. */
  weight: number;
  /** Wave height in px. For bars, lens and fan it bows the lines. */
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
  /** Where the structure sits, 0..1 across the square. Ripple centre, fold, opening, vanishing point. */
  focusX: number;
  /** Where the structure sits, 0..1 down the square. */
  focusY: number;
}

export const RILEY_DEFAULTS: RileyParams = {
  ampGrow: 0,
  amplitude: 0,
  compress: 0,
  drift: 0,
  focusX: 0.5,
  focusY: 0.5,
  kind: "wave",
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
  Exclude<keyof RileyParams, "vertical" | "kind">,
  { max: number; min: number; step: number }
> = {
  ampGrow: { max: 1, min: -1, step: 0.01 },
  amplitude: { max: 200, min: 0, step: 1 },
  compress: { max: 1, min: -1, step: 0.01 },
  drift: { max: 0.5, min: -0.5, step: 0.005 },
  focusX: { max: 1.2, min: -0.2, step: 0.01 },
  focusY: { max: 1.2, min: -0.2, step: 0.01 },
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

/** One drawn line: its points, and the wave phase at each point when a ribbon can use it. */
interface Line {
  phases?: number[];
  points: Point[];
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

function samplesFor(size: number) {
  return clamp(Math.round(size / 6), 48, 320);
}

/* ---------- kinds ---------- */

/** A wave (or zigzag) repeated down the field with drift, growth and compression. */
function waveLines(p: RileyParams, size: number, zigzag: boolean): Line[] {
  const out: Line[] = [];
  const samples = samplesFor(size);
  for (let index = 0; index < p.lines; index++) {
    const t = p.lines > 1 ? index / (p.lines - 1) : 0.5;
    const amp = p.amplitude * clamp(1 + p.ampGrow * (2 * t - 1), 0, 2);
    // Overshoot the edges by the wave height so waves never leave a bare margin.
    const margin = p.amplitude;
    const base = -margin + (size + 2 * margin) * stackPosition(t, p.spacingGrow);
    const phase0 = TAU * p.drift * index;
    const points: Point[] = [];
    const phases: number[] = [];
    let theta = 0;
    for (let k = 0; k <= samples; k++) {
      const s = k / samples;
      // Frequency drifts along the line: integrate it so the wave compresses smoothly.
      const freq = Math.max(0.05, 1 + p.compress * (2 * s - 1)) / p.wavelength;
      if (k > 0) {
        theta += TAU * freq * (size / samples);
      }
      const phase = theta + phase0;
      const shape = zigzag
        ? 1 - (4 * Math.abs(((phase / TAU) % 1) - 0.5) - 1) * 1 - 1
        : Math.sin(phase);
      points.push({ x: s * size, y: base + amp * shape });
      phases.push(phase);
    }
    out.push({ phases, points });
  }
  return out;
}

/** Rings spreading from a point. Spacing grows or tightens with the spacing progression. */
function rippleLines(p: RileyParams, size: number): Line[] {
  const out: Line[] = [];
  const cx = p.focusX * size;
  const cy = p.focusY * size;
  const reach = Math.hypot(Math.max(cx, size - cx), Math.max(cy, size - cy));
  for (let index = 0; index < p.lines; index++) {
    const t = (index + 1) / p.lines;
    const r = reach * stackPosition(t, p.spacingGrow);
    // Perimeter grows with radius, so sample more points on the big rings.
    const steps = clamp(Math.round(r / 3), 48, 720);
    const points: Point[] = [];
    for (let k = 0; k <= steps; k++) {
      const a = (k / steps) * TAU;
      // A gentle bow on the ring, like a ripple disturbed by a second one.
      const wobble = p.amplitude * Math.sin(a * 3 + index * p.drift * TAU) * 0.25;
      points.push({ x: cx + (r + wobble) * Math.cos(a), y: cy + (r + wobble) * Math.sin(a) });
    }
    out.push({ points });
  }
  return out;
}

/** Vertical bars compressing towards a fold, after Movement in Squares. */
function barLines(p: RileyParams, size: number): Line[] {
  const fold = p.focusX;
  // Gap for line i shrinks with how close it sits to the fold; strength from spacingGrow.
  const squeeze = 0.85 * clamp(Math.abs(p.spacingGrow) || 0.6, 0, 1);
  const gaps: number[] = [];
  for (let i = 0; i < p.lines; i++) {
    const t = (i + 0.5) / p.lines;
    gaps.push(1 - squeeze * (1 - Math.abs(t - fold) ** 0.7));
  }
  const total = gaps.reduce((sum, g) => sum + g, 0);
  const out: Line[] = [];
  const samples = samplesFor(size);
  let x = 0;
  for (let i = 0; i < p.lines; i++) {
    x += (gaps[i] / total) * size;
    const points: Point[] = [];
    for (let k = 0; k <= samples; k++) {
      const s = k / samples;
      // Bow every bar the same way so the sheet reads as one surface.
      const bow =
        p.amplitude *
        Math.sin(s * Math.PI) *
        (p.ampGrow === 0 ? 1 : 1 + p.ampGrow * (2 * (i / p.lines) - 1));
      points.push({ x: x + bow, y: s * size });
    }
    out.push({ points });
  }
  return out;
}

/** Two straight diagonal sets crossing. Amplitude bows them so the lattice breathes. */
function weaveLines(p: RileyParams, size: number): Line[] {
  const out: Line[] = [];
  const angle = Math.PI / 6 + p.drift * Math.PI;
  const spacing = (size * 1.4) / p.lines;
  const samples = samplesFor(size);
  const len = size * 1.6;
  for (const sign of [1, -1]) {
    const ux = Math.cos(angle) * sign;
    const uy = Math.sin(angle);
    const nx = -uy;
    const ny = ux;
    for (let i = 0; i < p.lines; i++) {
      const offset = (i - (p.lines - 1) / 2) * spacing;
      const points: Point[] = [];
      for (let k = 0; k <= samples; k++) {
        const s = k / samples - 0.5;
        const bow = p.amplitude * Math.sin(s * TAU * (size / p.wavelength) * 0.5 + i * 0.4);
        points.push({
          x: size / 2 + ux * s * len + nx * (offset + bow),
          y: size / 2 + uy * s * len + ny * (offset + bow),
        });
      }
      out.push({ points });
    }
  }
  return out;
}

/** Straight lines parting around an opening: a smooth bump pushes them away from a centre. */
function lensLines(p: RileyParams, size: number): Line[] {
  const out: Line[] = [];
  const cx = p.focusX * size;
  const cy = p.focusY * size;
  const radius = size * (0.12 + 0.28 * clamp(p.wavelength / 2000, 0, 1));
  const reach = radius * 1.3;
  const samples = samplesFor(size);
  for (let i = 0; i < p.lines; i++) {
    const t = p.lines > 1 ? i / (p.lines - 1) : 0.5;
    const y0 = -radius + (size + 2 * radius) * stackPosition(t, p.spacingGrow);
    const a = y0 - cy;
    const sign = a >= 0 ? 1 : -1;
    // Lines near the centre move most; the push fades with distance so spacing survives.
    const strength = Math.exp(-((a / reach) ** 2)) * (0.6 + p.amplitude / 100);
    const points: Point[] = [];
    for (let k = 0; k <= samples; k++) {
      const x = (k / samples) * size;
      const u = (x - cx) / radius;
      const bump = Math.abs(u) < 1 ? (1 - u * u) ** 2 : 0;
      points.push({ x, y: y0 + sign * radius * bump * strength });
    }
    out.push({ points });
  }
  return out;
}

/** Lines converging on a vanishing point, spread over an arc that faces into the square. */
function fanLines(p: RileyParams, size: number): Line[] {
  const out: Line[] = [];
  const vx = p.focusX * size;
  const vy = p.focusY * size;
  // Aim the fan at the square's centre and open it wide enough to cover the corners.
  const centre = Math.atan2(size / 2 - vy, size / 2 - vx);
  const spread = Math.PI * (0.55 + 0.4 * clamp(p.wavelength / 2000, 0, 1));
  const samples = samplesFor(size);
  const len = size * 2.2;
  for (let i = 0; i < p.lines; i++) {
    const t = p.lines > 1 ? i / (p.lines - 1) : 0.5;
    const a = centre + (stackPosition(t, p.spacingGrow) - 0.5) * spread;
    const ux = Math.cos(a);
    const uy = Math.sin(a);
    const points: Point[] = [];
    for (let k = 0; k <= samples; k++) {
      const s = k / samples;
      const bow = p.amplitude * Math.sin(s * Math.PI) * Math.sin(i * 0.5 + p.drift * TAU * i);
      points.push({ x: vx + ux * s * len - uy * bow, y: vy + uy * s * len + ux * bow });
    }
    out.push({ points });
  }
  return out;
}

function buildLines(p: RileyParams, size: number): Line[] {
  switch (p.kind) {
    case "chevron": {
      return waveLines(p, size, true);
    }
    case "ripple": {
      return rippleLines(p, size);
    }
    case "bars": {
      return barLines(p, size);
    }
    case "weave": {
      return weaveLines(p, size);
    }
    case "lens": {
      return lensLines(p, size);
    }
    case "fan": {
      return fanLines(p, size);
    }
    default: {
      return waveLines(p, size, false);
    }
  }
}

/* ---------- loose bottom ---------- */

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
      if (i - start >= Math.min(mask.length * 0.18, 40)) {
        out.push([start, i]);
      }
      start = -1;
    }
  }
  return out;
}

/* ---------- output ---------- */

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
  const lines = buildLines(p, size);
  lines.forEach((line, index) => {
    const points = p.vertical ? line.points.map((pt) => ({ x: pt.y, y: pt.x })) : line.points;
    for (const [start, end] of runs(keepMask(points, index, p, size))) {
      const pts = points.slice(start, end);
      out.push(
        p.ribbon > 0 && line.phases
          ? { d: ribbonPath(pts, line.phases.slice(start, end), p), fill: true }
          : { d: strokePath(pts), fill: false },
      );
    }
  });
  return out;
}

/** A tasteful random field of any kind. Wave height stays under the spacing so lines never cross. */
export function randomRiley(seed: number, base: Partial<RileyParams> = {}): RileyParams {
  const random = rng(seed);
  const pick = (min: number, max: number) => min + (max - min) * random();
  const maybe = (chance: number, min: number, max: number) =>
    random() < chance ? pick(min, max) : 0;
  const round = (n: number, places = 2) => Math.round(n * 10 ** places) / 10 ** places;
  const kind = base.kind ?? RILEY_KINDS[Math.floor(random() * RILEY_KINDS.length)];
  const lines = Math.round(pick(22, 44));
  const spacing = 1024 / lines;
  const drift = maybe(0.7, -0.12, 0.12);
  const ampGrow = round(maybe(0.6, -1, 1));
  // Neighbours are 2A·sin(π·drift) apart at worst, and growth can double A at one edge.
  const peak = 1 + Math.abs(ampGrow);
  const limit =
    drift === 0 ? spacing * 2.5 : spacing / (2 * Math.sin(Math.PI * Math.abs(drift)) * peak);
  const wavy = kind === "wave" || kind === "chevron";
  const amplitude = wavy
    ? Math.round(clamp(pick(0.25, 1) * limit, 6, 120))
    : Math.round(maybe(0.5, 4, 40));
  return {
    ...RILEY_DEFAULTS,
    ampGrow,
    amplitude,
    compress: round(maybe(0.5, -0.8, 0.8)),
    drift: round(drift, 3),
    focusX: round(pick(0.1, 0.9)),
    focusY: round(pick(0, 0.6)),
    kind,
    lines,
    seed: Math.round(pick(0, 9999)),
    spacingGrow: round(maybe(0.5, -0.6, 0.6)),
    vertical: false,
    wavelength: Math.round(pick(180, 1200)),
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

/** Compact query-string form, e.g. `kind=ripple&lines=40&vertical=1`. */
export function encodeRiley(p: RileyParams): string {
  const q = new URLSearchParams();
  if (p.kind !== RILEY_DEFAULTS.kind) {
    q.set("kind", p.kind);
  }
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
  const kind = q.get("kind");
  if (kind && (RILEY_KINDS as readonly string[]).includes(kind)) {
    p.kind = kind as RileyKind;
  }
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
