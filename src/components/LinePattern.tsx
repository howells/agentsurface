import { cn } from "@/lib/utils";

/** Hairline hatching shared by glossary cards and area marks. Colour comes from currentColor. */
export function LinePattern({
  angle,
  className,
  opacity = 0.12,
  spacing = 7,
}: {
  angle: number;
  className?: string;
  opacity?: number;
  spacing?: number;
}) {
  return (
    <div
      aria-hidden="true"
      className={cn("h-full w-full", className)}
      style={{
        background: `repeating-linear-gradient(${angle}deg, currentColor 0 0.75px, transparent 0.75px ${spacing}px)`,
        opacity,
      }}
    />
  );
}
