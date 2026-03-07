"use client";

import { useState, useRef, useCallback } from "react";
import { useStore } from "@/lib/store";
import { useActivityStore } from "@/lib/activity-store";
import { notify } from "@/lib/notif-store";
import { motion, AnimatePresence } from "framer-motion";
import {
    Upload, X, CheckCircle2, AlertCircle, Loader2,
    FolderUp, File, Image, FileText, Music, Video, Pause
} from "lucide-react";
import { toast } from "sonner";

type FileStatus = "pending" | "encrypting" | "uploading" | "done" | "error";

interface FileItem {
    id: string;
    file: File;
    status: FileStatus;
    progress: number;
    error?: string;
    tokenId?: number;
}

const ICON_MAP: Record<string, React.ElementType> = {
    image: Image,
    video: Video,
    audio: Music,
    text: FileText,
};

function getIcon(type: string) {
    const prefix = type.split("/")[0];
    return ICON_MAP[prefix] || File;
}

function formatSize(bytes: number) {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
}

export default function BatchUpload({ onClose }: { onClose?: () => void }) {
    const { mintAndEncrypt, wallet, ensureGas } = useStore();
    const { addActivity } = useActivityStore();

    const [files, setFiles] = useState<FileItem[]>([]);
    const [running, setRunning] = useState(false);
    const [done, setDone] = useState(false);
    const inputRef = useRef<HTMLInputElement>(null);
    const abortRef = useRef(false);

    const addFiles = (incoming: File[]) => {
        const newItems: FileItem[] = incoming.map((f) => ({
            id: `${f.name}-${f.size}-${Date.now()}-${Math.random()}`,
            file: f,
            status: "pending",
            progress: 0,
        }));
        setFiles((prev) => [...prev, ...newItems]);
    };

    const removeFile = (id: string) => {
        setFiles((prev) => prev.filter((f) => f.id !== id));
    };

    const handleDrop = useCallback((e: React.DragEvent) => {
        e.preventDefault();
        addFiles(Array.from(e.dataTransfer.files));
    }, []);

    const runBatch = async () => {
        const pending = files.filter((f) => f.status === "pending" || f.status === "error");
        if (!pending.length || !mintAndEncrypt) return;

        setRunning(true);
        abortRef.current = false;
        setDone(false);

        let successCount = 0;

        for (const item of pending) {
            if (abortRef.current) break;

            // encrypting phase
            setFiles((prev) =>
                prev.map((f) => f.id === item.id ? { ...f, status: "encrypting", progress: 20 } : f)
            );

            await new Promise((r) => setTimeout(r, 300)); // let UI update

            // uploading phase
            setFiles((prev) =>
                prev.map((f) => f.id === item.id ? { ...f, status: "uploading", progress: 55 } : f)
            );

            try {
                await ensureGas();

                // mintAndEncrypt = enkripsi + upload IPFS + mint NFT, semua dalam satu call
                const tokenId = await mintAndEncrypt(item.file);

                setFiles((prev) =>
                    prev.map((f) =>
                        f.id === item.id ? { ...f, status: "done", progress: 100, tokenId } : f
                    )
                );

                addActivity({
                    type: "upload",
                    title: "File diupload",
                    description: `${item.file.name} · ${formatSize(item.file.size)}`,
                    walletAddress: wallet?.address || "",
                    tokenId,
                });

                successCount++;
            } catch (e: any) {
                setFiles((prev) =>
                    prev.map((f) =>
                        f.id === item.id ? { ...f, status: "error", progress: 0, error: e.message || "Upload gagal" } : f
                    )
                );
            }
        }

        setRunning(false);
        setDone(true);

        if (successCount > 0) {
            notify.success(
                `${successCount} file berhasil diupload`,
                "Semua file terenkripsi & tersimpan di vault",
                { label: "Lihat Vault", href: "/vault" }
            );
            toast.success(`${successCount} file berhasil diupload!`);
        }
    };

    const stop = () => {
        abortRef.current = true;
        setRunning(false);
    };

    const reset = () => {
        setFiles([]);
        setDone(false);
    };

    const pendingCount = files.filter((f) => f.status === "pending" || f.status === "error").length;
    const doneCount = files.filter((f) => f.status === "done").length;
    const errorCount = files.filter((f) => f.status === "error").length;
    const totalSize = files.reduce((s, f) => s + f.file.size, 0);

    return (
        <div className="w-full">
            {/* Drop Zone */}
            {files.length === 0 && (
                <div
                    onDrop={handleDrop}
                    onDragOver={(e) => e.preventDefault()}
                    onClick={() => inputRef.current?.click()}
                    className="flex flex-col items-center justify-center gap-4 py-14 px-8 border-2 border-dashed border-border/50 hover:border-primary/40 rounded-2xl cursor-pointer transition-all hover:bg-primary/2 group"
                >
                    <div className="w-14 h-14 rounded-[1.25rem] bg-primary/10 flex items-center justify-center group-hover:scale-105 transition-transform">
                        <FolderUp size={26} className="text-primary" />
                    </div>
                    <div className="text-center">
                        <p className="font-bold text-foreground mb-1">Drop banyak file sekaligus</p>
                        <p className="text-sm text-muted-foreground">Atau klik untuk pilih file</p>
                        <p className="text-xs text-muted-foreground/60 mt-1">Semua format · Terenkripsi AES-GCM per file</p>
                    </div>
                </div>
            )}

            <input
                ref={inputRef}
                type="file"
                multiple
                className="hidden"
                onChange={(e) => addFiles(Array.from(e.target.files || []))}
            />

            {/* File List */}
            {files.length > 0 && (
                <div className="space-y-3">
                    {/* Summary bar */}
                    <div className="flex items-center justify-between p-3.5 rounded-2xl bg-muted/10 border border-border/40">
                        <div className="flex items-center gap-3">
                            <span className="text-sm font-bold text-foreground">{files.length} file</span>
                            <span className="text-xs text-muted-foreground">{formatSize(totalSize)}</span>
                            {doneCount > 0 && (
                                <span className="text-xs font-bold text-emerald-500">{doneCount} selesai</span>
                            )}
                            {errorCount > 0 && (
                                <span className="text-xs font-bold text-red-400">{errorCount} gagal</span>
                            )}
                        </div>
                        <button
                            onClick={() => inputRef.current?.click()}
                            className="text-xs font-bold text-primary hover:underline"
                        >
                            + Tambah
                        </button>
                    </div>

                    {/* Files */}
                    <div className="space-y-2 max-h-72 overflow-y-auto pr-1">
                        <AnimatePresence>
                            {files.map((item) => {
                                const Icon = getIcon(item.file.type);
                                return (
                                    <motion.div
                                        key={item.id}
                                        initial={{ opacity: 0, x: -12 }}
                                        animate={{ opacity: 1, x: 0 }}
                                        exit={{ opacity: 0, x: 12 }}
                                        className="relative flex items-center gap-3 p-3.5 rounded-xl bg-card border border-border/40 overflow-hidden"
                                    >
                                        {/* Progress background */}
                                        {item.status !== "pending" && item.status !== "error" && (
                                            <div
                                                className="absolute inset-0 bg-primary/4 transition-all duration-700"
                                                style={{ width: `${item.progress}%` }}
                                            />
                                        )}

                                        <div className="relative shrink-0">
                                            <div className={`w-9 h-9 rounded-xl flex items-center justify-center ${item.status === "done" ? "bg-emerald-500/10" :
                                                    item.status === "error" ? "bg-red-500/10" :
                                                        item.status === "pending" ? "bg-muted/30" :
                                                            "bg-primary/10"
                                                }`}>
                                                {item.status === "done" ? (
                                                    <CheckCircle2 size={16} className="text-emerald-500" />
                                                ) : item.status === "error" ? (
                                                    <AlertCircle size={16} className="text-red-400" />
                                                ) : item.status === "encrypting" || item.status === "uploading" ? (
                                                    <Loader2 size={16} className="text-primary animate-spin" />
                                                ) : (
                                                    <Icon size={16} className="text-muted-foreground" />
                                                )}
                                            </div>
                                        </div>

                                        <div className="relative flex-1 min-w-0">
                                            <p className="text-sm font-semibold text-foreground truncate">{item.file.name}</p>
                                            <div className="flex items-center gap-2">
                                                <p className="text-[11px] text-muted-foreground">{formatSize(item.file.size)}</p>
                                                {item.status === "encrypting" && (
                                                    <span className="text-[10px] font-bold text-primary">Mengenkripsi...</span>
                                                )}
                                                {item.status === "uploading" && (
                                                    <span className="text-[10px] font-bold text-primary">Mengupload...</span>
                                                )}
                                                {item.status === "done" && item.tokenId !== undefined && (
                                                    <span className="text-[10px] font-bold text-emerald-500">Token #{item.tokenId}</span>
                                                )}
                                                {item.status === "error" && (
                                                    <span className="text-[10px] text-red-400 truncate">{item.error}</span>
                                                )}
                                            </div>
                                        </div>

                                        {item.status === "pending" && !running && (
                                            <button
                                                onClick={() => removeFile(item.id)}
                                                className="relative w-6 h-6 rounded-lg flex items-center justify-center text-muted-foreground hover:text-red-400 transition-colors"
                                            >
                                                <X size={12} />
                                            </button>
                                        )}
                                    </motion.div>
                                );
                            })}
                        </AnimatePresence>
                    </div>

                    {/* Actions */}
                    <div className="flex gap-2 pt-1">
                        {!running && !done && (
                            <>
                                <button
                                    onClick={runBatch}
                                    disabled={pendingCount === 0}
                                    className="flex-1 h-11 rounded-xl bg-primary text-primary-foreground font-bold text-sm flex items-center justify-center gap-2 hover:opacity-90 disabled:opacity-40 transition-all shadow-lg shadow-primary/20"
                                >
                                    <Upload size={15} /> Upload {pendingCount} File
                                </button>
                                <button
                                    onClick={reset}
                                    className="h-11 px-4 rounded-xl bg-muted/30 text-muted-foreground text-sm font-medium hover:bg-muted/50 transition-colors"
                                >
                                    Reset
                                </button>
                            </>
                        )}
                        {running && (
                            <button
                                onClick={stop}
                                className="flex-1 h-11 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400 font-bold text-sm flex items-center justify-center gap-2 hover:bg-red-500/20 transition-colors"
                            >
                                <Pause size={15} /> Hentikan
                            </button>
                        )}
                        {done && !running && (
                            <div className="flex gap-2 flex-1">
                                {errorCount > 0 && (
                                    <button
                                        onClick={() => {
                                            setFiles((f) => f.map((i) => i.status === "error" ? { ...i, status: "pending", error: undefined } : i));
                                            setDone(false);
                                        }}
                                        className="flex-1 h-11 rounded-xl bg-amber-500/10 border border-amber-500/20 text-amber-500 font-bold text-sm"
                                    >
                                        Retry {errorCount} Gagal
                                    </button>
                                )}
                                <button
                                    onClick={reset}
                                    className="flex-1 h-11 rounded-xl bg-muted/30 text-foreground font-bold text-sm"
                                >
                                    Upload Lagi
                                </button>
                                {onClose && (
                                    <button
                                        onClick={onClose}
                                        className="flex-1 h-11 rounded-xl bg-primary text-primary-foreground font-bold text-sm"
                                    >
                                        Selesai
                                    </button>
                                )}
                            </div>
                        )}
                    </div>
                </div>
            )}
        </div>
    );
}