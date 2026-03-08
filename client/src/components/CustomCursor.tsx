"use client";

/**
 * CustomCursor.tsx
 * ─────────────────────────────────────────
 * Drop-in custom cursor pakai Framer Motion.
 * Taruh di layout.tsx:
 *
 *   import CustomCursor from "@/components/CustomCursor";
 *   // di dalam body, sebelum </ThemeProvider>:
 *   <CustomCursor />
 *
 * Tambah juga di globals.css:
 *   * { cursor: none !important; }
 */

import { useEffect, useRef, useState } from "react";
import { motion, useMotionValue, useSpring } from "framer-motion";

type CursorVariant = "default" | "hover" | "click" | "text";

export default function CustomCursor() {
    // ── Hanya show di non-touch device ──────────────────────────
    const [visible, setVisible] = useState(false);
    const [variant, setVariant] = useState<CursorVariant>("default");

    // Raw mouse position
    const rawX = useMotionValue(-200);
    const rawY = useMotionValue(-200);

    // ── DOT: sangat responsif, hampir instant ───────────────────
    const dotX = useSpring(rawX, { stiffness: 1000, damping: 50, mass: 0.1 });
    const dotY = useSpring(rawY, { stiffness: 1000, damping: 50, mass: 0.1 });

    // ── RING: lebih lambat → efek "mengalir" / trailing ─────────
    const ringX = useSpring(rawX, { stiffness: 150, damping: 22, mass: 0.6 });
    const ringY = useSpring(rawY, { stiffness: 150, damping: 22, mass: 0.6 });

    // ── AURA: paling lambat, paling dreamy ──────────────────────
    const auraX = useSpring(rawX, { stiffness: 60, damping: 18, mass: 1.2 });
    const auraY = useSpring(rawY, { stiffness: 60, damping: 18, mass: 1.2 });

    const clickTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

    useEffect(() => {
        // Jangan show di touch device
        if (window.matchMedia("(pointer: coarse)").matches) return;
        setVisible(true);

        const onMove = (e: MouseEvent) => {
            rawX.set(e.clientX);
            rawY.set(e.clientY);
        };

        const onDown = () => {
            setVariant("click");
            if (clickTimer.current) clearTimeout(clickTimer.current);
        };

        const onUp = () => {
            clickTimer.current = setTimeout(() => setVariant("default"), 150);
        };

        const onEnterInteractive = (e: MouseEvent) => {
            const el = e.target as HTMLElement;
            const tag = el.tagName.toLowerCase();
            const role = el.getAttribute("role");
            const isText = ["input", "textarea"].includes(tag);
            const isClickable =
                tag === "button" ||
                tag === "a" ||
                role === "button" ||
                el.style.cursor === "pointer" ||
                el.closest("button, a, [role=button]");

            if (isText) setVariant("text");
            else if (isClickable) setVariant("hover");
        };

        const onLeaveInteractive = () => setVariant("default");

        window.addEventListener("mousemove", onMove);
        window.addEventListener("mousedown", onDown);
        window.addEventListener("mouseup", onUp);
        window.addEventListener("mouseover", onEnterInteractive);
        window.addEventListener("mouseout", onLeaveInteractive);

        return () => {
            window.removeEventListener("mousemove", onMove);
            window.removeEventListener("mousedown", onDown);
            window.removeEventListener("mouseup", onUp);
            window.removeEventListener("mouseover", onEnterInteractive);
            window.removeEventListener("mouseout", onLeaveInteractive);
            if (clickTimer.current) clearTimeout(clickTimer.current);
        };
    }, []); // eslint-disable-line

    if (!visible) return null;

    return (
        <>
            {/* ── AURA — paling luar, paling lambat, glow dreamy ── */}
            <motion.div
                className="pointer-events-none fixed top-0 left-0 z-[9997] rounded-full mix-blend-screen"
                style={{
                    x: auraX,
                    y: auraY,
                    translateX: "-50%",
                    translateY: "-50%",
                }}
                animate={{
                    width: variant === "hover" ? 90 : variant === "click" ? 40 : 64,
                    height: variant === "hover" ? 90 : variant === "click" ? 40 : 64,
                    opacity: variant === "click" ? 0.15 : 0.08,
                    background:
                        variant === "text"
                            ? "radial-gradient(circle, hsl(var(--primary)), transparent)"
                            : "radial-gradient(circle, hsl(var(--primary)), transparent)",
                }}
                transition={{ type: "spring", stiffness: 120, damping: 18 }}
            />

            {/* ── RING — circle outline dengan trailing effect ── */}
            <motion.div
                className="pointer-events-none fixed top-0 left-0 z-[9998] rounded-full border border-primary/40"
                style={{
                    x: ringX,
                    y: ringY,
                    translateX: "-50%",
                    translateY: "-50%",
                }}
                animate={{
                    width: variant === "hover" ? 52 : variant === "text" ? 4 : variant === "click" ? 20 : 36,
                    height: variant === "hover" ? 52 : variant === "text" ? 28 : variant === "click" ? 20 : 36,
                    borderRadius: variant === "text" ? "4px" : "50%",
                    opacity: variant === "click" ? 0.5 : 0.6,
                    borderColor:
                        variant === "hover"
                            ? "hsl(var(--primary))"
                            : variant === "text"
                                ? "hsl(var(--primary) / 0.8)"
                                : "hsl(var(--primary) / 0.4)",
                    scale: variant === "click" ? 0.7 : 1,
                }}
                transition={{ type: "spring", stiffness: 180, damping: 20 }}
            />

            {/* ── DOT — center dot, hampir instant ── */}
            <motion.div
                className="pointer-events-none fixed top-0 left-0 z-[9999] rounded-full bg-foreground"
                style={{
                    x: dotX,
                    y: dotY,
                    translateX: "-50%",
                    translateY: "-50%",
                }}
                animate={{
                    width: variant === "hover" ? 6 : variant === "click" ? 10 : variant === "text" ? 2 : 5,
                    height: variant === "hover" ? 6 : variant === "click" ? 10 : variant === "text" ? 20 : 5,
                    opacity: variant === "text" ? 0.9 : 1,
                    background:
                        variant === "hover" || variant === "click"
                            ? "hsl(var(--primary))"
                            : "hsl(var(--foreground))",
                    borderRadius: variant === "text" ? "2px" : "50%",
                    scale: variant === "click" ? 1.4 : 1,
                }}
                transition={{ type: "spring", stiffness: 600, damping: 30 }}
            />
        </>
    );
}