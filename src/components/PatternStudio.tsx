"use client";

import { useEffect, useMemo, useState } from "react";
import { Check, Copy, Download, Link2, RotateCcw, Shuffle } from "lucide-react";
import { GLOSSARY_PATTERNS } from "@/data/glossary-patterns";
import { RILEY_DEFAULTS as HATCH } from "@/lib/riley";
import {
  KIND_LABELS,
  RILEY_DEFAULTS,
  RILEY_KINDS,
  RILEY_RANGES,
  encodeRiley,
  randomRiley,
  rileyPaths,
  rileySvg,
} from "@/lib/riley";
import type { RileyParams } from "@/lib/riley";
import { cn } from "@/lib/utils";

type NumericKey = keyof typeof RILEY_RANGES;

const GROUPS: { title: string; controls: { key: NumericKey; label: string; unit?: string }[] }[] = [
  {
    title: "Field",
    controls: [
      { key: "lines", label: "Lines" },
      { key: "weight", label: "Weight", unit: "px" },
    ],
  },
  {
    title: "Wave",
    controls: [
      { key: "amplitude", label: "Height", unit: "px" },
      { key: "wavelength", label: "Length", unit: "px" },
      { key: "drift", label: "Drift per line" },
    ],
  },
  {
    title: "Progression",
    controls: [
      { key: "ampGrow", label: "Height across the field" },
      { key: "spacingGrow", label: "Spacing across the field" },
      { key: "extent", label: "How far down the field reaches" },
      { key: "compress", label: "Length along the line" },
    ],
  },
  {
    title: "Ribbon",
    controls: [{ key: "ribbon", label: "Swell on each crest" }],
  },
  {
    title: "Position",
    controls: [
      { key: "focusX", label: "Across" },
      { key: "focusY", label: "Down" },
    ],
  },
  {
    title: "Loose bottom",
    controls: [
      { key: "loose", label: "How far up the lines fray" },
      { key: "seed", label: "Which lines drop out" },
    ],
  },
];

const SIZE = 1024;

function formatValue(key: NumericKey, value: number) {
  const { step } = RILEY_RANGES[key];
  return step >= 1 ? String(Math.round(value)) : value.toFixed(step < 0.01 ? 3 : 2);
}

function samePreset(a: RileyParams, b: RileyParams) {
  return encodeRiley(a) === encodeRiley(b);
}

const buttonStyle =
  "inline-flex h-8 items-center gap-1.5 rounded-md border border-fd-border px-2.5 text-xs font-medium text-fd-foreground transition-colors hover:bg-fd-muted focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-fd-ring disabled:opacity-50";

export function PatternStudio({ initial }: { initial: RileyParams }) {
  const [params, setParams] = useState<RileyParams>(initial);
  const [notice, setNotice] = useState<string | null>(null);

  const paths = useMemo(() => rileyPaths(params, SIZE), [params]);
  const query = encodeRiley(params);

  // Keep the URL in step so a link reproduces the pattern.
  useEffect(() => {
    const url = query ? `?${query}` : location.pathname;
    history.replaceState(null, "", url);
  }, [query]);

  useEffect(() => {
    if (!notice) {
      return;
    }
    const id = setTimeout(() => {
      setNotice(null);
    }, 1600);
    return () => {
      clearTimeout(id);
    };
  }, [notice]);

  const update = (key: NumericKey, value: number) => {
    setParams((prev) => ({ ...prev, [key]: value }));
  };

  const copy = async (text: string, label: string) => {
    await navigator.clipboard.writeText(text);
    setNotice(label);
  };

  const download = () => {
    const blob = new Blob([rileySvg(params, SIZE)], { type: "image/svg+xml" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "line-field.svg";
    a.click();
    URL.revokeObjectURL(url);
    setNotice("Downloaded");
  };

  return (
    <div className="grid gap-8 lg:grid-cols-[minmax(0,1fr)_19rem] lg:gap-12">
      <div className="min-w-0">
        <div className="flex flex-wrap items-center gap-2">
          {[{ category: "Hatch", params: HATCH, slug: "hatch" }, ...GLOSSARY_PATTERNS].map(
            (preset) => {
              const active = samePreset(preset.params, params);
              return (
                <button
                  key={preset.slug}
                  type="button"
                  aria-pressed={active}
                  onClick={() => {
                    setParams(preset.params);
                  }}
                  className={cn(
                    "h-8 rounded-full border px-3 text-xs font-medium transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-fd-ring",
                    active
                      ? "border-fd-foreground bg-fd-foreground text-fd-background"
                      : "border-fd-border text-fd-muted-foreground hover:border-fd-ring hover:text-fd-foreground",
                  )}
                >
                  {preset.category}
                </button>
              );
            },
          )}
        </div>

        <div className="mt-5 overflow-hidden rounded-2xl border border-fd-border bg-fd-card text-fd-foreground shadow-sm">
          <svg
            viewBox={`0 0 ${SIZE} ${SIZE}`}
            className="block aspect-square w-full"
            role="img"
            aria-label="Preview of the line field"
          >
            {paths.map(({ d, fill }, i) =>
              fill ? (
                <path key={i} d={d} fill="currentColor" />
              ) : (
                <path
                  key={i}
                  d={d}
                  fill="none"
                  stroke="currentColor"
                  strokeWidth={params.weight}
                  strokeLinecap="round"
                />
              ),
            )}
          </svg>
        </div>

        <div className="mt-4 flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={() => {
              setParams((prev) => randomRiley(Date.now() % 1e9, { loose: prev.loose }));
            }}
            className={buttonStyle}
          >
            <Shuffle aria-hidden="true" className="size-3.5" /> Shuffle
          </button>
          <button type="button" onClick={download} className={buttonStyle}>
            <Download aria-hidden="true" className="size-3.5" /> Download SVG
          </button>
          <button
            type="button"
            onClick={async () => copy(rileySvg(params, SIZE), "SVG copied")}
            className={buttonStyle}
          >
            <Copy aria-hidden="true" className="size-3.5" /> Copy SVG
          </button>
          <button
            type="button"
            onClick={async () => copy(location.href, "Link copied")}
            className={buttonStyle}
          >
            <Link2 aria-hidden="true" className="size-3.5" /> Copy link
          </button>
          <button
            type="button"
            onClick={() => {
              setParams(RILEY_DEFAULTS);
            }}
            disabled={samePreset(params, RILEY_DEFAULTS)}
            className={buttonStyle}
          >
            <RotateCcw aria-hidden="true" className="size-3.5" /> Reset
          </button>
          <span
            role="status"
            className={cn(
              "ml-1 inline-flex items-center gap-1 text-xs text-fd-muted-foreground transition-opacity",
              notice ? "opacity-100" : "opacity-0",
            )}
          >
            <Check aria-hidden="true" className="size-3.5" /> {notice}
          </span>
        </div>
      </div>

      <form
        className="space-y-7"
        onSubmit={(event) => {
          event.preventDefault();
        }}
        aria-label="Pattern settings"
      >
        <fieldset>
          <legend className="text-xs font-medium text-fd-accent-foreground">Kind</legend>
          <div className="mt-2.5 flex flex-wrap gap-1.5">
            {RILEY_KINDS.map((kind) => (
              <button
                key={kind}
                type="button"
                aria-pressed={params.kind === kind}
                onClick={() => {
                  setParams((prev) => ({ ...prev, kind }));
                }}
                className={cn(
                  "h-7 rounded-md border px-2.5 text-xs font-medium transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-fd-ring",
                  params.kind === kind
                    ? "border-fd-foreground bg-fd-foreground text-fd-background"
                    : "border-fd-border text-fd-muted-foreground hover:border-fd-ring hover:text-fd-foreground",
                )}
              >
                {KIND_LABELS[kind]}
              </button>
            ))}
          </div>
        </fieldset>

        <fieldset>
          <legend className="text-xs font-medium text-fd-accent-foreground">Direction</legend>
          <div className="mt-2.5 grid grid-cols-2 gap-1 rounded-md border border-fd-border p-1 text-xs">
            {[
              { label: "Across", vertical: false },
              { label: "Down", vertical: true },
            ].map((option) => (
              <button
                key={option.label}
                type="button"
                aria-pressed={params.vertical === option.vertical}
                onClick={() => {
                  setParams((prev) => ({ ...prev, vertical: option.vertical }));
                }}
                className={cn(
                  "h-7 rounded font-medium transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-fd-ring",
                  params.vertical === option.vertical
                    ? "bg-fd-foreground text-fd-background"
                    : "text-fd-muted-foreground hover:text-fd-foreground",
                )}
              >
                {option.label}
              </button>
            ))}
          </div>
        </fieldset>

        {GROUPS.map((group) => (
          <fieldset key={group.title}>
            <legend className="text-xs font-medium text-fd-accent-foreground">{group.title}</legend>
            <div className="mt-2.5 space-y-3.5">
              {group.controls.map(({ key, label, unit }) => {
                const range = RILEY_RANGES[key];
                const id = `riley-${key}`;
                return (
                  <div key={key}>
                    <div className="flex items-baseline justify-between text-xs">
                      <label htmlFor={id} className="text-fd-foreground">
                        {label}
                      </label>
                      <span className="tabular-nums text-fd-muted-foreground">
                        {formatValue(key, params[key])}
                        {unit ? ` ${unit}` : ""}
                      </span>
                    </div>
                    <input
                      id={id}
                      type="range"
                      min={range.min}
                      max={range.max}
                      step={range.step}
                      value={params[key]}
                      onChange={(event) => {
                        update(key, Number(event.target.value));
                      }}
                      onDoubleClick={() => {
                        update(key, RILEY_DEFAULTS[key]);
                      }}
                      className="mt-1.5 h-5 w-full cursor-pointer accent-fd-foreground"
                    />
                  </div>
                );
              })}
            </div>
          </fieldset>
        ))}
      </form>
    </div>
  );
}
