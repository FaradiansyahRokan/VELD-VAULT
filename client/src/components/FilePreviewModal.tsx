"use client";

import { useState, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X, Download, ZoomIn, ZoomOut, RotateCcw, FileText, Music, Video, File } from "lucide-react";

interface FilePreviewModalProps {
  isOpen: boolean;
  onClose: () => void;
  file: File | null;
  fileName?: string;
}

export default function FilePreviewModal({ isOpen, onClose, file, fileName }: FilePreviewModalProps) {
  const [objectUrl, setObjectUrl] = useState<string | null>(null);
  const [zoom, setZoom] = useState(1);
  const [textContent, setTextContent] = useState<string | null>(null);

  useEffect(() => {
    if (!file || !isOpen) return;

    // Revoke previous URL
    if (objectUrl) URL.revokeObjectURL(objectUrl);

    const url = URL.createObjectURL(file);
    setObjectUrl(url);
    setZoom(1);
    setTextContent(null);

    // Read text files
    if (file.type.startsWith("text/") || isTextExtension(file.name)) {
      const reader = new FileReader();
      reader.onload = (e) => setTextContent(e.target?.result as string);
      reader.readAsText(file);
    }

    return () => URL.revokeObjectURL(url);
  }, [file, isOpen]); // eslint-disable-line

  const handleDownload = useCallback(() => {
    if (!objectUrl || !file) return;
    const a = document.createElement("a");
    a.href = objectUrl;
    a.download = fileName || file.name;
    a.click();
  }, [objectUrl, file, fileName]);

  // Close on Escape
  useEffect(() => {
    if (!isOpen) return;
    const handler = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
    document.addEventListener("keydown", handler);
    return () => document.removeEventListener("keydown", handler);
  }, [isOpen, onClose]);

  const type = file?.type || "";
  const isImage = type.startsWith("image/");
  const isPdf = type === "application/pdf";
  const isVideo = type.startsWith("video/");
  const isAudio = type.startsWith("audio/");
  const isText = type.startsWith("text/") || (file ? isTextExtension(file.name) : false);

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-[200] flex items-center justify-center p-4">
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="absolute inset-0 bg-black/70 backdrop-blur-md"
          />

          {/* Modal */}
          <motion.div
            initial={{ scale: 0.95, opacity: 0, y: 16 }}
            animate={{ scale: 1, opacity: 1, y: 0 }}
            exit={{ scale: 0.95, opacity: 0, y: 16 }}
            transition={{ type: "spring", stiffness: 400, damping: 30 }}
            className="relative z-10 w-full max-w-4xl max-h-[90vh] bg-card border border-border/60 rounded-[2rem] overflow-hidden flex flex-col shadow-2xl"
          >
            {/* Header */}
            <div className="flex items-center justify-between p-5 border-b border-border/50 shrink-0">
              <div className="flex items-center gap-3 min-w-0">
                <div className="w-9 h-9 rounded-xl bg-muted/40 flex items-center justify-center shrink-0">
                  {isImage ? "🖼️" : isPdf ? "📄" : isVideo ? "🎬" : isAudio ? "🎵" : isText ? "📝" : "📁"}
                </div>
                <div className="min-w-0">
                  <p className="font-bold text-foreground text-sm truncate">{fileName || file?.name}</p>
                  <p className="text-[11px] text-muted-foreground">
                    {file ? formatFileSize(file.size) : ""} · {type || "Unknown"}
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2 shrink-0">
                {isImage && (
                  <>
                    <button
                      onClick={() => setZoom((z) => Math.max(0.25, z - 0.25))}
                      className="w-8 h-8 rounded-xl bg-muted/30 flex items-center justify-center text-muted-foreground hover:text-foreground transition-colors"
                    >
                      <ZoomOut size={14} />
                    </button>
                    <span className="text-xs text-muted-foreground w-10 text-center">{Math.round(zoom * 100)}%</span>
                    <button
                      onClick={() => setZoom((z) => Math.min(4, z + 0.25))}
                      className="w-8 h-8 rounded-xl bg-muted/30 flex items-center justify-center text-muted-foreground hover:text-foreground transition-colors"
                    >
                      <ZoomIn size={14} />
                    </button>
                    <button
                      onClick={() => setZoom(1)}
                      className="w-8 h-8 rounded-xl bg-muted/30 flex items-center justify-center text-muted-foreground hover:text-foreground transition-colors"
                    >
                      <RotateCcw size={14} />
                    </button>
                  </>
                )}
                <button
                  onClick={handleDownload}
                  className="h-8 px-3 rounded-xl bg-primary text-primary-foreground text-xs font-bold flex items-center gap-1.5 hover:opacity-90 transition-opacity"
                >
                  <Download size={12} /> Unduh
                </button>
                <button
                  onClick={onClose}
                  className="w-8 h-8 rounded-xl bg-muted/40 flex items-center justify-center text-muted-foreground hover:text-foreground transition-colors"
                >
                  <X size={14} />
                </button>
              </div>
            </div>

            {/* Content */}
            <div className="flex-1 overflow-auto bg-muted/5">
              {isImage && objectUrl && (
                <div className="w-full h-full flex items-center justify-center p-4 overflow-auto">
                  <img
                    src={objectUrl}
                    alt={file?.name}
                    style={{ transform: `scale(${zoom})`, transformOrigin: "center", transition: "transform 0.2s" }}
                    className="max-w-full rounded-xl shadow-xl"
                  />
                </div>
              )}

              {isPdf && objectUrl && (
                <iframe
                  src={objectUrl}
                  className="w-full h-full min-h-[600px]"
                  title={file?.name}
                />
              )}

              {isVideo && objectUrl && (
                <div className="flex items-center justify-center p-6 h-full">
                  <video
                    src={objectUrl}
                    controls
                    className="max-w-full max-h-[70vh] rounded-xl shadow-xl"
                  />
                </div>
              )}

              {isAudio && objectUrl && (
                <div className="flex flex-col items-center justify-center gap-6 p-12">
                  <div className="w-32 h-32 rounded-[2rem] bg-gradient-to-br from-primary/20 to-indigo-500/20 border border-primary/10 flex items-center justify-center">
                    <Music size={48} className="text-primary/60" />
                  </div>
                  <p className="font-bold text-foreground text-lg">{file?.name}</p>
                  <audio src={objectUrl} controls className="w-full max-w-sm" />
                </div>
              )}

              {isText && textContent !== null && (
                <div className="p-6">
                  <pre className="font-mono text-sm text-foreground whitespace-pre-wrap break-words leading-relaxed bg-muted/20 border border-border/40 rounded-xl p-5">
                    {textContent}
                  </pre>
                </div>
              )}

              {!isImage && !isPdf && !isVideo && !isAudio && !isText && (
                <div className="flex flex-col items-center justify-center gap-4 py-20 text-center px-8">
                  <div className="w-20 h-20 rounded-[1.5rem] bg-muted/20 flex items-center justify-center">
                    <File size={36} className="text-muted-foreground/50" />
                  </div>
                  <div>
                    <p className="font-bold text-foreground mb-1">Preview tidak tersedia</p>
                    <p className="text-sm text-muted-foreground">Format ini tidak bisa ditampilkan di browser</p>
                  </div>
                  <button
                    onClick={handleDownload}
                    className="h-11 px-6 rounded-xl bg-primary text-primary-foreground font-bold text-sm hover:opacity-90 flex items-center gap-2"
                  >
                    <Download size={15} /> Unduh File
                  </button>
                </div>
              )}
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}

function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function isTextExtension(name: string): boolean {
  const ext = name.split(".").pop()?.toLowerCase() || "";
  return ["txt", "md", "json", "csv", "xml", "yaml", "yml", "log", "ts", "tsx", "js", "jsx", "css", "html", "py", "rs", "go", "sol"].includes(ext);
}