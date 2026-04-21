"use client";

import { AnimatePresence, motion } from "motion/react";
import * as ScrollAreaPrimitive from "@radix-ui/react-scroll-area";
import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import type { GlossaryTerm } from "@/data/glossary";

// ── Generative card pattern ──────────────────────────────────────────────────

function hashCode(str: string): number {
  let h = 0;
  for (let i = 0; i < str.length; i++) h = ((h << 5) - h + str.charCodeAt(i)) | 0;
  return h >>> 0;
}

function seededRng(seed: number) {
  return () => {
    seed = (seed + 0x6D2B79F5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function CardPattern({ id }: { id: string }) {
  const rand = seededRng(hashCode(id));

  // Shape: 0=circle 1=rect 2=diamond 3=ring 4=cross 5=dash
  const shape = Math.floor(rand() * 6);
  const cols = 6 + Math.floor(rand() * 16);
  const rows = 4 + Math.floor(rand() * 10);
  const size = 1.5 + rand() * 2.5;
  const opBase = 0.07 + rand() * 0.05;
  const opRange = 0.06 + rand() * 0.10;
  const offset = rand() > 0.5;
  const rot = Math.floor(rand() * 4) * 45;
  const rx = rand() * 0.5;

  const dx = 208 / (cols + 1);
  const dy = 130 / (rows + 1);
  const els: React.ReactNode[] = [];

  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      const xo = offset && r % 2 === 1 ? dx / 2 : 0;
      const x = dx * (c + 1) + xo;
      const y = dy * (r + 1);
      const o = opBase + rand() * opRange;
      const s = size * (0.8 + rand() * 0.4);
      const k = `${r}-${c}`;

      switch (shape) {
        case 0:
          els.push(<circle key={k} cx={x} cy={y} r={s} fill="currentColor" opacity={o} />);
          break;
        case 1:
          els.push(
            <rect key={k} x={x - s} y={y - s * 0.7} width={s * 2} height={s * 1.4}
              rx={s * rx} fill="currentColor" opacity={o} />
          );
          break;
        case 2:
          els.push(
            <rect key={k} x={x - s * 0.7} y={y - s * 0.7} width={s * 1.4} height={s * 1.4}
              fill="currentColor" opacity={o} transform={`rotate(45 ${x} ${y})`} />
          );
          break;
        case 3:
          els.push(
            <circle key={k} cx={x} cy={y} r={s} fill="none"
              stroke="currentColor" strokeWidth={Math.max(0.8, s * 0.3)} opacity={o} />
          );
          break;
        case 4:
          els.push(
            <g key={k} opacity={o} transform={`rotate(${rot} ${x} ${y})`}>
              <line x1={x - s} y1={y} x2={x + s} y2={y} stroke="currentColor" strokeWidth={0.8} />
              <line x1={x} y1={y - s} x2={x} y2={y + s} stroke="currentColor" strokeWidth={0.8} />
            </g>
          );
          break;
        case 5:
          els.push(
            <line key={k} x1={x - s} y1={y} x2={x + s} y2={y}
              stroke="currentColor" strokeWidth={Math.max(0.8, s * 0.4)}
              opacity={o} transform={`rotate(${rot} ${x} ${y})`} />
          );
          break;
      }
    }
  }

  return (
    <svg viewBox="0 0 208 130" fill="none" xmlns="http://www.w3.org/2000/svg" className="w-full h-full">
      {els}
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
      className="relative flex w-52 h-56 shrink-0 cursor-pointer flex-col overflow-hidden rounded-2xl bg-fd-background text-fd-foreground"
      style={{ boxShadow: "0 2px 8px rgba(0,0,0,0.08), 0 0 0 1px rgba(0,0,0,0.07)" }}
      whileHover={{ y: -6, boxShadow: "0 16px 40px rgba(0,0,0,0.13), 0 0 0 1px rgba(0,0,0,0.07)" }}
      transition={SPRING}
    >
      <div className="flex-1 overflow-hidden">
        <CardPattern id={term.id} />
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
            <CardPattern id={term.id} />
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
