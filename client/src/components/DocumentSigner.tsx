"use client";

import { useState, useRef, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { signDocument, verifyDocument } from "@/lib/message-crypto";
import { useStore } from "@/lib/store";
import { useActivityStore } from "@/lib/activity-store";
import { ethers } from "ethers";
import {
  FileText, Upload, CheckCircle, XCircle, Download,
  Shield, Clock, AlertTriangle, Loader2, Copy, Check,
} from "lucide-react";
import { toast } from "sonner";
import { NETWORK_CONFIG } from "@/lib/constants";

interface SignatureRecord {
  hash: string;
  signature: string;
  signer: string;
  timestamp: number;
  fileName: string;
  fileSize: number;
}

interface VerifyResult {
  valid: boolean;
  reason?: string;
  record?: SignatureRecord;
}

export default function DocumentSigner() {
  const { signer, wallet } = useStore();
  const { addActivity } = useActivityStore();

  const [mode, setMode] = useState<"sign" | "verify">("sign");
  const [file, setFile] = useState<File | null>(null);
  const [verifyFile, setVerifyFile] = useState<File | null>(null);
  const [sigInput, setSigInput] = useState("");
  const [signedRecord, setSignedRecord] = useState<SignatureRecord | null>(null);
  const [verifyResult, setVerifyResult] = useState<VerifyResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [copied, setCopied] = useState<string | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const verifyFileInputRef = useRef<HTMLInputElement>(null);

  const handleSign = useCallback(async () => {
    if (!file || !signer || !wallet) return;
    setLoading(true);
    try {
      const buffer = await file.arrayBuffer();
      const w = signer as ethers.Wallet;
      const result = await signDocument(buffer, w);
      const record: SignatureRecord = {
        ...result,
        fileName: file.name,
        fileSize: file.size,
      };
      setSignedRecord(record);

      addActivity({
        type: "sign",
        title: "Dokumen ditandatangani",
        description: `${file.name} · ${formatSize(file.size)}`,
        walletAddress: wallet.address,
      });

      toast.success("Dokumen berhasil ditandatangani!");
    } catch (e: any) {
      toast.error(e.message || "Gagal menandatangani");
    } finally {
      setLoading(false);
    }
  }, [file, signer, wallet, addActivity]);

  const handleVerify = useCallback(async () => {
    if (!verifyFile || !sigInput.trim()) return;
    setLoading(true);
    try {
      let record: SignatureRecord;
      try {
        record = JSON.parse(sigInput);
      } catch {
        setVerifyResult({ valid: false, reason: "Format signature tidak valid (bukan JSON)" });
        return;
      }

      const buffer = await verifyFile.arrayBuffer();
      const result = await verifyDocument(buffer, record.signature, record.signer, record.timestamp);
      setVerifyResult({ ...result, record });
    } catch (e: any) {
      setVerifyResult({ valid: false, reason: e.message });
    } finally {
      setLoading(false);
    }
  }, [verifyFile, sigInput]);

  const copyToClipboard = (text: string, key: string) => {
    navigator.clipboard.writeText(text);
    setCopied(key);
    setTimeout(() => setCopied(null), 2000);
  };

  const downloadRecord = () => {
    if (!signedRecord) return;
    const blob = new Blob([JSON.stringify(signedRecord, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `signature-${signedRecord.fileName}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const CopyBtn = ({ text, id }: { text: string; id: string }) => (
    <button
      onClick={() => copyToClipboard(text, id)}
      className="shrink-0 w-7 h-7 rounded-lg bg-muted/30 hover:bg-muted/60 flex items-center justify-center text-muted-foreground hover:text-foreground transition-colors"
    >
      {copied === id ? <Check size={11} className="text-emerald-500" /> : <Copy size={11} />}
    </button>
  );

  return (
    <div className="w-full max-w-2xl mx-auto">
      {/* Tab Toggle */}
      <div className="flex bg-muted/20 p-1 rounded-2xl border border-border/40 mb-6">
        {(["sign", "verify"] as const).map((m) => (
          <button
            key={m}
            onClick={() => { setMode(m); setSignedRecord(null); setVerifyResult(null); }}
            className={`flex-1 py-2.5 rounded-xl text-sm font-bold transition-all ${
              mode === m
                ? "bg-card text-foreground shadow-sm border border-border/40"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            {m === "sign" ? "✍️ Tanda Tangan" : "🔍 Verifikasi"}
          </button>
        ))}
      </div>

      <AnimatePresence mode="wait">

        {/* ── SIGN MODE ── */}
        {mode === "sign" && (
          <motion.div
            key="sign"
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -12 }}
            className="space-y-4"
          >
            {/* File Drop */}
            <div
              onClick={() => fileInputRef.current?.click()}
              onDragOver={(e) => e.preventDefault()}
              onDrop={(e) => {
                e.preventDefault();
                const f = e.dataTransfer.files[0];
                if (f) { setFile(f); setSignedRecord(null); }
              }}
              className="group relative border-2 border-dashed border-border/50 hover:border-primary/40 rounded-2xl p-8 text-center cursor-pointer transition-all hover:bg-primary/2"
            >
              <input
                ref={fileInputRef}
                type="file"
                className="hidden"
                onChange={(e) => {
                  const f = e.target.files?.[0];
                  if (f) { setFile(f); setSignedRecord(null); }
                }}
              />
              {file ? (
                <div className="flex items-center justify-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center">
                    <FileText size={20} className="text-primary" />
                  </div>
                  <div className="text-left">
                    <p className="font-bold text-foreground text-sm">{file.name}</p>
                    <p className="text-xs text-muted-foreground">{formatSize(file.size)}</p>
                  </div>
                </div>
              ) : (
                <div>
                  <Upload size={28} className="text-muted-foreground/40 mx-auto mb-2" />
                  <p className="text-sm font-medium text-muted-foreground">Drop file atau klik untuk pilih</p>
                  <p className="text-[11px] text-muted-foreground/60 mt-1">Semua format didukung</p>
                </div>
              )}
            </div>

            {/* Info */}
            <div className="flex items-start gap-2.5 p-3.5 rounded-xl bg-blue-500/5 border border-blue-500/20">
              <Shield size={14} className="text-blue-400 mt-0.5 shrink-0" />
              <p className="text-[11px] text-muted-foreground leading-relaxed">
                Tanda tangan dibuat menggunakan private key wallet kamu di {NETWORK_CONFIG.name}.
                Siapapun bisa memverifikasi tanpa mengetahui private key kamu.
              </p>
            </div>

            <button
              onClick={handleSign}
              disabled={!file || loading}
              className="w-full h-12 rounded-xl bg-primary text-primary-foreground font-bold text-sm flex items-center justify-center gap-2 hover:opacity-90 disabled:opacity-40 transition-all shadow-lg shadow-primary/20"
            >
              {loading
                ? <><Loader2 size={16} className="animate-spin" /> Menandatangani...</>
                : <><Shield size={16} /> Tanda Tangani Dokumen</>}
            </button>

            {/* Result */}
            <AnimatePresence>
              {signedRecord && (
                <motion.div
                  initial={{ opacity: 0, y: 12 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="space-y-3 p-4 rounded-2xl bg-emerald-500/5 border border-emerald-500/20"
                >
                  <div className="flex items-center gap-2">
                    <CheckCircle size={16} className="text-emerald-500" />
                    <span className="font-bold text-emerald-600 dark:text-emerald-400 text-sm">
                      Dokumen berhasil ditandatangani
                    </span>
                  </div>

                  {[
                    { label: "File", value: signedRecord.fileName },
                    { label: "SHA-256 Hash", value: signedRecord.hash, mono: true, id: "hash" },
                    { label: "Penanda Tangan", value: signedRecord.signer, mono: true, id: "signer" },
                    { label: "Waktu", value: new Date(signedRecord.timestamp).toLocaleString("id-ID") },
                  ].map((item) => (
                    <div key={item.label} className="flex items-start gap-2">
                      <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider w-24 shrink-0 mt-0.5">
                        {item.label}
                      </span>
                      <div className="flex-1 flex items-start gap-1.5 min-w-0">
                        <span className={`text-xs text-foreground break-all flex-1 ${item.mono ? "font-mono" : ""}`}>
                          {item.value}
                        </span>
                        {item.id && <CopyBtn text={item.value} id={item.id} />}
                      </div>
                    </div>
                  ))}

                  <div className="flex gap-2 pt-1">
                    <button
                      onClick={downloadRecord}
                      className="flex-1 h-9 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-600 dark:text-emerald-400 text-xs font-bold flex items-center justify-center gap-1.5 hover:bg-emerald-500/20 transition-colors"
                    >
                      <Download size={12} /> Unduh Bukti (.json)
                    </button>
                    <button
                      onClick={() => copyToClipboard(JSON.stringify(signedRecord, null, 2), "full")}
                      className="flex-1 h-9 rounded-xl bg-muted/30 text-muted-foreground text-xs font-bold flex items-center justify-center gap-1.5 hover:bg-muted/50 transition-colors"
                    >
                      {copied === "full" ? <Check size={12} className="text-emerald-500" /> : <Copy size={12} />}
                      Salin JSON
                    </button>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </motion.div>
        )}

        {/* ── VERIFY MODE ── */}
        {mode === "verify" && (
          <motion.div
            key="verify"
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -12 }}
            className="space-y-4"
          >
            {/* File */}
            <div
              onClick={() => verifyFileInputRef.current?.click()}
              onDragOver={(e) => e.preventDefault()}
              onDrop={(e) => {
                e.preventDefault();
                const f = e.dataTransfer.files[0];
                if (f) { setVerifyFile(f); setVerifyResult(null); }
              }}
              className="border-2 border-dashed border-border/50 hover:border-primary/40 rounded-2xl p-6 text-center cursor-pointer transition-all hover:bg-primary/2"
            >
              <input
                ref={verifyFileInputRef}
                type="file"
                className="hidden"
                onChange={(e) => {
                  const f = e.target.files?.[0];
                  if (f) { setVerifyFile(f); setVerifyResult(null); }
                }}
              />
              {verifyFile ? (
                <div className="flex items-center justify-center gap-3">
                  <FileText size={18} className="text-primary" />
                  <div className="text-left">
                    <p className="font-bold text-foreground text-sm">{verifyFile.name}</p>
                    <p className="text-xs text-muted-foreground">{formatSize(verifyFile.size)}</p>
                  </div>
                </div>
              ) : (
                <div>
                  <Upload size={24} className="text-muted-foreground/40 mx-auto mb-2" />
                  <p className="text-sm font-medium text-muted-foreground">Drop file yang ingin diverifikasi</p>
                </div>
              )}
            </div>

            {/* Signature JSON Input */}
            <div>
              <label className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider block mb-1.5">
                Paste Bukti Tanda Tangan (JSON)
              </label>
              <textarea
                value={sigInput}
                onChange={(e) => { setSigInput(e.target.value); setVerifyResult(null); }}
                placeholder={'{\n  "hash": "0x...",\n  "signature": "0x...",\n  "signer": "0x..."\n}'}
                className="w-full h-28 bg-muted/30 border border-border/50 focus:border-primary/30 rounded-xl p-3.5 font-mono text-xs text-foreground placeholder:text-muted-foreground/40 resize-none outline-none focus:ring-1 focus:ring-primary/20 transition-all"
              />
            </div>

            <button
              onClick={handleVerify}
              disabled={!verifyFile || !sigInput.trim() || loading}
              className="w-full h-12 rounded-xl bg-foreground text-background font-bold text-sm flex items-center justify-center gap-2 hover:opacity-90 disabled:opacity-40 transition-all"
            >
              {loading
                ? <><Loader2 size={16} className="animate-spin" /> Memverifikasi...</>
                : "🔍 Verifikasi Dokumen"}
            </button>

            {/* Result */}
            <AnimatePresence>
              {verifyResult && (
                <motion.div
                  initial={{ opacity: 0, y: 12 }}
                  animate={{ opacity: 1, y: 0 }}
                  className={`p-4 rounded-2xl border ${
                    verifyResult.valid
                      ? "bg-emerald-500/5 border-emerald-500/20"
                      : "bg-red-500/5 border-red-500/20"
                  }`}
                >
                  <div className="flex items-center gap-2 mb-3">
                    {verifyResult.valid
                      ? <CheckCircle size={16} className="text-emerald-500" />
                      : <XCircle size={16} className="text-red-500" />}
                    <span className={`font-bold text-sm ${verifyResult.valid ? "text-emerald-600 dark:text-emerald-400" : "text-red-500"}`}>
                      {verifyResult.valid ? "Tanda tangan valid ✓" : "Tanda tangan tidak valid"}
                    </span>
                  </div>

                  {verifyResult.reason && (
                    <div className="flex items-start gap-2 mb-3">
                      <AlertTriangle size={12} className="text-red-400 mt-0.5 shrink-0" />
                      <p className="text-xs text-red-400">{verifyResult.reason}</p>
                    </div>
                  )}

                  {verifyResult.valid && verifyResult.record && (
                    <div className="space-y-2">
                      {[
                        { label: "Ditanda tangani oleh", value: verifyResult.record.signer, mono: true },
                        { label: "Pada", value: new Date(verifyResult.record.timestamp).toLocaleString("id-ID") },
                        { label: "Hash", value: `${verifyResult.record.hash.slice(0, 20)}...`, mono: true },
                      ].map((item) => (
                        <div key={item.label} className="flex items-center gap-2">
                          <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider w-28 shrink-0">
                            {item.label}
                          </span>
                          <span className={`text-xs text-foreground truncate ${item.mono ? "font-mono" : ""}`}>
                            {item.value}
                          </span>
                        </div>
                      ))}
                    </div>
                  )}
                </motion.div>
              )}
            </AnimatePresence>
          </motion.div>
        )}

      </AnimatePresence>
    </div>
  );
}

function formatSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}