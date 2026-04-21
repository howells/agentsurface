"use client";

import { AnimatePresence, motion } from "motion/react";
import * as ScrollAreaPrimitive from "@radix-ui/react-scroll-area";
import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import type { GlossaryTerm } from "@/data/glossary";

// ── Line patterns by category ────────────────────────────────────────────────

const LINE_ANGLES: Record<string, number> = {
  "Foundation": 0,              // horizontal
  "Memory & Knowledge": 90,     // vertical
  "Agent Infrastructure": 45,   // diagonal ↘
  "Data & Integration": -45,    // diagonal ↗
  "Agent Readiness": 30,        // shallow diagonal
  "Ops & Lifecycle": -60,       // steep diagonal
};

function CardPattern({ category }: { category: string }) {
  const angle = LINE_ANGLES[category] ?? 0;
  const count = 18;
  const gap = 130 / count;
  const rad = (angle * Math.PI) / 180;
  const cos = Math.cos(rad);
  const sin = Math.sin(rad);

  // Extend lines well past the viewBox so rotated lines still fill the square
  const ext = 200;
  const lines: React.ReactNode[] = [];

  for (let i = 0; i < count; i++) {
    const offset = gap * (i + 0.5);
    // Line perpendicular to the angle direction, shifted by offset
    const cx = 65 + (offset - 65) * Math.abs(cos < 0.01 ? 1 : cos === 1 ? 0 : sin);
    const cy = 65 + (offset - 65) * Math.abs(sin < 0.01 ? 1 : sin === 1 ? 0 : cos);

    // Simpler: place horizontal lines, rotate the whole group
    lines.push(
      <line
        key={i}
        x1={-ext} y1={gap * (i + 0.5)}
        x2={ext + 130} y2={gap * (i + 0.5)}
        stroke="currentColor"
        strokeWidth="0.75"
        opacity={0.1 + (i / count) * 0.06}
      />
    );
  }

  return (
    <svg viewBox="0 0 130 130" fill="none" xmlns="http://www.w3.org/2000/svg" className="w-full h-full">
      <g transform={`rotate(${angle} 65 65)`}>
        {lines}
      </g>
    </svg>
  );
}

const SPRING = { type: "spring" as const, stiffness: 340, damping: 30 };

// ── Card ─────────────────────────────────────────────────────────────────────

function GlossaryCard({ term, onOpen }: { term: GlossaryTerm; onOpen: (id: string) => void }) {
  return (
    <motion.button
      layoutId={`card-${term.id}`}
      onClick={() => onOpen(term.id)}
      className="relative flex w-52 h-72 shrink-0 cursor-pointer flex-col overflow-hidden rounded-2xl bg-fd-background text-fd-foreground"
      style={{ boxShadow: "0 2px 8px rgba(0,0,0,0.08), 0 0 0 1px rgba(0,0,0,0.07)" }}
      whileHover={{ y: -6, boxShadow: "0 16px 40px rgba(0,0,0,0.13), 0 0 0 1px rgba(0,0,0,0.07)" }}
      transition={SPRING}
    >
      <div className="flex-1 flex items-center justify-center overflow-hidden">
        <CardPattern category={term.category} />
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
            <CardPattern category={term.category} />
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
