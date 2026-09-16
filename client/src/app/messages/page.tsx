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

/* ── Hooks ──────────────────────────────────────────────────── */
function useVisualViewport() {
  const [kbOffset, setKbOffset] = useState(0);
  useEffect(() => {
    const vv = window.visualViewport;
    if (!vv) return;
    const update = () => setKbOffset(Math.max(0, window.innerHeight - vv.height - vv.offsetTop));
    vv.addEventListener("resize", update);
    vv.addEventListener("scroll", update);
    update();
    return () => { vv.removeEventListener("resize", update); vv.removeEventListener("scroll", update); };
  }, []);
  return kbOffset;
}

/* ── Typing dots ─────────────────────────────────────────────── */
function TypingIndicator({ name }: { name?: string }) {
  return (
    <motion.div className="flex items-center gap-1 p-2 px-3.5 rounded-[18px] bg-primary/10 self-start border border-primary/15"
      initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}>
      {name && <span className="font-serif text-[13px] italic text-muted-foreground">{name}</span>}
      {[0, 1, 2].map(i => (
        <motion.div key={i} className="w-[5px] h-[5px] rounded-full bg-primary"
          animate={{ y: [0, -4, 0], opacity: [0.4, 1, 0.4] }}
          transition={{ repeat: Infinity, duration: 0.75, delay: i * 0.14 }} />
      ))}
    </motion.div>
  );
}

/* ── Message bubble ──────────────────────────────────────────── */
function Bubble({ m, isMine, showDate }: { m: any; isMine: boolean; showDate: boolean }) {
  return (
    <div className="flex flex-col">
      {showDate && (
        <div className="flex items-center gap-3 my-3.5 before:content-[''] before:flex-1 before:h-px before:bg-border after:content-[''] after:flex-1 after:h-px after:bg-border">
          <span className="font-mono text-[10px] tracking-[0.1em] font-semibold text-muted-foreground whitespace-nowrap">
            {new Date(m.timestamp).toLocaleDateString("en-GB", { weekday: "long", day: "numeric", month: "long" })}
          </span>
        </div>
      )}
      <motion.div
        layout
        initial={isMine ? { opacity: 0, x: 20 } : { opacity: 0, x: -20 }}
        animate={{ opacity: 1, x: 0 }}
        transition={{ type: "spring", stiffness: 340, damping: 22 }}
        className={`flex mb-1 ${isMine ? "justify-end" : "justify-start"}`}>
        <div className={`max-w-[72%] py-2.5 px-4 text-[14px] leading-relaxed shadow-sm
          ${isMine ? "bg-primary text-primary-foreground rounded-t-2xl rounded-bl-2xl rounded-br-sm shadow-md border border-primary/20" : "bg-muted/10 text-foreground border border-border rounded-t-2xl rounded-bl-sm rounded-br-2xl"}`}>
          <p className="break-words m-0">{m.decrypted}</p>
          <div className={`text-[10px] mt-1 flex items-center gap-1 ${isMine ? "text-primary-foreground/80 justify-end" : "text-muted-foreground"}`}>
            <span>{new Date(m.timestamp).toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit" })}</span>
            {isMine && (m.read
              ? <CheckCheck size={11} strokeWidth={1.5} className="text-primary-foreground/55" />
              : <Check size={11} strokeWidth={1.5} className="text-primary-foreground/35" />
            )}
          </div>
        </div>
      </motion.div>
    </div>
  );
}

/* ── Main page ───────────────────────────────────────────────── */
interface ConvMeta { address: string; lastMessage?: string; lastTime?: number; unread: number; }

export default function MessagesPage() {
  const router   = useRouter();
  const { contract, wallet, signer } = useStore();
  const { contacts, getByAddress }   = useContactsStore();
  const { addActivity }              = useActivityStore();

  const [conversations, setConversations] = useState<ConvMeta[]>([]);
  const [activeAddr,    setActiveAddr]    = useState<string | null>(null);
  const [messages,      setMessages]      = useState<(MessagePayload & { decrypted?: string })[]>([]);
  const [input,         setInput]         = useState("");
  const [sending,       setSending]       = useState(false);
  const [loading,       setLoading]       = useState(false);
  const [newRecipient,  setNewRecipient]  = useState("");
  const [showNew,       setShowNew]       = useState(false);
  const [searchQ,       setSearchQ]       = useState("");
  const [mounted,       setMounted]       = useState(false);
  const [peerTyping,    setPeerTyping]    = useState(false);

  const kbOffset           = useVisualViewport();
  const messagesRef        = useRef<HTMLDivElement>(null);
  const pollRef            = useRef<ReturnType<typeof setInterval> | null>(null);
  const lastPollRef        = useRef<number>(0);
  const sentCacheRef       = useRef<Map<string, string>>(new Map());
  const lastTypingNotif    = useRef(0);

  useEffect(() => {
    setMounted(true);
    if (!contract || !wallet) { router.push("/"); return; }
  }, [contract, wallet, router]);

  const scrollToBottom = useCallback(() => {
    const c = messagesRef.current;
    if (!c) return;
    c.scrollTo({ top: c.scrollHeight, behavior: "smooth" });
  }, []);

  useEffect(() => { scrollToBottom(); }, [messages, activeAddr, scrollToBottom]);

  /* Mark read */
  useEffect(() => {
    if (!activeAddr || !wallet?.address) return;
    const unread = messages.filter(m => m.from === activeAddr && m.to === wallet.address.toLowerCase() && !m.read && !String(m.id).startsWith("opt-"));
    if (!unread.length) return;
    setMessages(prev => prev.map(m => (unread.some(u => u.id === m.id) ? { ...m, read: true } : m)));
    setConversations(prev => prev.map(c => c.address === activeAddr ? { ...c, unread: 0 } : c));
    unread.forEach(m => fetch("/api/messages", { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ id: m.id, reader: wallet.address }) }).catch(() => {}));
  }, [activeAddr, messages, wallet?.address]); // eslint-disable-line

  /* Peer typing */
  useEffect(() => {
    if (!activeAddr || !wallet?.address) return;
    const t = setInterval(async () => {
      try {
        const r = await fetch(`/api/typing?address=${activeAddr}&peerAddress=${wallet.address}`);
        if (r.ok) { const d = await r.json(); setPeerTyping(d.typing === true); }
      } catch {}
    }, 2000);
    return () => clearInterval(t);
  }, [activeAddr, wallet?.address]);

  const notifyTyping = useCallback(() => {
    const now = Date.now();
    if (now - lastTypingNotif.current < 4000 || !wallet?.address || !activeAddr) return;
    lastTypingNotif.current = now;
    fetch("/api/typing", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ from: wallet.address, to: activeAddr }) }).catch(() => {});
  }, [wallet?.address, activeAddr]);

  const fetchMessages = useCallback(async (passive = false) => {
    if (!wallet?.address || !signer) return;
    try {
      const res  = await fetch(`/api/messages?address=${wallet.address}&after=${lastPollRef.current}`);
      const data = await res.json();
      if (!data.success || !data.messages.length) return;
      lastPollRef.current = Date.now();
      const w = signer as ethers.Wallet;
      const dec = await Promise.all(data.messages.map(async (m: any) => {
        if (m.from === wallet.address.toLowerCase()) return { ...m, decrypted: sentCacheRef.current.get(m.encryptedContent) ?? m.encryptedContent };
        try { return { ...m, decrypted: await decryptMessage({ encryptedContent: m.encryptedContent, iv: m.iv, senderPublicKey: m.senderPublicKey }, w) }; }
        catch { return { ...m, decrypted: "[Unable to decrypt]" }; }
      }));
      setMessages(prev => {
        const arrivedEC = new Set(dec.filter(m => m.from === wallet.address.toLowerCase()).map(m => m.encryptedContent));
        const withoutOpt = prev.filter(m => {
          if (!String(m.id).startsWith("opt-")) return true;
          const ec = (m as any).encryptedContent;
          return ec ? !arrivedEC.has(ec) : true;
        });
        const ids    = new Set(withoutOpt.map(m => m.id));
        const newMsgs = dec.filter(m => !ids.has(m.id));
        const updated = withoutOpt.map(m => { const f = dec.find(d => d.id === m.id); return f && f.read && !m.read ? { ...m, read: true } : m; });
        if (!newMsgs.length && updated.every((m, i) => m === withoutOpt[i]) && withoutOpt.length === prev.length) return prev;
        return [...updated, ...newMsgs].sort((a, b) => a.timestamp - b.timestamp);
      });
      setConversations(prev => {
        const map = new Map(prev.map(c => [c.address, c]));
        for (const m of dec) {
          const peer = m.from === wallet.address.toLowerCase() ? m.to : m.from;
          const ex   = map.get(peer) || { address: peer, unread: 0 };
          map.set(peer, { ...ex, lastMessage: m.decrypted, lastTime: m.timestamp, unread: !passive && m.to === wallet.address.toLowerCase() && m.from !== activeAddr ? ex.unread + 1 : ex.unread });
        }
        return Array.from(map.values()).sort((a, b) => (b.lastTime || 0) - (a.lastTime || 0));
      });
      const incoming = dec.filter(m => m.to === wallet.address.toLowerCase());
      if (incoming.length && !passive) incoming.forEach(m => addActivity({ type: "message_received", title: "Message received", description: `From ${shortAddr(m.from)}: ${(m.decrypted || "").slice(0, 40)}`, walletAddress: wallet.address, address: m.from }));
    } catch (e) { console.error("[Messages]", e); }
  }, [wallet, signer, activeAddr, addActivity]);

  /* Initial load */
  useEffect(() => {
    if (!mounted || !wallet) return;
    setLoading(true);
    fetch(`/api/messages?address=${wallet.address}`).then(r => r.json()).then(async data => {
      if (!data.success) return;
      const w = signer as ethers.Wallet;
      const dec = await Promise.all((data.messages as any[]).map(async m => {
        if (m.from === wallet.address.toLowerCase()) return { ...m, decrypted: sentCacheRef.current.get(m.encryptedContent) ?? "📤 Sent" };
        try { return { ...m, decrypted: await decryptMessage({ encryptedContent: m.encryptedContent, iv: m.iv, senderPublicKey: m.senderPublicKey }, w) }; }
        catch { return { ...m, decrypted: "[Unable to decrypt]" }; }
      }));
      const sorted = dec.sort((a, b) => a.timestamp - b.timestamp);
      setMessages(sorted);
      lastPollRef.current = Date.now();
      const convMap = new Map<string, ConvMeta>();
      for (const m of sorted) {
        const peer = m.from === wallet.address.toLowerCase() ? m.to : m.from;
        const ex   = convMap.get(peer) || { address: peer, unread: 0 };
        convMap.set(peer, { ...ex, lastMessage: m.decrypted, lastTime: m.timestamp });
      }
      setConversations(Array.from(convMap.values()).sort((a, b) => (b.lastTime || 0) - (a.lastTime || 0)));
    }).finally(() => setLoading(false));
  }, [mounted, wallet?.address]); // eslint-disable-line

  /* Poll */
  useEffect(() => {
    if (!mounted || !wallet) return;
    pollRef.current = setInterval(() => fetchMessages(true), 3000);
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
      const optId     = `opt-${Date.now()}`;
      sentCacheRef.current.set(encrypted.encryptedContent, text);
      const optimistic = { id: optId, from: wallet.address.toLowerCase(), to: activeAddr.toLowerCase(), encryptedContent: encrypted.encryptedContent, iv: encrypted.iv, senderPublicKey: encrypted.senderPublicKey, timestamp: Date.now(), read: false, decrypted: text };
      setMessages(p => [...p, optimistic]);
      setConversations(p => {
        const map = new Map(p.map(c => [c.address, c]));
        const ex  = map.get(activeAddr) || { address: activeAddr, unread: 0 };
        map.set(activeAddr, { ...ex, lastMessage: text, lastTime: Date.now() });
        return Array.from(map.values()).sort((a, b) => (b.lastTime || 0) - (a.lastTime || 0));
      });
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
    if (!conversations.find(c => c.address === addr.toLowerCase()))
      setConversations(p => [{ address: addr.toLowerCase(), unread: 0 }, ...p]);
    setNewRecipient(""); setShowNew(false);
  };

  const activeMessages = messages.filter(m =>
    (m.from === wallet?.address.toLowerCase() && m.to === activeAddr) ||
    (m.to === wallet?.address.toLowerCase() && m.from === activeAddr)
  );
  const filteredConvs = searchQ
    ? conversations.filter(c => {
        const co = getByAddress(c.address);
        return c.address.includes(searchQ.toLowerCase()) || co?.name.toLowerCase().includes(searchQ.toLowerCase());
      })
    : conversations;

  if (!mounted) return null;

  return (
    <div className="fixed inset-0 flex flex-col bg-background pt-[84px] max-md:pt-[56px] max-md:pb-[56px] overflow-hidden" style={kbOffset ? { paddingBottom: kbOffset } : {}}>

      <div className="flex-1 flex overflow-hidden max-w-[1300px] w-full mx-auto p-3 px-6 pb-5 min-h-0 max-md:p-0">

        {/* ── SIDEBAR ────────────────────────────────────── */}
        <div className={`enterprise-card flex w-full h-full rounded-[28px] overflow-hidden max-md:rounded-none max-md:border-none`}>
          <div className={`w-[320px] shrink-0 border-r border-border bg-muted/5 flex flex-col min-h-0 overflow-hidden max-md:w-full max-md:border-r-0 max-md:border-b max-md:border-border ${activeAddr ? "max-md:hidden" : ""}`}>
            {/* Header */}
            <div className="p-4 px-5 border-b border-border shrink-0 bg-card">
              <div className="flex justify-between items-center">
                <div className="flex items-center gap-2.5">
                  <p className="text-[18px] font-bold text-foreground m-0 tracking-[-0.02em]">Messages</p>
                  <div className="flex items-center gap-1 px-2 py-0.5 rounded-lg bg-primary/10 text-primary shrink-0 border border-primary/20">
                    <Lock size={10} strokeWidth={1.5} className="text-muted-foreground" />
                    <span className="font-mono text-[10px] tracking-[0.1em] font-bold uppercase">E2E</span>
                  </div>
                </div>
                <button className="w-8 h-8 bg-primary/10 border border-border rounded-lg flex items-center justify-center cursor-pointer shrink-0 transition-all text-foreground hover:bg-primary hover:text-primary-foreground" onClick={() => setShowNew(true)}>
                  <Plus size={14} strokeWidth={1.5} />
                </button>
              </div>
              <div className="relative mt-2.5">
                <Search size={13} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-muted-foreground pointer-events-none" />
                <input value={searchQ} onChange={e => setSearchQ(e.target.value)}
                  placeholder="Search conversations…" className="w-full bg-background border border-border rounded-xl py-2 pr-3 pl-8 text-xs text-foreground outline-none transition-all focus:border-primary focus:ring-2 focus:ring-primary/20" />
              </div>
            </div>

            {/* New conversation panel */}
            <AnimatePresence>
              {showNew && (
                <motion.div className="overflow-hidden border-b border-border shrink-0 bg-card"
                  initial={{ height: 0, opacity: 0 }} animate={{ height: "auto", opacity: 1 }}
                  exit={{ height: 0, opacity: 0 }}>
                  <div className="p-3 px-4">
                    <p className="font-mono text-[10px] tracking-[0.14em] font-semibold uppercase text-muted-foreground mb-2">New Conversation</p>
                    <div className="flex gap-2 items-stretch">
                      <input value={newRecipient} onChange={e => setNewRecipient(e.target.value)}
                        onKeyDown={e => e.key === "Enter" && startConversation()}
                        placeholder="0x…" autoFocus className="flex-1 bg-background border border-border rounded-xl px-3 py-2 font-mono text-[11px] text-foreground outline-none" />
                      <button onClick={startConversation} className="btn-enterprise-primary rounded-xl px-3.5 py-1.5 text-xs font-semibold cursor-pointer transition-opacity hover:opacity-90">Start</button>
                      <button onClick={() => setShowNew(false)} className="bg-transparent border border-border px-2 rounded-xl cursor-pointer flex items-center">
                        <X size={13} strokeWidth={1.5} className="text-muted-foreground" />
                      </button>
                    </div>
                    {contacts.length > 0 && (
                      <div className="flex gap-1.5 mt-2 overflow-x-auto pb-0.5 scrollbar-thin">
                        {contacts.slice(0, 6).map(c => (
                          <button key={c.id} onClick={() => setNewRecipient(c.address)} className="shrink-0 bg-primary/10 border border-border rounded-lg px-2.5 py-1 text-xs font-semibold text-foreground cursor-pointer flex items-center gap-1 transition-all hover:border-primary hover:text-primary whitespace-nowrap">
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
            <div className="flex-1 overflow-y-auto min-h-0 p-1.5 scrollbar-thin">
              {loading ? (
                <div className="flex justify-center p-10">
                  <Loader2 size={18} className="animate-spin text-muted-foreground" />
                </div>
              ) : filteredConvs.length === 0 ? (
                <div className="py-9 px-4 text-center">
                  <p className="text-[13px] text-muted-foreground">No conversations yet.</p>
                  <button onClick={() => setShowNew(true)}
                    className="bg-transparent border-none font-serif text-[13px] tracking-[0.12em] uppercase text-muted-foreground cursor-pointer mt-2.5 hover:text-foreground">
                    Start one →
                  </button>
                </div>
              ) : filteredConvs.map(conv => {
                const contact = getByAddress(conv.address);
                return (
                  <button key={conv.address}
                    className={`w-full bg-transparent border-none rounded-2xl py-3 px-3.5 flex items-center gap-3 text-left cursor-pointer transition-all hover:bg-primary/5 ${activeAddr === conv.address ? "bg-primary/10 border-l-[3px] border-l-primary" : ""}`}
                    onClick={() => {
                      setActiveAddr(conv.address);
                      setConversations(p => p.map(c => c.address === conv.address ? { ...c, unread: 0 } : c));
                    }}>
                    <div className="w-[38px] h-[38px] rounded-xl bg-primary/10 text-primary flex items-center justify-center text-[18px] shrink-0 border border-primary/20">
                      {contact?.emoji || <UserCircle2 size={16} className="text-muted-foreground" />}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex justify-between mb-0.5">
                        <span className="text-[14px] font-semibold text-foreground overflow-hidden text-ellipsis whitespace-nowrap">
                          {contact?.name || shortAddr(conv.address)}
                        </span>
                        {conv.lastTime && (
                          <span className="font-mono text-[10px] text-muted-foreground shrink-0">{fmtTime(conv.lastTime)}</span>
                        )}
                      </div>
                      <div className="flex justify-between items-center">
                        <span className="text-[12px] text-muted-foreground overflow-hidden text-ellipsis whitespace-nowrap flex-1 mt-0.5">
                          {conv.lastMessage || "Begin conversation…"}
                        </span>
                        <AnimatePresence>
                          {conv.unread > 0 && (
                            <motion.span className="min-w-[18px] h-[18px] bg-primary text-primary-foreground rounded-[9px] flex items-center justify-center text-[10px] font-mono font-bold px-1.5 shrink-0 border border-primary/30"
                              initial={{ scale: 0 }} animate={{ scale: 1 }} exit={{ scale: 0 }}>
                              {conv.unread}
                            </motion.span>
                          )}
                        </AnimatePresence>
                      </div>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

          {/* ── CHAT AREA ──────────────────────────────────── */}
          <div className={`flex-1 bg-card flex flex-col min-h-0 overflow-hidden relative max-md:absolute max-md:inset-0 max-md:pt-[56px] max-md:pb-[56px] ${!activeAddr ? "max-md:hidden" : "max-md:flex"}`}>
            {!activeAddr ? (
              <div className="flex-1 flex flex-col items-center justify-center gap-2.5 text-center p-10 hidden md:flex">
                <div className="w-[52px] h-[52px] rounded-xl bg-primary/10 text-primary flex items-center justify-center border border-primary/20">
                  <Lock size={20} strokeWidth={1} className="text-muted-foreground" />
                </div>
                <p className="text-[18px] font-bold text-foreground m-0">Select a conversation.</p>
                <p className="text-[13px] text-muted-foreground m-0">All messages encrypted end-to-end with ECDH.</p>
              </div>
            ) : (
              <>
                {/* Chat header */}
                <div className="p-3.5 px-5 border-b border-border flex items-center gap-3 shrink-0 bg-card">
                  {/* Back button (mobile only) */}
                  <button onClick={() => setActiveAddr(null)}
                    className="bg-transparent border-none cursor-pointer hidden max-md:flex items-center">
                    <ChevronLeft size={16} strokeWidth={1.5} className="text-muted-foreground" />
                  </button>
                  <div className="w-[30px] h-[30px] rounded-lg bg-primary/10 text-primary flex items-center justify-center text-[14px] shrink-0 border border-primary/20">
                    {getByAddress(activeAddr)?.emoji || <UserCircle2 size={14} className="text-muted-foreground" />}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-[15px] font-bold text-foreground m-0">
                      {getByAddress(activeAddr)?.name || shortAddr(activeAddr)}
                    </p>
                    <div className="flex items-center gap-2">
                      <p className="font-mono text-[10px] text-muted-foreground overflow-hidden text-ellipsis m-0">{activeAddr}</p>
                      <AnimatePresence>
                        {peerTyping && (
                          <motion.span initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                            className="font-serif text-[13px] italic text-muted-foreground shrink-0">
                            typing…
                          </motion.span>
                        )}
                      </AnimatePresence>
                    </div>
                  </div>
                  <div className="flex items-center gap-1 px-2 py-0.5 rounded-lg bg-primary/10 text-primary shrink-0 border border-primary/20">
                    <Lock size={10} strokeWidth={1.5} className="text-muted-foreground" />
                    <span className="font-mono text-[10px] tracking-[0.1em] font-bold uppercase">ECDH</span>
                  </div>
                </div>

                {/* Messages */}
                <div ref={messagesRef} className="flex-1 overflow-y-auto min-h-0 p-5 flex flex-col gap-1.5 scrollbar-thin">
                  {activeMessages.length === 0 && (
                    <div className="text-center py-10 px-5">
                      <p className="text-[13px] text-muted-foreground m-0">Begin a secure conversation.</p>
                    </div>
                  )}
                  {activeMessages.map((m, i) => {
                    const isMine   = m.from === wallet?.address.toLowerCase();
                    const showDate = i === 0 || new Date(m.timestamp).toDateString() !== new Date(activeMessages[i - 1].timestamp).toDateString();
                    return <Bubble key={m.id} m={m} isMine={isMine} showDate={showDate} />;
                  })}
                  <AnimatePresence>
                    {peerTyping && <TypingIndicator name={getByAddress(activeAddr)?.name} />}
                  </AnimatePresence>
                  <div className="h-1 shrink-0" />
                </div>

                {/* Input */}
                <div className="p-3 px-4 border-t border-border shrink-0 bg-card">
                  <div className="flex items-end gap-2.5">
                    <textarea
                      value={input}
                      onChange={e => { setInput(e.target.value); notifyTyping(); }}
                      onKeyDown={e => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); handleSend(); } }}
                      placeholder="Compose message… (Enter to send)"
                      rows={1}
                      className="flex-1 bg-muted/5 border border-border rounded-[20px] py-2.5 px-4 text-[14px] text-foreground resize-none outline-none transition-all max-h-[100px] min-h-[42px] leading-snug focus:border-primary focus:ring-2 focus:ring-primary/20 placeholder:text-muted-foreground"
                    />
                    <button onClick={handleSend} disabled={sending || !input.trim()} className="btn-enterprise-primary w-10 h-10 shrink-0 !rounded-full !p-0 flex items-center justify-center transition-all shadow-[0_2px_10px_rgba(27,44,193,0.35)] hover:scale-[1.04] disabled:bg-muted/10 disabled:text-muted-foreground disabled:cursor-not-allowed disabled:transform-none disabled:shadow-none disabled:border-none">
                      {sending
                        ? <Loader2 size={15} strokeWidth={1.5} className="animate-spin text-background" />
                        : <Send size={15} strokeWidth={1.5} className="text-background" />
                      }
                    </button>
                  </div>
                  <p className="font-mono text-[10px] tracking-[0.08em] text-muted-foreground mt-1.5 m-0">
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
function fmtTime(ts: number) {
  const d = Date.now() - ts;
  if (d < 3_600_000)  return `${Math.floor(d / 60_000) || 1}m`;
  if (d < 86_400_000) return `${Math.floor(d / 3_600_000)}h`;
  return new Date(ts).toLocaleDateString("en-GB", { day: "numeric", month: "short" });
}