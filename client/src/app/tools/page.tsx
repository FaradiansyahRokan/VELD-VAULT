"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useStore } from "@/lib/store";
import { useActivityStore, ACTIVITY_META, type ActivityType } from "@/lib/activity-store";
import { motion, AnimatePresence } from "framer-motion";
import {
  Wrench, Users, FileText, Activity, QrCode, Filter,
  ChevronRight, Trash2, ExternalLink
} from "lucide-react";
import ContactsBook from "@/components/ContactsBook";
import DocumentSigner from "@/components/DocumentSigner";
import QRModal from "@/components/QRModal";
import { NETWORK_CONFIG } from "@/lib/constants";

type Tab = "activity" | "contacts" | "signer" | "qr";

const TABS: { id: Tab; label: string; icon: React.ElementType; desc: string }[] = [
  { id: "activity", label: "Aktivitas", icon: Activity, desc: "Log semua transaksi & aksi" },
  { id: "contacts", label: "Kontak", icon: Users, desc: "Address book wallet" },
  { id: "signer", label: "Penanda Tangan", icon: FileText, desc: "Sign & verifikasi dokumen" },
  { id: "qr", label: "QR Code", icon: QrCode, desc: "Terima pembayaran" },
];

const FILTER_OPTIONS: { value: ActivityType | "all"; label: string }[] = [
  { value: "all", label: "Semua" },
  { value: "upload", label: "Upload" },
  { value: "buy", label: "Beli" },
  { value: "sell", label: "Jual" },
  { value: "message_sent", label: "Pesan" },
  { value: "sign", label: "Sign" },
  { value: "faucet", label: "Faucet" },
];

export default function ToolsPage() {
  const router = useRouter();
  const { contract, wallet } = useStore();
  const { getActivities, clearActivities } = useActivityStore();
  const [tab, setTab] = useState<Tab>("activity");
  const [filter, setFilter] = useState<ActivityType | "all">("all");
  const [showQR, setShowQR] = useState(false);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    if (!contract || !wallet) { router.push("/"); }
  }, [contract, wallet, router]);

  if (!mounted || !wallet) return null;

  const allActivities = getActivities(wallet.address);
  const filtered = filter === "all" ? allActivities : allActivities.filter((a) => a.type === filter);

  return (
    <div className="min-h-screen pt-36 px-6 pb-24 max-w-[1200px] mx-auto">
      {/* Header */}
      <motion.div initial={{ opacity: 0, y: -16 }} animate={{ opacity: 1, y: 0 }} className="mb-8">
        <div className="flex items-center gap-3 mb-2">
          <Wrench size={18} className="text-muted-foreground" />
          <span className="text-xs font-bold text-muted-foreground uppercase tracking-widest">Utilitas</span>
        </div>
        <h1 className="text-5xl font-bold tracking-tighter bg-clip-text text-transparent bg-gradient-to-br from-foreground to-foreground/40">
          Tools.
        </h1>
      </motion.div>

      <div className="flex flex-col lg:flex-row gap-6">
        {/* ── Sidebar tabs ── */}
        <motion.div
          initial={{ x: -20, opacity: 0 }}
          animate={{ x: 0, opacity: 1 }}
          className="lg:w-64 shrink-0"
        >
          <div className="flex flex-row lg:flex-col gap-2">
            {TABS.map((t) => {
              const Icon = t.icon;
              const isActive = tab === t.id;
              return (
                <button
                  key={t.id}
                  onClick={() => t.id === "qr" ? setShowQR(true) : setTab(t.id)}
                  className={`flex items-center gap-3 p-3.5 rounded-2xl text-left transition-all w-full ${
                    isActive
                      ? "bg-primary text-primary-foreground shadow-lg shadow-primary/20"
                      : "bg-card border border-border/50 text-muted-foreground hover:text-foreground hover:border-border/80"
                  }`}
                >
                  <Icon size={17} />
                  <div className="hidden lg:block min-w-0 flex-1">
                    <p className={`text-sm font-bold truncate ${isActive ? "text-primary-foreground" : "text-foreground"}`}>
                      {t.label}
                    </p>
                    <p className={`text-[10px] truncate ${isActive ? "text-primary-foreground/70" : "text-muted-foreground"}`}>
                      {t.desc}
                    </p>
                  </div>
                  {isActive && <ChevronRight size={14} className="shrink-0 hidden lg:block" />}
                </button>
              );
            })}
          </div>

          {/* Wallet snapshot */}
          <div className="hidden lg:block mt-4 p-4 rounded-2xl bg-card border border-border/40">
            <p className="text-[9px] font-bold text-muted-foreground uppercase tracking-widest mb-2">Wallet Aktif</p>
            <code className="text-[10px] font-mono text-foreground break-all leading-relaxed">
              {wallet.address}
            </code>
            <div className="mt-2 pt-2 border-t border-border/40">
              <p className="text-[9px] text-muted-foreground">{NETWORK_CONFIG.name} · Chain {NETWORK_CONFIG.chainId}</p>
            </div>
          </div>
        </motion.div>

        {/* ── Main content ── */}
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex-1 bg-card border border-border/50 rounded-[2rem] overflow-hidden"
        >
          <AnimatePresence mode="wait">

            {/* ── ACTIVITY TAB ── */}
            {tab === "activity" && (
              <motion.div
                key="activity"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="h-full"
              >
                {/* Header */}
                <div className="flex items-center justify-between p-5 border-b border-border/50">
                  <div>
                    <h2 className="font-bold text-foreground">Log Aktivitas</h2>
                    <p className="text-[11px] text-muted-foreground mt-0.5">{allActivities.length} total aktivitas</p>
                  </div>
                  {allActivities.length > 0 && (
                    <button
                      onClick={() => {
                        if (confirm("Hapus semua log aktivitas?")) clearActivities(wallet.address);
                      }}
                      className="flex items-center gap-1.5 text-[11px] text-muted-foreground hover:text-red-400 transition-colors"
                    >
                      <Trash2 size={12} /> Hapus Semua
                    </button>
                  )}
                </div>

                {/* Filter chips */}
                <div className="flex gap-2 px-5 py-3 border-b border-border/30 overflow-x-auto">
                  <Filter size={13} className="text-muted-foreground shrink-0 mt-0.5" />
                  {FILTER_OPTIONS.map((f) => (
                    <button
                      key={f.value}
                      onClick={() => setFilter(f.value)}
                      className={`shrink-0 px-3 py-1 rounded-full text-[11px] font-bold transition-all ${
                        filter === f.value
                          ? "bg-primary text-primary-foreground"
                          : "bg-muted/30 text-muted-foreground hover:bg-muted/60"
                      }`}
                    >
                      {f.label}
                    </button>
                  ))}
                </div>

                {/* Activity list */}
                <div className="overflow-y-auto max-h-[calc(100vh-20rem)]">
                  {filtered.length === 0 ? (
                    <div className="flex flex-col items-center justify-center py-16 gap-3 text-center">
                      <Activity size={32} className="text-muted-foreground/20" />
                      <p className="text-sm text-muted-foreground">Belum ada aktivitas</p>
                    </div>
                  ) : (
                    filtered.map((a, i) => {
                      const meta = ACTIVITY_META[a.type];
                      return (
                        <div
                          key={a.id}
                          className="flex items-start gap-3 px-5 py-3.5 border-b border-border/30 last:border-0 hover:bg-muted/10 transition-colors group"
                        >
                          {/* Line connector */}
                          <div className="flex flex-col items-center shrink-0">
                            <div className="w-8 h-8 rounded-xl bg-muted/30 flex items-center justify-center text-base">
                              {meta.emoji}
                            </div>
                            {i < filtered.length - 1 && (
                              <div className="w-px h-full min-h-[16px] bg-border/30 mt-1" />
                            )}
                          </div>

                          <div className="flex-1 min-w-0 pt-0.5">
                            <div className="flex items-start justify-between gap-2">
                              <p className="text-sm font-semibold text-foreground">{a.title}</p>
                              <span className="text-[10px] text-muted-foreground/60 shrink-0">
                                {new Date(a.timestamp).toLocaleDateString("id-ID", {
                                  day: "numeric", month: "short",
                                  hour: "2-digit", minute: "2-digit",
                                })}
                              </span>
                            </div>
                            <p className="text-[11px] text-muted-foreground mt-0.5">{a.description}</p>
                            <div className="flex items-center gap-3 mt-1">
                              {a.tokenId !== undefined && (
                                <span className="text-[10px] text-muted-foreground/60">Token #{a.tokenId}</span>
                              )}
                              {a.amount && (
                                <span className="text-[10px] font-bold text-emerald-500">{a.amount} {NETWORK_CONFIG.tokenSymbol}</span>
                              )}
                              {a.txHash && (
                                <a
                                  href={`${NETWORK_CONFIG.explorerUrl}/tx/${a.txHash}`}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="text-[10px] text-primary flex items-center gap-0.5 hover:underline"
                                >
                                  Tx <ExternalLink size={8} />
                                </a>
                              )}
                            </div>
                          </div>
                        </div>
                      );
                    })
                  )}
                </div>
              </motion.div>
            )}

            {/* ── CONTACTS TAB ── */}
            {tab === "contacts" && (
              <motion.div
                key="contacts"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="p-6"
              >
                <ContactsBook />
              </motion.div>
            )}

            {/* ── DOCUMENT SIGNER TAB ── */}
            {tab === "signer" && (
              <motion.div
                key="signer"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="p-6"
              >
                <div className="mb-5">
                  <h2 className="font-bold text-foreground text-lg">Penanda Tangan Dokumen</h2>
                  <p className="text-sm text-muted-foreground mt-1">
                    Sign dokumen dengan wallet kamu. Siapapun bisa verifikasi tanpa tahu private key kamu.
                  </p>
                </div>
                <DocumentSigner />
              </motion.div>
            )}

          </AnimatePresence>
        </motion.div>
      </div>

      {/* QR Modal */}
      <QRModal
        isOpen={showQR}
        onClose={() => setShowQR(false)}
        address={wallet.address}
        label="Terima VELD"
      />
    </div>
  );
}