"use client";

import { useEffect, useState } from "react";
import { useStore } from "@/lib/store";
import { NETWORK_CONFIG } from "@/lib/constants";
import { TrendingUp, TrendingDown, Minus } from "lucide-react";

interface PriceEvent {
  price: string;
  timestamp: number;
  event: "listed" | "sold" | "relisted";
  txHash?: string;
}

interface PriceHistoryProps {
  tokenId: number;
  currentPrice?: string;
  compact?: boolean;
}

// ── Local price history store (in-memory + localStorage) ──────
const STORAGE_KEY = "cv_price_history";

function loadHistory(): Record<string, PriceEvent[]> {
  if (typeof window === "undefined") return {};
  try { return JSON.parse(localStorage.getItem(STORAGE_KEY) || "{}"); } catch { return {}; }
}

function saveHistory(data: Record<string, PriceEvent[]>) {
  try { localStorage.setItem(STORAGE_KEY, JSON.stringify(data)); } catch {}
}

export function recordPriceEvent(tokenId: number, event: PriceEvent) {
  const data = loadHistory();
  const key = String(tokenId);
  if (!data[key]) data[key] = [];
  // Avoid duplicate timestamps
  if (!data[key].find((e) => e.timestamp === event.timestamp && e.event === event.event)) {
    data[key] = [event, ...data[key]].slice(0, 50);
    saveHistory(data);
  }
}

export default function PriceHistory({ tokenId, currentPrice, compact = false }: PriceHistoryProps) {
  const [history, setHistory] = useState<PriceEvent[]>([]);

  useEffect(() => {
    const data = loadHistory();
    setHistory(data[String(tokenId)] || []);
  }, [tokenId]);

  if (history.length === 0) {
    if (compact) return null;
    return (
      <div className="text-center py-6 text-xs text-muted-foreground">
        Belum ada riwayat harga
      </div>
    );
  }

  const prices = history.map((h) => parseFloat(h.price));
  const maxPrice = Math.max(...prices);
  const minPrice = Math.min(...prices);
  const firstPrice = prices[prices.length - 1];
  const lastPrice = prices[0];
  const change = lastPrice - firstPrice;
  const changePct = firstPrice > 0 ? ((change / firstPrice) * 100) : 0;
  const isUp = change > 0;
  const isFlat = change === 0;

  if (compact) {
    return (
      <div className={`flex items-center gap-1 text-[10px] font-bold ${isUp ? "text-emerald-500" : isFlat ? "text-muted-foreground" : "text-red-400"}`}>
        {isUp ? <TrendingUp size={10} /> : isFlat ? <Minus size={10} /> : <TrendingDown size={10} />}
        {isFlat ? "Stabil" : `${isUp ? "+" : ""}${changePct.toFixed(1)}%`}
        <span className="text-muted-foreground font-normal">vs awal</span>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Summary */}
      <div className="grid grid-cols-3 gap-3">
        {[
          { label: "Harga Saat Ini", value: currentPrice || lastPrice.toFixed(3) },
          { label: "Tertinggi", value: maxPrice.toFixed(3) },
          { label: "Terendah", value: minPrice.toFixed(3) },
        ].map((item) => (
          <div key={item.label} className="p-3 rounded-xl bg-muted/20 border border-border/40 text-center">
            <p className="text-[9px] font-bold text-muted-foreground uppercase tracking-wider mb-1">{item.label}</p>
            <p className="text-sm font-bold text-foreground">{item.value}</p>
            <p className="text-[9px] text-muted-foreground">{NETWORK_CONFIG.tokenSymbol}</p>
          </div>
        ))}
      </div>

      {/* Mini sparkline */}
      <div className="h-14 flex items-end gap-1 px-1">
        {[...prices].reverse().map((price, i) => {
          const pct = maxPrice > minPrice ? ((price - minPrice) / (maxPrice - minPrice)) * 100 : 50;
          return (
            <div
              key={i}
              className="flex-1 rounded-t-sm transition-all"
              style={{
                height: `${Math.max(10, pct)}%`,
                background: i === prices.length - 1 ? "hsl(var(--primary))" : "hsl(var(--muted-foreground) / 0.3)",
              }}
              title={`${price.toFixed(4)} ${NETWORK_CONFIG.tokenSymbol}`}
            />
          );
        })}
      </div>

      {/* Change indicator */}
      <div className={`flex items-center justify-center gap-1.5 p-2.5 rounded-xl ${
        isUp ? "bg-emerald-500/8 border border-emerald-500/20 text-emerald-500" :
        isFlat ? "bg-muted/20 border border-border/40 text-muted-foreground" :
        "bg-red-500/8 border border-red-500/20 text-red-400"
      }`}>
        {isUp ? <TrendingUp size={13} /> : isFlat ? <Minus size={13} /> : <TrendingDown size={13} />}
        <span className="text-xs font-bold">
          {isFlat ? "Harga stabil" : `${isUp ? "+" : ""}${changePct.toFixed(2)}% sejak listing pertama`}
        </span>
      </div>

      {/* History list */}
      <div className="space-y-1.5">
        <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">Riwayat</p>
        {history.map((event, i) => (
          <div key={i} className="flex items-center gap-3 py-2 border-b border-border/30 last:border-0">
            <div className={`text-lg shrink-0`}>
              {event.event === "listed" ? "🏷️" : event.event === "sold" ? "✅" : "🔄"}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-xs font-semibold text-foreground capitalize">{
                event.event === "listed" ? "Di-listing" : event.event === "sold" ? "Terjual" : "Re-listing"
              }</p>
              <p className="text-[10px] text-muted-foreground">
                {new Date(event.timestamp).toLocaleDateString("id-ID", {
                  day: "numeric", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit",
                })}
              </p>
            </div>
            <div className="text-right shrink-0">
              <p className="text-sm font-bold text-foreground">{parseFloat(event.price).toFixed(3)}</p>
              <p className="text-[9px] text-muted-foreground">{NETWORK_CONFIG.tokenSymbol}</p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}