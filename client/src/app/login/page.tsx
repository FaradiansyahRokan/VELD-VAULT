"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useStore } from "@/lib/store";
import { motion, AnimatePresence } from "framer-motion";
import {
  Shield,
  KeyRound,
  PlusCircle,
  Download,
  Copy,
  Check,
  ChevronLeft,
  ArrowRight,
  Sparkles,
  Lock,
  Eye,
  EyeOff,
} from "lucide-react";
import { toast } from "sonner";
import { copyToClipboard } from "@/lib/clipboard";
import { NETWORK_CONFIG } from "@/lib/constants";

type View = "MENU" | "CREATE" | "IMPORT";

const spring = {
  type: "spring" as const,
  stiffness: 380,
  damping: 28,
};

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
  const [showInputSecret, setShowInputSecret] = useState(false);

  useEffect(() => {
    logout();
    setView("MENU");
    setMnemonic("");
    setConfirmed(false);
    setImportInput("");
    setIsLoading(false);
    setIsCreating(false);
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const handleCreate = async () => {
    setIsCreating(true);
    try {
      const phrase = await createWallet();
      setMnemonic(phrase);
      setView("CREATE");
    } catch (err: any) {
      toast.error(err?.message || "Failed to generate vault credentials");
    } finally {
      setIsCreating(false);
    }
  };

  const handleImport = async () => {
    const secret = importInput.trim();
    if (!secret) return toast.error("Please enter a seed phrase or private key");
    setIsLoading(true);
    try {
      // Set safety timeout (8 seconds) so verification never freezes the UI
      const importPromise = importWallet(secret);
      const timeoutPromise = new Promise<boolean>((_, reject) =>
        setTimeout(() => reject(new Error("Verification timed out. Please check your network connection.")), 8000)
      );
      const success = await Promise.race([importPromise, timeoutPromise]);
      if (success) {
        toast.success("Vault accessed successfully!");
        router.push("/dashboard");
      } else {
        toast.error("Invalid credentials. Verify your seed phrase or key.");
      }
    } catch (err: any) {
      toast.error(err?.message || "Import failed. Please try again.");
    } finally {
      setIsLoading(false);
    }
  };

  const copyMnemonic = () => {
    copyToClipboard(mnemonic);
    setIsCopied(true);
    toast.success("Recovery phrase copied to clipboard");
    setTimeout(() => setIsCopied(false), 2000);
  };

  const enterVault = () => {
    if (!confirmed) {
      toast.error("Please confirm you have safely saved your recovery phrase");
      return;
    }
    router.push("/dashboard");
  };

  const words = mnemonic ? mnemonic.split(" ") : [];

  return (
    <div className="relative min-h-screen flex items-center justify-center p-4 overflow-hidden font-sans">
      {/* Organic Enterprise Ambient Background Glows */}
      <div className="absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[650px] h-[650px] bg-primary/20 dark:bg-primary/30 rounded-full blur-[150px] pointer-events-none" />
      <div className="absolute bottom-1/4 left-1/3 w-[450px] h-[450px] bg-[#7692FF]/15 dark:bg-[#7692FF]/20 rounded-full blur-[130px] pointer-events-none" />

      {/* Main Authentication Card */}
      <motion.div
        initial={{ opacity: 0, scale: 0.96, y: 15 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        transition={spring}
        className="relative z-10 w-full max-w-md rounded-3xl p-7 md:p-9 ios-card"
      >
        {/* Top App Icon & Title */}
        <div className="flex flex-col items-center text-center mb-6">
          <motion.div
            whileHover={{ scale: 1.05 }}
            className="w-14 h-14 rounded-2xl bg-primary flex items-center justify-center text-primary-foreground shadow-sm mb-3.5"
          >
            <Shield size={28} className="stroke-[2.2]" />
          </motion.div>
          <h2 className="text-2xl font-extrabold text-foreground tracking-tight">
            CipherVault
          </h2>
        </div>

        <AnimatePresence mode="wait">
          {/* ── View 1: Main Menu Options ── */}
          {view === "MENU" && (
            <motion.div
              key="menu"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={{ duration: 0.2 }}
              className="space-y-3"
            >
              <p className="text-xs text-center text-muted-foreground mb-4 leading-relaxed">
                Non-custodial cryptographic vault on Avalanche Subnet. Select how you would like to connect.
              </p>

              {/* Create New Vault Button */}
              <motion.button
                whileHover={{ scale: 1.01, y: -1 }}
                whileTap={{ scale: 0.97 }}
                onClick={handleCreate}
                disabled={isCreating}
                className="w-full p-4 rounded-2xl btn-enterprise-primary text-primary-foreground cursor-pointer transition-all"
              >
                <div className="flex items-center gap-3 text-left">
                  <div className="w-10 h-10 rounded-xl bg-white/20 flex items-center justify-center">
                    <PlusCircle size={20} />
                  </div>
                  <div>
                    <h4 className="text-sm font-bold">Create New Vault</h4>
                    <p className="text-[11px] text-white/80">Generate a fresh 12-word recovery phrase</p>
                  </div>
                </div>
                <ArrowRight size={16} />
              </motion.button>

              {/* Import Existing Vault Button */}
              <motion.button
                whileHover={{ scale: 1.01, y: -1 }}
                whileTap={{ scale: 0.97 }}
                onClick={() => setView("IMPORT")}
                className="w-full p-4 rounded-2xl bg-background hover:bg-muted text-foreground flex items-center justify-between border border-border cursor-pointer transition-all shadow-sm"
              >
                <div className="flex items-center gap-3 text-left">
                  <div className="w-10 h-10 rounded-xl bg-slate-200/70 dark:bg-[#7692FF]/15 flex items-center justify-center text-[#1B2CC1] dark:text-[#ABD2FA]">
                    <Download size={20} />
                  </div>
                  <div>
                    <h4 className="text-sm font-bold">Import Existing Vault</h4>
                    <p className="text-[11px] text-muted-foreground">Restore with Seed Phrase or Private Key</p>
                  </div>
                </div>
                <ArrowRight size={16} className="text-muted-foreground" />
              </motion.button>
            </motion.div>
          )}

          {/* ── View 2: Created Seed Phrase Display ── */}
          {view === "CREATE" && (
            <motion.div
              key="create"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={{ duration: 0.2 }}
              className="space-y-4"
            >
              <div className="flex items-center justify-between">
                <button
                  onClick={() => setView("MENU")}
                  className="flex items-center gap-1 text-xs font-semibold text-muted-foreground hover:text-foreground cursor-pointer"
                >
                  <ChevronLeft size={16} />
                  <span>Back</span>
                </button>
                <span className="text-xs font-bold text-amber-600 dark:text-amber-400">
                  Secret Backup
                </span>
              </div>

              <div className="p-4 rounded-2xl bg-amber-500/10 border border-amber-500/20 text-xs text-amber-700 dark:text-amber-300">
                Write down these 12 words in order and store them safely. Anyone with this phrase has full access to your vault assets.
              </div>

              {/* 12-Word Bubbly Pills */}
              <div className="grid grid-cols-3 gap-2">
                {words.map((word, i) => (
                  <div
                    key={i}
                    className="p-2.5 rounded-xl bg-background border border-border text-center shadow-xs"
                  >
                    <span className="text-[10px] text-muted-foreground font-mono mr-1.5">
                      {i + 1}.
                    </span>
                    <span className="text-xs font-bold font-mono text-[#1B2CC1] dark:text-[#ABD2FA]">
                      {word}
                    </span>
                  </div>
                ))}
              </div>

              {/* Copy Phrase Button */}
              <motion.button
                whileTap={{ scale: 0.96 }}
                onClick={copyMnemonic}
                className="w-full py-2.5 rounded-xl bg-muted hover:bg-muted text-foreground text-xs font-semibold flex items-center justify-center gap-2 cursor-pointer transition-colors border border-border"
              >
                {isCopied ? <Check size={14} className="text-emerald-500" /> : <Copy size={14} className="text-[#1B2CC1] dark:text-[#7692FF]" />}
                <span>{isCopied ? "Copied to Clipboard" : "Copy Recovery Phrase"}</span>
              </motion.button>

              {/* Confirmation Checkbox */}
              <label className="flex items-start gap-2.5 cursor-pointer pt-1">
                <input
                  type="checkbox"
                  checked={confirmed}
                  onChange={(e) => setConfirmed(e.target.checked)}
                  className="mt-0.5 rounded accent-[#1B2CC1] cursor-pointer"
                />
                <span className="text-xs text-muted-foreground">
                  I have securely saved this 12-word recovery phrase.
                </span>
              </label>

              {/* Continue to Vault */}
              <motion.button
                whileHover={{ scale: 1.01 }}
                whileTap={{ scale: 0.97 }}
                onClick={enterVault}
                disabled={!confirmed}
                className="w-full py-3.5 rounded-2xl btn-enterprise-primary text-primary-foreground transition-all disabled:opacity-50 cursor-pointer"
              >
                Enter Vault Dashboard
              </motion.button>
            </motion.div>
          )}

          {/* ── View 3: Import Phrase or Private Key ── */}
          {view === "IMPORT" && (
            <motion.div
              key="import"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={{ duration: 0.2 }}
              className="space-y-4"
            >
              <div className="flex items-center justify-between">
                <button
                  onClick={() => {
                    setView("MENU");
                    setIsLoading(false);
                  }}
                  className="flex items-center gap-1 text-xs font-semibold text-muted-foreground hover:text-foreground cursor-pointer"
                >
                  <ChevronLeft size={16} />
                  <span>Back</span>
                </button>
                <span className="text-xs font-bold text-foreground">Import Credentials</span>
              </div>

              <div>
                <div className="flex items-center justify-between mb-2">
                  <label className="text-xs font-semibold text-muted-foreground">
                    Recovery Phrase or Private Key
                  </label>
                  <button
                    type="button"
                    onClick={() => setShowInputSecret(!showInputSecret)}
                    className="text-xs text-muted-foreground hover:text-foreground flex items-center gap-1 cursor-pointer"
                  >
                    {showInputSecret ? <EyeOff size={13} /> : <Eye size={13} />}
                    <span>{showInputSecret ? "Hide" : "Show"}</span>
                  </button>
                </div>

                <div className="relative">
                  <textarea
                    rows={4}
                    value={importInput}
                    onChange={(e) => setImportInput(e.target.value)}
                    placeholder="Enter your 12-word seed phrase separated by spaces, or raw 0x private key…"
                    className={`w-full p-3.5 rounded-2xl bg-background border border-border text-xs font-mono text-foreground outline-none focus:border-[#1B2CC1] dark:focus:border-[#7692FF] focus:ring-4 focus:ring-[#7692FF]/15 transition-all resize-none ${
                      !showInputSecret ? "password-mask" : ""
                    }`}
                  />
                </div>
              </div>

              <motion.button
                whileHover={{ scale: 1.01 }}
                whileTap={{ scale: 0.97 }}
                onClick={handleImport}
                disabled={isLoading || !importInput.trim()}
                className="w-full py-3.5 rounded-2xl btn-enterprise-primary text-primary-foreground transition-all disabled:opacity-50 cursor-pointer flex items-center justify-center gap-2"
              >
                {isLoading ? (
                  <>
                    <div className="w-4 h-4 border-2 border-primary-foreground/30 border-t-primary-foreground rounded-full animate-spin" />
                    <span>Verifying On-Chain…</span>
                  </>
                ) : (
                  <span>Unlock Vault</span>
                )}
              </motion.button>
            </motion.div>
          )}
        </AnimatePresence>
      </motion.div>
    </div>
  );
}