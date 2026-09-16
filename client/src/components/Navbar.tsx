"use client";

import { useState, useEffect } from "react";
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
  Sparkles,
} from "lucide-react";

const NAV_ITEMS = [
  { id: "dashboard", label: "Overview", href: "/dashboard", icon: LayoutDashboard },
  { id: "vault", label: "Vault", href: "/vault", icon: Shield },
  { id: "market", label: "Market", href: "/market", icon: ShoppingBag },
  { id: "messages", label: "Messages", href: "/messages", icon: MessageSquare },
  { id: "transfer", label: "Transfer", href: "/transfer", icon: Send },
  { id: "tools", label: "Tools", href: "/tools", icon: Wrench },
] as const;

export default function Navbar() {
  const router = useRouter();
  const pathname = usePathname();
  const { wallet, balance, logout, networkStatus, refreshBalance } = useStore();
  const { theme, setTheme } = useTheme();

  const [copied, setCopied] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [mounted, setMounted] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  // Hide on login / root page if not logged in
  const isAuthPage = pathname === "/" || pathname === "/login";

  const handleCopy = () => {
    if (!wallet?.address) return;
    navigator.clipboard.writeText(wallet.address);
    setCopied(true);
    toast.success("Wallet address copied!");
    setTimeout(() => setCopied(false), 2000);
  };

  const handleRefreshBalance = async () => {
    setRefreshing(true);
    try {
      await refreshBalance();
      toast.success("Balance updated");
    } catch {
      // silent
    }
    setTimeout(() => setRefreshing(false), 800);
  };

  if (!mounted) return null;

  return (
    <header className="w-full pt-3 pb-2 px-4 flex justify-center">
      {/* Floating Bubbly Island Container */}
      <nav className="w-full max-w-6xl mx-auto ios-glass-pill rounded-full px-3.5 py-2 flex items-center justify-between transition-all duration-300">
        
        {/* Left: Brand / Logo */}
        <div className="flex items-center gap-3 pl-2">
          <motion.div
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            onClick={() => router.push(wallet ? "/dashboard" : "/")}
            className="flex items-center gap-2.5 cursor-pointer select-none"
          >
            <div className="w-9 h-9 rounded-2xl bg-primary flex items-center justify-center text-primary-foreground shadow-sm">
              <Shield size={18} className="stroke-[2.2]" />
            </div>
            <div className="flex flex-col">
              <div className="flex items-center gap-1.5">
                <span className="text-[15px] font-bold tracking-tight text-foreground">
                  CipherVault
                </span>
                <span className="px-1.5 py-0.2 text-[9px] font-bold bg-[#7692FF]/15 text-[#1B2CC1] dark:text-[#ABD2FA] border border-[#7692FF]/20 rounded-md tracking-wider">
                  L1
                </span>
              </div>
              <span className="text-[10px] text-muted-foreground font-medium -mt-0.5">
                BridgeStone Network
              </span>
            </div>
          </motion.div>
        </div>

        {/* Center: Bubbly Nav Tabs (Desktop) */}
        {!isAuthPage && (
          <div className="hidden md:flex items-center gap-1 bg-muted p-1 rounded-full border border-border">
            {NAV_ITEMS.map((item) => {
              const Icon = item.icon;
              const isActive = pathname === item.href;
                return (
                  <button
                    key={item.id}
                    onClick={() => router.push(item.href)}
                    className={`relative px-3.5 py-1.5 rounded-full text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer select-none ${
                      isActive
                        ? "text-primary-foreground"
                        : "text-muted-foreground hover:text-foreground"
                    }`}
                  >
                    {isActive && (
                      <motion.div
                        layoutId="activeNavPill"
                        className="absolute inset-0 bg-primary rounded-full shadow-sm border border-transparent"
                        transition={{ type: "spring", stiffness: 400, damping: 32, mass: 0.8 }}
                      />
                    )}
                    <span className="relative z-10 flex items-center gap-1.5">
                      <Icon size={14} className={isActive ? "text-primary-foreground" : "opacity-70"} />
                      {item.label}
                    </span>
                  </button>
              );
            })}
          </div>
        )}

        {/* Right: Actions, Balance & Wallet */}
        <div className="flex items-center gap-2">
          {wallet ? (
            <>
              {/* Balance Pill */}
              <motion.button
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.96 }}
                onClick={handleRefreshBalance}
                title="Click to refresh balance"
                className="hidden sm:flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-slate-100 dark:bg-[#7692FF]/15 border border-slate-200 dark:border-[#7692FF]/25 text-[#1B2CC1] dark:text-[#ABD2FA] text-xs font-semibold cursor-pointer select-none"
              >
                <Coins size={14} />
                <span>
                  {Number(balance || 0).toLocaleString(undefined, { maximumFractionDigits: 2 })}{" "}
                  {NETWORK_CONFIG.tokenSymbol}
                </span>
                <RefreshCw size={11} className={`opacity-60 ml-0.5 ${refreshing ? "animate-spin" : ""}`} />
              </motion.button>

              {/* Connected Address Pill */}
              <motion.div
                whileHover={{ scale: 1.02 }}
                className="flex items-center gap-1.5 pl-2.5 pr-1.5 py-1 rounded-full bg-muted border border-border text-xs font-mono font-medium text-foreground"
              >
                <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse shadow-sm shadow-emerald-500/50" />
                <span>
                  {wallet.address.slice(0, 6)}...{wallet.address.slice(-4)}
                </span>
                <button
                  onClick={handleCopy}
                  title="Copy address"
                  className="p-1 rounded-full hover:bg-black/5 dark:hover:bg-white/10 text-muted-foreground hover:text-foreground transition-colors cursor-pointer"
                >
                  {copied ? <Check size={13} className="text-emerald-500" /> : <Copy size={13} />}
                </button>
              </motion.div>

              {/* Logout Button */}
              <motion.button
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                onClick={() => {
                  logout();
                  router.push("/");
                  toast.success("Disconnected wallet");
                }}
                title="Disconnect Wallet"
                className="p-2 rounded-full hover:bg-red-500/10 text-muted-foreground hover:text-red-500 transition-colors cursor-pointer"
              >
                <LogOut size={16} />
              </motion.button>
            </>
          ) : (
            <motion.button
              whileHover={{ scale: 1.03 }}
              whileTap={{ scale: 0.96 }}
              onClick={() => router.push("/")}
              className="flex items-center gap-1.5 px-4 py-1.5 rounded-full bg-primary hover:bg-primary/90 text-primary-foreground text-xs font-semibold shadow-sm cursor-pointer"
            >
              <Wallet size={14} />
              <span>Connect</span>
            </motion.button>
          )}

          {/* Theme Switcher Button */}
          <motion.button
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
            aria-label="Toggle theme"
            className="w-8 h-8 rounded-full flex items-center justify-center bg-muted border border-border text-muted-foreground hover:text-foreground transition-colors cursor-pointer"
          >
            {theme === "dark" ? <Sun size={15} /> : <Moon size={15} />}
          </motion.button>

          {/* Mobile Menu Hamburger */}
          {!isAuthPage && (
            <motion.button
              whileTap={{ scale: 0.9 }}
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="md:hidden p-2 rounded-full bg-black/[0.04] dark:bg-white/[0.06] text-muted-foreground hover:text-foreground cursor-pointer"
            >
              {mobileMenuOpen ? <X size={18} /> : <Menu size={18} />}
            </motion.button>
          )}
        </div>
      </nav>

      {/* Mobile Drawer (Bubbly Dropdown) */}
      <AnimatePresence>
        {mobileMenuOpen && !isAuthPage && (
          <motion.div
            initial={{ opacity: 0, y: -10, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -10, scale: 0.98 }}
            transition={{ type: "spring", stiffness: 350, damping: 30, mass: 0.8 }}
            className="md:hidden fixed top-18 inset-x-4 z-50 ios-glass-pill rounded-3xl p-4 shadow-2xl border border-black/5 dark:border-white/10"
          >
            {/* Mobile Balance Display */}
            {wallet && (
              <div className="flex items-center justify-between p-3 rounded-2xl bg-[#7692FF]/10 dark:bg-[#7692FF]/15 border border-[#7692FF]/25 mb-3">
                <div className="flex items-center gap-2 text-[#1B2CC1] dark:text-[#ABD2FA] font-semibold text-xs">
                  <Coins size={16} />
                  <span>Your Balance:</span>
                </div>
                <span className="font-bold text-sm text-[#1B2CC1] dark:text-[#ABD2FA]">
                  {Number(balance || 0).toLocaleString()} {NETWORK_CONFIG.tokenSymbol}
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
                    className={`flex items-center gap-2.5 p-3 rounded-2xl text-xs font-semibold transition-all ${
                      isActive
                        ? "bg-primary text-primary-foreground shadow-sm"
                        : "bg-black/[0.03] dark:bg-background/60 text-foreground hover:bg-muted border border-transparent dark:border-[#ABD2FA]/10"
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