"use client";

import { useEffect, useState, useMemo } from "react";
import { useRouter } from "next/navigation";
import { useStore } from "@/lib/store";
import { useActivityStore } from "@/lib/activity-store";
import { useContactsStore } from "@/lib/contact-store";
import { NETWORK_CONFIG } from "@/lib/constants";
import { motion } from "framer-motion";
import {
  Shield,
  Coins,
  Package,
  ShoppingBag,
  Send,
  Lock,
  ArrowUpRight,
  TrendingUp,
  Activity,
  Users,
  ChevronRight,
  Sparkles,
  ExternalLink,
  Copy,
  Check,
  Zap,
} from "lucide-react";
import { toast } from "sonner";

const spring = {
  type: "spring" as const,
  stiffness: 400,
  damping: 32,
  mass: 0.8,
};

export default function DashboardPage() {
  const router = useRouter();
  const { contract, wallet, vaultItems, marketItems, salesItems, balance, startAutoRefresh } = useStore();
  const { getActivities } = useActivityStore();
  const { contacts } = useContactsStore();
  const [mounted, setMounted] = useState(false);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (!mounted) return;
    if (!contract || !wallet) {
      router.push("/login");
      return;
    }
    startAutoRefresh();
  }, [mounted, contract, wallet, router, startAutoRefresh]);

  const activities = useMemo(
    () => (wallet ? getActivities(wallet.address).slice(0, 6) : []),
    [wallet?.address, getActivities]
  );

  const stats = useMemo(() => {
    if (!wallet) return null;
    const myItems = vaultItems.filter((i) => !i.isListed && !i.isEscrowActive);
    const listed = vaultItems.filter((i) => i.isListed);
    const escrowPending = salesItems.length;
    const portfolioValue = listed.reduce((sum, i) => sum + parseFloat(i.price || "0"), 0);
    const totalItems = vaultItems.length;
    return { myItems: myItems.length, listed: listed.length, escrowPending, portfolioValue, totalItems };
  }, [vaultItems, salesItems, wallet]);

  if (!mounted || !wallet || !stats) return null;

  const shortAddr = `${wallet.address.slice(0, 6)}...${wallet.address.slice(-4)}`;

  const handleCopyAddr = () => {
    navigator.clipboard.writeText(wallet.address);
    setCopied(true);
    toast.success("Wallet address copied to clipboard");
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="min-h-screen pt-24 pb-20 px-4 md:px-8 max-w-7xl mx-auto font-sans">
      {/* ── Top Header / User Welcome ── */}
      <motion.div
        initial={{ opacity: 0, y: 15 }}
        animate={{ opacity: 1, y: 0 }}
        transition={spring}
        className="flex flex-col md:flex-row md:items-end justify-between gap-4 mb-8"
      >
        <div>
          <div className="flex items-center gap-2 mb-2">
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[11px] font-semibold bg-[#7692FF]/15 text-[#1B2CC1] dark:text-[#ABD2FA] border border-[#7692FF]/25">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse shadow-sm shadow-emerald-400/50" />
              {NETWORK_CONFIG.name} · Chain ID {NETWORK_CONFIG.chainId}
            </span>
          </div>
          <h1 className="text-3xl md:text-5xl font-extrabold tracking-tight text-foreground">
            Vault <span className="text-muted-foreground font-normal">Dashboard</span>
          </h1>
        </div>

        {/* Wallet Pill Card */}
        <motion.div
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.98 }}
          onClick={handleCopyAddr}
          className="ios-glass-pill px-4 py-2.5 rounded-2xl flex items-center gap-3 cursor-pointer self-start md:self-auto border border-black/[0.06] dark:border-[#ABD2FA]/20 shadow-sm hover:shadow-md transition-all"
        >
          <div className="w-8 h-8 rounded-xl bg-primary flex items-center justify-center text-primary-foreground shadow-sm">
            <Shield size={16} />
          </div>
          <div className="flex flex-col">
            <span className="text-[10px] uppercase font-bold text-muted-foreground tracking-wider">
              Connected Account
            </span>
            <span className="text-xs font-mono font-bold text-[#1B2CC1] dark:text-[#ABD2FA]">
              {shortAddr}
            </span>
          </div>
          <div className="p-1.5 rounded-lg bg-muted dark:bg-[#7692FF]/15 text-muted-foreground">
            {copied ? <Check size={13} className="text-emerald-400" /> : <Copy size={13} className="text-[#1B2CC1] dark:text-[#7692FF]" />}
          </div>
        </motion.div>
      </motion.div>

      {/* ── Main Hero Widget (Balance + Quick Actions) ── */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5 mb-8">
        {/* Large Balance Card */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ ...spring, delay: 0.05 }}
          className="lg:col-span-2 relative overflow-hidden rounded-3xl p-7 md:p-9 ios-card"
        >
          <div className="relative z-10 flex flex-col justify-between h-full">
            <div>
              <div className="flex items-center justify-between mb-4">
                <span className="text-xs font-bold uppercase tracking-widest text-muted-foreground">
                  Available Balance
                </span>
                <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/15">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                  Live Sync
                </span>
              </div>

              <div className="flex items-baseline gap-3 my-2">
                <span className="text-5xl md:text-6xl font-black tracking-tight text-foreground tabular-nums">
                  {Number(balance || 0).toLocaleString(undefined, {
                    minimumFractionDigits: 2,
                    maximumFractionDigits: 4,
                  })}
                </span>
                <span className="text-2xl md:text-3xl font-bold text-[#1B2CC1] dark:text-[#ABD2FA]">
                  {NETWORK_CONFIG.tokenSymbol}
                </span>
              </div>

              <p className="text-xs md:text-sm text-muted-foreground mt-1">
                Native token for storage fees, asset purchases, and gas on BridgeStone L1.
              </p>
            </div>

            {/* Bubbly Action Buttons */}
            <div className="flex flex-wrap items-center gap-3 mt-8 pt-6 border-t border-border">
              <motion.button
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.97 }}
                onClick={() => router.push("/vault")}
                className="px-5 py-3 rounded-2xl btn-enterprise-primary text-primary-foreground flex items-center gap-2 cursor-pointer transition-all"
              >
                <Shield size={16} />
                <span>Open Vault</span>
              </motion.button>

              <motion.button
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.97 }}
                onClick={() => router.push("/transfer")}
                className="px-5 py-3 rounded-2xl bg-background hover:bg-muted text-foreground font-semibold text-sm border border-border shadow-sm flex items-center gap-2 cursor-pointer transition-all"
              >
                <Send size={16} className="text-[#1B2CC1] dark:text-[#7692FF]" />
                <span>Send Tokens</span>
              </motion.button>

              <motion.button
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.97 }}
                onClick={() => router.push("/market")}
                className="px-5 py-3 rounded-2xl bg-background hover:bg-muted text-foreground font-semibold text-sm border border-border shadow-sm flex items-center gap-2 cursor-pointer transition-all"
              >
                <ShoppingBag size={16} className="text-[#1B2CC1] dark:text-[#7692FF]" />
                <span>Marketplace</span>
              </motion.button>
            </div>
          </div>
        </motion.div>

        {/* Portfolio Value Widget */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ ...spring, delay: 0.1 }}
          className="rounded-3xl p-7 ios-card flex flex-col justify-between"
        >
          <div>
            <div className="w-12 h-12 rounded-2xl bg-[#7692FF]/15 text-[#1B2CC1] dark:text-[#ABD2FA] flex items-center justify-center mb-5 border border-[#7692FF]/20">
              <TrendingUp size={22} className="stroke-[2.2]" />
            </div>
            <span className="text-xs font-bold uppercase tracking-widest text-muted-foreground">
              Market Listings Value
            </span>
            <div className="flex items-baseline gap-2 mt-2">
              <span className="text-3xl md:text-4xl font-black text-foreground tabular-nums">
                {stats.portfolioValue.toFixed(2)}
              </span>
              <span className="text-lg font-bold text-[#1B2CC1] dark:text-[#ABD2FA]">
                {NETWORK_CONFIG.tokenSymbol}
              </span>
            </div>
            <p className="text-xs text-muted-foreground mt-2">
              Total asking price for {stats.listed} asset{stats.listed !== 1 ? "s" : ""} currently listed for sale.
            </p>
          </div>

          <div className="mt-6 pt-5 border-t border-border flex items-center justify-between text-xs">
            <span className="text-muted-foreground">Active in Escrow</span>
            <span className="font-bold text-foreground px-2.5 py-1 rounded-full bg-[#7692FF]/15 text-[#1B2CC1] dark:text-[#ABD2FA] border border-[#7692FF]/25">
              {stats.escrowPending} pending
            </span>
          </div>
        </motion.div>
      </div>

      {/* ── Bubbly Stats Grid (iOS Widgets) ── */}
      <div className="grid grid-cols-2 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        {/* Total Assets */}
        <motion.div
          whileHover={{ y: -3, scale: 1.01 }}
          whileTap={{ scale: 0.98 }}
          onClick={() => router.push("/vault")}
          className="p-5 rounded-3xl ios-card transition-all cursor-pointer group"
        >
          <div className="flex items-center justify-between mb-3">
            <div className="w-10 h-10 rounded-2xl bg-primary/15 text-[#1B2CC1] dark:text-[#7692FF] flex items-center justify-center group-hover:scale-110 transition-transform border border-[#1B2CC1]/20">
              <Package size={18} />
            </div>
            <ChevronRight size={16} className="text-muted-foreground opacity-40 group-hover:opacity-100 group-hover:translate-x-1 transition-all" />
          </div>
          <div className="text-2xl md:text-3xl font-extrabold text-foreground tabular-nums">
            {stats.totalItems}
          </div>
          <div className="text-xs font-medium text-muted-foreground mt-0.5">
            Total Vault Assets
          </div>
        </motion.div>

        {/* Private Vault Files */}
        <motion.div
          whileHover={{ y: -3, scale: 1.01 }}
          whileTap={{ scale: 0.98 }}
          onClick={() => router.push("/vault")}
          className="p-5 rounded-3xl ios-card transition-all cursor-pointer group"
        >
          <div className="flex items-center justify-between mb-3">
            <div className="w-10 h-10 rounded-2xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 flex items-center justify-center group-hover:scale-110 transition-transform border border-emerald-500/15">
              <Lock size={18} />
            </div>
            <ChevronRight size={16} className="text-muted-foreground opacity-40 group-hover:opacity-100 group-hover:translate-x-1 transition-all" />
          </div>
          <div className="text-2xl md:text-3xl font-extrabold text-foreground tabular-nums">
            {stats.myItems}
          </div>
          <div className="text-xs font-medium text-muted-foreground mt-0.5">
            Encrypted & Secured
          </div>
        </motion.div>

        {/* Listed for Sale */}
        <motion.div
          whileHover={{ y: -3, scale: 1.01 }}
          whileTap={{ scale: 0.98 }}
          onClick={() => router.push("/market")}
          className="p-5 rounded-3xl ios-card transition-all cursor-pointer group"
        >
          <div className="flex items-center justify-between mb-3">
            <div className="w-10 h-10 rounded-2xl bg-[#7692FF]/15 text-[#1B2CC1] dark:text-[#ABD2FA] flex items-center justify-center group-hover:scale-110 transition-transform border border-[#7692FF]/20">
              <ShoppingBag size={18} />
            </div>
            <ChevronRight size={16} className="text-muted-foreground opacity-40 group-hover:opacity-100 group-hover:translate-x-1 transition-all" />
          </div>
          <div className="text-2xl md:text-3xl font-extrabold text-foreground tabular-nums">
            {stats.listed}
          </div>
          <div className="text-xs font-medium text-muted-foreground mt-0.5">
            On Market Sale
          </div>
        </motion.div>

        {/* Saved Contacts */}
        <motion.div
          whileHover={{ y: -3, scale: 1.01 }}
          whileTap={{ scale: 0.98 }}
          onClick={() => router.push("/tools")}
          className="p-5 rounded-3xl ios-card transition-all cursor-pointer group"
        >
          <div className="flex items-center justify-between mb-3">
            <div className="w-10 h-10 rounded-2xl bg-[#ABD2FA]/20 text-[#091540] dark:text-[#ABD2FA] flex items-center justify-center group-hover:scale-110 transition-transform border border-[#ABD2FA]/25">
              <Users size={18} />
            </div>
            <ChevronRight size={16} className="text-muted-foreground opacity-40 group-hover:opacity-100 group-hover:translate-x-1 transition-all" />
          </div>
          <div className="text-2xl md:text-3xl font-extrabold text-foreground tabular-nums">
            {contacts.length}
          </div>
          <div className="text-xs font-medium text-muted-foreground mt-0.5">
            Known Contacts
          </div>
        </motion.div>
      </div>

      {/* ── Two Column: Quick Actions & Recent Activity ── */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* iOS Settings-style Grouped Quick Actions */}
        <div className="rounded-3xl p-6 ios-card">
          <div className="flex items-center gap-2 mb-4 px-1">
            <Zap size={16} className="text-[#1B2CC1] dark:text-[#7692FF]" />
            <h2 className="text-sm font-bold uppercase tracking-wider text-muted-foreground">
              Quick Operations
            </h2>
          </div>

          <div className="space-y-2">
            {[
              {
                title: "Upload & Encrypt File",
                desc: "Encrypt any document with AES-GCM and mint as NFT",
                icon: Shield,
                color: "bg-primary text-white",
                onClick: () => router.push("/vault"),
              },
              {
                title: "Marketplace Exchange",
                desc: "Browse encrypted assets or list your items for sale",
                icon: ShoppingBag,
                color: "bg-[#7692FF] text-white",
                onClick: () => router.push("/market"),
              },
              {
                title: "Encrypted Messaging",
                desc: "Send end-to-end encrypted private messages to any wallet",
                icon: Send,
                color: "bg-background text-white",
                onClick: () => router.push("/messages"),
              },
              {
                title: "Utility Tools & Explorer",
                desc: "Address inspection, EIP-191 document signatures, contacts",
                icon: Activity,
                color: "bg-slate-100 dark:bg-[#7692FF]/20 text-[#1B2CC1] dark:text-[#ABD2FA]",
                onClick: () => router.push("/tools"),
              },
            ].map((action, i) => {
              const Icon = action.icon;
              return (
                <motion.div
                  key={i}
                  whileHover={{ scale: 1.01, x: 2 }}
                  whileTap={{ scale: 0.98 }}
                  onClick={action.onClick}
                  className="flex items-center justify-between p-3.5 rounded-2xl bg-background hover:bg-muted transition-colors cursor-pointer border border-border"
                >
                  <div className="flex items-center gap-3.5 min-w-0">
                    <div className={`w-10 h-10 rounded-2xl ${action.color} flex items-center justify-center shrink-0 shadow-sm border border-transparent dark:border-[#ABD2FA]/20`}>
                      <Icon size={18} />
                    </div>
                    <div className="min-w-0">
                      <p className="text-sm font-bold text-foreground truncate">
                        {action.title}
                      </p>
                      <p className="text-xs text-muted-foreground truncate">
                        {action.desc}
                      </p>
                    </div>
                  </div>
                  <ChevronRight size={16} className="text-muted-foreground shrink-0 ml-2" />
                </motion.div>
              );
            })}
          </div>
        </div>

        {/* Recent Activity Card */}
        <div className="rounded-3xl p-6 ios-card">
          <div className="flex items-center justify-between mb-4 px-1">
            <div className="flex items-center gap-2">
              <Activity size={16} className="text-emerald-500" />
              <h2 className="text-sm font-bold uppercase tracking-wider text-muted-foreground">
                Recent Vault Events
              </h2>
            </div>
            <span className="text-[11px] font-semibold text-muted-foreground">
              Real-time
            </span>
          </div>

          {activities.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-center">
              <div className="w-12 h-12 rounded-full bg-background flex items-center justify-center text-muted-foreground mb-3 border border-border">
                <Activity size={20} />
              </div>
              <p className="text-sm font-semibold text-foreground">No recent activity</p>
              <p className="text-xs text-muted-foreground mt-1">
                Your transactions, uploads, and trades will appear here.
              </p>
            </div>
          ) : (
            <div className="space-y-2">
              {activities.map((item, i) => (
                <div
                  key={item.id || i}
                  className="flex items-center justify-between p-3 rounded-2xl bg-background border border-border"
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="w-2 h-2 rounded-full bg-emerald-500 shrink-0" />
                    <div className="min-w-0">
                      <p className="text-xs font-bold text-foreground truncate">
                        {item.title}
                      </p>
                      <p className="text-[11px] text-muted-foreground truncate">
                        {item.description}
                      </p>
                    </div>
                  </div>
                  <span className="text-[10px] text-muted-foreground shrink-0 font-medium ml-2">
                    {formatRelativeTime(item.timestamp)}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function formatRelativeTime(timestamp: number): string {
  const diff = Date.now() - timestamp;
  if (diff < 60_000) return "just now";
  if (diff < 3_600_000) return `${Math.floor(diff / 60_000)}m ago`;
  if (diff < 86_400_000) return `${Math.floor(diff / 3_600_000)}h ago`;
  return new Date(timestamp).toLocaleDateString("en-GB", { day: "numeric", month: "short" });
}