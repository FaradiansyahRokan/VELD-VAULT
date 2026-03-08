"use client";

/**
 * Navbar.tsx — Premium Institutional Navbar
 * ✓ Fully responsive: desktop pill tabs + mobile bottom bar
 * ✓ Theme toggle (light/dark) in drawer + quick-toggle desktop
 * ✓ Integrates: useStore · useRouter · usePathname · NETWORK_CONFIG · next-themes
 *
 * NAV HEIGHT (for page padding-top):
 *   Desktop  → 64px top band + 28px ticker = 92px
 *   Mobile   → 56px top bar               = 56px  (+56px pb for bottom bar)
 */

import { useState, useEffect } from "react";
import { useRouter, usePathname } from "next/navigation";
import { useStore } from "@/lib/store";
import { useTheme } from "next-themes";
import { NETWORK_CONFIG } from "@/lib/constants";
import { motion, AnimatePresence, LayoutGroup } from "framer-motion";

/* ── Fonts ─────────────────────────────────────────────────── */
const FONT_HREF =
  "https://fonts.googleapis.com/css2?family=Playfair+Display:ital,wght@0,400;0,600;0,700;1,400;1,600&family=EB+Garamond:ital,wght@0,400;0,500;1,400&family=DM+Mono:wght@300;400;500&display=swap";

/* ── Routes ─────────────────────────────────────────────────── */
const NAV = [
  { id: "dashboard", label: "Overview",  href: "/dashboard" },
  { id: "vault",     label: "Vault",     href: "/vault"     },
  { id: "market",    label: "Market",    href: "/market"    },
  { id: "messages",  label: "Messages",  href: "/messages"  },
  { id: "transfer",  label: "Transfer",  href: "/transfer"  },
  { id: "tools",     label: "Tools",     href: "/tools"     },
] as const;

const HIDE_ON = ["/", "/login"];

/* ── Physics ─────────────────────────────────────────────────── */
const SP  = { type: "spring", stiffness: 320, damping: 32, mass: 0.75 } as const;
const SPS = { type: "spring", stiffness: 220, damping: 30, mass: 1.0  } as const;

/* ── Ticker data ──────────────────────────────────────────────── */
const TICKS = [
  { sym: "UPTIME",  val: "99.99%",  chg: "",       up: true  },
  { sym: "TVL",     val: "$284.3M", chg: "+1.2%",  up: true  },
  { sym: "TUNNELS", val: "8,432",   chg: "+5.1%",  up: true  },
  { sym: "ETH/USD", val: "3,412",   chg: "+0.31%", up: true  },
  { sym: "BTC/USD", val: "61,840",  chg: "−0.14%", up: false },
  { sym: "GAS",     val: "15 gwei", chg: "−2.1%",  up: true  },
  { sym: "KEYS",    val: "1.2M",    chg: "",        up: true  },
  { sym: "AGE",     val: "831d",    chg: "",        up: true  },
];

/* ── Inline SVG icons ────────────────────────────────────────── */
const I = {
  Grid: () => (
    <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
      <rect x="1" y="1" width="5" height="5" stroke="currentColor" strokeWidth="1.2"/>
      <rect x="8" y="1" width="5" height="5" stroke="currentColor" strokeWidth="1.2"/>
      <rect x="1" y="8" width="5" height="5" stroke="currentColor" strokeWidth="1.2"/>
      <rect x="8" y="8" width="5" height="5" fill="currentColor"/>
    </svg>
  ),
  X: () => (
    <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
      <line x1="1" y1="1" x2="11" y2="11" stroke="currentColor" strokeWidth="1.3"/>
      <line x1="11" y1="1" x2="1" y2="11" stroke="currentColor" strokeWidth="1.3"/>
    </svg>
  ),
  Copy: () => (
    <svg width="13" height="13" viewBox="0 0 13 13" fill="none">
      <rect x="1" y="3" width="9" height="9" stroke="currentColor" strokeWidth="1.2"/>
      <path d="M3 3V1h9v9H10" stroke="currentColor" strokeWidth="1.2"/>
    </svg>
  ),
  Check: () => (
    <svg width="13" height="13" viewBox="0 0 13 13" fill="none">
      <polyline points="1.5,6.5 5,10 11.5,2.5" stroke="currentColor" strokeWidth="1.5"
        strokeLinecap="round" strokeLinejoin="round"/>
    </svg>
  ),
  Shield: () => (
    <svg width="13" height="14" viewBox="0 0 13 14" fill="none">
      <path d="M6.5 1L1 3.2v4.3C1 10.3 3.4 12.6 6.5 13.5 9.6 12.6 12 10.3 12 7.5V3.2L6.5 1z"
        stroke="currentColor" strokeWidth="1.2"/>
    </svg>
  ),
  Send: () => (
    <svg width="13" height="13" viewBox="0 0 13 13" fill="none">
      <line x1="1.5" y1="11.5" x2="11.5" y2="1.5" stroke="currentColor" strokeWidth="1.3"/>
      <polyline points="5,1.5 11.5,1.5 11.5,8" stroke="currentColor" strokeWidth="1.3"
        strokeLinecap="round" strokeLinejoin="round"/>
    </svg>
  ),
  Out: () => (
    <svg width="13" height="13" viewBox="0 0 13 13" fill="none">
      <path d="M5 1H1v11h4" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round"/>
      <line x1="5.5" y1="6.5" x2="12" y2="6.5" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round"/>
      <polyline points="9,3.5 12,6.5 9,9.5" stroke="currentColor" strokeWidth="1.2"
        strokeLinecap="round" strokeLinejoin="round"/>
    </svg>
  ),
  Bell: () => (
    <svg width="14" height="15" viewBox="0 0 14 15" fill="none">
      <path d="M7 1.5a4 4 0 0 1 4 4v3.2l1.2 1.3H1.8L3 8.7V5.5a4 4 0 0 1 4-4z" stroke="currentColor" strokeWidth="1.2"/>
      <path d="M5.5 12.5a1.5 1.5 0 0 0 3 0" stroke="currentColor" strokeWidth="1.2"/>
    </svg>
  ),
  Menu: () => (
    <svg width="17" height="12" viewBox="0 0 17 12" fill="none">
      <line x1="0" y1="1"  x2="17" y2="1"  stroke="currentColor" strokeWidth="1.4" strokeLinecap="round"/>
      <line x1="0" y1="6"  x2="12" y2="6"  stroke="currentColor" strokeWidth="1.4" strokeLinecap="round"/>
      <line x1="0" y1="11" x2="17" y2="11" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round"/>
    </svg>
  ),
  Sun: () => (
    <svg width="15" height="15" viewBox="0 0 15 15" fill="none">
      <circle cx="7.5" cy="7.5" r="2.8" stroke="currentColor" strokeWidth="1.2"/>
      <line x1="7.5" y1="0.5"  x2="7.5" y2="2.5"  stroke="currentColor" strokeWidth="1.2" strokeLinecap="round"/>
      <line x1="7.5" y1="12.5" x2="7.5" y2="14.5" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round"/>
      <line x1="0.5" y1="7.5"  x2="2.5" y2="7.5"  stroke="currentColor" strokeWidth="1.2" strokeLinecap="round"/>
      <line x1="12.5" y1="7.5" x2="14.5" y2="7.5" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round"/>
      <line x1="2.6"  y1="2.6"  x2="3.9"  y2="3.9"  stroke="currentColor" strokeWidth="1.2" strokeLinecap="round"/>
      <line x1="11.1" y1="11.1" x2="12.4" y2="12.4" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round"/>
      <line x1="2.6"  y1="12.4" x2="3.9"  y2="11.1" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round"/>
      <line x1="11.1" y1="3.9"  x2="12.4" y2="2.6"  stroke="currentColor" strokeWidth="1.2" strokeLinecap="round"/>
    </svg>
  ),
  Moon: () => (
    <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
      <path d="M12.5 9A6 6 0 0 1 5 1.5a6 6 0 1 0 7.5 7.5z"
        stroke="currentColor" strokeWidth="1.2" strokeLinejoin="round"/>
    </svg>
  ),
  Chevron: ({ up }: { up?: boolean }) => (
    <svg width="10" height="10" viewBox="0 0 10 10" fill="none"
      style={{ transform: up ? "rotate(180deg)" : "none", transition: "transform 0.28s ease" }}>
      <polyline points="1,3 5,7 9,3" stroke="currentColor" strokeWidth="1.2"
        strokeLinecap="round" strokeLinejoin="round"/>
    </svg>
  ),
};

/* ── CSS ─────────────────────────────────────────────────────── */
const CSS = `
  @import url('${FONT_HREF}');

  :root {
    --nb-bg:     #fafaf8;
    --nb-ink:    #0e0e0e;
    --nb-mid:    #5a5a5a;
    --nb-silver: #8a8a8a;
    --nb-ash:    #b8b8b8;
    --nb-smoke:  #e8e8e8;
    --nb-up:     #2a6b3f;
    --nb-dn:     #7a2828;
  }
  .dark {
    --nb-bg:     #0a0a08;
    --nb-ink:    #f0ede6;
    --nb-mid:    #9a9590;
    --nb-silver: #6a6560;
    --nb-ash:    #3a3830;
    --nb-smoke:  #222018;
    --nb-up:     #4a9b62;
    --nb-dn:     #b05050;
  }

  /* GRAIN */
  .nb-grain {
    position: fixed; inset: 0; z-index: 9997; pointer-events: none;
    background-image: url("data:image/svg+xml,%3Csvg viewBox='0 0 200 200' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.88' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)'/%3E%3C/svg%3E");
    background-size: 180px; opacity: 0.025;
  }

  /* TOP BAND */
  .nb-band {
    display: grid;
    grid-template-columns: 220px 1fr 280px;
    align-items: center;
    height: 64px; padding: 0 36px;
    background: rgba(250,250,248,0.95);
    backdrop-filter: blur(20px) saturate(1.5);
    border-bottom: 1px solid var(--nb-smoke);
    transition: background 0.3s;
  }
  .dark .nb-band { background: rgba(10,10,8,0.95); }

  /* LOGO */
  .nb-logo {
    display: flex; align-items: center; gap: 13px;
    cursor: pointer; background: none; border: none;
    padding: 0; color: var(--nb-ink);
  }
  .nb-logo-mark {
    width: 28px; height: 28px; border: 1.5px solid var(--nb-ink);
    display: flex; align-items: center; justify-content: center;
    flex-shrink: 0; transition: border-color 0.3s;
  }
  .nb-logo-name {
    font-family: 'Playfair Display', serif;
    font-size: 15px; font-weight: 700; letter-spacing: 0.04em;
    color: var(--nb-ink); line-height: 1; transition: color 0.3s;
  }
  .nb-logo-sub {
    font-family: 'DM Mono', monospace;
    font-size: 10px; letter-spacing: 0.2em; text-transform: uppercase;
    color: var(--nb-silver); margin-top: 3px; transition: color 0.3s;
  }

  /* TABS */
  .nb-tabs {
    display: flex; justify-content: center;
    align-items: stretch; height: 100%;
  }
  .nb-tab {
    position: relative; padding: 0 18px;
    font-family: 'EB Garamond', serif;
    font-size: 16px; letter-spacing: 0.04em;
    color: var(--nb-silver); background: none; border: none;
    cursor: pointer; transition: color 0.22s; white-space: nowrap;
    display: flex; align-items: center;
  }
  .nb-tab:hover { color: var(--nb-ink); }
  .nb-tab.active { color: var(--nb-ink); }
  .nb-tab-line {
    position: absolute; bottom: 0; left: 14px; right: 14px;
    height: 1px; background: var(--nb-ink);
  }

  /* RIGHT */
  .nb-right {
    display: flex; align-items: center;
    justify-content: flex-end; gap: 8px;
  }
  .nb-icon-btn {
    width: 34px; height: 34px;
    border: 1px solid var(--nb-smoke); background: transparent;
    cursor: pointer; display: flex; align-items: center;
    justify-content: center; color: var(--nb-silver);
    transition: color 0.2s, border-color 0.2s; flex-shrink: 0;
  }
  .nb-icon-btn:hover { color: var(--nb-ink); border-color: var(--nb-ash); }
  .nb-bal-btn {
    display: flex; align-items: center; gap: 8px;
    height: 34px; padding: 0 14px;
    background: var(--nb-ink); color: var(--nb-bg);
    border: none; cursor: pointer;
    font-family: 'DM Mono', monospace;
    font-size: 11px; letter-spacing: 0.1em;
    transition: opacity 0.2s, transform 0.15s; flex-shrink: 0;
  }
  .nb-bal-btn:hover { opacity: 0.82; }
  .nb-bal-btn:active { transform: scale(0.98); }

  /* DOT */
  .nb-dot { width: 6px; height: 6px; border-radius: 50%; flex-shrink: 0; }
  .nb-dot.online  { background: var(--nb-up); }
  .nb-dot.offline { background: var(--nb-dn); animation: nb-blink 1.5s ease infinite; }
  .nb-dot.warn    { background: #a07c20;       animation: nb-blink 1.5s ease infinite; }
  @keyframes nb-blink { 0%,100%{opacity:1} 50%{opacity:.25} }

  /* TICKER */
  .nb-ticker {
    height: 28px; overflow: hidden; position: relative;
    background: var(--nb-bg); border-bottom: 1px solid var(--nb-smoke);
    transition: background 0.3s;
  }
  .nb-ticker::before,.nb-ticker::after {
    content:''; position:absolute; top:0; bottom:0;
    width:60px; z-index:2; pointer-events:none;
  }
  .nb-ticker::before { left:0;  background:linear-gradient(90deg,var(--nb-bg),transparent); }
  .nb-ticker::after  { right:0; background:linear-gradient(-90deg,var(--nb-bg),transparent); }
  @keyframes nb-tick { 0%{transform:translateX(0)} 100%{transform:translateX(-50%)} }
  .nb-ticker-track {
    display:flex; white-space:nowrap; height:100%; align-items:center;
    animation:nb-tick 32s linear infinite;
  }
  .nb-tick-item {
    display:inline-flex; align-items:center; gap:8px;
    padding:0 24px; border-right:1px solid var(--nb-smoke);
    font-family:'DM Mono',monospace;
    font-size:10px; letter-spacing:0.06em; color:var(--nb-silver);
  }
  .nb-tick-sym  { color:var(--nb-ink); font-weight:500; letter-spacing:0.1em; }
  .nb-tick-up   { color:var(--nb-up); }
  .nb-tick-dn   { color:var(--nb-dn); }

  /* DRAWER */
  .nb-backdrop {
    position:fixed; inset:0; z-index:998;
    background:rgba(14,14,14,0.25); backdrop-filter:blur(6px);
  }
  .dark .nb-backdrop { background:rgba(0,0,0,0.5); }
  .nb-drawer {
    position:fixed; top:0; right:0; bottom:0; z-index:999;
    width:min(420px,100vw);
    background:var(--nb-bg); border-left:1px solid var(--nb-smoke);
    display:flex; flex-direction:column; overflow:hidden;
    transition:background 0.3s;
  }
  .nb-dhead {
    padding:28px 32px 22px; border-bottom:1px solid var(--nb-smoke);
    display:flex; align-items:flex-start; justify-content:space-between;
    flex-shrink:0;
  }
  .nb-deyebrow {
    font-family:'DM Mono',monospace;
    font-size:10px; letter-spacing:0.22em; text-transform:uppercase;
    color:var(--nb-silver); margin-bottom:5px;
  }
  .nb-dtitle {
    font-family:'Playfair Display',serif;
    font-size:22px; font-weight:700; color:var(--nb-ink);
    letter-spacing:-0.01em; line-height:1.1; transition:color 0.3s;
  }
  .nb-dtitle em { font-style:italic; font-weight:400; }
  .nb-dclose {
    width:34px; height:34px; border:1px solid var(--nb-smoke);
    background:transparent; cursor:pointer;
    display:flex; align-items:center; justify-content:center;
    color:var(--nb-silver); transition:all 0.2s; flex-shrink:0;
  }
  .nb-dclose:hover { border-color:var(--nb-ink); color:var(--nb-ink); }
  .nb-dbody {
    flex:1; overflow-y:auto; padding:24px 32px 40px;
    display:flex; flex-direction:column; gap:16px;
  }
  .nb-dbody::-webkit-scrollbar { width:3px; }
  .nb-dbody::-webkit-scrollbar-thumb { background:var(--nb-smoke); }

  /* DRAWER BLOCKS */
  .nb-db { border:1px solid var(--nb-smoke); padding:18px 20px; }
  .nb-dblbl {
    font-family:'DM Mono',monospace;
    font-size:10px; letter-spacing:0.2em; text-transform:uppercase;
    color:var(--nb-silver); margin-bottom:10px;
    display:flex; align-items:center; justify-content:space-between;
  }
  .nb-dbval {
    font-family:'Playfair Display',serif;
    font-size:30px; font-weight:700; color:var(--nb-ink);
    letter-spacing:-0.02em; line-height:1; transition:color 0.3s;
  }
  .nb-dbsub {
    font-family:'DM Mono',monospace;
    font-size:11px; color:var(--nb-silver); margin-top:6px; letter-spacing:0.05em;
  }

  /* THEME TOGGLE ROW */
  .nb-theme-row {
    display:flex; align-items:center; justify-content:space-between;
    padding:13px 20px; border:1px solid var(--nb-smoke);
  }
  .nb-theme-label {
    font-family:'DM Mono',monospace;
    font-size:10px; letter-spacing:0.2em; text-transform:uppercase; color:var(--nb-silver);
  }
  .nb-theme-toggle {
    display:flex; align-items:center; border:1px solid var(--nb-smoke); overflow:hidden;
  }
  .nb-theme-opt {
    width:36px; height:30px; background:transparent; border:none; cursor:pointer;
    display:flex; align-items:center; justify-content:center;
    color:var(--nb-silver); transition:all 0.2s;
  }
  .nb-theme-opt:first-child { border-right:1px solid var(--nb-smoke); }
  .nb-theme-opt.active { background:var(--nb-ink); color:var(--nb-bg); }
  .nb-theme-opt:hover:not(.active) { color:var(--nb-ink); }

  /* STATUS BAR */
  .nb-sbar {
    display:flex; align-items:center; gap:9px; padding:11px 14px; border:1px solid;
    font-family:'DM Mono',monospace;
    font-size:11px; letter-spacing:0.12em; text-transform:uppercase;
  }
  .nb-sbar.online  { border-color:rgba(42,107,63,0.3);  color:var(--nb-up); background:rgba(42,107,63,0.06); }
  .nb-sbar.offline { border-color:rgba(122,40,40,0.3);  color:var(--nb-dn); background:rgba(122,40,40,0.06); }
  .nb-sbar.warn    { border-color:rgba(160,124,32,0.3); color:#a07c20;      background:rgba(160,124,32,0.06); }

  .nb-addr {
    font-family:'DM Mono',monospace; font-size:11px; color:var(--nb-mid);
    letter-spacing:0.04em; line-height:1.7; word-break:break-all;
    cursor:pointer; transition:color 0.2s;
  }
  .nb-addr:hover { color:var(--nb-ink); }
  .nb-key-toggle {
    width:100%; padding:13px 0; background:none; border:none; cursor:pointer;
    display:flex; align-items:center; justify-content:space-between;
    border-top:1px solid var(--nb-smoke); margin-top:8px;
    font-family:'DM Mono',monospace; font-size:11px;
    letter-spacing:0.16em; text-transform:uppercase;
    color:var(--nb-silver); transition:color 0.2s;
  }
  .nb-key-toggle:hover { color:var(--nb-ink); }
  .nb-key-toggle.red { color:var(--nb-dn); }
  .nb-key-val {
    font-family:'DM Mono',monospace; font-size:11px; color:var(--nb-dn);
    word-break:break-all; line-height:1.8; margin-top:10px;
    letter-spacing:0.04em; padding:12px;
    border:1px solid rgba(122,40,40,0.2); background:rgba(122,40,40,0.04);
  }
  .nb-warn {
    font-size:11px; color:var(--nb-silver); font-style:italic;
    text-align:center; margin-top:8px; font-family:'EB Garamond',serif;
  }
  .nb-send-btn {
    width:100%; height:44px; background:var(--nb-ink); color:var(--nb-bg);
    border:none; cursor:pointer; font-family:'EB Garamond',serif;
    font-style:italic; font-size:18px; letter-spacing:0.06em;
    display:flex; align-items:center; justify-content:center; gap:10px;
    transition:opacity 0.2s; margin-top:14px;
  }
  .nb-send-btn:hover { opacity:0.82; }
  .nb-nav-grid { display:grid; grid-template-columns:repeat(3,1fr); gap:5px; }
  .nb-nav-cell {
    padding:11px 0; text-align:center; cursor:pointer;
    border:1px solid var(--nb-smoke); background:transparent;
    font-family:'EB Garamond',serif; font-size:15px;
    color:var(--nb-silver); letter-spacing:0.03em; transition:all 0.18s;
  }
  .nb-nav-cell:hover { border-color:var(--nb-ink); color:var(--nb-ink); }
  .nb-nav-cell.active { background:var(--nb-ink); color:var(--nb-bg); border-color:var(--nb-ink); }
  .nb-divider { display:flex; align-items:center; gap:12px; }
  .nb-divider::before,.nb-divider::after { content:''; flex:1; height:1px; background:var(--nb-smoke); }
  .nb-divider span {
    font-family:'DM Mono',monospace; font-size:10px;
    letter-spacing:0.22em; text-transform:uppercase; color:var(--nb-ash); flex-shrink:0;
  }
  .nb-logout {
    width:100%; height:44px; background:transparent; color:var(--nb-silver);
    border:1px solid var(--nb-smoke); cursor:pointer;
    font-family:'DM Mono',monospace; font-size:11px; letter-spacing:0.2em; text-transform:uppercase;
    display:flex; align-items:center; justify-content:center; gap:10px; transition:all 0.2s;
  }
  .nb-logout:hover { border-color:var(--nb-dn); color:var(--nb-dn); background:rgba(122,40,40,0.04); }

  /* MOBILE TOP */
  .nb-mob-top {
    display:grid; grid-template-columns:1fr auto 1fr; align-items:center;
    height:56px; padding:0 18px;
    background:rgba(250,250,248,0.96); backdrop-filter:blur(20px);
    border-bottom:1px solid var(--nb-smoke); transition:background 0.3s;
  }
  .dark .nb-mob-top { background:rgba(10,10,8,0.96); }
  .nb-mob-logo {
    font-family:'Playfair Display',serif; font-size:16px; font-weight:700;
    font-style:italic; color:var(--nb-ink); background:none; border:none;
    cursor:pointer; text-align:left; padding:0; transition:color 0.3s;
  }
  .nb-mob-bal {
    font-family:'DM Mono',monospace; font-size:11px; letter-spacing:0.08em;
    color:var(--nb-ink); text-align:center; transition:color 0.3s;
  }
  .nb-mob-r { display:flex; justify-content:flex-end; gap:6px; }

  /* MOBILE BOTTOM BAR */
  .nb-mob-bot {
    position:fixed; bottom:0; left:0; right:0; z-index:900;
    background:rgba(250,250,248,0.96); backdrop-filter:blur(20px);
    border-top:1px solid var(--nb-smoke); display:flex; height:56px;
    padding-bottom:env(safe-area-inset-bottom,0px); transition:background 0.3s;
  }
  .dark .nb-mob-bot { background:rgba(10,10,8,0.96); }
  .nb-mob-tab {
    flex:1; display:flex; flex-direction:column; align-items:center;
    justify-content:center; gap:3px; background:none; border:none;
    cursor:pointer; color:var(--nb-ash); transition:color 0.2s;
    font-family:'DM Mono',monospace; font-size:8px;
    letter-spacing:0.1em; text-transform:uppercase; position:relative;
  }
  .nb-mob-tab.active { color:var(--nb-ink); }
  .nb-mob-tab-dot {
    position:absolute; top:7px; left:50%; width:3px; height:3px;
    background:var(--nb-ink); border-radius:50%; transform:translateX(-50%);
  }

  /* MOBILE SHEET */
  .nb-sheet {
    position:fixed; inset-x:0; bottom:0; z-index:1001;
    background:var(--nb-bg); border-top:1px solid var(--nb-smoke);
    max-height:88dvh; overflow-y:auto; transition:background 0.3s;
  }
  .nb-sheet-handle {
    width:36px; height:3px; background:var(--nb-smoke);
    border-radius:2px; margin:14px auto 0;
  }

  /* RESPONSIVE */
  @media (min-width:769px) {
    .nb-mob-top,.nb-mob-bot,.nb-mob-only { display:none !important; }
  }
  @media (max-width:768px) {
    .nb-desk-only { display:none !important; }
  }
`;

/* ── WALLET DRAWER COMPONENT ─────────────────────────────── */
function WalletDrawer({ wallet, balance, network, activeTab, theme, onNav, onClose, onLogout, onTheme }: {
  wallet: any; balance: string; network: string; activeTab: string;
  theme: string | undefined; onNav: (h: string) => void;
  onClose: () => void; onLogout: () => void; onTheme: (t: string) => void;
}) {
  const [copied, setCopied]   = useState(false);
  const [showKey, setShowKey] = useState(false);

  const copy = () => {
    if (!wallet?.address) return;
    navigator.clipboard.writeText(wallet.address);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const isDark     = theme === "dark";
  const dotClass   = network === "online" ? "online" : network === "offline" ? "offline" : "warn";
  const networkLabel = network === "online" ? NETWORK_CONFIG.name :
    network === "offline" ? "Disconnected" : network === "checking" ? "Connecting…" : "Wrong Network";

  return (
    <>
      <motion.div className="nb-backdrop"
        initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
        onClick={onClose} />
      <motion.div className="nb-drawer"
        initial={{ x: "100%" }} animate={{ x: 0 }} exit={{ x: "100%" }} transition={SPS}>

        <div className="nb-dhead">
          <div>
            <div className="nb-deyebrow">Identity · Active Session</div>
            <div className="nb-dtitle">Vault <em>Access</em></div>
          </div>
          <button className="nb-dclose" onClick={onClose}><I.X /></button>
        </div>

        <div className="nb-dbody">
          {/* Theme toggle */}
          <div className="nb-theme-row">
            <span className="nb-theme-label">Appearance</span>
            <div className="nb-theme-toggle">
              <button className={`nb-theme-opt ${!isDark ? "active" : ""}`}
                onClick={() => onTheme("light")} title="Light"><I.Sun /></button>
              <button className={`nb-theme-opt ${isDark ? "active" : ""}`}
                onClick={() => onTheme("dark")} title="Dark"><I.Moon /></button>
            </div>
          </div>

          {/* Network */}
          <div className={`nb-sbar ${dotClass}`}>
            <span className={`nb-dot ${dotClass}`} />
            <span>{networkLabel}</span>
            <span style={{ marginLeft: "auto", color: "var(--nb-silver)" }}>
              Chain {NETWORK_CONFIG.chainId}
            </span>
          </div>

          {/* Balance */}
          <div className="nb-db">
            <div className="nb-dblbl">
              <span>Balance</span>
              <span style={{ color: "var(--nb-up)", fontSize: 10 }}>▲ Live</span>
            </div>
            <div className="nb-dbval">
              {balance}
              <span style={{ fontSize: 16, fontWeight: 400, marginLeft: 7, color: "var(--nb-silver)" }}>
                {NETWORK_CONFIG.tokenSymbol}
              </span>
            </div>
            <div className="nb-dbsub">{NETWORK_CONFIG.name}</div>
            <button className="nb-send-btn" onClick={() => { onNav("/transfer"); onClose(); }}>
              <I.Send /> Transfer Funds
            </button>
          </div>

          {/* Address */}
          <div>
            <div className="nb-divider" style={{ marginBottom: 12 }}><span>Wallet Address</span></div>
            <div className="nb-db" onClick={copy} style={{ cursor: "pointer" }}>
              <div className="nb-dblbl">
                <span>Public Key</span>
                <span style={{ display: "flex", alignItems: "center", gap: 5,
                  color: copied ? "var(--nb-up)" : "var(--nb-silver)" }}>
                  {copied ? <I.Check /> : <I.Copy />} {copied ? "Copied" : "Copy"}
                </span>
              </div>
              <div className="nb-addr">{wallet?.address || "—"}</div>
            </div>
          </div>

          {/* Private key */}
          <div className="nb-db" style={{ padding: 0 }}>
            <button className={`nb-key-toggle ${showKey ? "red" : ""}`}
              style={{ padding: "13px 20px" }}
              onClick={() => setShowKey(v => !v)}>
              <span style={{ display: "flex", alignItems: "center", gap: 9 }}>
                <I.Shield /> Private Key
              </span>
              <I.Chevron up={showKey} />
            </button>
            <AnimatePresence>
              {showKey && (
                <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: "auto", opacity: 1 }}
                  exit={{ height: 0, opacity: 0 }} transition={{ duration: 0.26 }}
                  style={{ overflow: "hidden" }}>
                  <div style={{ padding: "0 20px 18px" }}>
                    <div className="nb-key-val">{wallet?.privateKey}</div>
                    <div className="nb-warn">⚠ Jangan pernah bagikan key ini</div>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          {/* Quick nav */}
          <div>
            <div className="nb-divider" style={{ marginBottom: 12 }}><span>Navigate</span></div>
            <div className="nb-nav-grid">
              {NAV.map(t => (
                <button key={t.id}
                  className={`nb-nav-cell ${activeTab === t.id ? "active" : ""}`}
                  onClick={() => { onNav(t.href); onClose(); }}>
                  {t.label}
                </button>
              ))}
            </div>
          </div>

          <button className="nb-logout" onClick={onLogout}>
            <I.Out /> End Session
          </button>
        </div>
      </motion.div>
    </>
  );
}

/* ── MAIN EXPORT ─────────────────────────────────────────────── */
export default function Navbar() {
  const router   = useRouter();
  const pathname = usePathname();

  const { wallet, balance, networkStatus, logout } = useStore();
  const { theme, setTheme, resolvedTheme }         = useTheme();

  const [drawerOpen, setDrawerOpen] = useState(false);
  const [sheetOpen,  setSheetOpen]  = useState(false);
  const [mounted,    setMounted]    = useState(false);

  useEffect(() => { setMounted(true); }, []);

  const activeTab    = NAV.find(t => pathname.startsWith(t.href))?.id ?? "dashboard";
  const dotClass     = networkStatus === "online" ? "online" : networkStatus === "offline" ? "offline" : "warn";
  const displayBal   = parseFloat(balance || "0").toFixed(4);
  const currentTheme = resolvedTheme ?? theme ?? "light";

  const goTo         = (href: string) => router.push(href);
  const handleLogout = () => { logout(); router.replace("/"); };
  const handleTheme  = (t: string) => setTheme(t);

  if (!mounted) return null;
  if (HIDE_ON.some(p => pathname === p)) return null;

  const tickDbl = [...TICKS, ...TICKS];

  return (
    <>
      <style>{CSS}</style>
      <div className="nb-grain" />

      {/* ══ HEADER ════════════════════════════════════════ */}
      <header style={{ position: "fixed", top: 0, left: 0, right: 0, zIndex: 900 }}>

        {/* Desktop band */}
        <div className="nb-band nb-desk-only">
          <button className="nb-logo" onClick={() => goTo("/dashboard")}>
            <div className="nb-logo-mark"><I.Grid /></div>
            <div>
              <div className="nb-logo-name">CipherVault</div>
              <div className="nb-logo-sub">Secure Protocol</div>
            </div>
          </button>

          <nav className="nb-tabs">
            <LayoutGroup id="nav">
              {NAV.map(t => (
                <button key={t.id}
                  className={`nb-tab ${activeTab === t.id ? "active" : ""}`}
                  onClick={() => goTo(t.href)}>
                  {t.label}
                  {activeTab === t.id && (
                    <motion.div className="nb-tab-line" layoutId="uline" transition={SP} />
                  )}
                </button>
              ))}
            </LayoutGroup>
          </nav>

          <div className="nb-right">
            {/* Quick theme toggle */}
            <button className="nb-icon-btn"
              onClick={() => handleTheme(currentTheme === "dark" ? "light" : "dark")}
              title="Toggle theme">
              {currentTheme === "dark" ? <I.Sun /> : <I.Moon />}
            </button>
            <button className="nb-icon-btn" title="Notifications">
              <I.Bell />
            </button>
            <button className="nb-bal-btn" onClick={() => setDrawerOpen(true)}>
              <span>{displayBal} {NETWORK_CONFIG.tokenSymbol}</span>
              <span className={`nb-dot ${dotClass}`} />
            </button>
          </div>
        </div>

        {/* Mobile top bar */}
        <div className="nb-mob-top nb-mob-only">
          <button className="nb-mob-logo" onClick={() => goTo("/dashboard")}>CipherVault</button>
          <div className="nb-mob-bal">
            {displayBal} {NETWORK_CONFIG.tokenSymbol}
          </div>
          <div className="nb-mob-r">
            <button className="nb-icon-btn" onClick={() => setSheetOpen(true)} aria-label="Menu">
              <I.Menu />
            </button>
          </div>
        </div>

        {/* Ticker (desktop only) */}
        <div className="nb-ticker nb-desk-only">
          <div className="nb-ticker-track">
            {tickDbl.map((t, i) => (
              <span className="nb-tick-item" key={i}>
                <span className="nb-tick-sym">{t.sym}</span>
                <span>{t.val}</span>
                {t.chg && <span className={t.up ? "nb-tick-up" : "nb-tick-dn"}>{t.chg}</span>}
              </span>
            ))}
          </div>
        </div>
      </header>

      {/* ══ DESKTOP DRAWER ════════════════════════════════ */}
      <AnimatePresence>
        {drawerOpen && (
          <WalletDrawer
            wallet={wallet} balance={displayBal}
            network={networkStatus} activeTab={activeTab}
            theme={currentTheme} onNav={goTo}
            onClose={() => setDrawerOpen(false)}
            onLogout={handleLogout} onTheme={handleTheme}
          />
        )}
      </AnimatePresence>

      {/* ══ MOBILE BOTTOM BAR ═════════════════════════════ */}
      <div className="nb-mob-bot nb-mob-only">
        <LayoutGroup id="mob">
          {NAV.slice(0, 5).map(t => (
            <button key={t.id}
              className={`nb-mob-tab ${activeTab === t.id ? "active" : ""}`}
              onClick={() => goTo(t.href)}>
              {activeTab === t.id && (
                <motion.div className="nb-mob-tab-dot" layoutId="mdot" transition={SP} />
              )}
              <span>{t.label}</span>
            </button>
          ))}
          <button className="nb-mob-tab" onClick={() => setSheetOpen(true)}>
            <I.Menu />
            <span>More</span>
          </button>
        </LayoutGroup>
      </div>

      {/* ══ MOBILE SHEET ══════════════════════════════════ */}
      <AnimatePresence>
        {sheetOpen && (
          <>
            <motion.div
              style={{ position: "fixed", inset: 0, zIndex: 1000,
                background: "rgba(14,14,14,0.25)", backdropFilter: "blur(6px)" }}
              initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              onClick={() => setSheetOpen(false)}
            />
            <motion.div className="nb-sheet"
              initial={{ y: "100%" }} animate={{ y: 0 }} exit={{ y: "100%" }}
              transition={SPS}>
              <div className="nb-sheet-handle" />
              <div style={{ padding: "18px 22px 60px" }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center",
                  marginBottom: 20, paddingBottom: 16, borderBottom: "1px solid var(--nb-smoke)" }}>
                  <div>
                    <div className="nb-deyebrow">Active Session</div>
                    <div className="nb-dtitle" style={{ fontSize: 20 }}>Vault <em>Access</em></div>
                  </div>
                  <button className="nb-dclose" onClick={() => setSheetOpen(false)}><I.X /></button>
                </div>

                <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
                  {/* Theme toggle in sheet */}
                  <div className="nb-theme-row">
                    <span className="nb-theme-label">Appearance</span>
                    <div className="nb-theme-toggle">
                      <button className={`nb-theme-opt ${currentTheme !== "dark" ? "active" : ""}`}
                        onClick={() => handleTheme("light")}><I.Sun /></button>
                      <button className={`nb-theme-opt ${currentTheme === "dark" ? "active" : ""}`}
                        onClick={() => handleTheme("dark")}><I.Moon /></button>
                    </div>
                  </div>

                  <div className={`nb-sbar ${dotClass}`}>
                    <span className={`nb-dot ${dotClass}`} />
                    <span>{NETWORK_CONFIG.name}</span>
                    <span style={{ marginLeft: "auto", color: "var(--nb-silver)" }}>
                      Chain {NETWORK_CONFIG.chainId}
                    </span>
                  </div>

                  <div className="nb-db">
                    <div className="nb-dblbl"><span>Balance</span></div>
                    <div className="nb-dbval" style={{ fontSize: 26 }}>
                      {displayBal}
                      <span style={{ fontSize: 14, fontWeight: 400, marginLeft: 6, color: "var(--nb-silver)" }}>
                        {NETWORK_CONFIG.tokenSymbol}
                      </span>
                    </div>
                  </div>

                  <div className="nb-nav-grid">
                    {NAV.map(t => (
                      <button key={t.id}
                        className={`nb-nav-cell ${activeTab === t.id ? "active" : ""}`}
                        onClick={() => { goTo(t.href); setSheetOpen(false); }}>
                        {t.label}
                      </button>
                    ))}
                  </div>

                  <button className="nb-logout" onClick={handleLogout}>
                    <I.Out /> End Session
                  </button>
                </div>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </>
  );
}