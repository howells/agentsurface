import type { ComponentProps } from "react";
import { cn } from "@/lib/utils";

interface PillProps extends ComponentProps<"button"> {
  pressed: boolean;
  /** `round` for filters and presets, `square` for dense option rows. */
  shape?: "round" | "square";
}

/** Toggle chip: inverted when pressed, muted with a ring hover when idle. */
export function Pill({
  pressed,
  shape = "round",
  className,
  type = "button",
  ...props
}: PillProps) {
  return (
    <button
      type={type}
      aria-pressed={pressed}
      className={cn(
        "type-small border transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-fd-ring",
        shape === "round" ? "h-8 rounded-full px-3" : "h-7 rounded-md px-2.5",
        pressed
          ? "border-fd-foreground bg-fd-foreground text-fd-background"
          : "border-fd-border text-fd-muted-foreground hover:border-fd-ring hover:text-fd-foreground",
        className,
      )}
      {...props}
    />
  );
}
