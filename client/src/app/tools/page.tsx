"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useStore } from "@/lib/store";
import { useActivityStore, ACTIVITY_META, type ActivityType } from "@/lib/activity-store";
import { motion, AnimatePresence } from "framer-motion";
import { Trash2, ExternalLink, ChevronRight } from "lucide-react";
import ContactsBook from "@/components/ContactsBook";
import DocumentSigner from "@/components/DocumentSigner";
import QRModal from "@/components/QRModal";
import { NETWORK_CONFIG } from "@/lib/constants";

const SERIF = "'EB Garamond', 'Cormorant Garamond', Georgia, serif";
const MONO = "'JetBrains Mono', 'Courier New', monospace";
const ease: [number, number, number, number] = [0.16, 1, 0.3, 1];

type Tab = "activity" | "contacts" | "signer" | "qr";

const TABS: { id: Tab; label: string; roman: string; desc: string }[] = [
  { id: "activity", label: "Activity Log", roman: "I", desc: "Transaction & action history" },
  { id: "contacts", label: "Address Book", roman: "II", desc: "Wallet contacts" },
  { id: "signer", label: "Document Signer", roman: "III", desc: "Sign & verify documents" },
  { id: "qr", label: "Receive Payment", roman: "IV", desc: "QR code for your wallet" },
];

const FILTER_OPTIONS: { value: ActivityType | "all"; label: string }[] = [
  { value: "all", label: "All" },
  { value: "upload", label: "Upload" },
  { value: "buy", label: "Buy" },
  { value: "sell", label: "Sell" },
  { value: "message_sent", label: "Message" },
  { value: "sign", label: "Sign" },
  { value: "faucet", label: "Faucet" },
];

export default function ToolsPage() {
  const router = useRouter();
  const { contract, wallet } = useStore();
  const { getActivities, clearActivities } = useActivityStore();
  const [tab, setTab] = useState<Tab>("activity");
  const [filter, setFilter] = useState<ActivityType | "all">("all");
  const [showQR, setShowQR] = useState(false);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    if (!contract || !wallet) { router.push("/"); }
  }, [contract, wallet, router]);

  if (!mounted || !wallet) return null;

  const allActivities = getActivities(wallet.address);
  const filtered = filter === "all" ? allActivities : allActivities.filter((a) => a.type === filter);

  return (
    <div className="min-h-screen" style={{ background: "var(--cv-bg)", color: "var(--cv-fg)" }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=EB+Garamond:ital,wght@0,400;0,500;1,400;1,500&display=swap');
        :root{--cv-bg:#FAFAF8;--cv-fg:#0A0A0A;--cv-muted:#6B6B6B;--cv-border:#D8D4CC;--cv-border-light:#EDEAE4;--cv-card:#FFFFFF;--cv-surface:#F4F2EE;--cv-ink-light:#3A3A3A;}
        .dark{--cv-bg:#0A0A08;--cv-fg:#F0EDE6;--cv-muted:#8A857C;--cv-border:#2A2820;--cv-border-light:#1E1C18;--cv-card:#111109;--cv-surface:#161410;--cv-ink-light:#C5BFB5;}
        .cv-nav-item{width:100%;background:transparent;border:none;border-bottom:1px solid var(--cv-border-light);padding:16px 20px;display:flex;align-items:center;gap:16px;text-align:left;cursor:pointer;transition:all 0.3s;position:relative;overflow:hidden;font-family:${SERIF};}
        .cv-nav-item::before{content:'';position:absolute;inset:0;background:var(--cv-fg);transform:scaleX(0);transform-origin:left;transition:transform 0.45s cubic-bezier(0.16,1,0.3,1);z-index:0;}
        .cv-nav-item.active::before,.cv-nav-item:hover::before{transform:scaleX(1);}
        .cv-nav-item .nav-content{position:relative;z-index:1;transition:color 0.3s;}
        .cv-nav-item.active .nav-content, .cv-nav-item:hover .nav-content, .cv-nav-item.active .nav-content *, .cv-nav-item:hover .nav-content *{color:var(--cv-bg)!important;}
        .cv-filter-btn{background:transparent;border:1px solid var(--cv-border-light);padding:6px 14px;font-family:${SERIF};font-size:9px;letter-spacing:0.18em;text-transform:uppercase;color:var(--cv-muted);cursor:pointer;transition:all 0.25s;}
        .cv-filter-btn.active,.cv-filter-btn:hover{background:var(--cv-fg);color:var(--cv-bg);border-color:var(--cv-fg);}
      `}</style>

      <div style={{ maxWidth: "1200px", margin: "0 auto", padding: "120px 48px 80px" }}>

        {/* ── Header ── */}
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.8, ease }}
          style={{ paddingBottom: "40px", borderBottom: "1px solid var(--cv-border-light)", marginBottom: "48px" }}>
          <p style={{ fontSize: "9px", letterSpacing: "0.28em", textTransform: "uppercase", color: "var(--cv-muted)", fontFamily: SERIF, fontStyle: "italic", marginBottom: "16px" }}>
            CipherVault · Utilities
          </p>
          <div style={{ display: "flex", alignItems: "center", gap: "16px", marginBottom: "16px" }}>
            <div style={{ flex: 1, height: "1px", background: "var(--cv-border-light)" }} />
            <div style={{ width: "5px", height: "5px", border: "1px solid var(--cv-border)", transform: "rotate(45deg)", flexShrink: 0 }} />
            <div style={{ flex: 1, height: "1px", background: "var(--cv-border-light)" }} />
          </div>
          <h1 style={{ fontFamily: SERIF, fontSize: "clamp(42px, 6vw, 64px)", fontWeight: 400, letterSpacing: "-0.025em", lineHeight: 0.95, margin: 0 }}>
            Tools<br /><em style={{ color: "var(--cv-muted)" }}>& Utilities.</em>
          </h1>
        </motion.div>

        <div style={{ display: "flex", gap: "2px", alignItems: "flex-start" }}>

          {/* ── Sidebar ── */}
          <motion.div initial={{ opacity: 0, x: -12 }} animate={{ opacity: 1, x: 0 }} transition={{ duration: 0.7, ease }}
            style={{ width: "260px", flexShrink: 0 }}>
            <div style={{ border: "1px solid var(--cv-border-light)" }}>
              {TABS.map((t) => (
                <button key={t.id} className={`cv-nav-item ${tab === t.id ? "active" : ""}`}
                  onClick={() => t.id === "qr" ? setShowQR(true) : setTab(t.id)}>
                  <span className="nav-content" style={{ fontSize: "9px", letterSpacing: "0.12em", fontStyle: "italic", color: "var(--cv-border)", width: "20px", flexShrink: 0 }}>{t.roman}</span>
                  <div className="nav-content" style={{ flex: 1, minWidth: 0 }}>
                    <p style={{ fontFamily: SERIF, fontSize: "14px", color: "var(--cv-fg)", marginBottom: "2px" }}>{t.label}</p>
                    <p style={{ fontFamily: SERIF, fontSize: "10px", fontStyle: "italic", color: "var(--cv-muted)" }}>{t.desc}</p>
                  </div>
                  <ChevronRight size={11} strokeWidth={1.5} className="nav-content" style={{ color: "var(--cv-muted)", flexShrink: 0 }} />
                </button>
              ))}
            </div>

            {/* Wallet info */}
            <div style={{ border: "1px solid var(--cv-border-light)", borderTop: "none", padding: "16px 20px", background: "var(--cv-surface)" }}>
              <p style={{ fontSize: "8px", letterSpacing: "0.22em", textTransform: "uppercase", color: "var(--cv-muted)", fontFamily: SERIF, marginBottom: "8px" }}>Active Wallet</p>
              <p style={{ fontFamily: MONO, fontSize: "9px", color: "var(--cv-ink-light)", wordBreak: "break-all", lineHeight: 1.7 }}>{wallet.address}</p>
              <p style={{ fontFamily: SERIF, fontSize: "9px", fontStyle: "italic", color: "var(--cv-muted)", marginTop: "8px" }}>
                {NETWORK_CONFIG.name} · Chain {NETWORK_CONFIG.chainId}
              </p>
            </div>
          </motion.div>

          {/* ── Main content ── */}
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.7, ease }}
            style={{ flex: 1, border: "1px solid var(--cv-border-light)", background: "var(--cv-card)", minHeight: "500px" }}>

            <AnimatePresence mode="wait">

              {/* ACTIVITY */}
              {tab === "activity" && (
                <motion.div key="activity" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
                  {/* Header */}
                  <div style={{ padding: "20px 28px", borderBottom: "1px solid var(--cv-border-light)", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                    <div>
                      <p style={{ fontFamily: SERIF, fontSize: "16px", color: "var(--cv-fg)", marginBottom: "2px" }}>Activity Log</p>
                      <p style={{ fontFamily: SERIF, fontSize: "10px", fontStyle: "italic", color: "var(--cv-muted)" }}>{allActivities.length} records</p>
                    </div>
                    {allActivities.length > 0 && (
                      <button onClick={() => { if (confirm("Clear all activity records?")) clearActivities(wallet.address); }}
                        style={{ background: "none", border: "none", cursor: "pointer", display: "flex", alignItems: "center", gap: "6px", fontFamily: SERIF, fontSize: "9px", letterSpacing: "0.16em", textTransform: "uppercase", color: "var(--cv-muted)", transition: "color 0.2s" }}
                        onMouseEnter={(e) => (e.currentTarget.style.color = "#dc2626")}
                        onMouseLeave={(e) => (e.currentTarget.style.color = "var(--cv-muted)")}>
                        <Trash2 size={11} strokeWidth={1.5} /> Clear All
                      </button>
                    )}
                  </div>

                  {/* Filters */}
                  <div style={{ padding: "14px 28px", borderBottom: "1px solid var(--cv-border-light)", display: "flex", gap: "2px", flexWrap: "wrap" }}>
                    {FILTER_OPTIONS.map((f) => (
                      <button key={f.value} onClick={() => setFilter(f.value)} className={`cv-filter-btn ${filter === f.value ? "active" : ""}`}>
                        {f.label}
                      </button>
                    ))}
                  </div>

                  {/* List */}
                  <div style={{ borderTop: "1px solid var(--cv-border-light)" }}>
                    {filtered.length === 0 ? (
                      <div style={{ padding: "64px 48px", textAlign: "center" }}>
                        <p style={{ fontFamily: SERIF, fontSize: "14px", fontStyle: "italic", color: "var(--cv-muted)" }}>No activity recorded.</p>
                      </div>
                    ) : (
                      filtered.map((a, i) => (
                        <div key={a.id} style={{ display: "flex", alignItems: "flex-start", gap: "16px", padding: "16px 28px", borderBottom: "1px solid var(--cv-border-light)", transition: "background 0.2s" }}
                          onMouseEnter={(e) => (e.currentTarget.style.background = "var(--cv-surface)")}
                          onMouseLeave={(e) => (e.currentTarget.style.background = "transparent")}>
                          <span style={{ fontFamily: SERIF, fontSize: "9px", fontStyle: "italic", color: "var(--cv-border)", flexShrink: 0, paddingTop: "3px", minWidth: "28px" }}>
                            {String(i + 1).padStart(2, "0")}
                          </span>
                          <div style={{ flex: 1, minWidth: 0 }}>
                            <div style={{ display: "flex", justifyContent: "space-between", gap: "12px", marginBottom: "3px" }}>
                              <p style={{ fontFamily: SERIF, fontSize: "14px", color: "var(--cv-fg)" }}>{a.title}</p>
                              <span style={{ fontFamily: SERIF, fontSize: "9px", fontStyle: "italic", color: "var(--cv-muted)", flexShrink: 0 }}>
                                {new Date(a.timestamp).toLocaleDateString("en-GB", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" })}
                              </span>
                            </div>
                            <p style={{ fontFamily: SERIF, fontSize: "11px", fontStyle: "italic", color: "var(--cv-muted)" }}>{a.description}</p>
                            <div style={{ display: "flex", gap: "16px", marginTop: "6px" }}>
                              {a.tokenId !== undefined && <span style={{ fontFamily: MONO, fontSize: "9px", color: "var(--cv-muted)" }}>Token #{a.tokenId}</span>}
                              {a.amount && <span style={{ fontFamily: MONO, fontSize: "9px", color: "var(--cv-ink-light)" }}>{a.amount} {NETWORK_CONFIG.tokenSymbol}</span>}
                              {a.txHash && (
                                <a href={`${NETWORK_CONFIG.explorerUrl}/tx/${a.txHash}`} target="_blank" rel="noopener noreferrer"
                                  style={{ fontFamily: SERIF, fontSize: "9px", letterSpacing: "0.12em", textTransform: "uppercase", color: "var(--cv-muted)", display: "flex", alignItems: "center", gap: "4px", textDecoration: "none" }}>
                                  View Tx <ExternalLink size={9} strokeWidth={1.5} />
                                </a>
                              )}
                            </div>
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                </motion.div>
              )}

              {/* CONTACTS */}
              {tab === "contacts" && (
                <motion.div key="contacts" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} style={{ padding: "28px" }}>
                  <p style={{ fontFamily: SERIF, fontSize: "16px", color: "var(--cv-fg)", marginBottom: "4px" }}>Address Book</p>
                  <p style={{ fontFamily: SERIF, fontSize: "11px", fontStyle: "italic", color: "var(--cv-muted)", marginBottom: "24px" }}>Manage your wallet contacts.</p>
                  <div style={{ borderTop: "1px solid var(--cv-border-light)", paddingTop: "20px" }}>
                    <ContactsBook />
                  </div>
                </motion.div>
              )}

              {/* SIGNER */}
              {tab === "signer" && (
                <motion.div key="signer" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} style={{ padding: "28px" }}>
                  <p style={{ fontFamily: SERIF, fontSize: "16px", color: "var(--cv-fg)", marginBottom: "4px" }}>Document Signer</p>
                  <p style={{ fontFamily: SERIF, fontSize: "11px", fontStyle: "italic", color: "var(--cv-muted)", marginBottom: "24px", lineHeight: 1.7 }}>
                    Sign documents with your wallet key. Anyone can verify authenticity without knowing your private key.
                  </p>
                  <div style={{ borderTop: "1px solid var(--cv-border-light)", paddingTop: "20px" }}>
                    <DocumentSigner />
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </motion.div>
        </div>
      </div>

      <QRModal isOpen={showQR} onClose={() => setShowQR(false)} address={wallet.address} label="Receive VELD" />
    </div>
  );
}