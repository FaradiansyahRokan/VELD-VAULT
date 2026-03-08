"use client";

import { useState, useEffect, useMemo } from "react";
import { useRouter } from "next/navigation";
import { useStore } from "@/lib/store";
import { useContactsStore } from "@/lib/contact-store";
import { useActivityStore } from "@/lib/activity-store";
import { NETWORK_CONFIG } from "@/lib/constants";
import { ethers } from "ethers";
import { motion, AnimatePresence } from "framer-motion";
import { toast } from "sonner";
import { ArrowRight, Search, Check, X, ChevronLeft, UserCircle2 } from "lucide-react";
import QRModal from "@/components/QRModal";

const SERIF = "'EB Garamond', 'Cormorant Garamond', Georgia, serif";
const MONO = "'JetBrains Mono', 'Courier New', monospace";
const ease: [number, number, number, number] = [0.16, 1, 0.3, 1];

const RECENT_KEY = "cv_recent_transfers";
interface RecentEntry { address: string; amount: string; timestamp: number; }
function loadRecent(): RecentEntry[] {
  if (typeof window === "undefined") return [];
  try { return JSON.parse(localStorage.getItem(RECENT_KEY) || "[]"); } catch { return []; }
}
function saveRecent(address: string, amount: string) {
  const prev = loadRecent().filter((r) => r.address.toLowerCase() !== address.toLowerCase());
  const next = [{ address: address.toLowerCase(), amount, timestamp: Date.now() }, ...prev].slice(0, 8);
  try { localStorage.setItem(RECENT_KEY, JSON.stringify(next)); } catch { }
}

type Step = "input" | "confirm" | "success";

export default function TransferPage() {
  const router = useRouter();
  const { wallet, signer, balance, refreshBalance } = useStore();
  const { contacts, getByAddress } = useContactsStore();
  const { addActivity } = useActivityStore();

  const [mounted, setMounted] = useState(false);
  const [step, setStep] = useState<Step>("input");
  const [toAddress, setToAddress] = useState("");
  const [amount, setAmount] = useState("");
  const [search, setSearch] = useState("");
  const [sending, setSending] = useState(false);
  const [txHash, setTxHash] = useState("");
  const [recent, setRecent] = useState<RecentEntry[]>([]);
  const [showQR, setShowQR] = useState(false);
  const [contactTab, setContactTab] = useState<"contacts" | "recent">("contacts");

  useEffect(() => {
    setMounted(true);
    if (!wallet) { router.push("/"); return; }
    refreshBalance();
    setRecent(loadRecent());
  }, [wallet, router, refreshBalance]);

  const balanceNum = parseFloat(balance) || 0;
  const amountNum = parseFloat(amount || "0");
  const GAS_COST = parseFloat(ethers.formatEther(BigInt(21_000) * ethers.parseUnits("30", "gwei")));
  const maxSendable = Math.max(0, balanceNum - GAS_COST);
  const isValidAddress = ethers.isAddress(toAddress.trim());
  const isSelf = toAddress.trim().toLowerCase() === wallet?.address.toLowerCase();

  const addressError = useMemo(() => {
    if (!toAddress) return null;
    if (!isValidAddress) return "Invalid address format";
    if (isSelf) return "Cannot transfer to your own wallet";
    return null;
  }, [toAddress, isValidAddress, isSelf]);

  const amountError = useMemo(() => {
    if (!amount) return null;
    if (amountNum <= 0) return "Amount must be greater than 0";
    if (amountNum > maxSendable) return `Insufficient funds (max ${maxSendable.toFixed(4)} ${NETWORK_CONFIG.tokenSymbol})`;
    return null;
  }, [amount, amountNum, maxSendable]);

  const canContinue = isValidAddress && !isSelf && amountNum > 0 && !amountError;

  const filteredContacts = search
    ? contacts.filter((c) =>
      c.name.toLowerCase().includes(search.toLowerCase()) ||
      c.address.toLowerCase().includes(search.toLowerCase()))
    : contacts;

  const handleSend = async () => {
    if (!signer || !wallet || !canContinue) return;
    setSending(true);
    try {
      const tx = await (signer as ethers.Wallet).sendTransaction({
        to: toAddress.trim(),
        value: ethers.parseEther(amount),
        maxFeePerGas: ethers.parseUnits("30", "gwei"),
        maxPriorityFeePerGas: ethers.parseUnits("1", "gwei"),
        gasLimit: 21_000,
      });
      setTxHash(tx.hash);
      await tx.wait();
      saveRecent(toAddress.trim(), amount);
      setRecent(loadRecent());
      addActivity({
        type: "transfer_out",
        title: "Transfer executed",
        description: `${amount} ${NETWORK_CONFIG.tokenSymbol} → ${toAddress.trim().slice(0, 6)}...${toAddress.trim().slice(-4)}`,
        walletAddress: wallet.address, amount, address: toAddress.trim(),
      });
      await refreshBalance();
      setStep("success");
    } catch (e: any) {
      const msg = e?.message || "Transfer failed";
      toast.error(msg.length > 120 ? "Transfer failed. Check console for details." : msg);
    } finally { setSending(false); }
  };

  const handleReset = () => { setStep("input"); setToAddress(""); setAmount(""); setTxHash(""); };
  const contact = getByAddress(toAddress.trim());

  if (!mounted || !wallet) return null;

  return (
    <div className="min-h-screen" style={{ background: "var(--cv-bg)", color: "var(--cv-fg)" }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=EB+Garamond:ital,wght@0,400;0,500;1,400;1,500&display=swap');
        :root { --cv-bg:#FAFAF8;--cv-fg:#0A0A0A;--cv-muted:#6B6B6B;--cv-border:#D8D4CC;--cv-border-light:#EDEAE4;--cv-card:#FFFFFF;--cv-surface:#F4F2EE;--cv-ink-light:#3A3A3A; }
        .dark { --cv-bg:#0A0A08;--cv-fg:#F0EDE6;--cv-muted:#8A857C;--cv-border:#2A2820;--cv-border-light:#1E1C18;--cv-card:#111109;--cv-surface:#161410;--cv-ink-light:#C5BFB5; }
        .cv-input { width:100%;background:transparent;border:none;border-bottom:1px solid var(--cv-border);padding:14px 0;font-family:${MONO};font-size:13px;letter-spacing:0.04em;color:var(--cv-fg);outline:none;transition:border-color 0.3s; }
        .cv-input:focus { border-bottom-color:var(--cv-fg); }
        .cv-input::placeholder { color:var(--cv-muted);font-style:italic;font-family:${SERIF}; }
        .cv-input.error { border-bottom-color:#dc2626; }
        .cv-input.valid { border-bottom-color:#16a34a; }
        .cv-btn { background:var(--cv-fg);color:var(--cv-bg);border:1px solid var(--cv-fg);font-family:${SERIF};letter-spacing:0.12em;text-transform:uppercase;font-size:11px;font-weight:400;padding:14px 32px;transition:all 0.35s cubic-bezier(0.16,1,0.3,1);position:relative;overflow:hidden;width:100%;display:flex;align-items:center;justify-content:center;gap:12px; }
        .cv-btn::before { content:'';position:absolute;inset:0;background:var(--cv-bg);transform:scaleX(0);transform-origin:right;transition:transform 0.45s cubic-bezier(0.16,1,0.3,1); }
        .cv-btn:hover::before { transform:scaleX(1);transform-origin:left; }
        .cv-btn:hover { color:var(--cv-fg); }
        .cv-btn span { position:relative;z-index:1; }
        .cv-btn:disabled { background:var(--cv-border);color:var(--cv-muted);border-color:var(--cv-border);cursor:not-allowed; }
        .cv-btn:disabled::before { display:none; }
        .cv-ghost { background:transparent;color:var(--cv-muted);border:none;font-family:${SERIF};letter-spacing:0.14em;text-transform:uppercase;font-size:10px;padding:8px 0;cursor:pointer;transition:color 0.25s; }
        .cv-ghost:hover { color:var(--cv-fg); }
        .cv-contact-row { width:100%;background:transparent;border:none;border-bottom:1px solid var(--cv-border-light);padding:14px 0;display:flex;align-items:center;gap:14px;text-align:left;cursor:pointer;transition:all 0.3s;font-family:${SERIF}; }
        .cv-contact-row:hover { padding-left:8px; }
        .cv-tab { flex:1;background:transparent;border:none;padding:10px 0;font-family:${SERIF};font-size:9px;letter-spacing:0.22em;text-transform:uppercase;color:var(--cv-muted);cursor:pointer;transition:all 0.25s;border-bottom:1px solid transparent; }
        .cv-tab.active { color:var(--cv-fg);border-bottom-color:var(--cv-fg); }
      `}</style>

      <div style={{ maxWidth: "520px", margin: "0 auto", padding: "120px 32px 80px" }}>

        {/* ── Masthead ── */}
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.8, ease }}>
          <button onClick={() => router.back()} style={{ background: "none", border: "none", cursor: "pointer", display: "flex", alignItems: "center", gap: "8px", fontSize: "9px", letterSpacing: "0.22em", textTransform: "uppercase", color: "var(--cv-muted)", fontFamily: SERIF, marginBottom: "40px", padding: 0 }}>
            <ChevronLeft size={12} strokeWidth={1.5} /> Back
          </button>

          <p style={{ fontSize: "9px", letterSpacing: "0.28em", textTransform: "uppercase", color: "var(--cv-muted)", fontFamily: SERIF, fontStyle: "italic", marginBottom: "16px" }}>
            CipherVault · {NETWORK_CONFIG.name} · {NETWORK_CONFIG.tokenSymbol}
          </p>
          <div style={{ display: "flex", alignItems: "center", gap: "16px", marginBottom: "16px" }}>
            <div style={{ flex: 1, height: "1px", background: "var(--cv-border-light)" }} />
            <div style={{ width: "5px", height: "5px", border: "1px solid var(--cv-border)", transform: "rotate(45deg)", flexShrink: 0 }} />
            <div style={{ flex: 1, height: "1px", background: "var(--cv-border-light)" }} />
          </div>
          <h1 style={{ fontFamily: SERIF, fontSize: "clamp(40px, 8vw, 56px)", fontWeight: 400, letterSpacing: "-0.02em", lineHeight: 0.95, marginBottom: "8px" }}>
            Transfer<br /><em style={{ color: "var(--cv-muted)" }}>Funds.</em>
          </h1>
          <div style={{ display: "flex", alignItems: "center", gap: "16px", marginTop: "16px", marginBottom: "40px" }}>
            <div style={{ flex: 1, height: "1px", background: "var(--cv-border-light)" }} />
            <div style={{ width: "5px", height: "5px", border: "1px solid var(--cv-border)", transform: "rotate(45deg)", flexShrink: 0 }} />
            <div style={{ flex: 1, height: "1px", background: "var(--cv-border-light)" }} />
          </div>
        </motion.div>

        <AnimatePresence mode="wait">

          {/* ══ INPUT ══ */}
          {step === "input" && (
            <motion.div key="input" initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }} transition={{ duration: 0.55, ease }}>

              {/* Balance block */}
              <div style={{ border: "1px solid var(--cv-border-light)", padding: "24px 28px", background: "var(--cv-surface)", marginBottom: "32px", display: "flex", justifyContent: "space-between", alignItems: "flex-end" }}>
                <div>
                  <p style={{ fontSize: "9px", letterSpacing: "0.24em", textTransform: "uppercase", color: "var(--cv-muted)", fontFamily: SERIF, marginBottom: "10px" }}>Available Balance</p>
                  <p style={{ fontFamily: SERIF, fontSize: "36px", fontWeight: 400, letterSpacing: "-0.025em", lineHeight: 1, color: "var(--cv-fg)" }}>
                    {balanceNum.toFixed(4)} <em style={{ fontSize: "16px", color: "var(--cv-muted)" }}>{NETWORK_CONFIG.tokenSymbol}</em>
                  </p>
                </div>
                <div>
                  <p style={{ fontSize: "9px", letterSpacing: "0.16em", color: "var(--cv-muted)", fontFamily: SERIF, fontStyle: "italic", textAlign: "right", marginBottom: "4px" }}>Max sendable</p>
                  <p style={{ fontFamily: MONO, fontSize: "11px", color: "var(--cv-ink-light)", textAlign: "right" }}>{maxSendable.toFixed(4)}</p>
                </div>
              </div>

              {/* Recipient */}
              <div style={{ marginBottom: "28px" }}>
                <label style={{ display: "block", fontSize: "9px", letterSpacing: "0.24em", textTransform: "uppercase", color: "var(--cv-muted)", fontFamily: SERIF, marginBottom: "10px" }}>Recipient Address</label>
                <div style={{ position: "relative" }}>
                  <input value={toAddress} onChange={(e) => setToAddress(e.target.value)} placeholder="0x…" spellCheck={false}
                    className={`cv-input ${addressError ? "error" : toAddress && !addressError ? "valid" : ""}`} />
                  {toAddress && (
                    <div style={{ position: "absolute", right: 0, bottom: "14px" }}>
                      {addressError ? <X size={12} color="#dc2626" strokeWidth={1.5} /> : <Check size={12} color="#16a34a" strokeWidth={1.5} />}
                    </div>
                  )}
                </div>
                <AnimatePresence>
                  {contact && !addressError && (
                    <motion.p initial={{ opacity: 0, y: -4 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
                      style={{ fontSize: "10px", fontStyle: "italic", color: "var(--cv-muted)", fontFamily: SERIF, marginTop: "8px" }}>
                      {contact.emoji} {contact.name}
                    </motion.p>
                  )}
                  {addressError && (
                    <motion.p initial={{ opacity: 0 }} animate={{ opacity: 1 }}
                      style={{ fontSize: "10px", color: "#dc2626", fontFamily: SERIF, fontStyle: "italic", marginTop: "8px" }}>
                      {addressError}
                    </motion.p>
                  )}
                </AnimatePresence>
              </div>

              {/* Amount */}
              <div style={{ marginBottom: "32px" }}>
                <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "10px" }}>
                  <label style={{ fontSize: "9px", letterSpacing: "0.24em", textTransform: "uppercase", color: "var(--cv-muted)", fontFamily: SERIF }}>
                    Amount ({NETWORK_CONFIG.tokenSymbol})
                  </label>
                  <button onClick={() => setAmount(maxSendable.toFixed(6))} style={{ background: "none", border: "none", cursor: "pointer", fontSize: "9px", letterSpacing: "0.18em", textTransform: "uppercase", color: "var(--cv-muted)", fontFamily: SERIF, padding: 0, transition: "color 0.2s" }}
                    onMouseEnter={(e) => (e.currentTarget.style.color = "var(--cv-fg)")}
                    onMouseLeave={(e) => (e.currentTarget.style.color = "var(--cv-muted)")}>
                    Max
                  </button>
                </div>
                <input type="number" value={amount} onChange={(e) => setAmount(e.target.value)} placeholder="0.0000" min="0" step="0.0001"
                  className={`cv-input ${amountError ? "error" : amount && !amountError ? "valid" : ""}`}
                  style={{ fontSize: "28px", fontFamily: SERIF, letterSpacing: "-0.02em" }} />
                {amountError && (
                  <p style={{ fontSize: "10px", color: "#dc2626", fontFamily: SERIF, fontStyle: "italic", marginTop: "8px" }}>{amountError}</p>
                )}
                {amount && !amountError && (
                  <p style={{ fontSize: "10px", color: "var(--cv-muted)", fontFamily: SERIF, fontStyle: "italic", marginTop: "8px" }}>
                    Est. gas: ~{GAS_COST.toFixed(5)} {NETWORK_CONFIG.tokenSymbol}
                  </p>
                )}
              </div>

              <button onClick={() => setStep("confirm")} disabled={!canContinue} className="cv-btn" style={{ marginBottom: "40px" }}>
                <span>Review Transfer</span>
                <ArrowRight size={12} strokeWidth={1.5} style={{ position: "relative", zIndex: 1 }} />
              </button>

              {/* Contact Picker */}
              {(contacts.length > 0 || recent.length > 0) && (
                <div style={{ borderTop: "1px solid var(--cv-border-light)", paddingTop: "28px" }}>
                  {/* Tabs */}
                  <div style={{ display: "flex", borderBottom: "1px solid var(--cv-border-light)", marginBottom: "20px" }}>
                    <button className={`cv-tab ${contactTab === "contacts" ? "active" : ""}`} onClick={() => setContactTab("contacts")}>
                      Contacts · {contacts.length}
                    </button>
                    <button className={`cv-tab ${contactTab === "recent" ? "active" : ""}`} onClick={() => setContactTab("recent")}>
                      Recent · {recent.length}
                    </button>
                  </div>

                  {/* Search */}
                  {contactTab === "contacts" && contacts.length > 3 && (
                    <div style={{ position: "relative", marginBottom: "16px" }}>
                      <Search size={11} style={{ position: "absolute", left: 0, top: "50%", transform: "translateY(-50%)", color: "var(--cv-muted)" }} />
                      <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search name or address…"
                        style={{ width: "100%", background: "transparent", border: "none", borderBottom: "1px solid var(--cv-border-light)", padding: "10px 0 10px 20px", fontFamily: SERIF, fontSize: "12px", color: "var(--cv-fg)", outline: "none" }} />
                    </div>
                  )}

                  <AnimatePresence mode="wait">
                    {contactTab === "contacts" && (
                      <motion.div key="contacts" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
                        {filteredContacts.length === 0
                          ? <p style={{ fontSize: "11px", fontStyle: "italic", color: "var(--cv-muted)", fontFamily: SERIF, padding: "20px 0" }}>{search ? "No matching contacts." : "No contacts yet."}</p>
                          : filteredContacts.map((c) => {
                            const selected = toAddress.toLowerCase() === c.address.toLowerCase();
                            return (
                              <button key={c.id} onClick={() => setToAddress(c.address)} className="cv-contact-row"
                                style={{ background: selected ? "var(--cv-surface)" : "transparent" }}>
                                <span style={{ fontSize: "18px", flexShrink: 0 }}>{c.emoji}</span>
                                <div style={{ flex: 1, minWidth: 0 }}>
                                  <p style={{ fontFamily: SERIF, fontSize: "14px", color: "var(--cv-fg)", marginBottom: "2px" }}>{c.name}</p>
                                  <p style={{ fontFamily: MONO, fontSize: "10px", color: "var(--cv-muted)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                                    {c.address.slice(0, 12)}…{c.address.slice(-8)}
                                  </p>
                                </div>
                                {selected && <Check size={12} strokeWidth={1.5} color="var(--cv-fg)" />}
                              </button>
                            );
                          })
                        }
                      </motion.div>
                    )}
                    {contactTab === "recent" && (
                      <motion.div key="recent" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
                        {recent.length === 0
                          ? <p style={{ fontSize: "11px", fontStyle: "italic", color: "var(--cv-muted)", fontFamily: SERIF, padding: "20px 0" }}>No transfer history.</p>
                          : recent.map((r) => {
                            const rc = getByAddress(r.address);
                            return (
                              <button key={r.address} onClick={() => { setToAddress(r.address); setAmount(r.amount); }} className="cv-contact-row">
                                <span style={{ fontSize: "18px", flexShrink: 0 }}>{rc?.emoji || <UserCircle2 size={16} />}</span>
                                <div style={{ flex: 1, minWidth: 0 }}>
                                  <p style={{ fontFamily: SERIF, fontSize: "14px", color: "var(--cv-fg)", marginBottom: "2px" }}>
                                    {rc?.name || `${r.address.slice(0, 8)}…${r.address.slice(-6)}`}
                                  </p>
                                  <p style={{ fontFamily: SERIF, fontSize: "10px", color: "var(--cv-muted)", fontStyle: "italic" }}>
                                    {new Date(r.timestamp).toLocaleDateString("en-GB", { day: "numeric", month: "short" })}
                                  </p>
                                </div>
                                <div style={{ textAlign: "right" }}>
                                  <p style={{ fontFamily: SERIF, fontSize: "13px", color: "var(--cv-fg)" }}>{r.amount}</p>
                                  <p style={{ fontFamily: SERIF, fontSize: "9px", color: "var(--cv-muted)", fontStyle: "italic" }}>{NETWORK_CONFIG.tokenSymbol}</p>
                                </div>
                              </button>
                            );
                          })
                        }
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
              )}
            </motion.div>
          )}

          {/* ══ CONFIRM ══ */}
          {step === "confirm" && (
            <motion.div key="confirm" initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }} transition={{ duration: 0.55, ease }}>
              <button onClick={() => setStep("input")} className="cv-ghost" style={{ marginBottom: "28px" }}>← Edit</button>

              {/* Summary infobox */}
              <div style={{ border: "1px solid var(--cv-border-light)", marginBottom: "28px" }}>
                <div style={{ padding: "20px 28px 0", borderBottom: "1px solid var(--cv-border-light)" }}>
                  <p style={{ fontSize: "9px", letterSpacing: "0.24em", textTransform: "uppercase", color: "var(--cv-muted)", fontFamily: SERIF, marginBottom: "20px" }}>Transaction Summary</p>
                  <div style={{ textAlign: "center", paddingBottom: "24px" }}>
                    <p style={{ fontFamily: SERIF, fontSize: "clamp(44px, 10vw, 64px)", fontWeight: 400, letterSpacing: "-0.03em", lineHeight: 1, color: "var(--cv-fg)" }}>
                      {parseFloat(amount).toFixed(4)}
                    </p>
                    <p style={{ fontFamily: SERIF, fontSize: "16px", color: "var(--cv-muted)", fontStyle: "italic", marginTop: "4px" }}>{NETWORK_CONFIG.tokenSymbol}</p>
                  </div>
                </div>
                {[
                  { label: "From", val: `${wallet.address.slice(0, 10)}…${wallet.address.slice(-8)}`, mono: true },
                  { label: "To", val: contact ? `${contact.emoji} ${contact.name} · ${toAddress.slice(0, 8)}…` : `${toAddress.slice(0, 10)}…${toAddress.slice(-8)}`, mono: !contact },
                  { label: "Network", val: NETWORK_CONFIG.name, mono: false },
                  { label: "Est. Gas", val: `~${GAS_COST.toFixed(5)} ${NETWORK_CONFIG.tokenSymbol}`, mono: true },
                  { label: "Total Out", val: `~${(amountNum + GAS_COST).toFixed(5)} ${NETWORK_CONFIG.tokenSymbol}`, mono: true },
                ].map(({ label, val, mono }) => (
                  <div key={label} style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", padding: "14px 28px", borderBottom: "1px solid var(--cv-border-light)" }}>
                    <span style={{ fontSize: "10px", letterSpacing: "0.14em", color: "var(--cv-muted)", fontFamily: SERIF, fontStyle: "italic" }}>{label}</span>
                    <span style={{ fontFamily: mono ? MONO : SERIF, fontSize: mono ? "11px" : "13px", color: "var(--cv-fg)" }}>{val}</span>
                  </div>
                ))}
              </div>

              {/* Warning */}
              <div style={{ display: "flex", gap: "14px", padding: "16px 20px", border: "1px solid var(--cv-border-light)", background: "var(--cv-surface)", marginBottom: "24px" }}>
                <div style={{ width: "1px", background: "var(--cv-fg)", flexShrink: 0, alignSelf: "stretch" }} />
                <p style={{ fontSize: "11px", color: "var(--cv-muted)", fontFamily: SERIF, fontStyle: "italic", lineHeight: 1.7 }}>
                  Blockchain transactions are permanent and irreversible. Verify the recipient address before proceeding.
                </p>
              </div>

              <button onClick={handleSend} disabled={sending} className="cv-btn" style={{ marginBottom: "12px" }}>
                {sending
                  ? <><span>Transmitting</span><span style={{ fontStyle: "italic", position: "relative", zIndex: 1 }}>···</span></>
                  : <><span>Execute Transfer</span><ArrowRight size={12} strokeWidth={1.5} style={{ position: "relative", zIndex: 1 }} /></>
                }
              </button>
              <button onClick={() => setStep("input")} disabled={sending} className="cv-ghost" style={{ width: "100%", textAlign: "center" }}>Cancel</button>
            </motion.div>
          )}

          {/* ══ SUCCESS ══ */}
          {step === "success" && (
            <motion.div key="success" initial={{ opacity: 0, scale: 0.98 }} animate={{ opacity: 1, scale: 1 }} transition={{ duration: 0.7, ease }} style={{ textAlign: "center" }}>
              <motion.div initial={{ scale: 0 }} animate={{ scale: 1 }} transition={{ delay: 0.2, type: "spring", stiffness: 260, damping: 20 }}
                style={{ width: "80px", height: "80px", border: "1px solid var(--cv-border-light)", display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 28px", background: "var(--cv-surface)" }}>
                <Check size={28} strokeWidth={1.5} />
              </motion.div>

              <p style={{ fontFamily: SERIF, fontSize: "28px", fontWeight: 400, letterSpacing: "-0.01em", marginBottom: "12px" }}>Transfer Complete.</p>
              <p style={{ fontFamily: SERIF, fontSize: "13px", fontStyle: "italic", color: "var(--cv-muted)", marginBottom: "32px", lineHeight: 1.7 }}>
                {parseFloat(amount).toFixed(4)} {NETWORK_CONFIG.tokenSymbol} transmitted to{" "}
                {contact ? `${contact.emoji} ${contact.name}` : `${toAddress.slice(0, 8)}…${toAddress.slice(-6)}`}.
              </p>

              {txHash && (
                <div style={{ border: "1px solid var(--cv-border-light)", padding: "16px 20px", marginBottom: "28px", textAlign: "left" }}>
                  <p style={{ fontSize: "8px", letterSpacing: "0.22em", textTransform: "uppercase", color: "var(--cv-muted)", fontFamily: SERIF, marginBottom: "8px" }}>Transaction Hash</p>
                  <p style={{ fontFamily: MONO, fontSize: "10px", color: "var(--cv-fg)", wordBreak: "break-all", lineHeight: 1.8 }}>{txHash}</p>
                </div>
              )}

              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "2px" }}>
                <button onClick={handleReset} style={{ background: "var(--cv-surface)", border: "1px solid var(--cv-border-light)", padding: "14px", fontFamily: SERIF, fontSize: "11px", letterSpacing: "0.14em", textTransform: "uppercase", color: "var(--cv-fg)", cursor: "pointer" }}>
                  New Transfer
                </button>
                <button onClick={() => router.push("/dashboard")} className="cv-btn" style={{ width: "auto" }}>
                  <span>Dashboard</span>
                </button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      <QRModal isOpen={showQR} onClose={() => setShowQR(false)} address={wallet.address}
        label={`Wallet ${wallet.address.slice(0, 6)}…${wallet.address.slice(-4)}`} />
    </div>
  );
}