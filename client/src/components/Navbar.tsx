"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter, usePathname } from "next/navigation";
import { useStore } from "@/lib/store";
import { useTheme } from "next-themes";
import { NETWORK_CONFIG } from "@/lib/constants";
import { motion, AnimatePresence, LayoutGroup } from "framer-motion";
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
} from "lucide-react";

const NAV_ITEMS = [
  { id: "dashboard", label: "Overview", href: "/dashboard", icon: LayoutDashboard },
  { id: "vault", label: "Vault", href: "/vault", icon: Shield },
  { id: "market", label: "Market", href: "/market", icon: ShoppingBag },
  { id: "messages", label: "Messages", href: "/messages", icon: MessageSquare },
  { id: "transfer", label: "Transfer", href: "/transfer", icon: Send },
  { id: "tools", label: "Tools", href: "/tools", icon: Wrench },
] as const;

// Fluid spring config — the secret sauce for liquid motion
const fluidSpring = { type: "spring" as const, stiffness: 420, damping: 34, mass: 0.8 };
const gentleSpring = { type: "spring" as const, stiffness: 300, damping: 28, mass: 1 };
const morphSpring = { type: "spring" as const, stiffness: 380, damping: 30, mass: 0.85 };

export default function Navbar() {
  const router = useRouter();
  const pathname = usePathname();
  const { wallet, balance, logout, refreshBalance } = useStore();
  const { theme, setTheme } = useTheme();

  const [copied, setCopied] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [mounted, setMounted] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [isExpanded, setIsExpanded] = useState(false);

  useEffect(() => { setMounted(true); }, []);

  const isAuthPage = pathname === "/" || pathname === "/login";

  const handleCopy = useCallback(() => {
    if (!wallet?.address) return;
    navigator.clipboard.writeText(wallet.address);
    setCopied(true);
    toast.success("Address copied!");
    setTimeout(() => setCopied(false), 2000);
  }, [wallet?.address]);

  const handleRefreshBalance = useCallback(async () => {
    setRefreshing(true);
    try { await refreshBalance(); toast.success("Balance updated"); } catch {}
    setTimeout(() => setRefreshing(false), 800);
  }, [refreshBalance]);

  if (!mounted) return null;

  return (
    <header className="w-full pt-3 pb-2 px-4 flex justify-center">
      <LayoutGroup>
        {/* ── Dynamic Island Container ── */}
        <motion.nav
          layout
          transition={morphSpring}
          className="relative mx-auto flex items-center justify-between overflow-hidden"
          style={{
            borderRadius: 9999,
            padding: "6px 14px",
          }}
          onMouseEnter={() => setIsExpanded(true)}
          onMouseLeave={() => setIsExpanded(false)}
        >
          {/* ── Liquid Glass Background Layer (morphs independently) ── */}
          <motion.div
            layout
            transition={morphSpring}
            className="absolute inset-0 z-0"
            style={{
              borderRadius: 9999,
              background: "var(--island-bg)",
              backdropFilter: "blur(40px) saturate(180%)",
              WebkitBackdropFilter: "blur(40px) saturate(180%)",
              border: "1px solid var(--island-border)",
              borderBottom: "1px solid var(--island-border-bottom)",
              boxShadow: "inset 0 1px 1px var(--island-highlight), inset 0 0 0 1px var(--island-inner-ring)",
            }}
          />

          {/* ── Content Layer ── */}
          <div className="relative z-10 flex items-center justify-between w-full gap-3">

            {/* Left: Logo */}
            <motion.div
              whileHover={{ scale: 1.04 }}
              whileTap={{ scale: 0.96 }}
              transition={fluidSpring}
              onClick={() => router.push(wallet ? "/dashboard" : "/")}
              className="flex items-center gap-2 cursor-pointer select-none shrink-0"
            >
              <motion.div
                layout
                transition={fluidSpring}
                className="w-8 h-8 rounded-[12px] bg-primary flex items-center justify-center text-primary-foreground"
                style={{
                  boxShadow: "inset 0 1px 1px rgba(255,255,255,0.4)",
                }}
              >
                <Shield size={16} className="stroke-[2.2]" />
              </motion.div>
              <motion.div
                layout
                transition={fluidSpring}
                className="flex flex-col leading-tight"
              >
                <span className="text-[13px] font-bold tracking-tight text-foreground">
                  CipherVault
                </span>
                <span className="text-[9px] text-muted-foreground font-medium">
                  BridgeStone L1
                </span>
              </motion.div>
            </motion.div>

            {/* Center: Navigation Capsule (Desktop) */}
            {!isAuthPage && (
              <motion.div
                layout
                transition={gentleSpring}
                className="hidden md:flex items-center gap-0.5 rounded-full p-[3px]"
                style={{
                  background: "var(--nav-capsule-bg)",
                  border: "1px solid var(--nav-capsule-border)",
                }}
              >
                {NAV_ITEMS.map((item) => {
                  const Icon = item.icon;
                  const isActive = pathname === item.href;
                  return (
                    <motion.button
                      key={item.id}
                      layout
                      onClick={() => router.push(item.href)}
                      className="relative px-3 py-[5px] rounded-full text-[11px] font-semibold flex items-center gap-1.5 cursor-pointer select-none"
                      whileHover={{ scale: 1.04 }}
                      whileTap={{ scale: 0.96 }}
                      transition={fluidSpring}
                      style={{ color: isActive ? "var(--nav-active-text)" : "var(--nav-inactive-text)" }}
                    >
                      {/* Fluid Active Pill Indicator */}
                      {isActive && (
                        <motion.div
                          layoutId="dynamicIslandPill"
                          className="absolute inset-0 rounded-full"
                          transition={fluidSpring}
                          style={{
                            background: "var(--nav-pill-bg)",
                            border: "1px solid var(--nav-pill-border)",
                            borderBottom: "1px solid var(--nav-pill-border-bottom)",
                            boxShadow: "inset 0 1px 1px var(--nav-pill-highlight)",
                          }}
                        />
                      )}
                      <span className="relative z-10 flex items-center gap-1.5">
                        <Icon size={13} style={{ opacity: isActive ? 1 : 0.6 }} />
                        {item.label}
                      </span>
                    </motion.button>
                  );
                })}
              </motion.div>
            )}

            {/* Right: Actions */}
            <div className="flex items-center gap-1.5 shrink-0">
              {wallet ? (
                <>
                  {/* Balance Pill */}
                  <motion.button
                    layout
                    whileHover={{ scale: 1.03 }}
                    whileTap={{ scale: 0.96 }}
                    transition={fluidSpring}
                    onClick={handleRefreshBalance}
                    title="Refresh balance"
                    className="hidden sm:flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-semibold cursor-pointer select-none"
                    style={{
                      background: "var(--balance-bg)",
                      border: "1px solid var(--balance-border)",
                      color: "var(--balance-text)",
                    }}
                  >
                    <Coins size={13} />
                    <span>
                      {Number(balance || 0).toLocaleString(undefined, { maximumFractionDigits: 2 })}{" "}
                      {NETWORK_CONFIG.tokenSymbol}
                    </span>
                    <RefreshCw size={10} className={`opacity-50 ${refreshing ? "animate-spin" : ""}`} />
                  </motion.button>

                  {/* Address Chip */}
                  <AnimatePresence>
                    {isExpanded && (
                      <motion.div
                        initial={{ width: 0, opacity: 0 }}
                        animate={{ width: "auto", opacity: 1 }}
                        exit={{ width: 0, opacity: 0 }}
                        transition={gentleSpring}
                        className="hidden sm:flex items-center gap-1.5 overflow-hidden"
                      >
                        <div
                          className="flex items-center gap-1 pl-2 pr-1 py-0.5 rounded-full text-[11px] font-mono font-medium"
                          style={{
                            background: "var(--address-bg)",
                            border: "1px solid var(--address-border)",
                            color: "var(--nav-inactive-text)",
                          }}
                        >
                          <span className="w-[6px] h-[6px] rounded-full bg-emerald-500 animate-pulse" />
                          <span className="whitespace-nowrap">
                            {wallet.address.slice(0, 6)}…{wallet.address.slice(-4)}
                          </span>
                          <button
                            onClick={handleCopy}
                            title="Copy"
                            className="p-0.5 rounded-full hover:bg-white/20 transition-colors cursor-pointer"
                          >
                            {copied ? <Check size={11} className="text-emerald-500" /> : <Copy size={11} />}
                          </button>
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>

                  {/* Logout */}
                  <motion.button
                    whileHover={{ scale: 1.1 }}
                    whileTap={{ scale: 0.9 }}
                    transition={fluidSpring}
                    onClick={() => { logout(); router.push("/"); toast.success("Disconnected"); }}
                    title="Disconnect"
                    className="p-1.5 rounded-full text-muted-foreground hover:text-red-500 hover:bg-red-500/10 transition-colors cursor-pointer"
                  >
                    <LogOut size={14} />
                  </motion.button>
                </>
              ) : (
                <motion.button
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  transition={fluidSpring}
                  onClick={() => router.push("/")}
                  className="btn-enterprise-primary flex items-center gap-1.5 px-3.5 py-1.5 rounded-full text-[11px] font-semibold cursor-pointer"
                >
                  <Wallet size={13} />
                  <span>Connect</span>
                </motion.button>
              )}

              {/* Theme Toggle */}
              <motion.button
                whileHover={{ scale: 1.1, rotate: 15 }}
                whileTap={{ scale: 0.9, rotate: -15 }}
                transition={fluidSpring}
                onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
                aria-label="Toggle theme"
                className="w-7 h-7 rounded-full flex items-center justify-center text-muted-foreground hover:text-foreground transition-colors cursor-pointer"
                style={{
                  background: "var(--nav-capsule-bg)",
                  border: "1px solid var(--nav-capsule-border)",
                }}
              >
                <AnimatePresence mode="wait" initial={false}>
                  <motion.div
                    key={theme}
                    initial={{ y: -12, opacity: 0, rotate: -90 }}
                    animate={{ y: 0, opacity: 1, rotate: 0 }}
                    exit={{ y: 12, opacity: 0, rotate: 90 }}
                    transition={fluidSpring}
                  >
                    {theme === "dark" ? <Sun size={13} /> : <Moon size={13} />}
                  </motion.div>
                </AnimatePresence>
              </motion.button>

              {/* Mobile Menu Toggle */}
              {!isAuthPage && (
                <motion.button
                  whileTap={{ scale: 0.85 }}
                  transition={fluidSpring}
                  onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
                  className="md:hidden p-1.5 rounded-full text-muted-foreground hover:text-foreground cursor-pointer"
                  style={{
                    background: "var(--nav-capsule-bg)",
                    border: "1px solid var(--nav-capsule-border)",
                  }}
                >
                  <AnimatePresence mode="wait" initial={false}>
                    <motion.div
                      key={mobileMenuOpen ? "close" : "open"}
                      initial={{ scale: 0, rotate: -90 }}
                      animate={{ scale: 1, rotate: 0 }}
                      exit={{ scale: 0, rotate: 90 }}
                      transition={fluidSpring}
                    >
                      {mobileMenuOpen ? <X size={16} /> : <Menu size={16} />}
                    </motion.div>
                  </AnimatePresence>
                </motion.button>
              )}
            </div>
          </div>
        </motion.nav>
      </LayoutGroup>

      {/* ── Mobile Drawer (Morphing Dropdown from Island) ── */}
      <AnimatePresence>
        {mobileMenuOpen && !isAuthPage && (
          <motion.div
            initial={{ opacity: 0, y: -8, scaleY: 0.92, scaleX: 0.96 }}
            animate={{ opacity: 1, y: 0, scaleY: 1, scaleX: 1 }}
            exit={{ opacity: 0, y: -8, scaleY: 0.92, scaleX: 0.96 }}
            transition={gentleSpring}
            style={{ transformOrigin: "top center" }}
            className="md:hidden fixed top-[60px] inset-x-4 z-50 rounded-[24px] p-4 dynamic-island-dropdown"
          >
            {/* Mobile Balance */}
            {wallet && (
              <motion.div
                initial={{ opacity: 0, y: -8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ ...fluidSpring, delay: 0.05 }}
                className="flex items-center justify-between p-3 rounded-2xl mb-3"
                style={{
                  background: "var(--balance-bg)",
                  border: "1px solid var(--balance-border)",
                }}
              >
                <div className="flex items-center gap-2 font-semibold text-xs" style={{ color: "var(--balance-text)" }}>
                  <Coins size={15} />
                  <span>Balance:</span>
                </div>
                <span className="font-bold text-sm" style={{ color: "var(--balance-text)" }}>
                  {Number(balance || 0).toLocaleString()} {NETWORK_CONFIG.tokenSymbol}
                </span>
              </motion.div>
            )}

            {/* Mobile Nav Grid */}
            <div className="grid grid-cols-2 gap-2">
              {NAV_ITEMS.map((item, i) => {
                const Icon = item.icon;
                const isActive = pathname === item.href;
                return (
                  <motion.button
                    key={item.id}
                    initial={{ opacity: 0, y: 8, scale: 0.95 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    transition={{ ...fluidSpring, delay: 0.03 * (i + 1) }}
                    whileTap={{ scale: 0.95 }}
                    onClick={() => { router.push(item.href); setMobileMenuOpen(false); }}
                    className={`flex items-center gap-2.5 p-3 rounded-2xl text-xs font-semibold transition-colors cursor-pointer ${
                      isActive
                        ? "btn-enterprise-primary"
                        : "bg-muted/40 text-foreground hover:bg-muted/70 border border-border/50"
                    }`}
                  >
                    <Icon size={16} />
                    {item.label}
                  </motion.button>
                );
              })}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </header>
  );
}