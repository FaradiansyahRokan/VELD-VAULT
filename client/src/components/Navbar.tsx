"use client";

import { useState, useEffect, useRef } from "react";
import { useStore } from "@/lib/store";
import { useRouter, usePathname } from "next/navigation";
import { Copy, Check, Shield, Fingerprint, Sun, Moon, LogOut, ChevronDown, Command, Wifi, WifiOff, AlertTriangle } from "lucide-react";
import { toast } from "sonner";
import { motion, AnimatePresence, LayoutGroup } from "framer-motion";
import { useTheme } from "next-themes";
import { NETWORK_CONFIG } from "@/lib/constants";

export default function Navbar() {
  const { wallet, logout, balance, networkStatus } = useStore();
  const router = useRouter();
  const pathname = usePathname();
  const { theme, setTheme } = useTheme();

  const [expanded, setExpanded] = useState(false);
  const [revealSecret, setRevealSecret] = useState(false);
  const [copied, setCopied] = useState(false);
  const [mounted, setMounted] = useState(false);

  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setMounted(true);
    const handleClickOutside = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node))
        setExpanded(false);
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  useEffect(() => {
    if (!expanded) {
      const t = setTimeout(() => setRevealSecret(false), 300);
      return () => clearTimeout(t);
    }
  }, [expanded]);

  if (!mounted) return null;
  if (pathname === "/") return null;

  const handleCopy = () => {
    navigator.clipboard.writeText(wallet?.address || "");
    setCopied(true);
    toast.success("Alamat disalin!");
    setTimeout(() => setCopied(false), 2000);
  };

  const springConfig = { type: "spring", stiffness: 350, damping: 30, mass: 0.8 } as const;

  // Network status config
  const networkConfig = {
    online: { color: "bg-emerald-400", label: NETWORK_CONFIG.name, pulse: false },
    offline: { color: "bg-red-500", label: "Offline", pulse: true },
    "wrong-network": { color: "bg-amber-400", label: "Wrong Network", pulse: true },
    checking: { color: "bg-zinc-400", label: "Connecting...", pulse: true },
  }[networkStatus] ?? { color: "bg-zinc-400", label: "...", pulse: false };

  // Format balance: tampilkan 4 desimal max
  const displayBalance = parseFloat(balance).toFixed(4);

  return (
    <LayoutGroup>
      <div className="fixed top-6 left-0 right-0 z-[999] flex justify-center px-4 pointer-events-none select-none">
        <motion.div
          ref={containerRef}
          layout
          transition={springConfig}
          initial={false}
          animate={{
            width: expanded ? 440 : 360,
            borderRadius: expanded ? 28 : 999,
          }}
          className="
            pointer-events-auto relative overflow-hidden
            bg-card/85 dark:bg-[#121212]/85 backdrop-blur-2xl saturate-150
            border border-black/5 dark:border-white/10
            shadow-[0_8px_32px_-8px_rgba(0,0,0,0.12)] dark:shadow-[0_8px_32px_-8px_rgba(0,0,0,0.5)]
          "
        >
          <motion.div layout className="flex flex-col w-full relative z-10">

            {/* === HEADER BAR === */}
            <div className="grid grid-cols-[auto_1fr_auto] items-center h-[60px] px-2 gap-3 w-full">

              {/* LOGO */}
              <motion.div layout className="pl-1">
                <motion.button
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.9 }}
                  onClick={() => { setExpanded(false); router.push("/vault"); }}
                  className="w-10 h-10 bg-gradient-to-br from-foreground to-muted-foreground text-background rounded-full flex items-center justify-center shadow-lg"
                >
                  <Command size={18} strokeWidth={2} />
                </motion.button>
              </motion.div>

              {/* TABS */}
              <div className="flex justify-center w-full h-full items-center">
                <AnimatePresence mode="popLayout" initial={false}>
                  {!expanded && (
                    <motion.div
                      initial={{ opacity: 0, scale: 0.9, filter: "blur(10px)" }}
                      animate={{ opacity: 1, scale: 1, filter: "blur(0px)" }}
                      exit={{ opacity: 0, scale: 0.9, filter: "blur(10px)", transition: { duration: 0.15 } }}
                      className="flex bg-muted/40 p-1 rounded-full border border-black/5 dark:border-white/5"
                    >
                      {["vault", "market"].map((item) => {
                        const isActive = pathname === `/${item}`;
                        return (
                          <button
                            key={item}
                            onClick={() => router.push(`/${item}`)}
                            className={`relative px-5 py-1.5 text-[11px] font-bold uppercase tracking-wider rounded-full transition-all duration-300 z-10 ${isActive
                                ? "text-foreground"
                                : "text-muted-foreground hover:text-foreground/80"
                              }`}
                          >
                            {isActive && (
                              <motion.div
                                layoutId="active-pill"
                                transition={springConfig}
                                className="absolute inset-0 bg-background shadow-sm rounded-full border border-black/5 dark:border-white/5 -z-10"
                              />
                            )}
                            {item}
                          </button>
                        );
                      })}
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>

              {/* WALLET TRIGGER */}
              <motion.div layout className="flex items-center justify-end pr-1">
                <motion.button
                  whileTap={{ scale: 0.95 }}
                  onClick={() => setExpanded(!expanded)}
                  className={`h-10 px-4 rounded-full font-bold text-[10px] flex items-center gap-2 transition-all duration-300 border ${expanded
                      ? "bg-muted/50 text-foreground border-transparent"
                      : "bg-foreground text-background border-transparent shadow-md hover:opacity-90"
                    }`}
                >
                  {!expanded && (
                    <span className="tracking-wider font-mono text-[9px]">
                      {displayBalance} {NETWORK_CONFIG.tokenSymbol}
                    </span>
                  )}
                  {expanded && <span className="tracking-[0.15em]">CLOSE</span>}
                  <div
                    className={`w-1.5 h-1.5 rounded-full ${networkConfig.color} ${networkConfig.pulse ? "animate-pulse" : ""
                      } shadow-[0_0_8px_currentColor]`}
                  />
                </motion.button>
              </motion.div>
            </div>

            {/* === EXPANDED PANEL === */}
            <AnimatePresence>
              {expanded && (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: "auto" }}
                  exit={{ opacity: 0, height: 0, transition: { duration: 0.2 } }}
                  className="overflow-hidden"
                >
                  <div className="px-5 pb-5 pt-1">
                    <div className="h-px w-full bg-gradient-to-r from-transparent via-border to-transparent mb-4 opacity-50" />

                    <motion.div
                      initial={{ y: 15, opacity: 0 }}
                      animate={{ y: 0, opacity: 1 }}
                      transition={{ delay: 0.08, ...springConfig }}
                      className="flex flex-col gap-3"
                    >

                      {/* IDENTITY & THEME */}
                      <div className="flex justify-between items-center px-1">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-zinc-800 to-zinc-900 border border-white/10 flex items-center justify-center text-white">
                            <Fingerprint size={18} strokeWidth={1.5} />
                          </div>
                          <div>
                            <span className="text-xs font-bold text-foreground block leading-tight">Identity Active</span>
                            <span className="text-[9px] text-muted-foreground font-mono">
                              {wallet?.address.slice(0, 6)}...{wallet?.address.slice(-4)}
                            </span>
                          </div>
                        </div>
                        <motion.button
                          whileTap={{ scale: 0.9, rotate: 180 }}
                          onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
                          className="w-9 h-9 rounded-full bg-muted/30 border border-border flex items-center justify-center text-muted-foreground hover:text-foreground transition-colors"
                        >
                          {theme === "dark" ? <Sun size={15} /> : <Moon size={15} />}
                        </motion.button>
                      </div>

                      {/* NETWORK STATUS */}
                      <div className={`flex items-center justify-between p-3 rounded-2xl border text-[10px] font-bold uppercase tracking-wider ${networkStatus === "online"
                          ? "bg-emerald-500/5 border-emerald-500/20 text-emerald-600 dark:text-emerald-400"
                          : networkStatus === "offline"
                            ? "bg-red-500/5 border-red-500/20 text-red-500"
                            : "bg-amber-500/5 border-amber-500/20 text-amber-500"
                        }`}>
                        <div className="flex items-center gap-2">
                          {networkStatus === "online"
                            ? <Wifi size={12} />
                            : networkStatus === "offline"
                              ? <WifiOff size={12} />
                              : <AlertTriangle size={12} />}
                          <span>{networkConfig.label}</span>
                        </div>
                        <span className="text-muted-foreground font-mono normal-case">
                          Chain {NETWORK_CONFIG.chainId}
                        </span>
                      </div>

                      {/* BALANCE CARD */}
                      <div className="p-4 rounded-2xl bg-muted/20 border border-black/5 dark:border-white/5">
                        <span className="text-[9px] font-bold text-muted-foreground uppercase tracking-widest block mb-1.5">
                          Balance
                        </span>
                        <div className="flex items-end gap-1.5">
                          <span className="text-2xl font-bold text-foreground tracking-tight">
                            {displayBalance}
                          </span>
                          <span className="text-sm font-bold text-muted-foreground mb-0.5">
                            {NETWORK_CONFIG.tokenSymbol}
                          </span>
                        </div>
                      </div>

                      {/* PUBLIC KEY */}
                      <div
                        onClick={handleCopy}
                        className="group relative flex flex-col gap-1.5 p-4 rounded-2xl bg-muted/20 border border-black/5 dark:border-white/5 hover:bg-muted/40 transition-all cursor-pointer overflow-hidden"
                      >
                        <div className="flex justify-between items-center">
                          <span className="text-[9px] font-bold text-muted-foreground uppercase tracking-widest">
                            Public Key
                          </span>
                          <div className="flex items-center gap-1.5">
                            <span className="text-[9px] text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity">COPY</span>
                            {copied
                              ? <Check size={12} className="text-emerald-500" />
                              : <Copy size={12} className="text-muted-foreground group-hover:text-foreground" />}
                          </div>
                        </div>
                        <code className="text-xs text-foreground font-mono truncate tracking-tight">
                          {wallet?.address || "—"}
                        </code>
                      </div>

                      {/* PRIVATE KEY */}
                      <div className={`rounded-2xl border transition-all duration-300 overflow-hidden ${revealSecret
                          ? "bg-red-500/5 border-red-500/20"
                          : "bg-muted/20 border-transparent hover:border-black/5 dark:hover:border-white/5"
                        }`}>
                        <button
                          onClick={() => setRevealSecret(!revealSecret)}
                          className="w-full flex items-center justify-between p-4"
                        >
                          <div className="flex items-center gap-2.5">
                            <Shield size={14} className={revealSecret ? "text-red-500" : "text-muted-foreground"} />
                            <span className={`text-[10px] font-bold uppercase tracking-wider ${revealSecret ? "text-red-500" : "text-muted-foreground"}`}>
                              Private Key
                            </span>
                          </div>
                          <ChevronDown size={13} className={`text-muted-foreground/70 transition-transform duration-300 ${revealSecret ? "rotate-180" : ""}`} />
                        </button>
                        <AnimatePresence>
                          {revealSecret && (
                            <motion.div
                              initial={{ height: 0, opacity: 0 }}
                              animate={{ height: "auto", opacity: 1 }}
                              exit={{ height: 0, opacity: 0 }}
                              className="overflow-hidden"
                            >
                              <div className="px-4 pb-4">
                                <div className="p-3 bg-background/50 border border-red-500/10 rounded-xl">
                                  <code className="text-[10px] text-red-500 font-mono leading-relaxed break-all select-all block">
                                    {wallet?.privateKey}
                                  </code>
                                </div>
                                <p className="text-[9px] text-center text-muted-foreground mt-2">
                                  ⚠️ Jangan pernah bagikan key ini
                                </p>
                              </div>
                            </motion.div>
                          )}
                        </AnimatePresence>
                      </div>

                      {/* LOGOUT */}
                      <motion.button
                        whileHover={{ scale: 1.01 }}
                        whileTap={{ scale: 0.98 }}
                        onClick={logout}
                        className="w-full py-3 rounded-2xl bg-foreground text-background text-[11px] font-bold uppercase tracking-widest hover:bg-red-600 hover:text-white transition-all shadow-md flex items-center justify-center gap-2"
                      >
                        <LogOut size={13} /> End Session
                      </motion.button>

                    </motion.div>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </motion.div>
        </motion.div>
      </div>
    </LayoutGroup>
  );
}