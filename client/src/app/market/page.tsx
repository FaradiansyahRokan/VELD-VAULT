"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useStore } from "@/lib/store";
import { Search, Lock, ShoppingBag, Check, ShieldCheck, Sparkles, ExternalLink } from "lucide-react";
import { motion } from "framer-motion";
import { NETWORK_CONFIG } from "@/lib/constants";
import { toast } from "sonner";
import PriceHistory from "@/components/PriceHistory";

const spring = {
  type: "spring" as const,
  stiffness: 380,
  damping: 28,
};

export default function MarketPage() {
  const router = useRouter();
  const { contract, wallet, buyAsset, marketItems, startAutoRefresh } = useStore();
  const [loadingId, setLoadingId] = useState<number | null>(null);
  const [search, setSearch] = useState("");
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    if (!contract || !wallet) {
      router.push("/login");
      return;
    }
    startAutoRefresh();
  }, [contract, wallet, router, startAutoRefresh]);

  if (!mounted || !contract) return null;

  const filtered = marketItems.filter((item: any) =>
    search
      ? item.name?.toLowerCase().includes(search.toLowerCase()) ||
        String(item.tokenId).includes(search)
      : true
  );

  const handleBuy = async (id: number, price: string) => {
    setLoadingId(id);
    const t = toast.loading(`Initiating escrow purchase for ${price} ${NETWORK_CONFIG.tokenSymbol}…`);
    try {
      await buyAsset(id, price);
      toast.dismiss(t);
      toast.success("Asset purchased! Funds escrowed pending dual confirmation.");
    } catch (e: any) {
      toast.dismiss(t);
      toast.error(e.message || "Purchase failed");
    }
    setLoadingId(null);
  };

  return (
    <div className="min-h-screen pt-24 pb-20 px-4 md:px-8 max-w-7xl mx-auto font-sans">
      {/* ── Top Header ── */}
      <motion.div
        initial={{ opacity: 0, y: 15 }}
        animate={{ opacity: 1, y: 0 }}
        transition={spring}
        className="flex flex-col md:flex-row md:items-end justify-between gap-5 mb-8 pb-6 border-b border-black/[0.05] dark:border-[#ABD2FA]/15"
      >
        <div>
          <h1 className="text-3xl md:text-5xl font-extrabold tracking-tight text-foreground">
            Digital <span className="text-muted-foreground font-normal">Marketplace</span>
          </h1>
          <p className="text-xs md:text-sm text-muted-foreground mt-1.5">
            Buy and sell encrypted files with trustless dual-confirmation escrow.
          </p>
        </div>

        {/* Search Input Bar */}
        <div className="relative w-full md:w-80">
          <Search
            size={16}
            className="absolute left-3.5 top-1/2 -translate-y-1/2 text-muted-foreground"
          />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search assets or #ID…"
            className="w-full pl-10 pr-9 py-2.5 rounded-2xl bg-card border border-border text-xs font-medium text-foreground placeholder:text-muted-foreground outline-none focus:border-[#7692FF] focus:ring-4 focus:ring-[#7692FF]/15 transition-all shadow-sm"
          />
          {search && (
            <button
              onClick={() => setSearch("")}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-muted-foreground hover:text-foreground"
            >
              ✕
            </button>
          )}
        </div>
      </motion.div>

      {/* ── Active Listings Counter Pill ── */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-2">
          <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
          <span className="text-xs font-bold text-foreground">
            {filtered.length} Active Listing{filtered.length !== 1 ? "s" : ""}
          </span>
          <span className="text-xs text-muted-foreground">· Synchronized every 4s</span>
        </div>
      </div>

      {/* ── Marketplace Grid ── */}
      {filtered.length === 0 ? (
        <motion.div
          initial={{ opacity: 0, scale: 0.98 }}
          animate={{ opacity: 1, scale: 1 }}
          className="rounded-3xl p-16 text-center ios-card flex flex-col items-center justify-center"
        >
          <div className="w-16 h-16 rounded-3xl bg-[#7692FF]/15 text-[#1B2CC1] dark:text-[#7692FF] flex items-center justify-center mb-4 border border-[#7692FF]/20">
            <ShoppingBag size={28} />
          </div>
          <h3 className="text-xl font-bold text-foreground">
            {search ? "No Matches Found" : "Marketplace is Currently Quiet"}
          </h3>
          <p className="text-xs text-muted-foreground max-w-sm mt-1 mb-6">
            {search
              ? `No listed assets match "${search}". Try clearing your search.`
              : "No assets are listed for sale at the moment. You can list items from your vault."}
          </p>
          <motion.button
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.96 }}
            onClick={() => router.push("/vault")}
            className="px-5 py-2.5 rounded-2xl btn-enterprise-primary text-primary-foreground"
          >
            Go to My Vault
          </motion.button>
        </motion.div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5">
          {filtered.map((item: any, i: number) => {
            const isLoading = loadingId === item.tokenId;
            const isSelf = wallet?.address.toLowerCase() === item.seller?.toLowerCase();

            return (
              <motion.div
                key={`market-${item.tokenId}`}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ ...spring, delay: i * 0.04 }}
                className="rounded-3xl ios-card transition-all flex flex-col justify-between overflow-hidden group hover:border-primary/50"
              >
                {/* Image / Thumbnail Container */}
                <div className="relative h-48 bg-background/60 flex items-center justify-center overflow-hidden border-b border-border">
                  {item.previewURI ? (
                    <img
                      src={`${NETWORK_CONFIG.ipfsGateway}/ipfs/${item.previewURI}`}
                      alt={item.name}
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                      onError={(e: any) => {
                        e.target.style.display = "none";
                      }}
                    />
                  ) : (
                    <div className="flex flex-col items-center gap-2 text-muted-foreground">
                      <div className="w-12 h-12 rounded-2xl bg-[#7692FF]/10 text-[#1B2CC1] dark:text-[#7692FF] flex items-center justify-center border border-[#7692FF]/20">
                        <Lock size={20} />
                      </div>
                      <span className="text-[10px] font-bold uppercase tracking-wider text-[#1B2CC1] dark:text-[#ABD2FA]">
                        Encrypted File
                      </span>
                    </div>
                  )}

                  {/* Floating Top Badges */}
                  <div className="absolute top-3 inset-x-3 flex items-center justify-between pointer-events-none">
                    <span className="px-2.5 py-1 rounded-full text-[10px] font-mono font-bold bg-background/80 backdrop-blur-md text-white border border-[#ABD2FA]/30">
                      #{item.tokenId}
                    </span>

                    <div className="flex items-center gap-1">
                      {item.useEscrow && (
                        <span className="px-2.5 py-1 rounded-full text-[10px] font-bold bg-emerald-600/90 backdrop-blur-md text-white shadow-sm border border-emerald-400/30">
                          Escrow Protected
                        </span>
                      )}
                      {isSelf && (
                        <span className="px-2.5 py-1 rounded-full text-[10px] font-bold bg-primary/90 backdrop-blur-md text-primary-foreground shadow-sm border border-[#ABD2FA]/30">
                          Your Asset
                        </span>
                      )}
                    </div>
                  </div>
                </div>

                {/* Content Info */}
                <div className="p-5 flex-1 flex flex-col justify-between">
                  <div>
                    <h3 className="text-base font-bold text-foreground truncate group-hover:text-[#1B2CC1] dark:group-hover:text-[#7692FF] transition-colors" title={item.name}>
                      {item.name}
                    </h3>
                    <p className="text-xs text-muted-foreground line-clamp-2 mt-1 min-h-[32px]">
                      {item.description || "No description provided for this asset."}
                    </p>
                    <p className="text-[10px] font-mono text-muted-foreground mt-2">
                      Seller: {item.seller?.slice(0, 6)}…{item.seller?.slice(-4)}
                    </p>
                  </div>

                  {/* Price Row */}
                  <div className="mt-4 pt-4 border-t border-border flex items-baseline justify-between">
                    <div>
                      <span className="text-[10px] uppercase font-bold text-muted-foreground tracking-wider block">
                        Price
                      </span>
                      <div className="flex items-baseline gap-1 mt-0.5">
                        <span className="text-xl font-extrabold text-foreground tabular-nums">
                          {item.price}
                        </span>
                        <span className="text-xs font-bold text-[#1B2CC1] dark:text-[#7692FF]">
                          {NETWORK_CONFIG.tokenSymbol}
                        </span>
                      </div>
                    </div>
                    <PriceHistory tokenId={item.tokenId} currentPrice={item.price} compact />
                  </div>
                </div>

                {/* Buy Action Button */}
                <div className="p-3 bg-slate-50/60 dark:bg-[#091540]/40 border-t border-border">
                  <motion.button
                    whileTap={{ scale: 0.96 }}
                    disabled={isLoading || isSelf}
                    onClick={() => handleBuy(item.tokenId, item.price)}
                    className={`w-full py-3 rounded-2xl text-xs font-bold flex items-center justify-center gap-2 shadow-sm transition-all cursor-pointer ${
                      isSelf
                        ? "bg-slate-100 dark:bg-white/[0.06] text-muted-foreground cursor-not-allowed"
                        : "bg-primary hover:bg-[#15229E] text-white shadow-sm"
                    }`}
                  >
                    {isSelf ? (
                      <span>Your Listing</span>
                    ) : isLoading ? (
                      <span>Securing in Escrow…</span>
                    ) : (
                      <>
                        <ShoppingBag size={14} />
                        <span>Acquire Asset</span>
                      </>
                    )}
                  </motion.button>
                </div>
              </motion.div>
            );
          })}
        </div>
      )}
    </div>
  );
}