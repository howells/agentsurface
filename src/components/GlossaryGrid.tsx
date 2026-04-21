"use client";

import { AnimatePresence, motion } from "motion/react";
import * as ScrollAreaPrimitive from "@radix-ui/react-scroll-area";
import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import type { GlossaryTerm } from "@/data/glossary";

// ── Category patterns ────────────────────────────────────────────────────────

function PatternFoundation() {
  return (
    <svg viewBox="0 0 208 130" fill="none" xmlns="http://www.w3.org/2000/svg" className="w-full h-full">
      {Array.from({ length: 20 }, (_, i) => (
        <line key={i} x1="0" y1={6 + i * 6.5} x2="208" y2={6 + i * 6.5}
          stroke="currentColor" strokeWidth="0.75" opacity={0.1 + i * 0.014} />
      ))}
    </svg>
  );
}

function PatternMemory() {
  return (
    <svg viewBox="0 0 208 130" fill="none" xmlns="http://www.w3.org/2000/svg" className="w-full h-full">
      {Array.from({ length: 13 }, (_, row) =>
        Array.from({ length: 20 }, (_, col) => {
          const seed = (row * 20 + col) * 2654435761;
          const opacity = 0.04 + ((seed >>> 0) % 22) / 100;
          return <circle key={`${row}-${col}`} cx={10 + col * 10} cy={10 + row * 9} r="1.5" fill="currentColor" opacity={opacity} />;
        })
      )}
    </svg>
  );
}

function PatternAgent() {
  const nodes = [[104, 22], [48, 62], [160, 62], [22, 108], [80, 108], [128, 108], [186, 108]] as const;
  const edges = [[0, 1], [0, 2], [1, 3], [1, 4], [2, 5], [2, 6]] as const;
  return (
    <svg viewBox="0 0 208 130" fill="none" xmlns="http://www.w3.org/2000/svg" className="w-full h-full">
      {edges.map(([a, b], i) => (
        <line key={i} x1={nodes[a][0]} y1={nodes[a][1]} x2={nodes[b][0]} y2={nodes[b][1]}
          stroke="currentColor" strokeWidth="1" opacity="0.2" />
      ))}
      {nodes.map(([cx, cy], i) => (
        <circle key={i} cx={cx} cy={cy} r={i === 0 ? 6 : 4}
          fill="none" stroke="currentColor" strokeWidth="1.5" opacity="0.35" />
      ))}
    </svg>
  );
}

function PatternData() {
  return (
    <svg viewBox="0 0 208 130" fill="none" xmlns="http://www.w3.org/2000/svg" className="w-full h-full">
      {Array.from({ length: 11 }, (_, row) =>
        Array.from({ length: 15 }, (_, col) => {
          const seed = (row * 15 + col) * 1664525 + 1013904223;
          const opacity = 0.04 + ((seed >>> 0) % 18) / 100;
          return <rect key={`${row}-${col}`} x={8 + col * 13} y={5 + row * 11} width="10" height="9" rx="1"
            fill="currentColor" opacity={opacity} />;
        })
      )}
    </svg>
  );
}

function PatternReadiness() {
  return (
    <svg viewBox="0 0 208 130" fill="none" xmlns="http://www.w3.org/2000/svg" className="w-full h-full">
      <rect x="20" y="14" width="168" height="102" rx="3" stroke="currentColor" strokeWidth="1" opacity="0.18" />
      {[60, 98, 136, 172].map((x) => (
        <line key={x} x1={x} y1="14" x2={x} y2="116" stroke="currentColor" strokeWidth="0.75" opacity="0.1" />
      ))}
      <line x1="20" y1="65" x2="188" y2="65" stroke="currentColor" strokeWidth="0.75" opacity="0.1" />
      {[[20, 14], [188, 14], [20, 116], [188, 116]].map(([x, y], i) => (
        <circle key={i} cx={x} cy={y} r="2.5" fill="currentColor" opacity="0.3" />
      ))}
    </svg>
  );
}

function PatternOps() {
  const heights = [42, 64, 50, 80, 58, 88, 44, 72, 56, 82, 52, 68, 46, 76];
  return (
    <svg viewBox="0 0 208 130" fill="none" xmlns="http://www.w3.org/2000/svg" className="w-full h-full">
      {heights.map((h, i) => (
        <rect key={i} x={8 + i * 14} y={118 - h} width="10" height={h} rx="1.5"
          fill="currentColor" opacity={0.05 + i * 0.016} />
      ))}
    </svg>
  );
}

const PATTERNS: Record<string, React.FC> = {
  "Foundation": PatternFoundation,
  "Memory & Knowledge": PatternMemory,
  "Agent Infrastructure": PatternAgent,
  "Data & Integration": PatternData,
  "Agent Readiness": PatternReadiness,
  "Ops & Lifecycle": PatternOps,
};

const SPRING = { type: "spring" as const, stiffness: 340, damping: 30 };

// ── Card ─────────────────────────────────────────────────────────────────────

function GlossaryCard({ term, onOpen }: { term: GlossaryTerm; onOpen: (id: string) => void }) {
  const Pattern = PATTERNS[term.category] ?? PatternFoundation;

  return (
    <motion.button
      layoutId={`card-${term.id}`}
      onClick={() => onOpen(term.id)}
      className="relative flex w-52 h-72 shrink-0 cursor-pointer flex-col overflow-hidden rounded-2xl bg-fd-background text-fd-foreground"
      style={{ boxShadow: "0 2px 8px rgba(0,0,0,0.08), 0 0 0 1px rgba(0,0,0,0.07)" }}
      whileHover={{ y: -6, boxShadow: "0 16px 40px rgba(0,0,0,0.13), 0 0 0 1px rgba(0,0,0,0.07)" }}
      transition={SPRING}
    >
      <div className="flex-1 overflow-hidden">
        <Pattern />
      </div>
      <div className="px-4 pb-5 pt-2 text-left">
        <p className="font-mono text-[0.55rem] font-medium uppercase tracking-widest text-fd-muted-foreground">
          {term.category}
        </p>
        <p className="mt-0.5 text-[1.6rem] font-semibold tracking-tight leading-none text-fd-foreground">
          {term.acronym}
        </p>
        <p className="mt-0.5 text-[0.65rem] leading-4 text-fd-muted-foreground">
          {term.name}
        </p>
      </div>
    </motion.button>
  );
}

// ── Overlay (portalled to document.body) ─────────────────────────────────────

function GlossaryOverlay({ term, onClose }: { term: GlossaryTerm; onClose: () => void }) {
  const Pattern = PATTERNS[term.category] ?? PatternFoundation;

  useEffect(() => {
    const handler = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [onClose]);

  return createPortal(
    <>
      <motion.div
        key="backdrop"
        className="fixed inset-0 z-[100] bg-white/55 backdrop-blur-xl dark:bg-zinc-950/65"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        transition={{ duration: 0.22 }}
        onClick={onClose}
      />

      <div className="pointer-events-none fixed inset-0 z-[101] flex items-center justify-center p-4 sm:p-8">
        <motion.div
          layoutId={`card-${term.id}`}
          className="pointer-events-auto w-full max-w-md overflow-hidden rounded-2xl border border-white/50 bg-white/85 backdrop-blur-2xl dark:border-zinc-700/40 dark:bg-zinc-900/90"
          style={{
            WebkitBackdropFilter: "blur(40px)",
            boxShadow: "0 40px 100px rgba(0,0,0,0.18), 0 0 0 1px rgba(0,0,0,0.06)",
          }}
          transition={SPRING}
        >
          {/* Dark pattern banner */}
          <div className="relative h-40 overflow-hidden bg-zinc-950 text-zinc-300">
            <Pattern />
            <motion.button
              onClick={onClose}
              className="absolute top-3 right-3 flex h-8 w-8 items-center justify-center rounded-full bg-white/15 text-white/70 transition-all hover:bg-white/25 hover:text-white hover:scale-110"
              aria-label="Close"
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: 0.18, duration: 0.2 }}
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <path d="M18 6L6 18M6 6l12 12" />
              </svg>
            </motion.button>
          </div>

          <div className="px-7 pb-8 pt-5">
            <motion.p
              className="font-mono text-[0.6rem] font-medium uppercase tracking-widest text-fd-muted-foreground"
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1, duration: 0.28 }}
            >
              {term.category}
            </motion.p>
            <motion.p
              className="mt-2 text-4xl font-semibold tracking-tight leading-none text-fd-foreground"
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.16, duration: 0.28 }}
            >
              {term.acronym}
            </motion.p>
            <motion.p
              className="mt-1 text-sm text-fd-muted-foreground"
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.22, duration: 0.28 }}
            >
              {term.name}
            </motion.p>
            <motion.div
              className="my-4 h-px bg-fd-border"
              initial={{ scaleX: 0 }}
              animate={{ scaleX: 1 }}
              style={{ transformOrigin: "left" }}
              transition={{ delay: 0.28, duration: 0.4, ease: [0.25, 0.1, 0.25, 1] }}
            />
            <motion.p
              className="text-sm font-medium leading-6 text-fd-foreground"
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.34, duration: 0.28 }}
            >
              {term.definition}
            </motion.p>
            <motion.p
              className="mt-3 text-sm leading-7 text-fd-muted-foreground"
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.4, duration: 0.28 }}
            >
              {term.detail}
            </motion.p>
          </div>
        </motion.div>
      </div>
    </>,
    document.body
  );
}

// ── Filter pills ─────────────────────────────────────────────────────────────

const ALL = "All";

function FilterPills({ categories, active, onChange }: {
  categories: string[];
  active: string;
  onChange: (cat: string) => void;
}) {
  return (
    <div className="flex flex-wrap gap-2">
      {[ALL, ...categories].map((cat) => (
        <button key={cat} onClick={() => onChange(cat)}
          className={`rounded-full border px-3 py-1 text-xs font-medium transition-colors ${
            active === cat
              ? "border-fd-foreground bg-fd-foreground text-fd-background"
              : "border-fd-border text-fd-muted-foreground hover:border-fd-ring hover:text-fd-foreground"
          }`}
        >
          {cat}
        </button>
      ))}
    </div>
  );
}

// ── Public export ─────────────────────────────────────────────────────────────

export function GlossaryGrid({ terms, showFilters = true, layout = "scroll" }: {
  terms: GlossaryTerm[];
  showFilters?: boolean;
  layout?: "scroll" | "grid";
}) {
  const [activeId, setActiveId] = useState<string | null>(null);
  const [filter, setFilter] = useState(ALL);

  const categories = Array.from(new Set(terms.map((t) => t.category)));
  const visible = (filter === ALL ? terms : terms.filter((t) => t.category === filter))
    .filter((t) => t.id !== activeId);
  const activeTerm = terms.find((t) => t.id === activeId) ?? null;

  useEffect(() => {
    document.body.style.overflow = activeId ? "hidden" : "";
    return () => { document.body.style.overflow = ""; };
  }, [activeId]);

  return (
    <>
      {showFilters && categories.length > 1 && (
        <FilterPills categories={categories} active={filter} onChange={setFilter} />
      )}

      {layout === "grid" ? (
        <div className="mt-6 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
          <AnimatePresence mode="popLayout" initial={false}>
            {visible.map((term) => (
              <GlossaryCard key={term.id} term={term} onOpen={setActiveId} />
            ))}
          </AnimatePresence>
        </div>
      ) : (
        <div className="relative mt-6 w-screen ml-[calc(50%-50vw)]">
          <ScrollAreaPrimitive.Root className="w-full">
            <ScrollAreaPrimitive.Viewport className="w-full" style={{ overflowY: "visible" }}>
              <div className="flex gap-3 pt-4 pb-5 px-1">
                {/* Left spacer — aligns first card with content, scrolls away */}
                <div
                  className="shrink-0"
                  style={{ width: "max(1.5rem, calc(50vw - 30.5rem))" }}
                  aria-hidden="true"
                />
                <AnimatePresence mode="popLayout" initial={false}>
                  {visible.map((term) => (
                    <GlossaryCard key={term.id} term={term} onOpen={setActiveId} />
                  ))}
                </AnimatePresence>
                <div className="w-6 shrink-0" aria-hidden="true" />
              </div>
            </ScrollAreaPrimitive.Viewport>
            <ScrollAreaPrimitive.Scrollbar
              orientation="horizontal"
              className="hidden"
            >
              <ScrollAreaPrimitive.Thumb />
            </ScrollAreaPrimitive.Scrollbar>
          </ScrollAreaPrimitive.Root>
        </div>
      )}

      <AnimatePresence>
        {activeTerm && (
          <GlossaryOverlay term={activeTerm} onClose={() => setActiveId(null)} />
        )}
      </AnimatePresence>
    </>
  );
}
