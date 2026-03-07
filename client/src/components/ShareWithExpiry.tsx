"use client";

import { useState, useCallback } from "react";
import { useStore } from "@/lib/store";
import { motion, AnimatePresence } from "framer-motion";
import { ethers } from "ethers";
import {
    Clock, Link2, Copy, Check, AlertTriangle, Shield,
    Timer, Eye,
} from "lucide-react";
import { toast } from "sonner";
import { NETWORK_CONFIG } from "@/lib/constants";

interface ShareLink {
    url: string;
    expiresAt: number;
    tokenId: number;
    maxViews: number;
}

const DURATIONS = [
    { label: "1 Jam", ms: 3_600_000 },
    { label: "24 Jam", ms: 86_400_000 },
    { label: "7 Hari", ms: 604_800_000 },
    { label: "30 Hari", ms: 2_592_000_000 },
];

const MAX_VIEWS = [1, 3, 5, 10, 999];

export default function ShareWithExpiry({
    tokenId,
    fileName,
    onClose,
}: {
    tokenId: number;
    fileName?: string;
    onClose?: () => void;
}) {
    const { wallet, signer } = useStore();

    const [duration, setDuration] = useState(DURATIONS[1]);
    const [maxViews, setMaxViews] = useState(3);
    const [link, setLink] = useState<ShareLink | null>(null);
    const [loading, setLoading] = useState(false);
    const [copied, setCopied] = useState(false);

    const generateLink = useCallback(async () => {
        if (!wallet || !signer) return;
        setLoading(true);
        try {
            const expiresAt = Date.now() + duration.ms;

            // Build a signed token: tokenId + expiresAt + maxViews
            const payload = `CipherVault Share\nTokenId: ${tokenId}\nExpires: ${expiresAt}\nMaxViews: ${maxViews}\nChain: ${NETWORK_CONFIG.chainId}`;
            const w = signer as ethers.Wallet;
            const signature = await w.signMessage(payload);

            // Encode as base64 URL param
            const shareData = btoa(JSON.stringify({ tokenId, expiresAt, maxViews, signature, signer: wallet.address }));
            const url = `${window.location.origin}/share/${shareData}`;

            setLink({ url, expiresAt, tokenId, maxViews });
        } catch (e: any) {
            toast.error(e.message || "Gagal membuat link");
        } finally {
            setLoading(false);
        }
    }, [wallet, signer, tokenId, duration, maxViews]);

    const handleCopy = () => {
        if (!link) return;
        navigator.clipboard.writeText(link.url);
        setCopied(true);
        toast.success("Link disalin!");
        setTimeout(() => setCopied(false), 2000);
    };

    const timeLeft = link ? formatDuration(link.expiresAt - Date.now()) : null;

    return (
        <div className="w-full max-w-md mx-auto space-y-5">
            {/* Header */}
            <div className="flex items-start gap-3 p-4 rounded-2xl bg-amber-500/5 border border-amber-500/20">
                <Clock size={16} className="text-amber-400 mt-0.5 shrink-0" />
                <div>
                    <p className="text-sm font-bold text-foreground">Bagikan dengan Batas Waktu</p>
                    <p className="text-[11px] text-muted-foreground mt-0.5 leading-relaxed">
                        Buat link sementara untuk file <span className="font-semibold text-foreground">{fileName || `#${tokenId}`}</span>.
                        Setelah expired atau view limit tercapai, link otomatis tidak bisa diakses.
                    </p>
                </div>
            </div>

            {!link ? (
                <>
                    {/* Duration picker */}
                    <div>
                        <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest mb-2">Berlaku Selama</p>
                        <div className="grid grid-cols-4 gap-2">
                            {DURATIONS.map((d) => (
                                <button
                                    key={d.label}
                                    onClick={() => setDuration(d)}
                                    className={`py-2.5 rounded-xl text-xs font-bold transition-all ${duration.label === d.label
                                            ? "bg-primary text-primary-foreground shadow-lg shadow-primary/20"
                                            : "bg-muted/30 text-muted-foreground hover:bg-muted/50 hover:text-foreground"
                                        }`}
                                >
                                    {d.label}
                                </button>
                            ))}
                        </div>
                    </div>

                    {/* Max views picker */}
                    <div>
                        <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest mb-2 flex items-center gap-1.5">
                            <Eye size={10} /> Batas Tampil
                        </p>
                        <div className="flex gap-2">
                            {MAX_VIEWS.map((v) => (
                                <button
                                    key={v}
                                    onClick={() => setMaxViews(v)}
                                    className={`flex-1 py-2.5 rounded-xl text-xs font-bold transition-all ${maxViews === v
                                            ? "bg-primary text-primary-foreground shadow-lg shadow-primary/20"
                                            : "bg-muted/30 text-muted-foreground hover:bg-muted/50 hover:text-foreground"
                                        }`}
                                >
                                    {v === 999 ? "∞" : v}×
                                </button>
                            ))}
                        </div>
                    </div>

                    {/* Security note */}
                    <div className="flex items-start gap-2.5 p-3 rounded-xl bg-blue-500/5 border border-blue-500/15">
                        <Shield size={13} className="text-blue-400 mt-0.5 shrink-0" />
                        <p className="text-[10px] text-muted-foreground leading-relaxed">
                            Link berisi signature kriptografis dari wallet kamu. File hanya bisa dilihat oleh yang punya link, dan hanya dalam batas waktu & tampil yang ditentukan.
                        </p>
                    </div>

                    <button
                        onClick={generateLink}
                        disabled={loading}
                        className="w-full h-11 rounded-xl bg-primary text-primary-foreground font-bold text-sm flex items-center justify-center gap-2 hover:opacity-90 disabled:opacity-50 transition-all shadow-lg shadow-primary/20"
                    >
                        {loading ? (
                            <span className="flex items-center gap-2">
                                <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24" fill="none">
                                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z" />
                                </svg>
                                Membuat link...
                            </span>
                        ) : (
                            <><Link2 size={15} /> Buat Share Link</>
                        )}
                    </button>
                </>
            ) : (
                /* Result */
                <AnimatePresence>
                    <motion.div
                        initial={{ opacity: 0, y: 12 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="space-y-4"
                    >
                        {/* Link display */}
                        <div className="p-4 rounded-2xl bg-emerald-500/5 border border-emerald-500/20 space-y-3">
                            <div className="flex items-center gap-2">
                                <div className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                                <span className="text-xs font-bold text-emerald-600 dark:text-emerald-400">Link berhasil dibuat</span>
                            </div>

                            <div className="p-3 bg-muted/20 border border-border/40 rounded-xl">
                                <p className="text-[10px] font-mono text-muted-foreground break-all leading-relaxed line-clamp-3">
                                    {link.url}
                                </p>
                            </div>

                            {/* Meta */}
                            <div className="flex items-center justify-between text-[11px]">
                                <div className="flex items-center gap-1.5 text-amber-500">
                                    <Timer size={11} />
                                    <span className="font-bold">Expired: {timeLeft}</span>
                                </div>
                                <div className="flex items-center gap-1.5 text-muted-foreground">
                                    <Eye size={11} />
                                    <span>Max {link.maxViews === 999 ? "∞" : link.maxViews}× tampil</span>
                                </div>
                            </div>
                        </div>

                        {/* Warning */}
                        <div className="flex items-start gap-2 p-3 rounded-xl bg-red-500/5 border border-red-500/15">
                            <AlertTriangle size={12} className="text-red-400 mt-0.5 shrink-0" />
                            <p className="text-[10px] text-muted-foreground leading-relaxed">
                                Siapapun dengan link ini bisa melihat file. Jangan bagikan sembarangan. Link ini tidak bisa dibatalkan setelah dibuat.
                            </p>
                        </div>

                        {/* Actions */}
                        <div className="flex gap-2">
                            <button
                                onClick={handleCopy}
                                className="flex-1 h-11 rounded-xl bg-primary text-primary-foreground font-bold text-sm flex items-center justify-center gap-2 hover:opacity-90 transition-opacity shadow-lg shadow-primary/20"
                            >
                                {copied ? <><Check size={14} /> Disalin!</> : <><Copy size={14} /> Salin Link</>}
                            </button>
                            <button
                                onClick={() => setLink(null)}
                                className="h-11 px-4 rounded-xl bg-muted/30 text-muted-foreground text-sm hover:bg-muted/50 transition-colors"
                            >
                                Buat Lagi
                            </button>
                        </div>
                    </motion.div>
                </AnimatePresence>
            )}
        </div>
    );
}

function formatDuration(ms: number): string {
    if (ms <= 0) return "Expired";
    const hours = Math.floor(ms / 3_600_000);
    const days = Math.floor(ms / 86_400_000);
    if (days >= 1) return `${days} hari`;
    return `${hours} jam`;
}