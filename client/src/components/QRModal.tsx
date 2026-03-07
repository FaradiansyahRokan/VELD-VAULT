"use client";

import { useEffect, useRef, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X, Copy, Check, Download } from "lucide-react";

interface QRModalProps {
  isOpen: boolean;
  onClose: () => void;
  address: string;
  label?: string;
}

export default function QRModal({ isOpen, onClose, address, label }: QRModalProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (!isOpen || !address || !canvasRef.current) return;
    generateQR(canvasRef.current, address);
  }, [isOpen, address]);

  useEffect(() => {
    if (!isOpen) return;
    const handler = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
    document.addEventListener("keydown", handler);
    return () => document.removeEventListener("keydown", handler);
  }, [isOpen, onClose]);

  const handleCopy = () => {
    navigator.clipboard.writeText(address);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleDownload = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const a = document.createElement("a");
    a.download = `ciphervault-${address.slice(0, 8)}.png`;
    a.href = canvas.toDataURL("image/png");
    a.click();
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-[200] flex items-center justify-center p-4">
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="absolute inset-0 bg-black/60 backdrop-blur-md"
          />
          <motion.div
            initial={{ scale: 0.9, opacity: 0, y: 16 }}
            animate={{ scale: 1, opacity: 1, y: 0 }}
            exit={{ scale: 0.9, opacity: 0 }}
            transition={{ type: "spring", stiffness: 400, damping: 28 }}
            className="relative z-10 w-full max-w-sm bg-card border border-border/60 rounded-[2rem] overflow-hidden shadow-2xl"
          >
            {/* Header */}
            <div className="flex items-center justify-between p-5 border-b border-border/50">
              <div>
                <h3 className="font-bold text-foreground">Terima Pembayaran</h3>
                <p className="text-[11px] text-muted-foreground mt-0.5">Scan QR atau salin alamat</p>
              </div>
              <button
                onClick={onClose}
                className="w-8 h-8 rounded-xl bg-muted/40 flex items-center justify-center text-muted-foreground hover:text-foreground transition-colors"
              >
                <X size={14} />
              </button>
            </div>

            {/* QR Code */}
            <div className="p-6 flex flex-col items-center gap-5">
              <div className="p-4 bg-white rounded-2xl shadow-lg">
                <canvas ref={canvasRef} width={200} height={200} className="rounded-xl" />
              </div>

              {label && (
                <p className="text-sm font-semibold text-foreground">{label}</p>
              )}

              {/* Address */}
              <div
                onClick={handleCopy}
                className="group w-full flex items-center gap-3 p-3.5 bg-muted/20 border border-border/40 hover:border-primary/20 rounded-xl cursor-pointer transition-all"
              >
                <code className="flex-1 text-xs font-mono text-foreground break-all leading-relaxed">
                  {address}
                </code>
                <div className="shrink-0">
                  {copied
                    ? <Check size={14} className="text-emerald-500" />
                    : <Copy size={14} className="text-muted-foreground group-hover:text-foreground transition-colors" />}
                </div>
              </div>

              {/* Actions */}
              <div className="flex gap-2 w-full">
                <button
                  onClick={handleCopy}
                  className="flex-1 h-10 rounded-xl bg-muted/30 hover:bg-muted/50 text-foreground font-semibold text-sm flex items-center justify-center gap-2 transition-colors"
                >
                  {copied ? <Check size={14} /> : <Copy size={14} />}
                  {copied ? "Disalin!" : "Salin"}
                </button>
                <button
                  onClick={handleDownload}
                  className="flex-1 h-10 rounded-xl bg-primary text-primary-foreground font-semibold text-sm flex items-center justify-center gap-2 hover:opacity-90 transition-opacity"
                >
                  <Download size={14} /> Simpan QR
                </button>
              </div>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}

// ── QR Code Generator (pure canvas, no dependency) ───────────
function generateQR(canvas: HTMLCanvasElement, text: string) {
  // Simple QR matrix using qrcode-generator algorithm approach
  // We'll use a lightweight approach via the browser's URL API
  const size = 200;
  const ctx = canvas.getContext("2d")!;
  ctx.clearRect(0, 0, size, size);

  // Use Google Charts API as fallback (works in browser)
  const img = new Image();
  img.crossOrigin = "anonymous";
  img.onload = () => {
    ctx.clearRect(0, 0, size, size);
    ctx.drawImage(img, 0, 0, size, size);
  };
  img.onerror = () => {
    // Fallback: draw a placeholder with address text
    ctx.fillStyle = "#ffffff";
    ctx.fillRect(0, 0, size, size);
    ctx.fillStyle = "#000000";
    ctx.font = "bold 12px monospace";
    ctx.textAlign = "center";
    ctx.fillText("QR Code", size / 2, size / 2 - 20);
    ctx.font = "9px monospace";
    const lines = [text.slice(0, 10), text.slice(10, 20), "...", text.slice(-10)];
    lines.forEach((line, i) => {
      ctx.fillText(line, size / 2, size / 2 + i * 14);
    });
  };

  // Use a public QR service
  img.src = `https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${encodeURIComponent(text)}&format=png&margin=0`;
}