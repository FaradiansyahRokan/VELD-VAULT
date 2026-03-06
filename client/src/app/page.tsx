"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useStore } from "@/lib/store";
import { motion, AnimatePresence } from "framer-motion";
import { ArrowRight, Shield, Copy, Check, KeyRound, WalletCards, Zap, ExternalLink } from "lucide-react";
import { toast } from "sonner";
import { NETWORK_CONFIG } from "@/lib/constants";

type View = "MENU" | "CREATE" | "CREATE_FUND" | "IMPORT";

export default function LoginPage() {
  const { createWallet, importWallet, logout } = useStore();
  const router = useRouter();

  const [view, setView] = useState<View>("MENU");
  const [generatedMnemonic, setGeneratedMnemonic] = useState("");
  const [generatedAddress, setGeneratedAddress] = useState("");
  const [isCopied, setIsCopied] = useState(false);
  const [isAddrCopied, setIsAddrCopied] = useState(false);
  const [importInput, setImportInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [isCreating, setIsCreating] = useState(false);

  useEffect(() => {
    logout();
  }, [logout]);

  const handleCreate = async () => {
    setIsCreating(true);
    try {
      const phrase = await createWallet();
      const { wallet } = useStore.getState();
      setGeneratedMnemonic(phrase);
      setGeneratedAddress(wallet?.address || "");
      setView("CREATE");
      toast.success("Vault baru dibuat!");
    } catch (e) {
      toast.error("Gagal membuat wallet");
    }
    setIsCreating(false);
  };

  const handleImport = async () => {
    if (!importInput.trim()) return toast.error("Masukkan seed phrase atau private key");
    setIsLoading(true);
    const success = await importWallet(importInput);
    if (success) {
      toast.success("Vault berhasil dibuka!");
      router.push("/vault");
    } else {
      toast.error("Seed phrase atau private key tidak valid");
    }
    setIsLoading(false);
  };

  const copyMnemonic = () => {
    navigator.clipboard.writeText(generatedMnemonic);
    setIsCopied(true);
    toast.success("Seed phrase disalin!");
    setTimeout(() => setIsCopied(false), 2000);
  };

  const copyAddress = () => {
    navigator.clipboard.writeText(generatedAddress);
    setIsAddrCopied(true);
    toast.success("Alamat disalin!");
    setTimeout(() => setIsAddrCopied(false), 2000);
  };

  const enterVault = () => {
    router.push("/vault");
  };

  return (
    <div className="relative min-h-screen flex flex-col items-center justify-center overflow-hidden bg-background text-foreground">

      {/* Background glow */}
      <div className="absolute inset-0 z-0 pointer-events-none">
        <div className="absolute top-[-20%] left-[-10%] w-[600px] h-[600px] bg-primary/8 rounded-full blur-[120px]" />
        <div className="absolute bottom-[-20%] right-[-10%] w-[600px] h-[600px] bg-blue-500/8 rounded-full blur-[120px]" />
      </div>

      <div className="z-10 w-full max-w-md px-6">

        {/* LOGO */}
        <motion.div
          initial={{ y: -20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          className="flex flex-col items-center mb-10 text-center"
        >
          <div className="w-16 h-16 rounded-[1.5rem] bg-gradient-to-br from-primary to-blue-600 flex items-center justify-center shadow-2xl shadow-primary/20 mb-6">
            <Shield size={30} className="text-white" />
          </div>
          <h1 className="text-4xl font-bold tracking-tighter mb-2">CipherVault.</h1>
          <p className="text-muted-foreground text-sm">Self-Custodial Encrypted Storage</p>
          {/* Network badge */}
          <div className="mt-3 flex items-center gap-2 px-3 py-1.5 rounded-full bg-muted/30 border border-border/50">
            <div className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
            <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">
              {NETWORK_CONFIG.name} · Chain {NETWORK_CONFIG.chainId}
            </span>
          </div>
        </motion.div>

        <div className="relative min-h-[420px]">
          <AnimatePresence mode="wait">

            {/* ===== MENU ===== */}
            {view === "MENU" && (
              <motion.div
                key="menu"
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: 20 }}
                className="flex flex-col gap-4"
              >
                <button
                  onClick={handleCreate}
                  disabled={isCreating}
                  className="group h-20 px-6 rounded-[1.5rem] bg-card border border-border/50 hover:border-primary/50 hover:bg-primary/5 transition-all flex items-center justify-between text-left disabled:opacity-50"
                >
                  <div className="flex items-center gap-4">
                    <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center text-primary">
                      {isCreating
                        ? <div className="w-4 h-4 border-2 border-primary border-t-transparent rounded-full animate-spin" />
                        : <KeyRound size={20} />}
                    </div>
                    <div>
                      <h3 className="font-bold text-foreground">
                        {isCreating ? "Membuat Vault..." : "Buat Vault Baru"}
                      </h3>
                      <p className="text-xs text-muted-foreground">Generate seed phrase baru</p>
                    </div>
                  </div>
                  <ArrowRight size={18} className="text-muted-foreground group-hover:text-primary group-hover:translate-x-1 transition-all" />
                </button>

                <button
                  onClick={() => setView("IMPORT")}
                  className="group h-20 px-6 rounded-[1.5rem] bg-card border border-border/50 hover:border-blue-500/50 hover:bg-blue-500/5 transition-all flex items-center justify-between text-left"
                >
                  <div className="flex items-center gap-4">
                    <div className="w-10 h-10 rounded-full bg-blue-500/10 flex items-center justify-center text-blue-500">
                      <WalletCards size={20} />
                    </div>
                    <div>
                      <h3 className="font-bold text-foreground">Buka Vault</h3>
                      <p className="text-xs text-muted-foreground">Gunakan Seed Phrase / Private Key</p>
                    </div>
                  </div>
                  <ArrowRight size={18} className="text-muted-foreground group-hover:text-blue-500 group-hover:translate-x-1 transition-all" />
                </button>

                {/* Network info */}
                <div className="mt-2 p-4 rounded-2xl bg-muted/10 border border-border/30">
                  <p className="text-[10px] text-muted-foreground text-center leading-relaxed">
                    Berjalan di <span className="font-bold text-foreground">{NETWORK_CONFIG.name}</span> ·{" "}
                    Token native: <span className="font-bold text-foreground">{NETWORK_CONFIG.tokenSymbol}</span>
                  </p>
                </div>
              </motion.div>
            )}

            {/* ===== CREATE — Simpan Seed Phrase ===== */}
            {view === "CREATE" && (
              <motion.div
                key="create"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                className="bg-card border border-border rounded-[2rem] p-6 shadow-2xl"
              >
                <div className="text-center mb-5">
                  <h3 className="text-xl font-bold text-foreground mb-2">Secret Recovery Key</h3>
                  <p className="text-xs text-red-400 font-bold uppercase tracking-wider bg-red-500/10 py-2 rounded-lg">
                    ⚠️ Jangan bagikan ke siapapun!
                  </p>
                </div>

                {/* Seed phrase grid */}
                <div
                  onClick={copyMnemonic}
                  className="relative grid grid-cols-3 gap-2 mb-5 cursor-pointer group"
                >
                  {generatedMnemonic.split(" ").map((word, i) => (
                    <div key={i} className="bg-muted/50 border border-white/5 rounded-xl p-2 text-center">
                      <span className="text-[9px] text-muted-foreground block mb-0.5">{i + 1}</span>
                      <span className="text-xs font-bold text-foreground">{word}</span>
                    </div>
                  ))}
                  <div className="absolute inset-0 bg-background/0 group-hover:bg-background/10 flex items-center justify-center opacity-0 group-hover:opacity-100 backdrop-blur-[1px] rounded-[1rem] transition-all">
                    <span className="bg-black text-white text-xs font-bold px-3 py-1.5 rounded-full flex items-center gap-2">
                      {isCopied ? <Check size={12} /> : <Copy size={12} />}
                      {isCopied ? "Tersalin!" : "Klik untuk Salin"}
                    </span>
                  </div>
                </div>

                <button
                  onClick={() => setView("CREATE_FUND")}
                  className="h-12 w-full bg-primary text-primary-foreground font-bold rounded-xl text-sm hover:opacity-90 transition-opacity"
                >
                  Sudah Disimpan, Lanjut →
                </button>
              </motion.div>
            )}

            {/* ===== CREATE_FUND — Fund dengan APEX ===== */}
            {view === "CREATE_FUND" && (
              <motion.div
                key="fund"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                className="bg-card border border-border rounded-[2rem] p-6 shadow-2xl"
              >
                <div className="text-center mb-5">
                  <div className="w-14 h-14 rounded-full bg-amber-500/10 border border-amber-500/20 flex items-center justify-center mx-auto mb-3 text-amber-500">
                    <Zap size={24} />
                  </div>
                  <h3 className="text-xl font-bold text-foreground mb-1">Fund Vault Kamu</h3>
                  <p className="text-xs text-muted-foreground leading-relaxed">
                    Kirim {NETWORK_CONFIG.tokenSymbol} ke alamat ini untuk bisa melakukan transaksi
                  </p>
                </div>

                {/* Wallet address */}
                <div
                  onClick={copyAddress}
                  className="group flex items-center gap-3 p-4 bg-muted/20 border border-border/50 rounded-2xl cursor-pointer hover:bg-muted/40 transition-all mb-4"
                >
                  <code className="text-xs font-mono text-foreground flex-1 break-all leading-relaxed">
                    {generatedAddress}
                  </code>
                  <div className="shrink-0">
                    {isAddrCopied
                      ? <Check size={16} className="text-emerald-500" />
                      : <Copy size={16} className="text-muted-foreground group-hover:text-foreground" />}
                  </div>
                </div>

                {/* Info */}
                <div className="p-4 bg-blue-500/5 border border-blue-500/20 rounded-2xl mb-4 space-y-1.5">
                  <p className="text-[11px] font-bold text-blue-500 uppercase tracking-wider">Cara Fund:</p>
                  <p className="text-xs text-muted-foreground">
                    1. Buka wallet {NETWORK_CONFIG.tokenSymbol} yang sudah ada
                  </p>
                  <p className="text-xs text-muted-foreground">
                    2. Kirim minimal <span className="font-bold text-foreground">0.01 APEX</span> ke alamat di atas
                  </p>
                  <p className="text-xs text-muted-foreground">
                    3. Tunggu konfirmasi, lalu masuk vault
                  </p>
                </div>

                <button
                  onClick={enterVault}
                  className="h-12 w-full bg-primary text-primary-foreground font-bold rounded-xl text-sm hover:opacity-90 transition-opacity flex items-center justify-center gap-2"
                >
                  Masuk Vault (Sudah Di-Fund)
                  <ExternalLink size={14} />
                </button>
                <button
                  onClick={enterVault}
                  className="h-10 w-full text-muted-foreground text-xs font-medium mt-2 hover:text-foreground transition-colors"
                >
                  Masuk dulu, fund nanti
                </button>
              </motion.div>
            )}

            {/* ===== IMPORT ===== */}
            {view === "IMPORT" && (
              <motion.div
                key="import"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                className="bg-card border border-border rounded-[2rem] p-8 shadow-2xl"
              >
                <div className="mb-6">
                  <h3 className="text-xl font-bold text-foreground mb-2">Buka Vault</h3>
                  <p className="text-sm text-muted-foreground">
                    Masukkan Seed Phrase (12 kata) atau Private Key (0x...)
                  </p>
                </div>

                <textarea
                  value={importInput}
                  onChange={(e) => setImportInput(e.target.value)}
                  placeholder="apple banana cherry... ATAU 0xabcdef..."
                  className="w-full h-32 bg-muted/30 border border-border rounded-2xl p-4 text-sm font-mono resize-none focus:ring-2 focus:ring-primary/50 outline-none mb-5 text-foreground placeholder:text-muted-foreground/40"
                />

                <div className="flex flex-col gap-3">
                  <button
                    onClick={handleImport}
                    disabled={isLoading}
                    className="h-12 w-full bg-foreground text-background font-bold rounded-xl text-sm hover:opacity-90 transition-opacity flex items-center justify-center gap-2 disabled:opacity-60"
                  >
                    {isLoading
                      ? <div className="w-4 h-4 border-2 border-background/30 border-t-background rounded-full animate-spin" />
                      : "Buka Vault"}
                  </button>
                  <button
                    onClick={() => setView("MENU")}
                    className="h-11 w-full text-muted-foreground font-medium text-sm hover:text-foreground transition-colors"
                  >
                    Batal
                  </button>
                </div>
              </motion.div>
            )}

          </AnimatePresence>
        </div>
      </div>
    </div>
  );
}