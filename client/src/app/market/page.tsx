"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useStore } from "@/lib/store";
import { Search, Lock } from "lucide-react";
import { motion } from "framer-motion";
import { Button } from "@/components/ui-kits";
import { NETWORK_CONFIG } from "@/lib/constants";
import { toast } from "sonner";
import PriceHistory from "@/components/PriceHistory";

const SERIF = "'EB Garamond', 'Cormorant Garamond', Georgia, serif";
const MONO = "'JetBrains Mono', 'Courier New', monospace";
const ease: [number, number, number, number] = [0.16, 1, 0.3, 1];

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
    search ? item.name?.toLowerCase().includes(search.toLowerCase()) || String(item.tokenId).includes(search) : true
  );

  const handleBuy = async (id: number, price: string) => {
    setLoadingId(id);
    const t = toast.loading("Processing purchase…");
    try { await buyAsset(id, price); toast.dismiss(t); toast.success("Asset acquired."); }
    catch (e: any) { toast.dismiss(t); toast.error(e.message || "Purchase failed"); }
    setLoadingId(null);
  };

  return (
    <div style={{ minHeight: "100vh", background: "var(--cv-bg)", color: "var(--cv-fg)" }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=EB+Garamond:ital,wght@0,400;0,500;1,400;1,500&display=swap');
        :root{--cv-bg:#FAFAF8;--cv-fg:#0A0A0A;--cv-muted:#6B6B6B;--cv-border:#D8D4CC;--cv-border-light:#EDEAE4;--cv-card:#FFFFFF;--cv-surface:#F4F2EE;--cv-ink-light:#3A3A3A;}
        .dark{--cv-bg:#0A0A08;--cv-fg:#F0EDE6;--cv-muted:#8A857C;--cv-border:#2A2820;--cv-border-light:#1E1C18;--cv-card:#111109;--cv-surface:#161410;--cv-ink-light:#C5BFB5;}
        .cv-market-card{border:1px solid var(--cv-border-light);background:var(--cv-card);transition:border-color 0.4s,transform 0.4s;display:flex;flex-direction:column;}
        .cv-market-card:hover{border-color:var(--cv-border);transform:translateY(-3px);}
        .cv-buy-btn{width:100%;background:var(--cv-fg);color:var(--cv-bg);border:1px solid var(--cv-fg);padding:14px;font-family:${SERIF};font-size:10px;letter-spacing:0.18em;text-transform:uppercase;cursor:pointer;transition:all 0.35s;position:relative;overflow:hidden;}
        .cv-buy-btn::before{content:'';position:absolute;inset:0;background:var(--cv-bg);transform:scaleX(0);transform-origin:right;transition:transform 0.45s cubic-bezier(0.16,1,0.3,1);}
        .cv-buy-btn:hover::before{transform:scaleX(1);transform-origin:left;}
        .cv-buy-btn:hover{color:var(--cv-fg);}
        .cv-buy-btn span{position:relative;z-index:1;}
        .cv-buy-btn:disabled{background:var(--cv-surface);color:var(--cv-muted);border-color:var(--cv-border-light);cursor:not-allowed;}
        .cv-buy-btn:disabled::before{display:none;}
        .cv-search{width:100%;background:transparent;border:none;border-bottom:1px solid var(--cv-border-light);padding:14px 0 14px 28px;font-family:${SERIF};font-size:16px;color:var(--cv-fg);outline:none;transition:border-color 0.3s;font-style:italic;}
        .cv-search:focus{border-bottom-color:var(--cv-fg);}
        .cv-search::placeholder{color:var(--cv-muted);}
      `}</style>

      <div style={{ maxWidth: "1280px", margin: "0 auto", padding: "120px 48px 96px" }}>

        {/* ── Header ── */}
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.8, ease }}
          style={{ paddingBottom: "40px", borderBottom: "1px solid var(--cv-border-light)", marginBottom: "48px" }}>
          <p style={{ fontSize: "9px", letterSpacing: "0.28em", textTransform: "uppercase", color: "var(--cv-muted)", fontFamily: SERIF, fontStyle: "italic", marginBottom: "16px" }}>
            Encrypted Digital Assets · {NETWORK_CONFIG.name}
          </p>

          <div style={{ display: "flex", alignItems: "center", gap: "16px", marginBottom: "16px" }}>
            <div style={{ flex: 1, height: "1px", background: "var(--cv-border-light)" }} />
            <div style={{ width: "5px", height: "5px", border: "1px solid var(--cv-border)", transform: "rotate(45deg)", flexShrink: 0 }} />
            <div style={{ flex: 1, height: "1px", background: "var(--cv-border-light)" }} />
          </div>

          <div style={{ display: "flex", alignItems: "flex-end", justifyContent: "space-between", flexWrap: "wrap", gap: "24px" }}>
            <h1 style={{ fontFamily: SERIF, fontSize: "clamp(52px, 8vw, 80px)", fontWeight: 400, letterSpacing: "-0.03em", lineHeight: 0.9, margin: 0 }}>
              Marketplace<br /><em style={{ color: "var(--cv-muted)" }}>Exchange.</em>
            </h1>

            {/* Search */}
            <div style={{ position: "relative", minWidth: "280px", flex: "0 1 380px" }}>
              <Search size={13} strokeWidth={1.5} style={{ position: "absolute", left: 0, top: "50%", transform: "translateY(-50%)", color: "var(--cv-muted)" }} />
              <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search by name or token ID…" className="cv-search" />
              {search && (
                <button onClick={() => setSearch("")} style={{ position: "absolute", right: 0, top: "50%", transform: "translateY(-50%)", background: "none", border: "none", cursor: "pointer", fontFamily: SERIF, fontSize: "9px", letterSpacing: "0.18em", color: "var(--cv-muted)", padding: 0 }}>
                  Clear
                </button>
              )}
            </div>
          </div>

          {/* Stats */}
          {marketItems.length > 0 && (
            <div style={{ display: "flex", alignItems: "center", gap: "24px", marginTop: "20px" }}>
              <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                <span style={{ width: "5px", height: "5px", borderRadius: "50%", background: "#4ade80", display: "inline-block" }} />
                <span style={{ fontFamily: SERIF, fontSize: "9px", letterSpacing: "0.18em", textTransform: "uppercase", color: "var(--cv-muted)" }}>
                  {filtered.length} listing{filtered.length !== 1 ? "s" : ""} available
                </span>
              </div>
              <span style={{ fontFamily: SERIF, fontSize: "9px", letterSpacing: "0.14em", color: "var(--cv-muted)", fontStyle: "italic" }}>
                Live · updates every 4s
              </span>
            </div>
          )}
        </motion.div>

        {/* ── Grid ── */}
        {filtered.length === 0 ? (
          <div style={{ border: "1px solid var(--cv-border-light)", padding: "96px 48px", textAlign: "center" }}>
            <p style={{ fontFamily: SERIF, fontSize: "28px", fontWeight: 400, color: "var(--cv-fg)", marginBottom: "12px" }}>
              {search ? "No results found." : "No assets listed."}
            </p>
            <p style={{ fontFamily: SERIF, fontSize: "13px", fontStyle: "italic", color: "var(--cv-muted)" }}>
              {search ? "Try a different search term." : "Check back later for new listings."}
            </p>
          </div>
        ) : (
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))", gap: "2px" }}>
            {filtered.map((item: any, i: number) => {
              const isLoading = loadingId === item.tokenId;
              const isSelf = wallet?.address.toLowerCase() === item.seller?.toLowerCase();

              return (
                <motion.div key={`market-${item.tokenId}`} initial={{ y: 20, opacity: 0 }} animate={{ y: 0, opacity: 1 }} transition={{ delay: i * 0.05, ease }}
                  className="cv-market-card">

                  {/* Thumbnail */}
                  <div style={{ height: "200px", background: "var(--cv-surface)", position: "relative", overflow: "hidden", display: "flex", alignItems: "center", justifyContent: "center", borderBottom: "1px solid var(--cv-border-light)" }}>
                    {item.previewURI ? (
                      <img src={`${NETWORK_CONFIG.ipfsGateway}/ipfs/${item.previewURI}`} style={{ width: "100%", height: "100%", objectFit: "cover" }}
                        onError={(e: any) => { e.target.style.display = "none"; }} alt={item.name} />
                    ) : (
                      <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: "8px", opacity: 0.25 }}>
                        <Lock size={32} strokeWidth={1} />
                        <span style={{ fontFamily: SERIF, fontSize: "9px", letterSpacing: "0.2em", textTransform: "uppercase" }}>Encrypted</span>
                      </div>
                    )}
                    {/* Badges */}
                    <div style={{ position: "absolute", top: "12px", right: "12px", display: "flex", flexDirection: "column", gap: "4px", alignItems: "flex-end" }}>
                      {item.useEscrow && (
                        <span style={{ background: "rgba(0,0,0,0.65)", backdropFilter: "blur(8px)", padding: "4px 10px", fontFamily: SERIF, fontSize: "8px", letterSpacing: "0.16em", textTransform: "uppercase", color: "#fff" }}>Escrow</span>
                      )}
                      <span style={{ background: "rgba(0,0,0,0.65)", backdropFilter: "blur(8px)", padding: "4px 10px", fontFamily: MONO, fontSize: "9px", color: "#fff" }}>
                        #{item.tokenId}
                      </span>
                    </div>
                    {isSelf && (
                      <span style={{ position: "absolute", bottom: "12px", left: "12px", background: "rgba(0,0,0,0.65)", backdropFilter: "blur(8px)", padding: "4px 10px", fontFamily: SERIF, fontSize: "8px", letterSpacing: "0.16em", textTransform: "uppercase", color: "rgba(255,255,255,0.7)" }}>
                        Your Asset
                      </span>
                    )}
                  </div>

                  {/* Info */}
                  <div style={{ padding: "20px 22px", flex: 1, display: "flex", flexDirection: "column" }}>
                    <p style={{ fontFamily: SERIF, fontSize: "18px", fontWeight: 400, letterSpacing: "-0.01em", color: "var(--cv-fg)", marginBottom: "4px", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                      {item.name}
                    </p>
                    {item.description && (
                      <p style={{ fontFamily: SERIF, fontSize: "11px", fontStyle: "italic", color: "var(--cv-muted)", marginBottom: "12px", overflow: "hidden", display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical" }}>
                        {item.description}
                      </p>
                    )}
                    <p style={{ fontFamily: MONO, fontSize: "9px", color: "var(--cv-muted)", marginBottom: "auto" }}>
                      {item.seller?.slice(0, 8)}…{item.seller?.slice(-4)}
                    </p>

                    {/* Price row */}
                    <div style={{ marginTop: "16px", paddingTop: "16px", borderTop: "1px solid var(--cv-border-light)", display: "flex", justifyContent: "space-between", alignItems: "flex-end", marginBottom: "14px" }}>
                      <div>
                        <p style={{ fontSize: "9px", letterSpacing: "0.18em", textTransform: "uppercase", color: "var(--cv-muted)", fontFamily: SERIF, marginBottom: "4px" }}>Price</p>
                        <p style={{ fontFamily: SERIF, fontSize: "26px", fontWeight: 400, letterSpacing: "-0.02em", color: "var(--cv-fg)", lineHeight: 1 }}>
                          {item.price} <em style={{ fontSize: "13px", color: "var(--cv-muted)" }}>{NETWORK_CONFIG.tokenSymbol}</em>
                        </p>
                      </div>
                      <PriceHistory tokenId={item.tokenId} currentPrice={item.price} compact />
                    </div>
                  </div>

                  {/* Buy button */}
                  <button className="cv-buy-btn" onClick={() => handleBuy(item.tokenId, item.price)} disabled={isLoading || isSelf}>
                    <span>{isSelf ? "Your Listing" : isLoading ? "Processing…" : `Acquire · ${item.price} ${NETWORK_CONFIG.tokenSymbol}`}</span>
                  </button>
                </motion.div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}