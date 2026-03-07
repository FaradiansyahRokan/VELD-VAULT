"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useStore } from "@/lib/store";
import { ShoppingBag, Search, ShieldCheck, Lock, Zap } from "lucide-react";
import { motion } from "framer-motion";
import { Button } from "@/components/ui-kits";
import { NETWORK_CONFIG } from "@/lib/constants";
import { toast } from "sonner";

export default function MarketPage() {
  const router = useRouter();
  const { contract, wallet, buyAsset, marketItems, startAutoRefresh } = useStore();
  const [loadingId, setLoadingId] = useState<number | null>(null);
  const [search, setSearch] = useState("");
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    if (!contract || !wallet) { router.push("/"); return; }
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
    const t = toast.loading("Memproses pembelian...");
    try {
      await buyAsset(id, price);
      toast.dismiss(t);
      toast.success("Asset berhasil dibeli!");
    } catch (e: any) {
      toast.dismiss(t);
      toast.error(e.message || "Pembelian gagal");
    }
    setLoadingId(null);
  };

  return (
    <div className="min-h-screen pt-40 px-6 pb-32 max-w-[1400px] mx-auto bg-background transition-colors duration-500">

      {/* HEADER */}
      <div className="flex flex-col lg:flex-row justify-between items-end mb-20 gap-10">
        <motion.div
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.5 }}
        >
          <h1 className="text-7xl md:text-8xl font-bold tracking-tighter bg-clip-text text-transparent bg-gradient-to-br from-foreground to-foreground/40 mb-4">
            Market.
          </h1>
          <p className="text-muted-foreground font-medium text-lg tracking-wide max-w-md leading-relaxed">
            Temukan dan perdagangkan aset digital terenkripsi. Powered by{" "}
            <span className="text-foreground font-bold">{NETWORK_CONFIG.name}</span>.
          </p>
        </motion.div>

        {/* SEARCH */}
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: 0.2 }}
          className="relative group w-full lg:w-[400px]"
        >
          <div className="absolute inset-y-0 left-5 flex items-center pointer-events-none">
            <Search size={20} className="text-muted-foreground group-hover:text-foreground transition-colors" />
          </div>
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Cari nama atau ID asset..."
            className="w-full h-16 pl-14 pr-6 rounded-[2rem] bg-muted/20 border border-border/50 text-foreground placeholder:text-muted-foreground/50 focus:bg-background focus:ring-2 focus:ring-foreground/5 focus:border-foreground/20 transition-all outline-none text-base"
          />
          {search && (
            <button
              onClick={() => setSearch("")}
              className="absolute right-5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors text-xs font-bold"
            >
              CLEAR
            </button>
          )}
        </motion.div>
      </div>

      {/* STATS BAR */}
      {marketItems.length > 0 && (
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex items-center gap-4 mb-10"
        >
          <div className="flex items-center gap-2 px-4 py-2 rounded-full bg-muted/20 border border-border/30">
            <div className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
            <span className="text-xs font-bold text-muted-foreground">
              {filtered.length} Asset Listed
            </span>
          </div>
          <div className="flex items-center gap-2 px-4 py-2 rounded-full bg-muted/20 border border-border/30">
            <Zap size={12} className="text-amber-500" />
            <span className="text-xs font-bold text-muted-foreground">
              Live · Update tiap 4 detik
            </span>
          </div>
        </motion.div>
      )}

      {/* GRID */}
      {filtered.length === 0 ? (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="flex flex-col items-center justify-center py-40 bg-muted/5 rounded-[3rem] border border-dashed border-border/50"
        >
          <div className="w-24 h-24 bg-muted/10 rounded-full flex items-center justify-center mb-6">
            <ShoppingBag size={32} className="text-muted-foreground" />
          </div>
          <p className="text-muted-foreground font-medium text-lg mb-2">
            {search ? "Tidak ada hasil" : "Tidak ada asset di-listing"}
          </p>
          {search && (
            <p className="text-muted-foreground/60 text-sm">
              Coba kata kunci lain atau kosongkan pencarian
            </p>
          )}
        </motion.div>
      ) : (
        <motion.div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-8">
          {filtered.map((item: any, i: number) => {
            const isLoading = loadingId === item.tokenId;
            const isSelf    = wallet?.address.toLowerCase() === item.seller?.toLowerCase();

            return (
              <motion.div
                key={`market-${item.tokenId}`}
                initial={{ y: 30, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                transition={{ delay: i * 0.08 }}
                className="group flex flex-col bg-card border border-border/50 hover:border-primary/30 rounded-[2.5rem] overflow-hidden transition-all duration-500 hover:shadow-2xl hover:shadow-black/10 hover:-translate-y-2"
              >
                {/* THUMBNAIL */}
                <div className="h-56 bg-muted/30 relative overflow-hidden flex items-center justify-center group-hover:bg-muted/40 transition-colors">
                  {item.previewURI ? (
                    <img
                      // ✅ Pakai NETWORK_CONFIG.ipfsGateway — tidak ada hardcoded 127.0.0.1
                      src={`${NETWORK_CONFIG.ipfsGateway}/ipfs/${item.previewURI}`}
                      className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-110"
                      onError={(e: any) => { e.target.style.display = "none"; }}
                      alt={item.name}
                    />
                  ) : (
                    <div className="flex flex-col items-center gap-2 opacity-20 group-hover:opacity-40 transition-opacity">
                      <Lock size={48} />
                      <span className="text-xs font-bold tracking-widest uppercase">Encrypted</span>
                    </div>
                  )}
                  <div className="absolute top-4 right-4 flex flex-col gap-2 items-end">
                    {item.useEscrow && (
                      <span className="px-3 py-1.5 rounded-full bg-black/50 backdrop-blur-md border border-white/10 text-white text-[10px] font-bold flex items-center gap-1">
                        <ShieldCheck size={11} className="text-emerald-400" /> Escrow
                      </span>
                    )}
                    <span className="px-3 py-1.5 rounded-full bg-black/50 backdrop-blur-md border border-white/10 text-white text-[10px] font-bold">
                      #{item.tokenId}
                    </span>
                  </div>
                  {isSelf && (
                    <div className="absolute bottom-4 left-4">
                      <span className="px-3 py-1 rounded-full bg-black/60 backdrop-blur-md text-amber-400 text-[9px] font-bold uppercase tracking-wide">
                        Milik Kamu
                      </span>
                    </div>
                  )}
                </div>

                {/* INFO */}
                <div className="p-5 flex flex-col flex-1">
                  <div className="flex-1">
                    <h3 className="text-lg font-bold text-foreground truncate mb-1">
                      {item.name}
                    </h3>
                    {item.description && (
                      <p className="text-xs text-muted-foreground line-clamp-2 mb-2 leading-relaxed">
                        {item.description}
                      </p>
                    )}
                    <p className="text-xs text-muted-foreground font-mono flex items-center gap-1">
                      Seller:{" "}
                      <span className="bg-muted/50 px-1.5 py-0.5 rounded text-foreground">
                        {item.seller?.slice(0, 6)}...{item.seller?.slice(-4)}
                      </span>
                    </p>
                  </div>

                  <div className="mt-5 pt-5 border-t border-border/50 flex flex-col gap-4">
                    <div className="flex justify-between items-end">
                      <span className="text-xs font-bold text-muted-foreground uppercase tracking-wider">
                        Harga
                      </span>
                      <div className="text-right">
                        <span className="text-2xl font-bold text-foreground tracking-tight">
                          {item.price}
                        </span>
                        <span className="text-xs font-bold text-muted-foreground ml-1.5">
                          {NETWORK_CONFIG.tokenSymbol}
                        </span>
                      </div>
                    </div>
                    <Button
                      onClick={() => handleBuy(item.tokenId, item.price)}
                      disabled={isLoading || isSelf}
                      isLoading={isLoading}
                      className={`w-full h-14 rounded-[1.2rem] text-sm font-bold ${isSelf ? "opacity-50 cursor-not-allowed" : ""}`}
                    >
                      {isSelf
                        ? "Asset Milikmu"
                        : isLoading
                        ? "Memproses..."
                        : `Beli dengan ${NETWORK_CONFIG.tokenSymbol}`}
                    </Button>
                  </div>
                </div>
              </motion.div>
            );
          })}
        </motion.div>
      )}
    </div>
  );
}