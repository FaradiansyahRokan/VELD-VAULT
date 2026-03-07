"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { useRouter } from "next/navigation";
import { useStore } from "@/lib/store";
import { useContactsStore } from "../../lib/contact-store";
import { useActivityStore } from "../../lib/activity-store";
import { encryptMessage, decryptMessage, type MessagePayload } from "@/lib/message-crypto";
import { motion, AnimatePresence, useSpring, useTransform } from "framer-motion";
import { ethers } from "ethers";
import {
  MessageSquare, Send, Plus, Search, X, ChevronLeft,
  Lock, Loader2, UserCircle2, Check, CheckCheck, Sparkles,
} from "lucide-react";
import { toast } from "sonner";
import { NETWORK_CONFIG } from "@/lib/constants";

interface ConversationMeta {
  address: string;
  lastMessage?: string;
  lastTime?: number;
  unread: number;
}

// ── Floating particle that shoots out on send ──
function SendParticle({ trigger }: { trigger: number }) {
  const particles = Array.from({ length: 8 }, (_, i) => i);
  return (
    <AnimatePresence>
      {trigger > 0 && particles.map((i) => {
        const angle = (i / particles.length) * 360;
        const rad = (angle * Math.PI) / 180;
        const dist = 40 + Math.random() * 20;
        return (
          <motion.div
            key={`${trigger}-${i}`}
            className="absolute pointer-events-none"
            style={{ left: "50%", top: "50%", zIndex: 50 }}
            initial={{ x: 0, y: 0, opacity: 1, scale: 1 }}
            animate={{
              x: Math.cos(rad) * dist,
              y: Math.sin(rad) * dist,
              opacity: 0,
              scale: 0,
            }}
            transition={{ duration: 0.5, ease: "easeOut" }}
          >
            <div
              className="w-1.5 h-1.5 rounded-full"
              style={{
                background: i % 2 === 0 ? "hsl(var(--primary))" : "#a78bfa",
              }}
            />
          </motion.div>
        );
      })}
    </AnimatePresence>
  );
}

// ── Animated message bubble ──
function MessageBubble({
  m,
  isMine,
  showDate,
  prevTimestamp,
}: {
  m: any;
  isMine: boolean;
  showDate: boolean;
  prevTimestamp?: number;
}) {
  return (
    <div key={m.id}>
      {showDate && (
        <motion.div
          initial={{ opacity: 0, y: -8 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex items-center gap-3 my-4"
        >
          <div className="flex-1 h-px bg-border/40" />
          <span className="text-[10px] text-muted-foreground font-medium">
            {new Date(m.timestamp).toLocaleDateString("id-ID", {
              weekday: "long", day: "numeric", month: "long",
            })}
          </span>
          <div className="flex-1 h-px bg-border/40" />
        </motion.div>
      )}
      <motion.div
        layout
        initial={
          isMine
            ? { opacity: 0, scale: 0.6, x: 40, y: 10 }
            : { opacity: 0, scale: 0.6, x: -40, y: 10 }
        }
        animate={{ opacity: 1, scale: 1, x: 0, y: 0 }}
        transition={{
          type: "spring",
          stiffness: 420,
          damping: 22,
          mass: 0.8,
        }}
        className={`flex ${isMine ? "justify-end" : "justify-start"}`}
      >
        <motion.div
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.97 }}
          transition={{ type: "spring", stiffness: 500, damping: 20 }}
          className={`max-w-[72%] px-4 py-2.5 rounded-2xl text-sm leading-relaxed cursor-default select-text ${isMine
              ? "bg-primary text-primary-foreground rounded-br-md shadow-lg shadow-primary/20"
              : "bg-muted/40 text-foreground border border-border/40 rounded-bl-md"
            }`}
        >
          <p>{m.decrypted}</p>
          <div
            className={`flex items-center gap-1 mt-1 ${isMine ? "justify-end" : "justify-start"
              }`}
          >
            <span
              className={`text-[9px] ${isMine ? "text-primary-foreground/60" : "text-muted-foreground"
                }`}
            >
              {new Date(m.timestamp).toLocaleTimeString("id-ID", {
                hour: "2-digit",
                minute: "2-digit",
              })}
            </span>
            {isMine &&
              (m.read ? (
                <CheckCheck size={10} className="text-primary-foreground/60" />
              ) : (
                <Check size={10} className="text-primary-foreground/60" />
              ))}
          </div>
        </motion.div>
      </motion.div>
    </div>
  );
}

export default function MessagesPage() {
  const router = useRouter();
  const { contract, wallet, signer } = useStore();
  const { contacts, getByAddress } = useContactsStore();
  const { addActivity } = useActivityStore();

  const [conversations, setConversations] = useState<ConversationMeta[]>([]);
  const [activeAddr, setActiveAddr] = useState<string | null>(null);
  const [messages, setMessages] = useState<(Omit<MessagePayload, "encrypted"> & {
    encryptedContent: string;
    iv: string;
    senderPublicKey: string;
    decrypted?: string;
  })[]>([]);
  const [input, setInput] = useState("");
  const [sending, setSending] = useState(false);
  const [loading, setLoading] = useState(false);
  const [newRecipient, setNewRecipient] = useState("");
  const [showNew, setShowNew] = useState(false);
  const [searchQ, setSearchQ] = useState("");
  const [mounted, setMounted] = useState(false);
  const [sendParticleTrigger, setSendParticleTrigger] = useState(0);

  // Use a ref for the messages scroll container (NOT scrollIntoView — that leaks to page)
  const messagesContainerRef = useRef<HTMLDivElement>(null);
  const pollRef = useRef<NodeJS.Timeout | null>(null);
  const lastPollRef = useRef<number>(0);

  // Cache plaintext for sent messages (key = encryptedContent)
  const sentCacheRef = useRef<Map<string, string>>(new Map());
  // Track optimistic message encryptedContent so we can remove them when server confirms
  const optimisticContentRef = useRef<Map<string, string>>(new Map()); // encryptedContent → opt-id

  useEffect(() => {
    setMounted(true);
    if (!contract || !wallet) { router.push("/"); return; }
  }, [contract, wallet, router]);

  // ── Scroll to bottom (only inside the messages container, NOT the page) ──
  const scrollToBottom = useCallback((behavior: ScrollBehavior = "smooth") => {
    const container = messagesContainerRef.current;
    if (!container) return;
    container.scrollTo({ top: container.scrollHeight, behavior });
  }, []);

  useEffect(() => {
    scrollToBottom("smooth");
  }, [messages, activeAddr, scrollToBottom]);

  // ── Fetch & decrypt messages ──────────────────────────────
  const fetchMessages = useCallback(
    async (passive = false) => {
      if (!wallet?.address || !signer) return;
      try {
        const res = await fetch(
          `/api/messages?address=${wallet.address}&after=${lastPollRef.current}`
        );
        const data = await res.json();
        if (!data.success || !data.messages.length) return;

        lastPollRef.current = Date.now();

        const w = signer as ethers.Wallet;
        const decrypted = await Promise.all(
          data.messages.map(async (m: any) => {
            if (m.from === wallet.address.toLowerCase()) {
              const cached = sentCacheRef.current.get(m.encryptedContent);
              return { ...m, decrypted: cached ?? m.encryptedContent };
            }
            try {
              const text = await decryptMessage(
                {
                  encryptedContent: m.encryptedContent,
                  iv: m.iv,
                  senderPublicKey: m.senderPublicKey,
                },
                w
              );
              return { ...m, decrypted: text };
            } catch {
              return { ...m, decrypted: "[Pesan tidak bisa didekripsi]" };
            }
          })
        );

        setMessages((prev) => {
          // 1. Remove optimistic messages whose real counterpart has arrived
          const arrivedContents = new Set(
            decrypted
              .filter((m) => m.from === wallet.address.toLowerCase())
              .map((m) => m.encryptedContent)
          );
          const withoutOptimistic = prev.filter((m) => {
            if (!String(m.id).startsWith("opt-")) return true;
            // Keep optimistic only if its encryptedContent hasn't been confirmed yet
            const ec = (m as any).encryptedContent;
            return ec ? !arrivedContents.has(ec) : true;
          });

          // 2. Normal dedup by id
          const ids = new Set(withoutOptimistic.map((m) => m.id));
          const newMsgs = decrypted.filter((m) => !ids.has(m.id));
          if (!newMsgs.length && withoutOptimistic.length === prev.length) return prev;
          return [...withoutOptimistic, ...newMsgs].sort(
            (a, b) => a.timestamp - b.timestamp
          );
        });

        // Update conversations list
        setConversations((prev) => {
          const map = new Map(prev.map((c) => [c.address, c]));
          for (const m of decrypted) {
            const peer =
              m.from === wallet.address.toLowerCase() ? m.to : m.from;
            const existing = map.get(peer) || { address: peer, unread: 0 };
            map.set(peer, {
              ...existing,
              lastMessage: m.decrypted,
              lastTime: m.timestamp,
              unread:
                !passive &&
                  m.to === wallet.address.toLowerCase() &&
                  m.from !== activeAddr
                  ? existing.unread + 1
                  : existing.unread,
            });
          }
          return Array.from(map.values()).sort(
            (a, b) => (b.lastTime || 0) - (a.lastTime || 0)
          );
        });

        if (
          !passive &&
          decrypted.some((m) => m.to === wallet.address.toLowerCase())
        ) {
          decrypted
            .filter((m) => m.to === wallet.address.toLowerCase())
            .forEach((m) => {
              addActivity({
                type: "message_received",
                title: "Pesan diterima",
                description: `Dari ${shortAddr(m.from)}: ${(
                  m.decrypted || ""
                ).slice(0, 40)}`,
                walletAddress: wallet.address,
                address: m.from,
              });
            });
        }
      } catch (e) {
        console.error("[Messages] fetch error:", e);
      }
    },
    [wallet, signer, activeAddr, addActivity]
  );

  // Initial load
  useEffect(() => {
    if (!mounted || !wallet) return;
    setLoading(true);
    fetch(`/api/messages?address=${wallet.address}`)
      .then((r) => r.json())
      .then(async (data) => {
        if (!data.success) return;
        const w = signer as ethers.Wallet;
        const decrypted = await Promise.all(
          (data.messages as any[]).map(async (m) => {
            if (m.from === wallet.address.toLowerCase()) {
              const cached = sentCacheRef.current.get(m.encryptedContent);
              return { ...m, decrypted: cached ?? "📤 Pesan terkirim" };
            }
            try {
              const text = await decryptMessage(
                {
                  encryptedContent: m.encryptedContent,
                  iv: m.iv,
                  senderPublicKey: m.senderPublicKey,
                },
                w
              );
              return { ...m, decrypted: text };
            } catch {
              return { ...m, decrypted: "[Tidak bisa didekripsi]" };
            }
          })
        );
        const sorted = decrypted.sort((a, b) => a.timestamp - b.timestamp);
        setMessages(sorted);
        lastPollRef.current = Date.now();

        const convMap = new Map<string, ConversationMeta>();
        for (const m of sorted) {
          const peer =
            m.from === wallet.address.toLowerCase() ? m.to : m.from;
          const existing = convMap.get(peer) || { address: peer, unread: 0 };
          convMap.set(peer, {
            ...existing,
            lastMessage: m.decrypted,
            lastTime: m.timestamp,
          });
        }
        setConversations(
          Array.from(convMap.values()).sort(
            (a, b) => (b.lastTime || 0) - (a.lastTime || 0)
          )
        );
      })
      .finally(() => setLoading(false));
  }, [mounted, wallet?.address]); // eslint-disable-line

  // Polling
  useEffect(() => {
    if (!mounted || !wallet) return;
    pollRef.current = setInterval(() => fetchMessages(true), 3000);
    return () => {
      if (pollRef.current) clearInterval(pollRef.current);
    };
  }, [mounted, wallet?.address, fetchMessages]);

  // ── Send message ─────────────────────────────────────────
  const handleSend = async () => {
    if (!input.trim() || !activeAddr || !signer || !wallet) return;
    setSending(true);
    const textToSend = input.trim();
    setInput(""); // clear immediately for better UX

    try {
      const w = signer as ethers.Wallet;

      const res = await fetch(`/api/pubkey-store?address=${activeAddr}`);
      if (!res.ok) {
        toast.error(
          "Public key penerima tidak ditemukan. Minta mereka login terlebih dahulu."
        );
        setInput(textToSend); // restore on error
        return;
      }
      const { publicKey: recipientPubKey } = await res.json();

      const encrypted = await encryptMessage(textToSend, w, recipientPubKey);

      const optId = `opt-${Date.now()}`;

      // Cache plaintext & track optimistic id by encryptedContent
      sentCacheRef.current.set(encrypted.encryptedContent, textToSend);
      optimisticContentRef.current.set(encrypted.encryptedContent, optId);

      const optimistic = {
        id: optId,
        from: wallet.address.toLowerCase(),
        to: activeAddr.toLowerCase(),
        // Expose encryptedContent top-level so dedup can find it
        encryptedContent: encrypted.encryptedContent,
        iv: encrypted.iv,
        senderPublicKey: encrypted.senderPublicKey,
        timestamp: Date.now(),
        read: false,
        decrypted: textToSend,
      };

      setMessages((prev) => [...prev, optimistic]);
      setConversations((prev) => {
        const map = new Map(prev.map((c) => [c.address, c]));
        const existing = map.get(activeAddr) || { address: activeAddr, unread: 0 };
        map.set(activeAddr, {
          ...existing,
          lastMessage: textToSend,
          lastTime: Date.now(),
        });
        return Array.from(map.values()).sort(
          (a, b) => (b.lastTime || 0) - (a.lastTime || 0)
        );
      });

      // Shoot particles 🎉
      setSendParticleTrigger((t) => t + 1);

      await fetch("/api/messages", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          from: wallet.address.toLowerCase(),
          to: activeAddr.toLowerCase(),
          ...encrypted,
        }),
      });

      addActivity({
        type: "message_sent",
        title: "Pesan dikirim",
        description: `Ke ${shortAddr(activeAddr)}: ${textToSend.slice(0, 40)}`,
        walletAddress: wallet.address,
        address: activeAddr,
      });
    } catch (e: any) {
      toast.error(e.message || "Gagal mengirim pesan");
      setInput(textToSend); // restore on error
    } finally {
      setSending(false);
    }
  };

  const startConversation = () => {
    const addr = newRecipient.trim();
    if (!ethers.isAddress(addr)) {
      toast.error("Address tidak valid");
      return;
    }
    if (addr.toLowerCase() === wallet?.address.toLowerCase()) {
      toast.error("Tidak bisa chat dengan dirimu sendiri");
      return;
    }
    setActiveAddr(addr.toLowerCase());
    if (!conversations.find((c) => c.address === addr.toLowerCase())) {
      setConversations((prev) => [
        { address: addr.toLowerCase(), unread: 0 },
        ...prev,
      ]);
    }
    setNewRecipient("");
    setShowNew(false);
  };

  const activeMessages = messages.filter(
    (m) =>
      (m.from === wallet?.address.toLowerCase() && m.to === activeAddr) ||
      (m.to === wallet?.address.toLowerCase() && m.from === activeAddr)
  );

  const filteredConvs = searchQ
    ? conversations.filter((c) => {
      const contact = getByAddress(c.address);
      return (
        c.address.includes(searchQ.toLowerCase()) ||
        contact?.name.toLowerCase().includes(searchQ.toLowerCase())
      );
    })
    : conversations;

  if (!mounted) return null;

  return (
    // overflow-hidden on the outermost div so nothing on this page leaks to page scroll
    <div className="h-screen overflow-hidden pt-24 px-4 pb-4 max-w-[1400px] mx-auto flex flex-col">
      <div className="flex-1 flex gap-4 min-h-0 overflow-hidden">

        {/* ── Sidebar ── */}
        <motion.div
          initial={{ x: -20, opacity: 0 }}
          animate={{ x: 0, opacity: 1 }}
          className={`w-full md:w-[300px] shrink-0 flex flex-col bg-card border border-border/50 rounded-[2rem] overflow-hidden min-h-0 ${activeAddr ? "hidden md:flex" : "flex"}`}
        >
          {/* Header */}
          <div className="p-5 border-b border-border/50 shrink-0">
            <div className="flex items-center justify-between mb-4">
              <h2 className="font-bold text-foreground flex items-center gap-2">
                <MessageSquare size={16} className="text-muted-foreground" />
                Pesan
                <div className="flex items-center gap-1 px-1.5 py-0.5 rounded-full bg-muted/30 border border-border/40">
                  <Lock size={8} className="text-emerald-400" />
                  <span className="text-[9px] text-emerald-600 dark:text-emerald-400 font-bold">E2E</span>
                </div>
              </h2>
              <motion.button
                whileHover={{ scale: 1.1, rotate: 90 }}
                whileTap={{ scale: 0.85 }}
                transition={{ type: "spring", stiffness: 500, damping: 20 }}
                onClick={() => setShowNew(true)}
                className="w-8 h-8 rounded-full bg-primary flex items-center justify-center text-primary-foreground shadow-lg shadow-primary/20"
              >
                <Plus size={15} />
              </motion.button>
            </div>
            {/* Search */}
            <div className="relative">
              <Search size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
              <input
                value={searchQ}
                onChange={(e) => setSearchQ(e.target.value)}
                placeholder="Cari kontak atau address..."
                className="w-full h-9 pl-8 pr-3 rounded-xl bg-muted/30 border border-border/40 text-sm text-foreground placeholder:text-muted-foreground/50 outline-none focus:ring-1 focus:ring-primary/30 transition-all"
              />
            </div>
          </div>

          {/* New conversation modal */}
          <AnimatePresence>
            {showNew && (
              <motion.div
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: "auto", opacity: 1 }}
                exit={{ height: 0, opacity: 0 }}
                className="overflow-hidden border-b border-border/50 shrink-0"
              >
                <div className="p-4">
                  <p className="text-xs font-bold text-muted-foreground mb-2">Percakapan Baru</p>
                  <div className="flex gap-2">
                    <input
                      value={newRecipient}
                      onChange={(e) => setNewRecipient(e.target.value)}
                      onKeyDown={(e) => e.key === "Enter" && startConversation()}
                      placeholder="0x... atau pilih kontak"
                      autoFocus
                      className="flex-1 h-9 px-3 rounded-xl bg-muted/30 border border-border/40 text-sm text-foreground placeholder:text-muted-foreground/40 outline-none focus:ring-1 focus:ring-primary/30"
                    />
                    <button
                      onClick={startConversation}
                      className="h-9 px-3 rounded-xl bg-primary text-primary-foreground text-sm font-bold hover:opacity-90"
                    >
                      Mulai
                    </button>
                    <button
                      onClick={() => setShowNew(false)}
                      className="h-9 w-9 rounded-xl bg-muted/30 flex items-center justify-center text-muted-foreground hover:text-foreground"
                    >
                      <X size={14} />
                    </button>
                  </div>
                  {contacts.length > 0 && (
                    <div className="mt-2 flex gap-2 overflow-x-auto pb-1">
                      {contacts.slice(0, 6).map((c) => (
                        <button
                          key={c.id}
                          onClick={() => setNewRecipient(c.address)}
                          className="shrink-0 flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-muted/30 border border-border/40 text-[11px] hover:bg-muted/60 transition-colors"
                        >
                          <span>{c.emoji}</span>
                          <span className="text-foreground font-medium">{c.name}</span>
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Conversation list — this is the only scrollable part in sidebar */}
          <div className="flex-1 overflow-y-auto min-h-0">
            {loading ? (
              <div className="flex items-center justify-center h-32">
                <Loader2 size={18} className="animate-spin text-muted-foreground" />
              </div>
            ) : filteredConvs.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-40 gap-3 text-center px-6">
                <MessageSquare size={28} className="text-muted-foreground/30" />
                <p className="text-sm text-muted-foreground">Belum ada percakapan</p>
                <button
                  onClick={() => setShowNew(true)}
                  className="text-xs text-primary font-semibold hover:underline"
                >
                  Mulai percakapan baru →
                </button>
              </div>
            ) : (
              filteredConvs.map((conv, idx) => {
                const contact = getByAddress(conv.address);
                const isActive = activeAddr === conv.address;
                return (
                  <motion.button
                    key={conv.address}
                    initial={{ opacity: 0, x: -12 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: idx * 0.04, type: "spring", stiffness: 400, damping: 28 }}
                    whileHover={{ x: 4, backgroundColor: "hsl(var(--muted) / 0.3)" }}
                    whileTap={{ scale: 0.98 }}
                    onClick={() => {
                      setActiveAddr(conv.address);
                      setConversations((prev) =>
                        prev.map((c) =>
                          c.address === conv.address ? { ...c, unread: 0 } : c
                        )
                      );
                    }}
                    className={`w-full flex items-center gap-3 p-4 text-left transition-colors ${isActive ? "bg-muted/20" : ""}`}
                  >
                    <div className="w-10 h-10 rounded-full bg-muted/40 border border-border/40 flex items-center justify-center text-lg shrink-0">
                      {contact?.emoji || (
                        <UserCircle2 size={20} className="text-muted-foreground" />
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between">
                        <p className="text-sm font-semibold text-foreground truncate">
                          {contact?.name || shortAddr(conv.address)}
                        </p>
                        {conv.lastTime && (
                          <span className="text-[10px] text-muted-foreground/60 shrink-0 ml-1">
                            {formatTime(conv.lastTime)}
                          </span>
                        )}
                      </div>
                      <div className="flex items-center justify-between">
                        <p className="text-[11px] text-muted-foreground truncate flex-1">
                          {conv.lastMessage || "Mulai percakapan..."}
                        </p>
                        <AnimatePresence>
                          {conv.unread > 0 && (
                            <motion.span
                              initial={{ scale: 0 }}
                              animate={{ scale: 1 }}
                              exit={{ scale: 0 }}
                              transition={{ type: "spring", stiffness: 600, damping: 20 }}
                              className="ml-1 w-4 h-4 rounded-full bg-primary flex items-center justify-center text-[9px] font-bold text-primary-foreground shrink-0"
                            >
                              {conv.unread}
                            </motion.span>
                          )}
                        </AnimatePresence>
                      </div>
                    </div>
                  </motion.button>
                );
              })
            )}
          </div>
        </motion.div>

        {/* ── Chat Area ── */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className={`flex-1 flex flex-col bg-card border border-border/50 rounded-[2rem] overflow-hidden min-h-0 ${!activeAddr ? "hidden md:flex" : "flex"}`}
        >
          {!activeAddr ? (
            <div className="flex-1 flex flex-col items-center justify-center gap-4 text-center px-8">
              <motion.div
                animate={{ rotate: [0, -5, 5, -5, 0], scale: [1, 1.05, 1] }}
                transition={{ repeat: Infinity, repeatDelay: 3, duration: 0.6 }}
                className="w-16 h-16 rounded-[1.5rem] bg-muted/20 flex items-center justify-center"
              >
                <MessageSquare size={28} className="text-muted-foreground/50" />
              </motion.div>
              <div>
                <p className="font-bold text-foreground mb-1">Pilih percakapan</p>
                <p className="text-sm text-muted-foreground">
                  Semua pesan terenkripsi end-to-end dengan ECDH
                </p>
              </div>
              <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-emerald-500/10 border border-emerald-500/20">
                <Lock size={10} className="text-emerald-400" />
                <span className="text-[10px] font-bold text-emerald-600 dark:text-emerald-400">
                  Zero-Knowledge · Server tidak bisa baca isi pesan
                </span>
              </div>
            </div>
          ) : (
            <>
              {/* Chat Header */}
              <div className="flex items-center gap-3 p-5 border-b border-border/50 shrink-0">
                <motion.button
                  whileHover={{ scale: 1.1 }}
                  whileTap={{ scale: 0.9 }}
                  onClick={() => setActiveAddr(null)}
                  className="md:hidden w-8 h-8 rounded-full bg-muted/30 flex items-center justify-center text-muted-foreground"
                >
                  <ChevronLeft size={16} />
                </motion.button>
                <div className="w-9 h-9 rounded-full bg-muted/40 border border-border/40 flex items-center justify-center text-base">
                  {getByAddress(activeAddr)?.emoji || (
                    <UserCircle2 size={18} className="text-muted-foreground" />
                  )}
                </div>
                <div className="flex-1">
                  <p className="font-bold text-foreground text-sm">
                    {getByAddress(activeAddr)?.name || shortAddr(activeAddr)}
                  </p>
                  <p className="text-[10px] text-muted-foreground font-mono">{activeAddr}</p>
                </div>
                <div className="flex items-center gap-1 px-2 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/20">
                  <Lock size={9} className="text-emerald-400" />
                  <span className="text-[9px] text-emerald-400 font-bold">ECDH Encrypted</span>
                </div>
              </div>

              {/* ── Messages — THIS is the only element that scrolls ── */}
              <div
                ref={messagesContainerRef}
                className="flex-1 overflow-y-auto min-h-0 p-5 space-y-3"
              >
                {activeMessages.length === 0 && (
                  <motion.div
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="text-center py-12"
                  >
                    <p className="text-sm text-muted-foreground">Mulai percakapan yang aman 🔐</p>
                  </motion.div>
                )}
                {activeMessages.map((m, i) => {
                  const isMine = m.from === wallet?.address.toLowerCase();
                  const showDate =
                    i === 0 ||
                    new Date(m.timestamp).toDateString() !==
                    new Date(activeMessages[i - 1].timestamp).toDateString();
                  return (
                    <MessageBubble
                      key={m.id}
                      m={m}
                      isMine={isMine}
                      showDate={showDate}
                      prevTimestamp={i > 0 ? activeMessages[i - 1].timestamp : undefined}
                    />
                  );
                })}
                {/* Invisible anchor — scroll target stays inside container */}
                <div className="h-1" aria-hidden />
              </div>

              {/* Input */}
              <div className="p-4 border-t border-border/50 shrink-0">
                <div className="flex items-end gap-3">
                  <textarea
                    value={input}
                    onChange={(e) => setInput(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter" && !e.shiftKey) {
                        e.preventDefault();
                        handleSend();
                      }
                    }}
                    placeholder="Ketik pesan... (Enter untuk kirim)"
                    rows={1}
                    className="flex-1 bg-muted/30 border border-border/40 focus:border-primary/30 rounded-2xl px-4 py-3 text-sm text-foreground placeholder:text-muted-foreground/50 resize-none outline-none focus:ring-1 focus:ring-primary/20 transition-all max-h-32"
                    style={{ minHeight: "48px" }}
                  />
                  {/* Send button with particles */}
                  <div className="relative shrink-0">
                    <SendParticle trigger={sendParticleTrigger} />
                    <motion.button
                      onClick={handleSend}
                      disabled={sending || !input.trim()}
                      whileHover={!sending && input.trim() ? { scale: 1.12, rotate: -8 } : {}}
                      whileTap={!sending && input.trim() ? { scale: 0.82, rotate: 12 } : {}}
                      transition={{ type: "spring", stiffness: 600, damping: 18 }}
                      className="h-12 w-12 rounded-2xl bg-primary flex items-center justify-center text-primary-foreground disabled:opacity-40 shadow-lg shadow-primary/20"
                    >
                      {sending ? (
                        <Loader2 size={16} className="animate-spin" />
                      ) : (
                        <Send size={16} />
                      )}
                    </motion.button>
                  </div>
                </div>
              </div>
            </>
          )}
        </motion.div>
      </div>
    </div>
  );
}

function shortAddr(addr: string) {
  return `${addr.slice(0, 6)}...${addr.slice(-4)}`;
}
function formatTime(ts: number) {
  const d = Date.now() - ts;
  if (d < 3_600_000) return `${Math.floor(d / 60_000) || 1}m`;
  if (d < 86_400_000) return `${Math.floor(d / 3_600_000)}j`;
  return new Date(ts).toLocaleDateString("id-ID", { day: "numeric", month: "short" });
}