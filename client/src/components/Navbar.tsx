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

// Custom organic spring physics for liquid flow
const liquidSpring = { type: "spring" as const, stiffness: 450, damping: 32, mass: 0.7 };
const hudSpring = { type: "spring" as const, stiffness: 400, damping: 30, mass: 0.8 };
const microSpring = { type: "spring" as const, stiffness: 500, damping: 30 };

export default function Navbar() {
  const router = useRouter();
  const pathname = usePathname();
  const { wallet, balance, logout, refreshBalance } = useStore();
  const { theme, setTheme } = useTheme();

  const [copied, setCopied] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [hudOpen, setHudOpen] = useState(false);
  const [mounted, setMounted] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [hoveredTab, setHoveredTab] = useState<string | null>(null);

  // Mouse coordinates relative to the island for the caustic light refraction wave
  const [mousePos, setMousePos] = useState({ x: 0, y: 0, opacity: 0 });
  const islandRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setMounted(true);
  }, []);

  // Close HUD on outside click or Esc
  useEffect(() => {
    const handleOutside = (e: MouseEvent) => {
      if (islandRef.current && !islandRef.current.contains(e.target as Node)) {
        setHudOpen(false);
      }
    };
    const handleEsc = (e: KeyboardEvent) => {
      if (e.key === "Escape") setHudOpen(false);
    };
    window.addEventListener("mousedown", handleOutside);
    window.addEventListener("keydown", handleEsc);
    return () => {
      window.removeEventListener("mousedown", handleOutside);
      window.removeEventListener("keydown", handleEsc);
    };
  }, []);

  const isAuthPage = pathname === "/" || pathname === "/login";

  const handleCopy = useCallback(() => {
    if (!wallet?.address) return;
    navigator.clipboard.writeText(wallet.address);
    setCopied(true);
    toast.success("Wallet address copied to clipboard!");
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

  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!islandRef.current) return;
    const rect = islandRef.current.getBoundingClientRect();
    setMousePos({
      x: e.clientX - rect.left,
      y: e.clientY - rect.top,
      opacity: 1,
    });
  };

  const handleMouseLeave = () => {
    setMousePos((prev) => ({ ...prev, opacity: 0 }));
    setHoveredTab(null);
  };

  if (!mounted) return null;

  return (
    <header className="w-full pt-3.5 pb-2 px-4 flex justify-center">
      <div ref={islandRef} className="relative max-w-5xl w-full flex justify-center">
        {/* ── Main Dynamic Island Capsule ── */}
        <motion.nav
          onMouseMove={handleMouseMove}
          onMouseLeave={handleMouseLeave}
          className="relative w-full rounded-full px-3 py-1.5 flex items-center justify-between overflow-hidden select-none"
          style={{
            background: "var(--island-bg)",
            backdropFilter: "blur(36px) saturate(190%)",
            WebkitBackdropFilter: "blur(36px) saturate(190%)",
            border: "1px solid var(--island-border)",
            borderBottom: "1px solid var(--island-border-bottom)",
            boxShadow:
              "inset 0 1px 1px var(--island-highlight), inset 0 0 0 1px var(--island-inner-ring), 0 16px 36px -12px rgba(9, 21, 64, 0.12)",
          }}
        >
          {/* ── Interactive Caustic Specular Wave (Light Refraction) ── */}
          <div
            className="pointer-events-none absolute inset-0 z-0 transition-opacity duration-500 rounded-full"
            style={{
              opacity: mousePos.opacity,
              background: `radial-gradient(220px circle at ${mousePos.x}px ${mousePos.y}px, rgba(118, 146, 255, 0.22), transparent 75%)`,
            }}
          />

          {/* ── Subtle Top Prism Highlight ── */}
          <div className="pointer-events-none absolute inset-x-8 top-0 h-[1px] bg-gradient-to-r from-transparent via-white/80 dark:via-white/30 to-transparent z-0" />

          {/* ── Content Row ── */}
          <div className="relative z-10 flex items-center justify-between w-full gap-2 md:gap-4">
            
            {/* 1. LEFT: Brand & Identity */}
            <motion.div
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.97 }}
              transition={microSpring}
              onClick={() => router.push(wallet ? "/dashboard" : "/")}
              className="flex items-center gap-2.5 cursor-pointer pl-1 shrink-0"
            >
              <div className="relative w-8 h-8 rounded-[12px] bg-primary flex items-center justify-center text-primary-foreground shadow-sm overflow-hidden">
                <Shield size={16} className="stroke-[2.2] relative z-10" />
                <div className="absolute inset-0 bg-gradient-to-tr from-white/0 via-white/30 to-white/0 animate-pulse" />
              </div>

              <span className="text-[14px] font-bold tracking-tight text-foreground">
                CipherVault
              </span>
            </motion.div>

            {/* 2. CENTER: Fluid Viscous Tab Bar (Desktop Only) */}
            {!isAuthPage && (
              <div
                className="hidden md:flex items-center gap-0.5 p-[3px] rounded-full border border-black/[0.05] dark:border-white/[0.08] bg-black/[0.02] dark:bg-white/[0.03] backdrop-blur-md"
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
                          layoutId="activeTabPill"
                          transition={liquidSpring}
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

                      {/* Smooth Hover Light Follower (when hovering inactive tabs) */}
                      {isHovered && !isActive && (
                        <motion.div
                          layoutId="hoverTabGlow"
                          transition={liquidSpring}
                          className="absolute inset-0 rounded-full z-0 bg-black/[0.05] dark:bg-white/[0.08] border border-black/[0.04] dark:border-white/[0.06]"
                        />
                      )}

                      {/* Icon + Label */}
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

            {/* 3. RIGHT: Dynamic Status Capsule & Quick Actions */}
            <div className="flex items-center gap-1.5 shrink-0">
              {wallet ? (
                <>
                  {/* Contextual Island Capsule (Click opens HUD) */}
                  <motion.button
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.97 }}
                    transition={microSpring}
                    onClick={() => setHudOpen(!hudOpen)}
                    title="Account details"
                    className="flex items-center gap-1.5 pl-3 pr-2.5 py-1.5 rounded-full text-xs font-semibold cursor-pointer select-none transition-all"
                    style={{
                      background: hudOpen ? "var(--muted)" : "var(--balance-bg)",
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
                      animate={{ rotate: hudOpen ? 180 : 0 }}
                      transition={{ duration: 0.25 }}
                      className="opacity-60"
                    >
                      <ChevronDown size={12} />
                    </motion.div>
                  </motion.button>
                </>
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

              {/* Theme Switcher */}
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

              {/* Mobile Drawer Toggle */}
              {!isAuthPage && (
                <motion.button
                  whileTap={{ scale: 0.88 }}
                  transition={microSpring}
                  onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
                  className="md:hidden p-1.5 rounded-full text-muted-foreground hover:text-foreground cursor-pointer border border-black/[0.06] dark:border-white/[0.08] bg-black/[0.02] dark:bg-white/[0.04]"
                >
                  <AnimatePresence mode="wait" initial={false}>
                    <motion.div
                      key={mobileMenuOpen ? "close" : "open"}
                      initial={{ scale: 0.6, rotate: -90 }}
                      animate={{ scale: 1, rotate: 0 }}
                      exit={{ scale: 0.6, rotate: 90 }}
                      transition={{ duration: 0.2 }}
                    >
                      {mobileMenuOpen ? <X size={15} /> : <Menu size={15} />}
                    </motion.div>
                  </AnimatePresence>
                </motion.button>
              )}
            </div>
          </div>
        </motion.nav>

        {/* ── 4. Dynamic Island Expanded HUD Dropdown ── */}
        <AnimatePresence>
          {hudOpen && wallet && (
            <motion.div
              initial={{ opacity: 0, y: -12, scale: 0.95 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: -12, scale: 0.95 }}
              transition={hudSpring}
              className="absolute top-[calc(100%+8px)] right-0 w-[290px] rounded-[24px] p-4 ios-glass border border-white/60 dark:border-white/10 shadow-2xl z-50 overflow-hidden"
              style={{
                boxShadow:
                  "0 24px 48px -12px rgba(9, 21, 64, 0.25), inset 0 1px 1px rgba(255,255,255,0.8)",
              }}
            >
              {/* Header: Identity & Status */}
              <div className="flex items-center justify-between pb-3 mb-3 border-b border-border/50">
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
              </div>

              {/* Balance Card */}
              <div className="p-3 rounded-2xl bg-black/[0.02] dark:bg-white/[0.03] border border-border/40 mb-3.5">
                <span className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider block mb-1">
                  Total Balance
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
              </div>

              {/* Quick Actions */}
              <div className="grid grid-cols-2 gap-2 pt-1 border-t border-border/50">
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
                    setHudOpen(false);
                    router.push("/transfer");
                  }}
                  className="py-2 px-3 rounded-xl btn-enterprise-primary text-primary-foreground text-[11px] font-semibold flex items-center justify-center gap-1.5 cursor-pointer"
                >
                  <Send size={12} />
                  <span>Transfer</span>
                </button>
              </div>

              {/* Disconnect Option */}
              <button
                onClick={() => {
                  setHudOpen(false);
                  logout();
                  router.push("/");
                  toast.success("Disconnected wallet");
                }}
                className="w-full mt-2 py-1.5 rounded-xl hover:bg-red-500/10 text-red-500 text-[11px] font-semibold flex items-center justify-center gap-1.5 cursor-pointer transition-colors"
              >
                <LogOut size={12} />
                <span>Disconnect Wallet</span>
              </button>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* ── 5. Mobile Drawer Menu ── */}
      <AnimatePresence>
        {mobileMenuOpen && !isAuthPage && (
          <motion.div
            initial={{ opacity: 0, y: -10, scaleY: 0.94 }}
            animate={{ opacity: 1, y: 0, scaleY: 1 }}
            exit={{ opacity: 0, y: -10, scaleY: 0.94 }}
            transition={hudSpring}
            style={{ transformOrigin: "top center" }}
            className="md:hidden fixed top-[64px] inset-x-4 z-50 rounded-[26px] p-4 dynamic-island-dropdown shadow-2xl"
          >
            {/* Mobile Balance */}
            {wallet && (
              <div className="flex items-center justify-between p-3 rounded-2xl bg-black/[0.03] dark:bg-white/[0.05] border border-border/40 mb-3">
                <div className="flex items-center gap-2 text-foreground font-semibold text-xs">
                  <Coins size={15} className="text-primary" />
                  <span>Your Balance:</span>
                </div>
                <span className="font-bold text-sm text-primary">
                  {Number(balance || 0).toLocaleString()}{" "}
                  {NETWORK_CONFIG.tokenSymbol}
                </span>
              </div>
            )}

            {/* Mobile Nav Links */}
            <div className="grid grid-cols-2 gap-2">
              {NAV_ITEMS.map((item) => {
                const Icon = item.icon;
                const isActive = pathname === item.href;
                return (
                  <button
                    key={item.id}
                    onClick={() => {
                      router.push(item.href);
                      setMobileMenuOpen(false);
                    }}
                    className={`flex items-center gap-2.5 p-3 rounded-2xl text-xs font-semibold transition-all cursor-pointer ${
                      isActive
                        ? "btn-enterprise-primary"
                        : "bg-black/[0.02] dark:bg-white/[0.04] text-foreground hover:bg-black/[0.05] dark:hover:bg-white/[0.08] border border-border/40"
                    }`}
                  >
                    <Icon size={16} />
                    {item.label}
                  </button>
                );
              })}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </header>
  );
}