"use client";

/**
 * chat-extras.tsx
 * ─────────────────────────────────────────────────────────────────
 * USAGE in messages-page.tsx:
 *
 *   import { EmojiPhysicsPlayground } from "./chat-extras";
 *
 *   // inside JSX (inside messages scroll container, position: relative):
 *   <EmojiPhysicsPlayground containerRef={messagesContainerRef} />
 * ─────────────────────────────────────────────────────────────────
 */

import { useState, useEffect, useRef, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";

// ══════════════════════════════════════════════════════════════════
// ⚛️  EMOJI PHYSICS PLAYGROUND
//     Drag, throw, and combine emoji with real gravity + bouncing.
// ══════════════════════════════════════════════════════════════════

const COMBO_RULES: Record<string, { result: string; label: string }> = {
  "🐱🐟": { result: "😋", label: "Nyam nyam!" },
  "🐟🐱": { result: "😋", label: "Nyam nyam!" },
  "🔥💧": { result: "💨", label: "Pfff!"       },
  "💧🔥": { result: "💨", label: "Pfff!"       },
  "⚡💧": { result: "⚡", label: "Bzzt!"        },
  "💧⚡": { result: "⚡", label: "Bzzt!"        },
  "❤️❤️": { result: "💞", label: "Love!"       },
  "🌱💧": { result: "🌸", label: "Tumbuh!"     },
  "💧🌱": { result: "🌸", label: "Tumbuh!"     },
  "🍕🍕": { result: "🎉", label: "Pizza party!"},
  "💣💣": { result: "💥", label: "BOOM!"       },
  "🦄🌈": { result: "✨", label: "Magic!"      },
  "🌈🦄": { result: "✨", label: "Magic!"      },
  "🍦🍦": { result: "🎂", label: "Ice cream cake!"},
  "⭐⭐": { result: "🌟", label: "Super star!" },
};

const PHYSICS_PALETTE = [
  "🐱","🐟","🔥","💧","⚡","❤️","🌱","🍕",
  "⭐","🎈","💎","🎯","🦄","🍦","🌈","💣","🌸","🎸",
];

interface PhysicsEmoji {
  id: string;
  emoji: string;
  x: number; y: number;
  vx: number; vy: number;
  radius: number;
  pinned: boolean;
  comboLabel?: string;
  comboLabelTimer?: number;
}

export function EmojiPhysicsPlayground({
  containerRef,
}: {
  containerRef: React.RefObject<HTMLDivElement | null>;
}) {
  const [emojis, setEmojis] = useState<PhysicsEmoji[]>([]);
  const [open, setOpen]     = useState(false);
  const rafRef  = useRef<number | undefined>(undefined);
  const dragRef = useRef<{ id: string; lastX: number; lastY: number; vx: number; vy: number } | null>(null);
  const sizeRef = useRef({ w: 400, h: 400 });

  // Track container size
  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    const update = () => { sizeRef.current = { w: el.offsetWidth, h: el.offsetHeight }; };
    update();
    const ro = new ResizeObserver(update);
    ro.observe(el);
    return () => ro.disconnect();
  }, [containerRef]);

  // Physics loop
  useEffect(() => {
    const GRAVITY  = 0.35;
    const FRICTION = 0.985;
    const BOUNCE   = 0.55;

    function tick() {
      setEmojis((prev) => {
        if (!prev.length) return prev;
        const { w, h } = sizeRef.current;
        let changed = false;

        const next = prev.map((e) => {
          if (e.pinned) return e;
          let { x, y, vx, vy } = e;
          vy += GRAVITY;
          vx *= FRICTION;
          vy *= FRICTION;
          x  += vx;
          y  += vy;
          const r = e.radius;
          if (x - r < 0)    { x = r;     vx = Math.abs(vx)  * BOUNCE;  }
          if (x + r > w)    { x = w - r; vx = -Math.abs(vx) * BOUNCE;  }
          if (y - r < 0)    { y = r;     vy = Math.abs(vy)  * BOUNCE;  }
          if (y + r > h) {
            y  = h - r;
            vy = -Math.abs(vy) * BOUNCE * (Math.abs(vy) > 1 ? 1 : 0.1);
            if (Math.abs(vy) < 0.5) vy = 0;
          }
          if (x !== e.x || y !== e.y || vx !== e.vx || vy !== e.vy) changed = true;
          return { ...e, x, y, vx, vy };
        });

        // Combo collision detection
        outer:
        for (let i = 0; i < next.length; i++) {
          for (let j = i + 1; j < next.length; j++) {
            const a = next[i], b = next[j];
            if (a.comboLabel || b.comboLabel) continue;
            const dx = a.x - b.x, dy = a.y - b.y;
            if (Math.sqrt(dx * dx + dy * dy) < a.radius + b.radius + 4) {
              const combo = COMBO_RULES[a.emoji + b.emoji];
              if (combo) {
                next[i] = { ...a, emoji: combo.result, comboLabel: combo.label, comboLabelTimer: Date.now(), vx: (a.vx + b.vx) * 0.5, vy: (a.vy + b.vy) * 0.5 - 3 };
                next.splice(j, 1);
                changed = true;
                break outer;
              }
            }
          }
        }

        // Clear stale combo labels
        for (let i = 0; i < next.length; i++) {
          if (next[i].comboLabel && Date.now() - (next[i].comboLabelTimer || 0) > 1400) {
            next[i] = { ...next[i], comboLabel: undefined, comboLabelTimer: undefined };
            changed = true;
          }
        }

        return changed ? next : prev;
      });
      rafRef.current = requestAnimationFrame(tick);
    }
    rafRef.current = requestAnimationFrame(tick);
    return () => { if (rafRef.current) cancelAnimationFrame(rafRef.current); };
  }, []);

  const addEmoji = useCallback((emoji: string) => {
    const { w } = sizeRef.current;
    setEmojis((p) => {
      if (p.length >= 22) return p;
      return [...p, {
        id:     `pe-${Date.now()}-${Math.random()}`,
        emoji,
        x:      40 + Math.random() * (w - 80),
        y:      40,
        vx:     (Math.random() - 0.5) * 6,
        vy:     -4 - Math.random() * 4,
        radius: 18,
        pinned: false,
      }];
    });
  }, []);

  // ── Drag handling ────────────────────────────────────────────
  const startDrag = (id: string, clientX: number, clientY: number) => {
    dragRef.current = { id, lastX: clientX, lastY: clientY, vx: 0, vy: 0 };
    setEmojis((p) => p.map((e) => e.id === id ? { ...e, pinned: true } : e));
  };

  const onDragMove = useCallback((clientX: number, clientY: number) => {
    if (!dragRef.current || !containerRef.current) return;
    const rect = containerRef.current.getBoundingClientRect();
    const x = clientX - rect.left;
    const y = clientY - rect.top;
    dragRef.current.vx = clientX - dragRef.current.lastX;
    dragRef.current.vy = clientY - dragRef.current.lastY;
    dragRef.current.lastX = clientX;
    dragRef.current.lastY = clientY;
    const id = dragRef.current.id;
    setEmojis((p) => p.map((e) => e.id === id ? { ...e, x, y } : e));
  }, [containerRef]);

  const endDrag = useCallback(() => {
    if (!dragRef.current) return;
    const { id, vx, vy } = dragRef.current;
    dragRef.current = null;
    setEmojis((p) => p.map((e) => e.id === id ? { ...e, pinned: false, vx: vx * 1.6, vy: vy * 1.6 } : e));
  }, []);

  useEffect(() => {
    const mm = (e: MouseEvent)  => onDragMove(e.clientX, e.clientY);
    const mu = ()                => endDrag();
    const tm = (e: TouchEvent)  => { if (e.touches[0]) onDragMove(e.touches[0].clientX, e.touches[0].clientY); };
    const tu = ()                => endDrag();
    window.addEventListener("mousemove", mm);
    window.addEventListener("mouseup",   mu);
    window.addEventListener("touchmove", tm, { passive: true });
    window.addEventListener("touchend",  tu);
    return () => {
      window.removeEventListener("mousemove", mm);
      window.removeEventListener("mouseup",   mu);
      window.removeEventListener("touchmove", tm);
      window.removeEventListener("touchend",  tu);
    };
  }, [onDragMove, endDrag]);

  return (
    <>
      {/* ── Floating emoji objects ── */}
      <div className="absolute inset-0 pointer-events-none z-25">
        {emojis.map((e) => (
          <div
            key={e.id}
            className="absolute pointer-events-auto select-none"
            style={{
              left: e.x, top: e.y,
              transform: "translate(-50%,-50%)",
              cursor: e.pinned ? "grabbing" : "grab",
              touchAction: "none",
              fontSize: 26,
              userSelect: "none",
            }}
            onMouseDown={(ev) => { ev.preventDefault(); startDrag(e.id, ev.clientX, ev.clientY); }}
            onTouchStart={(ev) => { startDrag(e.id, ev.touches[0].clientX, ev.touches[0].clientY); }}
          >
            <div style={{ filter: e.pinned ? "drop-shadow(0 0 10px rgba(255,220,80,0.9))" : "drop-shadow(0 2px 3px rgba(0,0,0,0.25))" }}>
              {e.emoji}
            </div>
            <AnimatePresence>
              {e.comboLabel && (
                <motion.div
                  className="absolute -top-7 left-1/2 -translate-x-1/2 text-[10px] font-black whitespace-nowrap bg-black/70 text-yellow-300 rounded-full px-2 py-0.5 pointer-events-none z-10"
                  initial={{ opacity: 0, y: 6, scale: 0.7 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  exit={{ opacity: 0, y: -6 }}
                  transition={{ type: "spring", stiffness: 500, damping: 20 }}
                >
                  {e.comboLabel}
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        ))}
      </div>

      {/* ── Launcher palette (bottom-right of messages container) ── */}
      <div className="sticky bottom-2 right-2 flex justify-end pointer-events-auto z-30 pr-1">
        <div className="flex flex-col items-end gap-1.5">
          <AnimatePresence>
            {open && (
              <motion.div
                initial={{ opacity: 0, y: 12, scale: 0.88 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, y: 12, scale: 0.88 }}
                transition={{ type: "spring", stiffness: 380, damping: 24 }}
                className="bg-card/90 backdrop-blur-md border border-border/40 rounded-2xl p-2.5 shadow-xl"
              >
                <div className="flex flex-wrap gap-1.5 max-w-[164px]">
                  {PHYSICS_PALETTE.map((em) => (
                    <motion.button
                      key={em}
                      whileHover={{ scale: 1.35, rotate: [0, -8, 8, 0] }}
                      whileTap={{ scale: 0.65, rotate: 25 }}
                      transition={{ type: "spring", stiffness: 600, damping: 14 }}
                      onClick={() => addEmoji(em)}
                      className="text-xl leading-none p-1 rounded-xl hover:bg-muted/40 transition-colors"
                    >
                      {em}
                    </motion.button>
                  ))}
                </div>
                {emojis.length > 0 && (
                  <button
                    onClick={() => setEmojis([])}
                    className="w-full mt-2 text-[10px] text-muted-foreground hover:text-destructive transition-colors border-t border-border/40 pt-1.5 text-center"
                  >
                    clear all ✕ ({emojis.length})
                  </button>
                )}
                <p className="text-[9px] text-muted-foreground/50 mt-1 text-center">
                  Drag & throw · combos!
                </p>
              </motion.div>
            )}
          </AnimatePresence>

          <motion.button
            whileHover={{ scale: 1.15 }}
            whileTap={{ scale: 0.8, rotate: -20 }}
            transition={{ type: "spring", stiffness: 500, damping: 18 }}
            onClick={() => setOpen((o) => !o)}
            className="w-9 h-9 rounded-2xl bg-card/80 backdrop-blur-sm border border-border/40 flex items-center justify-center shadow-md text-lg relative hover:border-primary/40 transition-all"
            title="Emoji Physics"
          >
            🎮
            <AnimatePresence>
              {emojis.length > 0 && (
                <motion.span
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  exit={{ scale: 0 }}
                  className="absolute -top-1 -right-1 w-4 h-4 bg-primary rounded-full text-[8px] font-black text-primary-foreground flex items-center justify-center"
                >
                  {emojis.length}
                </motion.span>
              )}
            </AnimatePresence>
          </motion.button>
        </div>
      </div>
    </>
  );
}