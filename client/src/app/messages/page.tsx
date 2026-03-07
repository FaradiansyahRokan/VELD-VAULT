"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { useRouter } from "next/navigation";
import { useStore } from "@/lib/store";
import { useContactsStore } from "../../lib/contact-store";
import { useActivityStore } from "../../lib/activity-store";
import { encryptMessage, decryptMessage, type MessagePayload } from "@/lib/message-crypto";
import { motion, AnimatePresence } from "framer-motion";
import { ethers } from "ethers";
import {
  MessageSquare, Send, Plus, Search, X, ChevronLeft,
  Lock, Loader2, UserCircle2, Check, CheckCheck,
} from "lucide-react";
import { toast } from "sonner";

// ══════════════════════════════════════════════════════════════════
// ✨ EFFECT ENGINE
// ══════════════════════════════════════════════════════════════════

type EffectType = "hearts" | "coins" | "laugh" | "confetti" | "stars" | "party" | "matrix" | "rain" | null;
type MascotMood = "idle" | "excited" | "catching" | "sleeping";

function detectEffect(text: string): EffectType {
  const t = text.toLowerCase();
  if (/love|sayang|cinta|luv|rindu|kangen|miss you|suka banget/.test(t)) return "hearts";
  if (/uang|cuan|profit|duit|sultan|kaya|transfer|bayar/.test(t)) return "coins";
  if (/haha|wkwk|lol|ngakak|hehe|xixi|lucu banget/.test(t)) return "laugh";
  if (/wow|gila|anjir|anjay|mantap|keren|gokil|epic/.test(t)) return "confetti";
  if (/good night|selamat malam|met malem|bobo|tidur dulu/.test(t)) return "stars";
  if (t.includes(":party:")) return "party";
  if (t.includes(":matrix:")) return "matrix";
  if (t.includes(":rain:")) return "rain";
  return null;
}

function detectAmbient(msgs: any[]): string {
  const recent = msgs.slice(-6).map((m) => m.decrypted || "").join(" ").toLowerCase();
  if (/love|sayang|cinta|rindu|kangen/.test(recent)) return "romantic";
  if (/haha|wkwk|lol|ngakak|lucu/.test(recent)) return "fun";
  if (/malam|night|tidur|bobo/.test(recent)) return "night";
  if (/gila|mantap|keren|epic|gokil/.test(recent)) return "hype";
  return "default";
}

const EFFECT_EMOJIS: Record<string, string[]> = {
  hearts:   ["❤️", "💕", "💖", "💗", "🩷", "💝", "🫶"],
  coins:    ["🪙", "💰", "💎", "✨", "💴", "🤑", "💸"],
  laugh:    ["😂", "🤣", "😆", "😹", "💀", "🤭", "😭"],
  confetti: ["🎉", "🎊", "✨", "⭐", "🌟", "💫", "🎈", "🎆"],
  stars:    ["⭐", "🌟", "💫", "✨", "🌙", "🌌", "🌠", "🌃"],
  party:    ["🎉", "🎊", "🎈", "✨", "🦄", "🔥", "💫", "🎁", "🥳", "🍾"],
};

interface Particle { id: string; x: number; delay: number; duration: number; size: number; rotate: number; drift: number; emoji: string; }

function buildParticles(type: EffectType, count: number): Particle[] {
  const emojis = EFFECT_EMOJIS[type as string] || ["✨"];
  return Array.from({ length: count }, (_, i) => ({
    id: `${Date.now()}-${i}`,
    x: Math.random() * 88 + 6,
    delay: Math.random() * 1.8,
    duration: 2.5 + Math.random() * 2,
    size: 18 + Math.random() * 22,
    rotate: Math.random() * 360,
    drift: (Math.random() - 0.5) * 80,
    emoji: emojis[Math.floor(Math.random() * emojis.length)],
  }));
}

function EffectOverlay({ effect, onDone }: { effect: EffectType; onDone: () => void }) {
  const [particles, setParticles] = useState<Particle[]>([]);
  useEffect(() => {
    if (!effect || effect === "matrix" || effect === "rain") return;
    const count = effect === "party" ? 35 : effect === "confetti" ? 22 : 16;
    setParticles(buildParticles(effect, count));
    const t = setTimeout(() => { setParticles([]); onDone(); }, 5500);
    return () => clearTimeout(t);
  }, [effect]); // eslint-disable-line
  if (!particles.length) return null;
  return (
    <div className="absolute inset-0 pointer-events-none overflow-hidden z-30 rounded-[2rem]">
      {particles.map((p) => (
        <motion.div key={p.id} className="absolute select-none"
          style={{ left: `${p.x}%`, top: "-40px", fontSize: p.size }}
          initial={{ y: 0, rotate: p.rotate, opacity: 1 }}
          animate={{ y: "110vh", x: [0, p.drift, -p.drift * 0.6, p.drift * 0.3], rotate: [p.rotate, p.rotate + 200, p.rotate + 360], opacity: [1, 1, 0.8, 0] }}
          transition={{ duration: p.duration, delay: p.delay, ease: "easeIn", times: [0, 0.55, 0.85, 1] }}>
          {p.emoji}
        </motion.div>
      ))}
    </div>
  );
}

function MatrixCanvas({ active }: { active: boolean }) {
  const ref = useRef<HTMLCanvasElement>(null);
  const raf = useRef<number>();
  useEffect(() => {
    if (!active || !ref.current) return;
    const canvas = ref.current;
    const ctx = canvas.getContext("2d")!;
    canvas.width = canvas.offsetWidth;
    canvas.height = canvas.offsetHeight;
    const cols = Math.floor(canvas.width / 14);
    const drops = Array(cols).fill(1);
    function draw() {
      ctx.fillStyle = "rgba(0,0,0,0.07)";
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      ctx.fillStyle = "#00ff41";
      ctx.font = "12px monospace";
      drops.forEach((y, i) => {
        const ch = String.fromCharCode(0x30a0 + Math.random() * 96);
        ctx.fillText(ch, i * 14, y * 14);
        if (y * 14 > canvas.height && Math.random() > 0.975) drops[i] = 0;
        drops[i]++;
      });
      raf.current = requestAnimationFrame(draw);
    }
    draw();
    const t = setTimeout(() => cancelAnimationFrame(raf.current!), 9000);
    return () => { cancelAnimationFrame(raf.current!); clearTimeout(t); };
  }, [active]);
  if (!active) return null;
  return <canvas ref={ref} className="absolute inset-0 w-full h-full opacity-65 z-20 pointer-events-none rounded-[2rem]" />;
}

function RainCanvas({ active }: { active: boolean }) {
  const ref = useRef<HTMLCanvasElement>(null);
  const raf = useRef<number>();
  useEffect(() => {
    if (!active || !ref.current) return;
    const canvas = ref.current;
    const ctx = canvas.getContext("2d")!;
    canvas.width = canvas.offsetWidth;
    canvas.height = canvas.offsetHeight;
    const drops = Array.from({ length: 90 }, () => ({
      x: Math.random() * canvas.width, y: Math.random() * canvas.height,
      speed: 5 + Math.random() * 7, len: 14 + Math.random() * 20, op: 0.2 + Math.random() * 0.45,
    }));
    function draw() {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      drops.forEach((d) => {
        ctx.strokeStyle = `rgba(147,197,253,${d.op})`; ctx.lineWidth = 1;
        ctx.beginPath(); ctx.moveTo(d.x, d.y); ctx.lineTo(d.x - 2, d.y + d.len); ctx.stroke();
        d.y += d.speed;
        if (d.y > canvas.height) { d.y = -d.len; d.x = Math.random() * canvas.width; }
      });
      raf.current = requestAnimationFrame(draw);
    }
    draw();
    const t = setTimeout(() => cancelAnimationFrame(raf.current!), 9000);
    return () => { cancelAnimationFrame(raf.current!); clearTimeout(t); };
  }, [active]);
  if (!active) return null;
  return <canvas ref={ref} className="absolute inset-0 w-full h-full z-20 pointer-events-none rounded-[2rem]" />;
}

interface TapSpark { id: string; x: number; y: number; vx: number; vy: number; emoji: string; }
function TapSparks({ sparks }: { sparks: TapSpark[] }) {
  return (
    <div className="absolute inset-0 pointer-events-none z-40 overflow-hidden">
      <AnimatePresence>
        {sparks.map((s) => (
          <motion.div key={s.id} className="absolute text-sm select-none" style={{ left: s.x, top: s.y }}
            initial={{ opacity: 1, scale: 1.3 }}
            animate={{ x: s.vx * 65, y: s.vy * 65, opacity: 0, scale: 0.2 }}
            exit={{ opacity: 0 }} transition={{ duration: 0.65, ease: "easeOut" }}>
            {s.emoji}
          </motion.div>
        ))}
      </AnimatePresence>
    </div>
  );
}

function AmbientRoom({ mood }: { mood: string }) {
  const styles: Record<string, string> = {
    romantic: "radial-gradient(ellipse 80% 60% at 50% 80%, rgba(251,113,133,0.13) 0%, transparent 70%)",
    fun:      "radial-gradient(ellipse at 20% 80%, rgba(251,191,36,0.1) 0%, transparent 55%), radial-gradient(ellipse at 80% 20%, rgba(167,139,250,0.1) 0%, transparent 55%)",
    night:    "radial-gradient(ellipse at 50% 0%, rgba(15,23,42,0.55) 0%, transparent 65%)",
    hype:     "radial-gradient(ellipse at 85% 15%, rgba(251,146,60,0.12) 0%, transparent 55%)",
    default:  "none",
  };
  return (
    <motion.div className="absolute inset-0 pointer-events-none z-0 rounded-[2rem]"
      animate={{ opacity: mood === "default" ? 0 : 1 }} transition={{ duration: 2.5 }}
      style={{ background: styles[mood] || "none" }} />
  );
}

function SendBurst({ trigger }: { trigger: number }) {
  const items = ["✨", "💫", "⚡", "🌟", "·", "·", "·", "·"];
  return (
    <AnimatePresence>
      {trigger > 0 && items.map((e, i) => {
        const angle = (i / items.length) * Math.PI * 2;
        const d = 32 + Math.random() * 18;
        return (
          <motion.span key={`${trigger}-${i}`} className="absolute text-xs pointer-events-none z-50 select-none"
            style={{ left: "50%", top: "50%" }}
            initial={{ x: 0, y: 0, opacity: 1, scale: 1.3 }}
            animate={{ x: Math.cos(angle) * d, y: Math.sin(angle) * d, opacity: 0, scale: 0 }}
            transition={{ duration: 0.48, ease: "easeOut" }}>
            {e}
          </motion.span>
        );
      })}
    </AnimatePresence>
  );
}

function TypingIndicator({ name }: { name?: string }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 10, scale: 0.88 }} animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, y: 6, scale: 0.92 }} transition={{ type: "spring", stiffness: 380, damping: 24 }}
      className="flex justify-start">
      <div className="flex items-center gap-2 px-4 py-2.5 rounded-2xl rounded-bl-md bg-muted/40 border border-border/40 max-w-[180px]">
        {name && <span className="text-[10px] text-muted-foreground truncate">{name}</span>}
        <div className="flex items-end gap-[3px] shrink-0">
          {[0, 1, 2].map((i) => (
            <motion.div key={i} className="w-[6px] h-[6px] rounded-full bg-muted-foreground/50"
              animate={{ y: [0, -5, 0], opacity: [0.4, 1, 0.4], scale: [1, 1.2, 1] }}
              transition={{ repeat: Infinity, duration: 0.75, delay: i * 0.14, ease: "easeInOut" }} />
          ))}
        </div>
      </div>
    </motion.div>
  );
}

function RoomCreature({ mood, msgCount }: { mood: MascotMood; msgCount: number }) {
  const [sleeping, setSleeping] = useState(false);
  const [frame, setFrame] = useState(0);
  const timer = useRef<NodeJS.Timeout>();
  useEffect(() => {
    setSleeping(false);
    clearTimeout(timer.current);
    timer.current = setTimeout(() => setSleeping(true), 25_000);
    return () => clearTimeout(timer.current);
  }, [msgCount]);
  useEffect(() => {
    const t = setInterval(() => setFrame((f) => (f + 1) % 2), 500);
    return () => clearInterval(t);
  }, []);
  const faces = sleeping
    ? ["(=ω=)zzz", "(=ω=)zzZ"]
    : mood === "excited" ? ["(=^▽^=)!", "(=^ω^=)↑"]
    : mood === "catching" ? ["(ﾐ=^∇^=ﾐ)", "(=^◉ᆺ◉^=)"]
    : ["(=^･ω･^=)", "(=^･ᆺ･^=)"];
  const anims = sleeping ? { rotate: [0, 2, 0, -2, 0] }
    : mood === "excited" ? { y: [0, -14, 0, -9, 0, -5, 0], rotate: [-4, 4, -3, 3, 0] }
    : mood === "catching" ? { y: [0, -7, 0], scale: [1, 1.12, 1] }
    : { y: [0, -4, 0] };
  return (
    <motion.div className="absolute bottom-[76px] right-4 z-30 select-none cursor-pointer"
      animate={anims}
      transition={{ repeat: Infinity, duration: sleeping ? 3.5 : mood === "excited" ? 0.55 : 2.2, ease: "easeInOut" }}
      onClick={() => { setSleeping(false); clearTimeout(timer.current); }}>
      <div className="relative">
        <motion.div whileHover={{ scale: 1.1 }} whileTap={{ scale: 0.88 }} transition={{ type: "spring", stiffness: 500, damping: 18 }}
          className="bg-card/85 backdrop-blur-md border border-border/40 rounded-2xl px-3 py-2 shadow-lg text-xs font-mono text-foreground/70 whitespace-nowrap">
          {faces[frame]}
        </motion.div>
        {sleeping && (
          <motion.span className="absolute -top-3 -right-1 text-sm"
            animate={{ opacity: [0, 1, 0], y: [0, -5, -10], scale: [0.6, 1, 0.8] }}
            transition={{ repeat: Infinity, duration: 1.8 }}>
            💤
          </motion.span>
        )}
        {mood === "catching" && (
          <motion.span className="absolute -top-4 left-1/2 -translate-x-1/2 text-base"
            animate={{ y: [0, -8, 0], scale: [0.8, 1.2, 0.8] }} transition={{ repeat: Infinity, duration: 0.5 }}>
            ❤️
          </motion.span>
        )}
      </div>
    </motion.div>
  );
}

function MessageBubble({ m, isMine, showDate, onTap }: {
  m: any; isMine: boolean; showDate: boolean; onTap?: (x: number, y: number) => void;
}) {
  return (
    <div>
      {showDate && (
        <motion.div initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }} className="flex items-center gap-3 my-4">
          <div className="flex-1 h-px bg-border/40" />
          <span className="text-[10px] text-muted-foreground font-medium">
            {new Date(m.timestamp).toLocaleDateString("id-ID", { weekday: "long", day: "numeric", month: "long" })}
          </span>
          <div className="flex-1 h-px bg-border/40" />
        </motion.div>
      )}
      <motion.div layout
        initial={isMine ? { opacity: 0, scale: 0.45, x: 70, y: 20 } : { opacity: 0, scale: 0.45, x: -70, y: 20 }}
        animate={{ opacity: 1, scale: 1, x: 0, y: 0 }}
        transition={{ type: "spring", stiffness: 360, damping: 20, mass: 0.75 }}
        className={`flex ${isMine ? "justify-end" : "justify-start"}`}>
        <motion.div
          whileHover={{ scale: 1.03, y: -2 }} whileTap={{ scale: 0.91 }}
          transition={{ type: "spring", stiffness: 520, damping: 18 }}
          onClick={(e) => {
            const rect = (e.currentTarget as HTMLElement).getBoundingClientRect();
            const area = (e.currentTarget as HTMLElement).closest(".chat-messages-area")?.getBoundingClientRect();
            if (area && onTap) onTap(rect.left - area.left + rect.width / 2, rect.top - area.top + rect.height / 2);
          }}
          className={`relative max-w-[72%] px-4 py-2.5 rounded-2xl text-sm leading-relaxed overflow-hidden cursor-pointer select-text
            ${isMine
              ? "bg-primary text-primary-foreground rounded-br-md shadow-lg shadow-primary/25"
              : "bg-muted/40 text-foreground border border-border/40 rounded-bl-md"
            }`}>
          {isMine && (
            <motion.div className="absolute inset-0 bg-white/10 -skew-x-12 pointer-events-none"
              initial={{ x: "-110%" }} animate={{ x: "220%" }} transition={{ duration: 1.2, delay: 0.25, ease: "easeOut" }} />
          )}
          <p className="relative z-10 break-words">{m.decrypted}</p>
          <div className={`flex items-center gap-1 mt-1 ${isMine ? "justify-end" : "justify-start"}`}>
            <span className={`text-[9px] ${isMine ? "text-primary-foreground/60" : "text-muted-foreground"}`}>
              {new Date(m.timestamp).toLocaleTimeString("id-ID", { hour: "2-digit", minute: "2-digit" })}
            </span>
            {isMine && (m.read ? <CheckCheck size={10} className="text-primary-foreground/60" /> : <Check size={10} className="text-primary-foreground/60" />)}
          </div>
        </motion.div>
      </motion.div>
    </div>
  );
}

// ══════════════════════════════════════════════════════════════════
// 📱 MAIN PAGE
// ══════════════════════════════════════════════════════════════════

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

  // ── Alive state ──
  const [effect, setEffect] = useState<EffectType>(null);
  const [matrixActive, setMatrixActive] = useState(false);
  const [rainActive, setRainActive] = useState(false);
  const [mascotMood, setMascotMood] = useState<MascotMood>("idle");
  const [msgCount, setMsgCount] = useState(0);
  const [ambientMood, setAmbientMood] = useState("default");
  const [tapSparks, setTapSparks] = useState<TapSpark[]>([]);
  const [sendTrigger, setSendTrigger] = useState(0);
  const [peerTyping, setPeerTyping] = useState(false);

  const effectCooldown = useRef(0);
  const messagesContainerRef = useRef<HTMLDivElement>(null);
  const pollRef = useRef<NodeJS.Timeout | null>(null);
  const lastPollRef = useRef<number>(0);
  const sentCacheRef = useRef<Map<string, string>>(new Map());
  const lastTypingNotif = useRef(0);

  useEffect(() => {
    setMounted(true);
    if (!contract || !wallet) { router.push("/"); return; }
  }, [contract, wallet, router]);

  const triggerEffect = useCallback((text: string) => {
    const now = Date.now();
    if (now - effectCooldown.current < 10_000) return;
    const fx = detectEffect(text);
    if (!fx) return;
    effectCooldown.current = now;
    if (fx === "matrix") { setMatrixActive(true); setTimeout(() => setMatrixActive(false), 9_000); return; }
    if (fx === "rain")   { setRainActive(true);  setTimeout(() => setRainActive(false), 9_000);  return; }
    if (fx === "hearts" || fx === "coins") { setMascotMood("catching"); setTimeout(() => setMascotMood("idle"), 3_000); }
    else { setMascotMood("excited"); setTimeout(() => setMascotMood("idle"), 2_500); }
    setEffect(fx);
  }, []);

  const handleBubbleTap = useCallback((x: number, y: number) => {
    const pool = ["✨", "💫", "⚡", "🌟", "💥", "🎈"];
    const newSparks: TapSpark[] = Array.from({ length: 7 }, (_, i) => ({
      id: `tap-${Date.now()}-${i}`, x, y,
      vx: (Math.random() - 0.5) * 2.2, vy: -(0.6 + Math.random() * 1.2),
      emoji: pool[Math.floor(Math.random() * pool.length)],
    }));
    setTapSparks((p) => [...p, ...newSparks]);
    setTimeout(() => setTapSparks((p) => p.filter((s) => !newSparks.find((n) => n.id === s.id))), 900);
  }, []);

  const scrollToBottom = useCallback(() => {
    const c = messagesContainerRef.current;
    if (!c) return;
    c.scrollTo({ top: c.scrollHeight, behavior: "smooth" });
  }, []);
  useEffect(() => { scrollToBottom(); }, [messages, activeAddr, scrollToBottom]);

  useEffect(() => {
    if (!activeAddr || !wallet?.address) return;
    const activeMsgs = messages.filter(m =>
      (m.from === wallet.address.toLowerCase() && m.to === activeAddr) ||
      (m.to === wallet.address.toLowerCase() && m.from === activeAddr)
    );
    setAmbientMood(detectAmbient(activeMsgs));
  }, [messages, activeAddr, wallet?.address]);

  useEffect(() => {
    if (!activeAddr || !wallet?.address) return;
    const t = setInterval(async () => {
      try {
        const r = await fetch(`/api/typing?address=${activeAddr}&peerAddress=${wallet.address}`);
        if (r.ok) { const d = await r.json(); setPeerTyping(d.typing === true); }
      } catch { /* optional API */ }
    }, 2_000);
    return () => clearInterval(t);
  }, [activeAddr, wallet?.address]);

  const notifyTyping = useCallback(() => {
    const now = Date.now();
    if (now - lastTypingNotif.current < 4_000 || !wallet?.address || !activeAddr) return;
    lastTypingNotif.current = now;
    fetch("/api/typing", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ from: wallet.address, to: activeAddr }) }).catch(() => {});
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
        if (m.from === wallet.address.toLowerCase())
          return { ...m, decrypted: sentCacheRef.current.get(m.encryptedContent) ?? m.encryptedContent };
        try { return { ...m, decrypted: await decryptMessage({ encryptedContent: m.encryptedContent, iv: m.iv, senderPublicKey: m.senderPublicKey }, w) }; }
        catch { return { ...m, decrypted: "[Pesan tidak bisa didekripsi]" }; }
      }));

      setMessages((prev) => {
        const arrivedEC = new Set(decrypted.filter(m => m.from === wallet.address.toLowerCase()).map(m => m.encryptedContent));
        const withoutOpt = prev.filter(m => {
          if (!String(m.id).startsWith("opt-")) return true;
          const ec = (m as any).encryptedContent;
          return ec ? !arrivedEC.has(ec) : true;
        });
        const ids = new Set(withoutOpt.map(m => m.id));
        const newMsgs = decrypted.filter(m => !ids.has(m.id));
        if (!newMsgs.length && withoutOpt.length === prev.length) return prev;
        return [...withoutOpt, ...newMsgs].sort((a, b) => a.timestamp - b.timestamp);
      });

      setConversations((prev) => {
        const map = new Map(prev.map(c => [c.address, c]));
        for (const m of decrypted) {
          const peer = m.from === wallet.address.toLowerCase() ? m.to : m.from;
          const ex = map.get(peer) || { address: peer, unread: 0 };
          map.set(peer, { ...ex, lastMessage: m.decrypted, lastTime: m.timestamp, unread: !passive && m.to === wallet.address.toLowerCase() && m.from !== activeAddr ? ex.unread + 1 : ex.unread });
        }
        return Array.from(map.values()).sort((a, b) => (b.lastTime || 0) - (a.lastTime || 0));
      });

      const incoming = decrypted.filter(m => m.to === wallet.address.toLowerCase());
      if (incoming.length) {
        setMsgCount(n => n + incoming.length);
        incoming.forEach(m => triggerEffect(m.decrypted || ""));
        if (!passive) incoming.forEach(m => addActivity({ type: "message_received", title: "Pesan diterima", description: `Dari ${shortAddr(m.from)}: ${(m.decrypted || "").slice(0, 40)}`, walletAddress: wallet.address, address: m.from }));
      }
    } catch (e) { console.error("[Messages]", e); }
  }, [wallet, signer, activeAddr, addActivity, triggerEffect]);

  useEffect(() => {
    if (!mounted || !wallet) return;
    setLoading(true);
    fetch(`/api/messages?address=${wallet.address}`).then(r => r.json()).then(async data => {
      if (!data.success) return;
      const w = signer as ethers.Wallet;
      const decrypted = await Promise.all((data.messages as any[]).map(async m => {
        if (m.from === wallet.address.toLowerCase()) return { ...m, decrypted: sentCacheRef.current.get(m.encryptedContent) ?? "📤 Pesan terkirim" };
        try { return { ...m, decrypted: await decryptMessage({ encryptedContent: m.encryptedContent, iv: m.iv, senderPublicKey: m.senderPublicKey }, w) }; }
        catch { return { ...m, decrypted: "[Tidak bisa didekripsi]" }; }
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
      if (!res.ok) { toast.error("Public key penerima tidak ditemukan."); setInput(text); return; }
      const { publicKey: recipPubKey } = await res.json();
      const encrypted = await encryptMessage(text, w, recipPubKey);
      const optId = `opt-${Date.now()}`;
      sentCacheRef.current.set(encrypted.encryptedContent, text);
      const optimistic = { id: optId, from: wallet.address.toLowerCase(), to: activeAddr.toLowerCase(), encryptedContent: encrypted.encryptedContent, iv: encrypted.iv, senderPublicKey: encrypted.senderPublicKey, timestamp: Date.now(), read: false, decrypted: text };
      setMessages(p => [...p, optimistic]);
      setConversations(p => {
        const map = new Map(p.map(c => [c.address, c]));
        const ex = map.get(activeAddr) || { address: activeAddr, unread: 0 };
        map.set(activeAddr, { ...ex, lastMessage: text, lastTime: Date.now() });
        return Array.from(map.values()).sort((a, b) => (b.lastTime || 0) - (a.lastTime || 0));
      });
      setSendTrigger(t => t + 1);
      triggerEffect(text);
      setMsgCount(n => n + 1);
      await fetch("/api/messages", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ from: wallet.address.toLowerCase(), to: activeAddr.toLowerCase(), ...encrypted }) });
      addActivity({ type: "message_sent", title: "Pesan dikirim", description: `Ke ${shortAddr(activeAddr)}: ${text.slice(0, 40)}`, walletAddress: wallet.address, address: activeAddr });
    } catch (e: any) { toast.error(e.message || "Gagal mengirim"); setInput(text); }
    finally { setSending(false); }
  };

  const startConversation = () => {
    const addr = newRecipient.trim();
    if (!ethers.isAddress(addr)) { toast.error("Address tidak valid"); return; }
    if (addr.toLowerCase() === wallet?.address.toLowerCase()) { toast.error("Tidak bisa chat dengan dirimu sendiri"); return; }
    setActiveAddr(addr.toLowerCase());
    if (!conversations.find(c => c.address === addr.toLowerCase())) setConversations(p => [{ address: addr.toLowerCase(), unread: 0 }, ...p]);
    setNewRecipient(""); setShowNew(false);
  };

  const activeMessages = messages.filter(m =>
    (m.from === wallet?.address.toLowerCase() && m.to === activeAddr) ||
    (m.to === wallet?.address.toLowerCase() && m.from === activeAddr)
  );
  const filteredConvs = searchQ
    ? conversations.filter(c => { const co = getByAddress(c.address); return c.address.includes(searchQ.toLowerCase()) || co?.name.toLowerCase().includes(searchQ.toLowerCase()); })
    : conversations;

  if (!mounted) return null;

  return (
    <div className="h-screen overflow-hidden pt-24 px-4 pb-4 max-w-[1400px] mx-auto flex flex-col">
      <div className="flex-1 flex gap-4 min-h-0 overflow-hidden">

        {/* ── Sidebar ── */}
        <motion.div initial={{ x: -20, opacity: 0 }} animate={{ x: 0, opacity: 1 }}
          className={`w-full md:w-[300px] shrink-0 flex flex-col bg-card border border-border/50 rounded-[2rem] overflow-hidden min-h-0 ${activeAddr ? "hidden md:flex" : "flex"}`}>
          <div className="p-5 border-b border-border/50 shrink-0">
            <div className="flex items-center justify-between mb-4">
              <h2 className="font-bold text-foreground flex items-center gap-2">
                <MessageSquare size={16} className="text-muted-foreground" />Pesan
                <div className="flex items-center gap-1 px-1.5 py-0.5 rounded-full bg-muted/30 border border-border/40">
                  <Lock size={8} className="text-emerald-400" />
                  <span className="text-[9px] text-emerald-600 dark:text-emerald-400 font-bold">E2E</span>
                </div>
              </h2>
              <motion.button whileHover={{ scale: 1.12, rotate: 90 }} whileTap={{ scale: 0.82 }} transition={{ type: "spring", stiffness: 520, damping: 20 }}
                onClick={() => setShowNew(true)} className="w-8 h-8 rounded-full bg-primary flex items-center justify-center text-primary-foreground shadow-lg shadow-primary/20">
                <Plus size={15} />
              </motion.button>
            </div>
            <div className="relative">
              <Search size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
              <input value={searchQ} onChange={e => setSearchQ(e.target.value)} placeholder="Cari kontak atau address..."
                className="w-full h-9 pl-8 pr-3 rounded-xl bg-muted/30 border border-border/40 text-sm text-foreground placeholder:text-muted-foreground/50 outline-none focus:ring-1 focus:ring-primary/30 transition-all" />
            </div>
          </div>

          <AnimatePresence>
            {showNew && (
              <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: "auto", opacity: 1 }} exit={{ height: 0, opacity: 0 }} className="overflow-hidden border-b border-border/50 shrink-0">
                <div className="p-4">
                  <p className="text-xs font-bold text-muted-foreground mb-2">Percakapan Baru</p>
                  <div className="flex gap-2">
                    <input value={newRecipient} onChange={e => setNewRecipient(e.target.value)} onKeyDown={e => e.key === "Enter" && startConversation()} placeholder="0x... atau pilih kontak" autoFocus
                      className="flex-1 h-9 px-3 rounded-xl bg-muted/30 border border-border/40 text-sm text-foreground placeholder:text-muted-foreground/40 outline-none focus:ring-1 focus:ring-primary/30" />
                    <button onClick={startConversation} className="h-9 px-3 rounded-xl bg-primary text-primary-foreground text-sm font-bold hover:opacity-90">Mulai</button>
                    <button onClick={() => setShowNew(false)} className="h-9 w-9 rounded-xl bg-muted/30 flex items-center justify-center text-muted-foreground hover:text-foreground"><X size={14} /></button>
                  </div>
                  {contacts.length > 0 && (
                    <div className="mt-2 flex gap-2 overflow-x-auto pb-1">
                      {contacts.slice(0, 6).map(c => (
                        <button key={c.id} onClick={() => setNewRecipient(c.address)} className="shrink-0 flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-muted/30 border border-border/40 text-[11px] hover:bg-muted/60 transition-colors">
                          <span>{c.emoji}</span><span className="text-foreground font-medium">{c.name}</span>
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          <div className="flex-1 overflow-y-auto min-h-0">
            {loading ? <div className="flex items-center justify-center h-32"><Loader2 size={18} className="animate-spin text-muted-foreground" /></div>
              : filteredConvs.length === 0 ? (
                <div className="flex flex-col items-center justify-center h-40 gap-3 text-center px-6">
                  <MessageSquare size={28} className="text-muted-foreground/30" />
                  <p className="text-sm text-muted-foreground">Belum ada percakapan</p>
                  <button onClick={() => setShowNew(true)} className="text-xs text-primary font-semibold hover:underline">Mulai percakapan baru →</button>
                </div>
              ) : filteredConvs.map((conv, idx) => {
                const contact = getByAddress(conv.address);
                return (
                  <motion.button key={conv.address} initial={{ opacity: 0, x: -14 }} animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: idx * 0.045, type: "spring", stiffness: 380, damping: 26 }}
                    whileHover={{ x: 5 }} whileTap={{ scale: 0.97 }}
                    onClick={() => { setActiveAddr(conv.address); setConversations(p => p.map(c => c.address === conv.address ? { ...c, unread: 0 } : c)); }}
                    className={`w-full flex items-center gap-3 p-4 text-left hover:bg-muted/20 transition-colors ${activeAddr === conv.address ? "bg-muted/20" : ""}`}>
                    <div className="w-10 h-10 rounded-full bg-muted/40 border border-border/40 flex items-center justify-center text-lg shrink-0">
                      {contact?.emoji || <UserCircle2 size={20} className="text-muted-foreground" />}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between">
                        <p className="text-sm font-semibold text-foreground truncate">{contact?.name || shortAddr(conv.address)}</p>
                        {conv.lastTime && <span className="text-[10px] text-muted-foreground/60 shrink-0 ml-1">{formatTime(conv.lastTime)}</span>}
                      </div>
                      <div className="flex items-center justify-between">
                        <p className="text-[11px] text-muted-foreground truncate flex-1">{conv.lastMessage || "Mulai percakapan..."}</p>
                        <AnimatePresence>
                          {conv.unread > 0 && (
                            <motion.span initial={{ scale: 0 }} animate={{ scale: 1 }} exit={{ scale: 0 }} transition={{ type: "spring", stiffness: 600, damping: 20 }}
                              className="ml-1 w-4 h-4 rounded-full bg-primary flex items-center justify-center text-[9px] font-bold text-primary-foreground shrink-0">
                              {conv.unread}
                            </motion.span>
                          )}
                        </AnimatePresence>
                      </div>
                    </div>
                  </motion.button>
                );
              })}
          </div>
        </motion.div>

        {/* ── Chat Area ── */}
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}
          className={`flex-1 flex flex-col bg-card border border-border/50 rounded-[2rem] overflow-hidden min-h-0 relative ${!activeAddr ? "hidden md:flex" : "flex"}`}>
          <AmbientRoom mood={ambientMood} />
          <MatrixCanvas active={matrixActive} />
          <RainCanvas active={rainActive} />
          <EffectOverlay effect={effect} onDone={() => setEffect(null)} />

          {!activeAddr ? (
            <div className="flex-1 flex flex-col items-center justify-center gap-4 text-center px-8 relative z-10">
              <motion.div animate={{ rotate: [0, -6, 6, -4, 0], scale: [1, 1.06, 1] }} transition={{ repeat: Infinity, repeatDelay: 3.5, duration: 0.65 }}
                className="w-16 h-16 rounded-[1.5rem] bg-muted/20 flex items-center justify-center">
                <MessageSquare size={28} className="text-muted-foreground/50" />
              </motion.div>
              <div>
                <p className="font-bold text-foreground mb-1">Pilih percakapan</p>
                <p className="text-sm text-muted-foreground">Semua pesan terenkripsi end-to-end dengan ECDH</p>
              </div>
              <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-emerald-500/10 border border-emerald-500/20">
                <Lock size={10} className="text-emerald-400" />
                <span className="text-[10px] font-bold text-emerald-600 dark:text-emerald-400">Zero-Knowledge · Server tidak bisa baca isi pesan</span>
              </div>
            </div>
          ) : (
            <>
              {/* Header */}
              <div className="flex items-center gap-3 p-5 border-b border-border/50 shrink-0 relative z-10">
                <motion.button whileHover={{ scale: 1.1 }} whileTap={{ scale: 0.88 }} onClick={() => setActiveAddr(null)}
                  className="md:hidden w-8 h-8 rounded-full bg-muted/30 flex items-center justify-center text-muted-foreground">
                  <ChevronLeft size={16} />
                </motion.button>
                <div className="w-9 h-9 rounded-full bg-muted/40 border border-border/40 flex items-center justify-center text-base">
                  {getByAddress(activeAddr)?.emoji || <UserCircle2 size={18} className="text-muted-foreground" />}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-bold text-foreground text-sm truncate">{getByAddress(activeAddr)?.name || shortAddr(activeAddr)}</p>
                  <div className="flex items-center gap-2">
                    <p className="text-[10px] text-muted-foreground font-mono truncate">{activeAddr}</p>
                    <AnimatePresence>
                      {peerTyping && (
                        <motion.span initial={{ opacity: 0, x: -4 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0 }}
                          className="text-[9px] text-primary/70 font-medium italic shrink-0">
                          mengetik...
                        </motion.span>
                      )}
                    </AnimatePresence>
                  </div>
                </div>
                <div className="flex items-center gap-1 px-2 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/20 shrink-0">
                  <Lock size={9} className="text-emerald-400" />
                  <span className="text-[9px] text-emerald-400 font-bold">ECDH</span>
                </div>
              </div>

              {/* ── Messages: THE only scroll container ── */}
              <div ref={messagesContainerRef} className="chat-messages-area flex-1 overflow-y-auto min-h-0 p-5 space-y-3 relative z-10">
                <TapSparks sparks={tapSparks} />

                {activeMessages.length === 0 && (
                  <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} className="text-center py-12">
                    <p className="text-sm text-muted-foreground">Mulai percakapan yang aman 🔐</p>
                    <p className="text-[11px] text-muted-foreground/40 mt-2">
                      ✨ Coba ketik: "sayang" · "wkwk" · "gila" · ":party:" · ":rain:" · ":matrix:"
                    </p>
                  </motion.div>
                )}

                {activeMessages.map((m, i) => {
                  const isMine = m.from === wallet?.address.toLowerCase();
                  const showDate = i === 0 || new Date(m.timestamp).toDateString() !== new Date(activeMessages[i - 1].timestamp).toDateString();
                  return <MessageBubble key={m.id} m={m} isMine={isMine} showDate={showDate} onTap={handleBubbleTap} />;
                })}

                <AnimatePresence>
                  {peerTyping && <TypingIndicator name={getByAddress(activeAddr)?.name} />}
                </AnimatePresence>

                <div className="h-2" aria-hidden />
              </div>

              {/* Mascot */}
              <RoomCreature mood={mascotMood} msgCount={msgCount} />

              {/* Input */}
              <div className="p-4 border-t border-border/50 shrink-0 relative z-10">
                <div className="flex items-end gap-3">
                  <textarea value={input}
                    onChange={e => { setInput(e.target.value); notifyTyping(); }}
                    onKeyDown={e => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); handleSend(); } }}
                    placeholder="Ketik pesan... (Enter kirim)"
                    rows={1}
                    className="flex-1 bg-muted/30 border border-border/40 focus:border-primary/30 rounded-2xl px-4 py-3 text-sm text-foreground placeholder:text-muted-foreground/50 resize-none outline-none focus:ring-1 focus:ring-primary/20 transition-all max-h-32"
                    style={{ minHeight: "48px" }} />
                  <div className="relative shrink-0">
                    <SendBurst trigger={sendTrigger} />
                    <motion.button onClick={handleSend} disabled={sending || !input.trim()}
                      whileHover={!sending && input.trim() ? { scale: 1.18, rotate: -12 } : {}}
                      whileTap={!sending && input.trim() ? { scale: 0.78, rotate: 18 } : {}}
                      transition={{ type: "spring", stiffness: 580, damping: 14 }}
                      className="h-12 w-12 rounded-2xl bg-primary flex items-center justify-center text-primary-foreground disabled:opacity-40 shadow-lg shadow-primary/20">
                      {sending ? <Loader2 size={16} className="animate-spin" /> : <Send size={16} />}
                    </motion.button>
                  </div>
                </div>
                <p className="text-[9px] text-muted-foreground/35 mt-1.5 ml-1">
                  ✨ sayang · wkwk · wow · uang · good night · :party: · :rain: · :matrix:
                </p>
              </div>
            </>
          )}
        </motion.div>
      </div>
    </div>
  );
}

function shortAddr(addr: string) { return `${addr.slice(0, 6)}...${addr.slice(-4)}`; }
function formatTime(ts: number) {
  const d = Date.now() - ts;
  if (d < 3_600_000) return `${Math.floor(d / 60_000) || 1}m`;
  if (d < 86_400_000) return `${Math.floor(d / 3_600_000)}j`;
  return new Date(ts).toLocaleDateString("id-ID", { day: "numeric", month: "short" });
}