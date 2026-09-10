import type { ReactNode } from "react";
import { LinePattern } from "@/components/LinePattern";
import { cn } from "@/lib/utils";

// Angles match the glossary card patterns for the same subjects.
export const AREA_ANGLES: Record<string, number> = {
  "auth-identity": 60,
  connections: 45,
  discoverability: 30,
  payments: -30,
  understandability: 0,
  usability: -45,
};

export const AREA_PATHS: Record<string, ReactNode> = {
  // A signal reaching outward.
  discoverability: (
    <>
      <circle cx="15" cy="24" r="2.25" fill="currentColor" stroke="none" />
      <path d="M20.5 17.4a8.5 8.5 0 0 1 0 13.2" />
      <path d="M25.4 12.1a15.5 15.5 0 0 1 0 23.8" />
      <path d="M30.3 6.9a22.5 22.5 0 0 1 0 34.2" opacity="0.45" />
    </>
  ),
  // A page reduced to its outline.
  understandability: (
    <>
      <rect x="13" y="10" width="22" height="28" rx="3" />
      <path d="M18 18h12M18 24h9M18 30h5" />
    </>
  ),
  // Two ends joined.
  connections: (
    <>
      <circle cx="13" cy="24" r="4.5" />
      <circle cx="35" cy="24" r="4.5" />
      <path d="M17.5 24h13" />
    </>
  ),
  // A boundary with one deliberate opening.
  "auth-identity": (
    <>
      <circle cx="24" cy="24" r="5" />
      <path d="M30.5 12.74A13 13 0 1 1 21.74 11.2" />
    </>
  ),
  // A route that arrives at a result.
  usability: (
    <>
      <path d="M9 35c4-9 9-12 14-9" strokeDasharray="0.01 4.2" />
      <path d="m26.5 25 4 4 8.5-10" />
    </>
  ),
  // A spend inside an agreed limit.
  payments: (
    <>
      <path d="M13 17h-3v14h3M35 17h3v14h-3" />
      <path d="M10 24h19" />
      <path d="M29 24h9" opacity="0.35" />
      <circle cx="29" cy="24" r="2.25" fill="currentColor" stroke="none" />
    </>
  ),
};

export function AreaMark({ area, size = "lg" }: { area: string; size?: "lg" | "sm" }) {
  const large = size === "lg";
  return (
    <span
      aria-hidden="true"
      className={cn(
        "relative grid shrink-0 place-items-center overflow-hidden bg-fd-accent/55 text-fd-accent-foreground",
        large ? "size-10 rounded-[0.625rem] md:size-12 md:rounded-xl" : "size-7 rounded-md",
      )}
    >
      <LinePattern
        angle={AREA_ANGLES[area] ?? 0}
        opacity={0.13}
        spacing={large ? 5 : 4}
        className="absolute inset-0"
      />
      <svg
        viewBox="0 0 48 48"
        className="relative size-full"
        fill="none"
        stroke="currentColor"
        strokeWidth={large ? 1.5 : 2.25}
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        {AREA_PATHS[area]}
      </svg>
    </span>
  );
}
