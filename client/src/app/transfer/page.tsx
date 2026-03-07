"use client";

import { useState, useEffect, useMemo } from "react";
import { useRouter } from "next/navigation";
import { useStore } from "@/lib/store";
import { useContactsStore } from "@/lib/contact-store";
import { useActivityStore } from "@/lib/activity-store";
import { NETWORK_CONFIG } from "@/lib/constants";
import { ethers } from "ethers";
import { motion, AnimatePresence } from "framer-motion";
import { toast } from "sonner";
import {
  ArrowLeft, Send, Search, Check, X, AlertTriangle,
  UserCircle2, Wallet, Clock, ChevronRight, Zap,
  ArrowUpRight, Users, QrCode,
} from "lucide-react";
import QRModal from "@/components/QRModal";

// ── Recent transfers (localStorage) ──────────────────────────
const RECENT_KEY = "cv_recent_transfers";

interface RecentEntry {
  address: string;
  amount: string;
  timestamp: number;
}

function loadRecent(): RecentEntry[] {
  if (typeof window === "undefined") return [];
  try { return JSON.parse(localStorage.getItem(RECENT_KEY) || "[]"); } catch { return []; }
}

function saveRecent(address: string, amount: string) {
  const prev = loadRecent().filter((r) => r.address.toLowerCase() !== address.toLowerCase());
  const next = [{ address: address.toLowerCase(), amount, timestamp: Date.now() }, ...prev].slice(0, 8);
  try { localStorage.setItem(RECENT_KEY, JSON.stringify(next)); } catch {}
}

// ── Steps ─────────────────────────────────────────────────────
type Step = "input" | "confirm" | "success";

// ── Stagger helper ────────────────────────────────────────────
const item = { initial: { y: 16, opacity: 0 }, animate: { y: 0, opacity: 1 } };

// ─────────────────────────────────────────────────────────────
export default function TransferPage() {
  const router = useRouter();
  const { wallet, signer, balance, refreshBalance } = useStore();
  const { contacts, getByAddress } = useContactsStore();
  const { addActivity } = useActivityStore();

  const [mounted, setMounted] = useState(false);
  const [step, setStep] = useState<Step>("input");
  const [toAddress, setToAddress] = useState("");
  const [amount, setAmount] = useState("");
  const [search, setSearch] = useState("");
  const [sending, setSending] = useState(false);
  const [txHash, setTxHash] = useState("");
  const [recent, setRecent] = useState<RecentEntry[]>([]);
  const [showQR, setShowQR] = useState(false);
  const [contactTab, setContactTab] = useState<"contacts" | "recent">("contacts");

  useEffect(() => {
    setMounted(true);
    if (!wallet) { router.push("/"); return; }
    refreshBalance();
    setRecent(loadRecent());
  }, [wallet, router, refreshBalance]);

  // ── Validation ────────────────────────────────────────────
  const balanceNum = parseFloat(balance) || 0;
  const amountNum  = parseFloat(amount || "0");

  // Estimasi gas: 21000 gas × 30 gwei
  const GAS_COST = parseFloat(ethers.formatEther(BigInt(21_000) * ethers.parseUnits("30", "gwei")));
  const maxSendable = Math.max(0, balanceNum - GAS_COST);

  const isValidAddress = ethers.isAddress(toAddress.trim());
  const isSelf = toAddress.trim().toLowerCase() === wallet?.address.toLowerCase();

  const addressError = useMemo(() => {
    if (!toAddress) return null;
    if (!isValidAddress) return "Format address tidak valid";
    if (isSelf) return "Tidak bisa transfer ke wallet sendiri";
    return null;
  }, [toAddress, isValidAddress, isSelf]);

  const amountError = useMemo(() => {
    if (!amount) return null;
    if (amountNum <= 0) return "Jumlah harus lebih dari 0";
    if (amountNum > maxSendable)
      return `Tidak cukup (maks ${maxSendable.toFixed(4)} ${NETWORK_CONFIG.tokenSymbol})`;
    return null;
  }, [amount, amountNum, maxSendable]);

  const canContinue = isValidAddress && !isSelf && amountNum > 0 && !amountError;

  // ── Filtered contacts ─────────────────────────────────────
  const filteredContacts = search
    ? contacts.filter(
        (c) =>
          c.name.toLowerCase().includes(search.toLowerCase()) ||
          c.address.toLowerCase().includes(search.toLowerCase())
      )
    : contacts;

  // ── Send ─────────────────────────────────────────────────
  const handleSend = async () => {
    if (!signer || !wallet || !canContinue) return;
    setSending(true);
    try {
      const tx = await (signer as ethers.Wallet).sendTransaction({
        to: toAddress.trim(),
        value: ethers.parseEther(amount),
        maxFeePerGas: ethers.parseUnits("30", "gwei"),
        maxPriorityFeePerGas: ethers.parseUnits("1", "gwei"),
        gasLimit: 21_000,
      });

      setTxHash(tx.hash);
      await tx.wait();

      saveRecent(toAddress.trim(), amount);
      setRecent(loadRecent());

      addActivity({
        type: "transfer_out",
        title: "Token dikirim",
        description: `${amount} ${NETWORK_CONFIG.tokenSymbol} → ${toAddress.trim().slice(0, 6)}...${toAddress.trim().slice(-4)}`,
        walletAddress: wallet.address,
        amount,
        address: toAddress.trim(),
      });

      await refreshBalance();
      setStep("success");
    } catch (e: any) {
      const msg = e?.message || "Transfer gagal";
      toast.error(msg.length > 120 ? "Transfer gagal. Cek konsol untuk detail." : msg);
      console.error(e);
    } finally {
      setSending(false);
    }
  };

  const handleReset = () => {
    setStep("input");
    setToAddress("");
    setAmount("");
    setTxHash("");
  };

  const contact = getByAddress(toAddress.trim());

  if (!mounted || !wallet) return null;

  return (
    <div className="min-h-screen pt-32 pb-24 px-4">
      <div className="max-w-lg mx-auto">

        {/* ── Page header ────────────────────────────── */}
        <motion.div
          initial={{ opacity: 0, y: -12 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-8"
        >
          <button
            onClick={() => router.back()}
            className="flex items-center gap-2 text-muted-foreground hover:text-foreground transition-colors text-sm mb-6"
          >
            <ArrowLeft size={14} /> Kembali
          </button>

          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-11 h-11 rounded-[1.2rem] bg-foreground flex items-center justify-center">
                <Send size={18} className="text-background" strokeWidth={2.5} />
              </div>
              <div>
                <h1 className="text-2xl font-bold tracking-tight text-foreground leading-tight">Kirim Token</h1>
                <p className="text-xs text-muted-foreground">
                  {NETWORK_CONFIG.name} · {NETWORK_CONFIG.tokenSymbol}
                </p>
              </div>
            </div>

            {/* QR button — receive own address */}
            <button
              onClick={() => setShowQR(true)}
              className="flex items-center gap-2 h-9 px-3.5 rounded-xl border border-border/50 bg-muted/20 text-muted-foreground hover:text-foreground hover:border-border/80 transition-all text-xs font-bold"
            >
              <QrCode size={13} /> Terima
            </button>
          </div>
        </motion.div>

        {/* ══════════════════════════════════════════════
            STEP: INPUT
        ══════════════════════════════════════════════ */}
        <AnimatePresence mode="wait">
          {step === "input" && (
            <motion.div
              key="input"
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 20 }}
              transition={{ duration: 0.2 }}
              className="space-y-5"
            >

              {/* Balance card */}
              <motion.div variants={item} initial="initial" animate="animate"
                className="p-5 rounded-[1.75rem] bg-card border border-border/50 flex items-center justify-between"
              >
                <div>
                  <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest mb-1.5 flex items-center gap-1.5">
                    <Wallet size={9} /> Saldo Kamu
                  </p>
                  <div className="flex items-end gap-1.5">
                    <span className="text-3xl font-bold tracking-tighter text-foreground leading-none">
                      {balanceNum.toFixed(4)}
                    </span>
                    <span className="text-sm font-bold text-muted-foreground mb-0.5">
                      {NETWORK_CONFIG.tokenSymbol}
                    </span>
                  </div>
                  <p className="text-[10px] text-muted-foreground/60 mt-1.5">
                    Maks kirim: <span className="font-semibold text-muted-foreground">{maxSendable.toFixed(4)}</span> (setelah gas)
                  </p>
                </div>
                <div className="w-12 h-12 rounded-2xl bg-muted/20 flex items-center justify-center">
                  <Zap size={20} className="text-amber-400" />
                </div>
              </motion.div>

              {/* To address */}
              <motion.div variants={item} initial="initial" animate="animate" transition={{ delay: 0.05 }}
                className="space-y-2"
              >
                <label className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest ml-1">
                  Kirim ke
                </label>

                <div className="relative">
                  <input
                    value={toAddress}
                    onChange={(e) => setToAddress(e.target.value)}
                    placeholder="0x... atau pilih kontak di bawah"
                    spellCheck={false}
                    className={`w-full h-14 px-4 pr-12 rounded-2xl bg-muted/40 border text-sm font-mono text-foreground placeholder:text-muted-foreground/40 outline-none focus:ring-2 transition-all ${
                      addressError
                        ? "border-red-500/40 focus:ring-red-500/15"
                        : toAddress && !addressError
                        ? "border-emerald-500/40 focus:ring-emerald-500/15"
                        : "border-transparent focus:border-primary/20 focus:ring-primary/10"
                    }`}
                  />
                  <div className="absolute right-4 top-1/2 -translate-y-1/2">
                    {toAddress && (
                      addressError
                        ? <X size={14} className="text-red-400" />
                        : <Check size={14} className="text-emerald-400" />
                    )}
                  </div>
                </div>

                {/* Contact name badge */}
                <AnimatePresence>
                  {contact && !addressError && (
                    <motion.div
                      initial={{ opacity: 0, y: -6 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -6 }}
                      className="flex items-center gap-2 px-3.5 py-2 rounded-xl bg-emerald-500/8 border border-emerald-500/20"
                    >
                      <span className="text-base leading-none">{contact.emoji}</span>
                      <span className="text-xs font-bold text-emerald-600 dark:text-emerald-400">{contact.name}</span>
                    </motion.div>
                  )}
                </AnimatePresence>

                {addressError && (
                  <p className="text-xs text-red-400 flex items-center gap-1.5 ml-1">
                    <AlertTriangle size={11} /> {addressError}
                  </p>
                )}
              </motion.div>

              {/* Amount */}
              <motion.div variants={item} initial="initial" animate="animate" transition={{ delay: 0.08 }}
                className="space-y-2"
              >
                <label className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest ml-1">
                  Jumlah ({NETWORK_CONFIG.tokenSymbol})
                </label>

                <div className="relative">
                  <input
                    type="number"
                    value={amount}
                    onChange={(e) => setAmount(e.target.value)}
                    placeholder="0.0"
                    min="0"
                    step="0.0001"
                    className={`w-full h-14 px-4 pr-24 rounded-2xl bg-muted/40 border text-2xl font-bold text-foreground placeholder:text-muted-foreground/25 outline-none focus:ring-2 transition-all [appearance:textfield] [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none ${
                      amountError
                        ? "border-red-500/40 focus:ring-red-500/15"
                        : amount && !amountError
                        ? "border-emerald-500/40 focus:ring-emerald-500/15"
                        : "border-transparent focus:border-primary/20 focus:ring-primary/10"
                    }`}
                  />
                  <button
                    onClick={() => setAmount(maxSendable.toFixed(6))}
                    className="absolute right-3 top-1/2 -translate-y-1/2 px-3 py-1.5 rounded-lg bg-foreground/10 text-foreground text-[10px] font-bold hover:bg-foreground/20 transition-colors"
                  >
                    MAKS
                  </button>
                </div>

                {amountError && (
                  <p className="text-xs text-red-400 flex items-center gap-1.5 ml-1">
                    <AlertTriangle size={11} /> {amountError}
                  </p>
                )}
                {amount && !amountError && (
                  <p className="text-[10px] text-muted-foreground/60 ml-1 flex items-center gap-1">
                    <Zap size={9} className="text-amber-400" />
                    Estimasi gas: ~{GAS_COST.toFixed(5)} {NETWORK_CONFIG.tokenSymbol}
                  </p>
                )}
              </motion.div>

              {/* Continue CTA */}
              <motion.div variants={item} initial="initial" animate="animate" transition={{ delay: 0.1 }}>
                <button
                  onClick={() => setStep("confirm")}
                  disabled={!canContinue}
                  className="w-full h-14 rounded-2xl bg-foreground text-background font-bold text-sm flex items-center justify-center gap-2 hover:opacity-90 disabled:opacity-25 disabled:cursor-not-allowed transition-all"
                >
                  Review Transfer <ArrowUpRight size={16} />
                </button>
              </motion.div>

              {/* ── Contact Picker ──────────────────── */}
              {(contacts.length > 0 || recent.length > 0) && (
                <motion.div variants={item} initial="initial" animate="animate" transition={{ delay: 0.13 }}
                  className="space-y-3 pt-2"
                >
                  {/* Tabs */}
                  <div className="flex bg-muted/30 p-1 rounded-[1.2rem]">
                    {([
                      { id: "contacts", label: "Kontak", icon: Users, count: contacts.length },
                      { id: "recent",   label: "Terakhir", icon: Clock, count: recent.length },
                    ] as const).map((tab) => (
                      <button
                        key={tab.id}
                        onClick={() => setContactTab(tab.id)}
                        className={`flex-1 flex items-center justify-center gap-1.5 h-9 rounded-[1rem] text-xs font-bold transition-all ${
                          contactTab === tab.id
                            ? "bg-background text-foreground shadow-sm"
                            : "text-muted-foreground hover:text-foreground"
                        }`}
                      >
                        <tab.icon size={11} />
                        {tab.label}
                        {tab.count > 0 && (
                          <span className={`text-[9px] px-1.5 py-0.5 rounded-full font-bold ${
                            contactTab === tab.id
                              ? "bg-primary/10 text-primary"
                              : "bg-muted text-muted-foreground"
                          }`}>
                            {tab.count}
                          </span>
                        )}
                      </button>
                    ))}
                  </div>

                  {/* Search (contacts only) */}
                  {contactTab === "contacts" && contacts.length > 3 && (
                    <div className="relative">
                      <Search size={12} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-muted-foreground" />
                      <input
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                        placeholder="Cari nama atau address..."
                        className="w-full h-9 pl-8 pr-4 rounded-xl bg-muted/20 border border-border/30 text-xs text-foreground placeholder:text-muted-foreground/40 outline-none"
                      />
                    </div>
                  )}

                  {/* Contact list */}
                  <AnimatePresence mode="wait">
                    {contactTab === "contacts" && (
                      <motion.div
                        key="contacts-tab"
                        initial={{ opacity: 0, y: 4 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -4 }}
                        className="space-y-1.5"
                      >
                        {filteredContacts.length === 0 ? (
                          <p className="text-center text-xs text-muted-foreground py-6">
                            {search ? "Tidak ada yang cocok" : "Belum ada kontak"}
                          </p>
                        ) : (
                          filteredContacts.map((c) => {
                            const selected = toAddress.toLowerCase() === c.address.toLowerCase();
                            return (
                              <button
                                key={c.id}
                                onClick={() => setToAddress(c.address)}
                                className={`w-full flex items-center gap-3 p-3.5 rounded-2xl border transition-all text-left ${
                                  selected
                                    ? "bg-primary/5 border-primary/30"
                                    : "bg-card border-border/40 hover:border-border/70"
                                }`}
                              >
                                <div className="w-10 h-10 rounded-xl bg-muted/30 flex items-center justify-center text-xl shrink-0">
                                  {c.emoji}
                                </div>
                                <div className="flex-1 min-w-0">
                                  <p className="text-sm font-semibold text-foreground truncate">{c.name}</p>
                                  <p className="text-[10px] font-mono text-muted-foreground truncate">
                                    {c.address.slice(0, 12)}...{c.address.slice(-8)}
                                  </p>
                                </div>
                                {selected
                                  ? <Check size={14} className="text-primary shrink-0" />
                                  : <ChevronRight size={14} className="text-muted-foreground/30 shrink-0" />
                                }
                              </button>
                            );
                          })
                        )}
                      </motion.div>
                    )}

                    {contactTab === "recent" && (
                      <motion.div
                        key="recent-tab"
                        initial={{ opacity: 0, y: 4 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -4 }}
                        className="space-y-1.5"
                      >
                        {recent.length === 0 ? (
                          <p className="text-center text-xs text-muted-foreground py-6">Belum ada riwayat transfer</p>
                        ) : (
                          recent.map((r) => {
                            const rc = getByAddress(r.address);
                            return (
                              <button
                                key={r.address}
                                onClick={() => {
                                  setToAddress(r.address);
                                  setAmount(r.amount);
                                }}
                                className="w-full flex items-center gap-3 p-3.5 rounded-2xl border border-border/40 bg-card hover:border-border/70 transition-all text-left"
                              >
                                <div className="w-10 h-10 rounded-xl bg-muted/20 flex items-center justify-center shrink-0">
                                  {rc
                                    ? <span className="text-xl">{rc.emoji}</span>
                                    : <UserCircle2 size={18} className="text-muted-foreground" />
                                  }
                                </div>
                                <div className="flex-1 min-w-0">
                                  <p className="text-sm font-semibold text-foreground truncate">
                                    {rc?.name || `${r.address.slice(0, 8)}...${r.address.slice(-6)}`}
                                  </p>
                                  <p className="text-[10px] text-muted-foreground">
                                    {new Date(r.timestamp).toLocaleDateString("id-ID", {
                                      day: "numeric", month: "short",
                                    })}
                                  </p>
                                </div>
                                <div className="text-right shrink-0">
                                  <p className="text-sm font-bold text-foreground">{r.amount}</p>
                                  <p className="text-[9px] text-muted-foreground">{NETWORK_CONFIG.tokenSymbol}</p>
                                </div>
                                <ChevronRight size={13} className="text-muted-foreground/30 shrink-0" />
                              </button>
                            );
                          })
                        )}
                      </motion.div>
                    )}
                  </AnimatePresence>
                </motion.div>
              )}
            </motion.div>
          )}

          {/* ══════════════════════════════════════════════
              STEP: CONFIRM
          ══════════════════════════════════════════════ */}
          {step === "confirm" && (
            <motion.div
              key="confirm"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              transition={{ duration: 0.2 }}
              className="space-y-5"
            >
              <button
                onClick={() => setStep("input")}
                className="flex items-center gap-2 text-muted-foreground hover:text-foreground transition-colors text-sm"
              >
                <ArrowLeft size={14} /> Edit
              </button>

              {/* Summary card */}
              <div className="p-6 rounded-[2rem] bg-card border border-border/50 space-y-5">
                <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">
                  Konfirmasi Transfer
                </p>

                {/* Amount center display */}
                <div className="text-center py-6 border-b border-border/30">
                  <p className="text-5xl font-bold tracking-tighter text-foreground leading-none mb-2">
                    {parseFloat(amount).toFixed(4)}
                  </p>
                  <p className="text-lg font-bold text-muted-foreground">{NETWORK_CONFIG.tokenSymbol}</p>
                </div>

                {/* Details rows */}
                <div className="space-y-3.5">
                  <div className="flex items-center justify-between">
                    <span className="text-xs text-muted-foreground">Dari</span>
                    <div className="flex items-center gap-2">
                      <div className="w-5 h-5 rounded-full bg-muted/40 flex items-center justify-center">
                        <Wallet size={10} className="text-muted-foreground" />
                      </div>
                      <span className="text-xs font-mono text-foreground">
                        {wallet.address.slice(0, 8)}...{wallet.address.slice(-6)}
                      </span>
                    </div>
                  </div>

                  <div className="flex items-center justify-between">
                    <span className="text-xs text-muted-foreground">Ke</span>
                    <div className="flex items-center gap-2">
                      {contact && (
                        <span className="text-base leading-none">{contact.emoji}</span>
                      )}
                      <div className="text-right">
                        {contact && (
                          <p className="text-[10px] font-bold text-foreground">{contact.name}</p>
                        )}
                        <p className="text-xs font-mono text-muted-foreground">
                          {toAddress.slice(0, 8)}...{toAddress.slice(-6)}
                        </p>
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center justify-between">
                    <span className="text-xs text-muted-foreground">Network</span>
                    <span className="text-xs font-bold text-foreground">{NETWORK_CONFIG.name}</span>
                  </div>

                  <div className="flex items-center justify-between">
                    <span className="text-xs text-muted-foreground">Estimasi Gas</span>
                    <span className="text-xs text-muted-foreground font-mono">
                      ~{GAS_COST.toFixed(5)} {NETWORK_CONFIG.tokenSymbol}
                    </span>
                  </div>
                </div>

                {/* Total */}
                <div className="flex items-center justify-between px-4 py-3.5 rounded-xl bg-muted/20 border border-border/40">
                  <span className="text-sm font-bold text-foreground">Total Keluar</span>
                  <span className="text-sm font-bold text-foreground font-mono">
                    ~{(amountNum + GAS_COST).toFixed(5)}{" "}
                    <span className="font-normal text-muted-foreground">{NETWORK_CONFIG.tokenSymbol}</span>
                  </span>
                </div>
              </div>

              {/* Warning */}
              <div className="flex items-start gap-2.5 p-4 rounded-2xl bg-amber-500/5 border border-amber-500/20">
                <AlertTriangle size={13} className="text-amber-400 mt-0.5 shrink-0" />
                <p className="text-[11px] text-muted-foreground leading-relaxed">
                  Transaksi blockchain bersifat permanen dan tidak bisa dibatalkan. Pastikan address tujuan sudah benar.
                </p>
              </div>

              {/* Confirm */}
              <button
                onClick={handleSend}
                disabled={sending}
                className="w-full h-14 rounded-2xl bg-foreground text-background font-bold text-sm flex items-center justify-center gap-2 hover:opacity-90 disabled:opacity-60 transition-all"
              >
                {sending ? (
                  <>
                    <div className="w-4 h-4 border-2 border-background/30 border-t-background rounded-full animate-spin" />
                    Mengirim...
                  </>
                ) : (
                  <><Send size={15} /> Kirim Sekarang</>
                )}
              </button>

              <button
                onClick={() => setStep("input")}
                disabled={sending}
                className="w-full h-11 text-muted-foreground text-sm hover:text-foreground transition-colors"
              >
                Batal
              </button>
            </motion.div>
          )}

          {/* ══════════════════════════════════════════════
              STEP: SUCCESS
          ══════════════════════════════════════════════ */}
          {step === "success" && (
            <motion.div
              key="success"
              initial={{ opacity: 0, scale: 0.97 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ type: "spring", stiffness: 300, damping: 24 }}
              className="space-y-5 text-center"
            >
              {/* Success icon */}
              <motion.div
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                transition={{ type: "spring", stiffness: 280, damping: 18, delay: 0.1 }}
                className="w-28 h-28 rounded-[2.5rem] bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center mx-auto"
              >
                <motion.div
                  initial={{ opacity: 0, scale: 0.5 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ delay: 0.25 }}
                >
                  <Check size={48} className="text-emerald-500" strokeWidth={2.5} />
                </motion.div>
              </motion.div>

              <div>
                <h2 className="text-2xl font-bold text-foreground tracking-tight mb-2">Transfer Berhasil!</h2>
                <p className="text-muted-foreground text-sm leading-relaxed">
                  <span className="font-bold text-foreground">
                    {parseFloat(amount).toFixed(4)} {NETWORK_CONFIG.tokenSymbol}
                  </span>{" "}
                  berhasil dikirim ke{" "}
                  {contact
                    ? <span className="font-bold text-foreground">{contact.emoji} {contact.name}</span>
                    : <span className="font-mono text-xs text-foreground">
                        {toAddress.slice(0, 8)}...{toAddress.slice(-6)}
                      </span>
                  }
                </p>
              </div>

              {/* Tx hash */}
              {txHash && (
                <motion.div
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.3 }}
                  className="p-4 rounded-2xl bg-muted/20 border border-border/40 text-left space-y-1.5"
                >
                  <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">
                    Transaction Hash
                  </p>
                  <p className="text-[11px] font-mono text-foreground break-all leading-relaxed">
                    {txHash}
                  </p>
                </motion.div>
              )}

              {/* Actions */}
              <motion.div
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.35 }}
                className="flex gap-3"
              >
                <button
                  onClick={handleReset}
                  className="flex-1 h-13 py-3.5 rounded-2xl bg-muted/30 text-foreground font-bold text-sm hover:bg-muted/50 transition-colors"
                >
                  Kirim Lagi
                </button>
                <button
                  onClick={() => router.push("/dashboard")}
                  className="flex-1 h-13 py-3.5 rounded-2xl bg-foreground text-background font-bold text-sm hover:opacity-90 transition-opacity"
                >
                  Dashboard
                </button>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>

      </div>

      {/* ── QR Modal (receive) ──────────────────────────────── */}
      <QRModal
        isOpen={showQR}
        onClose={() => setShowQR(false)}
        address={wallet.address}
        label={`Wallet ${wallet.address.slice(0, 6)}...${wallet.address.slice(-4)}`}
      />
    </div>
  );
}