"use client";

import { useEffect, useState, useMemo } from "react";
import { useRouter } from "next/navigation";
import { useStore } from "@/lib/store";
import { useActivityStore, ACTIVITY_META } from "../../lib/activity-store";
import { useContactsStore } from "../../lib/contact-store";
import { NETWORK_CONFIG } from "../../lib/constants";
import { motion } from "framer-motion";
import {
  LayoutDashboard, TrendingUp, Package, ShoppingBag,
  Clock, MessageSquare, Users, Upload, ArrowUpRight,
  Activity, Zap, Shield, Star, ChevronRight,
} from "lucide-react";

const stagger = {
  container: { animate: { transition: { staggerChildren: 0.06 } } },
  item: { initial: { y: 20, opacity: 0 }, animate: { y: 0, opacity: 1 } },
};

// ✅ FIX 3: Pindah komponen ke luar DashboardPage agar tidak re-create tiap render
// Ini penyebab utama StatCard & QuickAction "hilang" — Framer Motion kehilangan
// referensi komponen karena dianggap elemen baru setiap render.
const StatCard = ({
  label, value, sub, icon: Icon, color, onClick,
}: {
  label: string; value: string | number; sub?: string;
  icon: any; color: string; onClick?: () => void;
}) => (
  <motion.div
    variants={stagger.item}
    onClick={onClick}
    className={`group relative p-5 rounded-[1.75rem] bg-card border border-border/50 overflow-hidden ${onClick ? "cursor-pointer hover:border-primary/30 hover:shadow-lg hover:shadow-black/5 hover:-translate-y-0.5" : ""} transition-all duration-300`}
  >
    <div className={`absolute -top-6 -right-6 w-24 h-24 rounded-full ${color} opacity-[0.07] blur-xl group-hover:opacity-[0.12] transition-opacity`} />
    <div className="flex items-start justify-between mb-3">
      <div className={`w-9 h-9 rounded-xl ${color} bg-opacity-10 flex items-center justify-center`}>
        <Icon size={17} className={color.replace("bg-", "text-")} />
      </div>
      {onClick && <ChevronRight size={14} className="text-muted-foreground/40 group-hover:text-muted-foreground transition-colors mt-1" />}
    </div>
    <div className="text-2xl font-bold text-foreground tracking-tight mb-0.5">{value}</div>
    <div className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">{label}</div>
    {sub && <div className="text-[10px] text-muted-foreground/60 mt-1">{sub}</div>}
  </motion.div>
);

const QuickAction = ({
  label, description, icon: Icon, color, onClick,
}: {
  label: string; description: string; icon: any; color: string; onClick: () => void;
}) => (
  <motion.button
    variants={stagger.item}
    onClick={onClick}
    className="group flex items-center gap-4 p-4 rounded-2xl bg-card border border-border/50 hover:border-primary/20 hover:bg-muted/10 transition-all text-left w-full"
  >
    <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${color} shrink-0`}>
      <Icon size={18} />
    </div>
    <div className="flex-1 min-w-0">
      <p className="font-semibold text-foreground text-sm">{label}</p>
      <p className="text-[11px] text-muted-foreground truncate">{description}</p>
    </div>
    <ArrowUpRight size={14} className="text-muted-foreground/40 group-hover:text-muted-foreground transition-colors shrink-0" />
  </motion.button>
);

export default function DashboardPage() {
  const router = useRouter();
  const { contract, wallet, vaultItems, marketItems, salesItems, balance, startAutoRefresh } = useStore();
  const { getActivities } = useActivityStore();
  const { contacts } = useContactsStore();
  const [mounted, setMounted] = useState(false);

  // ✅ FIX 1: Pisah useEffect — jangan campur setMounted dengan redirect logic.
  // Sebelumnya, setMounted(true) dipanggil bahkan ketika langsung redirect ke "/",
  // menyebabkan flash render sebelum redirect selesai.
  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (!mounted) return;
    if (!contract || !wallet) {
      router.push("/");
      return;
    }
    startAutoRefresh();
  }, [mounted, contract, wallet, router, startAutoRefresh]);

  // ✅ FIX 2: Hapus `mounted` dari dependency array activities.
  // `mounted` bukan data yang relevan untuk activities — hanya menyebabkan
  // memo expired saat mount tapi tidak update saat data berubah.
  const activities = useMemo(
    () => (wallet ? getActivities(wallet.address).slice(0, 8) : []),
    [wallet?.address, getActivities]
  );

  const stats = useMemo(() => {
    if (!wallet) return null;
    const myItems = vaultItems.filter((i) => !i.isListed && !i.isEscrowActive);
    const listed = vaultItems.filter((i) => i.isListed);
    const escrowPending = salesItems.length;
    const portfolioValue = listed.reduce((sum, i) => sum + parseFloat(i.price || "0"), 0);
    const totalItems = vaultItems.length;
    const copies = vaultItems.filter((i) => i.isCopy).length;
    return { myItems: myItems.length, listed: listed.length, escrowPending, portfolioValue, totalItems, copies };
  }, [vaultItems, salesItems, wallet]);

  if (!mounted || !wallet || !stats) return null;

  return (
    <div
      className="absolute inset-0 overflow-y-scroll overscroll-y-contain"
      style={{ WebkitOverflowScrolling: "touch" }}
    >
    <div className="pt-36 px-6 pb-24 max-w-[1400px] mx-auto">

      {/* ── Header ── */}
      <motion.div
        initial={{ opacity: 0, y: -16 }}
        animate={{ opacity: 1, y: 0 }}
        className="mb-10"
      >
        <div className="flex items-center gap-3 mb-2">
          <LayoutDashboard size={18} className="text-muted-foreground" />
          <span className="text-xs font-bold text-muted-foreground uppercase tracking-widest">Overview</span>
        </div>
        <h1 className="text-5xl md:text-6xl font-bold tracking-tighter bg-clip-text text-transparent bg-gradient-to-br from-foreground to-foreground/40 mb-2">
          Dashboard.
        </h1>
        <p className="text-muted-foreground text-sm">
          Wallet{" "}
          <span className="font-mono text-foreground bg-muted/40 px-1.5 py-0.5 rounded-md text-xs">
            {wallet.address.slice(0, 8)}...{wallet.address.slice(-6)}
          </span>{" "}
          · {NETWORK_CONFIG.name}
        </p>
      </motion.div>

      <motion.div variants={stagger.container} initial="initial" animate="animate" className="space-y-8">

        {/* ── Balance Hero ── */}
        <motion.div
          variants={stagger.item}
          className="relative p-7 rounded-[2rem] bg-gradient-to-br from-card via-card to-primary/5 border border-primary/10 overflow-hidden"
        >
          <div className="absolute top-0 right-0 w-64 h-64 bg-primary/5 rounded-full blur-3xl" />
          <div className="absolute bottom-0 left-0 w-48 h-48 bg-indigo-500/5 rounded-full blur-3xl" />
          <div className="relative flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
            <div>
              <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest mb-2 flex items-center gap-1.5">
                <Zap size={10} className="text-amber-400" /> Total Balance
              </p>
              <div className="flex items-end gap-2.5">
                <span className="text-5xl font-bold tracking-tighter text-foreground">
                  {parseFloat(balance).toFixed(4)}
                </span>
                <span className="text-xl font-bold text-muted-foreground mb-1">{NETWORK_CONFIG.tokenSymbol}</span>
              </div>
              <p className="text-xs text-muted-foreground mt-1">Available for transactions</p>
            </div>
            <div className="flex flex-col gap-2 text-right">
              <div className="px-4 py-2 rounded-xl bg-muted/20 border border-border/40">
                <p className="text-[9px] text-muted-foreground uppercase tracking-wider mb-0.5">Portfolio Listed</p>
                <p className="text-lg font-bold text-foreground">
                  {stats.portfolioValue.toFixed(2)} <span className="text-sm text-muted-foreground">{NETWORK_CONFIG.tokenSymbol}</span>
                </p>
              </div>
            </div>
          </div>
        </motion.div>

        {/* ── Stats Grid ── */}
        <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-6 gap-4">
          <StatCard label="Total Asset" value={stats.totalItems} icon={Package}
            color="bg-blue-500" onClick={() => router.push("/vault")} />
          <StatCard label="Di Vault" value={stats.myItems} icon={Shield}
            color="bg-violet-500" onClick={() => router.push("/vault")} />
          <StatCard label="Di-Listing" value={stats.listed}
            sub={`${stats.portfolioValue.toFixed(2)} ${NETWORK_CONFIG.tokenSymbol}`}
            icon={Star} color="bg-amber-500" onClick={() => router.push("/market")} />
          <StatCard label="Escrow Aktif" value={stats.escrowPending} icon={Clock}
            color="bg-orange-500" onClick={() => router.push("/vault")} />
          <StatCard label="Contacts" value={contacts.length} icon={Users}
            color="bg-emerald-500" />
          <StatCard label="Aktivitas" value={activities.length} icon={Activity}
            color="bg-pink-500" />
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">

          {/* ── Activity Feed ── */}
          <div>
            <div className="flex items-center justify-between mb-4">
              <h2 className="font-bold text-foreground flex items-center gap-2">
                <Activity size={16} className="text-muted-foreground" /> Aktivitas Terbaru
              </h2>
            </div>
            <div className="space-y-2">
              {activities.length === 0 ? (
                <div className="p-8 rounded-2xl bg-muted/10 border border-dashed border-border/50 text-center">
                  <p className="text-sm text-muted-foreground">Belum ada aktivitas</p>
                </div>
              ) : (
                activities.map((a) => {
                  const meta = ACTIVITY_META[a.type];
                  return (
                    <motion.div
                      key={a.id}
                      variants={stagger.item}
                      className="flex items-center gap-3 p-3.5 rounded-2xl bg-card border border-border/40 hover:border-border/70 transition-colors"
                    >
                      <div className="w-8 h-8 rounded-xl bg-muted/30 flex items-center justify-center text-base shrink-0">
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-semibold text-foreground truncate">{a.title}</p>
                        <p className="text-[11px] text-muted-foreground truncate">{a.description}</p>
                      </div>
                      <div className="text-[10px] text-muted-foreground/60 shrink-0">
                        {formatTime(a.timestamp)}
                      </div>
                    </motion.div>
                  );
                })
              )}
            </div>
          </div>

          {/* ── Quick Actions ── */}
          <div>
            <div className="flex items-center justify-between mb-4">
              <h2 className="font-bold text-foreground flex items-center gap-2">
                <Zap size={16} className="text-muted-foreground" /> Aksi Cepat
              </h2>
            </div>
            <div className="flex flex-col gap-2.5">
              <QuickAction
                label="Upload & Enkripsi File"
                description="Simpan file terenkripsi ke vault"
                icon={Upload}
                color="bg-blue-500/10 text-blue-400"
                onClick={() => router.push("/vault")}
              />
              <QuickAction
                label="Jual Asset"
                description="Listing asset ke marketplace"
                icon={ShoppingBag}
                color="bg-amber-500/10 text-amber-400"
                onClick={() => router.push("/market")}
              />
              <QuickAction
                label="Kirim Pesan"
                description="Chat terenkripsi ke wallet manapun"
                icon={MessageSquare}
                color="bg-emerald-500/10 text-emerald-400"
                onClick={() => router.push("/messages")}
              />
              <QuickAction
                label="Lihat Portfolio"
                description={`${stats.listed} asset listed · ${stats.portfolioValue.toFixed(2)} ${NETWORK_CONFIG.tokenSymbol}`}
                icon={TrendingUp}
                color="bg-violet-500/10 text-violet-400"
                onClick={() => router.push("/vault")}
              />
            </div>

            {/* Market snapshot */}
            <div className="mt-4 p-4 rounded-2xl bg-muted/10 border border-border/40">
              <div className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider mb-3 flex items-center gap-1.5">
                <div className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                Market Sekarang
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">Total listing</span>
                <span className="font-bold text-foreground">{marketItems.length} asset</span>
              </div>
              <div className="flex items-center justify-between mt-1">
                <span className="text-sm text-muted-foreground">Update</span>
                <span className="text-xs text-muted-foreground">Tiap 4 detik</span>
              </div>
            </div>
          </div>
        </div>
      </motion.div>
    </div></div>
  );
}

function formatTime(timestamp: number): string {
  const diff = Date.now() - timestamp;
  if (diff < 60_000) return "baru saja";
  if (diff < 3_600_000) return `${Math.floor(diff / 60_000)}m lalu`;
  if (diff < 86_400_000) return `${Math.floor(diff / 3_600_000)}j lalu`;
  return new Date(timestamp).toLocaleDateString("id-ID", { day: "numeric", month: "short" });
}