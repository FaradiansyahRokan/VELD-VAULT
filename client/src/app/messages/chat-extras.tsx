"use client";

/**
 * chat-extras.tsx
 * ────────────────────────────────────────────────────────────
 * Drop-in extras for the messages page.
 *
 * USAGE in messages-page.tsx:
 *
 *   import {
 *     EmojiPhysicsPlayground,
 *     RandomVisitorLayer,
 *     RoomEventLayer,
 *     useChatExtras,
 *   } from "./chat-extras";
 *
 *   // inside component:
 *   const chatExtras = useChatExtras(activeAddr);
 *
 *   // inside JSX (inside the chat area relative container):
 *   <RandomVisitorLayer containerRef={chatAreaRef} />
 *   <RoomEventLayer {...chatExtras.roomEvent} containerRef={chatAreaRef} />
 *   <EmojiPhysicsPlayground containerRef={messagesContainerRef} />
 * ────────────────────────────────────────────────────────────
 */

import { useState, useEffect, useRef, useCallback } from "react";
import { motion, AnimatePresence, useSpring } from "framer-motion";

// ══════════════════════════════════════════════════════════════════
// 🛸 PIXEL SPRITES  (SVG-based pixel art, no external assets)
// ══════════════════════════════════════════════════════════════════

// Each sprite is rows of hex colors; "" = transparent
const SPRITES: Record<string, { pixels: string[][]; w: number; h: number; scale?: number }> = {
    cat: {
        w: 11, h: 9, scale: 3,
        pixels: [
            ["", "", "#222", "", "", "", "#222", "", "", "", ""],
            ["", "#222", "#f4c080", "#222", "", "#222", "#f4c080", "#222", "", "", ""],
            ["#222", "#f4c080", "#f4c080", "#f4c080", "#222", "#f4c080", "#f4c080", "#f4c080", "#222", "", ""],
            ["#222", "#f4c080", "#5a3", "#f4c080", "#f4c080", "#f4c080", "#5a3", "#f4c080", "#222", "", ""],
            ["#222", "#f4c080", "#f4c080", "#e9967a", "#f4c080", "#e9967a", "#f4c080", "#f4c080", "#222", "", ""],
            ["", "#222", "#f4c080", "#f4c080", "#f4c080", "#f4c080", "#f4c080", "#222", "", "", ""],
            ["", "", "#222", "#f4c080", "#f4c080", "#f4c080", "#222", "", "", "", ""],
            ["", "", "#222", "#f4c080", "", "#f4c080", "#222", "", "", "", ""],
            ["", "", "", "#222", "", "#222", "", "", "", "", ""],
        ],
    },
    alien: {
        w: 11, h: 8, scale: 3,
        pixels: [
            ["", "", "#0f0", "#0f0", "#0f0", "#0f0", "#0f0", "", "", "", ""],
            ["", "#0f0", "#0f0", "#0f0", "#0f0", "#0f0", "#0f0", "#0f0", "", "", ""],
            ["#0f0", "#fff", "#fff", "#0f0", "#0f0", "#0f0", "#fff", "#fff", "#0f0", "", ""],
            ["#0f0", "#fff", "#88f", "#0f0", "#0f0", "#0f0", "#88f", "#fff", "#0f0", "", ""],
            ["#0f0", "#0f0", "#0f0", "#0f0", "#0f0", "#0f0", "#0f0", "#0f0", "#0f0", "", ""],
            ["", "#0f0", "", "#0f0", "#0f0", "#0f0", "", "#0f0", "", "", ""],
            ["", "#0f0", "", "", "", "", "", "#0f0", "", "", ""],
            ["", "", "", "", "", "", "", "", "", "", ""],
        ],
    },
    slime: {
        w: 9, h: 8, scale: 3,
        pixels: [
            ["", "", "#4de", "#4de", "#4de", "#4de", "#4de", "", ""],
            ["", "#4de", "#4de", "#4de", "#4de", "#4de", "#4de", "#4de", ""],
            ["#4de", "#4de", "#fff", "#4de", "#4de", "#4de", "#fff", "#4de", "#4de"],
            ["#4de", "#4de", "#5ef", "#4de", "#4de", "#4de", "#5ef", "#4de", "#4de"],
            ["#4de", "#4de", "#4de", "#4de", "#4de", "#4de", "#4de", "#4de", "#4de"],
            ["#4de", "#4de", "#4de", "#4de", "#4de", "#4de", "#4de", "#4de", "#4de"],
            ["", "#4de", "#4de", "", "", "", "#4de", "#4de", ""],
            ["", "", "#4de", "", "", "", "#4de", "", ""],
        ],
    },
    ghost: {
        w: 9, h: 10, scale: 3,
        pixels: [
            ["", "", "#ddf", "#ddf", "#ddf", "#ddf", "#ddf", "", ""],
            ["", "#ddf", "#ddf", "#ddf", "#ddf", "#ddf", "#ddf", "#ddf", ""],
            ["#ddf", "#ddf", "#ddf", "#ddf", "#ddf", "#ddf", "#ddf", "#ddf", "#ddf"],
            ["#ddf", "#ddf", "#888", "#ddf", "#ddf", "#ddf", "#888", "#ddf", "#ddf"],
            ["#ddf", "#ddf", "#555", "#ddf", "#ddf", "#ddf", "#555", "#ddf", "#ddf"],
            ["#ddf", "#ddf", "#ddf", "#ddf", "#ddf", "#ddf", "#ddf", "#ddf", "#ddf"],
            ["#ddf", "#ddf", "#ddf", "#ddf", "#ddf", "#ddf", "#ddf", "#ddf", "#ddf"],
            ["#ddf", "#ddf", "", "#ddf", "#ddf", "#ddf", "", "#ddf", "#ddf"],
            ["#ddf", "", "", "", "#ddf", "", "", "", "#ddf"],
            ["", "", "", "", "", "", "", "", ""],
        ],
    },
    ninja: {
        w: 9, h: 10, scale: 3,
        pixels: [
            ["", "", "", "#222", "#222", "#222", "", "", ""],
            ["", "", "#222", "#222", "#222", "#222", "#222", "", ""],
            ["", "#222", "#222", "#c00", "#222", "#c00", "#222", "#222", ""],
            ["", "#222", "#222", "#222", "#222", "#222", "#222", "#222", ""],
            ["", "", "#222", "#222", "#222", "#222", "#222", "", ""],
            ["", "", "#222", "#222", "#222", "#222", "#222", "", ""],
            ["", "#222", "#222", "#222", "#222", "#222", "#222", "#222", ""],
            ["", "#222", "", "#222", "", "#222", "", "#222", ""],
            ["", "#222", "", "#222", "", "#222", "", "#222", ""],
            ["", "", "", "", "", "", "", "", ""],
        ],
    },
};

function PixelSprite({ type, flipped = false, style }: { type: keyof typeof SPRITES; flipped?: boolean; style?: React.CSSProperties }) {
    const s = SPRITES[type];
    if (!s) return null;
    const px = s.scale || 2;
    return (
        <div style={{ ...style, transform: `${style?.transform || ""} ${flipped ? "scaleX(-1)" : ""}`, imageRendering: "pixelated", display: "inline-block" }}>
            {s.pixels.map((row, ri) => (
                <div key={ri} style={{ display: "flex" }}>
                    {row.map((col, ci) => (
                        <div key={ci} style={{ width: px, height: px, background: col || "transparent" }} />
                    ))}
                </div>
            ))}
        </div>
    );
}

// ══════════════════════════════════════════════════════════════════
// 🐾 RANDOM VISITOR LAYER
// ══════════════════════════════════════════════════════════════════

type VisitorType = keyof typeof SPRITES;

interface VisitorState {
    id: string;
    type: VisitorType;
    y: number;       // percent from top
    fromLeft: boolean;
    scared: boolean;
    speed: number;   // seconds for full crossing
}

export function RandomVisitorLayer({ containerRef }: { containerRef: React.RefObject<HTMLDivElement | null> }) {
    const [visitor, setVisitor] = useState<VisitorState | null>(null);
    const timerRef = useRef<NodeJS.Timeout | undefined>(undefined);
    const visitorTypes: VisitorType[] = ["cat", "alien", "slime", "ghost", "ninja"];

    const spawnVisitor = useCallback(() => {
        const type = visitorTypes[Math.floor(Math.random() * visitorTypes.length)];
        const fromLeft = Math.random() > 0.5;
        setVisitor({
            id: `v-${Date.now()}`,
            type,
            y: 15 + Math.random() * 55,
            fromLeft,
            scared: false,
            speed: 7 + Math.random() * 5,
        });
    }, []); // eslint-disable-line

    // Schedule next visitor
    const scheduleNext = useCallback(() => {
        clearTimeout(timerRef.current);
        timerRef.current = setTimeout(() => {
            spawnVisitor();
        }, 40_000 + Math.random() * 50_000);
    }, [spawnVisitor]);

    useEffect(() => {
        // First visitor after 20–40s
        timerRef.current = setTimeout(spawnVisitor, 20_000 + Math.random() * 20_000);
        return () => clearTimeout(timerRef.current);
    }, []); // eslint-disable-line

    const handleDismiss = (id: string) => {
        setVisitor((v) => v?.id === id ? { ...v, scared: true } : v);
        setTimeout(() => { setVisitor(null); scheduleNext(); }, 900);
    };

    if (!visitor) return null;

    const s = SPRITES[visitor.type];
    const spriteW = (s.w * (s.scale || 2));
    const startX = visitor.fromLeft ? -spriteW - 10 : (containerRef.current?.offsetWidth || 800) + 10;
    const endX = visitor.fromLeft ? (containerRef.current?.offsetWidth || 800) + 10 : -spriteW - 10;
    const scaredX = visitor.fromLeft
        ? (visitor.scared ? -spriteW - 60 : endX)
        : (visitor.scared ? (containerRef.current?.offsetWidth || 800) + 60 : endX);

    return (
        <AnimatePresence>
            <motion.div
                key={visitor.id}
                className="absolute z-40 select-none cursor-pointer"
                style={{ top: `${visitor.y}%`, left: 0, pointerEvents: "all" }}
                initial={{ x: startX }}
                animate={{ x: visitor.scared ? scaredX : endX }}
                transition={{ duration: visitor.scared ? 0.5 : visitor.speed, ease: "linear" }}
                onAnimationComplete={() => { setVisitor(null); scheduleNext(); }}
                onClick={() => handleDismiss(visitor.id)}
                title="Tap me! 👀"
            >
                <div className="relative group">
                    <PixelSprite type={visitor.type} flipped={!visitor.fromLeft} />
                    {/* Footstep dust */}
                    {!visitor.scared && (
                        <motion.div className="absolute -bottom-1 left-1/2 -translate-x-1/2 text-[8px] opacity-0"
                            animate={{ opacity: [0, 0.5, 0], y: [0, 3] }}
                            transition={{ repeat: Infinity, duration: 0.45 }}>
                            ·
                        </motion.div>
                    )}
                    {/* "!" on hover */}
                    <motion.div
                        className="absolute -top-6 left-1/2 -translate-x-1/2 text-xs font-bold text-yellow-400 opacity-0 group-hover:opacity-100 pointer-events-none"
                        transition={{ duration: 0.15 }}>
                        !
                    </motion.div>
                </div>
            </motion.div>
        </AnimatePresence>
    );
}

// ══════════════════════════════════════════════════════════════════
// 🌠 ROOM EVENT LAYER  (meteor, coin drop, mini game)
// ══════════════════════════════════════════════════════════════════

type RoomEventType = "meteor" | "coindrop" | "minigame" | null;

interface MiniGameTarget { id: string; x: number; y: number; emoji: string; caught: boolean; }

interface RoomEventProps {
    activeEvent: RoomEventType;
    onEventEnd: () => void;
}

// ── Meteor ──
function MeteorEvent({ onEnd }: { onEnd: () => void }) {
    useEffect(() => { const t = setTimeout(onEnd, 4000); return () => clearTimeout(t); }, []); // eslint-disable-line
    const meteors = Array.from({ length: 5 }, (_, i) => ({
        id: i,
        startX: 5 + Math.random() * 60,
        startY: -(10 + Math.random() * 20),
        delay: i * 0.3,
        size: 16 + Math.random() * 20,
        tail: 60 + Math.random() * 80,
    }));
    return (
        <div className="absolute inset-0 pointer-events-none overflow-hidden z-50 rounded-[2rem]">
            {meteors.map((m) => (
                <motion.div key={m.id} className="absolute select-none" style={{ left: `${m.startX}%`, top: `${m.startY}%`, fontSize: m.size }}>
                    <motion.div initial={{ x: 0, y: 0, opacity: 0 }}
                        animate={{ x: "100vw", y: "100vh", opacity: [0, 1, 1, 0] }}
                        transition={{ duration: 1.8, delay: m.delay, ease: "easeIn" }}>
                        <div className="relative">
                            {/* Trail */}
                            <div className="absolute" style={{ width: m.tail, height: 3, background: "linear-gradient(to left, transparent, rgba(255,200,80,0.8))", top: "50%", right: "100%", transform: "translateY(-50%)", borderRadius: 2 }} />
                            {/* Core */}
                            🌠
                        </div>
                    </motion.div>
                </motion.div>
            ))}
            <motion.div className="absolute top-1/4 left-1/2 -translate-x-1/2 text-center z-60"
                initial={{ opacity: 0, scale: 0.5 }} animate={{ opacity: [0, 1, 1, 0], scale: [0.5, 1.2, 1, 0.8] }}
                transition={{ duration: 3.5, times: [0, 0.1, 0.7, 1] }}>
                <div className="bg-black/40 backdrop-blur-sm rounded-2xl px-4 py-2 border border-yellow-400/30">
                    <p className="text-yellow-300 font-bold text-sm">🌠 Meteor shower!</p>
                    <p className="text-yellow-200/70 text-[10px]">Tandai keinginanmu ✨</p>
                </div>
            </motion.div>
        </div>
    );
}

// ── Coin drop ──
function CoinDropEvent({ onEnd }: { onEnd: () => void }) {
    const coins = Array.from({ length: 20 }, (_, i) => ({
        id: i, x: 5 + Math.random() * 90, delay: Math.random() * 1.5, dur: 1.5 + Math.random() * 1.5, size: 16 + Math.random() * 14, spin: Math.random() > 0.5,
    }));
    useEffect(() => { const t = setTimeout(onEnd, 4500); return () => clearTimeout(t); }, []); // eslint-disable-line
    return (
        <div className="absolute inset-0 pointer-events-none overflow-hidden z-50 rounded-[2rem]">
            {coins.map((c) => (
                <motion.div key={c.id} className="absolute select-none" style={{ left: `${c.x}%`, top: "-30px", fontSize: c.size }}
                    initial={{ y: 0, rotate: 0, opacity: 1 }}
                    animate={{ y: "110%", rotate: c.spin ? 720 : 0, opacity: [1, 1, 1, 0] }}
                    transition={{ duration: c.dur, delay: c.delay, ease: "easeIn" }}>
                    {["🪙", "💎", "💰", "✨"][Math.floor(Math.random() * 4)]}
                </motion.div>
            ))}
            <motion.div className="absolute top-1/4 left-1/2 -translate-x-1/2"
                initial={{ opacity: 0, y: -20 }} animate={{ opacity: [0, 1, 1, 0], y: [-20, 0, 0, -10] }}
                transition={{ duration: 3.5, times: [0, 0.1, 0.7, 1] }}>
                <div className="bg-yellow-500/20 backdrop-blur-sm rounded-2xl px-4 py-2 border border-yellow-400/40">
                    <p className="text-yellow-300 font-bold text-sm">💰 It's raining coins!</p>
                </div>
            </motion.div>
        </div>
    );
}

// ── Mini Game ──
const GAME_EMOJIS = ["⭐", "🎯", "💎", "🌟", "💫", "🎁", "🍀", "🔮"];
const BOMB_EMOJIS = ["💣", "☠️", "🖤"];

interface GameTarget {
    id: string; x: number; y: number; emoji: string; isBomb: boolean;
    vx: number; vy: number; caught: boolean;
}

function MiniGameEvent({ onEnd }: { onEnd: () => void }) {
    const [timeLeft, setTimeLeft] = useState(10);
    const [score, setScore] = useState(0);
    const [targets, setTargets] = useState<GameTarget[]>([]);
    const [done, setDone] = useState(false);
    const [penalty, setPenalty] = useState(false);
    const spawnRef = useRef<NodeJS.Timeout | undefined>(undefined);

    const spawnTarget = useCallback(() => {
        const isBomb = Math.random() < 0.2;
        const newTarget: GameTarget = {
            id: `t-${Date.now()}-${Math.random()}`,
            x: 8 + Math.random() * 76,
            y: 10 + Math.random() * 65,
            emoji: isBomb ? BOMB_EMOJIS[Math.floor(Math.random() * BOMB_EMOJIS.length)] : GAME_EMOJIS[Math.floor(Math.random() * GAME_EMOJIS.length)],
            isBomb,
            vx: (Math.random() - 0.5) * 0.08,
            vy: (Math.random() - 0.5) * 0.06,
            caught: false,
        };
        setTargets((p) => [...p.filter((t) => !t.caught).slice(-12), newTarget]);
    }, []);

    useEffect(() => {
        spawnTarget();
        spawnRef.current = setInterval(spawnTarget, 1200);
        const countdown = setInterval(() => {
            setTimeLeft((t) => {
                if (t <= 1) { clearInterval(countdown); clearInterval(spawnRef.current); setDone(true); return 0; }
                return t - 1;
            });
        }, 1000);
        return () => { clearInterval(countdown); clearInterval(spawnRef.current); };
    }, []); // eslint-disable-line

    useEffect(() => {
        if (done) { const t = setTimeout(onEnd, 2500); return () => clearTimeout(t); }
    }, [done, onEnd]);

    const catchTarget = (id: string, isBomb: boolean) => {
        if (done) return;
        if (isBomb) {
            setPenalty(true);
            setTimeout(() => setPenalty(false), 600);
            setScore((s) => Math.max(0, s - 2));
        } else {
            setScore((s) => s + 1);
        }
        setTargets((p) => p.map((t) => t.id === id ? { ...t, caught: true } : t));
        setTimeout(() => setTargets((p) => p.filter((t) => t.id !== id)), 400);
    };

    return (
        <div className={`absolute inset-0 z-50 rounded-[2rem] overflow-hidden transition-all duration-150 ${penalty ? "bg-red-500/10" : ""}`}>
            {/* Header */}
            <motion.div initial={{ y: -60 }} animate={{ y: 0 }} className="absolute top-3 left-1/2 -translate-x-1/2 z-60 flex items-center gap-3 bg-card/90 backdrop-blur-md border border-border/50 rounded-2xl px-4 py-2 shadow-xl">
                <div className="text-center">
                    <p className="text-[9px] text-muted-foreground uppercase tracking-wider">Score</p>
                    <motion.p key={score} initial={{ scale: 1.5 }} animate={{ scale: 1 }} className="text-lg font-black text-primary leading-none">{score}</motion.p>
                </div>
                <div className="w-px h-8 bg-border/50" />
                <div className="text-center">
                    <p className="text-[9px] text-muted-foreground uppercase tracking-wider">Time</p>
                    <motion.p key={timeLeft}
                        animate={timeLeft <= 3 ? { scale: [1, 1.3, 1], color: ["hsl(var(--foreground))", "#ef4444", "hsl(var(--foreground))"] } : {}}
                        className="text-lg font-black leading-none">{timeLeft}s</motion.p>
                </div>
                <div className="w-px h-8 bg-border/50" />
                <div>
                    <p className="text-[9px] text-muted-foreground">Tap ⭐ avoid 💣</p>
                    <p className="text-[9px] text-yellow-400 font-bold">MINI GAME!</p>
                </div>
            </motion.div>

            {/* Targets */}
            <AnimatePresence>
                {!done && targets.map((t) => (
                    <motion.button key={t.id}
                        className="absolute text-3xl select-none cursor-pointer z-55"
                        style={{ left: `${t.x}%`, top: `${t.y}%`, transform: "translate(-50%, -50%)" }}
                        initial={{ scale: 0, rotate: -30 }} animate={{ scale: t.caught ? 2 : [1, 1.08, 1], rotate: 0, opacity: t.caught ? 0 : 1 }}
                        exit={{ scale: 0, opacity: 0 }}
                        transition={t.caught ? { duration: 0.25 } : { scale: { repeat: Infinity, duration: 1.5 } }}
                        onClick={() => catchTarget(t.id, t.isBomb)}
                        whileHover={{ scale: 1.2 }} whileTap={{ scale: 0.7 }}>
                        {t.emoji}
                    </motion.button>
                ))}
            </AnimatePresence>

            {/* Done screen */}
            <AnimatePresence>
                {done && (
                    <motion.div className="absolute inset-0 flex items-center justify-center bg-black/20 backdrop-blur-sm"
                        initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
                        <motion.div initial={{ scale: 0.5, y: 30 }} animate={{ scale: 1, y: 0 }}
                            transition={{ type: "spring", stiffness: 350, damping: 20 }}
                            className="bg-card border border-border/50 rounded-3xl p-8 text-center shadow-2xl">
                            <motion.div className="text-6xl mb-3" animate={{ rotate: [0, -10, 10, -5, 0] }} transition={{ duration: 0.5, delay: 0.2 }}>
                                {score >= 8 ? "🏆" : score >= 5 ? "🥈" : score >= 3 ? "🥉" : "💪"}
                            </motion.div>
                            <p className="font-black text-2xl text-foreground">{score} pts</p>
                            <p className="text-sm text-muted-foreground mt-1">
                                {score >= 8 ? "LEGENDARY! 🔥" : score >= 5 ? "Keren banget!" : score >= 3 ? "Bagus!" : "Next time ya! 😄"}
                            </p>
                        </motion.div>
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
}

export function RoomEventLayer({ activeEvent, onEventEnd }: RoomEventProps) {
    if (!activeEvent) return null;
    return (
        <AnimatePresence>
            {activeEvent === "meteor" && <MeteorEvent key="meteor" onEnd={onEventEnd} />}
            {activeEvent === "coindrop" && <CoinDropEvent key="coin" onEnd={onEventEnd} />}
            {activeEvent === "minigame" && <MiniGameEvent key="game" onEnd={onEventEnd} />}
        </AnimatePresence>
    );
}

// ══════════════════════════════════════════════════════════════════
// 🎮 EMOJI PHYSICS PLAYGROUND
// ══════════════════════════════════════════════════════════════════

const COMBO_RULES: Record<string, { result: string; label: string }> = {
    "🐱🐟": { result: "😋", label: "Nyam nyam!" },
    "🐟🐱": { result: "😋", label: "Nyam nyam!" },
    "🔥💧": { result: "💨", label: "Pfff!" },
    "💧🔥": { result: "💨", label: "Pfff!" },
    "⚡💧": { result: "⚡", label: "Bzzt!" },
    "💧⚡": { result: "⚡", label: "Bzzt!" },
    "❤️❤️": { result: "💞", label: "Love!" },
    "🌱💧": { result: "🌸", label: "Tumbuh!" },
    "💧🌱": { result: "🌸", label: "Tumbuh!" },
    "🍕🍕": { result: "🎉", label: "Pizza party!" },
    "💣💣": { result: "💥", label: "BOOM!" },
};

const PHYSICS_PALETTE = ["🐱", "🐟", "🔥", "💧", "⚡", "❤️", "🌱", "🍕", "⭐", "🎈", "💎", "🎯", "🦄", "🍦", "🌈"];

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

export function EmojiPhysicsPlayground({ containerRef }: { containerRef: React.RefObject<HTMLDivElement | null> }) {
    const [emojis, setEmojis] = useState<PhysicsEmoji[]>([]);
    const [open, setOpen] = useState(false);
    const rafRef = useRef<number | undefined>(undefined);
    const emojisRef = useRef<PhysicsEmoji[]>([]);
    const dragRef = useRef<{ id: string; lastX: number; lastY: number; vx: number; vy: number } | null>(null);
    const containerSize = useRef({ w: 400, h: 400 });

    // Keep ref in sync
    useEffect(() => { emojisRef.current = emojis; }, [emojis]);

    // Resize observer
    useEffect(() => {
        const el = containerRef.current;
        if (!el) return;
        const update = () => { containerSize.current = { w: el.offsetWidth, h: el.offsetHeight }; };
        update();
        const ro = new ResizeObserver(update);
        ro.observe(el);
        return () => ro.disconnect();
    }, [containerRef]);

    // Physics loop
    useEffect(() => {
        const GRAVITY = 0.35;
        const FRICTION = 0.985;
        const BOUNCE = 0.55;

        function tick() {
            setEmojis((prev) => {
                if (!prev.length) return prev;
                const { w, h } = containerSize.current;
                let changed = false;
                const next = prev.map((e) => {
                    if (e.pinned) return e;
                    let { x, y, vx, vy } = e;
                    vy += GRAVITY;
                    vx *= FRICTION;
                    vy *= FRICTION;
                    x += vx;
                    y += vy;
                    const r = e.radius;
                    if (x - r < 0) { x = r; vx = Math.abs(vx) * BOUNCE; }
                    if (x + r > w) { x = w - r; vx = -Math.abs(vx) * BOUNCE; }
                    if (y - r < 0) { y = r; vy = Math.abs(vy) * BOUNCE; }
                    if (y + r > h) { y = h - r; vy = -Math.abs(vy) * BOUNCE * (Math.abs(vy) > 1 ? 1 : 0.1); if (Math.abs(vy) < 0.5) vy = 0; }
                    if (x !== e.x || y !== e.y || vx !== e.vx || vy !== e.vy) changed = true;
                    return { ...e, x, y, vx, vy };
                });

                // Simple combo detection (collision between two emojis)
                for (let i = 0; i < next.length; i++) {
                    for (let j = i + 1; j < next.length; j++) {
                        const a = next[i], b = next[j];
                        if (a.comboLabel || b.comboLabel) continue;
                        const dx = a.x - b.x, dy = a.y - b.y;
                        const dist = Math.sqrt(dx * dx + dy * dy);
                        if (dist < a.radius + b.radius + 4) {
                            const key = a.emoji + b.emoji;
                            const combo = COMBO_RULES[key];
                            if (combo) {
                                next[i] = { ...a, emoji: combo.result, comboLabel: combo.label, comboLabelTimer: Date.now(), vx: (a.vx + b.vx) * 0.5, vy: (a.vy + b.vy) * 0.5 - 3 };
                                next.splice(j, 1);
                                changed = true;
                                break;
                            }
                        }
                    }
                }

                // Clear old combo labels
                for (let i = 0; i < next.length; i++) {
                    if (next[i].comboLabel && Date.now() - (next[i].comboLabelTimer || 0) > 1200) {
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
    }, []); // eslint-disable-line

    const addEmoji = useCallback((emoji: string) => {
        const { w } = containerSize.current;
        const x = 40 + Math.random() * (w - 80);
        setEmojis((p) => {
            if (p.length >= 20) return p; // cap at 20
            return [...p, {
                id: `pe-${Date.now()}-${Math.random()}`,
                emoji, x, y: 40,
                vx: (Math.random() - 0.5) * 6,
                vy: -4 - Math.random() * 4,
                radius: 18,
                pinned: false,
            }];
        });
    }, []);

    const clearAll = () => setEmojis([]);

    // Drag handling
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
        setEmojis((p) => p.map((e) => e.id === id ? { ...e, pinned: false, vx: vx * 1.5, vy: vy * 1.5 } : e));
    }, []);

    // Global mouse/touch move
    useEffect(() => {
        const mm = (e: MouseEvent) => onDragMove(e.clientX, e.clientY);
        const mu = () => endDrag();
        const tm = (e: TouchEvent) => { if (e.touches[0]) onDragMove(e.touches[0].clientX, e.touches[0].clientY); };
        const tu = () => endDrag();
        window.addEventListener("mousemove", mm);
        window.addEventListener("mouseup", mu);
        window.addEventListener("touchmove", tm, { passive: true });
        window.addEventListener("touchend", tu);
        return () => {
            window.removeEventListener("mousemove", mm);
            window.removeEventListener("mouseup", mu);
            window.removeEventListener("touchmove", tm);
            window.removeEventListener("touchend", tu);
        };
    }, [onDragMove, endDrag]);

    return (
        <>
            {/* Physics emojis rendered in the container */}
            <div className="absolute inset-0 pointer-events-none z-25">
                {emojis.map((e) => (
                    <div key={e.id} className="absolute pointer-events-auto select-none"
                        style={{ left: e.x, top: e.y, transform: "translate(-50%,-50%)", cursor: "grab", touchAction: "none", fontSize: 26 }}
                        onMouseDown={(ev) => { ev.preventDefault(); startDrag(e.id, ev.clientX, ev.clientY); }}
                        onTouchStart={(ev) => { startDrag(e.id, ev.touches[0].clientX, ev.touches[0].clientY); }}>
                        <div style={{ filter: e.pinned ? "drop-shadow(0 0 8px rgba(255,255,100,0.8))" : undefined }}>
                            {e.emoji}
                        </div>
                        {/* Combo label */}
                        <AnimatePresence>
                            {e.comboLabel && (
                                <motion.div className="absolute -top-7 left-1/2 -translate-x-1/2 text-[10px] font-black whitespace-nowrap bg-black/70 text-yellow-300 rounded-full px-2 py-0.5 pointer-events-none"
                                    initial={{ opacity: 0, y: 6, scale: 0.7 }} animate={{ opacity: 1, y: 0, scale: 1 }} exit={{ opacity: 0, y: -6 }}>
                                    {e.comboLabel}
                                </motion.div>
                            )}
                        </AnimatePresence>
                    </div>
                ))}
            </div>

            {/* Launcher palette */}
            <div className="absolute bottom-[76px] left-3 z-35 flex flex-col items-start gap-1">
                <AnimatePresence>
                    {open && (
                        <motion.div initial={{ opacity: 0, x: -16, scale: 0.85 }} animate={{ opacity: 1, x: 0, scale: 1 }} exit={{ opacity: 0, x: -16, scale: 0.85 }}
                            transition={{ type: "spring", stiffness: 380, damping: 22 }}
                            className="bg-card/90 backdrop-blur-md border border-border/40 rounded-2xl p-2.5 shadow-xl mb-1 max-w-[160px]">
                            <div className="flex flex-wrap gap-1.5 max-w-[140px]">
                                {PHYSICS_PALETTE.map((em) => (
                                    <motion.button key={em} whileHover={{ scale: 1.3 }} whileTap={{ scale: 0.7, rotate: 20 }}
                                        transition={{ type: "spring", stiffness: 600, damping: 15 }}
                                        onClick={() => addEmoji(em)} className="text-xl leading-none p-0.5 rounded-lg hover:bg-muted/40 transition-colors">
                                        {em}
                                    </motion.button>
                                ))}
                            </div>
                            {emojis.length > 0 && (
                                <button onClick={clearAll} className="w-full mt-2 text-[10px] text-muted-foreground hover:text-destructive transition-colors border-t border-border/40 pt-1.5">
                                    clear all ✕
                                </button>
                            )}
                            <p className="text-[9px] text-muted-foreground/50 mt-1 text-center">Drag & throw • combos!</p>
                        </motion.div>
                    )}
                </AnimatePresence>
                <motion.button whileHover={{ scale: 1.15 }} whileTap={{ scale: 0.82, rotate: -15 }}
                    transition={{ type: "spring", stiffness: 500, damping: 18 }}
                    onClick={() => setOpen((o) => !o)}
                    className="w-9 h-9 rounded-2xl bg-card/80 backdrop-blur-sm border border-border/40 flex items-center justify-center shadow-md text-lg relative">
                    🎮
                    {emojis.length > 0 && (
                        <motion.span initial={{ scale: 0 }} animate={{ scale: 1 }} className="absolute -top-1 -right-1 w-4 h-4 bg-primary rounded-full text-[8px] font-black text-primary-foreground flex items-center justify-center">
                            {emojis.length}
                        </motion.span>
                    )}
                </motion.button>
            </div>
        </>
    );
}

// ══════════════════════════════════════════════════════════════════
// 🎰 useChatExtras HOOK
// ══════════════════════════════════════════════════════════════════

export function useChatExtras(activeAddr: string | null) {
    const [activeEvent, setActiveEvent] = useState<RoomEventType>(null);
    const eventTimer = useRef<NodeJS.Timeout | undefined>(undefined);

    const scheduleEvent = useCallback(() => {
        clearTimeout(eventTimer.current);
        eventTimer.current = setTimeout(() => {
            if (!activeAddr) { scheduleEvent(); return; }
            const events: RoomEventType[] = ["meteor", "coindrop", "minigame"];
            // mini game less frequent
            const pool: RoomEventType[] = ["meteor", "coindrop", "meteor", "coindrop", "minigame"];
            setActiveEvent(pool[Math.floor(Math.random() * pool.length)]);
        }, 60_000 + Math.random() * 90_000); // 1–2.5 min
    }, [activeAddr]);

    useEffect(() => {
        scheduleEvent();
        return () => clearTimeout(eventTimer.current);
    }, [scheduleEvent]);

    const handleEventEnd = useCallback(() => {
        setActiveEvent(null);
        scheduleEvent();
    }, [scheduleEvent]);

    return {
        roomEvent: { activeEvent, onEventEnd: handleEventEnd } as RoomEventProps,
    };
}