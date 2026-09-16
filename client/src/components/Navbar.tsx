"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { useRouter, usePathname } from "next/navigation";
import { useStore } from "@/lib/store";
import { useTheme } from "next-themes";
import { NETWORK_CONFIG } from "@/lib/constants";
import { motion, AnimatePresence } from "framer-motion";
import { toast } from "sonner";
import { copyToClipboard } from "@/lib/clipboard";
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
  Key,
  Eye,
  EyeOff,
} from "lucide-react";

const NAV_ITEMS = [
  { id: "dashboard", label: "Overview", href: "/dashboard", icon: LayoutDashboard },
  { id: "vault", label: "Vault", href: "/vault", icon: Shield },
  { id: "market", label: "Market", href: "/market", icon: ShoppingBag },
  { id: "messages", label: "Messages", href: "/messages", icon: MessageSquare },
  { id: "transfer", label: "Transfer", href: "/transfer", icon: Send },
  { id: "tools", label: "Tools", href: "/tools", icon: Wrench },
] as const;

// ── Ultra-smooth Spring Physics for 60/120fps fluid curves ──
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

const mobileExpandSpring = {
  type: "spring" as const,
  stiffness: 360,
  damping: 32,
  mass: 0.7,
};

// ── Fluid Wave Staggering (Wave-like entry) ──
const waveContainerVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      staggerChildren: 0.035,
      delayChildren: 0.03,
    },
  },
  exit: {
    opacity: 0,
    transition: {
      duration: 0.12,
    },
  },
};

const waveItemVariants = {
  hidden: { opacity: 0, y: 12, scale: 0.96 },
  visible: {
    opacity: 1,
    y: 0,
    scale: 1,
    transition: {
      type: "spring" as const,
      stiffness: 420,
      damping: 28,
      mass: 0.7,
    },
  },
  exit: {
    opacity: 0,
    y: -6,
    scale: 0.98,
    transition: { duration: 0.1 },
  },
};

type MobileIslandState = "compact" | "menu" | "account";

export default function Navbar() {
  const router = useRouter();
  const pathname = usePathname();
  const { wallet, balance, logout, refreshBalance } = useStore();
  const { theme, setTheme } = useTheme();

  const [copied, setCopied] = useState(false);
  const [copiedKey, setCopiedKey] = useState(false);
  const [showPrivateKey, setShowPrivateKey] = useState(false);
  const [mounted, setMounted] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [hoveredTab, setHoveredTab] = useState<string | null>(null);

  // Desktop dropdown state
  const [desktopAccountOpen, setDesktopAccountOpen] = useState(false);

  // Mobile Dynamic Island state
  const [mobileState, setMobileState] = useState<MobileIslandState>("compact");

  const desktopIslandRef = useRef<HTMLDivElement>(null);
  const mobileIslandRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setMounted(true);
  }, []);

  // Close menus on outside click or Escape key
  useEffect(() => {
    const handleOutside = (e: MouseEvent) => {
      if (
        desktopIslandRef.current &&
        !desktopIslandRef.current.contains(e.target as Node)
      ) {
        setDesktopAccountOpen(false);
        setShowPrivateKey(false);
      }
      if (
        mobileIslandRef.current &&
        !mobileIslandRef.current.contains(e.target as Node)
      ) {
        setMobileState("compact");
        setShowPrivateKey(false);
      }
    };
    const handleEsc = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        setDesktopAccountOpen(false);
        setMobileState("compact");
        setShowPrivateKey(false);
      }
    };
    window.addEventListener("mousedown", handleOutside);
    window.addEventListener("keydown", handleEsc);
    return () => {
      window.removeEventListener("mousedown", handleOutside);
      window.removeEventListener("keydown", handleEsc);
    };
  }, []);

  // Reset state on route change
  useEffect(() => {
    setMobileState("compact");
    setDesktopAccountOpen(false);
    setShowPrivateKey(false);
  }, [pathname]);

  const isAuthPage = pathname === "/" || pathname === "/login";

  const handleCopy = useCallback(() => {
    if (!wallet?.address) return;
    copyToClipboard(wallet.address);
    setCopied(true);
    toast.success("Wallet address copied to clipboard!");
    setTimeout(() => setCopied(false), 2000);
  }, [wallet?.address]);

  const handleCopyPrivateKey = useCallback(() => {
    if (!wallet?.privateKey) return;
    copyToClipboard(wallet.privateKey);
    setCopiedKey(true);
    toast.success("Private key copied! Keep it secret.");
    setTimeout(() => setCopiedKey(false), 2000);
  }, [wallet?.privateKey]);

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
    <header className="w-full pt-3 pb-2 px-3 md:px-4 flex justify-center">
      {/* ============================================================ */}
      {/* ── 1. DESKTOP DYNAMIC ISLAND (md and up)                     */}
      {/* ============================================================ */}
      <div
        ref={desktopIslandRef}
        className="hidden md:flex relative max-w-5xl w-full justify-center"
      >
        <nav className="relative w-full rounded-full px-3 py-1.5 flex items-center justify-between select-none dynamic-island-dropdown">
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
                className="flex items-center gap-1.5 pl-3 pr-2.5 py-1.5 rounded-full text-xs font-semibold cursor-pointer select-none transition-colors"
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
                  transition={{ duration: 0.2 }}
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
                  transition={{ duration: 0.18 }}
                >
                  {theme === "dark" ? <Sun size={13} /> : <Moon size={13} />}
                </motion.div>
              </AnimatePresence>
            </motion.button>
          </div>
        </nav>

        {/* Desktop Account HUD Dropdown (Solid, Non-Transparent, Fluid Wave) */}
        <AnimatePresence>
          {desktopAccountOpen && wallet && (
            <motion.div
              initial={{ opacity: 0, y: -10, scale: 0.96 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: -10, scale: 0.96 }}
              transition={{
                type: "spring",
                stiffness: 380,
                damping: 28,
                mass: 0.75,
              }}
              className="absolute top-[calc(100%+8px)] right-0 w-[320px] rounded-[26px] p-4 dynamic-island-dropdown z-50 overflow-hidden"
            >
              <motion.div
                variants={waveContainerVariants}
                initial="hidden"
                animate="visible"
                exit="exit"
                className="space-y-3"
              >
                {/* 1. Address Header */}
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

                {/* 2. Available Balance Card */}
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

                {/* 3. Private Key Card with Show/Hide & Copy */}
                {wallet.privateKey && (
                  <motion.div
                    variants={waveItemVariants}
                    className="p-3 rounded-2xl bg-black/[0.03] dark:bg-white/[0.04] border border-border/40"
                  >
                    <div className="flex items-center justify-between mb-1.5">
                      <span className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider flex items-center gap-1.5">
                        <Key size={11} className="text-amber-500" /> Private Key
                      </span>
                      <div className="flex items-center gap-1">
                        <button
                          onClick={() => setShowPrivateKey(!showPrivateKey)}
                          className="p-1 rounded-lg hover:bg-black/[0.05] dark:hover:bg-white/[0.08] text-muted-foreground hover:text-foreground transition-colors cursor-pointer"
                          title={showPrivateKey ? "Hide Private Key" : "Reveal Private Key"}
                        >
                          {showPrivateKey ? <EyeOff size={13} /> : <Eye size={13} />}
                        </button>
                        {showPrivateKey && (
                          <button
                            onClick={handleCopyPrivateKey}
                            className="p-1 rounded-lg hover:bg-black/[0.05] dark:hover:bg-white/[0.08] text-muted-foreground hover:text-foreground transition-colors cursor-pointer"
                            title="Copy Private Key"
                          >
                            {copiedKey ? (
                              <Check size={13} className="text-emerald-500" />
                            ) : (
                              <Copy size={13} />
                            )}
                          </button>
                        )}
                      </div>
                    </div>

                    <div className="p-2 rounded-xl bg-black/[0.04] dark:bg-black/30 font-mono text-[10px] break-all select-all text-foreground/90 leading-relaxed">
                      {showPrivateKey ? (
                        wallet.privateKey
                      ) : (
                        <span className="tracking-widest text-muted-foreground select-none">
                          ••••••••••••••••••••••••••••••••••••••••••••••••••••
                        </span>
                      )}
                    </div>
                  </motion.div>
                )}

                {/* 4. Quick Actions */}
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
                      setShowPrivateKey(false);
                      router.push("/transfer");
                    }}
                    className="py-2 px-3 rounded-xl btn-enterprise-primary text-primary-foreground text-[11px] font-semibold flex items-center justify-center gap-1.5 cursor-pointer"
                  >
                    <Send size={12} />
                    <span>Transfer</span>
                  </button>
                </motion.div>

                {/* 5. Disconnect Button */}
                <motion.div variants={waveItemVariants}>
                  <button
                    onClick={() => {
                      setDesktopAccountOpen(false);
                      setShowPrivateKey(false);
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
      {/* ── Butter-Smooth Height Spring Morph, Continuous Curves, Solid*/}
      {/* ============================================================ */}
      <div
        ref={mobileIslandRef}
        className="md:hidden relative w-full max-w-md mx-auto flex flex-col items-center"
      >
        {/* Subtle backdrop overlay to close when tapped outside */}
        <AnimatePresence>
          {mobileState !== "compact" && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.2 }}
              onClick={() => {
                setMobileState("compact");
                setShowPrivateKey(false);
              }}
              className="fixed inset-0 z-40 bg-black/25 dark:bg-black/45"
            />
          )}
        </AnimatePresence>

        {/* ── Physical Morphing Island Container ── */}
        <motion.nav
          initial={false}
          animate={{
            borderRadius: mobileState === "compact" ? 9999 : 28,
          }}
          transition={{
            borderRadius: { duration: 0.25, ease: [0.32, 0.72, 0, 1] },
          }}
          className="relative w-full overflow-hidden select-none dynamic-island-dropdown z-50 shadow-xl"
          style={{ willChange: "transform, border-radius" }}
        >
          {/* Subtle Top Specular Curve Highlight */}
          <div className="pointer-events-none absolute inset-x-6 top-0 h-[1px] bg-gradient-to-r from-transparent via-white/90 dark:via-white/25 to-transparent z-10" />

          {/* ── Always Visible Anchored Header Bar ── */}
          <div className="flex items-center justify-between w-full gap-2 px-3 py-1.5 relative z-10">
            {/* Brand Logo */}
            <div
              onClick={() => {
                setMobileState("compact");
                setShowPrivateKey(false);
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

            {/* Right Controls & Island Triggers */}
            <div className="flex items-center gap-1.5 shrink-0">
              {wallet ? (
                /* Compact Balance Pill */
                <motion.button
                  whileTap={{ scale: 0.94 }}
                  transition={microSpring}
                  onClick={() => {
                    setShowPrivateKey(false);
                    setMobileState(
                      mobileState === "account" ? "compact" : "account"
                    );
                  }}
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

              {/* Dynamic Island Menu Trigger */}
              {!isAuthPage && (
                <motion.button
                  whileTap={{ scale: 0.88 }}
                  transition={microSpring}
                  onClick={() => {
                    setShowPrivateKey(false);
                    setMobileState(mobileState === "menu" ? "compact" : "menu");
                  }}
                  className={`p-1.5 rounded-full cursor-pointer transition-colors ${
                    mobileState === "menu"
                      ? "bg-primary text-primary-foreground"
                      : "text-foreground bg-black/[0.04] dark:bg-white/[0.06]"
                  }`}
                >
                  {mobileState !== "compact" ? (
                    <X size={15} />
                  ) : (
                    <Menu size={15} />
                  )}
                </motion.button>
              )}
            </div>
          </div>

          {/* ── Smooth Height Spring Morph Body (Zero Glitch / Patah) ── */}
          <AnimatePresence initial={false}>
            {mobileState !== "compact" && (
              <motion.div
                key="mobile-morph-wrapper"
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: "auto", opacity: 1 }}
                exit={{ height: 0, opacity: 0 }}
                transition={mobileExpandSpring}
                className="overflow-hidden px-3.5 pb-3.5 pt-1"
              >
                {/* Dynamic Island Grabber Bar */}
                <div className="w-9 h-1 rounded-full bg-muted-foreground/25 mx-auto mb-2.5" />

                {/* ── A. NAVIGATION MENU ── */}
                {mobileState === "menu" && !isAuthPage && (
                  <motion.div
                    variants={waveContainerVariants}
                    initial="hidden"
                    animate="visible"
                    exit="exit"
                    className="space-y-2.5"
                  >
                    {/* Balance Banner */}
                    {wallet && (
                      <motion.div
                        variants={waveItemVariants}
                        className="flex items-center justify-between p-2.5 rounded-2xl bg-black/[0.03] dark:bg-white/[0.04] border border-border/40"
                      >
                        <div className="flex items-center gap-2 text-foreground font-semibold text-xs">
                          <Coins size={14} className="text-primary" />
                          <span>Balance:</span>
                        </div>
                        <span className="font-bold text-xs text-primary tabular-nums">
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
                            className={`flex items-center gap-2.5 p-2.5 rounded-2xl text-xs font-semibold cursor-pointer ${
                              isActive
                                ? "btn-enterprise-primary shadow-sm"
                                : "bg-black/[0.02] dark:bg-white/[0.04] text-foreground hover:bg-black/[0.05] dark:hover:bg-white/[0.08] border border-border/40"
                            }`}
                          >
                            <Icon size={15} />
                            <span>{item.label}</span>
                          </motion.button>
                        );
                      })}
                    </div>

                    {/* Disconnect Button */}
                    {wallet && (
                      <motion.div variants={waveItemVariants} className="pt-0.5">
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

                {/* ── B. ACCOUNT & PRIVATE KEY VIEW ── */}
                {mobileState === "account" && wallet && (
                  <motion.div
                    variants={waveContainerVariants}
                    initial="hidden"
                    animate="visible"
                    exit="exit"
                    className="space-y-2.5"
                  >
                    {/* Identity: Address */}
                    <motion.div
                      variants={waveItemVariants}
                      className="flex items-center justify-between p-2.5 rounded-2xl bg-black/[0.03] dark:bg-white/[0.04] border border-border/40"
                    >
                      <div className="flex items-center gap-2.5">
                        <div className="w-8 h-8 rounded-xl bg-gradient-to-tr from-[#1B2CC1] to-[#7692FF] flex items-center justify-center text-white text-[11px] font-bold shadow-sm">
                          {wallet.address.slice(2, 4).toUpperCase()}
                        </div>
                        <div className="flex flex-col">
                          <span className="text-xs font-bold text-foreground">
                            Wallet Address
                          </span>
                          <span className="text-[10px] text-muted-foreground font-mono">
                            {wallet.address.slice(0, 8)}...{wallet.address.slice(-6)}
                          </span>
                        </div>
                      </div>

                      <button
                        onClick={handleCopy}
                        className="p-1.5 rounded-xl bg-black/[0.04] dark:bg-white/[0.08] text-foreground cursor-pointer"
                      >
                        {copied ? (
                          <Check size={13} className="text-emerald-500" />
                        ) : (
                          <Copy size={13} />
                        )}
                      </button>
                    </motion.div>

                    {/* Balance Display */}
                    <motion.div
                      variants={waveItemVariants}
                      className="p-3 rounded-2xl bg-black/[0.03] dark:bg-white/[0.04] border border-border/40 text-center"
                    >
                      <span className="text-[9.5px] uppercase font-bold text-muted-foreground tracking-wider block mb-0.5">
                        Total Available
                      </span>
                      <div className="flex items-baseline justify-center gap-1.5">
                        <span className="text-xl font-extrabold text-foreground tabular-nums">
                          {Number(balance || 0).toLocaleString(undefined, {
                            minimumFractionDigits: 2,
                            maximumFractionDigits: 4,
                          })}
                        </span>
                        <span className="text-xs font-bold text-primary">
                          {NETWORK_CONFIG.tokenSymbol}
                        </span>
                      </div>
                    </motion.div>

                    {/* Private Key Card */}
                    {wallet.privateKey && (
                      <motion.div
                        variants={waveItemVariants}
                        className="p-2.5 rounded-2xl bg-black/[0.03] dark:bg-white/[0.04] border border-border/40"
                      >
                        <div className="flex items-center justify-between mb-1">
                          <span className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider flex items-center gap-1.5">
                            <Key size={11} className="text-amber-500" /> Private Key
                          </span>
                          <div className="flex items-center gap-1">
                            <button
                              onClick={() => setShowPrivateKey(!showPrivateKey)}
                              className="p-1 rounded-lg hover:bg-black/[0.05] dark:hover:bg-white/[0.08] text-muted-foreground hover:text-foreground transition-colors cursor-pointer"
                              title={showPrivateKey ? "Hide Private Key" : "Reveal Private Key"}
                            >
                              {showPrivateKey ? <EyeOff size={13} /> : <Eye size={13} />}
                            </button>
                            {showPrivateKey && (
                              <button
                                onClick={handleCopyPrivateKey}
                                className="p-1 rounded-lg hover:bg-black/[0.05] dark:hover:bg-white/[0.08] text-muted-foreground hover:text-foreground transition-colors cursor-pointer"
                                title="Copy Private Key"
                              >
                                {copiedKey ? (
                                  <Check size={13} className="text-emerald-500" />
                                ) : (
                                  <Copy size={13} />
                                )}
                              </button>
                            )}
                          </div>
                        </div>

                        <div className="p-2 rounded-xl bg-black/[0.04] dark:bg-black/30 font-mono text-[9.5px] break-all select-all text-foreground/90 leading-relaxed">
                          {showPrivateKey ? (
                            wallet.privateKey
                          ) : (
                            <span className="tracking-widest text-muted-foreground select-none">
                              ••••••••••••••••••••••••••••••••••••••••••••••••••••
                            </span>
                          )}
                        </div>
                      </motion.div>
                    )}

                    {/* Action Buttons */}
                    <motion.div
                      variants={waveItemVariants}
                      className="grid grid-cols-2 gap-2 pt-0.5"
                    >
                      <button
                        onClick={handleRefreshBalance}
                        disabled={refreshing}
                        className="py-2 px-3 rounded-xl bg-black/[0.03] dark:bg-white/[0.06] hover:bg-black/[0.06] dark:hover:bg-white/[0.1] text-foreground text-xs font-semibold flex items-center justify-center gap-1.5 cursor-pointer transition-colors"
                      >
                        <RefreshCw
                          size={12}
                          className={refreshing ? "animate-spin text-primary" : ""}
                        />
                        <span>Refresh</span>
                      </button>

                      <button
                        onClick={() => {
                          setMobileState("compact");
                          setShowPrivateKey(false);
                          router.push("/transfer");
                        }}
                        className="py-2 px-3 rounded-xl btn-enterprise-primary text-primary-foreground text-xs font-semibold flex items-center justify-center gap-1.5 cursor-pointer"
                      >
                        <Send size={12} />
                        <span>Transfer</span>
                      </button>
                    </motion.div>

                    {/* Disconnect Button */}
                    <motion.div variants={waveItemVariants} className="pt-0.5">
                      <button
                        onClick={() => {
                          setMobileState("compact");
                          setShowPrivateKey(false);
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
                  </motion.div>
                )}
              </motion.div>
            )}
          </AnimatePresence>
        </motion.nav>
      </div>
    </header>
  );
}