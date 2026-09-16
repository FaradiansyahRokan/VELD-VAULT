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
  ArrowRight,
  Search,
  Check,
  X,
  ChevronLeft,
  UserCircle2,
  Send,
  Coins,
  QrCode,
  Sparkles,
  ExternalLink,
  ShieldCheck,
  CheckCircle2,
} from "lucide-react";
import QRModal from "@/components/QRModal";

const spring = {
  type: "spring" as const,
  stiffness: 380,
  damping: 28,
};

const RECENT_KEY = "cv_recent_transfers";
interface RecentEntry {
  address: string;
  amount: string;
  timestamp: number;
}

function loadRecent(): RecentEntry[] {
  if (typeof window === "undefined") return [];
  try {
    return JSON.parse(localStorage.getItem(RECENT_KEY) || "[]");
  } catch {
    return [];
  }
}

function saveRecent(address: string, amount: string) {
  const prev = loadRecent().filter((r) => r.address.toLowerCase() !== address.toLowerCase());
  const next = [{ address: address.toLowerCase(), amount, timestamp: Date.now() }, ...prev].slice(0, 8);
  try {
    localStorage.setItem(RECENT_KEY, JSON.stringify(next));
  } catch {}
}

type Step = "input" | "confirm" | "success";

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
    if (!wallet) {
      router.push("/login");
      return;
    }
    refreshBalance();
    setRecent(loadRecent());
  }, [wallet, router, refreshBalance]);

  const balanceNum = parseFloat(balance) || 0;
  const amountNum = parseFloat(amount || "0");
  const GAS_COST = parseFloat(ethers.formatEther(BigInt(21_000) * ethers.parseUnits("30", "gwei")));
  const maxSendable = Math.max(0, balanceNum - GAS_COST);
  const isValidAddress = ethers.isAddress(toAddress.trim());
  const isSelf = toAddress.trim().toLowerCase() === wallet?.address.toLowerCase();

  const addressError = useMemo(() => {
    if (!toAddress) return null;
    if (!isValidAddress) return "Invalid wallet address format";
    if (isSelf) return "Cannot transfer to your own wallet";
    return null;
  }, [toAddress, isValidAddress, isSelf]);

  const amountError = useMemo(() => {
    if (!amount) return null;
    if (amountNum <= 0) return "Amount must be greater than 0";
    if (amountNum > maxSendable)
      return `Insufficient funds (max ${maxSendable.toFixed(4)} ${NETWORK_CONFIG.tokenSymbol})`;
    return null;
  }, [amount, amountNum, maxSendable]);

  const canContinue = isValidAddress && !isSelf && amountNum > 0 && !amountError;

  const filteredContacts = search
    ? contacts.filter(
        (c) =>
          c.name.toLowerCase().includes(search.toLowerCase()) ||
          c.address.toLowerCase().includes(search.toLowerCase())
      )
    : contacts;

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
        title: "Transfer executed",
        description: `${amount} ${NETWORK_CONFIG.tokenSymbol} → ${toAddress.trim().slice(0, 6)}...${toAddress.trim().slice(-4)}`,
        walletAddress: wallet.address,
        amount,
        address: toAddress.trim(),
      });
      await refreshBalance();
      setStep("success");
    } catch (e: any) {
      const msg = e?.message || "Transfer failed";
      toast.error(msg.length > 120 ? "Transfer failed. Check connection." : msg);
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
    <div className="min-h-screen pt-24 pb-20 px-4 md:px-8 max-w-2xl mx-auto font-sans">
      {/* Top Breadcrumb & Actions */}
      <div className="flex items-center justify-between mb-6">
        <motion.button
          whileTap={{ scale: 0.95 }}
          onClick={() => router.back()}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-muted text-muted-foreground hover:text-foreground text-xs font-semibold cursor-pointer"
        >
          <ChevronLeft size={16} />
          <span>Back</span>
        </motion.button>

        <motion.button
          whileTap={{ scale: 0.95 }}
          onClick={() => setShowQR(true)}
          className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-full bg-muted text-foreground text-xs font-semibold hover:bg-muted cursor-pointer"
        >
          <QrCode size={14} />
          <span>Receive QR</span>
        </motion.button>
      </div>

      {/* Main Transfer Container */}
      <motion.div
        initial={{ opacity: 0, y: 15 }}
        animate={{ opacity: 1, y: 0 }}
        transition={spring}
        className="rounded-3xl p-6 md:p-8 ios-card"
      >
        <AnimatePresence mode="wait">
          {/* ── STEP 1: INPUT ── */}
          {step === "input" && (
            <motion.div
              key="input"
              initial={{ opacity: 0, x: -10 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 10 }}
              transition={{ duration: 0.2 }}
              className="space-y-6"
            >
              {/* Header */}
              <div>
                <span className="text-xs font-bold uppercase tracking-wider text-[#1B2CC1] dark:text-[#ABD2FA]">
                  Send Native Tokens
                </span>
                <h2 className="text-2xl md:text-3xl font-extrabold text-foreground mt-1">
                  Transfer {NETWORK_CONFIG.tokenSymbol}
                </h2>
                <div className="flex items-center justify-between mt-2 p-3 rounded-2xl bg-background border border-border">
                  <span className="text-xs text-muted-foreground">Available Balance:</span>
                  <span className="text-xs font-bold text-foreground">
                    {Number(balance || 0).toLocaleString(undefined, { maximumFractionDigits: 4 })}{" "}
                    {NETWORK_CONFIG.tokenSymbol}
                  </span>
                </div>
              </div>

              {/* Amount Input */}
              <div>
                <label className="block text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">
                  Transfer Amount
                </label>
                <div className="relative">
                  <input
                    type="number"
                    min="0"
                    step="0.001"
                    value={amount}
                    onChange={(e) => setAmount(e.target.value)}
                    placeholder="0.00"
                    className="w-full text-3xl md:text-4xl font-black px-4 py-3 rounded-2xl bg-background border border-border text-foreground outline-none focus:border-[#1B2CC1] dark:focus:border-[#7692FF] focus:ring-4 focus:ring-[#7692FF]/15 transition-all tabular-nums"
                  />
                  <div className="absolute right-3.5 top-1/2 -translate-y-1/2 flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => setAmount(maxSendable.toFixed(4))}
                      className="px-2.5 py-1 rounded-xl bg-[#7692FF]/15 text-[#1B2CC1] dark:text-[#ABD2FA] border border-[#7692FF]/25 text-xs font-bold hover:bg-[#7692FF]/25 cursor-pointer transition-colors"
                    >
                      MAX
                    </button>
                    <span className="text-sm font-bold text-muted-foreground">
                      {NETWORK_CONFIG.tokenSymbol}
                    </span>
                  </div>
                </div>
                {amountError && (
                  <p className="text-xs text-red-500 font-medium mt-1.5">{amountError}</p>
                )}
              </div>

              {/* Recipient Address */}
              <div>
                <label className="block text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">
                  Recipient Address
                </label>
                <div className="relative">
                  <input
                    type="text"
                    value={toAddress}
                    onChange={(e) => setToAddress(e.target.value)}
                    placeholder="0x..."
                    className="w-full px-4 py-3 rounded-2xl bg-background border border-border text-xs font-mono text-foreground outline-none focus:border-[#1B2CC1] dark:focus:border-[#7692FF] focus:ring-4 focus:ring-[#7692FF]/15 transition-all"
                  />
                  {contact && (
                    <div className="absolute right-3 top-1/2 -translate-y-1/2 px-2.5 py-1 rounded-xl bg-[#7692FF]/15 text-[#1B2CC1] dark:text-[#ABD2FA] border border-[#7692FF]/25 text-xs font-bold">
                      {contact.emoji} {contact.name}
                    </div>
                  )}
                </div>
                {addressError && (
                  <p className="text-xs text-red-500 font-medium mt-1.5">{addressError}</p>
                )}
              </div>

              {/* Segmented Picker: Contacts / Recent */}
              <div>
                <div className="flex p-1 rounded-2xl bg-muted border border-border mb-3">
                  <button
                    onClick={() => setContactTab("contacts")}
                    className={`flex-1 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                      contactTab === "contacts"
                        ? "bg-white dark:bg-primary text-foreground dark:text-primary-foreground shadow-sm"
                        : "text-muted-foreground"
                    }`}
                  >
                    Saved Contacts ({contacts.length})
                  </button>
                  <button
                    onClick={() => setContactTab("recent")}
                    className={`flex-1 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                      contactTab === "recent"
                        ? "bg-white dark:bg-primary text-foreground dark:text-primary-foreground shadow-sm"
                        : "text-muted-foreground"
                    }`}
                  >
                    Recent Transfers ({recent.length})
                  </button>
                </div>

                {contactTab === "contacts" ? (
                  <div className="max-h-40 overflow-y-auto space-y-1.5 pr-1">
                    {filteredContacts.length === 0 ? (
                      <p className="text-xs text-muted-foreground text-center py-4">
                        No contacts found. Add contacts in Tools.
                      </p>
                    ) : (
                      filteredContacts.map((c) => (
                        <div
                          key={c.id}
                          onClick={() => setToAddress(c.address)}
                          className="flex items-center justify-between p-2.5 rounded-xl bg-background border border-border hover:border-primary/50 hover:bg-muted transition-colors cursor-pointer"
                        >
                          <div className="flex items-center gap-2.5">
                            <span className="text-base">{c.emoji}</span>
                            <div>
                              <p className="text-xs font-bold text-foreground">{c.name}</p>
                              <p className="text-[10px] font-mono text-muted-foreground">
                                {c.address.slice(0, 6)}…{c.address.slice(-4)}
                              </p>
                            </div>
                          </div>
                          <span className="text-[10px] text-[#1B2CC1] dark:text-[#7692FF] font-bold">Select</span>
                        </div>
                      ))
                    )}
                  </div>
                ) : (
                  <div className="max-h-40 overflow-y-auto space-y-1.5 pr-1">
                    {recent.length === 0 ? (
                      <p className="text-xs text-muted-foreground text-center py-4">
                        No recent transfers recorded.
                      </p>
                    ) : (
                      recent.map((r, i) => (
                        <div
                          key={i}
                          onClick={() => {
                            setToAddress(r.address);
                            setAmount(r.amount);
                          }}
                          className="flex items-center justify-between p-2.5 rounded-xl bg-background border border-border hover:border-primary/50 hover:bg-muted transition-colors cursor-pointer"
                        >
                          <span className="text-xs font-mono text-foreground">
                            {r.address.slice(0, 8)}…{r.address.slice(-6)}
                          </span>
                          <span className="text-xs font-bold text-foreground">
                            {r.amount} {NETWORK_CONFIG.tokenSymbol}
                          </span>
                        </div>
                      ))
                    )}
                  </div>
                )}
              </div>

              {/* Submit Button */}
              <motion.button
                whileHover={{ scale: 1.01 }}
                whileTap={{ scale: 0.97 }}
                disabled={!canContinue}
                onClick={() => setStep("confirm")}
                className="w-full py-4 rounded-2xl btn-enterprise-primary text-primary-foreground transition-all disabled:opacity-50 cursor-pointer flex items-center justify-center gap-2"
              >
                <span>Review Transfer</span>
                <ArrowRight size={16} />
              </motion.button>
            </motion.div>
          )}

          {/* ── STEP 2: CONFIRM ── */}
          {step === "confirm" && (
            <motion.div
              key="confirm"
              initial={{ opacity: 0, x: 10 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -10 }}
              transition={{ duration: 0.2 }}
              className="space-y-6"
            >
              <div className="text-center py-2">
                <span className="text-xs font-bold uppercase tracking-wider text-[#1B2CC1] dark:text-[#ABD2FA]">
                  Confirm Transaction
                </span>
                <div className="flex items-baseline justify-center gap-2 my-2">
                  <span className="text-4xl font-black text-foreground tabular-nums">
                    {amount}
                  </span>
                  <span className="text-xl font-bold text-[#1B2CC1] dark:text-[#7692FF]">
                    {NETWORK_CONFIG.tokenSymbol}
                  </span>
                </div>
                <p className="text-xs text-muted-foreground">
                  Verify recipient address and transaction details before signing.
                </p>
              </div>

              <div className="p-4 rounded-2xl bg-background border border-border space-y-3 text-xs">
                <div className="flex items-center justify-between">
                  <span className="text-muted-foreground">Recipient</span>
                  <span className="font-mono font-bold text-foreground">
                    {toAddress.slice(0, 10)}…{toAddress.slice(-8)}
                  </span>
                </div>
                {contact && (
                  <div className="flex items-center justify-between">
                    <span className="text-muted-foreground">Recipient Name</span>
                    <span className="font-bold text-foreground">{contact.emoji} {contact.name}</span>
                  </div>
                )}
                <div className="flex items-center justify-between">
                  <span className="text-muted-foreground">Network</span>
                  <span className="font-bold text-foreground">{NETWORK_CONFIG.name} (L1)</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-muted-foreground">Estimated Gas</span>
                  <span className="font-bold text-emerald-600 dark:text-emerald-400">
                    &lt; 0.001 {NETWORK_CONFIG.tokenSymbol}
                  </span>
                </div>
              </div>

              <div className="flex items-center gap-3">
                <motion.button
                  whileTap={{ scale: 0.96 }}
                  onClick={() => setStep("input")}
                  className="flex-1 py-3.5 rounded-2xl bg-muted text-foreground text-xs font-semibold cursor-pointer hover:bg-muted"
                >
                  Back & Edit
                </motion.button>
                <motion.button
                  whileTap={{ scale: 0.96 }}
                  disabled={sending}
                  onClick={handleSend}
                  className="flex-2 py-3.5 rounded-2xl btn-enterprise-primary text-primary-foreground cursor-pointer disabled:opacity-50"
                >
                  {sending ? "Broadcasting on Chain…" : "Sign & Send"}
                </motion.button>
              </div>
            </motion.div>
          )}

          {/* ── STEP 3: SUCCESS ── */}
          {step === "success" && (
            <motion.div
              key="success"
              initial={{ opacity: 0, scale: 0.96 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={spring}
              className="text-center py-6 space-y-4"
            >
              <div className="w-16 h-16 rounded-3xl bg-emerald-500/10 text-emerald-500 flex items-center justify-center mx-auto mb-2 border border-emerald-500/20">
                <CheckCircle2 size={32} />
              </div>
              <h3 className="text-2xl font-extrabold text-foreground">
                Transfer Completed!
              </h3>
              <p className="text-xs text-muted-foreground max-w-sm mx-auto">
                {amount} {NETWORK_CONFIG.tokenSymbol} has been sent and confirmed on BridgeStone L1.
              </p>

              {txHash && (
                <div className="p-3 rounded-2xl bg-muted border border-border text-xs font-mono text-muted-foreground break-all max-w-md mx-auto">
                  Tx: {txHash}
                </div>
              )}

              <div className="flex items-center gap-3 pt-2">
                <motion.button
                  whileTap={{ scale: 0.96 }}
                  onClick={handleReset}
                  className="flex-1 py-3.5 rounded-2xl bg-muted text-foreground text-xs font-semibold cursor-pointer"
                >
                  Send Another
                </motion.button>
                <motion.button
                  whileTap={{ scale: 0.96 }}
                  onClick={() => router.push("/dashboard")}
                  className="flex-1 py-3.5 rounded-2xl btn-enterprise-primary text-primary-foreground cursor-pointer"
                >
                  Return to Dashboard
                </motion.button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </motion.div>

      {/* QR Modal */}
      {showQR && (
        <QRModal
          isOpen={showQR}
          onClose={() => setShowQR(false)}
          address={wallet.address}
          label={NETWORK_CONFIG.tokenSymbol}
        />
      )}
    </div>
  );
}