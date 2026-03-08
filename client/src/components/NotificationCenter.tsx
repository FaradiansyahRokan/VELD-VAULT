"use client";

import { useState, useRef, useEffect } from "react";
import { useNotifStore, type Notification } from "@/lib/notif-store";
import { motion, AnimatePresence } from "framer-motion";
import { Bell, X, CheckCheck, Trash2, ArrowRight } from "lucide-react";
import { useRouter } from "next/navigation";

const TYPE_CONFIG: Record<Notification["type"], { color: string }> = {
  success: { color: "text-emerald-400" },
  error:   { color: "text-red-400" },
  warning: { color: "text-amber-400" },
  info:    { color: "text-blue-400" },
  trade:   { color: "text-violet-400" },
  message: { color: "text-indigo-400" },
};

export default function NotificationCenter() {
  const router = useRouter();
  const { notifications, unreadCount, markRead, markAllRead, dismiss, clear } = useNotifStore();
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  const handleClick = (n: Notification) => {
    markRead(n.id);
    if (n.action) router.push(n.action.href);
  };

  const formatTime = (ts: number) => {
    const d = Date.now() - ts;
    if (d < 60_000) return "baru saja";
    if (d < 3_600_000) return `${Math.floor(d / 60_000)}m lalu`;
    if (d < 86_400_000) return `${Math.floor(d / 3_600_000)}j lalu`;
    return new Date(ts).toLocaleDateString("id-ID", { day: "numeric", month: "short" });
  };

  return (
    <div ref={ref} className="relative">
      {/* Bell button */}
      <button
        onClick={() => setOpen(!open)}
        className="relative w-9 h-9 rounded-full bg-muted/30 border border-border/40 flex items-center justify-center text-muted-foreground hover:text-foreground hover:border-border/70 transition-all"
      >
        <Bell size={15} />
        <AnimatePresence>
          {unreadCount > 0 && (
            <motion.div
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              exit={{ scale: 0 }}
              className="absolute -top-1 -right-1 min-w-[16px] h-4 px-1 rounded-full bg-red-500 flex items-center justify-center"
            >
              <span className="text-[9px] font-bold text-white leading-none">
                {unreadCount > 9 ? "9+" : unreadCount}
              </span>
            </motion.div>
          )}
        </AnimatePresence>
      </button>

      {/* Dropdown */}
      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, y: 8, scale: 0.96 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 8, scale: 0.96 }}
            transition={{ type: "spring", stiffness: 400, damping: 28 }}
            className="absolute right-0 top-11 w-80 bg-card border border-border/60 rounded-[1.5rem] shadow-2xl overflow-hidden z-50"
          >
            {/* Header */}
            <div className="flex items-center justify-between px-4 py-3.5 border-b border-border/50">
              <span className="font-bold text-foreground text-sm">
                Notifikasi {unreadCount > 0 && (
                  <span className="ml-1.5 text-[10px] font-bold text-white bg-red-500 px-1.5 py-0.5 rounded-full">
                    {unreadCount}
                  </span>
                )}
              </span>
              <div className="flex items-center gap-1">
                {unreadCount > 0 && (
                  <button
                    onClick={markAllRead}
                    className="w-7 h-7 rounded-lg bg-muted/30 flex items-center justify-center text-muted-foreground hover:text-foreground transition-colors"
                    title="Tandai semua dibaca"
                  >
                    <CheckCheck size={12} />
                  </button>
                )}
                {notifications.length > 0 && (
                  <button
                    onClick={clear}
                    className="w-7 h-7 rounded-lg bg-muted/30 flex items-center justify-center text-muted-foreground hover:text-red-400 transition-colors"
                    title="Hapus semua"
                  >
                    <Trash2 size={12} />
                  </button>
                )}
              </div>
            </div>

            {/* List */}
            <div className="max-h-[380px] overflow-y-auto">
              {notifications.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-10 gap-3 text-center">
                  <Bell size={24} className="text-muted-foreground/30" />
                  <p className="text-sm text-muted-foreground">Belum ada notifikasi</p>
                </div>
              ) : (
                notifications.map((n) => {
                  const meta = TYPE_CONFIG[n.type];
                  return (
                    <div
                      key={n.id}
                      className={`group relative flex items-start gap-3 px-4 py-3.5 hover:bg-muted/20 transition-colors border-b border-border/30 last:border-0 cursor-pointer ${!n.read ? "bg-primary/2" : ""}`}
                      onClick={() => handleClick(n)}
                    >
                      {/* Unread dot */}
                      {!n.read && (
                        <div className="absolute left-2 top-1/2 -translate-y-1/2 w-1.5 h-1.5 rounded-full bg-primary" />
                      )}

                      <div className="flex-1 min-w-0">
                        <p className={`text-[11px] font-bold ${!n.read ? "text-foreground" : "text-muted-foreground"} truncate`}>
                          {n.title}
                        </p>
                        <p className="text-[10px] text-muted-foreground/80 leading-relaxed mt-0.5 line-clamp-2">
                          {n.body}
                        </p>
                        <div className="flex items-center justify-between mt-1">
                          <p className="text-[9px] text-muted-foreground/50">{formatTime(n.timestamp)}</p>
                          {n.action && (
                            <span className="text-[9px] font-bold text-primary flex items-center gap-0.5">
                              {n.action.label} <ArrowRight size={8} />
                            </span>
                          )}
                        </div>
                      </div>

                      <button
                        onClick={(e) => { e.stopPropagation(); dismiss(n.id); }}
                        className="w-5 h-5 rounded flex items-center justify-center text-muted-foreground/40 hover:text-foreground opacity-0 group-hover:opacity-100 transition-all shrink-0 mt-0.5"
                      >
                        <X size={11} />
                      </button>
                    </div>
                  );
                })
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}