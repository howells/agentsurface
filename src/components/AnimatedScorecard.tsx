"use client";

import { motion, useInView } from "motion/react";
import { useRef } from "react";

const scores = [
  { name: "MCP Server", score: 2 },
  { name: "Discovery", score: 3 },
  { name: "Context Files", score: 3 },
  { name: "Retrievability", score: 1 },
  { name: "Testing", score: 0 },
];

export function AnimatedScorecard() {
  const ref = useRef<HTMLDivElement>(null);
  const inView = useInView(ref, { margin: "-40px", once: true });

  return (
    <div
      ref={ref}
      className="mt-10 max-w-xs overflow-hidden rounded-lg border border-fd-border font-mono text-xs"
    >
      <div className="border-b border-fd-border bg-fd-muted/40 px-4 py-2 text-fd-muted-foreground">
        surface score
      </div>
      <div className="space-y-2 px-4 py-3">
        {scores.map((item, i) => (
          <div key={item.name} className="flex items-center gap-3">
            <span className="w-28 shrink-0 text-fd-muted-foreground">{item.name}</span>
            <span className="flex gap-0.5">
              {[0, 1, 2].map((seg) => (
                <motion.span
                  key={seg}
                  className="block h-1.5 w-3 rounded-sm"
                  initial={{ backgroundColor: "var(--color-fd-border)", opacity: 0.3 }}
                  animate={
                    inView && seg < item.score
                      ? { backgroundColor: "var(--color-fd-foreground)", opacity: 1 }
                      : inView
                        ? { opacity: 1 }
                        : {}
                  }
                  transition={{
                    delay: 0.3 + i * 0.12 + seg * 0.06,
                    duration: 0.25,
                    ease: "easeOut",
                  }}
                />
              ))}
            </span>
            <motion.span
              className="text-fd-muted-foreground"
              initial={{ opacity: 0 }}
              animate={inView ? { opacity: 1 } : {}}
              transition={{ delay: 0.5 + i * 0.12, duration: 0.3 }}
            >
              {item.score}/3
            </motion.span>
          </div>
        ))}
        <motion.div
          className="flex items-baseline justify-between pt-1 border-t border-fd-border/50"
          initial={{ opacity: 0 }}
          animate={inView ? { opacity: 1 } : {}}
          transition={{ delay: 1.2, duration: 0.4 }}
        >
          <span className="text-fd-muted-foreground">total</span>
          <span className="text-fd-foreground font-medium">9/15</span>
        </motion.div>
      </div>
    </div>
  );
}
