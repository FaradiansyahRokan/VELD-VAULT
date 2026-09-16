"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useStore } from "@/lib/store";
import { motion } from "framer-motion";
import {
  Shield,
  Lock,
  ShoppingBag,
  Zap,
  Cpu,
  Layers,
  ArrowRight,
  Sparkles,
  ExternalLink,
  CheckCircle2,
  Database,
  Key,
} from "lucide-react";
import { NETWORK_CONFIG } from "@/lib/constants";
import { ethers } from "ethers";

const spring = {
  type: "spring" as const,
  stiffness: 380,
  damping: 28,
};

export default function LandingPage() {
  const router = useRouter();
  const { wallet } = useStore();
  const [blockHeight, setBlockHeight] = useState<number | null>(null);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    const fetchBlock = async () => {
      try {
        const rpc = process.env.NEXT_PUBLIC_RPC_URL || "/api/rpc";
        const provider = new ethers.JsonRpcProvider(rpc);
        const block = await provider.getBlockNumber();
        setBlockHeight(block);
      } catch (e) {
        // silent fallback
      }
    };
    fetchBlock();
    const interval = setInterval(fetchBlock, 4000);
    return () => clearInterval(interval);
  }, []);

  return (
    <div className="relative min-h-screen overflow-hidden font-sans">
      {/* Background Soft Ambient Light Blobs — Subtle & Clean */}
      <div className="absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-primary/[0.04] dark:bg-primary/20 rounded-full blur-[140px] pointer-events-none" />
      <div className="absolute top-2/3 right-1/4 w-[450px] h-[450px] bg-[#7692FF]/[0.03] dark:bg-[#7692FF]/15 rounded-full blur-[120px] pointer-events-none" />

      {/* ── HERO SECTION ── */}
      <section className="pt-32 md:pt-40 pb-20 px-4 md:px-8 max-w-6xl mx-auto text-center relative z-10">
        {/* Network Pill Badge */}
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={spring}
          className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-white dark:bg-background border border-border shadow-sm mb-6"
        >
          <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse shadow-sm shadow-emerald-500/50" />
          <span className="text-xs font-semibold text-foreground">
            {NETWORK_CONFIG.name} · Chain ID {NETWORK_CONFIG.chainId}
          </span>
          {blockHeight !== null && (
            <span className="text-xs font-mono font-bold text-[#1B2CC1] dark:text-[#ABD2FA] ml-1">
              Block #{blockHeight.toLocaleString()}
            </span>
          )}
        </motion.div>

        {/* Hero Headline */}
        <motion.h1
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ ...spring, delay: 0.05 }}
          className="text-4xl sm:text-6xl md:text-7xl font-black tracking-tight text-foreground max-w-4xl mx-auto leading-[1.08]"
        >
          Non-custodial encryption, <br className="hidden sm:inline" />
          <span className="text-[#1B2CC1] dark:text-[#7692FF]">
            built for sovereign vaults.
          </span>
        </motion.h1>

        {/* Subtitle */}
        <motion.p
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ ...spring, delay: 0.1 }}
          className="text-base sm:text-lg md:text-xl text-muted-foreground max-w-2xl mx-auto mt-6 mb-10 leading-relaxed font-normal"
        >
          Store, transfer, and trade confidential documents end-to-end encrypted with AES-GCM and Avalanche Subnet decentralized consensus.
        </motion.p>

        {/* Hero CTA Buttons */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ ...spring, delay: 0.15 }}
          className="flex flex-col sm:flex-row items-center justify-center gap-3.5"
        >
          <motion.button
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.97 }}
            onClick={() => router.push(wallet ? "/dashboard" : "/login")}
            className="w-full sm:w-auto px-8 py-4 rounded-2xl bg-primary hover:bg-primary/90 text-primary-foreground font-bold text-sm shadow-sm flex items-center justify-center gap-2 cursor-pointer transition-all"
          >
            <span>{wallet ? "Open Dashboard" : "Launch Vault App"}</span>
            <ArrowRight size={16} />
          </motion.button>

          <motion.button
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.97 }}
            onClick={() => router.push("/market")}
            className="w-full sm:w-auto px-7 py-4 rounded-2xl bg-card hover:bg-slate-50 dark:hover:bg-[#112366] text-foreground font-semibold text-sm border border-border shadow-sm flex items-center justify-center gap-2 cursor-pointer transition-all"
          >
            <ShoppingBag size={16} className="text-[#1B2CC1] dark:text-[#7692FF]" />
            <span>Explore Marketplace</span>
          </motion.button>
        </motion.div>
      </section>

      {/* ── LIVE METRICS PREVIEW WIDGETS ── */}
      <section className="px-4 md:px-8 max-w-5xl mx-auto mb-20 relative z-10">
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ ...spring, delay: 0.2 }}
          className="rounded-3xl p-6 md:p-8 bg-card border border-border shadow-sm grid grid-cols-2 md:grid-cols-4 gap-4"
        >
          <div className="p-4 rounded-2xl bg-background border border-border">
            <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground block mb-1">
              Consensus VM
            </span>
            <div className="text-xl md:text-2xl font-extrabold text-foreground">
              Subnet EVM
            </div>
            <span className="text-xs text-emerald-600 dark:text-emerald-400 font-medium">
              AvalancheGo v0.8
            </span>
          </div>

          <div className="p-4 rounded-2xl bg-background border border-border">
            <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground block mb-1">
              Native Token
            </span>
            <div className="text-xl md:text-2xl font-extrabold text-[#1B2CC1] dark:text-[#ABD2FA]">
              {NETWORK_CONFIG.tokenSymbol}
            </div>
            <span className="text-xs text-muted-foreground font-medium">
              Fixed Supply Minter
            </span>
          </div>

          <div className="p-4 rounded-2xl bg-background border border-border">
            <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground block mb-1">
              Block Latency
            </span>
            <div className="text-xl md:text-2xl font-extrabold text-foreground">
              ~1.0s
            </div>
            <span className="text-xs text-emerald-600 dark:text-emerald-400 font-medium">
              Instant Finality
            </span>
          </div>

          <div className="p-4 rounded-2xl bg-background border border-border">
            <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground block mb-1">
              Storage Layer
            </span>
            <div className="text-xl md:text-2xl font-extrabold text-foreground">
              IPFS Kubo
            </div>
            <span className="text-xs text-muted-foreground font-medium">
              Private Cluster
            </span>
          </div>
        </motion.div>
      </section>

      {/* ── THREE PILLARS FEATURE CARDS ── */}
      <section className="px-4 md:px-8 max-w-6xl mx-auto pb-28 relative z-10">
        <div className="text-center mb-12">
          <h2 className="text-2xl sm:text-4xl font-extrabold text-foreground tracking-tight">
            Engineered for Uncompromising Privacy
          </h2>
          <p className="text-xs sm:text-sm text-muted-foreground max-w-md mx-auto mt-2">
            Every file is encrypted on your local hardware before leaving your machine.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {/* Card 1 */}
          <motion.div
            whileHover={{ y: -3 }}
            className="p-7 rounded-3xl bg-card border border-border shadow-sm hover:shadow-md transition-all flex flex-col justify-between"
          >
            <div>
              <div className="w-12 h-12 rounded-2xl bg-primary/10 text-[#1B2CC1] dark:text-[#7692FF] flex items-center justify-center mb-5 border border-[#1B2CC1]/15">
                <Shield size={22} className="stroke-[2.2]" />
              </div>
              <h3 className="text-lg font-bold text-foreground mb-2">
                End-to-End Cryptography
              </h3>
              <p className="text-xs text-muted-foreground leading-relaxed">
                Files are encrypted with high-throughput AES-GCM using keys derived from your Ethereum wallet signature (EIP-191). Neither server nor miners can decrypt your data.
              </p>
            </div>
          </motion.div>

          {/* Card 2 */}
          <motion.div
            whileHover={{ y: -3 }}
            className="p-7 rounded-3xl bg-card border border-border shadow-sm hover:shadow-md transition-all flex flex-col justify-between"
          >
            <div>
              <div className="w-12 h-12 rounded-2xl bg-[#7692FF]/15 text-[#1B2CC1] dark:text-[#ABD2FA] flex items-center justify-center mb-5 border border-[#7692FF]/20">
                <ShoppingBag size={22} className="stroke-[2.2]" />
              </div>
              <h3 className="text-lg font-bold text-foreground mb-2">
                Dual-Confirmation Escrow
              </h3>
              <p className="text-xs text-muted-foreground leading-relaxed">
                Trade encrypted digital assets peer-to-peer. Funds are securely locked in smart contracts until both buyer and seller verify delivery and decryption validity.
              </p>
            </div>
          </motion.div>

          {/* Card 3 */}
          <motion.div
            whileHover={{ y: -3 }}
            className="p-7 rounded-3xl bg-card border border-border shadow-sm hover:shadow-md transition-all flex flex-col justify-between"
          >
            <div>
              <div className="w-12 h-12 rounded-2xl bg-[#ABD2FA]/20 text-[#091540] dark:text-[#ABD2FA] flex items-center justify-center mb-5 border border-[#ABD2FA]/25">
                <Database size={22} className="stroke-[2.2]" />
              </div>
              <h3 className="text-lg font-bold text-foreground mb-2">
                Dedicated L1 Subnet
              </h3>
              <p className="text-xs text-muted-foreground leading-relaxed">
                Operating on BridgeStone, an isolated Avalanche Subnet with 1-second finality, zero network congestion, and predictable native gas economics.
              </p>
            </div>
          </motion.div>
        </div>
      </section>
    </div>
  );
}