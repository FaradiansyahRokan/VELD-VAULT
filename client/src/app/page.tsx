"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useStore } from "@/lib/store";
import { motion, AnimatePresence } from "framer-motion";
import {
  ArrowRight, Shield, Copy, Check, KeyRound,
  WalletCards, Lock, ChevronLeft, Sparkles,
} from "lucide-react";
import { toast } from "sonner";
import { NETWORK_CONFIG } from "@/lib/constants";

type View = "MENU" | "CREATE" | "IMPORT";

const spring = { type: "spring" as const, stiffness: 400, damping: 30 };

export default function LoginPage() {
  const { createWallet, importWallet, logout } = useStore();
  const router = useRouter();

  const [view, setView] = useState<View>("MENU");
  const [mnemonic, setMnemonic] = useState("");
  const [isCopied, setIsCopied] = useState(false);
  const [importInput, setImportInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [isCreating, setIsCreating] = useState(false);
  const [confirmed, setConfirmed] = useState(false);

  // Selalu reset state saat halaman ini dibuka (termasuk setelah disconnect)
  useEffect(() => {
    logout();
    setView("MENU");
    setMnemonic("");
    setConfirmed(false);
    setImportInput("");
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const handleCreate = async () => {
    setIsCreating(true);
    try {
      const phrase = await createWallet();
      setMnemonic(phrase);
      setView("CREATE");
    } catch {
      toast.error("Gagal membuat vault");
    }
    setIsCreating(false);
  };

  const handleImport = async () => {
    if (!importInput.trim()) return toast.error("Masukkan seed phrase atau private key");
    setIsLoading(true);
    const success = await importWallet(importInput.trim());
    if (success) {
      toast.success("Vault berhasil dibuka!");
      router.push("/dashboard");
    } else {
      toast.error("Seed phrase atau private key tidak valid");
      setIsLoading(false);
    }
  };

  const copyMnemonic = () => {
    navigator.clipboard.writeText(mnemonic);
    setIsCopied(true);
    toast.success("Seed phrase disalin!");
    setTimeout(() => setIsCopied(false), 2000);
  };

  const enterVault = () => {
    if (!confirmed) {
      toast.error("Centang konfirmasi dulu ya!");
      return;
    }
    router.push("/dashboard");
  };

  return (
    <div className="relative min-h-screen flex flex-col items-center justify-center overflow-hidden bg-background text-foreground">

      {/* ── Background ── */}
      <div className="absolute inset-0 pointer-events-none overflow-hidden">
        <div className="absolute -top-40 -left-40 w-[500px] h-[500px] bg-primary/6 rounded-full blur-[100px]" />
        <div className="absolute -bottom-40 -right-40 w-[500px] h-[500px] bg-indigo-500/6 rounded-full blur-[100px]" />
        {/* subtle grid */}
        <div
          className="absolute inset-0 opacity-[0.025]"
          style={{
            backgroundImage: `linear-gradient(var(--foreground) 1px, transparent 1px),
                              linear-gradient(90deg, var(--foreground) 1px, transparent 1px)`,
            backgroundSize: "40px 40px",
          }}
        />
      </div>

      <div className="relative z-10 w-full max-w-sm px-5">

        {/* ── Logo ── */}
        <motion.div
          initial={{ y: -16, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ ...spring, delay: 0.05 }}
          className="flex flex-col items-center mb-8 text-center"
        >
          <div className="relative mb-5">
            <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-primary via-primary/80 to-indigo-600 flex items-center justify-center shadow-2xl shadow-primary/25">
              <Shield size={28} className="text-white" strokeWidth={1.5} />
            </div>
            <div className="absolute -top-1 -right-1 w-5 h-5 bg-emerald-400 rounded-full flex items-center justify-center shadow-lg shadow-emerald-500/30">
              <div className="w-1.5 h-1.5 bg-white rounded-full" />
            </div>
          </div>

          <h1 className="text-[2rem] font-bold tracking-tight mb-1 leading-none">
            CipherVault
          </h1>
          <p className="text-muted-foreground text-sm mb-3">
            Self-Custodial Encrypted Storage
          </p>

          <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-muted/30 border border-border/50">
            <div className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
            <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">
              {NETWORK_CONFIG.name} · {NETWORK_CONFIG.tokenSymbol}
            </span>
          </div>
        </motion.div>

        {/* ── Views ── */}
        <AnimatePresence mode="wait">

          {/* ══════════ MENU ══════════ */}
          {view === "MENU" && (
            <motion.div
              key="menu"
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -12 }}
              transition={spring}
              className="flex flex-col gap-3"
            >
              {/* Create */}
              <button
                onClick={handleCreate}
                disabled={isCreating}
                className="group relative h-[72px] px-5 rounded-2xl bg-card border border-border/60 hover:border-primary/40 hover:bg-primary/3 transition-all flex items-center justify-between text-left disabled:opacity-60 overflow-hidden"
              >
                <div className="absolute inset-0 bg-gradient-to-r from-primary/3 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
                <div className="flex items-center gap-3.5 relative">
                  <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center text-primary shrink-0">
                    {isCreating
                      ? <div className="w-4 h-4 border-2 border-primary/40 border-t-primary rounded-full animate-spin" />
                      : <KeyRound size={18} strokeWidth={1.75} />}
                  </div>
                  <div>
                    <p className="font-semibold text-foreground text-sm leading-tight">
                      {isCreating ? "Membuat vault..." : "Buat Vault Baru"}
                    </p>
                    <p className="text-[11px] text-muted-foreground mt-0.5">
                      Generate wallet & seed phrase baru
                    </p>
                  </div>
                </div>
                <ArrowRight
                  size={16}
                  className="text-muted-foreground/50 group-hover:text-primary group-hover:translate-x-0.5 transition-all relative shrink-0"
                />
              </button>

              {/* Import */}
              <button
                onClick={() => setView("IMPORT")}
                className="group relative h-[72px] px-5 rounded-2xl bg-card border border-border/60 hover:border-indigo-500/40 hover:bg-indigo-500/3 transition-all flex items-center justify-between text-left overflow-hidden"
              >
                <div className="absolute inset-0 bg-gradient-to-r from-indigo-500/3 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
                <div className="flex items-center gap-3.5 relative">
                  <div className="w-10 h-10 rounded-xl bg-indigo-500/10 flex items-center justify-center text-indigo-400 shrink-0">
                    <WalletCards size={18} strokeWidth={1.75} />
                  </div>
                  <div>
                    <p className="font-semibold text-foreground text-sm leading-tight">Buka Vault</p>
                    <p className="text-[11px] text-muted-foreground mt-0.5">
                      Import dengan seed phrase atau private key
                    </p>
                  </div>
                </div>
                <ArrowRight
                  size={16}
                  className="text-muted-foreground/50 group-hover:text-indigo-400 group-hover:translate-x-0.5 transition-all relative shrink-0"
                />
              </button>

              {/* Feature pills */}
              <div className="mt-2 flex flex-wrap gap-2 justify-center">
                {[
                  {label: "End-to-End Encrypted" },
                  { label: "On-Chain NFT" },
                  { label: "Auto Faucet" },
                ].map((f) => (
                  <span
                    key={f.label}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-muted/20 border border-border/40 text-[10px] font-medium text-muted-foreground"
                  >
                    {f.label}
                  </span>
                ))}
              </div>
            </motion.div>
          )}

          {/* ══════════ CREATE — Simpan Seed Phrase ══════════ */}
          {view === "CREATE" && (
            <motion.div
              key="create"
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -12 }}
              transition={spring}
              className="bg-card border border-border/60 rounded-2xl p-5 shadow-xl"
            >
              {/* Header */}
              <div className="flex items-center gap-3 mb-4">
                <div className="w-9 h-9 rounded-xl bg-amber-500/10 flex items-center justify-center">
                  <Lock size={16} className="text-amber-500" strokeWidth={1.75} />
                </div>
                <div>
                  <h3 className="font-bold text-foreground text-sm leading-tight">Secret Recovery Phrase</h3>
                  <p className="text-[11px] text-amber-500 font-medium mt-0.5">Jangan pernah bagikan ke siapapun</p>
                </div>
              </div>

              {/* Faucet info */}
              <div className="flex items-center gap-2.5 px-3.5 py-2.5 rounded-xl bg-emerald-500/8 border border-emerald-500/20 mb-4">
                <Sparkles size={13} className="text-emerald-400 shrink-0" />
                <p className="text-[11px] text-emerald-600 dark:text-emerald-400 leading-snug">
                  <span className="font-bold">{NETWORK_CONFIG.tokenSymbol} otomatis dikirim</span> ke wallet baru kamu — tidak perlu fund manual.
                </p>
              </div>

              {/* Seed phrase grid */}
              <div
                onClick={copyMnemonic}
                className="relative grid grid-cols-3 gap-1.5 mb-4 cursor-pointer group select-none"
              >
                {mnemonic.split(" ").map((word, i) => (
                  <div
                    key={i}
                    className="bg-muted/40 border border-border/40 group-hover:border-primary/20 rounded-xl py-2 px-1.5 text-center transition-colors"
                  >
                    <span className="text-[8px] text-muted-foreground/60 block leading-tight">{i + 1}</span>
                    <span className="text-[11px] font-semibold text-foreground">{word}</span>
                  </div>
                ))}
                {/* Hover overlay */}
                <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-all rounded-xl backdrop-blur-[2px] bg-background/20">
                  <span className="bg-foreground text-background text-[10px] font-bold px-3 py-1.5 rounded-full flex items-center gap-1.5 shadow-lg">
                    {isCopied ? <Check size={11} /> : <Copy size={11} />}
                    {isCopied ? "Tersalin!" : "Salin Semua"}
                  </span>
                </div>
              </div>

              {/* Confirmation checkbox */}
              <label className="flex items-start gap-2.5 mb-4 cursor-pointer group">
                <div
                  onClick={() => setConfirmed((v) => !v)}
                  className={`mt-0.5 w-4 h-4 rounded flex items-center justify-center border transition-all shrink-0 ${confirmed
                      ? "bg-primary border-primary"
                      : "border-border/60 bg-muted/30 group-hover:border-primary/40"
                    }`}
                >
                  {confirmed && <Check size={10} className="text-primary-foreground" strokeWidth={3} />}
                </div>
                <span className="text-[11px] text-muted-foreground leading-snug">
                  Saya sudah menyimpan seed phrase ini di tempat yang aman dan tidak akan membagikannya.
                </span>
              </label>

              {/* CTA */}
              <button
                onClick={enterVault}
                className={`h-11 w-full rounded-xl text-sm font-bold transition-all flex items-center justify-center gap-2 ${confirmed
                    ? "bg-primary text-primary-foreground hover:opacity-90 shadow-lg shadow-primary/20"
                    : "bg-muted/40 text-muted-foreground/60 cursor-not-allowed"
                  }`}
              >
                Masuk ke Vault
                <ArrowRight size={15} />
              </button>
            </motion.div>
          )}

          {/* ══════════ IMPORT ══════════ */}
          {view === "IMPORT" && (
            <motion.div
              key="import"
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -12 }}
              transition={spring}
              className="bg-card border border-border/60 rounded-2xl p-5 shadow-xl"
            >
              {/* Header */}
              <div className="flex items-center gap-3 mb-5">
                <button
                  onClick={() => setView("MENU")}
                  className="w-8 h-8 rounded-xl bg-muted/40 hover:bg-muted/70 flex items-center justify-center text-muted-foreground hover:text-foreground transition-all"
                >
                  <ChevronLeft size={16} />
                </button>
                <div>
                  <h3 className="font-bold text-foreground text-sm leading-tight">Buka Vault</h3>
                  <p className="text-[11px] text-muted-foreground mt-0.5">
                    Seed phrase (12 kata) atau private key (0x...)
                  </p>
                </div>
              </div>

              <textarea
                value={importInput}
                onChange={(e) => setImportInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && !e.shiftKey) {
                    e.preventDefault();
                    handleImport();
                  }
                }}
                placeholder="Masukkan seed phrase atau private key..."
                autoFocus
                className="w-full h-28 bg-muted/30 border border-border/50 focus:border-primary/30 rounded-xl p-4 text-sm font-mono resize-none focus:ring-2 focus:ring-primary/10 outline-none mb-4 text-foreground placeholder:text-muted-foreground/40 transition-all"
              />

              <button
                onClick={handleImport}
                disabled={isLoading || !importInput.trim()}
                className="h-11 w-full bg-foreground text-background font-bold rounded-xl text-sm hover:opacity-90 transition-all flex items-center justify-center gap-2 disabled:opacity-40"
              >
                {isLoading
                  ? <div className="w-4 h-4 border-2 border-background/30 border-t-background rounded-full animate-spin" />
                  : <>Buka Vault <ArrowRight size={15} /></>}
              </button>

              <p className="text-center text-[10px] text-muted-foreground/60 mt-3">
                Enter untuk submit · Data tidak pernah dikirim ke server
              </p>
            </motion.div>
          )}

        </AnimatePresence>
      </div>
    </div>
  );
}