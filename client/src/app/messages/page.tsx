"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { useRouter } from "next/navigation";
import { useStore } from "@/lib/store";
import { useContactsStore } from "../../lib/contact-store";
import { useActivityStore } from "../../lib/activity-store";
import { encryptMessage, decryptMessage, type MessagePayload } from "@/lib/message-crypto";
import { motion, AnimatePresence } from "framer-motion";
import { ethers } from "ethers";
import { Send, Plus, Search, X, ChevronLeft, Lock, Loader2, UserCircle2, Check, CheckCheck } from "lucide-react";
import { toast } from "sonner";

const SERIF = "'EB Garamond', 'Cormorant Garamond', Georgia, serif";
const MONO = "'JetBrains Mono', 'Courier New', monospace";

// ─── Visual viewport hook ────────────────────────────────────────
function useVisualViewport() {
  const [keyboardOffset, setKeyboardOffset] = useState(0);
  useEffect(() => {
    const vv = window.visualViewport;
    if (!vv) return;
    const update = () => setKeyboardOffset(Math.max(0, window.innerHeight - vv.height - vv.offsetTop));
    vv.addEventListener("resize", update);
    vv.addEventListener("scroll", update);
    update();
    return () => { vv.removeEventListener("resize", update); vv.removeEventListener("scroll", update); };
  }, []);
  return keyboardOffset;
}

// ─── Typing indicator ────────────────────────────────────────────
function TypingIndicator({ name }: { name?: string }) {
  return (
    <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
      style={{ display: "flex", justifyContent: "flex-start" }}>
      <div style={{ display: "flex", alignItems: "center", gap: "8px", padding: "8px 14px", border: "1px solid var(--cv-border-light)", background: "var(--cv-surface)", fontFamily: SERIF }}>
        {name && <span style={{ fontSize: "10px", fontStyle: "italic", color: "var(--cv-muted)" }}>{name}</span>}
        <div style={{ display: "flex", gap: "3px", alignItems: "center" }}>
          {[0, 1, 2].map((i) => (
            <motion.div key={i} style={{ width: "4px", height: "4px", borderRadius: "50%", background: "var(--cv-muted)" }}
              animate={{ y: [0, -4, 0], opacity: [0.4, 1, 0.4] }}
              transition={{ repeat: Infinity, duration: 0.75, delay: i * 0.14 }} />
          ))}
        </div>
      </div>
    </motion.div>
  );
}

// ─── Message Bubble ──────────────────────────────────────────────
function MessageBubble({ m, isMine, showDate }: { m: any; isMine: boolean; showDate: boolean }) {
  return (
    <div>
      {showDate && (
        <div style={{ display: "flex", alignItems: "center", gap: "16px", margin: "16px 0" }}>
          <div style={{ flex: 1, height: "1px", background: "var(--cv-border-light)" }} />
          <span style={{ fontFamily: SERIF, fontSize: "9px", letterSpacing: "0.14em", textTransform: "uppercase", color: "var(--cv-muted)", fontStyle: "italic" }}>
            {new Date(m.timestamp).toLocaleDateString("en-GB", { weekday: "long", day: "numeric", month: "long" })}
          </span>
          <div style={{ flex: 1, height: "1px", background: "var(--cv-border-light)" }} />
        </div>
      )}
      <motion.div layout initial={isMine ? { opacity: 0, x: 24 } : { opacity: 0, x: -24 }} animate={{ opacity: 1, x: 0 }}
        transition={{ type: "spring", stiffness: 340, damping: 22 }}
        style={{ display: "flex", justifyContent: isMine ? "flex-end" : "flex-start", marginBottom: "6px" }}>
        <div style={{
          maxWidth: "68%",
          padding: "12px 16px",
          background: isMine ? "var(--cv-fg)" : "var(--cv-surface)",
          color: isMine ? "var(--cv-bg)" : "var(--cv-fg)",
          border: `1px solid ${isMine ? "var(--cv-fg)" : "var(--cv-border-light)"}`,
          fontFamily: SERIF,
        }}>
          <p style={{ fontSize: "14px", lineHeight: 1.65, wordBreak: "break-word" }}>{m.decrypted}</p>
          <div style={{ display: "flex", alignItems: "center", gap: "6px", marginTop: "6px", justifyContent: isMine ? "flex-end" : "flex-start" }}>
            <span style={{ fontSize: "9px", fontStyle: "italic", color: isMine ? "rgba(255,255,255,0.5)" : "var(--cv-muted)", letterSpacing: "0.06em" }}>
              {new Date(m.timestamp).toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit" })}
            </span>
            {isMine && (
              m.read
                ? <CheckCheck size={10} strokeWidth={1.5} style={{ color: "rgba(255,255,255,0.6)" }} />
                : <Check size={10} strokeWidth={1.5} style={{ color: "rgba(255,255,255,0.35)" }} />
            )}
          </div>
        </div>
      </motion.div>
    </div>
  );
}

// ─── Main Page ───────────────────────────────────────────────────
interface ConversationMeta { address: string; lastMessage?: string; lastTime?: number; unread: number; }

export default function MessagesPage() {
  const router = useRouter();
  const { contract, wallet, signer } = useStore();
  const { contacts, getByAddress } = useContactsStore();
  const { addActivity } = useActivityStore();

  const [conversations, setConversations] = useState<ConversationMeta[]>([]);
  const [activeAddr, setActiveAddr] = useState<string | null>(null);
  const [messages, setMessages] = useState<(MessagePayload & { decrypted?: string })[]>([]);
  const [input, setInput] = useState("");
  const [sending, setSending] = useState(false);
  const [loading, setLoading] = useState(false);
  const [newRecipient, setNewRecipient] = useState("");
  const [showNew, setShowNew] = useState(false);
  const [searchQ, setSearchQ] = useState("");
  const [mounted, setMounted] = useState(false);
  const [peerTyping, setPeerTyping] = useState(false);
  const keyboardOffset = useVisualViewport();

  const messagesContainerRef = useRef<HTMLDivElement>(null);
  const pollRef = useRef<NodeJS.Timeout | null>(null);
  const lastPollRef = useRef<number>(0);
  const sentCacheRef = useRef<Map<string, string>>(new Map());
  const lastTypingNotif = useRef(0);

  useEffect(() => {
    setMounted(true);
    if (!contract || !wallet) { router.push("/"); return; }
  }, [contract, wallet, router]);

  useEffect(() => {
    const prevBody = document.body.style.overflow;
    const prevHtml = document.documentElement.style.overflow;
    document.body.style.overflow = "hidden";
    document.documentElement.style.overflow = "hidden";
    return () => { document.body.style.overflow = prevBody; document.documentElement.style.overflow = prevHtml; };
  }, []);

  const scrollToBottom = useCallback(() => {
    const c = messagesContainerRef.current;
    if (!c) return;
    c.scrollTo({ top: c.scrollHeight, behavior: "smooth" });
  }, []);
  useEffect(() => { scrollToBottom(); }, [messages, activeAddr, scrollToBottom]);

  useEffect(() => {
    if (!activeAddr || !wallet?.address) return;
    const unread = messages.filter((m) => m.from === activeAddr && m.to === wallet.address.toLowerCase() && !m.read && !String(m.id).startsWith("opt-"));
    if (!unread.length) return;
    setMessages((prev) => prev.map((m) => (unread.some((u) => u.id === m.id) ? { ...m, read: true } : m)));
    setConversations((prev) => prev.map((c) => (c.address === activeAddr ? { ...c, unread: 0 } : c)));
    unread.forEach((m) => fetch("/api/messages", { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ id: m.id, reader: wallet.address }) }).catch(() => { }));
  }, [activeAddr, messages, wallet?.address]); // eslint-disable-line

  useEffect(() => {
    if (!activeAddr || !wallet?.address) return;
    const t = setInterval(async () => {
      try { const r = await fetch(`/api/typing?address=${activeAddr}&peerAddress=${wallet.address}`); if (r.ok) { const d = await r.json(); setPeerTyping(d.typing === true); } } catch { }
    }, 2_000);
    return () => clearInterval(t);
  }, [activeAddr, wallet?.address]);

  const notifyTyping = useCallback(() => {
    const now = Date.now();
    if (now - lastTypingNotif.current < 4_000 || !wallet?.address || !activeAddr) return;
    lastTypingNotif.current = now;
    fetch("/api/typing", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ from: wallet.address, to: activeAddr }) }).catch(() => { });
  }, [wallet?.address, activeAddr]);

  const fetchMessages = useCallback(async (passive = false) => {
    if (!wallet?.address || !signer) return;
    try {
      const res = await fetch(`/api/messages?address=${wallet.address}&after=${lastPollRef.current}`);
      const data = await res.json();
      if (!data.success || !data.messages.length) return;
      lastPollRef.current = Date.now();
      const w = signer as ethers.Wallet;
      const decrypted = await Promise.all(data.messages.map(async (m: any) => {
        if (m.from === wallet.address.toLowerCase()) return { ...m, decrypted: sentCacheRef.current.get(m.encryptedContent) ?? m.encryptedContent };
        try { return { ...m, decrypted: await decryptMessage({ encryptedContent: m.encryptedContent, iv: m.iv, senderPublicKey: m.senderPublicKey }, w) }; }
        catch { return { ...m, decrypted: "[Unable to decrypt]" }; }
      }));
      setMessages((prev) => {
        const arrivedEC = new Set(decrypted.filter((m) => m.from === wallet.address.toLowerCase()).map((m) => m.encryptedContent));
        const withoutOpt = prev.filter((m) => { if (!String(m.id).startsWith("opt-")) return true; const ec = (m as any).encryptedContent; return ec ? !arrivedEC.has(ec) : true; });
        const ids = new Set(withoutOpt.map((m) => m.id));
        const newMsgs = decrypted.filter((m) => !ids.has(m.id));
        const readUpdated = withoutOpt.map((m) => { const fresh = decrypted.find((d) => d.id === m.id); if (fresh && fresh.read && !m.read) return { ...m, read: true }; return m; });
        if (!newMsgs.length && readUpdated.every((m, i) => m === withoutOpt[i]) && withoutOpt.length === prev.length) return prev;
        return [...readUpdated, ...newMsgs].sort((a, b) => a.timestamp - b.timestamp);
      });
      setConversations((prev) => {
        const map = new Map(prev.map((c) => [c.address, c]));
        for (const m of decrypted) {
          const peer = m.from === wallet.address.toLowerCase() ? m.to : m.from;
          const ex = map.get(peer) || { address: peer, unread: 0 };
          map.set(peer, { ...ex, lastMessage: m.decrypted, lastTime: m.timestamp, unread: !passive && m.to === wallet.address.toLowerCase() && m.from !== activeAddr ? ex.unread + 1 : ex.unread });
        }
        return Array.from(map.values()).sort((a, b) => (b.lastTime || 0) - (a.lastTime || 0));
      });
      const incoming = decrypted.filter((m) => m.to === wallet.address.toLowerCase());
      if (incoming.length && !passive) incoming.forEach((m) => addActivity({ type: "message_received", title: "Message received", description: `From ${shortAddr(m.from)}: ${(m.decrypted || "").slice(0, 40)}`, walletAddress: wallet.address, address: m.from }));
    } catch (e) { console.error("[Messages]", e); }
  }, [wallet, signer, activeAddr, addActivity]);

  useEffect(() => {
    if (!mounted || !wallet) return;
    setLoading(true);
    fetch(`/api/messages?address=${wallet.address}`).then((r) => r.json()).then(async (data) => {
      if (!data.success) return;
      const w = signer as ethers.Wallet;
      const decrypted = await Promise.all((data.messages as any[]).map(async (m) => {
        if (m.from === wallet.address.toLowerCase()) return { ...m, decrypted: sentCacheRef.current.get(m.encryptedContent) ?? "📤 Message sent" };
        try { return { ...m, decrypted: await decryptMessage({ encryptedContent: m.encryptedContent, iv: m.iv, senderPublicKey: m.senderPublicKey }, w) }; }
        catch { return { ...m, decrypted: "[Unable to decrypt]" }; }
      }));
      const sorted = decrypted.sort((a, b) => a.timestamp - b.timestamp);
      setMessages(sorted);
      lastPollRef.current = Date.now();
      const convMap = new Map<string, ConversationMeta>();
      for (const m of sorted) {
        const peer = m.from === wallet.address.toLowerCase() ? m.to : m.from;
        const ex = convMap.get(peer) || { address: peer, unread: 0 };
        convMap.set(peer, { ...ex, lastMessage: m.decrypted, lastTime: m.timestamp });
      }
      setConversations(Array.from(convMap.values()).sort((a, b) => (b.lastTime || 0) - (a.lastTime || 0)));
    }).finally(() => setLoading(false));
  }, [mounted, wallet?.address]); // eslint-disable-line

  useEffect(() => {
    if (!mounted || !wallet) return;
    pollRef.current = setInterval(() => fetchMessages(true), 3_000);
    return () => { if (pollRef.current) clearInterval(pollRef.current); };
  }, [mounted, wallet?.address, fetchMessages]);

  const handleSend = async () => {
    if (!input.trim() || !activeAddr || !signer || !wallet) return;
    setSending(true);
    const text = input.trim();
    setInput("");
    try {
      const w = signer as ethers.Wallet;
      const res = await fetch(`/api/pubkey-store?address=${activeAddr}`);
      if (!res.ok) { toast.error("Recipient public key not found."); setInput(text); return; }
      const { publicKey: recipPubKey } = await res.json();
      const encrypted = await encryptMessage(text, w, recipPubKey);
      const optId = `opt-${Date.now()}`;
      sentCacheRef.current.set(encrypted.encryptedContent, text);
      const optimistic = { id: optId, from: wallet.address.toLowerCase(), to: activeAddr.toLowerCase(), encryptedContent: encrypted.encryptedContent, iv: encrypted.iv, senderPublicKey: encrypted.senderPublicKey, timestamp: Date.now(), read: false, decrypted: text };
      setMessages((p) => [...p, optimistic]);
      setConversations((p) => { const map = new Map(p.map((c) => [c.address, c])); const ex = map.get(activeAddr) || { address: activeAddr, unread: 0 }; map.set(activeAddr, { ...ex, lastMessage: text, lastTime: Date.now() }); return Array.from(map.values()).sort((a, b) => (b.lastTime || 0) - (a.lastTime || 0)); });
      await fetch("/api/messages", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ from: wallet.address.toLowerCase(), to: activeAddr.toLowerCase(), ...encrypted }) });
      addActivity({ type: "message_sent", title: "Message sent", description: `To ${shortAddr(activeAddr)}: ${text.slice(0, 40)}`, walletAddress: wallet.address, address: activeAddr });
    } catch (e: any) { toast.error(e.message || "Failed to send"); setInput(text); }
    finally { setSending(false); }
  };

  const startConversation = () => {
    const addr = newRecipient.trim();
    if (!ethers.isAddress(addr)) { toast.error("Invalid address"); return; }
    if (addr.toLowerCase() === wallet?.address.toLowerCase()) { toast.error("Cannot message yourself"); return; }
    setActiveAddr(addr.toLowerCase());
    if (!conversations.find((c) => c.address === addr.toLowerCase())) setConversations((p) => [{ address: addr.toLowerCase(), unread: 0 }, ...p]);
    setNewRecipient(""); setShowNew(false);
  };

  const activeMessages = messages.filter((m) =>
    (m.from === wallet?.address.toLowerCase() && m.to === activeAddr) ||
    (m.to === wallet?.address.toLowerCase() && m.from === activeAddr)
  );
  const filteredConvs = searchQ
    ? conversations.filter((c) => { const co = getByAddress(c.address); return c.address.includes(searchQ.toLowerCase()) || co?.name.toLowerCase().includes(searchQ.toLowerCase()); })
    : conversations;

  if (!mounted) return null;

  return (
    <div className="fixed inset-0 flex flex-col overflow-hidden touch-none" style={{ paddingBottom: keyboardOffset }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=EB+Garamond:ital,wght@0,400;0,500;1,400;1,500&display=swap');
        :root{--cv-bg:#FAFAF8;--cv-fg:#0A0A0A;--cv-muted:#6B6B6B;--cv-border:#D8D4CC;--cv-border-light:#EDEAE4;--cv-card:#FFFFFF;--cv-surface:#F4F2EE;--cv-ink-light:#3A3A3A;}
        .dark{--cv-bg:#0A0A08;--cv-fg:#F0EDE6;--cv-muted:#8A857C;--cv-border:#2A2820;--cv-border-light:#1E1C18;--cv-card:#111109;--cv-surface:#161410;--cv-ink-light:#C5BFB5;}
        .cv-conv-row{width:100%;background:transparent;border:none;border-bottom:1px solid var(--cv-border-light);padding:14px 20px;display:flex;align-items:center;gap:12px;text-align:left;cursor:pointer;transition:background 0.2s;font-family:${SERIF};}
        .cv-conv-row:hover{background:var(--cv-surface);}
        .cv-conv-row.active{background:var(--cv-surface);}
        .cv-msg-input{flex:1;background:transparent;border:none;border-bottom:1px solid var(--cv-border-light);padding:12px 0;font-family:${SERIF};font-size:14px;color:var(--cv-fg);resize:none;outline:none;transition:border-color 0.3s;max-height:120px;min-height:44px;line-height:1.6;}
        .cv-msg-input:focus{border-bottom-color:var(--cv-fg);}
        .cv-msg-input::placeholder{color:var(--cv-muted);font-style:italic;}
        .cv-send-btn{width:40px;height:40px;background:var(--cv-fg);border:1px solid var(--cv-fg);display:flex;align-items:center;justify-content:center;cursor:pointer;flex-shrink:0;transition:opacity 0.25s;}
        .cv-send-btn:hover{opacity:0.8;}
        .cv-send-btn:disabled{background:var(--cv-border);border-color:var(--cv-border);cursor:not-allowed;}
      `}</style>

      <div style={{ flex: 1, display: "flex", flexDirection: "column", overflow: "hidden", paddingTop: "96px", padding: "96px 24px 16px", maxWidth: "1400px", width: "100%", margin: "0 auto", minHeight: 0 }}>
        <div style={{ flex: 1, display: "flex", gap: "2px", minHeight: 0, overflow: "hidden" }}>

          {/* ── Sidebar ── */}
          <div style={{ width: "280px", flexShrink: 0, border: "1px solid var(--cv-border-light)", background: "var(--cv-card)", minHeight: 0, overflow: "hidden" }}
            className={`flex-col ${activeAddr ? "hidden md:flex" : "flex"}`}>
            {/* Header */}
            <div style={{ padding: "16px 20px", borderBottom: "1px solid var(--cv-border-light)", flexShrink: 0 }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "12px" }}>
                <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                  <p style={{ fontFamily: SERIF, fontSize: "16px", color: "var(--cv-fg)" }}>Messages</p>
                  <div style={{ display: "flex", alignItems: "center", gap: "4px", padding: "2px 8px", border: "1px solid var(--cv-border-light)" }}>
                    <Lock size={8} strokeWidth={1.5} style={{ color: "var(--cv-muted)" }} />
                    <span style={{ fontFamily: SERIF, fontSize: "8px", letterSpacing: "0.16em", textTransform: "uppercase", color: "var(--cv-muted)" }}>E2E</span>
                  </div>
                </div>
                <button onClick={() => setShowNew(true)}
                  style={{ width: "28px", height: "28px", background: "var(--cv-fg)", border: "1px solid var(--cv-fg)", display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer", transition: "opacity 0.2s" }}
                  onMouseEnter={(e) => (e.currentTarget.style.opacity = "0.8")}
                  onMouseLeave={(e) => (e.currentTarget.style.opacity = "1")}>
                  <Plus size={12} strokeWidth={1.5} style={{ color: "var(--cv-bg)" }} />
                </button>
              </div>
              <div style={{ position: "relative" }}>
                <Search size={11} style={{ position: "absolute", left: 0, top: "50%", transform: "translateY(-50%)", color: "var(--cv-muted)" }} />
                <input value={searchQ} onChange={(e) => setSearchQ(e.target.value)} placeholder="Search…"
                  style={{ width: "100%", background: "transparent", border: "none", borderBottom: "1px solid var(--cv-border-light)", padding: "8px 0 8px 18px", fontFamily: SERIF, fontSize: "12px", fontStyle: "italic", color: "var(--cv-fg)", outline: "none" }} />
              </div>
            </div>

            {/* New conversation input */}
            <AnimatePresence>
              {showNew && (
                <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: "auto", opacity: 1 }} exit={{ height: 0, opacity: 0 }}
                  style={{ overflow: "hidden", borderBottom: "1px solid var(--cv-border-light)", flexShrink: 0 }}>
                  <div style={{ padding: "12px 16px" }}>
                    <p style={{ fontFamily: SERIF, fontSize: "9px", letterSpacing: "0.2em", textTransform: "uppercase", color: "var(--cv-muted)", marginBottom: "8px" }}>New Conversation</p>
                    <div style={{ display: "flex", gap: "4px" }}>
                      <input value={newRecipient} onChange={(e) => setNewRecipient(e.target.value)} onKeyDown={(e) => e.key === "Enter" && startConversation()} placeholder="0x…" autoFocus
                        style={{ flex: 1, background: "transparent", border: "none", borderBottom: "1px solid var(--cv-border)", padding: "8px 0", fontFamily: MONO, fontSize: "11px", color: "var(--cv-fg)", outline: "none" }} />
                      <button onClick={startConversation} style={{ background: "var(--cv-fg)", border: "1px solid var(--cv-fg)", padding: "6px 12px", fontFamily: SERIF, fontSize: "9px", letterSpacing: "0.14em", color: "var(--cv-bg)", cursor: "pointer" }}>Start</button>
                      <button onClick={() => setShowNew(false)} style={{ background: "none", border: "1px solid var(--cv-border-light)", padding: "6px 8px", cursor: "pointer" }}>
                        <X size={11} strokeWidth={1.5} style={{ color: "var(--cv-muted)" }} />
                      </button>
                    </div>
                    {contacts.length > 0 && (
                      <div style={{ display: "flex", gap: "4px", marginTop: "8px", overflowX: "auto", paddingBottom: "2px" }}>
                        {contacts.slice(0, 6).map((c) => (
                          <button key={c.id} onClick={() => setNewRecipient(c.address)}
                            style={{ flexShrink: 0, background: "var(--cv-surface)", border: "1px solid var(--cv-border-light)", padding: "4px 10px", fontFamily: SERIF, fontSize: "10px", color: "var(--cv-fg)", cursor: "pointer", display: "flex", alignItems: "center", gap: "4px" }}>
                            <span>{c.emoji}</span> {c.name}
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                </motion.div>
              )}
            </AnimatePresence>

            {/* Conversation list */}
            <div style={{ flex: 1, overflowY: "auto", minHeight: 0 }}>
              {loading
                ? <div style={{ display: "flex", justifyContent: "center", padding: "40px" }}><Loader2 size={16} style={{ animation: "spin 1s linear infinite", color: "var(--cv-muted)" }} /></div>
                : filteredConvs.length === 0
                  ? <div style={{ padding: "40px 20px", textAlign: "center" }}>
                    <p style={{ fontFamily: SERIF, fontSize: "13px", fontStyle: "italic", color: "var(--cv-muted)", marginBottom: "12px" }}>No conversations.</p>
                    <button onClick={() => setShowNew(true)} style={{ background: "none", border: "none", fontFamily: SERIF, fontSize: "11px", letterSpacing: "0.14em", textTransform: "uppercase", color: "var(--cv-muted)", cursor: "pointer" }}>Begin →</button>
                  </div>
                  : filteredConvs.map((conv) => {
                    const contact = getByAddress(conv.address);
                    return (
                      <button key={conv.address} className={`cv-conv-row ${activeAddr === conv.address ? "active" : ""}`}
                        onClick={() => { setActiveAddr(conv.address); setConversations((p) => p.map((c) => c.address === conv.address ? { ...c, unread: 0 } : c)); }}>
                        <div style={{ width: "36px", height: "36px", border: "1px solid var(--cv-border-light)", background: "var(--cv-surface)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "18px", flexShrink: 0 }}>
                          {contact?.emoji || <UserCircle2 size={16} style={{ color: "var(--cv-muted)" }} />}
                        </div>
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "2px" }}>
                            <p style={{ fontFamily: SERIF, fontSize: "13px", color: "var(--cv-fg)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                              {contact?.name || shortAddr(conv.address)}
                            </p>
                            {conv.lastTime && <span style={{ fontFamily: SERIF, fontSize: "9px", fontStyle: "italic", color: "var(--cv-muted)", flexShrink: 0, marginLeft: "4px" }}>{formatTime(conv.lastTime)}</span>}
                          </div>
                          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                            <p style={{ fontFamily: SERIF, fontSize: "10px", fontStyle: "italic", color: "var(--cv-muted)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", flex: 1 }}>
                              {conv.lastMessage || "Begin conversation…"}
                            </p>
                            <AnimatePresence>
                              {conv.unread > 0 && (
                                <motion.span initial={{ scale: 0 }} animate={{ scale: 1 }} exit={{ scale: 0 }}
                                  style={{ width: "16px", height: "16px", background: "var(--cv-fg)", color: "var(--cv-bg)", borderRadius: "50%", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "9px", fontFamily: SERIF, flexShrink: 0, marginLeft: "4px" }}>
                                  {conv.unread}
                                </motion.span>
                              )}
                            </AnimatePresence>
                          </div>
                        </div>
                      </button>
                    );
                  })
              }
            </div>
          </div>

          {/* ── Chat Area ── */}
          <div style={{ flex: 1, border: "1px solid var(--cv-border-light)", background: "var(--cv-card)", minHeight: 0, overflow: "hidden", position: "relative" }}
            className={`flex-col ${!activeAddr ? "hidden md:flex" : "flex"}`}>
            {!activeAddr ? (
              <div style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: "16px", textAlign: "center", padding: "40px" }}>
                <div style={{ width: "48px", height: "48px", border: "1px solid var(--cv-border-light)", display: "flex", alignItems: "center", justifyContent: "center" }}>
                  <Lock size={18} strokeWidth={1} style={{ color: "var(--cv-muted)" }} />
                </div>
                <div>
                  <p style={{ fontFamily: SERIF, fontSize: "18px", color: "var(--cv-fg)", marginBottom: "6px" }}>Select a conversation.</p>
                  <p style={{ fontFamily: SERIF, fontSize: "12px", fontStyle: "italic", color: "var(--cv-muted)" }}>All messages encrypted end-to-end with ECDH.</p>
                </div>
              </div>
            ) : (
              <>
                {/* Chat header */}
                <div style={{ padding: "14px 20px", borderBottom: "1px solid var(--cv-border-light)", display: "flex", alignItems: "center", gap: "12px", flexShrink: 0 }}>
                  <button onClick={() => setActiveAddr(null)} style={{ background: "none", border: "none", cursor: "pointer", display: "flex", alignItems: "center" }} className="md:hidden">
                    <ChevronLeft size={14} strokeWidth={1.5} style={{ color: "var(--cv-muted)" }} />
                  </button>
                  <div style={{ width: "32px", height: "32px", border: "1px solid var(--cv-border-light)", background: "var(--cv-surface)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "16px" }}>
                    {getByAddress(activeAddr)?.emoji || <UserCircle2 size={14} style={{ color: "var(--cv-muted)" }} />}
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <p style={{ fontFamily: SERIF, fontSize: "14px", color: "var(--cv-fg)", marginBottom: "1px" }}>
                      {getByAddress(activeAddr)?.name || shortAddr(activeAddr)}
                    </p>
                    <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                      <p style={{ fontFamily: MONO, fontSize: "9px", color: "var(--cv-muted)", overflow: "hidden", textOverflow: "ellipsis" }}>{activeAddr}</p>
                      <AnimatePresence>
                        {peerTyping && (
                          <motion.span initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                            style={{ fontFamily: SERIF, fontSize: "9px", fontStyle: "italic", color: "var(--cv-muted)", flexShrink: 0 }}>
                            composing…
                          </motion.span>
                        )}
                      </AnimatePresence>
                    </div>
                  </div>
                  <div style={{ display: "flex", alignItems: "center", gap: "4px", padding: "3px 8px", border: "1px solid var(--cv-border-light)" }}>
                    <Lock size={8} strokeWidth={1.5} style={{ color: "var(--cv-muted)" }} />
                    <span style={{ fontFamily: SERIF, fontSize: "8px", letterSpacing: "0.16em", textTransform: "uppercase", color: "var(--cv-muted)" }}>ECDH</span>
                  </div>
                </div>

                {/* Messages */}
                <div ref={messagesContainerRef} style={{ flex: 1, overflowY: "auto", minHeight: 0, padding: "20px", display: "flex", flexDirection: "column", gap: "2px" }}>
                  {activeMessages.length === 0 && (
                    <div style={{ textAlign: "center", padding: "40px 20px" }}>
                      <p style={{ fontFamily: SERIF, fontSize: "13px", fontStyle: "italic", color: "var(--cv-muted)" }}>Begin a secure conversation.</p>
                    </div>
                  )}
                  {activeMessages.map((m, i) => {
                    const isMine = m.from === wallet?.address.toLowerCase();
                    const showDate = i === 0 || new Date(m.timestamp).toDateString() !== new Date(activeMessages[i - 1].timestamp).toDateString();
                    return <MessageBubble key={m.id} m={m} isMine={isMine} showDate={showDate} />;
                  })}
                  <AnimatePresence>
                    {peerTyping && <TypingIndicator name={getByAddress(activeAddr)?.name} />}
                  </AnimatePresence>
                  <div style={{ height: "4px" }} />
                </div>

                {/* Input */}
                <div style={{ padding: "14px 20px", borderTop: "1px solid var(--cv-border-light)", flexShrink: 0 }}>
                  <div style={{ display: "flex", alignItems: "flex-end", gap: "12px" }}>
                    <textarea value={input} onChange={(e) => { setInput(e.target.value); notifyTyping(); }}
                      onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); handleSend(); } }}
                      placeholder="Compose message… (Enter to send)" rows={1} className="cv-msg-input" />
                    <button onClick={handleSend} disabled={sending || !input.trim()} className="cv-send-btn">
                      {sending ? <Loader2 size={14} strokeWidth={1.5} style={{ animation: "spin 1s linear infinite", color: "var(--cv-bg)" }} /> : <Send size={14} strokeWidth={1.5} style={{ color: "var(--cv-bg)" }} />}
                    </button>
                  </div>
                  <p style={{ fontFamily: SERIF, fontSize: "8px", letterSpacing: "0.12em", color: "var(--cv-muted)", marginTop: "6px", fontStyle: "italic" }}>
                    Zero-knowledge · Server cannot read message content
                  </p>
                </div>
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

function shortAddr(addr: string) { return `${addr.slice(0, 6)}…${addr.slice(-4)}`; }
function formatTime(ts: number) {
  const d = Date.now() - ts;
  if (d < 3_600_000) return `${Math.floor(d / 60_000) || 1}m`;
  if (d < 86_400_000) return `${Math.floor(d / 3_600_000)}h`;
  return new Date(ts).toLocaleDateString("en-GB", { day: "numeric", month: "short" });
}