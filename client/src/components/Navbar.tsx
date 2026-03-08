"use client";

/**
 * Navbar.tsx — Premium Institutional Navbar
 * Fully integrated with: useStore · useRouter · usePathname · NETWORK_CONFIG
 *
 * HEIGHT CONTRACT (for page padding-top):
 *   Desktop  → 64px top band + 28px ticker = 92px  → use pt-[92px]
 *   Mobile   → 56px top bar                = 56px  → use pt-[56px] + pb-[56px] (bottom bar)
 */

import { useState, useEffect, useRef } from "react";
import { useRouter, usePathname } from "next/navigation";
import { useStore, NetworkStatus, WalletInfo } from "@/lib/store";
import { NETWORK_CONFIG } from "@/lib/constants";
import { motion, AnimatePresence, LayoutGroup } from "framer-motion";

/* ─── FONT ───────────────────────────────────────────────── */
const FONT_HREF =
  "https://fonts.googleapis.com/css2?family=Playfair+Display:ital,wght@0,400;0,600;0,700;1,400;1,600&family=EB+Garamond:ital,wght@0,400;0,500;1,400&family=DM+Mono:wght@300;400;500&display=swap";

/* ─── NAVIGATION ─────────────────────────────────────────── */
const NAV_TABS = [
  { id: "dashboard", label: "Overview",  href: "/dashboard" },
  { id: "vault",     label: "Vault",     href: "/vault"     },
  { id: "market",    label: "Market",    href: "/market"    },
  { id: "messages",  label: "Messages",  href: "/messages"  },
  { id: "transfer",  label: "Transfer",  href: "/transfer"  },
  { id: "tools",     label: "Tools",     href: "/tools"     },
] as const;

/* Pages where the navbar is NOT rendered */
const HIDDEN_ON = ["/", "/login"];

/* ─── SPRING ─────────────────────────────────────────────── */
const SP  = { type: "spring", stiffness: 320, damping: 32, mass: 0.75 } as const;
const SPS = { type: "spring", stiffness: 220, damping: 30, mass: 1.0 } as const;

/* ─── LIVE TICKER DATA ───────────────────────────────────── */
const TICKS = [
  { sym: "NETWORK UPTIME", val: "99.99%",  chg: "",       up: true  },
  { sym: "TVL PROTECTED",  val: "$284.3M", chg: "+1.2%",  up: true  },
  { sym: "ACTIVE TUNNELS", val: "8,432",   chg: "+5.1%",  up: true  },
  { sym: "ETH/USD",        val: "3,412",   chg: "+0.31%", up: true  },
  { sym: "BTC/USD",        val: "61,840",  chg: "−0.14%", up: false },
  { sym: "GAS (GWEI)",     val: "15",      chg: "−2.1%",  up: true  },
  { sym: "KEYS ISSUED",    val: "1.2M",    chg: "",       up: true  },
  { sym: "PROTOCOL AGE",   val: "831d",    chg: "",       up: true  },
];

/* ─── MINIMAL SVG ICONS (zero external dep) ─────────────── */
const Icon = {
  GridMark: () => (
    <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
      <rect x="1" y="1" width="5" height="5" stroke="currentColor" strokeWidth="1.2"/>
      <rect x="8" y="1" width="5" height="5" stroke="currentColor" strokeWidth="1.2"/>
      <rect x="1" y="8" width="5" height="5" stroke="currentColor" strokeWidth="1.2"/>
      <rect x="8" y="8" width="5" height="5" fill="currentColor"/>
    </svg>
  ),
  Close: () => (
    <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
      <line x1="1" y1="1" x2="11" y2="11" stroke="currentColor" strokeWidth="1.3"/>
      <line x1="11" y1="1" x2="1" y2="11" stroke="currentColor" strokeWidth="1.3"/>
    </svg>
  ),
  Copy: () => (
    <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
      <rect x="1" y="3" width="8" height="8" stroke="currentColor" strokeWidth="1.2"/>
      <path d="M3 3V1h8v8H9" stroke="currentColor" strokeWidth="1.2"/>
    </svg>
  ),
  Check: () => (
    <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
      <polyline points="1,6 4.5,9.5 11,2" stroke="currentColor" strokeWidth="1.5"
        strokeLinecap="round" strokeLinejoin="round"/>
    </svg>
  ),
  Shield: () => (
    <svg width="12" height="13" viewBox="0 0 12 13" fill="none">
      <path d="M6 1L1 3v4c0 2.5 2.2 4.5 5 5 2.8-.5 5-2.5 5-5V3L6 1z"
        stroke="currentColor" strokeWidth="1.2"/>
    </svg>
  ),
  Send: () => (
    <svg width="13" height="13" viewBox="0 0 13 13" fill="none">
      <line x1="1" y1="12" x2="12" y2="1" stroke="currentColor" strokeWidth="1.3"/>
      <polyline points="5,1 12,1 12,8" stroke="currentColor" strokeWidth="1.3"
        strokeLinecap="round" strokeLinejoin="round"/>
    </svg>
  ),
  LogOut: () => (
    <svg width="13" height="13" viewBox="0 0 13 13" fill="none">
      <path d="M5 1H1v11h4" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round"/>
      <line x1="5" y1="6.5" x2="12" y2="6.5" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round"/>
      <polyline points="9,3.5 12,6.5 9,9.5" stroke="currentColor" strokeWidth="1.2"
        strokeLinecap="round" strokeLinejoin="round"/>
    </svg>
  ),
  Bell: () => (
    <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
      <path d="M7 1a4 4 0 0 1 4 4v3l1 1H2l1-1V5a4 4 0 0 1 4-4z" stroke="currentColor" strokeWidth="1.2"/>
      <path d="M5.5 12a1.5 1.5 0 0 0 3 0" stroke="currentColor" strokeWidth="1.2"/>
    </svg>
  ),
  Menu: () => (
    <svg width="16" height="12" viewBox="0 0 16 12" fill="none">
      <line x1="0" y1="1" x2="16" y2="1" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round"/>
      <line x1="0" y1="6" x2="11" y2="6" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round"/>
      <line x1="0" y1="11" x2="16" y2="11" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round"/>
    </svg>
  ),
  Chevron: ({ up }: { up?: boolean }) => (
    <svg width="10" height="10" viewBox="0 0 10 10" fill="none"
      style={{ transform: up ? "rotate(180deg)" : "none", transition: "transform 0.28s" }}>
      <polyline points="1,3 5,7 9,3" stroke="currentColor" strokeWidth="1.2"
        strokeLinecap="round" strokeLinejoin="round"/>
    </svg>
  ),
  Wifi: () => (
    <svg width="13" height="11" viewBox="0 0 13 11" fill="none">
      <path d="M1 3.5C2.8 1.5 4.9.5 6.5.5S10.2 1.5 12 3.5" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round"/>
      <path d="M2.8 5.5C3.9 4.2 5.1 3.5 6.5 3.5s2.6.7 3.7 2" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round"/>
      <path d="M4.5 7.5C5 6.8 5.7 6.5 6.5 6.5S8 6.8 8.5 7.5" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round"/>
      <circle cx="6.5" cy="9.5" r="1" fill="currentColor"/>
    </svg>
  ),
};

/* ─── CSS ────────────────────────────────────────────────── */
const CSS = `
  @import url('${FONT_HREF}');

  /* ── GRAIN TEXTURE ── */
  .cv-grain::after {
    content: '';
    position: fixed; inset: 0; z-index: 9998;
    background-image: url("data:image/svg+xml,%3Csvg viewBox='0 0 200 200' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.88' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)'/%3E%3C/svg%3E");
    background-size: 180px 180px;
    opacity: 0.026;
    pointer-events: none;
  }

  /* ── TOP BAND ── */
  .cv-nav-band {
    display: grid;
    grid-template-columns: 220px 1fr 220px;
    align-items: center;
    height: 64px;
    padding: 0 40px;
    background: rgba(250,250,248,0.95);
    backdrop-filter: blur(20px) saturate(1.5);
    -webkit-backdrop-filter: blur(20px) saturate(1.5);
    border-bottom: 1px solid #e8e8e8;
  }

  /* ── LOGO ── */
  .cv-logo {
    display: flex; align-items: center; gap: 13px;
    cursor: pointer; user-select: none; background: none; border: none; padding: 0;
  }
  .cv-logo-mark {
    width: 28px; height: 28px;
    border: 1.5px solid #0e0e0e;
    display: flex; align-items: center; justify-content: center;
    flex-shrink: 0; color: #0e0e0e;
  }
  .cv-logo-name {
    font-family: 'Playfair Display', serif;
    font-size: 15px; font-weight: 700; letter-spacing: 0.04em;
    color: #0e0e0e; line-height: 1;
  }
  .cv-logo-sub {
    font-family: 'DM Mono', monospace;
    font-size: 9px; letter-spacing: 0.22em;
    text-transform: uppercase; color: #8a8a8a; margin-top: 3px;
  }

  /* ── TABS (desktop) ── */
  .cv-tabs {
    display: flex; justify-content: center;
    align-items: stretch; height: 100%;
  }
  .cv-tab {
    position: relative;
    padding: 0 22px;
    font-family: 'EB Garamond', serif;
    font-size: 15px; letter-spacing: 0.04em;
    color: #8a8a8a;
    background: none; border: none; cursor: pointer;
    transition: color 0.22s; white-space: nowrap;
    display: flex; align-items: center;
  }
  .cv-tab:hover { color: #0e0e0e; }
  .cv-tab.active { color: #0e0e0e; }
  .cv-tab-line {
    position: absolute; bottom: 0; left: 18px; right: 18px;
    height: 1px; background: #0e0e0e;
  }

  /* ── RIGHT CLUSTER ── */
  .cv-nav-right {
    display: flex; align-items: center;
    justify-content: flex-end; gap: 10px;
  }
  .cv-icon-btn {
    width: 34px; height: 34px;
    border: 1px solid #e8e8e8; background: transparent;
    cursor: pointer; display: flex; align-items: center;
    justify-content: center; color: #8a8a8a;
    transition: color 0.2s, border-color 0.2s;
    flex-shrink: 0;
  }
  .cv-icon-btn:hover { color: #0e0e0e; border-color: #b8b8b8; }
  .cv-balance-btn {
    display: flex; align-items: center; gap: 9px;
    height: 34px; padding: 0 15px;
    background: #0e0e0e; color: #fafaf8;
    border: none; cursor: pointer;
    font-family: 'DM Mono', monospace;
    font-size: 11px; letter-spacing: 0.1em;
    transition: background 0.2s, transform 0.15s;
    flex-shrink: 0;
  }
  .cv-balance-btn:hover { background: #1c1c1c; }
  .cv-balance-btn:active { transform: scale(0.98); }

  /* ── STATUS DOT ── */
  .cv-dot {
    width: 6px; height: 6px; border-radius: 50%; flex-shrink: 0;
  }
  .cv-dot.online  { background: #2a6b3f; }
  .cv-dot.offline { background: #7a2828; animation: blink 1.5s ease infinite; }
  .cv-dot.warn    { background: #a07c20; animation: blink 1.5s ease infinite; }
  @keyframes blink { 0%,100%{opacity:1} 50%{opacity:.3} }

  /* ── TICKER ── */
  .cv-ticker {
    height: 28px; overflow: hidden; position: relative;
    background: #fafaf8;
    border-bottom: 1px solid #e8e8e8;
  }
  .cv-ticker::before, .cv-ticker::after {
    content: ''; position: absolute; top: 0; bottom: 0;
    width: 56px; z-index: 2; pointer-events: none;
  }
  .cv-ticker::before { left: 0;  background: linear-gradient(90deg, #fafaf8, transparent); }
  .cv-ticker::after  { right: 0; background: linear-gradient(-90deg, #fafaf8, transparent); }
  @keyframes cv-tick { 0%{transform:translateX(0)} 100%{transform:translateX(-50%)} }
  .cv-ticker-track {
    display: flex; white-space: nowrap; height: 100%; align-items: center;
    animation: cv-tick 30s linear infinite;
  }
  .cv-ticker-item {
    display: inline-flex; align-items: center; gap: 8px;
    padding: 0 26px; border-right: 1px solid #e8e8e8;
    font-family: 'DM Mono', monospace;
    font-size: 10px; letter-spacing: 0.06em; color: #8a8a8a;
  }
  .cv-tick-sym  { color: #0e0e0e; font-weight: 500; letter-spacing: 0.1em; }
  .cv-tick-up   { color: #2a6b3f; }
  .cv-tick-down { color: #7a2828; }

  /* ── DRAWER ── */
  .cv-drawer-backdrop {
    position: fixed; inset: 0; z-index: 998;
    background: rgba(14,14,14,0.22);
    backdrop-filter: blur(5px);
  }
  .cv-drawer {
    position: fixed; top: 0; right: 0; bottom: 0; z-index: 999;
    width: 400px; background: #fafaf8;
    border-left: 1px solid #e8e8e8;
    display: flex; flex-direction: column; overflow: hidden;
  }
  .cv-drawer-head {
    padding: 28px 32px 22px;
    border-bottom: 1px solid #e8e8e8;
    display: flex; align-items: flex-start; justify-content: space-between;
    flex-shrink: 0;
  }
  .cv-drawer-eyebrow {
    font-family: 'DM Mono', monospace;
    font-size: 9px; letter-spacing: 0.24em; text-transform: uppercase;
    color: #8a8a8a; margin-bottom: 5px;
  }
  .cv-drawer-title {
    font-family: 'Playfair Display', serif;
    font-size: 22px; font-weight: 700; color: #0e0e0e;
    letter-spacing: -0.01em; line-height: 1.1;
  }
  .cv-drawer-title em { font-style: italic; font-weight: 400; }
  .cv-drawer-close {
    width: 32px; height: 32px;
    border: 1px solid #e8e8e8; background: transparent;
    cursor: pointer; display: flex; align-items: center;
    justify-content: center; color: #8a8a8a;
    transition: all 0.2s; flex-shrink: 0;
  }
  .cv-drawer-close:hover { border-color: #0e0e0e; color: #0e0e0e; }
  .cv-drawer-body {
    flex: 1; overflow-y: auto;
    padding: 24px 32px 36px;
    display: flex; flex-direction: column; gap: 16px;
  }
  .cv-drawer-body::-webkit-scrollbar { width: 3px; }
  .cv-drawer-body::-webkit-scrollbar-thumb { background: #e8e8e8; }

  /* ── DRAWER BLOCKS ── */
  .cv-db { border: 1px solid #e8e8e8; padding: 18px 20px; }
  .cv-db-lbl {
    font-family: 'DM Mono', monospace;
    font-size: 9px; letter-spacing: 0.22em; text-transform: uppercase;
    color: #8a8a8a; margin-bottom: 10px;
    display: flex; align-items: center; justify-content: space-between;
  }
  .cv-db-val {
    font-family: 'Playfair Display', serif;
    font-size: 30px; font-weight: 700; color: #0e0e0e;
    letter-spacing: -0.02em; line-height: 1;
  }
  .cv-db-sub {
    font-family: 'DM Mono', monospace;
    font-size: 11px; color: #8a8a8a; margin-top: 6px; letter-spacing: 0.05em;
  }
  .cv-status-bar {
    display: flex; align-items: center; gap: 9px;
    padding: 11px 14px; border: 1px solid;
    font-family: 'DM Mono', monospace;
    font-size: 10px; letter-spacing: 0.14em; text-transform: uppercase;
  }
  .cv-status-bar.online {
    border-color: rgba(42,107,63,0.25);
    color: #2a6b3f; background: rgba(42,107,63,0.04);
  }
  .cv-status-bar.offline {
    border-color: rgba(122,40,40,0.25);
    color: #7a2828; background: rgba(122,40,40,0.04);
  }
  .cv-addr {
    font-family: 'DM Mono', monospace;
    font-size: 11px; color: #5a5a5a;
    letter-spacing: 0.04em; line-height: 1.6;
    word-break: break-all; cursor: pointer; transition: color 0.2s;
  }
  .cv-addr:hover { color: #0e0e0e; }
  .cv-key-toggle {
    width: 100%; padding: 13px 0; background: none; border: none; cursor: pointer;
    display: flex; align-items: center; justify-content: space-between;
    border-top: 1px solid #e8e8e8; margin-top: 8px;
    font-family: 'DM Mono', monospace; font-size: 10px;
    letter-spacing: 0.18em; text-transform: uppercase;
    color: #8a8a8a; transition: color 0.2s;
  }
  .cv-key-toggle:hover { color: #0e0e0e; }
  .cv-key-toggle.revealed { color: #7a2828; }
  .cv-key-val {
    font-family: 'DM Mono', monospace; font-size: 10px; color: #7a2828;
    word-break: break-all; line-height: 1.8; margin-top: 10px;
    letter-spacing: 0.04em; padding: 12px;
    border: 1px solid rgba(122,40,40,0.15);
    background: rgba(122,40,40,0.03);
  }
  .cv-warn {
    font-size: 11px; color: #8a8a8a; font-style: italic;
    text-align: center; margin-top: 8px;
    font-family: 'EB Garamond', serif;
  }
  .cv-send-btn {
    width: 100%; height: 44px;
    background: #0e0e0e; color: #fafaf8; border: none; cursor: pointer;
    font-family: 'EB Garamond', serif; font-style: italic;
    font-size: 17px; letter-spacing: 0.06em;
    display: flex; align-items: center; justify-content: center; gap: 10px;
    transition: background 0.2s; margin-top: 14px;
  }
  .cv-send-btn:hover { background: #1c1c1c; }
  .cv-nav-grid {
    display: grid; grid-template-columns: repeat(3,1fr); gap: 5px;
  }
  .cv-nav-cell {
    padding: 10px 0; text-align: center; cursor: pointer;
    border: 1px solid #e8e8e8; background: transparent;
    font-family: 'EB Garamond', serif;
    font-size: 15px; color: #8a8a8a; letter-spacing: 0.03em;
    transition: all 0.18s;
  }
  .cv-nav-cell:hover { border-color: #0e0e0e; color: #0e0e0e; }
  .cv-nav-cell.active { background: #0e0e0e; color: #fafaf8; border-color: #0e0e0e; }
  .cv-divider {
    display: flex; align-items: center; gap: 12px;
  }
  .cv-divider::before, .cv-divider::after {
    content: ''; flex: 1; height: 1px; background: #e8e8e8;
  }
  .cv-divider span {
    font-family: 'DM Mono', monospace; font-size: 9px;
    letter-spacing: 0.24em; text-transform: uppercase;
    color: #b8b8b8; flex-shrink: 0;
  }
  .cv-logout-btn {
    width: 100%; height: 44px; background: transparent;
    color: #8a8a8a; border: 1px solid #e8e8e8; cursor: pointer;
    font-family: 'DM Mono', monospace; font-size: 10px;
    letter-spacing: 0.22em; text-transform: uppercase;
    display: flex; align-items: center; justify-content: center; gap: 10px;
    transition: all 0.2s;
  }
  .cv-logout-btn:hover {
    border-color: #7a2828; color: #7a2828;
    background: rgba(122,40,40,0.04);
  }

  /* ── MOBILE TOP BAR ── */
  .cv-mob-top {
    display: grid; grid-template-columns: 1fr auto 1fr;
    align-items: center; height: 56px; padding: 0 18px;
    background: rgba(250,250,248,0.96);
    backdrop-filter: blur(20px);
    border-bottom: 1px solid #e8e8e8;
  }
  .cv-mob-logo {
    font-family: 'Playfair Display', serif;
    font-size: 15px; font-weight: 700; font-style: italic; color: #0e0e0e;
  }
  .cv-mob-bal {
    font-family: 'DM Mono', monospace;
    font-size: 11px; letter-spacing: 0.08em; color: #0e0e0e; text-align: center;
  }
  .cv-mob-right { display: flex; justify-content: flex-end; gap: 6px; }

  /* ── MOBILE BOTTOM BAR ── */
  .cv-mob-bottom {
    position: fixed; bottom: 0; left: 0; right: 0; z-index: 900;
    background: rgba(250,250,248,0.96);
    backdrop-filter: blur(20px);
    border-top: 1px solid #e8e8e8;
    display: flex; height: 56px;
    padding-bottom: env(safe-area-inset-bottom);
  }
  .cv-mob-tab {
    flex: 1; display: flex; flex-direction: column;
    align-items: center; justify-content: center; gap: 2px;
    background: none; border: none; cursor: pointer;
    color: #b8b8b8; transition: color 0.2s;
    font-family: 'DM Mono', monospace;
    font-size: 7.5px; letter-spacing: 0.12em; text-transform: uppercase;
    position: relative;
  }
  .cv-mob-tab.active { color: #0e0e0e; }
  .cv-mob-tab-dot {
    position: absolute; top: 8px; left: 50%;
    width: 3px; height: 3px; background: #0e0e0e;
    border-radius: 50%; transform: translateX(-50%);
  }

  /* ── MOBILE SHEET ── */
  .cv-sheet {
    position: fixed; inset-x: 0; bottom: 0; z-index: 1001;
    background: #fafaf8; border-top: 1px solid #e8e8e8;
    max-height: 88dvh; overflow-y: auto;
  }
  .cv-sheet-handle {
    width: 36px; height: 3px; background: #d4d4d4;
    border-radius: 2px; margin: 14px auto 0;
  }

  /* ── RESPONSIVE ── */
  @media (min-width: 769px) {
    .cv-mob-top, .cv-mob-bottom, .cv-mob-only { display: none !important; }
  }
  @media (max-width: 768px) {
    .cv-desk-only { display: none !important; }
  }
`;

/* ─── WALLET DRAWER COMPONENT ────────────────────────────── */
interface DrawerProps {
  wallet: WalletInfo | null;
  balance: string;
  network: NetworkStatus;
  activeTab: string;
  onNav: (href: string) => void;
  onClose: () => void;
  onLogout: () => void;
}

function WalletDrawer({ wallet, balance, network, activeTab, onNav, onClose, onLogout }: DrawerProps) {
  const [copied, setCopied]   = useState(false);
  const [showKey, setShowKey] = useState(false);

  const doCopy = () => {
    if (!wallet?.address) return;
    navigator.clipboard.writeText(wallet.address);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const isOnline = network === "online";
  const displayBal = parseFloat(balance).toFixed(4);

  return (
    <>
      <motion.div className="cv-drawer-backdrop"
        initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
        onClick={onClose}
      />
      <motion.div className="cv-drawer"
        initial={{ x: "100%" }} animate={{ x: 0 }} exit={{ x: "100%" }}
        transition={SPS}>

        {/* Head */}
        <div className="cv-drawer-head">
          <div>
            <div className="cv-drawer-eyebrow">Identity · Active Session</div>
            <div className="cv-drawer-title">Vault <em>Access</em></div>
          </div>
          <button className="cv-drawer-close" onClick={onClose}><Icon.Close /></button>
        </div>

        {/* Body */}
        <div className="cv-drawer-body">

          {/* Network status */}
          <div className={`cv-status-bar ${isOnline ? "online" : "offline"}`}>
            <span className={`cv-dot ${isOnline ? "online" : "offline"}`} />
            <span>{isOnline ? NETWORK_CONFIG.name : network === "checking" ? "Connecting…" : "Disconnected"}</span>
            <span style={{ marginLeft: "auto", color: "#8a8a8a" }}>Chain {NETWORK_CONFIG.chainId}</span>
          </div>

          {/* Balance */}
          <div className="cv-db">
            <div className="cv-db-lbl">
              <span>Current Balance</span>
              <span style={{ color: "#2a6b3f", fontSize: 9 }}>▲ Live</span>
            </div>
            <div className="cv-db-val">
              {displayBal}
              <span style={{ fontSize: 16, fontWeight: 400, marginLeft: 6, color: "#8a8a8a" }}>
                {NETWORK_CONFIG.tokenSymbol}
              </span>
            </div>
            <div className="cv-db-sub">{NETWORK_CONFIG.name}</div>
            <button className="cv-send-btn" onClick={() => { onNav("/transfer"); onClose(); }}>
              <Icon.Send /> Transfer Funds
            </button>
          </div>

          {/* Address */}
          <div>
            <div className="cv-divider" style={{ marginBottom: 12 }}><span>Wallet Address</span></div>
            <div className="cv-db" onClick={doCopy} style={{ cursor: "pointer" }}>
              <div className="cv-db-lbl">
                <span>Public Key</span>
                <span style={{ display: "flex", alignItems: "center", gap: 5,
                  color: copied ? "#2a6b3f" : "#8a8a8a" }}>
                  {copied ? <Icon.Check /> : <Icon.Copy />}
                  {copied ? "Copied" : "Copy"}
                </span>
              </div>
              <div className="cv-addr">{wallet?.address || "—"}</div>
            </div>
          </div>

          {/* Private key */}
          <div className="cv-db" style={{ padding: 0, overflow: "hidden" }}>
            <button
              className={`cv-key-toggle ${showKey ? "revealed" : ""}`}
              style={{ padding: "13px 20px" }}
              onClick={() => setShowKey(v => !v)}>
              <span style={{ display: "flex", alignItems: "center", gap: 9 }}>
                <Icon.Shield /> Private Key
              </span>
              <Icon.Chevron up={showKey} />
            </button>
            <AnimatePresence>
              {showKey && (
                <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: "auto", opacity: 1 }}
                  exit={{ height: 0, opacity: 0 }} transition={{ duration: 0.26 }}
                  style={{ overflow: "hidden" }}>
                  <div style={{ padding: "0 20px 18px" }}>
                    <div className="cv-key-val">{wallet?.privateKey}</div>
                    <div className="cv-warn">⚠ Never share this key with anyone</div>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          {/* Quick nav */}
          <div>
            <div className="cv-divider" style={{ marginBottom: 12 }}><span>Navigate</span></div>
            <div className="cv-nav-grid">
              {NAV_TABS.map(t => (
                <button key={t.id}
                  className={`cv-nav-cell ${activeTab === t.id ? "active" : ""}`}
                  onClick={() => { onNav(t.href); onClose(); }}>
                  {t.label}
                </button>
              ))}
            </div>
          </div>

          {/* Logout */}
          <button className="cv-logout-btn" onClick={onLogout}>
            <Icon.LogOut /> End Session
          </button>

        </div>
      </motion.div>
    </>
  );
}

/* ─── MAIN NAVBAR ────────────────────────────────────────── */
export default function Navbar() {
  const router   = useRouter();
  const pathname = usePathname();

  /* ── Real store data ── */
  const { wallet, balance, networkStatus, logout } = useStore();

  /* ── UI state ── */
  const [drawerOpen,  setDrawerOpen]  = useState(false);
  const [sheetOpen,   setSheetOpen]   = useState(false);
  const [isMobile,    setIsMobile]    = useState(false);
  const [mounted,     setMounted]     = useState(false);

  /* Detect mobile */
  useEffect(() => {
    setMounted(true);
    const check = () => setIsMobile(window.innerWidth < 769);
    check();
    window.addEventListener("resize", check);
    return () => window.removeEventListener("resize", check);
  }, []);

  /* Derive active tab from current pathname */
  const activeTab = NAV_TABS.find(t => pathname.startsWith(t.href))?.id ?? "dashboard";

  /* Network dot class */
  const dotClass =
    networkStatus === "online" ? "online" :
    networkStatus === "offline" ? "offline" : "warn";

  /* Navigate helper */
  const goTo = (href: string) => router.push(href);

  /* Logout helper */
  const handleLogout = () => {
    logout();
    router.replace("/");
  };

  /* Don't render on public pages or before hydration */
  if (!mounted) return null;
  if (HIDDEN_ON.some(p => pathname === p)) return null;

  const displayBal = parseFloat(balance || "0").toFixed(4);
  const tickDbl    = [...TICKS, ...TICKS];

  /* ─────────────────────────────────────────────────────── */
  return (
    <>
      <style>{CSS}</style>

      {/* GRAIN — applied once globally per page */}
      <div className="cv-grain" style={{ position: "fixed", inset: 0, pointerEvents: "none", zIndex: 9997 }} />

      {/* ════════════════ FIXED NAV SHELL ════════════════ */}
      <header style={{ position: "fixed", top: 0, left: 0, right: 0, zIndex: 900 }}>

        {/* ── Desktop top band ── */}
        <div className="cv-nav-band cv-desk-only">

          {/* Logo */}
          <button className="cv-logo" onClick={() => goTo("/dashboard")}>
            <div className="cv-logo-mark"><Icon.GridMark /></div>
            <div>
              <div className="cv-logo-name">CipherVault</div>
              <div className="cv-logo-sub">Secure Protocol</div>
            </div>
          </button>

          {/* Tabs */}
          <nav className="cv-tabs">
            <LayoutGroup id="nav-tabs">
              {NAV_TABS.map(t => (
                <button key={t.id}
                  className={`cv-tab ${activeTab === t.id ? "active" : ""}`}
                  onClick={() => goTo(t.href)}>
                  {t.label}
                  {activeTab === t.id && (
                    <motion.div className="cv-tab-line" layoutId="tab-line" transition={SP} />
                  )}
                </button>
              ))}
            </LayoutGroup>
          </nav>

          {/* Right */}
          <div className="cv-nav-right">
            <button className="cv-icon-btn" title="Notifications" aria-label="Notifications">
              <Icon.Bell />
            </button>
            <button className="cv-balance-btn" onClick={() => setDrawerOpen(true)}>
              <span>{displayBal} {NETWORK_CONFIG.tokenSymbol}</span>
              <span className={`cv-dot ${dotClass}`} />
            </button>
          </div>
        </div>

        {/* ── Mobile top bar ── */}
        <div className="cv-mob-top cv-mob-only">
          <div className="cv-mob-logo">CipherVault</div>
          <div className="cv-mob-bal">{displayBal} {NETWORK_CONFIG.tokenSymbol}</div>
          <div className="cv-mob-right">
            <button className="cv-icon-btn" onClick={() => setSheetOpen(true)} aria-label="Menu">
              <Icon.Menu />
            </button>
          </div>
        </div>

      </header>

      {/* ════════════════ WALLET DRAWER (desktop) ════════ */}
      <AnimatePresence>
        {drawerOpen && (
          <WalletDrawer
            wallet={wallet}
            balance={balance || "0"}
            network={networkStatus}
            activeTab={activeTab}
            onNav={goTo}
            onClose={() => setDrawerOpen(false)}
            onLogout={handleLogout}
          />
        )}
      </AnimatePresence>

      {/* ════════════════ MOBILE BOTTOM TAB BAR ══════════ */}
      <div className="cv-mob-bottom cv-mob-only">
        <LayoutGroup id="mob-tabs">
          {NAV_TABS.slice(0, 5).map(t => (
            <button key={t.id}
              className={`cv-mob-tab ${activeTab === t.id ? "active" : ""}`}
              onClick={() => goTo(t.href)}>
              {activeTab === t.id && (
                <motion.div className="cv-mob-tab-dot" layoutId="mob-dot" transition={SP} />
              )}
              <span>{t.label}</span>
            </button>
          ))}
          {/* 6th = sheet opener */}
          <button className="cv-mob-tab" onClick={() => setSheetOpen(true)}>
            <Icon.Menu />
            <span>More</span>
          </button>
        </LayoutGroup>
      </div>

      {/* ════════════════ MOBILE BOTTOM SHEET ════════════ */}
      <AnimatePresence>
        {sheetOpen && (
          <>
            <motion.div style={{ position: "fixed", inset: 0, zIndex: 1000,
              background: "rgba(14,14,14,0.22)", backdropFilter: "blur(5px)" }}
              initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              onClick={() => setSheetOpen(false)}
            />
            <motion.div className="cv-sheet"
              initial={{ y: "100%" }} animate={{ y: 0 }} exit={{ y: "100%" }}
              transition={SPS}>
              <div className="cv-sheet-handle" />
              <div style={{ padding: "20px 24px 48px" }}>
                {/* Sheet header */}
                <div style={{ display: "flex", justifyContent: "space-between",
                  alignItems: "center", marginBottom: 20,
                  paddingBottom: 16, borderBottom: "1px solid #e8e8e8" }}>
                  <div>
                    <div className="cv-drawer-eyebrow">Active Session</div>
                    <div className="cv-drawer-title" style={{ fontSize: 20 }}>
                      Vault <em>Access</em>
                    </div>
                  </div>
                  <button className="cv-drawer-close" onClick={() => setSheetOpen(false)}>
                    <Icon.Close />
                  </button>
                </div>

                {/* Content */}
                <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
                  <div className={`cv-status-bar ${networkStatus === "online" ? "online" : "offline"}`}>
                    <span className={`cv-dot ${dotClass}`} />
                    <span>{NETWORK_CONFIG.name}</span>
                    <span style={{ marginLeft: "auto", color: "#8a8a8a" }}>Chain {NETWORK_CONFIG.chainId}</span>
                  </div>

                  <div className="cv-db">
                    <div className="cv-db-lbl"><span>Balance</span></div>
                    <div className="cv-db-val" style={{ fontSize: 28 }}>
                      {displayBal}
                      <span style={{ fontSize: 14, fontWeight: 400, marginLeft: 6, color: "#8a8a8a" }}>
                        {NETWORK_CONFIG.tokenSymbol}
                      </span>
                    </div>
                  </div>

                  <div className="cv-nav-grid">
                    {NAV_TABS.map(t => (
                      <button key={t.id}
                        className={`cv-nav-cell ${activeTab === t.id ? "active" : ""}`}
                        onClick={() => { goTo(t.href); setSheetOpen(false); }}>
                        {t.label}
                      </button>
                    ))}
                  </div>

                  <button className="cv-logout-btn" onClick={handleLogout}>
                    <Icon.LogOut /> End Session
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