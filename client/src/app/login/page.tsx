"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useStore } from "@/lib/store";
import { motion, AnimatePresence } from "framer-motion";
import { ArrowRight, Copy, Check, ChevronLeft } from "lucide-react";
import { toast } from "sonner";
import { NETWORK_CONFIG } from "@/lib/constants";

type View = "MENU" | "CREATE" | "IMPORT";

const ease: [number, number, number, number] = [0.16, 1, 0.3, 1];

export default function LoginPage() {
  const { createWallet, importWallet, logout } = useStore();
  const router = useRouter();

  const [view, setView] = useState<View>("MENU");
  const [mnemonic, setMnemonic] = useState("");
  const [isCopied, setIsCopied] = useState(false);
  const [importInput, setImportInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [isCreating, setIsCreating] = useState(false);
  const [confirmed, setConfirmed] = useState(false);

  useEffect(() => {
    logout();
    setView("MENU");
    setMnemonic("");
    setConfirmed(false);
    setImportInput("");
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const handleCreate = async () => {
    setIsCreating(true);
    try {
      const phrase = await createWallet();
      setMnemonic(phrase);
      setView("CREATE");
    } catch {
      toast.error("Failed to create vault");
    }
    setIsCreating(false);
  };

  const handleImport = async () => {
    if (!importInput.trim()) return toast.error("Enter seed phrase or private key");
    setIsLoading(true);
    const success = await importWallet(importInput.trim());
    if (success) {
      toast.success("Vault accessed.");
      router.push("/dashboard");
    } else {
      toast.error("Invalid credentials");
      setIsLoading(false);
    }
  };

  const copyMnemonic = () => {
    navigator.clipboard.writeText(mnemonic);
    setIsCopied(true);
    toast.success("Phrase copied to clipboard");
    setTimeout(() => setIsCopied(false), 2000);
  };

  const enterVault = () => {
    if (!confirmed) {
      toast.error("Please confirm you have saved your phrase");
      return;
    }
    router.push("/dashboard");
  };

  return (
    <div
      className="relative min-h-screen flex items-center justify-center overflow-hidden"
      style={{
        background: "var(--cv-bg)",
        color: "var(--cv-fg)",
        fontFamily: "'EB Garamond', 'Cormorant Garamond', 'Playfair Display', Georgia, serif",
      }}
    >
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=EB+Garamond:ital,wght@0,400;0,500;0,600;1,400;1,500&family=Cormorant+Garamond:ital,wght@0,300;0,400;0,500;1,300;1,400&display=swap');

        :root {
          --cv-bg: #FAFAF8;
          --cv-fg: #0A0A0A;
          --cv-muted: #6B6B6B;
          --cv-border: #D8D4CC;
          --cv-border-light: #EDEAE4;
          --cv-card: #FFFFFF;
          --cv-surface: #F4F2EE;
          --cv-ink-light: #3A3A3A;
        }

        .dark {
          --cv-bg: #0A0A08;
          --cv-fg: #F0EDE6;
          --cv-muted: #8A857C;
          --cv-border: #2A2820;
          --cv-border-light: #1E1C18;
          --cv-card: #111109;
          --cv-surface: #161410;
          --cv-ink-light: #C5BFB5;
        }

        /* Grain texture overlay */
        .cv-grain::before {
          content: '';
          position: fixed;
          inset: 0;
          pointer-events: none;
          z-index: 0;
          opacity: 0.028;
          background-image: url("data:image/svg+xml,%3Csvg viewBox='0 0 512 512' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='grain'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.75' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23grain)' opacity='1'/%3E%3C/svg%3E");
          background-size: 256px 256px;
        }

        /* Hairline rule */
        .cv-rule {
          width: 100%;
          height: 1px;
          background: var(--cv-border);
        }

        .cv-rule-short {
          width: 32px;
          height: 1px;
          background: var(--cv-fg);
        }

        /* Button base */
        .cv-btn-primary {
          background: var(--cv-fg);
          color: var(--cv-bg);
          border: 1px solid var(--cv-fg);
          font-family: inherit;
          letter-spacing: 0.12em;
          text-transform: uppercase;
          font-size: 11px;
          font-weight: 400;
          padding: 14px 32px;
          transition: all 0.35s cubic-bezier(0.16, 1, 0.3, 1);
          position: relative;
          overflow: hidden;
        }

        .cv-btn-primary::before {
          content: '';
          position: absolute;
          inset: 0;
          background: var(--cv-bg);
          transform: scaleX(0);
          transform-origin: right;
          transition: transform 0.45s cubic-bezier(0.16, 1, 0.3, 1);
        }

        .cv-btn-primary:hover::before { transform: scaleX(1); transform-origin: left; }
        .cv-btn-primary:hover { color: var(--cv-fg); }
        .cv-btn-primary span { position: relative; z-index: 1; }

        .cv-btn-ghost {
          background: transparent;
          color: var(--cv-fg);
          border: 1px solid var(--cv-border);
          font-family: inherit;
          letter-spacing: 0.12em;
          text-transform: uppercase;
          font-size: 11px;
          font-weight: 400;
          padding: 14px 32px;
          transition: all 0.3s ease;
        }
        .cv-btn-ghost:hover { border-color: var(--cv-fg); }

        .cv-btn-disabled {
          background: var(--cv-border);
          color: var(--cv-muted);
          border: 1px solid var(--cv-border);
          font-family: inherit;
          letter-spacing: 0.12em;
          text-transform: uppercase;
          font-size: 11px;
          font-weight: 400;
          padding: 14px 32px;
          cursor: not-allowed;
        }

        /* Row button */
        .cv-row {
          width: 100%;
          background: transparent;
          border: 1px solid var(--cv-border-light);
          padding: 24px 28px;
          display: flex;
          align-items: center;
          justify-content: space-between;
          text-align: left;
          cursor: pointer;
          transition: all 0.4s cubic-bezier(0.16, 1, 0.3, 1);
          position: relative;
          overflow: hidden;
        }

        .cv-row::after {
          content: '';
          position: absolute;
          inset: 0;
          background: var(--cv-fg);
          transform: scaleX(0);
          transform-origin: left;
          transition: transform 0.5s cubic-bezier(0.16, 1, 0.3, 1);
          z-index: 0;
        }

        .cv-row:hover::after { transform: scaleX(1); }
        .cv-row:hover .cv-row-content { color: var(--cv-bg); }
        .cv-row:hover .cv-row-sub { color: rgba(0, 0, 0, 0.55); }
        .cv-row:hover .cv-row-arrow { color: var(--cv-bg); transform: translate(3px, -3px); }
        .cv-row:not(:last-child) { border-bottom: none; }

        .cv-row-content { position: relative; z-index: 1; transition: color 0.4s; }
        .cv-row-sub { color: var(--cv-muted); transition: color 0.4s; }
        .cv-row-arrow { color: var(--cv-border); transition: all 0.4s cubic-bezier(0.16, 1, 0.3, 1); position: relative; z-index: 1; }

        /* Seed word */
        .cv-word {
          background: var(--cv-surface);
          border: 1px solid var(--cv-border-light);
          padding: 10px 8px 10px;
          text-align: center;
          transition: all 0.25s ease;
        }

        .cv-word:hover { border-color: var(--cv-border); }

        /* Textarea */
        .cv-textarea {
          width: 100%;
          background: transparent;
          border: none;
          border-bottom: 1px solid var(--cv-border);
          padding: 16px 0;
          font-family: 'JetBrains Mono', 'Courier New', monospace;
          font-size: 12px;
          letter-spacing: 0.04em;
          color: var(--cv-fg);
          resize: none;
          outline: none;
          transition: border-color 0.3s;
          line-height: 1.8;
        }

        .cv-textarea:focus { border-bottom-color: var(--cv-fg); }
        .cv-textarea::placeholder { color: var(--cv-muted); font-style: italic; }

        /* Checkbox custom */
        .cv-check {
          width: 14px;
          height: 14px;
          border: 1px solid var(--cv-border);
          background: transparent;
          display: flex;
          align-items: center;
          justify-content: center;
          flex-shrink: 0;
          margin-top: 2px;
          transition: all 0.25s ease;
          cursor: pointer;
        }

        .cv-check.checked {
          background: var(--cv-fg);
          border-color: var(--cv-fg);
        }

        /* Roman numeral badge */
        .cv-num {
          font-size: 9px;
          letter-spacing: 0.1em;
          color: var(--cv-muted);
          font-variant-numeric: tabular-nums;
          font-style: italic;
        }
      `}</style>

      {/* Grain */}
      <div className="cv-grain" />

      {/* Subtle horizontal lines — editorial structure */}
      <div
        className="absolute inset-0 pointer-events-none"
        style={{ zIndex: 0 }}
      >
        {/* Top decorative rule */}
        <div
          style={{
            position: "absolute",
            top: "10vh",
            left: "6vw",
            right: "6vw",
            height: "1px",
            background: "var(--cv-border-light)",
          }}
        />
        {/* Bottom decorative rule */}
        <div
          style={{
            position: "absolute",
            bottom: "10vh",
            left: "6vw",
            right: "6vw",
            height: "1px",
            background: "var(--cv-border-light)",
          }}
        />
      </div>

      {/* Corner marks — luxury editorial detail */}
      {[
        { top: "8vh", left: "5vw" },
        { top: "8vh", right: "5vw" },
        { bottom: "8vh", left: "5vw" },
        { bottom: "8vh", right: "5vw" },
      ].map((pos, i) => (
        <div
          key={i}
          style={{
            position: "absolute",
            ...pos,
            width: "16px",
            height: "16px",
            borderTop: i < 2 ? "1px solid var(--cv-border)" : "none",
            borderBottom: i >= 2 ? "1px solid var(--cv-border)" : "none",
            borderLeft: i % 2 === 0 ? "1px solid var(--cv-border)" : "none",
            borderRight: i % 2 === 1 ? "1px solid var(--cv-border)" : "none",
            zIndex: 0,
          }}
        />
      ))}

      {/* Main content */}
      <div className="relative z-10 w-full" style={{ maxWidth: "440px", padding: "0 24px" }}>

        {/* ── Masthead ── */}
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.9, ease }}
          style={{ textAlign: "center", marginBottom: "48px" }}
        >
          {/* Volume / Issue line */}
          <p style={{
            fontSize: "9px",
            letterSpacing: "0.28em",
            textTransform: "uppercase",
            color: "var(--cv-muted)",
            marginBottom: "20px",
            fontFamily: "'EB Garamond', Georgia, serif",
            fontStyle: "italic",
          }}>
            {NETWORK_CONFIG.name} · {NETWORK_CONFIG.tokenSymbol} · Encrypted Ledger
          </p>

          {/* Thin rule */}
          <div style={{ display: "flex", alignItems: "center", gap: "16px", marginBottom: "20px" }}>
            <div className="cv-rule" />
            <div style={{
              width: "6px", height: "6px",
              border: "1px solid var(--cv-border)",
              transform: "rotate(45deg)",
              flexShrink: 0,
            }} />
            <div className="cv-rule" />
          </div>

          {/* Title — large serif */}
          <h1 style={{
            fontSize: "clamp(36px, 8vw, 52px)",
            fontWeight: 400,
            letterSpacing: "-0.02em",
            lineHeight: 1,
            marginBottom: "6px",
            fontFamily: "'EB Garamond', 'Cormorant Garamond', Georgia, serif",
            color: "var(--cv-fg)",
          }}>
            CipherVault
          </h1>

          {/* Italic subtitle */}
          <p style={{
            fontSize: "15px",
            fontStyle: "italic",
            fontWeight: 400,
            color: "var(--cv-muted)",
            letterSpacing: "0.01em",
            marginBottom: "20px",
            fontFamily: "'EB Garamond', Georgia, serif",
          }}>
            Self-Custodial Encrypted Storage
          </p>

          {/* Rule + diamond */}
          <div style={{ display: "flex", alignItems: "center", gap: "16px" }}>
            <div className="cv-rule" />
            <div style={{
              width: "6px", height: "6px",
              border: "1px solid var(--cv-border)",
              transform: "rotate(45deg)",
              flexShrink: 0,
            }} />
            <div className="cv-rule" />
          </div>
        </motion.div>

        {/* ── Views ── */}
        <AnimatePresence mode="wait">

          {/* ══ MENU ══ */}
          {view === "MENU" && (
            <motion.div
              key="menu"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              transition={{ duration: 0.6, ease }}
            >
              {/* Section heading */}
              <div style={{ marginBottom: "20px" }}>
                <p style={{
                  fontSize: "9px",
                  letterSpacing: "0.26em",
                  textTransform: "uppercase",
                  color: "var(--cv-muted)",
                  fontFamily: "'EB Garamond', Georgia, serif",
                }}>
                  Access Protocol
                </p>
              </div>

              {/* Bordered row group */}
              <div style={{ border: "1px solid var(--cv-border-light)" }}>

                {/* Create row */}
                <button
                  onClick={handleCreate}
                  disabled={isCreating}
                  className="cv-row"
                  style={{ borderBottom: "1px solid var(--cv-border-light)" }}
                >
                  <div className="cv-row-content">
                    <p style={{
                      fontSize: "17px",
                      fontWeight: 400,
                      letterSpacing: "-0.01em",
                      marginBottom: "4px",
                      fontFamily: "'EB Garamond', Georgia, serif",
                      lineHeight: 1.2,
                    }}>
                      {isCreating ? (
                        <span style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                          <span>Generating vault</span>
                          <span style={{ fontSize: "10px", fontStyle: "italic", color: "var(--cv-muted)" }}>···</span>
                        </span>
                      ) : "Create New Vault"}
                    </p>
                    <p className="cv-row-sub" style={{ fontSize: "11px", letterSpacing: "0.02em" }}>
                      Generate wallet &amp; recovery phrase
                    </p>
                  </div>
                  <ArrowRight
                    size={14}
                    strokeWidth={1.5}
                    className="cv-row-arrow"
                    style={{ marginLeft: "16px" }}
                  />
                </button>

                {/* Import row */}
                <button onClick={() => setView("IMPORT")} className="cv-row">
                  <div className="cv-row-content">
                    <p style={{
                      fontSize: "17px",
                      fontWeight: 400,
                      letterSpacing: "-0.01em",
                      marginBottom: "4px",
                      fontFamily: "'EB Garamond', Georgia, serif",
                      lineHeight: 1.2,
                    }}>
                      Access Existing Vault
                    </p>
                    <p className="cv-row-sub" style={{ fontSize: "11px", letterSpacing: "0.02em" }}>
                      Import via seed phrase or private key
                    </p>
                  </div>
                  <ArrowRight
                    size={14}
                    strokeWidth={1.5}
                    className="cv-row-arrow"
                    style={{ marginLeft: "16px" }}
                  />
                </button>

              </div>

              {/* Feature note — editorial footnote style */}
              <div style={{ marginTop: "32px", paddingTop: "20px", borderTop: "1px solid var(--cv-border-light)" }}>
                <div style={{ display: "flex", gap: "24px", justifyContent: "center" }}>
                  {["End-to-End Encrypted", "On-Chain NFT", "Auto Faucet"].map((f, i) => (
                    <span
                      key={f}
                      style={{
                        display: "flex",
                        alignItems: "center",
                        gap: "6px",
                        fontSize: "9px",
                        letterSpacing: "0.16em",
                        textTransform: "uppercase",
                        color: "var(--cv-muted)",
                        fontFamily: "'EB Garamond', Georgia, serif",
                      }}
                    >
                      {i > 0 && (
                        <span style={{
                          width: "1px", height: "10px",
                          background: "var(--cv-border)",
                          display: "inline-block",
                          marginRight: "6px",
                        }} />
                      )}
                      {f}
                    </span>
                  ))}
                </div>
              </div>
            </motion.div>
          )}

          {/* ══ CREATE — Seed Phrase ══ */}
          {view === "CREATE" && (
            <motion.div
              key="create"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              transition={{ duration: 0.6, ease }}
            >
              {/* Section label */}
              <div style={{ marginBottom: "24px" }}>
                <p style={{
                  fontSize: "9px",
                  letterSpacing: "0.26em",
                  textTransform: "uppercase",
                  color: "var(--cv-muted)",
                  marginBottom: "6px",
                }}>
                  Secret Recovery Phrase
                </p>
                <p style={{
                  fontSize: "13px",
                  fontStyle: "italic",
                  color: "var(--cv-ink-light)",
                  lineHeight: 1.6,
                  fontFamily: "'EB Garamond', Georgia, serif",
                }}>
                  Record this phrase in a secure location. It is the sole key to your vault.
                </p>
              </div>

              <div className="cv-rule" style={{ marginBottom: "20px" }} />

              {/* Notice — faucet */}
              <div style={{
                display: "flex",
                gap: "12px",
                alignItems: "flex-start",
                marginBottom: "24px",
                padding: "14px 16px",
                background: "var(--cv-surface)",
                border: "1px solid var(--cv-border-light)",
              }}>
                <div className="cv-rule-short" style={{ marginTop: "8px", flexShrink: 0 }} />
                <p style={{
                  fontSize: "11px",
                  color: "var(--cv-ink-light)",
                  lineHeight: 1.7,
                  fontFamily: "'EB Garamond', Georgia, serif",
                  fontStyle: "italic",
                }}>
                  <span style={{ fontStyle: "normal", fontWeight: 500 }}>
                    {NETWORK_CONFIG.tokenSymbol} automatically deposited
                  </span>
                  {" "}to your new wallet address. No manual funding required.
                </p>
              </div>

              {/* Seed phrase — 3-col grid */}
              <div
                onClick={copyMnemonic}
                style={{
                  display: "grid",
                  gridTemplateColumns: "repeat(3, 1fr)",
                  gap: "1px",
                  background: "var(--cv-border-light)",
                  marginBottom: "24px",
                  cursor: "pointer",
                  position: "relative",
                }}
                title="Click to copy"
              >
                {mnemonic.split(" ").map((word, i) => (
                  <div key={i} className="cv-word">
                    <span className="cv-num" style={{ display: "block", marginBottom: "4px" }}>
                      {String(i + 1).padStart(2, "0")}
                    </span>
                    <span style={{
                      fontSize: "12px",
                      fontFamily: "'EB Garamond', Georgia, serif",
                      letterSpacing: "0.02em",
                      color: "var(--cv-fg)",
                      fontWeight: 500,
                    }}>
                      {word}
                    </span>
                  </div>
                ))}

                {/* Copy overlay */}
                <motion.div
                  initial={false}
                  style={{
                    position: "absolute",
                    inset: 0,
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    background: "rgba(0,0,0,0.72)",
                    backdropFilter: "blur(2px)",
                    opacity: 0,
                    transition: "opacity 0.25s",
                    zIndex: 1,
                  }}
                  whileHover={{ opacity: 1 }}
                >
                  <span style={{
                    display: "flex",
                    alignItems: "center",
                    gap: "8px",
                    fontSize: "10px",
                    letterSpacing: "0.2em",
                    textTransform: "uppercase",
                    color: "#fff",
                    fontFamily: "'EB Garamond', Georgia, serif",
                  }}>
                    {isCopied ? <Check size={11} strokeWidth={1.5} /> : <Copy size={11} strokeWidth={1.5} />}
                    {isCopied ? "Copied" : "Copy Phrase"}
                  </span>
                </motion.div>
              </div>

              {/* Confirmation */}
              <label
                style={{
                  display: "flex",
                  gap: "12px",
                  alignItems: "flex-start",
                  marginBottom: "28px",
                  cursor: "pointer",
                }}
              >
                <div
                  onClick={() => setConfirmed((v) => !v)}
                  className={`cv-check ${confirmed ? "checked" : ""}`}
                >
                  {confirmed && <Check size={8} strokeWidth={2.5} color="var(--cv-bg)" />}
                </div>
                <span style={{
                  fontSize: "11px",
                  color: "var(--cv-muted)",
                  lineHeight: 1.7,
                  fontFamily: "'EB Garamond', Georgia, serif",
                  fontStyle: "italic",
                }}>
                  I have recorded this phrase in a secure location and understand it cannot be recovered if lost.
                </span>
              </label>

              {/* CTA */}
              <button
                onClick={enterVault}
                className={confirmed ? "cv-btn-primary" : "cv-btn-disabled"}
                style={{ width: "100%", display: "flex", alignItems: "center", justifyContent: "center", gap: "12px" }}
              >
                <span>Enter Vault</span>
                <ArrowRight size={12} strokeWidth={1.5} />
              </button>
            </motion.div>
          )}

          {/* ══ IMPORT ══ */}
          {view === "IMPORT" && (
            <motion.div
              key="import"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              transition={{ duration: 0.6, ease }}
            >
              {/* Back + heading */}
              <div style={{ display: "flex", alignItems: "flex-start", gap: "16px", marginBottom: "28px" }}>
                <button
                  onClick={() => setView("MENU")}
                  style={{
                    background: "none",
                    border: "none",
                    color: "var(--cv-muted)",
                    cursor: "pointer",
                    padding: "2px 0",
                    display: "flex",
                    alignItems: "center",
                    gap: "6px",
                    fontSize: "10px",
                    letterSpacing: "0.16em",
                    textTransform: "uppercase",
                    fontFamily: "'EB Garamond', Georgia, serif",
                    transition: "color 0.2s",
                    flexShrink: 0,
                    marginTop: "3px",
                  }}
                >
                  <ChevronLeft size={12} strokeWidth={1.5} />
                </button>

                <div>
                  <p style={{
                    fontSize: "9px",
                    letterSpacing: "0.26em",
                    textTransform: "uppercase",
                    color: "var(--cv-muted)",
                    marginBottom: "6px",
                  }}>
                    Access Vault
                  </p>
                  <p style={{
                    fontSize: "13px",
                    fontStyle: "italic",
                    color: "var(--cv-ink-light)",
                    lineHeight: 1.5,
                    fontFamily: "'EB Garamond', Georgia, serif",
                  }}>
                    12-word recovery phrase or private key (0x…)
                  </p>
                </div>
              </div>

              <div className="cv-rule" style={{ marginBottom: "24px" }} />

              {/* Textarea — underline style */}
              <div style={{ marginBottom: "32px" }}>
                <label style={{
                  display: "block",
                  fontSize: "9px",
                  letterSpacing: "0.22em",
                  textTransform: "uppercase",
                  color: "var(--cv-muted)",
                  marginBottom: "12px",
                }}>
                  Credentials
                </label>
                <textarea
                  value={importInput}
                  onChange={(e) => setImportInput(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" && !e.shiftKey) {
                      e.preventDefault();
                      handleImport();
                    }
                  }}
                  placeholder="Enter seed phrase or private key…"
                  autoFocus
                  rows={4}
                  className="cv-textarea"
                />
              </div>

              {/* Submit */}
              <button
                onClick={handleImport}
                disabled={isLoading || !importInput.trim()}
                className={isLoading || !importInput.trim() ? "cv-btn-disabled" : "cv-btn-primary"}
                style={{ width: "100%", display: "flex", alignItems: "center", justifyContent: "center", gap: "12px" }}
              >
                {isLoading ? (
                  <span style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                    <span>Verifying</span>
                    <span style={{ fontSize: "10px", fontStyle: "italic" }}>···</span>
                  </span>
                ) : (
                  <>
                    <span>Access Vault</span>
                    <ArrowRight size={12} strokeWidth={1.5} />
                  </>
                )}
              </button>

              {/* Privacy note — footnote */}
              <p style={{
                textAlign: "center",
                fontSize: "10px",
                color: "var(--cv-muted)",
                marginTop: "16px",
                fontStyle: "italic",
                fontFamily: "'EB Garamond', Georgia, serif",
                letterSpacing: "0.02em",
              }}>
                Credentials are never transmitted to any server.
              </p>
            </motion.div>
          )}

        </AnimatePresence>

        {/* ── Footer colophon ── */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 1.2, delay: 0.6, ease }}
          style={{
            marginTop: "48px",
            paddingTop: "20px",
            borderTop: "1px solid var(--cv-border-light)",
            textAlign: "center",
          }}
        >
          <p style={{
            fontSize: "9px",
            letterSpacing: "0.2em",
            textTransform: "uppercase",
            color: "var(--cv-muted)",
            fontFamily: "'EB Garamond', Georgia, serif",
          }}>
            Non custodial · End-to-end encrypted · {new Date().getFullYear()}
          </p>
        </motion.div>

      </div>
    </div>
  );
}