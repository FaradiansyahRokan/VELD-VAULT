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

const SERIF = "-apple-system, BlinkMacSystemFont, 'SF Pro Text', 'Segoe UI', Roboto, sans-serif";
const MONO  = "'JetBrains Mono', 'Courier New', monospace";

/* ── Font + CSS vars ────────────────────────────────────────── */
const PAGE_CSS = `
  :root {
    --m-bg:      #F8FAFC;
    --m-fg:      #091540;
    --m-muted:   #475569;
    --m-border:  rgba(9, 21, 64, 0.08);
    --m-lite:    rgba(9, 21, 64, 0.05);
    --m-card:    #FFFFFF;
    --m-surf:    #F8FAFC;
    --m-up:      #10B981;
  }
  .dark {
    --m-bg:      #091540;
    --m-fg:      #F4F8FC;
    --m-muted:   #8E9EC5;
    --m-border:  rgba(171, 210, 250, 0.16);
    --m-lite:    rgba(171, 210, 250, 0.08);
    --m-card:    #0D1B4D;
    --m-surf:    #091540;
    --m-up:      #34D399;
  }

  /* ── LAYOUT ── */
  .msg-root {
    position: fixed; inset: 0;
    display: flex; flex-direction: column;
    background: var(--m-bg);
    padding-top: 84px;
    overflow: hidden;
    font-family: -apple-system, BlinkMacSystemFont, "SF Pro Text", "Segoe UI", Roboto, sans-serif;
  }
  @media (max-width: 768px) {
    .msg-root { padding-top: 56px; padding-bottom: 56px; }
  }

  .msg-wrap {
    flex: 1; display: flex; overflow: hidden;
    max-width: 1300px; width: 100%; margin: 0 auto;
    padding: 12px 24px 20px;
    min-height: 0;
  }
  @media (max-width: 768px) {
    .msg-wrap { padding: 0; gap: 0; }
  }

  /* ── CONTAINER BOX ── */
  .msg-shell {
    display: flex; width: 100%; height: 100%;
    border-radius: 28px;
    border: 1px solid var(--m-border);
    background: var(--m-card);
    box-shadow: 0 10px 35px rgba(9, 21, 64, 0.08);
    overflow: hidden;
  }

  /* ── SIDEBAR ── */
  .msg-sidebar {
    width: 320px; flex-shrink: 0;
    border-right: 1px solid var(--m-lite);
    background: var(--m-surf);
    display: flex; flex-direction: column;
    min-height: 0; overflow: hidden;
  }
  @media (max-width: 768px) {
    .msg-sidebar {
      width: 100%; border: none;
      border-bottom: 1px solid var(--m-lite);
    }
    .msg-sidebar.has-active { display: none; }
  }

  .msg-sidebar-head {
    padding: 16px 20px;
    border-bottom: 1px solid var(--m-lite);
    flex-shrink: 0;
  }
  .msg-sidebar-title {
    font-size: 18px; font-weight: 700; color: var(--m-fg); margin: 0;
    letter-spacing: -0.02em;
  }
  .msg-sidebar-label {
    font-family: ${MONO};
    font-size: 10px; letter-spacing: 0.16em; font-weight: 600;
    text-transform: uppercase; color: var(--m-muted);
  }

  /* ── CONV LIST ── */
  .msg-conv-list { flex: 1; overflow-y: auto; min-height: 0; padding: 6px; }
  .msg-conv-list::-webkit-scrollbar { width: 3px; }
  .msg-conv-list::-webkit-scrollbar-thumb { background: var(--m-lite); }
  .msg-conv-row {
    width: 100%; background: transparent; border: none;
    border-radius: 16px;
    padding: 12px 14px; display: flex; align-items: center;
    gap: 12px; text-align: left; cursor: pointer;
    transition: all 0.2s cubic-bezier(0.16, 1, 0.3, 1);
  }
  .msg-conv-row:hover { background: rgba(27, 44, 193, 0.04); }
  .dark .msg-conv-row:hover { background: rgba(118, 146, 255, 0.06); }
  .msg-conv-row.active {
    background: rgba(27, 44, 193, 0.09);
    border-left: 3px solid #1B2CC1;
  }
  .dark .msg-conv-row.active {
    background: rgba(118, 146, 255, 0.14);
    border-left: 3px solid #7692FF;
  }
  .msg-conv-name {
    font-size: 14px; font-weight: 600; color: var(--m-fg);
    overflow: hidden; text-overflow: ellipsis; white-space: nowrap;
  }
  .msg-conv-preview {
    font-size: 12px; color: var(--m-muted);
    overflow: hidden; text-overflow: ellipsis; white-space: nowrap; flex: 1;
    margin-top: 2px;
  }
  .msg-conv-time {
    font-family: ${MONO};
    font-size: 10px; color: var(--m-muted); flex-shrink: 0;
  }

  /* ── CHAT AREA ── */
  .msg-chat {
    flex: 1; background: var(--m-card); display: flex;
    flex-direction: column; min-height: 0; overflow: hidden;
    position: relative;
  }
  @media (max-width: 768px) {
    .msg-chat {
      position: absolute; inset: 0;
      padding-top: 56px; padding-bottom: 56px;
      display: none;
    }
    .msg-chat.mob-chat-active { display: flex; }
  }

  .msg-chat-head {
    padding: 14px 20px; border-bottom: 1px solid var(--m-lite);
    display: flex; align-items: center; gap: 12px; flex-shrink: 0;
    background: var(--m-card);
  }
  .msg-chat-name {
    font-size: 15px; font-weight: 700; color: var(--m-fg);
  }
  .msg-chat-addr {
    font-family: ${MONO};
    font-size: 10px; color: var(--m-muted);
    overflow: hidden; text-overflow: ellipsis;
  }

  /* ── MESSAGES ── */
  .msg-scroll {
    flex: 1; overflow-y: auto; min-height: 0;
    padding: 20px; display: flex; flex-direction: column; gap: 6px;
  }
  .msg-scroll::-webkit-scrollbar { width: 3px; }
  .msg-scroll::-webkit-scrollbar-thumb { background: var(--m-lite); }

  .msg-bubble-mine {
    max-width: 72%; padding: 10px 16px; align-self: flex-end;
    background: #1B2CC1;
    color: #FFFFFF;
    border-radius: 20px 20px 4px 20px;
    font-size: 14px; line-height: 1.45;
    box-shadow: 0 3px 12px rgba(27, 44, 193, 0.28);
    border: 1px solid rgba(171, 210, 250, 0.2);
  }
  .msg-bubble-theirs {
    max-width: 72%; padding: 10px 16px; align-self: flex-start;
    background: rgba(9, 21, 64, 0.05); color: var(--m-fg);
    border: 1px solid rgba(27, 44, 193, 0.08);
    border-radius: 20px 20px 20px 4px;
    font-size: 14px; line-height: 1.45;
  }
  .dark .msg-bubble-theirs {
    background: #091540;
    border-color: rgba(171, 210, 250, 0.16);
  }

  .msg-meta {
    font-size: 10px; margin-top: 4px;
    display: flex; align-items: center; gap: 4px;
  }
  .msg-meta-mine   { color: rgba(255, 255, 255, 0.85); justify-content: flex-end; }
  .msg-meta-theirs { color: var(--m-muted); }

  /* Date divider */
  .msg-date-div {
    display: flex; align-items: center; gap: 12px; margin: 14px 0;
  }
  .msg-date-div::before,.msg-date-div::after {
    content:''; flex:1; height:1px; background:var(--m-lite);
  }
  .msg-date-div span {
    font-family: ${MONO};
    font-size: 10px; letter-spacing: 0.1em; font-weight: 600;
    color: var(--m-muted); white-space: nowrap;
  }

  /* Typing dots */
  .msg-typing-wrap {
    display: flex; align-items: center; gap: 4px;
    padding: 8px 14px; border-radius: 18px;
    background: rgba(118, 146, 255, 0.08); align-self: flex-start;
    border: 1px solid rgba(171, 210, 250, 0.15);
  }
  .msg-typing-dot {
    width: 5px; height: 5px; border-radius: 50%; background: #7692FF;
  }

  /* ── INPUT AREA ── */
  .msg-input-wrap {
    padding: 12px 18px; border-top: 1px solid var(--m-lite); flex-shrink: 0;
    background: var(--m-card);
  }
  .msg-input-row { display: flex; align-items: flex-end; gap: 10px; }
  .msg-textarea {
    flex: 1; background: rgba(9, 21, 64, 0.02); border: 1px solid var(--m-border);
    border-radius: 20px;
    padding: 10px 16px;
    font-size: 14px; color: var(--m-fg); resize: none; outline: none;
    transition: all 0.2s; max-height: 100px; min-height: 42px; line-height: 1.4;
  }
  .dark .msg-textarea {
    background: rgba(9, 21, 64, 0.5);
  }
  .msg-textarea:focus { border-color: #7692FF; box-shadow: 0 0 0 3px rgba(118, 146, 255, 0.18); }
  .msg-textarea::placeholder { color: var(--m-muted); }
  .msg-send-btn {
    width: 40px; height: 40px; flex-shrink: 0;
    border-radius: 50%;
    background: #1B2CC1;
    border: 1px solid rgba(171, 210, 250, 0.25);
    color: #FFFFFF;
    display: flex; align-items: center; justify-content: center;
    cursor: pointer; transition: all 0.2s;
    box-shadow: 0 2px 10px rgba(27, 44, 193, 0.35);
  }
  .msg-send-btn:hover {
    background: #15229E;
    transform: scale(1.04);
  }
  .msg-send-btn:disabled { background: var(--m-lite); color: var(--m-muted); cursor: not-allowed; transform: none; box-shadow: none; border: none; }
  .msg-input-hint {
    font-family: ${MONO}; font-size: 10px;
    letter-spacing: 0.08em; color: var(--m-muted); margin-top: 6px;
  }

  /* ── SEARCH INPUT ── */
  .msg-search-wrap { position: relative; margin-top: 10px; }
  .msg-search-ico {
    position: absolute; left: 10px; top: 50%; transform: translateY(-50%);
    color: var(--m-muted); pointer-events: none;
  }
  .msg-search {
    width: 100%; background: rgba(9, 21, 64, 0.02); border: 1px solid var(--m-lite);
    border-radius: 14px;
    padding: 8px 12px 8px 30px;
    font-size: 12px; color: var(--m-fg); outline: none; transition: all 0.2s;
  }
  .dark .msg-search { background: rgba(9, 21, 64, 0.4); }
  .msg-search::placeholder { color: var(--m-muted); }
  .msg-search:focus { border-color: #7692FF; box-shadow: 0 0 0 3px rgba(118, 146, 255, 0.15); }

  /* ── NEW CONV PANEL ── */
  .msg-new-panel {
    overflow: hidden; border-bottom: 1px solid var(--m-lite); flex-shrink: 0;
  }
  .msg-new-inner { padding: 12px 16px; }
  .msg-new-label {
    font-family: ${MONO}; font-size: 10px; letter-spacing: 0.14em; font-weight: 600;
    text-transform: uppercase; color: var(--m-muted); margin-bottom: 8px;
  }
  .msg-new-row { display: flex; gap: 8px; align-items: stretch; }
  .msg-new-input {
    flex: 1; background: rgba(9, 21, 64, 0.02); border: 1px solid var(--m-lite);
    border-radius: 12px;
    padding: 8px 12px; font-family: ${MONO};
    font-size: 11px; color: var(--m-fg); outline: none;
  }
  .dark .msg-new-input { background: rgba(9, 21, 64, 0.4); }
  .msg-new-input::placeholder { color: var(--m-muted); }
  .msg-new-btn {
    background: #1B2CC1;
    border: 1px solid rgba(171, 210, 250, 0.25);
    border-radius: 12px;
    padding: 6px 14px; font-size: 12px; font-weight: 600; color: #FFFFFF; cursor: pointer;
    transition: opacity 0.2s;
  }
  .msg-new-btn:hover { opacity: 0.88; }
  .msg-icon-btn {
    width: 32px; height: 32px; background: rgba(118, 146, 255, 0.08); border: 1px solid var(--m-lite);
    border-radius: 10px;
    display: flex; align-items: center; justify-content: center; cursor: pointer;
    flex-shrink: 0; transition: all 0.2s; color: var(--m-fg);
  }
  .dark .msg-icon-btn { background: rgba(118, 146, 255, 0.12); }
  .msg-icon-btn:hover { background: #1B2CC1; color: white; }

  /* Avatar */
  .msg-avatar {
    width: 38px; height: 38px; border-radius: 14px;
    background: rgba(118, 146, 255, 0.12); color: #1B2CC1; display: flex; align-items: center;
    justify-content: center; font-size: 18px; flex-shrink: 0;
    border: 1px solid rgba(171, 210, 250, 0.2);
  }
  .dark .msg-avatar { color: #ABD2FA; }
  .msg-avatar-sm {
    width: 30px; height: 30px; border-radius: 10px;
    background: rgba(118, 146, 255, 0.12); color: #1B2CC1; display: flex; align-items: center;
    justify-content: center; font-size: 14px; flex-shrink: 0;
    border: 1px solid rgba(171, 210, 250, 0.2);
  }
  .dark .msg-avatar-sm { color: #ABD2FA; }

  /* Empty states */
  .msg-empty {
    flex: 1; display: flex; flex-direction: column; align-items: center;
    justify-content: center; gap: 10px; text-align: center; padding: 40px;
  }
  .msg-empty-icon {
    width: 52px; height: 52px; border-radius: 20px; background: rgba(118, 146, 255, 0.12);
    color: #7692FF; display: flex; align-items: center; justify-content: center;
    border: 1px solid rgba(171, 210, 250, 0.25);
  }
  .msg-empty-title {
    font-size: 18px; font-weight: 700; color: var(--m-fg);
  }
  .msg-empty-sub {
    font-size: 13px; color: var(--m-muted);
  }

  /* Badge */
  .msg-badge {
    min-width: 18px; height: 18px; background: #1B2CC1; color: #FFFFFF;
    border-radius: 9px; display: flex; align-items: center; justify-content: center;
    font-size: 10px; font-family: ${MONO}; font-weight: 700; padding: 0 5px; flex-shrink: 0;
    border: 1px solid rgba(171, 210, 250, 0.3);
  }

  /* E2E tag */
  .msg-e2e-tag {
    display: flex; align-items: center; gap: 4px;
    padding: 3px 8px; border-radius: 8px; background: rgba(118, 146, 255, 0.12);
    color: #1B2CC1; flex-shrink: 0;
    border: 1px solid rgba(171, 210, 250, 0.2);
  }
  .dark .msg-e2e-tag {
    color: #ABD2FA;
  }
  .msg-e2e-label {
    font-family: ${MONO}; font-size: 10px;
    letter-spacing: 0.1em; font-weight: 700; text-transform: uppercase;
  }

  /* Contacts quick-pick */
  .msg-contacts-row {
    display: flex; gap: 6px; margin-top: 8px;
    overflow-x: auto; padding-bottom: 2px;
  }
  .msg-contacts-row::-webkit-scrollbar { height: 2px; }
  .msg-contact-chip {
    flex-shrink: 0; background: rgba(118, 146, 255, 0.08);
    border: 1px solid var(--m-lite); border-radius: 10px; padding: 4px 10px;
    font-size: 12px; font-weight: 600;
    color: var(--m-fg); cursor: pointer; display: flex; align-items: center; gap: 4px;
    transition: all 0.18s; white-space: nowrap;
  }
  .dark .msg-contact-chip { background: rgba(118, 146, 255, 0.1); }
  .msg-contact-chip:hover { border-color: #7692FF; color: #7692FF; }

  /* Spin */
  @keyframes spin { to { transform: rotate(360deg); } }
  .spin { animation: spin 1s linear infinite; }
`;

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
    <motion.div className="msg-typing-wrap"
      initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}>
      {name && <span style={{ fontFamily: SERIF, fontSize: 13, fontStyle: "italic", color: "var(--m-muted)" }}>{name}</span>}
      {[0, 1, 2].map(i => (
        <motion.div key={i} className="msg-typing-dot"
          animate={{ y: [0, -4, 0], opacity: [0.4, 1, 0.4] }}
          transition={{ repeat: Infinity, duration: 0.75, delay: i * 0.14 }} />
      ))}
    </motion.div>
  );
}

/* ── Message bubble ──────────────────────────────────────────── */
function Bubble({ m, isMine, showDate }: { m: any; isMine: boolean; showDate: boolean }) {
  return (
    <div style={{ display: "flex", flexDirection: "column" }}>
      {showDate && (
        <div className="msg-date-div">
          <span>{new Date(m.timestamp).toLocaleDateString("en-GB", { weekday: "long", day: "numeric", month: "long" })}</span>
        </div>
      )}
      <motion.div
        layout
        initial={isMine ? { opacity: 0, x: 20 } : { opacity: 0, x: -20 }}
        animate={{ opacity: 1, x: 0 }}
        transition={{ type: "spring", stiffness: 340, damping: 22 }}
        style={{ display: "flex", justifyContent: isMine ? "flex-end" : "flex-start", marginBottom: 4 }}>
        <div className={isMine ? "msg-bubble-mine" : "msg-bubble-theirs"}>
          <p style={{ wordBreak: "break-word", margin: 0 }}>{m.decrypted}</p>
          <div className={`msg-meta ${isMine ? "msg-meta-mine" : "msg-meta-theirs"}`}>
            <span>{new Date(m.timestamp).toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit" })}</span>
            {isMine && (m.read
              ? <CheckCheck size={11} strokeWidth={1.5} style={{ color: "rgba(255,255,255,0.55)" }} />
              : <Check size={11} strokeWidth={1.5} style={{ color: "rgba(255,255,255,0.35)" }} />
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
    <div className="msg-root" style={{ paddingBottom: kbOffset || undefined }}>
      <style>{PAGE_CSS}</style>

      <div className="msg-wrap">

        {/* ── SIDEBAR ────────────────────────────────────── */}
        <div className={`msg-sidebar ${activeAddr ? "has-active" : ""}`}>
          {/* Header */}
          <div className="msg-sidebar-head">
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                <p className="msg-sidebar-title">Messages</p>
                <div className="msg-e2e-tag">
                  <Lock size={10} strokeWidth={1.5} style={{ color: "var(--m-muted)" }} />
                  <span className="msg-e2e-label">E2E</span>
                </div>
              </div>
              <button className="msg-icon-btn" onClick={() => setShowNew(true)}>
                <Plus size={14} strokeWidth={1.5} style={{ color: "var(--m-bg)" }} />
              </button>
            </div>
            <div className="msg-search-wrap">
              <Search size={13} className="msg-search-ico" />
              <input value={searchQ} onChange={e => setSearchQ(e.target.value)}
                placeholder="Search conversations…" className="msg-search" />
            </div>
          </div>

          {/* New conversation panel */}
          <AnimatePresence>
            {showNew && (
              <motion.div className="msg-new-panel"
                initial={{ height: 0, opacity: 0 }} animate={{ height: "auto", opacity: 1 }}
                exit={{ height: 0, opacity: 0 }}>
                <div className="msg-new-inner">
                  <p className="msg-new-label">New Conversation</p>
                  <div className="msg-new-row">
                    <input value={newRecipient} onChange={e => setNewRecipient(e.target.value)}
                      onKeyDown={e => e.key === "Enter" && startConversation()}
                      placeholder="0x…" autoFocus className="msg-new-input" />
                    <button onClick={startConversation} className="msg-new-btn">Start</button>
                    <button onClick={() => setShowNew(false)} style={{ background: "none", border: "1px solid var(--m-lite)", padding: "0 8px", cursor: "pointer", display: "flex", alignItems: "center" }}>
                      <X size={13} strokeWidth={1.5} style={{ color: "var(--m-muted)" }} />
                    </button>
                  </div>
                  {contacts.length > 0 && (
                    <div className="msg-contacts-row">
                      {contacts.slice(0, 6).map(c => (
                        <button key={c.id} onClick={() => setNewRecipient(c.address)} className="msg-contact-chip">
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
          <div className="msg-conv-list">
            {loading ? (
              <div style={{ display: "flex", justifyContent: "center", padding: 40 }}>
                <Loader2 size={18} className="spin" style={{ color: "var(--m-muted)" }} />
              </div>
            ) : filteredConvs.length === 0 ? (
              <div style={{ padding: "36px 18px", textAlign: "center" }}>
                <p className="msg-empty-sub">No conversations yet.</p>
                <button onClick={() => setShowNew(true)}
                  style={{ background: "none", border: "none", fontFamily: SERIF, fontSize: 13, letterSpacing: "0.12em", textTransform: "uppercase", color: "var(--m-muted)", cursor: "pointer", marginTop: 10 }}>
                  Start one →
                </button>
              </div>
            ) : filteredConvs.map(conv => {
              const contact = getByAddress(conv.address);
              return (
                <button key={conv.address}
                  className={`msg-conv-row ${activeAddr === conv.address ? "active" : ""}`}
                  onClick={() => {
                    setActiveAddr(conv.address);
                    setConversations(p => p.map(c => c.address === conv.address ? { ...c, unread: 0 } : c));
                  }}>
                  <div className="msg-avatar">
                    {contact?.emoji || <UserCircle2 size={16} style={{ color: "var(--m-muted)" }} />}
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 2 }}>
                      <span className="msg-conv-name">
                        {contact?.name || shortAddr(conv.address)}
                      </span>
                      {conv.lastTime && (
                        <span className="msg-conv-time">{fmtTime(conv.lastTime)}</span>
                      )}
                    </div>
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                      <span className="msg-conv-preview">
                        {conv.lastMessage || "Begin conversation…"}
                      </span>
                      <AnimatePresence>
                        {conv.unread > 0 && (
                          <motion.span className="msg-badge"
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
        <div className={`msg-chat ${activeAddr ? "mob-chat-active" : ""}`}>
          {!activeAddr ? (
            <div className="msg-empty">
              <div className="msg-empty-icon">
                <Lock size={20} strokeWidth={1} style={{ color: "var(--m-muted)" }} />
              </div>
              <p className="msg-empty-title">Select a conversation.</p>
              <p className="msg-empty-sub">All messages encrypted end-to-end with ECDH.</p>
            </div>
          ) : (
            <>
              {/* Chat header */}
              <div className="msg-chat-head">
                {/* Back button (mobile only) */}
                <button onClick={() => setActiveAddr(null)}
                  style={{ background: "none", border: "none", cursor: "pointer",
                    display: "none", alignItems: "center" }}
                  className="mob-back-btn">
                  <ChevronLeft size={16} strokeWidth={1.5} style={{ color: "var(--m-muted)" }} />
                </button>
                <style>{`@media(max-width:768px){.mob-back-btn{display:flex!important;}}`}</style>
                <div className="msg-avatar-sm">
                  {getByAddress(activeAddr)?.emoji || <UserCircle2 size={14} style={{ color: "var(--m-muted)" }} />}
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <p className="msg-chat-name">
                    {getByAddress(activeAddr)?.name || shortAddr(activeAddr)}
                  </p>
                  <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                    <p className="msg-chat-addr">{activeAddr}</p>
                    <AnimatePresence>
                      {peerTyping && (
                        <motion.span initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                          style={{ fontFamily: SERIF, fontSize: 13, fontStyle: "italic", color: "var(--m-muted)", flexShrink: 0 }}>
                          typing…
                        </motion.span>
                      )}
                    </AnimatePresence>
                  </div>
                </div>
                <div className="msg-e2e-tag">
                  <Lock size={10} strokeWidth={1.5} style={{ color: "var(--m-muted)" }} />
                  <span className="msg-e2e-label">ECDH</span>
                </div>
              </div>

              {/* Messages */}
              <div ref={messagesRef} className="msg-scroll">
                {activeMessages.length === 0 && (
                  <div style={{ textAlign: "center", padding: "40px 20px" }}>
                    <p className="msg-empty-sub">Begin a secure conversation.</p>
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
                <div style={{ height: 4 }} />
              </div>

              {/* Input */}
              <div className="msg-input-wrap">
                <div className="msg-input-row">
                  <textarea
                    value={input}
                    onChange={e => { setInput(e.target.value); notifyTyping(); }}
                    onKeyDown={e => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); handleSend(); } }}
                    placeholder="Compose message… (Enter to send)"
                    rows={1}
                    className="msg-textarea"
                  />
                  <button onClick={handleSend} disabled={sending || !input.trim()} className="msg-send-btn">
                    {sending
                      ? <Loader2 size={15} strokeWidth={1.5} className="spin" style={{ color: "var(--m-bg)" }} />
                      : <Send size={15} strokeWidth={1.5} style={{ color: "var(--m-bg)" }} />
                    }
                  </button>
                </div>
                <p className="msg-input-hint">
                  Zero-knowledge · Server cannot read message content
                </p>
              </div>
            </>
          )}
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