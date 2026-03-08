"use client";

/**
 * tools.tsx — CipherVault Developer & Utility Suite
 *
 * Layout: Two-column split (left ink-rail + right workspace). No overlapping layers.
 * Mobile: Top scrollable tab list → content below.
 *
 * Tools:
 *  I.   Contact Manager     — full CRUD for contacts (useContactsStore)
 *  II.  Address Explorer    — read-only vault/balance lookup for any address
 *  III. Tx History          — filter + search activity log (useActivityStore)
 *  IV.  Sign Document       — upload file → SHA-256 → EIP-191 sign → verify
 *  V.   Hash Verifier       — drag file → compare SHA-256 vs on-chain hash
 *  VI.  Multi-Signer        — simulate 2-of-N approval signing flow
 *  VII. Analytics           — SVG charts of activity distribution & balance history
 */

import { useState, useEffect, useCallback, useRef, useMemo } from "react";
import { useRouter } from "next/navigation";
import { useStore } from "@/lib/store";
import { useContactsStore, type Contact } from "@/lib/contact-store";
import { useActivityStore } from "@/lib/activity-store";
import { NETWORK_CONFIG } from "@/lib/constants";
import { ethers } from "ethers";
import { motion, AnimatePresence } from "framer-motion";
import { toast } from "sonner";

/* ── Constants ───────────────────────────────────────────────── */
const SERIF = "'EB Garamond', Georgia, serif";
const MONO  = "'DM Mono', monospace";
const EASE: [number,number,number,number] = [0.16, 1, 0.3, 1];

const EMOJIS = ["🦊","🐺","🦁","🐯","🦅","🦋","🐉","🌙","⚡","🔮","🎯","🛡️","🌊","🔥","❄️","🎭"];

/* ── Tool registry ───────────────────────────────────────────── */
const TOOLS = [
  { id: "contacts",  num: "I",    label: "Contact Manager",   hint: "Add, edit & organise wallet contacts"        },
  { id: "explorer",  num: "II",   label: "Address Explorer",  hint: "Inspect any address — balance & assets"      },
  { id: "history",   num: "III",  label: "Tx History",        hint: "Filter & search your transaction log"        },
  { id: "sign-doc",  num: "IV",   label: "Sign Document",     hint: "Upload a file, sign its hash, verify"        },
  { id: "hash",      num: "V",    label: "Hash Verifier",     hint: "Compare file SHA-256 vs any known hash"      },
  { id: "multisig",  num: "VI",   label: "Multi-Signer",      hint: "Simulate 2-of-N approval signing flows"      },
  { id: "analytics", num: "VII",  label: "Analytics",         hint: "Activity charts & balance distribution"      },
] as const;
type ToolId = typeof TOOLS[number]["id"];

/* ══════════════════════════════════════════════════════════════ */
/*  GLOBAL CSS                                                    */
/* ══════════════════════════════════════════════════════════════ */
const CSS = `
@import url('https://fonts.googleapis.com/css2?family=EB+Garamond:ital,wght@0,400;0,500;1,400;1,500&family=Playfair+Display:ital,wght@0,400;0,700;1,400&family=DM+Mono:wght@300;400;500&display=swap');

/* ── Variables ── */
:root {
  --t-bg:     #fafaf8;
  --t-fg:     #0e0e0e;
  --t-muted:  #6b6b6b;
  --t-border: #d8d4cc;
  --t-lite:   #edeae4;
  --t-card:   #ffffff;
  --t-surf:   #f4f2ee;
  --t-ink:    #111109;   /* rail bg light-mode */
  --t-rail-t: #c5c0b5;   /* rail text */
  --t-rail-m: #7a756e;   /* rail muted */
  --t-up:     #2a6b3f;
  --t-dn:     #7a2828;
}
.dark {
  --t-bg:     #0a0a08;
  --t-fg:     #f0ede6;
  --t-muted:  #8a857c;
  --t-border: #2a2820;
  --t-lite:   #1e1c18;
  --t-card:   #111109;
  --t-surf:   #161410;
  --t-ink:    #050504;
  --t-rail-t: #a09a90;
  --t-rail-m: #5a5550;
  --t-up:     #4a9b62;
  --t-dn:     #b05050;
}

/* ── Root split layout ── */
.tk-root {
  display: flex;
  background: var(--t-bg);
  /* offset navbar: 92px desktop, 56px mobile */
  padding-top: 92px;
  min-height: 100vh;
  overflow: hidden;
  position: relative;
}
@media (max-width: 768px) {
  .tk-root {
    flex-direction: column;
    padding-top: 56px;
    padding-bottom: 56px;
    overflow: auto;
    min-height: 0;
  }
}

/* ══ RAIL (left sidebar) ══════════════════════════════════════ */
.tk-rail {
  width: 240px;
  flex-shrink: 0;
  background: var(--t-ink);
  border-right: 1px solid rgba(255,255,255,0.05);
  display: flex;
  flex-direction: column;
  overflow-y: auto;
  position: sticky;
  top: 92px;
  height: calc(100vh - 92px);
}
.tk-rail::-webkit-scrollbar { width: 2px; }
.tk-rail::-webkit-scrollbar-thumb { background: rgba(255,255,255,0.08); }
@media (max-width: 768px) {
  .tk-rail {
    position: static;
    width: 100%;
    height: auto;
    flex-direction: row;
    overflow-x: auto;
    overflow-y: hidden;
    border-right: none;
    border-bottom: 1px solid rgba(255,255,255,0.06);
  }
  .tk-rail::-webkit-scrollbar { height: 2px; width: 0; }
}

.tk-rail-header {
  padding: 28px 22px 16px;
  flex-shrink: 0;
}
@media (max-width: 768px) {
  .tk-rail-header { display: none; }
}
.tk-rail-suite {
  font-family: 'DM Mono', monospace;
  font-size: 10px; letter-spacing: 0.28em; text-transform: uppercase;
  color: var(--t-rail-m); margin-bottom: 4px;
}
.tk-rail-title {
  font-family: 'Playfair Display', serif;
  font-size: 17px; font-weight: 700; font-style: italic;
  color: var(--t-rail-t); letter-spacing: -0.01em;
}

.tk-rail-list { flex: 1; padding: 8px 0 24px; }
@media (max-width: 768px) {
  .tk-rail-list {
    display: flex; flex-direction: row; padding: 0;
    align-items: stretch; flex: none; width: max-content;
  }
}

.tk-rail-item {
  display: flex; align-items: center; gap: 14px;
  width: 100%; padding: 13px 22px;
  background: none; border: none; cursor: pointer;
  text-align: left; transition: background 0.18s;
  position: relative;
}
.tk-rail-item::before {
  content: ''; position: absolute;
  left: 0; top: 0; bottom: 0; width: 2px;
  background: var(--t-fg);
  transform: scaleY(0); transform-origin: center;
  transition: transform 0.25s cubic-bezier(0.16,1,0.3,1);
}
.tk-rail-item.active { background: rgba(255,255,255,0.05); }
.tk-rail-item.active::before { transform: scaleY(1); }
.tk-rail-item:hover:not(.active) { background: rgba(255,255,255,0.03); }

@media (max-width: 768px) {
  .tk-rail-item {
    flex-direction: column; align-items: center; gap: 3px;
    padding: 12px 18px; flex-shrink: 0;
    border-bottom: 2px solid transparent;
  }
  .tk-rail-item::before { display: none; }
  .tk-rail-item.active { border-bottom-color: var(--t-fg); background: transparent; }
}

.tk-rail-num {
  font-family: 'Playfair Display', serif;
  font-size: 13px; font-style: italic;
  color: var(--t-rail-m); flex-shrink: 0; width: 20px;
  transition: color 0.18s;
}
.tk-rail-item.active .tk-rail-num { color: var(--t-rail-t); }
@media (max-width: 768px) { .tk-rail-num { display: none; } }

.tk-rail-label {
  font-family: 'EB Garamond', serif;
  font-size: 14px; color: var(--t-rail-m);
  transition: color 0.18s; white-space: nowrap;
  line-height: 1;
}
.tk-rail-item.active .tk-rail-label { color: var(--t-rail-t); }
.tk-rail-item:hover .tk-rail-label { color: var(--t-rail-t); }

.tk-rail-hint {
  font-family: 'DM Mono', monospace;
  font-size: 10px; color: var(--t-rail-m); line-height: 1.4;
  letter-spacing: 0.02em; margin-top: 2px;
}
@media (max-width: 768px) {
  .tk-rail-hint { display: none; }
  .tk-rail-label { font-size: 12px; }
}

/* ══ WORKSPACE (right pane) ══════════════════════════════════ */
.tk-workspace {
  flex: 1;
  min-width: 0;
  overflow-y: auto;
  display: flex;
  flex-direction: column;
}
.tk-workspace::-webkit-scrollbar { width: 3px; }
.tk-workspace::-webkit-scrollbar-thumb { background: var(--t-lite); }

.tk-ws-head {
  padding: 36px 44px 28px;
  border-bottom: 1px solid var(--t-lite);
  flex-shrink: 0;
}
@media (max-width: 768px) {
  .tk-ws-head { padding: 24px 20px 18px; }
}
.tk-ws-eyebrow {
  font-family: 'DM Mono', monospace;
  font-size: 11px; letter-spacing: 0.24em; text-transform: uppercase;
  color: var(--t-muted); margin-bottom: 8px; font-style: italic;
}
.tk-ws-title {
  font-family: 'Playfair Display', serif;
  font-size: clamp(28px, 4vw, 42px);
  font-weight: 700; letter-spacing: -0.025em; line-height: 1;
  color: var(--t-fg);
}
.tk-ws-title em { font-style: italic; font-weight: 400; color: var(--t-muted); }
.tk-ws-sub {
  font-family: 'EB Garamond', serif;
  font-size: 16px; color: var(--t-muted);
  margin-top: 10px; line-height: 1.6;
  max-width: 560px;
}
@media (max-width: 768px) { .tk-ws-sub { font-size: 15px; } }

.tk-ws-body {
  flex: 1; padding: 36px 44px 60px;
}
@media (max-width: 768px) {
  .tk-ws-body { padding: 22px 18px 40px; }
}

/* ── Shared form elements ──────────────────────────────────── */
.tk-section { margin-bottom: 36px; }
.tk-section-title {
  font-family: 'DM Mono', monospace;
  font-size: 11px; letter-spacing: 0.22em; text-transform: uppercase;
  color: var(--t-muted); margin-bottom: 16px;
  display: flex; align-items: center; gap: 12px;
}
.tk-section-title::after {
  content: ''; flex: 1; height: 1px; background: var(--t-lite);
}

.tk-label {
  display: block; font-family: 'DM Mono', monospace;
  font-size: 11px; letter-spacing: 0.18em; text-transform: uppercase;
  color: var(--t-muted); margin-bottom: 8px;
}
.tk-input {
  width: 100%; background: transparent; border: none;
  border-bottom: 1px solid var(--t-lite);
  padding: 10px 0; font-family: 'DM Mono', monospace;
  font-size: 13px; color: var(--t-fg); outline: none;
  transition: border-color 0.25s;
}
.tk-input:focus { border-bottom-color: var(--t-fg); }
.tk-input::placeholder { color: var(--t-muted); }
.tk-input.valid   { border-bottom-color: var(--t-up); }
.tk-input.invalid { border-bottom-color: var(--t-dn); }

.tk-textarea {
  width: 100%; background: transparent;
  border: 1px solid var(--t-lite); padding: 12px 14px;
  font-family: 'DM Mono', monospace; font-size: 13px;
  color: var(--t-fg); outline: none; resize: vertical;
  min-height: 80px; transition: border-color 0.25s; line-height: 1.65;
}
.tk-textarea:focus { border-color: var(--t-fg); }
.tk-textarea::placeholder { color: var(--t-muted); }

.tk-field { margin-bottom: 22px; }

.tk-btn-primary {
  display: inline-flex; align-items: center; justify-content: center; gap: 9px;
  height: 44px; padding: 0 28px;
  background: var(--t-fg); color: var(--t-bg); border: none; cursor: pointer;
  font-family: 'EB Garamond', serif; font-style: italic;
  font-size: 18px; letter-spacing: 0.05em;
  transition: opacity 0.2s, transform 0.15s;
}
.tk-btn-primary:hover { opacity: 0.82; }
.tk-btn-primary:active { transform: scale(0.98); }
.tk-btn-primary:disabled { opacity: 0.35; cursor: not-allowed; }

.tk-btn-ghost {
  display: inline-flex; align-items: center; justify-content: center; gap: 8px;
  height: 38px; padding: 0 18px;
  background: transparent; color: var(--t-muted);
  border: 1px solid var(--t-lite); cursor: pointer;
  font-family: 'DM Mono', monospace; font-size: 11px;
  letter-spacing: 0.16em; text-transform: uppercase;
  transition: all 0.2s;
}
.tk-btn-ghost:hover { border-color: var(--t-fg); color: var(--t-fg); }
.tk-btn-ghost.danger:hover { border-color: var(--t-dn); color: var(--t-dn); }
.tk-btn-ghost:disabled { opacity: 0.35; cursor: not-allowed; }

.tk-btn-row {
  display: flex; align-items: center; gap: 10px; flex-wrap: wrap; margin-top: 6px;
}

/* ── Result block ── */
.tk-result {
  background: var(--t-surf); border: 1px solid var(--t-lite);
  padding: 16px 18px; margin-top: 16px;
}
.tk-result-label {
  font-family: 'DM Mono', monospace;
  font-size: 11px; letter-spacing: 0.18em; text-transform: uppercase;
  color: var(--t-muted); margin-bottom: 10px;
}
.tk-mono {
  font-family: 'DM Mono', monospace; font-size: 12px;
  color: var(--t-fg); word-break: break-all; line-height: 1.8;
}
.tk-mono.up { color: var(--t-up); }
.tk-mono.dn { color: var(--t-dn); }
.tk-mono.warn {
  color: var(--t-dn); padding: 10px 12px;
  border: 1px solid rgba(122,40,40,0.2);
  background: rgba(122,40,40,0.04);
}

/* ── Copy pill ── */
.tk-copy {
  display: inline-flex; align-items: center; gap: 5px;
  background: none; border: 1px solid var(--t-lite); padding: 4px 10px;
  font-family: 'DM Mono', monospace; font-size: 11px;
  letter-spacing: 0.1em; text-transform: uppercase;
  color: var(--t-muted); cursor: pointer; transition: all 0.2s;
  white-space: nowrap; flex-shrink: 0;
}
.tk-copy:hover { border-color: var(--t-fg); color: var(--t-fg); }
.tk-copy.done  { border-color: var(--t-up); color: var(--t-up); }

.tk-row { display: flex; align-items: flex-start; gap: 10px; }
.tk-col { flex: 1; min-width: 0; }

/* ── Tables ── */
.tk-table { width: 100%; border-collapse: collapse; }
.tk-table th {
  font-family: 'DM Mono', monospace;
  font-size: 11px; letter-spacing: 0.16em; text-transform: uppercase;
  color: var(--t-muted); font-weight: 400; text-align: left;
  padding: 8px 12px; border-bottom: 1px solid var(--t-lite);
}
.tk-table td {
  font-family: 'EB Garamond', serif; font-size: 15px;
  color: var(--t-fg); padding: 12px 12px;
  border-bottom: 1px solid var(--t-lite);
  vertical-align: middle;
}
.tk-table tr:last-child td { border-bottom: none; }
.tk-table tr:hover td { background: var(--t-surf); }
.tk-table td.mono { font-family: 'DM Mono', monospace; font-size: 12px; }

/* ── Contact card ── */
.tk-contact-card {
  border: 1px solid var(--t-lite); background: var(--t-card);
  display: flex; align-items: center; gap: 14px;
  padding: 14px 16px; margin-bottom: 6px;
  transition: border-color 0.2s;
}
.tk-contact-card:hover { border-color: var(--t-border); }
.tk-avatar {
  width: 40px; height: 40px; border: 1px solid var(--t-lite);
  background: var(--t-surf); display: flex; align-items: center;
  justify-content: center; font-size: 20px; flex-shrink: 0;
}

/* ── Emoji picker ── */
.tk-emoji-grid {
  display: grid; grid-template-columns: repeat(8, 36px); gap: 4px; margin-top: 8px;
}
.tk-emoji-btn {
  width: 36px; height: 36px; background: var(--t-surf); border: 1px solid var(--t-lite);
  cursor: pointer; font-size: 18px; display: flex; align-items: center;
  justify-content: center; transition: all 0.15s;
}
.tk-emoji-btn:hover  { border-color: var(--t-fg); }
.tk-emoji-btn.picked { border-color: var(--t-fg); background: var(--t-fg); }

/* ── Drag-drop zone ── */
.tk-dropzone {
  border: 1px dashed var(--t-border); padding: 36px 24px;
  text-align: center; cursor: pointer; transition: all 0.25s;
  background: transparent;
}
.tk-dropzone:hover, .tk-dropzone.drag-over {
  border-color: var(--t-fg); background: var(--t-surf);
}
.tk-dropzone-label {
  font-family: 'EB Garamond', serif; font-size: 17px;
  font-style: italic; color: var(--t-muted); margin-bottom: 6px;
}
.tk-dropzone-hint {
  font-family: 'DM Mono', monospace; font-size: 11px;
  letter-spacing: 0.14em; text-transform: uppercase; color: var(--t-muted);
}

/* ── Status badges ── */
.tk-badge {
  display: inline-flex; align-items: center; gap: 5px;
  padding: 3px 9px; font-family: 'DM Mono', monospace;
  font-size: 11px; letter-spacing: 0.12em; text-transform: uppercase;
  border: 1px solid;
}
.tk-badge.ok   { color: var(--t-up); border-color: rgba(42,107,63,0.3); background: rgba(42,107,63,0.06); }
.tk-badge.fail { color: var(--t-dn); border-color: rgba(122,40,40,0.3); background: rgba(122,40,40,0.06); }
.tk-badge.info { color: var(--t-muted); border-color: var(--t-lite); background: var(--t-surf); }

/* ── Filter bar ── */
.tk-filter-bar {
  display: flex; gap: 8px; flex-wrap: wrap; margin-bottom: 20px;
}
.tk-filter-chip {
  padding: 6px 14px; background: transparent; border: 1px solid var(--t-lite);
  font-family: 'DM Mono', monospace; font-size: 11px;
  letter-spacing: 0.1em; text-transform: uppercase; color: var(--t-muted);
  cursor: pointer; transition: all 0.15s;
}
.tk-filter-chip:hover { border-color: var(--t-fg); color: var(--t-fg); }
.tk-filter-chip.active { background: var(--t-fg); color: var(--t-bg); border-color: var(--t-fg); }

/* ── Multisig flow ── */
.tk-signer-row {
  display: flex; align-items: center; gap: 14px;
  padding: 14px 16px; border: 1px solid var(--t-lite);
  margin-bottom: 6px; background: var(--t-card); transition: all 0.2s;
}
.tk-signer-row.signed { border-color: rgba(42,107,63,0.35); background: rgba(42,107,63,0.04); }
.tk-sig-dot {
  width: 10px; height: 10px; border: 1.5px solid var(--t-border); border-radius: 50%;
  flex-shrink: 0; transition: all 0.3s;
}
.tk-sig-dot.done { background: var(--t-up); border-color: var(--t-up); }

/* ── SVG Charts ── */
.tk-chart-wrap {
  border: 1px solid var(--t-lite); padding: 20px;
  background: var(--t-card); margin-bottom: 16px;
}
.tk-chart-label {
  font-family: 'DM Mono', monospace; font-size: 11px;
  letter-spacing: 0.2em; text-transform: uppercase;
  color: var(--t-muted); margin-bottom: 14px;
}

/* ── Stat pair ── */
.tk-stats-row {
  display: grid; grid-template-columns: repeat(3, 1fr);
  border: 1px solid var(--t-lite); margin-bottom: 28px;
}
@media (max-width: 480px) { .tk-stats-row { grid-template-columns: repeat(2, 1fr); } }
.tk-stat-cell {
  padding: 20px 18px; border-right: 1px solid var(--t-lite);
}
.tk-stat-cell:last-child { border-right: none; }
.tk-stat-val {
  font-family: 'Playfair Display', serif;
  font-size: 28px; font-weight: 700; color: var(--t-fg);
  letter-spacing: -0.02em; line-height: 1; margin-bottom: 5px;
}
.tk-stat-label {
  font-family: 'DM Mono', monospace; font-size: 11px;
  letter-spacing: 0.16em; text-transform: uppercase; color: var(--t-muted);
}

/* Spin */
@keyframes tk-spin { to { transform: rotate(360deg); } }
.tk-spin { animation: tk-spin 1s linear infinite; display: inline-block; }

/* ── Search input ── */
.tk-search-wrap { position: relative; margin-bottom: 20px; }
.tk-search-ico { position: absolute; left: 0; top: 50%; transform: translateY(-50%); color: var(--t-muted); pointer-events: none; }
.tk-search {
  width: 100%; background: transparent; border: none;
  border-bottom: 1px solid var(--t-lite);
  padding: 10px 0 10px 24px; font-family: 'EB Garamond', serif;
  font-size: 16px; font-style: italic; color: var(--t-fg); outline: none;
  transition: border-color 0.25s;
}
.tk-search:focus { border-bottom-color: var(--t-fg); }
.tk-search::placeholder { color: var(--t-muted); }

/* ── Two-col form grid ── */
.tk-form-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 16px; }
@media (max-width: 480px) { .tk-form-grid { grid-template-columns: 1fr; } }
`;

/* ══════════════════════════════════════════════════════════════ */
/*  SVG ICONS                                                     */
/* ══════════════════════════════════════════════════════════════ */
const Ic = {
  Search: () => <svg width="14" height="14" viewBox="0 0 14 14" fill="none"><circle cx="6" cy="6" r="4.5" stroke="currentColor" strokeWidth="1.2"/><line x1="9.5" y1="9.5" x2="13" y2="13" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round"/></svg>,
  Plus:   () => <svg width="13" height="13" viewBox="0 0 13 13" fill="none"><line x1="6.5" y1="1" x2="6.5" y2="12" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round"/><line x1="1" y1="6.5" x2="12" y2="6.5" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round"/></svg>,
  Edit:   () => <svg width="13" height="13" viewBox="0 0 13 13" fill="none"><path d="M2 10 8.5 3.5l2 2L4 12H2v-2z" stroke="currentColor" strokeWidth="1.2" strokeLinejoin="round"/><line x1="7.5" y1="4.5" x2="9.5" y2="2.5" stroke="currentColor" strokeWidth="1.2"/></svg>,
  Trash:  () => <svg width="13" height="13" viewBox="0 0 13 13" fill="none"><line x1="1" y1="3" x2="12" y2="3" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round"/><path d="M2 3l.8 8.2h7.4L11 3" stroke="currentColor" strokeWidth="1.2"/><line x1="5" y1="5.5" x2="5" y2="10" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round"/><line x1="8" y1="5.5" x2="8" y2="10" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round"/><path d="M4.5 3V1.5h4V3" stroke="currentColor" strokeWidth="1.2"/></svg>,
  Copy:   () => <svg width="13" height="13" viewBox="0 0 13 13" fill="none"><rect x="1" y="3" width="9" height="9" stroke="currentColor" strokeWidth="1.2"/><path d="M3 3V1h9v9H10" stroke="currentColor" strokeWidth="1.2"/></svg>,
  Check:  () => <svg width="13" height="13" viewBox="0 0 13 13" fill="none"><polyline points="2,6.5 5,9.5 11,3" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/></svg>,
  File:   () => <svg width="14" height="16" viewBox="0 0 14 16" fill="none"><path d="M2 1h7l3 3v11H2V1z" stroke="currentColor" strokeWidth="1.2"/><polyline points="8,1 8,5 12,5" stroke="currentColor" strokeWidth="1.2"/></svg>,
  Send:   () => <svg width="13" height="13" viewBox="0 0 13 13" fill="none"><line x1="1.5" y1="11.5" x2="11.5" y2="1.5" stroke="currentColor" strokeWidth="1.3"/><polyline points="5,1.5 11.5,1.5 11.5,8" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round"/></svg>,
  Chevron:({ d = "down" }: { d?: "up"|"down"|"right" }) => {
    const pts = d==="right"?"3,1 7,6.5 3,12":d==="up"?"1,7 6.5,2 12,7":"1,4 6.5,9 12,4";
    return <svg width="12" height="12" viewBox="0 0 12 12" fill="none"><polyline points={pts} stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round"/></svg>;
  },
  Msg:    () => <svg width="14" height="13" viewBox="0 0 14 13" fill="none"><path d="M1 1h12v9H7.5L4 12v-2H1V1z" stroke="currentColor" strokeWidth="1.2"/></svg>,
  X:      () => <svg width="12" height="12" viewBox="0 0 12 12" fill="none"><line x1="1" y1="1" x2="11" y2="11" stroke="currentColor" strokeWidth="1.3"/><line x1="11" y1="1" x2="1" y2="11" stroke="currentColor" strokeWidth="1.3"/></svg>,
};

/* ══════════════════════════════════════════════════════════════ */
/*  TOOL I — CONTACT MANAGER                                      */
/* ══════════════════════════════════════════════════════════════ */
function ContactManager({ walletAddr }: { walletAddr: string }) {
  const router = useRouter();
  const { contacts, addContact, updateContact, removeContact } = useContactsStore();
  const [search,  setSearch]  = useState("");
  const [editId,  setEditId]  = useState<string|null>(null);
  const [showForm,setShowForm]= useState(false);
  const [form, setForm]       = useState({ name:"", address:"", note:"", emoji:"🦊" });
  const [copiedId,setCopiedId]= useState<string|null>(null);

  const filtered = search
    ? contacts.filter(c => c.name.toLowerCase().includes(search.toLowerCase()) || c.address.toLowerCase().includes(search.toLowerCase()))
    : contacts;

  const openAdd = () => { setEditId(null); setForm({ name:"",address:"",note:"",emoji:"🦊" }); setShowForm(true); };
  const openEdit = (c: Contact) => { setEditId(c.id); setForm({ name:c.name, address:c.address, note:c.note||"", emoji:c.emoji||"🦊" }); setShowForm(true); };
  const save = () => {
    if (!form.name.trim()) { toast.error("Name is required"); return; }
    if (!ethers.isAddress(form.address.trim())) { toast.error("Invalid wallet address"); return; }
    if (editId) { updateContact(editId, { name:form.name.trim(), address:form.address.trim(), note:form.note.trim(), emoji:form.emoji }); toast.success("Contact updated"); }
    else { addContact({ name:form.name.trim(), address:form.address.trim(), note:form.note.trim(), emoji:form.emoji }); toast.success("Contact added"); }
    setShowForm(false); setEditId(null);
  };
  const del = (id:string, name:string) => { if (confirm(`Remove "${name}"?`)) { removeContact(id); toast.success("Removed"); } };
  const copy = (addr:string, id:string) => { navigator.clipboard.writeText(addr); setCopiedId(id); setTimeout(()=>setCopiedId(null),2000); };

  return (
    <div>
      {/* Stats */}
      <div className="tk-stats-row">
        <div className="tk-stat-cell"><div className="tk-stat-val">{contacts.length}</div><div className="tk-stat-label">Contacts</div></div>
        <div className="tk-stat-cell"><div className="tk-stat-val">{filtered.length}</div><div className="tk-stat-label">Shown</div></div>
        <div className="tk-stat-cell"><div className="tk-stat-val">{contacts.filter(c=>c.note).length}</div><div className="tk-stat-label">With Notes</div></div>
      </div>

      {/* Search + Add */}
      <div style={{ display:"flex", gap:10, marginBottom:20, alignItems:"flex-end" }}>
        <div className="tk-search-wrap" style={{ flex:1, marginBottom:0 }}>
          <Ic.Search /><span className="tk-search-ico" style={{ left:0, pointerEvents:"none" }}/>
          <input value={search} onChange={e=>setSearch(e.target.value)} placeholder="Search contacts…"
            className="tk-search" style={{ paddingLeft:24 }} />
        </div>
        <button className="tk-btn-primary" style={{ height:38, padding:"0 18px", fontSize:15 }} onClick={openAdd}>
          <Ic.Plus /> Add
        </button>
      </div>

      {/* Form */}
      <AnimatePresence>
        {showForm && (
          <motion.div initial={{ height:0, opacity:0 }} animate={{ height:"auto", opacity:1 }} exit={{ height:0, opacity:0 }}
            style={{ overflow:"hidden", marginBottom:24 }}>
            <div style={{ border:"1px solid var(--t-lite)", padding:"24px 22px", background:"var(--t-card)" }}>
              <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:18 }}>
                <span style={{ fontFamily:MONO, fontSize:11, letterSpacing:"0.2em", textTransform:"uppercase", color:"var(--t-muted)" }}>
                  {editId ? "Edit Contact" : "New Contact"}
                </span>
                <button onClick={()=>setShowForm(false)} style={{ background:"none", border:"none", cursor:"pointer", color:"var(--t-muted)" }}><Ic.X /></button>
              </div>
              <div className="tk-form-grid">
                <div className="tk-field">
                  <label className="tk-label">Name</label>
                  <input value={form.name} onChange={e=>setForm(f=>({...f,name:e.target.value}))} placeholder="Alice" className="tk-input" />
                </div>
                <div className="tk-field">
                  <label className="tk-label">Wallet Address</label>
                  <input value={form.address} onChange={e=>setForm(f=>({...f,address:e.target.value}))} placeholder="0x…"
                    className={`tk-input ${form.address ? (ethers.isAddress(form.address.trim())?"valid":"invalid") : ""}`} />
                </div>
              </div>
              <div className="tk-field">
                <label className="tk-label">Note (optional)</label>
                <input value={form.note} onChange={e=>setForm(f=>({...f,note:e.target.value}))} placeholder="Personal wallet, trading, etc." className="tk-input" />
              </div>
              <div className="tk-field">
                <label className="tk-label">Avatar</label>
                <div className="tk-emoji-grid">
                  {EMOJIS.map(e=>(
                    <button key={e} className={`tk-emoji-btn ${form.emoji===e?"picked":""}`}
                      onClick={()=>setForm(f=>({...f,emoji:e}))}>{e}</button>
                  ))}
                </div>
              </div>
              <div className="tk-btn-row">
                <button className="tk-btn-primary" onClick={save}><Ic.Check /> {editId?"Update":"Save Contact"}</button>
                <button className="tk-btn-ghost" onClick={()=>setShowForm(false)}>Cancel</button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* List */}
      {filtered.length === 0
        ? <p style={{ fontFamily:SERIF, fontSize:16, fontStyle:"italic", color:"var(--t-muted)", padding:"32px 0", textAlign:"center" }}>
            {search ? "No matching contacts." : "No contacts yet. Add one above."}
          </p>
        : filtered.map(c => (
          <motion.div key={c.id} className="tk-contact-card" layout
            initial={{ opacity:0, y:8 }} animate={{ opacity:1, y:0 }}>
            <div className="tk-avatar">{c.emoji}</div>
            <div style={{ flex:1, minWidth:0 }}>
              <p style={{ fontFamily:SERIF, fontSize:16, color:"var(--t-fg)", marginBottom:3 }}>{c.name}</p>
              <p style={{ fontFamily:MONO, fontSize:11, color:"var(--t-muted)", overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap" }}>
                {c.address}
              </p>
              {c.note && <p style={{ fontFamily:SERIF, fontSize:13, fontStyle:"italic", color:"var(--t-muted)", marginTop:2 }}>{c.note}</p>}
            </div>
            <div style={{ display:"flex", gap:6, flexShrink:0 }}>
              <button className={`tk-copy ${copiedId===c.id?"done":""}`} onClick={()=>copy(c.address,c.id)}>
                {copiedId===c.id ? <Ic.Check/> : <Ic.Copy/>}
              </button>
              <button className="tk-btn-ghost" style={{ height:32, padding:"0 10px" }}
                onClick={()=>router.push(`/messages?to=${c.address}`)}>
                <Ic.Msg />
              </button>
              <button className="tk-btn-ghost" style={{ height:32, padding:"0 10px" }} onClick={()=>openEdit(c)}>
                <Ic.Edit />
              </button>
              <button className="tk-btn-ghost danger" style={{ height:32, padding:"0 10px" }} onClick={()=>del(c.id,c.name)}>
                <Ic.Trash />
              </button>
            </div>
          </motion.div>
        ))}
    </div>
  );
}

/* ══════════════════════════════════════════════════════════════ */
/*  TOOL II — ADDRESS EXPLORER                                    */
/* ══════════════════════════════════════════════════════════════ */
function AddressExplorer() {
  const { contract } = useStore();
  const [addr,    setAddr]    = useState("");
  const [loading, setLoading] = useState(false);
  const [data,    setData]    = useState<{ balance:string; txCount:number; isContract:boolean } | null>(null);

  const lookup = async () => {
    if (!ethers.isAddress(addr.trim())) { toast.error("Invalid address"); return; }
    setLoading(true); setData(null);
    try {
      const provider = (contract as any)?.runner?.provider ?? new ethers.JsonRpcProvider(NETWORK_CONFIG.rpcUrl);
      const [rawBal, txCount, code] = await Promise.all([
        provider.getBalance(addr.trim()),
        provider.getTransactionCount(addr.trim()),
        provider.getCode(addr.trim()),
      ]);
      setData({ balance: ethers.formatEther(rawBal), txCount, isContract: code !== "0x" });
    } catch (e:any) { toast.error("Lookup failed — check RPC"); }
    finally { setLoading(false); }
  };

  const isValid = ethers.isAddress(addr.trim());

  return (
    <div>
      <div className="tk-field">
        <label className="tk-label">Wallet or Contract Address</label>
        <div className="tk-row" style={{ alignItems:"flex-end" }}>
          <input value={addr} onChange={e=>setAddr(e.target.value)}
            onKeyDown={e=>e.key==="Enter"&&lookup()}
            placeholder="0x…" className={`tk-input ${addr?(isValid?"valid":"invalid"):""}`}
            style={{ flex:1 }} />
          <button className="tk-btn-primary" style={{ marginLeft:10, height:38, padding:"0 20px", fontSize:15, flexShrink:0 }}
            onClick={lookup} disabled={!isValid||loading}>
            {loading ? <span className="tk-spin">◌</span> : "Inspect"}
          </button>
        </div>
      </div>

      <AnimatePresence>
        {data && (
          <motion.div initial={{ opacity:0, y:12 }} animate={{ opacity:1, y:0 }} transition={{ duration:0.4, ease:EASE }}>
            <div className="tk-stats-row">
              <div className="tk-stat-cell">
                <div className="tk-stat-val">{parseFloat(data.balance).toFixed(4)}</div>
                <div className="tk-stat-label">{NETWORK_CONFIG.tokenSymbol} Balance</div>
              </div>
              <div className="tk-stat-cell">
                <div className="tk-stat-val">{data.txCount.toLocaleString()}</div>
                <div className="tk-stat-label">Transactions</div>
              </div>
              <div className="tk-stat-cell">
                <div className="tk-stat-val">{data.isContract ? "Smart" : "EOA"}</div>
                <div className="tk-stat-label">Account Type</div>
              </div>
            </div>

            <div className="tk-result">
              <div className="tk-result-label">Address Details</div>
              <table className="tk-table">
                <tbody>
                  <tr><td style={{ width:160 }}><span className="tk-label" style={{ margin:0 }}>Address</span></td>
                    <td className="mono">{addr.trim()}</td></tr>
                  <tr><td><span className="tk-label" style={{ margin:0 }}>Balance</span></td>
                    <td>{parseFloat(data.balance).toFixed(6)} {NETWORK_CONFIG.tokenSymbol}</td></tr>
                  <tr><td><span className="tk-label" style={{ margin:0 }}>Nonce / Tx Count</span></td>
                    <td>{data.txCount}</td></tr>
                  <tr><td><span className="tk-label" style={{ margin:0 }}>Type</span></td>
                    <td><span className={`tk-badge ${data.isContract?"info":"ok"}`}>
                      {data.isContract ? "Smart Contract" : "Externally Owned Account"}
                    </span></td></tr>
                  <tr><td><span className="tk-label" style={{ margin:0 }}>Network</span></td>
                    <td>{NETWORK_CONFIG.name} — Chain {NETWORK_CONFIG.chainId}</td></tr>
                </tbody>
              </table>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

/* ══════════════════════════════════════════════════════════════ */
/*  TOOL III — TX HISTORY EXPLORER                               */
/* ══════════════════════════════════════════════════════════════ */
function TxHistory({ walletAddr }: { walletAddr: string }) {
  const { getActivities } = useActivityStore();
  const [search,  setSearch]  = useState("");
  const [filter,  setFilter]  = useState("all");

  const all = useMemo(() => getActivities(walletAddr), [walletAddr, getActivities]);
  const TYPES = ["all","transfer_out","transfer_in","market_buy","market_sell","message_sent","message_received"];

  const shown = all.filter(a => {
    const matchType = filter==="all" || a.type===filter;
    const matchQ    = !search || a.title.toLowerCase().includes(search.toLowerCase()) || (a.description||"").toLowerCase().includes(search.toLowerCase()) || (a.address||"").toLowerCase().includes(search.toLowerCase());
    return matchType && matchQ;
  });

  const typeLabel = (t:string) => ({ transfer_out:"Sent",transfer_in:"Received",market_buy:"Bought",market_sell:"Sold",message_sent:"Sent Msg",message_received:"Rcvd Msg" }[t] || t);
  const typeBadge = (t:string) => ["transfer_out","market_sell","message_sent"].includes(t) ? "fail" : "ok";

  return (
    <div>
      <div className="tk-stats-row">
        <div className="tk-stat-cell"><div className="tk-stat-val">{all.length}</div><div className="tk-stat-label">Total Events</div></div>
        <div className="tk-stat-cell"><div className="tk-stat-val">{all.filter(a=>a.type==="transfer_out"||a.type==="transfer_in").length}</div><div className="tk-stat-label">Transfers</div></div>
        <div className="tk-stat-cell"><div className="tk-stat-val">{shown.length}</div><div className="tk-stat-label">Filtered</div></div>
      </div>

      <div className="tk-search-wrap">
        <span className="tk-search-ico"><Ic.Search /></span>
        <input value={search} onChange={e=>setSearch(e.target.value)} placeholder="Search transactions…" className="tk-search" />
      </div>

      <div className="tk-filter-bar">
        {TYPES.map(t=>(
          <button key={t} className={`tk-filter-chip ${filter===t?"active":""}`} onClick={()=>setFilter(t)}>
            {t==="all"?"All":typeLabel(t)}
          </button>
        ))}
      </div>

      {shown.length === 0
        ? <p style={{ fontFamily:SERIF, fontSize:16, fontStyle:"italic", color:"var(--t-muted)", padding:"32px 0", textAlign:"center" }}>
            No matching transactions.
          </p>
        : <div style={{ border:"1px solid var(--t-lite)" }}>
            <table className="tk-table">
              <thead>
                <tr>
                  <th>Event</th>
                  <th>Description</th>
                  <th>Type</th>
                  <th>Time</th>
                </tr>
              </thead>
              <tbody>
                {shown.map((a,i) => (
                  <tr key={i}>
                    <td style={{ fontFamily:SERIF, fontSize:15, fontWeight:500 }}>{a.title}</td>
                    <td style={{ fontFamily:SERIF, fontSize:14, color:"var(--t-muted)", maxWidth:240 }}>
                      <span style={{ overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap", display:"block" }}>
                        {a.description || "—"}
                      </span>
                    </td>
                    <td><span className={`tk-badge ${typeBadge(a.type)}`}>{typeLabel(a.type)}</span></td>
                    <td className="mono" style={{ whiteSpace:"nowrap", fontSize:11 }}>
                      {new Date(a.timestamp).toLocaleDateString("en-GB",{day:"numeric",month:"short",hour:"2-digit",minute:"2-digit"})}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
      }
    </div>
  );
}

/* ══════════════════════════════════════════════════════════════ */
/*  TOOL IV — SIGN DOCUMENT                                       */
/* ══════════════════════════════════════════════════════════════ */
function SignDocument({ wallet, signer }: { wallet:any; signer:any }) {
  const [file,      setFile]      = useState<File|null>(null);
  const [hash,      setHash]      = useState("");
  const [sig,       setSig]       = useState("");
  const [verifyAddr,setVerifyAddr]= useState("");
  const [verified,  setVerified]  = useState<boolean|null>(null);
  const [busy,      setBusy]      = useState(false);
  const [phase,     setPhase]     = useState<"idle"|"hashed"|"signed">("idle");
  const [dragOver,  setDragOver]  = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  const hashFile = async (f: File) => {
    setFile(f); setHash(""); setSig(""); setVerified(null); setPhase("idle");
    const buf  = await f.arrayBuffer();
    const raw  = await crypto.subtle.digest("SHA-256", buf);
    const hex  = "0x" + Array.from(new Uint8Array(raw)).map(b=>b.toString(16).padStart(2,"0")).join("");
    setHash(hex); setPhase("hashed");
    toast.success("File hashed — ready to sign");
  };

  const sign = async () => {
    if (!hash || !signer) return;
    setBusy(true);
    try {
      const signature = await (signer as ethers.Wallet).signMessage(hash);
      setSig(signature); setPhase("signed");
      toast.success("Document signed");
    } catch(e:any) { toast.error(e.message||"Signing failed"); }
    finally { setBusy(false); }
  };

  const verify = () => {
    if (!hash || !sig) return;
    try {
      const recovered = ethers.verifyMessage(hash, sig);
      const matches   = recovered.toLowerCase() === verifyAddr.trim().toLowerCase();
      setVerified(matches);
    } catch { setVerified(false); }
  };

  const onDrop = (e: React.DragEvent) => {
    e.preventDefault(); setDragOver(false);
    const f = e.dataTransfer.files[0];
    if (f) hashFile(f);
  };

  return (
    <div>
      {/* Step 1: upload */}
      <div className="tk-section">
        <div className="tk-section-title">Step 1 — Upload Document</div>
        <div className={`tk-dropzone ${dragOver?"drag-over":""}`}
          onDragOver={e=>{e.preventDefault();setDragOver(true)}}
          onDragLeave={()=>setDragOver(false)}
          onDrop={onDrop}
          onClick={()=>fileRef.current?.click()}>
          <div style={{ fontSize:28, marginBottom:10 }}><Ic.File /></div>
          <p className="tk-dropzone-label">{file ? file.name : "Drop a file here, or click to browse"}</p>
          <p className="tk-dropzone-hint">{file ? `${(file.size/1024).toFixed(1)} KB · ${file.type||"unknown type"}` : "PDF, DOC, TXT, any format"}</p>
        </div>
        <input ref={fileRef} type="file" style={{ display:"none" }} onChange={e=>e.target.files?.[0]&&hashFile(e.target.files[0])} />
      </div>

      {/* Step 2: hash result */}
      {hash && (
        <motion.div initial={{ opacity:0, y:8 }} animate={{ opacity:1, y:0 }} className="tk-section">
          <div className="tk-section-title">Step 2 — SHA-256 Hash</div>
          <div className="tk-result">
            <div className="tk-result-label">File fingerprint (SHA-256)</div>
            <div className="tk-row">
              <div className="tk-mono" style={{ flex:1 }}>{hash}</div>
              <button className="tk-copy" onClick={()=>{navigator.clipboard.writeText(hash);toast.success("Copied")}}><Ic.Copy /></button>
            </div>
          </div>

          {!wallet && <p style={{ fontFamily:SERIF, fontSize:14, fontStyle:"italic", color:"var(--t-dn)", marginTop:12 }}>Connect wallet to sign</p>}
          {wallet && phase==="hashed" && (
            <div className="tk-btn-row" style={{ marginTop:16 }}>
              <button className="tk-btn-primary" onClick={sign} disabled={busy}>
                {busy ? <span className="tk-spin">◌</span> : <Ic.Send />}
                {busy ? "Signing…" : "Sign with Wallet"}
              </button>
            </div>
          )}
        </motion.div>
      )}

      {/* Step 3: signature */}
      {sig && (
        <motion.div initial={{ opacity:0, y:8 }} animate={{ opacity:1, y:0 }} className="tk-section">
          <div className="tk-section-title">Step 3 — Signature</div>
          <div className="tk-result">
            <div className="tk-result-label">EIP-191 Signature</div>
            <div className="tk-row">
              <div className="tk-mono" style={{ flex:1, wordBreak:"break-all" }}>{sig}</div>
              <button className="tk-copy" onClick={()=>{navigator.clipboard.writeText(sig);toast.success("Copied")}}><Ic.Copy /></button>
            </div>
          </div>

          <div className="tk-section-title" style={{ marginTop:24 }}>Step 4 — Verify Signer</div>
          <div className="tk-field">
            <label className="tk-label">Expected Signer Address</label>
            <input value={verifyAddr} onChange={e=>setVerifyAddr(e.target.value)} placeholder="0x…" className="tk-input" />
          </div>
          <button className="tk-btn-primary" onClick={verify} disabled={!verifyAddr.trim()}>
            <Ic.Check /> Verify Signature
          </button>
          {verified !== null && (
            <motion.div initial={{ opacity:0 }} animate={{ opacity:1 }} style={{ marginTop:14 }}>
              <span className={`tk-badge ${verified?"ok":"fail"}`}>
                {verified ? "✓ Signature matches — document is authentic" : "✗ Signature mismatch"}
              </span>
            </motion.div>
          )}
        </motion.div>
      )}
    </div>
  );
}

/* ══════════════════════════════════════════════════════════════ */
/*  TOOL V — HASH VERIFIER                                        */
/* ══════════════════════════════════════════════════════════════ */
function HashVerifier() {
  const [file,      setFile]      = useState<File|null>(null);
  const [computed,  setComputed]  = useState("");
  const [expected,  setExpected]  = useState("");
  const [result,    setResult]    = useState<"match"|"mismatch"|null>(null);
  const [loading,   setLoading]   = useState(false);
  const [dragOver,  setDragOver]  = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  const hashFile = async (f: File) => {
    setFile(f); setComputed(""); setResult(null); setLoading(true);
    try {
      const buf = await f.arrayBuffer();
      const raw = await crypto.subtle.digest("SHA-256", buf);
      const hex = Array.from(new Uint8Array(raw)).map(b=>b.toString(16).padStart(2,"0")).join("");
      setComputed(hex);
    } catch { toast.error("Hash computation failed"); }
    finally { setLoading(false); }
  };

  const compare = () => {
    if (!computed || !expected.trim()) return;
    const clean = expected.trim().replace(/^0x/,"").toLowerCase();
    setResult(clean === computed ? "match" : "mismatch");
  };

  return (
    <div>
      <div className="tk-section">
        <div className="tk-section-title">Upload File to Hash</div>
        <div className={`tk-dropzone ${dragOver?"drag-over":""}`}
          onDragOver={e=>{e.preventDefault();setDragOver(true)}}
          onDragLeave={()=>setDragOver(false)}
          onDrop={e=>{e.preventDefault();setDragOver(false);const f=e.dataTransfer.files[0];if(f)hashFile(f);}}
          onClick={()=>fileRef.current?.click()}>
          <div style={{ fontSize:28, marginBottom:10 }}><Ic.File /></div>
          <p className="tk-dropzone-label">{file ? file.name : "Drop file here or click to browse"}</p>
          <p className="tk-dropzone-hint">{file?`${(file.size/1024).toFixed(1)} KB`:"Any file type accepted"}</p>
        </div>
        <input ref={fileRef} type="file" style={{ display:"none" }} onChange={e=>e.target.files?.[0]&&hashFile(e.target.files[0])} />
      </div>

      {loading && <p style={{ fontFamily:MONO, fontSize:12, color:"var(--t-muted)" }}><span className="tk-spin">◌</span> Computing…</p>}

      {computed && (
        <motion.div initial={{ opacity:0, y:8 }} animate={{ opacity:1, y:0 }}>
          <div className="tk-result" style={{ marginBottom:16 }}>
            <div className="tk-result-label">Computed SHA-256</div>
            <div className="tk-row">
              <div className="tk-mono" style={{ flex:1 }}>{computed}</div>
              <button className="tk-copy" onClick={()=>{navigator.clipboard.writeText(computed);toast.success("Copied")}}><Ic.Copy /></button>
            </div>
          </div>

          <div className="tk-section">
            <div className="tk-section-title">Compare Against Known Hash</div>
            <div className="tk-field">
              <label className="tk-label">Expected Hash (hex, with or without 0x)</label>
              <input value={expected} onChange={e=>setExpected(e.target.value)}
                placeholder="sha256 hash to compare…" className="tk-input" />
            </div>
            <button className="tk-btn-primary" onClick={compare} disabled={!expected.trim()}>
              Compare Hashes
            </button>
            {result && (
              <motion.div initial={{ opacity:0 }} animate={{ opacity:1 }} style={{ marginTop:14 }}>
                <span className={`tk-badge ${result==="match"?"ok":"fail"}`}>
                  {result==="match" ? "✓ Hashes match — file is unmodified" : "✗ Hash mismatch — file may have been altered"}
                </span>
              </motion.div>
            )}
          </div>
        </motion.div>
      )}
    </div>
  );
}

/* ══════════════════════════════════════════════════════════════ */
/*  TOOL VI — MULTI-SIGNER                                        */
/* ══════════════════════════════════════════════════════════════ */
function MultiSigner({ wallet, signer }: { wallet:any; signer:any }) {
  const [message,   setMessage]   = useState("");
  const [threshold, setThreshold] = useState(2);
  const [signers,   setSigners]   = useState([
    { label:"Signer A (You)",    addr: wallet?.address||"",    signed:false, sig:"", isYou:true  },
    { label:"Signer B",          addr: "",                     signed:false, sig:"", isYou:false },
    { label:"Signer C",          addr: "",                     signed:false, sig:"", isYou:false },
  ]);
  const [busy, setBusy] = useState(false);

  const signAs = async (idx: number) => {
    if (!message.trim() || !signer) return;
    setBusy(true);
    try {
      const sig = await (signer as ethers.Wallet).signMessage(`[Multisig Proposal]\n\n${message}`);
      setSigners(prev => prev.map((s,i)=>i===idx?{...s,signed:true,sig}:s));
      toast.success(`${signers[idx].label} signed`);
    } catch(e:any) { toast.error(e.message||"Failed"); }
    finally { setBusy(false); }
  };

  const signedCount = signers.filter(s=>s.signed).length;
  const approved    = signedCount >= threshold;
  const msgHash     = message ? ethers.keccak256(ethers.toUtf8Bytes(`[Multisig Proposal]\n\n${message}`)) : "";

  return (
    <div>
      <div className="tk-stats-row">
        <div className="tk-stat-cell"><div className="tk-stat-val">{signedCount}/{threshold}</div><div className="tk-stat-label">Signatures</div></div>
        <div className="tk-stat-cell"><div className="tk-stat-val">{threshold}</div><div className="tk-stat-label">Required</div></div>
        <div className="tk-stat-cell"><div className="tk-stat-val">{approved?"Yes":"No"}</div><div className="tk-stat-label">Approved</div></div>
      </div>

      <div className="tk-section">
        <div className="tk-section-title">Proposal Message</div>
        <div className="tk-field">
          <label className="tk-label">Message / Proposal</label>
          <textarea value={message} onChange={e=>setMessage(e.target.value)}
            placeholder="Describe the transaction or proposal requiring multi-party approval…"
            className="tk-textarea" rows={3} />
        </div>
        {msgHash && (
          <div className="tk-result">
            <div className="tk-result-label">Proposal Hash (Keccak-256)</div>
            <div className="tk-mono">{msgHash}</div>
          </div>
        )}
      </div>

      <div className="tk-section">
        <div className="tk-section-title">
          Signers — threshold: &nbsp;
          {[2,3].map(n=>(
            <button key={n} className={`tk-filter-chip ${threshold===n?"active":""}`} style={{ padding:"3px 10px", fontSize:11 }} onClick={()=>setThreshold(n)}>{n}-of-3</button>
          ))}
        </div>

        {signers.map((s,i) => (
          <div key={i} className={`tk-signer-row ${s.signed?"signed":""}`}>
            <div className={`tk-sig-dot ${s.signed?"done":""}`} />
            <div style={{ flex:1, minWidth:0 }}>
              <p style={{ fontFamily:SERIF, fontSize:16, color:"var(--t-fg)", marginBottom:3 }}>{s.label}</p>
              {s.isYou
                ? <p style={{ fontFamily:MONO, fontSize:11, color:"var(--t-muted)", overflow:"hidden", textOverflow:"ellipsis" }}>{s.addr || "No wallet connected"}</p>
                : <input value={s.addr} onChange={e=>setSigners(prev=>prev.map((x,j)=>j===i?{...x,addr:e.target.value}:x))}
                    placeholder="0x… (simulated signer)" className="tk-input" style={{ fontSize:12, padding:"4px 0" }} />
              }
            </div>
            {!s.signed
              ? <button className="tk-btn-ghost" disabled={!message.trim()||busy||(s.isYou&&!wallet)}
                  onClick={()=>signAs(i)} style={{ flexShrink:0 }}>
                  {busy?"…":"Sign →"}
                </button>
              : <span className="tk-badge ok"><Ic.Check /> Signed</span>
            }
          </div>
        ))}
      </div>

      {approved && (
        <motion.div initial={{ opacity:0, scale:0.97 }} animate={{ opacity:1, scale:1 }}
          style={{ border:"1px solid rgba(42,107,63,0.3)", background:"rgba(42,107,63,0.05)", padding:"20px 22px", marginTop:8 }}>
          <p style={{ fontFamily:SERIF, fontSize:18, color:"var(--t-up)", marginBottom:4 }}>Proposal approved.</p>
          <p style={{ fontFamily:SERIF, fontSize:14, fontStyle:"italic", color:"var(--t-muted)" }}>
            {signedCount} of {signers.length} signers have confirmed. Threshold of {threshold} met — safe to execute.
          </p>
        </motion.div>
      )}
    </div>
  );
}

/* ══════════════════════════════════════════════════════════════ */
/*  TOOL VII — ANALYTICS                                          */
/* ══════════════════════════════════════════════════════════════ */
function Analytics({ walletAddr, balance }: { walletAddr:string; balance:string }) {
  const { getActivities } = useActivityStore();
  const activities = useMemo(() => getActivities(walletAddr), [walletAddr, getActivities]);

  /* Activity by type */
  const typeCounts = useMemo(() => {
    const m: Record<string,number> = {};
    activities.forEach(a => { m[a.type] = (m[a.type]||0)+1; });
    return Object.entries(m).sort((a,b)=>b[1]-a[1]);
  }, [activities]);

  /* Activity over last 30 days (day buckets) */
  const timeData = useMemo(() => {
    const now = Date.now();
    const buckets = Array.from({length:14},(_,i)=>{
      const dayStart = now - (13-i)*86400000;
      const dayEnd   = dayStart + 86400000;
      return {
        label: new Date(dayStart).toLocaleDateString("en-GB",{day:"numeric",month:"short"}),
        count: activities.filter(a=>a.timestamp>=dayStart&&a.timestamp<dayEnd).length,
      };
    });
    return buckets;
  }, [activities]);

  const maxCount = Math.max(...timeData.map(d=>d.count), 1);
  const totalBal = parseFloat(balance||"0");
  const typeColorMap: Record<string,string> = {
    transfer_out:"var(--t-dn)", transfer_in:"var(--t-up)", market_buy:"#a07c20",
    market_sell:"#5a5a8a", message_sent:"var(--t-muted)", message_received:"var(--t-muted)",
  };

  return (
    <div>
      {/* Stats */}
      <div className="tk-stats-row">
        <div className="tk-stat-cell"><div className="tk-stat-val">{activities.length}</div><div className="tk-stat-label">Total Events</div></div>
        <div className="tk-stat-cell"><div className="tk-stat-val">{parseFloat(balance||"0").toFixed(3)}</div><div className="tk-stat-label">{NETWORK_CONFIG.tokenSymbol} Balance</div></div>
        <div className="tk-stat-cell"><div className="tk-stat-val">{typeCounts.length}</div><div className="tk-stat-label">Event Types</div></div>
      </div>

      {/* Activity timeline bar chart */}
      <div className="tk-chart-wrap">
        <div className="tk-chart-label">Daily Activity — Last 14 Days</div>
        {activities.length === 0
          ? <p style={{ fontFamily:SERIF, fontSize:14, fontStyle:"italic", color:"var(--t-muted)", textAlign:"center", padding:"28px 0" }}>No activity data yet.</p>
          : <div style={{ display:"flex", alignItems:"flex-end", gap:6, height:100 }}>
              {timeData.map((d,i)=>(
                <div key={i} style={{ flex:1, display:"flex", flexDirection:"column", alignItems:"center", gap:4 }}>
                  <motion.div
                    initial={{ height:0 }} animate={{ height: d.count===0?2:`${(d.count/maxCount)*80}px` }}
                    transition={{ delay:i*0.03, duration:0.5, ease:EASE }}
                    style={{ width:"100%", background:d.count>0?"var(--t-fg)":"var(--t-lite)", minHeight:2 }} />
                  <span style={{ fontFamily:MONO, fontSize:9, color:"var(--t-muted)", transform:"rotate(-45deg)", transformOrigin:"top left", whiteSpace:"nowrap", width:20, overflow:"hidden" }}>
                    {d.label}
                  </span>
                </div>
              ))}
            </div>
        }
      </div>

      {/* Event type distribution */}
      {typeCounts.length > 0 && (
        <div className="tk-chart-wrap">
          <div className="tk-chart-label">Event Distribution</div>
          {typeCounts.map(([type, count]) => {
            const pct = Math.round((count/activities.length)*100);
            return (
              <div key={type} style={{ marginBottom:12 }}>
                <div style={{ display:"flex", justifyContent:"space-between", marginBottom:5 }}>
                  <span style={{ fontFamily:SERIF, fontSize:15, color:"var(--t-fg)" }}>
                    {type.replace(/_/g," ")}
                  </span>
                  <span style={{ fontFamily:MONO, fontSize:11, color:"var(--t-muted)" }}>{count} · {pct}%</span>
                </div>
                <div style={{ height:4, background:"var(--t-lite)", position:"relative" }}>
                  <motion.div
                    initial={{ width:0 }} animate={{ width:`${pct}%` }}
                    transition={{ duration:0.7, ease:EASE }}
                    style={{ position:"absolute", inset:0, background: typeColorMap[type]||"var(--t-fg)" }} />
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Balance context */}
      <div className="tk-result">
        <div className="tk-result-label">Current Position</div>
        <div style={{ display:"flex", justifyContent:"space-between", alignItems:"baseline", flexWrap:"wrap", gap:12 }}>
          <span style={{ fontFamily:"'Playfair Display',serif", fontSize:36, fontWeight:700, color:"var(--t-fg)", letterSpacing:"-0.025em" }}>
            {totalBal.toFixed(4)} <em style={{ fontSize:18, fontWeight:400, color:"var(--t-muted)" }}>{NETWORK_CONFIG.tokenSymbol}</em>
          </span>
          <span className={`tk-badge ${totalBal > 0 ? "ok" : "info"}`}>
            {totalBal > 0 ? "Active" : "Empty"} · {NETWORK_CONFIG.name}
          </span>
        </div>
      </div>
    </div>
  );
}

/* ══════════════════════════════════════════════════════════════ */
/*  MAIN PAGE                                                     */
/* ══════════════════════════════════════════════════════════════ */
export default function ToolsPage() {
  const router = useRouter();
  const { contract, wallet, signer, balance } = useStore();
  const [active,  setActive]  = useState<ToolId>("contacts");
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    if (!contract || !wallet) { router.push("/"); return; }
  }, [contract, wallet, router]);

  if (!mounted) return null;

  const tool = TOOLS.find(t => t.id === active)!;

  const renderContent = () => {
    switch (active) {
      case "contacts":  return <ContactManager walletAddr={wallet?.address||""} />;
      case "explorer":  return <AddressExplorer />;
      case "history":   return <TxHistory walletAddr={wallet?.address||""} />;
      case "sign-doc":  return <SignDocument wallet={wallet} signer={signer} />;
      case "hash":      return <HashVerifier />;
      case "multisig":  return <MultiSigner wallet={wallet} signer={signer} />;
      case "analytics": return <Analytics walletAddr={wallet?.address||""} balance={balance||"0"} />;
    }
  };

  return (
    <div className="tk-root">
      <style>{CSS}</style>

      {/* ══ LEFT RAIL ══════════════════════════════════════ */}
      <aside className="tk-rail">
        <div className="tk-rail-header">
          <div className="tk-rail-suite">CipherVault</div>
          <div className="tk-rail-title">Tools &amp; Utils</div>
        </div>

        <div className="tk-rail-list">
          {TOOLS.map(t => (
            <button key={t.id}
              className={`tk-rail-item ${active===t.id?"active":""}`}
              onClick={() => setActive(t.id)}>
              <span className="tk-rail-num">{t.num}</span>
              <div>
                <div className="tk-rail-label">{t.label}</div>
                <div className="tk-rail-hint">{t.hint}</div>
              </div>
            </button>
          ))}
        </div>

        {/* Footer (desktop) */}
        <div style={{ padding:"20px 22px", borderTop:"1px solid rgba(255,255,255,0.06)", flexShrink:0 }} className="tk-rail-header" /* reuse hide-on-mobile */>
          <p style={{ fontFamily:MONO, fontSize:10, letterSpacing:"0.18em", textTransform:"uppercase", color:"var(--t-rail-m)" }}>
            {wallet?.address.slice(0,6)}…{wallet?.address.slice(-4)}
          </p>
          <p style={{ fontFamily:MONO, fontSize:10, color:"var(--t-rail-m)", marginTop:3 }}>
            {parseFloat(balance||"0").toFixed(4)} {NETWORK_CONFIG.tokenSymbol}
          </p>
        </div>
      </aside>

      {/* ══ WORKSPACE ══════════════════════════════════════ */}
      <main className="tk-workspace">
        <AnimatePresence mode="wait">
          <motion.div key={active}
            initial={{ opacity:0, y:10 }} animate={{ opacity:1, y:0 }}
            exit={{ opacity:0, y:-6 }} transition={{ duration:0.3, ease:EASE }}>

            {/* Workspace header */}
            <div className="tk-ws-head">
              <p className="tk-ws-eyebrow">{tool.num} · {tool.hint}</p>
              <h1 className="tk-ws-title">{tool.label.split(" ").map((w,i)=>i===0?w:<em key={i}> {w}</em>)}</h1>
            </div>

            {/* Workspace body */}
            <div className="tk-ws-body">
              {renderContent()}
            </div>
          </motion.div>
        </AnimatePresence>
      </main>
    </div>
  );
}