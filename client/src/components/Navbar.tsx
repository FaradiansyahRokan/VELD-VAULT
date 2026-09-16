"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { useRouter, usePathname } from "next/navigation";
import { useStore } from "@/lib/store";
import { useTheme } from "next-themes";
import { NETWORK_CONFIG } from "@/lib/constants";
import { motion, AnimatePresence } from "framer-motion";
import { toast } from "sonner";
import {
  LayoutDashboard,
  Shield,
  ShoppingBag,
  MessageSquare,
  Send,
  Wrench,
  Sun,
  Moon,
  Copy,
  Check,
  LogOut,
  Menu,
  X,
  Wallet,
  Coins,
  RefreshCw,
  ChevronDown,
} from "lucide-react";

const NAV_ITEMS = [
  { id: "dashboard", label: "Overview", href: "/dashboard", icon: LayoutDashboard },
  { id: "vault", label: "Vault", href: "/vault", icon: Shield },
  { id: "market", label: "Market", href: "/market", icon: ShoppingBag },
  { id: "messages", label: "Messages", href: "/messages", icon: MessageSquare },
  { id: "transfer", label: "Transfer", href: "/transfer", icon: Send },
  { id: "tools", label: "Tools", href: "/tools", icon: Wrench },
] as const;

// Fluid spring physics for continuous liquid curves
const islandMorphSpring = {
  type: "spring" as const,
  stiffness: 340,
  damping: 27,
  mass: 0.8,
};

const liquidTabSpring = {
  type: "spring" as const,
  stiffness: 440,
  damping: 32,
  mass: 0.7,
};

const microSpring = {
  type: "spring" as const,
  stiffness: 500,
  damping: 28,
};

// Fluid wave staggering for content reveal
const waveContainerVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      staggerChildren: 0.045,
      delayChildren: 0.05,
    },
  },
  exit: {
    opacity: 0,
    transition: {
      staggerChildren: 0.02,
      staggerDirection: -1,
    },
  },
};

const waveItemVariants = {
  hidden: { opacity: 0, y: 16, scale: 0.94 },
  visible: {
    opacity: 1,
    y: 0,
    scale: 1,
    transition: {
      type: "spring" as const,
      stiffness: 400,
      damping: 28,
      mass: 0.75,
    },
  },
  exit: {
    opacity: 0,
    y: -8,
    scale: 0.96,
    transition: { duration: 0.15 },
  },
};

type MobileIslandState = "compact" | "menu" | "account";

export default function Navbar() {
  const router = useRouter();
  const pathname = usePathname();
  const { wallet, balance, logout, refreshBalance } = useStore();
  const { theme, setTheme } = useTheme();

  const [copied, setCopied] = useState(false);
  const [mounted, setMounted] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [hoveredTab, setHoveredTab] = useState<string | null>(null);

  // Desktop dropdown state
  const [desktopAccountOpen, setDesktopAccountOpen] = useState(false);

  // Mobile Dynamic Island expansion state: "compact" | "menu" | "account"
  const [mobileState, setMobileState] = useState<MobileIslandState>("compact");

  const desktopIslandRef = useRef<HTMLDivElement>(null);
  const mobileIslandRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setMounted(true);
  }, []);

  // Close menus on outside click or Escape
  useEffect(() => {
    const handleOutside = (e: MouseEvent) => {
      if (
        desktopIslandRef.current &&
        !desktopIslandRef.current.contains(e.target as Node)
      ) {
        setDesktopAccountOpen(false);
      }
      if (
        mobileIslandRef.current &&
        !mobileIslandRef.current.contains(e.target as Node)
      ) {
        setMobileState("compact");
      }
    };
    const handleEsc = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        setDesktopAccountOpen(false);
        setMobileState("compact");
      }
    };
    window.addEventListener("mousedown", handleOutside);
    window.addEventListener("keydown", handleEsc);
    return () => {
      window.removeEventListener("mousedown", handleOutside);
      window.removeEventListener("keydown", handleEsc);
    };
  }, []);

  // Close mobile island on route change
  useEffect(() => {
    setMobileState("compact");
    setDesktopAccountOpen(false);
  }, [pathname]);

  const isAuthPage = pathname === "/" || pathname === "/login";

  const handleCopy = useCallback(() => {
    if (!wallet?.address) return;
    navigator.clipboard.writeText(wallet.address);
    setCopied(true);
    toast.success("Address copied to clipboard!");
    setTimeout(() => setCopied(false), 2000);
  }, [wallet?.address]);

  const handleRefreshBalance = useCallback(async () => {
    setRefreshing(true);
    try {
      await refreshBalance();
      toast.success("Balance updated");
    } catch {
      // silent
    }
    setTimeout(() => setRefreshing(false), 750);
  }, [refreshBalance]);

  if (!mounted) return null;

  return (
    <header className="w-full pt-3.5 pb-2 px-3 md:px-4 flex justify-center">
      {/* ============================================================ */}
      {/* ── 1. DESKTOP DYNAMIC ISLAND (md and up)                     */}
      {/* ============================================================ */}
      <div
        ref={desktopIslandRef}
        className="hidden md:flex relative max-w-5xl w-full justify-center"
      >
        <motion.nav
          className="relative w-full rounded-full px-3 py-1.5 flex items-center justify-between select-none dynamic-island-dropdown"
        >
          {/* Subtle Top Specular Curve Highlight */}
          <div className="pointer-events-none absolute inset-x-8 top-0 h-[1px] bg-gradient-to-r from-transparent via-white/90 dark:via-white/25 to-transparent z-0" />

          {/* Left: Brand Logo */}
          <motion.div
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.97 }}
            transition={microSpring}
            onClick={() => router.push(wallet ? "/dashboard" : "/")}
            className="flex items-center gap-2.5 cursor-pointer pl-1 shrink-0 z-10"
          >
            <div className="relative w-8 h-8 rounded-[12px] bg-primary flex items-center justify-center text-primary-foreground shadow-sm overflow-hidden">
              <Shield size={16} className="stroke-[2.2] relative z-10" />
              <div className="absolute inset-0 bg-gradient-to-tr from-white/0 via-white/30 to-white/0 animate-pulse" />
            </div>
            <span className="text-[14px] font-bold tracking-tight text-foreground">
              CipherVault
            </span>
          </motion.div>

          {/* Center: Fluid Viscous Tab Bar */}
          {!isAuthPage && (
            <div
              className="flex items-center gap-0.5 p-[3px] rounded-full border border-black/[0.06] dark:border-white/[0.08] bg-black/[0.02] dark:bg-white/[0.03] z-10"
              onMouseLeave={() => setHoveredTab(null)}
            >
              {NAV_ITEMS.map((item) => {
                const Icon = item.icon;
                const isActive = pathname === item.href;
                const isHovered = hoveredTab === item.id;

                return (
                  <button
                    key={item.id}
                    onClick={() => router.push(item.href)}
                    onMouseEnter={() => setHoveredTab(item.id)}
                    className="relative px-3.5 py-1.5 rounded-full text-[11.5px] font-semibold flex items-center gap-1.5 transition-colors cursor-pointer select-none"
                    style={{
                      color: isActive
                        ? "var(--nav-active-text)"
                        : isHovered
                        ? "var(--foreground)"
                        : "var(--nav-inactive-text)",
                    }}
                  >
                    {/* Active Fluid Mercury Indicator */}
                    {isActive && (
                      <motion.div
                        layoutId="desktopActivePill"
                        transition={liquidTabSpring}
                        className="absolute inset-0 rounded-full z-0"
                        style={{
                          background: "var(--nav-pill-bg)",
                          border: "1px solid var(--nav-pill-border)",
                          borderBottom: "1px solid var(--nav-pill-border-bottom)",
                          boxShadow:
                            "inset 0 1px 1px var(--nav-pill-highlight), 0 2px 8px -1px rgba(27, 44, 193, 0.3)",
                        }}
                      />
                    )}

                    {/* Smooth Hover Light Follower */}
                    {isHovered && !isActive && (
                      <motion.div
                        layoutId="desktopHoverPill"
                        transition={liquidTabSpring}
                        className="absolute inset-0 rounded-full z-0 bg-black/[0.05] dark:bg-white/[0.08] border border-black/[0.04] dark:border-white/[0.06]"
                      />
                    )}

                    <span className="relative z-10 flex items-center gap-1.5">
                      <Icon
                        size={13.5}
                        className={isActive ? "opacity-100" : "opacity-75"}
                      />
                      <span>{item.label}</span>
                    </span>
                  </button>
                );
              })}
            </div>
          )}

          {/* Right: Balance Pill & Controls */}
          <div className="flex items-center gap-1.5 shrink-0 z-10">
            {wallet ? (
              <motion.button
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.97 }}
                transition={microSpring}
                onClick={() => setDesktopAccountOpen(!desktopAccountOpen)}
                title="Account details"
                className="flex items-center gap-1.5 pl-3 pr-2.5 py-1.5 rounded-full text-xs font-semibold cursor-pointer select-none transition-all"
                style={{
                  background: desktopAccountOpen
                    ? "var(--muted)"
                    : "var(--balance-bg)",
                  border: "1px solid var(--balance-border)",
                  color: "var(--balance-text)",
                }}
              >
                <Coins size={13} className="opacity-80" />
                <span className="font-semibold text-[11.5px] tabular-nums">
                  {Number(balance || 0).toLocaleString(undefined, {
                    maximumFractionDigits: 2,
                  })}{" "}
                  {NETWORK_CONFIG.tokenSymbol}
                </span>
                <motion.div
                  animate={{ rotate: desktopAccountOpen ? 180 : 0 }}
                  transition={{ duration: 0.25 }}
                  className="opacity-60"
                >
                  <ChevronDown size={12} />
                </motion.div>
              </motion.button>
            ) : (
              <motion.button
                whileHover={{ scale: 1.04 }}
                whileTap={{ scale: 0.96 }}
                transition={microSpring}
                onClick={() => router.push("/")}
                className="btn-enterprise-primary flex items-center gap-1.5 px-3.5 py-1.5 rounded-full text-[11px] font-semibold cursor-pointer"
              >
                <Wallet size={13} />
                <span>Connect</span>
              </motion.button>
            )}

            {/* Theme Toggle */}
            <motion.button
              whileHover={{ scale: 1.08, rotate: 12 }}
              whileTap={{ scale: 0.92, rotate: -12 }}
              transition={microSpring}
              onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
              aria-label="Toggle theme"
              className="w-7 h-7 rounded-full flex items-center justify-center text-muted-foreground hover:text-foreground transition-colors cursor-pointer border border-black/[0.06] dark:border-white/[0.08] bg-black/[0.02] dark:bg-white/[0.04]"
            >
              <AnimatePresence mode="wait" initial={false}>
                <motion.div
                  key={theme}
                  initial={{ scale: 0.5, opacity: 0, rotate: -90 }}
                  animate={{ scale: 1, opacity: 1, rotate: 0 }}
                  exit={{ scale: 0.5, opacity: 0, rotate: 90 }}
                  transition={{ duration: 0.2 }}
                >
                  {theme === "dark" ? <Sun size={13} /> : <Moon size={13} />}
                </motion.div>
              </AnimatePresence>
            </motion.button>
          </div>
        </motion.nav>

        {/* Desktop Account HUD Dropdown (Solid, Not Transparent, Wave Animated) */}
        <AnimatePresence>
          {desktopAccountOpen && wallet && (
            <motion.div
              initial={{ opacity: 0, y: -12, scale: 0.95 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: -12, scale: 0.95 }}
              transition={islandMorphSpring}
              className="absolute top-[calc(100%+8px)] right-0 w-[295px] rounded-[26px] p-4 dynamic-island-dropdown z-50 overflow-hidden"
            >
              <motion.div
                variants={waveContainerVariants}
                initial="hidden"
                animate="visible"
                exit="exit"
                className="space-y-3"
              >
                {/* Header Item */}
                <motion.div
                  variants={waveItemVariants}
                  className="flex items-center justify-between pb-3 border-b border-border/50"
                >
                  <div className="flex items-center gap-2.5">
                    <div className="w-8 h-8 rounded-xl bg-gradient-to-tr from-[#1B2CC1] to-[#7692FF] flex items-center justify-center text-white text-[11px] font-bold shadow-sm">
                      {wallet.address.slice(2, 4).toUpperCase()}
                    </div>
                    <div className="flex flex-col">
                      <span className="text-xs font-bold text-foreground">
                        Connected Wallet
                      </span>
                      <span className="text-[10px] text-muted-foreground font-mono">
                        {wallet.address.slice(0, 6)}...{wallet.address.slice(-4)}
                      </span>
                    </div>
                  </div>

                  <button
                    onClick={handleCopy}
                    title="Copy address"
                    className="p-1.5 rounded-lg bg-black/[0.04] dark:bg-white/[0.08] hover:bg-black/[0.08] dark:hover:bg-white/[0.15] text-foreground transition-colors cursor-pointer"
                  >
                    {copied ? (
                      <Check size={13} className="text-emerald-500" />
                    ) : (
                      <Copy size={13} />
                    )}
                  </button>
                </motion.div>

                {/* Balance Card Item */}
                <motion.div
                  variants={waveItemVariants}
                  className="p-3 rounded-2xl bg-black/[0.03] dark:bg-white/[0.04] border border-border/40"
                >
                  <span className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider block mb-1">
                    Available Balance
                  </span>
                  <div className="flex items-baseline gap-1.5">
                    <span className="text-xl font-bold text-foreground tabular-nums">
                      {Number(balance || 0).toLocaleString(undefined, {
                        minimumFractionDigits: 2,
                        maximumFractionDigits: 4,
                      })}
                    </span>
                    <span className="text-xs font-semibold text-[#1B2CC1] dark:text-[#ABD2FA]">
                      {NETWORK_CONFIG.tokenSymbol}
                    </span>
                  </div>
                </motion.div>

                {/* Actions Item */}
                <motion.div
                  variants={waveItemVariants}
                  className="grid grid-cols-2 gap-2 pt-1"
                >
                  <button
                    onClick={handleRefreshBalance}
                    disabled={refreshing}
                    className="py-2 px-3 rounded-xl bg-black/[0.03] dark:bg-white/[0.05] hover:bg-black/[0.06] dark:hover:bg-white/[0.1] text-foreground text-[11px] font-semibold flex items-center justify-center gap-1.5 cursor-pointer transition-colors"
                  >
                    <RefreshCw
                      size={12}
                      className={refreshing ? "animate-spin text-primary" : ""}
                    />
                    <span>Refresh</span>
                  </button>

                  <button
                    onClick={() => {
                      setDesktopAccountOpen(false);
                      router.push("/transfer");
                    }}
                    className="py-2 px-3 rounded-xl btn-enterprise-primary text-primary-foreground text-[11px] font-semibold flex items-center justify-center gap-1.5 cursor-pointer"
                  >
                    <Send size={12} />
                    <span>Transfer</span>
                  </button>
                </motion.div>

                {/* Disconnect Item */}
                <motion.div variants={waveItemVariants}>
                  <button
                    onClick={() => {
                      setDesktopAccountOpen(false);
                      logout();
                      router.push("/");
                      toast.success("Disconnected wallet");
                    }}
                    className="w-full py-1.5 rounded-xl hover:bg-red-500/10 text-red-500 text-[11px] font-semibold flex items-center justify-center gap-1.5 cursor-pointer transition-colors"
                  >
                    <LogOut size={12} />
                    <span>Disconnect Wallet</span>
                  </button>
                </motion.div>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* ============================================================ */}
      {/* ── 2. MOBILE DYNAMIC ISLAND (Phones & Small Tablets)         */}
      {/* ── Morphing, Solid, Fluid Continuous Curved Island           */}
      {/* ============================================================ */}
      <div
        ref={mobileIslandRef}
        className="md:hidden relative w-full max-w-md mx-auto flex flex-col items-center"
      >
        <motion.nav
          layout
          transition={islandMorphSpring}
          className={`w-full overflow-hidden select-none dynamic-island-dropdown transition-all ${
            mobileState === "compact"
              ? "rounded-full py-1.5 px-3"
              : "rounded-[32px] p-4 shadow-2xl"
          }`}
        >
          {/* Subtle Top Specular Curve Highlight */}
          <div className="pointer-events-none absolute inset-x-6 top-0 h-[1px] bg-gradient-to-r from-transparent via-white/90 dark:via-white/25 to-transparent z-0" />

          {/* ── Always Visible Anchored Header Bar ── */}
          <motion.div
            layout="position"
            className="flex items-center justify-between w-full gap-2 relative z-10"
          >
            {/* Left: Brand Logo */}
            <div
              onClick={() => {
                setMobileState("compact");
                router.push(wallet ? "/dashboard" : "/");
              }}
              className="flex items-center gap-2 cursor-pointer select-none shrink-0"
            >
              <div className="w-7 h-7 rounded-[10px] bg-primary flex items-center justify-center text-primary-foreground shadow-sm">
                <Shield size={14} className="stroke-[2.2]" />
              </div>
              <span className="text-[13px] font-bold tracking-tight text-foreground">
                CipherVault
              </span>
            </div>

            {/* Right: Controls & Dynamic Island Morph Triggers */}
            <div className="flex items-center gap-1.5 shrink-0">
              {wallet ? (
                /* Compact Balance Pill (Tap morphs island to Account mode) */
                <motion.button
                  whileTap={{ scale: 0.94 }}
                  transition={microSpring}
                  onClick={() =>
                    setMobileState(mobileState === "account" ? "compact" : "account")
                  }
                  className={`flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-semibold cursor-pointer transition-colors ${
                    mobileState === "account"
                      ? "bg-primary text-primary-foreground"
                      : "bg-black/[0.04] dark:bg-white/[0.06] text-foreground"
                  }`}
                >
                  <Coins size={12} />
                  <span className="tabular-nums font-mono">
                    {Number(balance || 0).toLocaleString(undefined, {
                      maximumFractionDigits: 1,
                    })}
                  </span>
                </motion.button>
              ) : (
                <button
                  onClick={() => router.push("/")}
                  className="btn-enterprise-primary px-3 py-1 rounded-full text-[10.5px] font-semibold"
                >
                  Connect
                </button>
              )}

              {/* Theme Switcher */}
              <button
                onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
                aria-label="Toggle theme"
                className="w-7 h-7 rounded-full flex items-center justify-center text-muted-foreground hover:text-foreground border border-black/[0.06] dark:border-white/[0.08] bg-black/[0.02] dark:bg-white/[0.04]"
              >
                {theme === "dark" ? <Sun size={12} /> : <Moon size={12} />}
              </button>

              {/* Dynamic Island Menu Trigger (Morphs island to Menu mode) */}
              {!isAuthPage && (
                <motion.button
                  whileTap={{ scale: 0.88 }}
                  transition={microSpring}
                  onClick={() =>
                    setMobileState(mobileState === "menu" ? "compact" : "menu")
                  }
                  className={`p-1.5 rounded-full cursor-pointer transition-colors ${
                    mobileState === "menu"
                      ? "bg-primary text-primary-foreground"
                      : "text-foreground bg-black/[0.04] dark:bg-white/[0.06]"
                  }`}
                >
                  {mobileState !== "compact" ? <X size={15} /> : <Menu size={15} />}
                </motion.button>
              )}
            </div>
          </motion.div>

          {/* ── MORPHED EXPANDED BODY (Wave Animated, Solid, Fluid) ── */}
          <AnimatePresence mode="wait">
            {/* VIEW A: Mobile Navigation Menu */}
            {mobileState === "menu" && !isAuthPage && (
              <motion.div
                key="mobile-menu"
                variants={waveContainerVariants}
                initial="hidden"
                animate="visible"
                exit="exit"
                className="pt-4 mt-3 border-t border-border/40 space-y-3"
              >
                {/* Dynamic Grabber Curve */}
                <motion.div
                  variants={waveItemVariants}
                  className="w-10 h-1 rounded-full bg-muted-foreground/20 mx-auto -mt-1 mb-2"
                />

                {/* Balance Status Banner */}
                {wallet && (
                  <motion.div
                    variants={waveItemVariants}
                    className="flex items-center justify-between p-3 rounded-2xl bg-black/[0.03] dark:bg-white/[0.04] border border-border/40"
                  >
                    <div className="flex items-center gap-2 text-foreground font-semibold text-xs">
                      <Coins size={14} className="text-primary" />
                      <span>Balance:</span>
                    </div>
                    <span className="font-bold text-sm text-primary tabular-nums">
                      {Number(balance || 0).toLocaleString()}{" "}
                      {NETWORK_CONFIG.tokenSymbol}
                    </span>
                  </motion.div>
                )}

                {/* Navigation Items Wave Grid */}
                <div className="grid grid-cols-2 gap-2">
                  {NAV_ITEMS.map((item) => {
                    const Icon = item.icon;
                    const isActive = pathname === item.href;
                    return (
                      <motion.button
                        key={item.id}
                        variants={waveItemVariants}
                        whileTap={{ scale: 0.95 }}
                        onClick={() => {
                          router.push(item.href);
                          setMobileState("compact");
                        }}
                        className={`flex items-center gap-2.5 p-3 rounded-2xl text-xs font-semibold transition-all cursor-pointer ${
                          isActive
                            ? "btn-enterprise-primary shadow-sm"
                            : "bg-black/[0.02] dark:bg-white/[0.04] text-foreground hover:bg-black/[0.05] dark:hover:bg-white/[0.08] border border-border/40"
                        }`}
                      >
                        <Icon size={16} />
                        <span>{item.label}</span>
                      </motion.button>
                    );
                  })}
                </div>

                {/* Bottom Quick Action */}
                {wallet && (
                  <motion.div variants={waveItemVariants} className="pt-1">
                    <button
                      onClick={() => {
                        setMobileState("compact");
                        logout();
                        router.push("/");
                        toast.success("Disconnected wallet");
                      }}
                      className="w-full py-2 rounded-xl text-red-500 hover:bg-red-500/10 text-xs font-semibold flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
                    >
                      <LogOut size={13} />
                      <span>Disconnect Wallet</span>
                    </button>
                  </motion.div>
                )}
              </motion.div>
            )}

            {/* VIEW B: Mobile Account & Balance View */}
            {mobileState === "account" && wallet && (
              <motion.div
                key="mobile-account"
                variants={waveContainerVariants}
                initial="hidden"
                animate="visible"
                exit="exit"
                className="pt-4 mt-3 border-t border-border/40 space-y-3"
              >
                {/* Dynamic Grabber Curve */}
                <motion.div
                  variants={waveItemVariants}
                  className="w-10 h-1 rounded-full bg-muted-foreground/20 mx-auto -mt-1 mb-2"
                />

                {/* Identity Header */}
                <motion.div
                  variants={waveItemVariants}
                  className="flex items-center justify-between p-3 rounded-2xl bg-black/[0.03] dark:bg-white/[0.04] border border-border/40"
                >
                  <div className="flex items-center gap-2.5">
                    <div className="w-8 h-8 rounded-xl bg-gradient-to-tr from-[#1B2CC1] to-[#7692FF] flex items-center justify-center text-white text-[11px] font-bold">
                      {wallet.address.slice(2, 4).toUpperCase()}
                    </div>
                    <div className="flex flex-col">
                      <span className="text-xs font-bold text-foreground">
                        Wallet Address
                      </span>
                      <span className="text-[10.5px] text-muted-foreground font-mono">
                        {wallet.address.slice(0, 8)}...{wallet.address.slice(-6)}
                      </span>
                    </div>
                  </div>

                  <button
                    onClick={handleCopy}
                    className="p-2 rounded-xl bg-black/[0.04] dark:bg-white/[0.08] text-foreground cursor-pointer"
                  >
                    {copied ? (
                      <Check size={14} className="text-emerald-500" />
                    ) : (
                      <Copy size={14} />
                    )}
                  </button>
                </motion.div>

                {/* Large Balance Display */}
                <motion.div
                  variants={waveItemVariants}
                  className="p-4 rounded-2xl bg-black/[0.03] dark:bg-white/[0.04] border border-border/40 text-center"
                >
                  <span className="text-[10px] uppercase font-bold text-muted-foreground tracking-wider block mb-1">
                    Total Available
                  </span>
                  <div className="flex items-baseline justify-center gap-1.5">
                    <span className="text-2xl font-extrabold text-foreground tabular-nums">
                      {Number(balance || 0).toLocaleString(undefined, {
                        minimumFractionDigits: 2,
                        maximumFractionDigits: 4,
                      })}
                    </span>
                    <span className="text-sm font-bold text-primary">
                      {NETWORK_CONFIG.tokenSymbol}
                    </span>
                  </div>
                </motion.div>

                {/* Actions Grid */}
                <motion.div
                  variants={waveItemVariants}
                  className="grid grid-cols-2 gap-2 pt-1"
                >
                  <button
                    onClick={handleRefreshBalance}
                    disabled={refreshing}
                    className="py-2.5 px-3 rounded-xl bg-black/[0.03] dark:bg-white/[0.06] hover:bg-black/[0.06] dark:hover:bg-white/[0.1] text-foreground text-xs font-semibold flex items-center justify-center gap-1.5 cursor-pointer transition-colors"
                  >
                    <RefreshCw
                      size={13}
                      className={refreshing ? "animate-spin text-primary" : ""}
                    />
                    <span>Refresh</span>
                  </button>

                  <button
                    onClick={() => {
                      setMobileState("compact");
                      router.push("/transfer");
                    }}
                    className="py-2.5 px-3 rounded-xl btn-enterprise-primary text-primary-foreground text-xs font-semibold flex items-center justify-center gap-1.5 cursor-pointer"
                  >
                    <Send size={13} />
                    <span>Transfer</span>
                  </button>
                </motion.div>
              </motion.div>
            )}
          </AnimatePresence>
        </motion.nav>
      </div>
    </header>
  );
}