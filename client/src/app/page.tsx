"use client";

import { useState, useEffect, useRef } from "react";

const style = `
  @import url('https://fonts.googleapis.com/css2?family=Playfair+Display:ital,wght@0,400;0,500;0,600;0,700;0,900;1,400;1,700&family=EB+Garamond:ital,wght@0,400;0,500;0,600;1,400;1,500&family=DM+Mono:wght@300;400;500&display=swap');

  * { margin: 0; padding: 0; box-sizing: border-box; }

  :root {
    --black: #0a0a0a;
    --ink: #111111;
    --charcoal: #1c1c1c;
    --graphite: #2e2e2e;
    --mid: #5a5a5a;
    --silver: #8a8a8a;
    --ash: #b8b8b8;
    --mist: #d4d4d4;
    --smoke: #e8e8e8;
    --cream: #f2f0eb;
    --white: #fafaf8;
  }

  body {
    background: var(--white);
    color: var(--ink);
    font-family: 'EB Garamond', Georgia, serif;
    -webkit-font-smoothing: antialiased;
    overflow-x: hidden;
  }

  /* ── ANIMATIONS ── */
  @keyframes fadeUp {
    from { opacity: 0; transform: translateY(28px); }
    to   { opacity: 1; transform: translateY(0); }
  }
  @keyframes fadeIn {
    from { opacity: 0; } to { opacity: 1; }
  }
  @keyframes lineExpand {
    from { transform: scaleX(0); } to { transform: scaleX(1); }
  }
  @keyframes countUp {
    from { opacity: 0; transform: translateY(10px); }
    to   { opacity: 1; transform: translateY(0); }
  }
  @keyframes chartDraw {
    from { stroke-dashoffset: 1000; }
    to   { stroke-dashoffset: 0; }
  }
  @keyframes ticker {
    0%   { transform: translateX(0); }
    100% { transform: translateX(-50%); }
  }
  @keyframes pulse {
    0%, 100% { opacity: 1; }
    50%       { opacity: 0.4; }
  }
  @keyframes grain {
    0%,100% { transform: translate(0,0) }
    10%      { transform: translate(-2%,-3%) }
    30%      { transform: translate(2%,-1%) }
    50%      { transform: translate(-1%, 2%) }
    70%      { transform: translate(3%, 1%) }
    90%      { transform: translate(-3%, 3%) }
  }

  .animate-fade-up    { animation: fadeUp 0.8s cubic-bezier(0.22,1,0.36,1) both; }
  .animate-fade-in    { animation: fadeIn 1s ease both; }
  .animate-line       { animation: lineExpand 1.2s cubic-bezier(0.22,1,0.36,1) both; transform-origin: left; }
  .animate-count      { animation: countUp 0.7s cubic-bezier(0.22,1,0.36,1) both; }

  .delay-1  { animation-delay: 0.1s; }
  .delay-2  { animation-delay: 0.25s; }
  .delay-3  { animation-delay: 0.4s; }
  .delay-4  { animation-delay: 0.6s; }
  .delay-5  { animation-delay: 0.8s; }
  .delay-6  { animation-delay: 1.0s; }

  /* ── GRAIN OVERLAY ── */
  .grain::after {
    content: '';
    position: fixed;
    inset: -200%;
    width: 400%; height: 400%;
    background-image: url("data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noise'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.85' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noise)' opacity='1'/%3E%3C/svg%3E");
    opacity: 0.022;
    animation: grain 8s steps(10) infinite;
    pointer-events: none;
    z-index: 9999;
  }

  /* ── RULE LINES ── */
  .rule { height: 1px; background: var(--mist); }
  .rule-dark { height: 1px; background: var(--graphite); }
  .rule-double {
    height: 3px;
    border-top: 1px solid var(--ink);
    border-bottom: 1px solid var(--ink);
  }

  /* ── TICKER ── */
  .ticker-wrap {
    overflow: hidden;
    border-top: 1px solid var(--mist);
    border-bottom: 1px solid var(--mist);
    background: var(--white);
  }
  .ticker-inner {
    display: flex;
    white-space: nowrap;
    animation: ticker 32s linear infinite;
  }
  .ticker-item {
    display: inline-flex;
    align-items: center;
    gap: 10px;
    padding: 10px 40px;
    font-family: 'DM Mono', monospace;
    font-size: 11px;
    letter-spacing: 0.05em;
    color: var(--mid);
    border-right: 1px solid var(--mist);
  }
  .ticker-item .up   { color: #2a6b3f; }
  .ticker-item .down { color: #7a2828; }

  /* ── NAV ── */
  .nav {
    position: fixed; top: 0; left: 0; right: 0;
    z-index: 100;
    background: rgba(250,250,248,0.92);
    backdrop-filter: blur(12px);
    border-bottom: 1px solid var(--smoke);
  }
  .nav-inner {
    max-width: 1280px; margin: 0 auto;
    padding: 18px 48px;
    display: flex; align-items: center; justify-content: space-between;
  }
  .nav-logo {
    font-family: 'Playfair Display', serif;
    font-size: 18px; font-weight: 700; letter-spacing: 0.02em;
    color: var(--ink);
  }
  .nav-logo span { font-style: italic; font-weight: 400; }
  .nav-links {
    display: flex; gap: 36px; list-style: none;
  }
  .nav-links a {
    font-family: 'EB Garamond', serif;
    font-size: 15px; color: var(--mid);
    text-decoration: none; letter-spacing: 0.02em;
    transition: color 0.2s;
  }
  .nav-links a:hover { color: var(--ink); }
  .nav-tag {
    font-family: 'DM Mono', monospace;
    font-size: 10px; letter-spacing: 0.12em;
    color: var(--silver);
    text-transform: uppercase;
  }

  /* ── HERO ── */
  .hero {
    min-height: 100vh;
    padding: 160px 48px 100px;
    max-width: 1280px; margin: 0 auto;
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 80px;
    align-items: center;
  }
  .hero-eyebrow {
    font-family: 'DM Mono', monospace;
    font-size: 11px; letter-spacing: 0.2em;
    text-transform: uppercase; color: var(--silver);
    margin-bottom: 28px;
    display: flex; align-items: center; gap: 16px;
  }
  .hero-eyebrow::before {
    content: '';
    display: block; width: 40px; height: 1px;
    background: var(--ash);
  }
  .hero-title {
    font-family: 'Playfair Display', serif;
    font-size: clamp(52px, 5.5vw, 88px);
    line-height: 1.04; font-weight: 700;
    color: var(--ink); letter-spacing: -0.02em;
    margin-bottom: 28px;
  }
  .hero-title em {
    font-style: italic; font-weight: 400;
    color: var(--graphite);
  }
  .hero-subtitle {
    font-size: 19px; line-height: 1.65;
    color: var(--mid); max-width: 440px;
    margin-bottom: 52px;
  }
  .hero-cta-group {
    display: flex; align-items: center; gap: 24px;
  }
  .btn-primary {
    font-family: 'EB Garamond', serif;
    font-size: 17px; letter-spacing: 0.04em;
    padding: 14px 36px;
    background: var(--ink); color: var(--white);
    border: 1.5px solid var(--ink);
    cursor: pointer; transition: all 0.25s;
    font-style: italic;
  }
  .btn-primary:hover {
    background: var(--charcoal);
    transform: translateY(-1px);
    box-shadow: 0 8px 24px rgba(0,0,0,0.12);
  }
  .btn-ghost {
    font-family: 'EB Garamond', serif;
    font-size: 17px; letter-spacing: 0.04em;
    padding: 14px 36px;
    background: transparent; color: var(--ink);
    border: 1.5px solid var(--mist);
    cursor: pointer; transition: all 0.25s;
  }
  .btn-ghost:hover {
    border-color: var(--ash);
    transform: translateY(-1px);
  }

  /* ── HERO STATS (right column) ── */
  .hero-stats {
    display: flex; flex-direction: column; gap: 0;
    border: 1px solid var(--smoke);
    background: var(--white);
  }
  .hero-stat {
    padding: 32px 36px;
    border-bottom: 1px solid var(--smoke);
    position: relative;
  }
  .hero-stat:last-child { border-bottom: none; }
  .hero-stat-label {
    font-family: 'DM Mono', monospace;
    font-size: 10px; letter-spacing: 0.16em;
    text-transform: uppercase; color: var(--silver);
    margin-bottom: 10px;
  }
  .hero-stat-value {
    font-family: 'Playfair Display', serif;
    font-size: 42px; font-weight: 700;
    color: var(--ink); line-height: 1;
    letter-spacing: -0.02em;
  }
  .hero-stat-value sup {
    font-size: 18px; vertical-align: top; margin-top: 8px;
  }
  .hero-stat-sub {
    font-size: 13px; color: var(--silver); margin-top: 6px;
    font-style: italic;
  }
  .hero-stat-bar {
    margin-top: 16px; height: 2px;
    background: var(--smoke); overflow: hidden;
  }
  .hero-stat-bar-fill {
    height: 100%; background: var(--ink);
    transition: width 1.4s cubic-bezier(0.22,1,0.36,1);
  }
  .live-dot {
    display: inline-block; width: 6px; height: 6px;
    border-radius: 50%; background: #2a6b3f;
    animation: pulse 2s ease infinite;
    margin-right: 6px; vertical-align: middle;
  }

  /* ── SECTION WRAPPERS ── */
  .section {
    max-width: 1280px; margin: 0 auto;
    padding: 100px 48px;
  }
  .section-full {
    padding: 100px 48px;
    border-top: 1px solid var(--smoke);
  }
  .section-dark {
    background: var(--ink);
    color: var(--white);
    padding: 100px 48px;
  }
  .section-dark .section { padding: 0; }

  .section-header {
    display: flex; align-items: flex-end; justify-content: space-between;
    margin-bottom: 56px;
    padding-bottom: 24px;
    border-bottom: 1px solid var(--smoke);
  }
  .section-title {
    font-family: 'Playfair Display', serif;
    font-size: clamp(32px, 3.5vw, 52px);
    font-weight: 700; line-height: 1.1;
    letter-spacing: -0.02em;
  }
  .section-num {
    font-family: 'DM Mono', monospace;
    font-size: 11px; letter-spacing: 0.2em;
    color: var(--silver); text-transform: uppercase;
    margin-bottom: 8px;
  }
  .section-caption {
    font-size: 15px; color: var(--silver);
    font-style: italic; max-width: 200px;
    text-align: right;
  }

  /* ── METRICS GRID ── */
  .metrics-grid {
    display: grid;
    grid-template-columns: repeat(4, 1fr);
    border: 1px solid var(--smoke);
  }
  .metric-cell {
    padding: 40px 36px;
    border-right: 1px solid var(--smoke);
    position: relative; overflow: hidden;
  }
  .metric-cell:last-child { border-right: none; }
  .metric-cell::before {
    content: attr(data-index);
    position: absolute; top: 20px; right: 20px;
    font-family: 'DM Mono', monospace;
    font-size: 10px; color: var(--smoke);
    letter-spacing: 0.1em;
  }
  .metric-label {
    font-family: 'DM Mono', monospace;
    font-size: 10px; letter-spacing: 0.18em;
    text-transform: uppercase; color: var(--silver);
    margin-bottom: 16px;
  }
  .metric-value {
    font-family: 'Playfair Display', serif;
    font-size: 48px; font-weight: 700;
    line-height: 1; color: var(--ink);
    letter-spacing: -0.03em;
  }
  .metric-unit {
    font-size: 22px; font-weight: 400;
    vertical-align: text-top; margin-top: 4px;
    font-style: italic;
  }
  .metric-desc {
    margin-top: 12px;
    font-size: 13px; color: var(--silver); font-style: italic;
  }
  .metric-trend {
    display: inline-flex; align-items: center; gap: 4px;
    font-family: 'DM Mono', monospace;
    font-size: 11px; margin-top: 10px;
    padding: 3px 8px;
    background: rgba(42,107,63,0.08);
    color: #2a6b3f;
  }

  /* ── CHART AREA ── */
  .chart-container {
    border: 1px solid var(--smoke);
    padding: 48px;
    margin-top: 40px;
    position: relative;
  }
  .chart-header {
    display: flex; justify-content: space-between;
    align-items: flex-start; margin-bottom: 36px;
  }
  .chart-title {
    font-family: 'Playfair Display', serif;
    font-size: 22px; font-weight: 600;
  }
  .chart-legend {
    display: flex; gap: 24px;
    font-family: 'DM Mono', monospace;
    font-size: 10px; letter-spacing: 0.1em;
    color: var(--silver); text-transform: uppercase;
  }
  .chart-legend-item {
    display: flex; align-items: center; gap: 8px;
  }
  .legend-dot {
    width: 8px; height: 8px; border-radius: 50%;
  }
  .chart-svg { width: 100%; overflow: visible; }
  .chart-path {
    fill: none; stroke: var(--ink); stroke-width: 1.5;
    stroke-dasharray: 1000;
    animation: chartDraw 2.5s cubic-bezier(0.22,1,0.36,1) forwards;
    animation-delay: 0.5s;
    stroke-dashoffset: 1000;
  }
  .chart-path-secondary {
    fill: none; stroke: var(--ash); stroke-width: 1;
    stroke-dasharray: 1000; stroke-dashoffset: 1000;
    animation: chartDraw 2.5s cubic-bezier(0.22,1,0.36,1) forwards;
    animation-delay: 0.8s;
  }
  .chart-area {
    fill: url(#areaGrad);
    opacity: 0.06;
  }
  .grid-line { stroke: var(--smoke); stroke-width: 1; }
  .axis-label {
    font-family: 'DM Mono', monospace;
    font-size: 10px; fill: var(--silver);
    letter-spacing: 0.05em;
  }

  /* ── STRATEGY ── */
  .strategy-grid {
    display: grid; grid-template-columns: 1fr 1fr;
    gap: 2px; background: var(--smoke);
  }
  .strategy-card {
    background: var(--white);
    padding: 48px 44px;
    position: relative; overflow: hidden;
  }
  .strategy-card::after {
    content: '';
    position: absolute; top: 0; left: 0;
    width: 3px; height: 0;
    background: var(--ink);
    transition: height 0.5s cubic-bezier(0.22,1,0.36,1);
  }
  .strategy-card:hover::after { height: 100%; }
  .strategy-card-num {
    font-family: 'Playfair Display', serif;
    font-size: 72px; font-weight: 700; font-style: italic;
    color: var(--smoke); line-height: 1;
    margin-bottom: 24px;
    letter-spacing: -0.04em;
  }
  .strategy-card-title {
    font-family: 'Playfair Display', serif;
    font-size: 24px; font-weight: 600; margin-bottom: 16px;
    letter-spacing: -0.01em;
  }
  .strategy-card-body {
    font-size: 16px; line-height: 1.7; color: var(--mid);
  }
  .strategy-card-tag {
    display: inline-block; margin-top: 24px;
    font-family: 'DM Mono', monospace;
    font-size: 10px; letter-spacing: 0.14em;
    text-transform: uppercase; color: var(--ash);
    border-top: 1px solid var(--smoke); padding-top: 16px;
  }

  /* ── ALLOCATION ── */
  .allocation-row {
    display: grid; grid-template-columns: 180px 1fr 80px 100px;
    align-items: center; gap: 24px;
    padding: 24px 0; border-bottom: 1px solid var(--smoke);
  }
  .allocation-row:first-child {
    border-top: 1px solid var(--smoke);
  }
  .allocation-name {
    font-family: 'Playfair Display', serif;
    font-size: 18px; font-weight: 500; font-style: italic;
  }
  .allocation-bar-wrap {
    height: 2px; background: var(--smoke); flex: 1;
  }
  .allocation-bar-fill {
    height: 100%; background: var(--ink);
    transition: width 1.6s cubic-bezier(0.22,1,0.36,1);
  }
  .allocation-pct {
    font-family: 'DM Mono', monospace;
    font-size: 14px; color: var(--mid);
    text-align: right;
  }
  .allocation-apy {
    font-family: 'DM Mono', monospace;
    font-size: 12px; color: #2a6b3f;
    text-align: right; letter-spacing: 0.05em;
  }

  /* ── DARK SECTION ── */
  .dark-metrics {
    display: grid; grid-template-columns: repeat(3, 1fr);
    gap: 0; border: 1px solid var(--graphite);
  }
  .dark-metric {
    padding: 52px 44px;
    border-right: 1px solid var(--graphite);
  }
  .dark-metric:last-child { border-right: none; }
  .dark-metric-label {
    font-family: 'DM Mono', monospace;
    font-size: 10px; letter-spacing: 0.18em;
    text-transform: uppercase; color: var(--silver);
    margin-bottom: 20px;
  }
  .dark-metric-value {
    font-family: 'Playfair Display', serif;
    font-size: 52px; font-weight: 700;
    color: var(--white); line-height: 1;
    letter-spacing: -0.03em; margin-bottom: 12px;
  }
  .dark-metric-desc {
    font-size: 14px; color: var(--silver); font-style: italic;
    line-height: 1.6;
  }

  /* ── RESEARCH PANEL ── */
  .research-grid {
    display: grid; grid-template-columns: 1.2fr 0.8fr;
    gap: 48px; align-items: start;
  }
  .research-title {
    font-family: 'Playfair Display', serif;
    font-size: 42px; font-weight: 700; line-height: 1.1;
    letter-spacing: -0.02em; margin-bottom: 24px;
  }
  .research-body {
    font-size: 18px; line-height: 1.75; color: var(--mid);
    margin-bottom: 32px;
  }
  .formula-box {
    padding: 32px 36px;
    border: 1px solid var(--smoke);
    background: var(--cream);
    font-family: 'DM Mono', monospace;
  }
  .formula-label {
    font-size: 10px; letter-spacing: 0.18em;
    text-transform: uppercase; color: var(--silver);
    margin-bottom: 16px;
  }
  .formula-eq {
    font-size: 20px; color: var(--ink); line-height: 1.5;
  }
  .formula-vars {
    margin-top: 16px; padding-top: 16px;
    border-top: 1px solid var(--mist);
    font-size: 12px; color: var(--silver); line-height: 2;
  }

  .risk-table { width: 100%; border-collapse: collapse; }
  .risk-table th {
    font-family: 'DM Mono', monospace;
    font-size: 10px; letter-spacing: 0.14em;
    text-transform: uppercase; color: var(--silver);
    text-align: left; padding: 12px 0;
    border-bottom: 1px solid var(--smoke);
  }
  .risk-table td {
    padding: 16px 0;
    border-bottom: 1px solid var(--smoke);
    font-size: 15px; color: var(--mid);
  }
  .risk-table td:first-child {
    font-family: 'Playfair Display', serif;
    font-style: italic; color: var(--ink);
    font-size: 17px;
  }
  .risk-table td:last-child {
    font-family: 'DM Mono', monospace;
    font-size: 13px; text-align: right;
  }

  /* ── CTA ── */
  .cta-section {
    padding: 120px 48px;
    text-align: center;
    border-top: 1px solid var(--smoke);
    position: relative; overflow: hidden;
  }
  .cta-bg-text {
    position: absolute;
    font-family: 'Playfair Display', serif;
    font-size: 280px; font-weight: 700; font-style: italic;
    color: var(--smoke); opacity: 0.5;
    top: 50%; left: 50%;
    transform: translate(-50%, -50%);
    white-space: nowrap; pointer-events: none;
    letter-spacing: -0.05em;
    z-index: 0;
  }
  .cta-content { position: relative; z-index: 1; }
  .cta-title {
    font-family: 'Playfair Display', serif;
    font-size: clamp(44px, 5vw, 72px);
    font-weight: 700; line-height: 1.05;
    letter-spacing: -0.03em; margin-bottom: 24px;
  }
  .cta-sub {
    font-size: 19px; color: var(--mid); font-style: italic;
    margin-bottom: 52px;
  }

  /* ── FOOTER ── */
  .footer {
    background: var(--ink); color: var(--white);
    padding: 60px 48px 40px;
  }
  .footer-inner {
    max-width: 1280px; margin: 0 auto;
  }
  .footer-top {
    display: flex; justify-content: space-between; align-items: flex-start;
    padding-bottom: 40px; border-bottom: 1px solid var(--graphite);
    margin-bottom: 32px;
  }
  .footer-logo {
    font-family: 'Playfair Display', serif;
    font-size: 22px; font-weight: 700; font-style: italic;
  }
  .footer-links {
    display: flex; gap: 48px;
  }
  .footer-col-title {
    font-family: 'DM Mono', monospace;
    font-size: 10px; letter-spacing: 0.18em;
    text-transform: uppercase; color: var(--silver);
    margin-bottom: 16px;
  }
  .footer-col a {
    display: block;
    font-size: 15px; color: var(--ash);
    text-decoration: none; margin-bottom: 10px;
    transition: color 0.2s;
  }
  .footer-col a:hover { color: var(--white); }
  .footer-bottom {
    display: flex; justify-content: space-between; align-items: center;
  }
  .footer-copy {
    font-family: 'DM Mono', monospace;
    font-size: 11px; color: var(--mid);
    letter-spacing: 0.04em;
  }
  .footer-disclaimer {
    font-size: 12px; color: var(--mid); font-style: italic;
    max-width: 400px; text-align: right; line-height: 1.6;
  }

  /* ── RESPONSIVE ── */
  @media (max-width: 1024px) {
    .hero { grid-template-columns: 1fr; gap: 60px; padding: 140px 32px 80px; }
    .metrics-grid { grid-template-columns: repeat(2, 1fr); }
    .metric-cell { border-bottom: 1px solid var(--smoke); }
    .strategy-grid { grid-template-columns: 1fr; }
    .research-grid { grid-template-columns: 1fr; }
    .dark-metrics { grid-template-columns: 1fr; }
    .dark-metric { border-right: none; border-bottom: 1px solid var(--graphite); }
    .footer-links { gap: 32px; }
    .section { padding: 72px 32px; }
    .cta-bg-text { font-size: 160px; }
  }
`;

// ── Sparkline data ───────────────────────────────────────────
const generatePath = (points: number[], w: number, h: number, pad = 32) => {
  const xs = points.map((_, i) => pad + (i / (points.length - 1)) * (w - 2 * pad));
  const mn = Math.min(...points), mx = Math.max(...points);
  const ys = points.map(p => h - pad - ((p - mn) / (mx - mn || 1)) * (h - 2 * pad));
  let d = `M ${xs[0]} ${ys[0]}`;
  for (let i = 1; i < xs.length; i++) {
    const cx = (xs[i - 1] + xs[i]) / 2;
    d += ` C ${cx} ${ys[i - 1]}, ${cx} ${ys[i]}, ${xs[i]} ${ys[i]}`;
  }
  return { d, xs, ys, lastX: xs[xs.length - 1], lastY: ys[ys.length - 1] };
};

const vault = [210, 218, 225, 219, 230, 238, 244, 240, 252, 258, 262, 271, 268, 275, 282, 280, 291, 295, 304, 312, 308, 316, 322, 319, 331];
const bench = [210, 212, 211, 214, 216, 219, 217, 221, 223, 225, 228, 224, 226, 229, 231, 235, 238, 236, 240, 243, 241, 245, 248, 246, 250];

const alloc = [
  { name: "Encrypted Vault Storage", pct: 42, apy: "Persistent" },
  { name: "Zero-Knowledge Messaging", pct: 31, apy: "Real-time" },
  { name: "Decentralised Market", pct: 15, apy: "On-chain" },
  { name: "Document Cryptography", pct: 12, apy: "Verifiable" },
];

const risk = [
  { metric: "Encryption Standard", value: "AES-256", note: "GCM Mode" },
  { metric: "Key Exchange", value: "ECDH", note: "Secp256k1" },
  { metric: "Digital Signatures", value: "ECDSA", note: "EIP-712" },
  { metric: "Data Breaches", value: "0", note: "All-time" },
  { metric: "Security Audits", value: "Passed", note: "Zero critical" },
  { metric: "Custody Model", value: "Self", note: "Non-custodial" },
];

const ticker = [
  { sym: "NETWORK UPTIME", val: "99.99%", chg: "", up: true },
  { sym: "TVL PROTECTED", val: "$284.3M", chg: "+1.2%", up: true },
  { sym: "ACTIVE TUNNELS", val: "8,432", chg: "+5.1%", up: true },
  { sym: "ETH/USD", val: "3,412", chg: "+0.31%", up: true },
  { sym: "BTC/USD", val: "61,840", chg: "−0.14%", up: false },
  { sym: "GAS FEE MAX", val: "15gwei", chg: "−2.1%", up: true },
  { sym: "KEYS GENERATED", val: "1.2M", chg: "", up: true },
  { sym: "PROTOCOL AGE", val: "831d", chg: "", up: true },
];

// ── Animated counter ─────────────────────────────────────────
function useCountUp(target: number | string, duration = 1800, delay = 400) {
  const [val, setVal] = useState(0);
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const obs = new IntersectionObserver(([e]) => {
      if (!e.isIntersecting) return;
      obs.disconnect();
      let start: number | null = null;
      const num = typeof target === 'string' ? parseFloat(target) : target;
      setTimeout(() => {
        const step = (ts: number) => {
          if (!start) start = ts;
          const p = Math.min((ts - start) / duration, 1);
          const ease = 1 - Math.pow(1 - p, 4);
          setVal(+(num * ease).toFixed(2));
          if (p < 1) requestAnimationFrame(step);
          else setVal(num);
        };
        requestAnimationFrame(step);
      }, delay);
    }, { threshold: 0.3 });
    if (ref.current) obs.observe(ref.current);
    return () => obs.disconnect();
  }, [target, duration, delay]);
  return [val, ref] as const;
}

function MetricCell({ label, value, unit, desc, trend, index, delay = 0 }: { label: string, value: string, unit?: string, desc?: string, trend?: string, index: number, delay?: number }) {
  const num = parseFloat(value.replace(/[^0-9.]/g, ''));
  const [count, ref] = useCountUp(num, 1800, delay);
  const prefix = value.startsWith('$') ? '$' : value.startsWith('+') ? '+' : '';
  const suffix = value.endsWith('%') ? '%' : value.endsWith('M') ? 'M' : value.endsWith('B') ? 'B' : '';
  return (
    <div className="metric-cell" data-index={`0${index}`} ref={ref}>
      <div className="metric-label">{label}</div>
      <div className="metric-value">
        {prefix}{count >= 1000 ? count.toLocaleString('en-US', { maximumFractionDigits: 1 }) : count.toFixed(value.includes('.') ? (value.split('.')[1]?.length || 1) : 0)}{unit && <span className="metric-unit">{unit}</span>}{suffix}
      </div>
      {desc && <div className="metric-desc">{desc}</div>}
      {trend && <div className="metric-trend">▲ {trend}</div>}
    </div>
  );
}

function AllocationBar({ name, pct, apy, delay }: { name: string, pct: number, apy: string, delay: number }) {
  const [width, setWidth] = useState(0);
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const obs = new IntersectionObserver(([e]) => {
      if (!e.isIntersecting) return;
      obs.disconnect();
      setTimeout(() => setWidth(pct), delay);
    }, { threshold: 0.3 });
    if (ref.current) obs.observe(ref.current);
    return () => obs.disconnect();
  }, [pct, delay]);
  return (
    <div className="allocation-row" ref={ref}>
      <div className="allocation-name">{name}</div>
      <div className="allocation-bar-wrap">
        <div className="allocation-bar-fill" style={{ width: `${width}%`, transition: `width 1.6s cubic-bezier(0.22,1,0.36,1)` }} />
      </div>
      <div className="allocation-pct">{pct}%</div>
      <div className="allocation-apy">{apy}</div>
    </div>
  );
}

export default function LandingPage() {
  const [heroStatsVisible, setHeroStatsVisible] = useState(false);
  const heroRef = useRef(null);
  const W = 700, H = 240;
  const vP = generatePath(vault, W, H);
  const bP = generatePath(bench, W, H);

  useEffect(() => {
    const t = setTimeout(() => setHeroStatsVisible(true), 600);
    return () => clearTimeout(t);
  }, []);

  return (
    <>
      <style>{style}</style>
      <div className="grain">

        {/* ── NAV ── */}
        <nav className="nav animate-fade-in">
          <div className="nav-inner">
            <div className="nav-logo">Cipher<span>Vault</span></div>
            <ul className="nav-links">
              {["Platform", "Storage", "Comms", "Market", "Docs"].map(l => (
                <li key={l}><a href="#">{l}</a></li>
              ))}
            </ul>
            <div className="nav-tag"><span className="live-dot" />Mainnet</div>
          </div>
        </nav>

        {/* ── TICKER ── */}
        <div style={{ marginTop: 62, position: 'relative', zIndex: 10 }} className="ticker-wrap animate-fade-in delay-1">
          <div className="ticker-inner">
            {[...ticker, ...ticker].map((t, i) => (
              <div className="ticker-item" key={i}>
                <span style={{ color: '#0a0a0a', fontWeight: 500, letterSpacing: '0.1em' }}>{t.sym}</span>
                <span>{t.val}</span>
                {t.chg && <span className={t.up ? 'up' : 'down'}>{t.chg}</span>}
              </div>
            ))}
          </div>
        </div>

        {/* ── HERO ── */}
        <div style={{ borderBottom: '1px solid #e8e8e8' }}>
          <div className="hero">
            {/* Left */}
            <div>
              <div className="hero-eyebrow animate-fade-up delay-1">
                Zero-Knowledge Cryptographic Infrastructure · v2.0
              </div>
              <h1 className="hero-title animate-fade-up delay-2">
                Absolute<br />
                <em>privacy</em><br />
                in every byte.
              </h1>
              <p className="hero-subtitle animate-fade-up delay-3">
                CipherVault deploys military-grade, end-to-end encrypted storage and messaging
                across decentralised networks — designed for individuals and institutions that demand sovereignty over their data.
              </p>
              <div className="hero-cta-group animate-fade-up delay-4">
                <button className="btn-primary" onClick={() => window.location.href = '/login'}>Enter the Vault</button>
                <button className="btn-ghost">Read Whitepaper</button>
              </div>
            </div>

            {/* Right — stats panel */}
            <div className="hero-stats animate-fade-up delay-3" ref={heroRef}>
              {[
                { label: "Encrypted Objects Secured", value: "84,392", bar: 82 },
                { label: "Network Uptime", value: "99.99%", bar: 100 },
                { label: "Total Value Protected", value: "$284.3M", bar: 61 },
              ].map(({ label, value, bar }) => (
                <div className="hero-stat" key={label}>
                  <div className="hero-stat-label">{label}</div>
                  <div className="hero-stat-value">{value}</div>
                  <div className="hero-stat-bar">
                    <div className="hero-stat-bar-fill"
                      style={{ width: heroStatsVisible ? `${bar}%` : '0%' }} />
                  </div>
                </div>
              ))}
              <div className="hero-stat">
                <div className="hero-stat-label">System Status</div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginTop: 4 }}>
                  <span className="live-dot" />
                  <span style={{ fontFamily: 'DM Mono, monospace', fontSize: 13, color: '#2a6b3f', letterSpacing: '0.1em' }}>
                    SECURE — ENCLAVE ACTIVE
                  </span>
                </div>
                <div className="hero-stat-sub" style={{ marginTop: 12 }}>
                  All systems operational · Protocol v2.0
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* ── METRICS GRID ── */}
        <div className="section-full">
          <div style={{ maxWidth: 1280, margin: '0 auto' }}>
            <div className="section-header animate-fade-up">
              <div>
                <div className="section-num">01 — Infrastructure</div>
                <div className="section-title">Key Metrics</div>
              </div>
              <div className="section-caption">Live network statistics</div>
            </div>
            <div className="metrics-grid animate-fade-up delay-2">
              <MetricCell index={1} label="Uptime" value="99.99" unit="%" desc="SLA guaranteed operational time" trend="Tier 4 Class" delay={100} />
              <MetricCell index={2} label="Data Secured" value="42.8" unit="TB" desc="Encrypted objects globally distributed" trend="+2.4% 30D" delay={200} />
              <MetricCell index={3} label="Active Keys" value="8432" desc="Cryptographic keypairs managing data" delay={300} />
              <MetricCell index={4} label="Data Breaches" value="0" desc="Zero knowledge mathematical proof" delay={400} />
            </div>
          </div>
        </div>

        {/* ── CHART ── */}
        <div style={{ borderTop: '1px solid #e8e8e8' }}>
          <div className="section">
            <div className="section-header animate-fade-up">
              <div>
                <div className="section-num">02 — Adoption</div>
                <div className="section-title">Network Growth</div>
              </div>
              <div className="section-caption">Cumulative encrypted data volume over time</div>
            </div>
            <div className="chart-container animate-fade-up delay-2">
              <div className="chart-header">
                <div>
                  <div className="chart-title">Data Secured (TB) — 25 Months</div>
                  <div style={{ fontFamily: 'DM Mono, monospace', fontSize: 11, color: '#8a8a8a', marginTop: 6, letterSpacing: '0.06em' }}>
                    CIPHERVAULT PROTOCOL vs. Legacy Cloud Storage
                  </div>
                </div>
                <div className="chart-legend">
                  <div className="chart-legend-item">
                    <div className="legend-dot" style={{ background: '#111' }} />
                    CipherVault
                  </div>
                  <div className="chart-legend-item">
                    <div className="legend-dot" style={{ background: '#b8b8b8' }} />
                    Legacy Cloud
                  </div>
                </div>
              </div>

              {/* Y-axis labels + chart */}
              <div style={{ display: 'flex', gap: 16 }}>
                <div style={{ display: 'flex', flexDirection: 'column', justifyContent: 'space-between', paddingBottom: 24, fontFamily: 'DM Mono, monospace', fontSize: 10, color: '#8a8a8a', letterSpacing: '0.05em' }}>
                  {['310', '280', '250', '220'].map(v => <span key={v}>{v}</span>)}
                </div>
                <div style={{ flex: 1 }}>
                  <svg viewBox={`0 0 ${W} ${H}`} className="chart-svg">
                    <defs>
                      <linearGradient id="areaGrad" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor="#111" stopOpacity="0.4" />
                        <stop offset="100%" stopColor="#111" stopOpacity="0" />
                      </linearGradient>
                    </defs>
                    {/* Grid lines */}
                    {[0.25, 0.5, 0.75].map(f => (
                      <line key={f} x1={32} y1={32 + f * (H - 64)} x2={W - 32} y2={32 + f * (H - 64)} className="grid-line" />
                    ))}
                    {/* Area */}
                    <path d={`${vP.d} L ${vP.lastX} ${H - 32} L 32 ${H - 32} Z`} className="chart-area" />
                    {/* Lines */}
                    <path d={bP.d} className="chart-path-secondary" />
                    <path d={vP.d} className="chart-path" />
                    {/* End dot */}
                    <circle cx={vP.lastX} cy={vP.lastY} r="4" fill="#111" />
                  </svg>
                  {/* X-axis */}
                  <div style={{ display: 'flex', justifyContent: 'space-between', padding: '8px 32px 0', fontFamily: 'DM Mono, monospace', fontSize: 10, color: '#8a8a8a', letterSpacing: '0.05em' }}>
                    {['Mar 23', 'Jun 23', 'Sep 23', 'Dec 23', 'Mar 24', 'Jun 24', 'Sep 24', 'Dec 24', 'Mar 25'].map(m => (
                      <span key={m}>{m}</span>
                    ))}
                  </div>
                </div>
              </div>

              {/* Summary row */}
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: 0, borderTop: '1px solid #e8e8e8', marginTop: 32 }}>
                {[
                  { label: "Data Growth", value: "+48.6%", note: "25M cumulative" },
                  { label: "Messages Sent", value: "2.8M", note: "E2E Encrypted" },
                  { label: "Network Fees", value: "Minimal", note: "EIP-1559 Optimised" },
                  { label: "Reliability", value: "100%", note: "Zero downtime" },
                ].map(({ label, value, note }) => (
                  <div key={label} style={{ padding: '20px 24px', borderRight: '1px solid #e8e8e8' }}>
                    <div style={{ fontFamily: 'DM Mono, monospace', fontSize: 10, letterSpacing: '0.14em', textTransform: 'uppercase', color: '#8a8a8a', marginBottom: 8 }}>{label}</div>
                    <div style={{ fontFamily: 'Playfair Display, serif', fontSize: 24, fontWeight: 700, color: '#111', letterSpacing: '-0.02em' }}>{value}</div>
                    <div style={{ fontSize: 12, color: '#8a8a8a', fontStyle: 'italic', marginTop: 4 }}>{note}</div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* ── STRATEGY ── */}
        <div style={{ borderTop: '1px solid #e8e8e8' }}>
          <div className="section">
            <div className="section-header animate-fade-up">
              <div>
                <div className="section-num">03 — Core Infrastructure</div>
                <div className="section-title">Protocol Features</div>
              </div>
              <div className="section-caption">Four pillars of cryptographic security</div>
            </div>
            <div className="strategy-grid animate-fade-up delay-2">
              {[
                {
                  n: "I", title: "Encrypted Storage",
                  body: "All documents and files are encrypted completely on your device before touching the network. Only you possess the decryption keys.",
                  tag: "ZERO KNOWLEDGE"
                },
                {
                  n: "II", title: "Secure Communications",
                  body: "Peer-to-peer messaging using advanced key exchange protocols. Chat rooms are mathematically sealed against any third-party surveillance.",
                  tag: "END-TO-END ENCRYPTED"
                },
                {
                  n: "III", title: "Document Signing",
                  body: "Cryptographically sign files using your blockchain identity. Ensures verifiable integrity and non-repudiation for institutional contracts.",
                  tag: "VERIFIABLE INTEGRITY"
                },
                {
                  n: "IV", title: "Decentralised Market",
                  body: "Trade and exchange tokenised assets directly via smart contracts. A trustless marketplace natively integrated with your vault.",
                  tag: "SMART CONTRACTS"
                },
              ].map(s => (
                <div className="strategy-card" key={s.n}>
                  <div className="strategy-card-num">{s.n}</div>
                  <div className="strategy-card-title">{s.title}</div>
                  <div className="strategy-card-body">{s.body}</div>
                  <div className="strategy-card-tag">{s.tag}</div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* ── ALLOCATION ── */}
        <div style={{ borderTop: '1px solid #e8e8e8' }}>
          <div className="section">
            <div className="section-header animate-fade-up">
              <div>
                <div className="section-num">04 — Protocol Usage</div>
                <div className="section-title">Network Activity</div>
              </div>
              <div className="section-caption">Resource distribution across modules</div>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1px 340px', gap: '0 48px' }}>
              <div>
                <div style={{ display: 'grid', gridTemplateColumns: '180px 1fr 80px 100px', fontFamily: 'DM Mono, monospace', fontSize: 10, letterSpacing: '0.16em', textTransform: 'uppercase', color: '#8a8a8a', marginBottom: 8, gap: 24 }}>
                  <span>Feature</span><span></span><span style={{ textAlign: 'right' }}>Usage</span><span style={{ textAlign: 'right' }}>Status</span>
                </div>
                {alloc.map((a, i) => (
                  <AllocationBar key={a.name} {...a} delay={i * 150 + 200} />
                ))}
              </div>
              <div style={{ background: '#e8e8e8' }} />
              {/* Donut-like breakdown */}
              <div>
                <svg viewBox="0 0 200 200" style={{ width: '100%' }}>
                  {alloc.map((a, i) => {
                    const colors = ['#111', '#444', '#888', '#bbb'];
                    const total = alloc.reduce((s, x) => s + x.pct, 0);
                    let offset = alloc.slice(0, i).reduce((s, x) => s + x.pct, 0);
                    const strokeDash = (a.pct / total) * 502;
                    const strokeOffset = 502 - (offset / total) * 502;
                    return (
                      <circle key={a.name}
                        cx="100" cy="100" r="80"
                        fill="none"
                        stroke={colors[i]}
                        strokeWidth="28"
                        strokeDasharray={`${strokeDash} ${502 - strokeDash}`}
                        strokeDashoffset={strokeOffset}
                        transform="rotate(-90 100 100)"
                        style={{ transition: 'stroke-dasharray 1.6s cubic-bezier(0.22,1,0.36,1)' }}
                      />
                    );
                  })}
                  <text x="100" y="95" textAnchor="middle" fontFamily="Playfair Display, serif" fontSize="26" fontWeight="700" fill="#111">100%</text>
                  <text x="100" y="115" textAnchor="middle" fontFamily="DM Mono, monospace" fontSize="9" fill="#8a8a8a" letterSpacing="2">DEPLOYED</text>
                </svg>
                <div style={{ marginTop: 16 }}>
                  {alloc.map((a, i) => {
                    const colors = ['#111', '#444', '#888', '#bbb'];
                    return (
                      <div key={a.name} style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 8 }}>
                        <div style={{ width: 10, height: 10, borderRadius: '50%', background: colors[i], flexShrink: 0 }} />
                        <span style={{ fontFamily: 'EB Garamond, serif', fontSize: 14, color: '#5a5a5a', fontStyle: 'italic' }}>{a.name}</span>
                        <span style={{ marginLeft: 'auto', fontFamily: 'DM Mono, monospace', fontSize: 12, color: '#8a8a8a' }}>{a.pct}%</span>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* ── DARK METRICS ── */}
        <div className="section-dark">
          <div style={{ maxWidth: 1280, margin: '0 auto' }}>
            <div style={{ borderBottom: '1px solid #2e2e2e', paddingBottom: 36, marginBottom: 56, display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end' }}>
              <div>
                <div style={{ fontFamily: 'DM Mono, monospace', fontSize: 11, letterSpacing: '0.2em', color: '#5a5a5a', textTransform: 'uppercase', marginBottom: 10 }}>05 — Security</div>
                <div style={{ fontFamily: 'Playfair Display, serif', fontSize: 44, fontWeight: 700, color: '#fafaf8', letterSpacing: '-0.02em' }}>Threat Model Defenses</div>
              </div>
              <div style={{ fontSize: 14, color: '#5a5a5a', fontStyle: 'italic', textAlign: 'right', maxWidth: 240, lineHeight: 1.6 }}>
                Impenetrable architecture built for adversarial environments
              </div>
            </div>
            <div className="dark-metrics">
              {[
                { label: "Zero-Knowledge", value: "Absolute", desc: "We cannot read your messages, view your files, or access your keys under any circumstances." },
                { label: "Blockchain Integrity", value: "Immutable", desc: "Data states and ownership are anchored to the blockchain, preventing unauthorised modifications." },
                { label: "Non-Custodial", value: "Self-Sovereign", desc: "You are your own bank and data custodian. Complete control remains exclusively in your hands." },
              ].map(m => (
                <div className="dark-metric" key={m.label}>
                  <div className="dark-metric-label">{m.label}</div>
                  <div className="dark-metric-value">{m.value}</div>
                  <div className="dark-metric-desc">{m.desc}</div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* ── RESEARCH / FORMULA ── */}
        <div style={{ borderBottom: '1px solid #e8e8e8' }}>
          <div className="section">
            <div className="section-header animate-fade-up">
              <div>
                <div className="section-num">06 — Cryptography Basis</div>
                <div className="section-title">Mathematical Foundation</div>
              </div>
              <div className="section-caption">The cryptography behind the vault</div>
            </div>
            <div className="research-grid animate-fade-up delay-2">
              <div>
                <h2 className="research-title">Privacy driven by<br /><em>rigorous mathematics,</em><br />not blind trust.</h2>
                <p className="research-body">
                  CipherVault's core security engine is built upon industry-standard cryptographic primitives.
                  By combining AES-256 for symmetric data payload encryption and ECDH for secure key exchange,
                  every piece of data is mathematically sealed before it leaves your device.
                </p>
                <div className="formula-box">
                  <div className="formula-label">Core Encryption Model</div>
                  <div className="formula-eq">
                    C = E<sub>k</sub>(P)  |  K = SHA-256(ECDH(Sk, Pk))
                  </div>
                  <div className="formula-vars">
                    C — Ciphertext payload<br />
                    E<sub>k</sub> — AES-256-GCM Encryption<br />
                    P — Plaintext document<br />
                    K — Shared Secret Key<br />
                    ECDH — Elliptic Curve Diffie-Hellman
                  </div>
                </div>
              </div>
              <div>
                <div style={{ fontFamily: 'DM Mono, monospace', fontSize: 10, letterSpacing: '0.16em', textTransform: 'uppercase', color: '#8a8a8a', marginBottom: 20 }}>Risk Statistics — 25 Months</div>
                <table className="risk-table">
                  <thead>
                    <tr>
                      <th>Metric</th>
                      <th>Value</th>
                      <th style={{ textAlign: 'right' }}>Context</th>
                    </tr>
                  </thead>
                  <tbody>
                    {risk.map(r => (
                      <tr key={r.metric}>
                        <td>{r.metric}</td>
                        <td style={{ fontFamily: 'DM Mono, monospace', fontSize: 14, fontWeight: 500, color: '#111' }}>{r.value}</td>
                        <td style={{ fontFamily: 'DM Mono, monospace', fontSize: 11, textAlign: 'right', color: '#8a8a8a' }}>{r.note}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </div>

        {/* ── CTA ── */}
        <div className="cta-section">
          <div className="cta-bg-text">Cipher</div>
          <div className="cta-content animate-fade-up">
            <div style={{ fontFamily: 'DM Mono, monospace', fontSize: 11, letterSpacing: '0.22em', textTransform: 'uppercase', color: '#8a8a8a', marginBottom: 24 }}>
              — Uncompromised Security —
            </div>
            <h2 className="cta-title">
              Privacy is a<br />
              <em>fundamental right.</em>
            </h2>
            <p className="cta-sub">
              Self-custodial · Cryptographically Secured · Trustless Architecture
            </p>
            <div style={{ display: 'flex', justifyContent: 'center', gap: 16, flexWrap: 'wrap' }}>
              <button className="btn-primary" onClick={() => window.location.href = '/login'}>Launch Web App</button>
              <button className="btn-ghost">View Documentation</button>
            </div>
            <div style={{ marginTop: 52, fontFamily: 'DM Mono, monospace', fontSize: 11, color: '#b8b8b8', letterSpacing: '0.1em', display: 'flex', justifyContent: 'center', gap: 40, flexWrap: 'wrap' }}>
              <span>✦ Verifiable Smart Contracts</span>
              <span>✦ Non-custodial</span>
              <span>✦ E2E Encrypted</span>
              <span>✦ Censorship Resistant</span>
            </div>
          </div>
        </div>

        {/* ── FOOTER ── */}
        <footer className="footer">
          <div className="footer-inner">
            <div className="footer-top">
              <div>
                <div className="footer-logo">CipherVault</div>
                <div style={{ fontFamily: 'DM Mono, monospace', fontSize: 10, letterSpacing: '0.14em', color: '#5a5a5a', marginTop: 8, textTransform: 'uppercase' }}>
                  Secure On-Chain Storage & Communications
                </div>
              </div>
              <div className="footer-links">
                {[
                  { title: "Platform", links: ["Vault", "Messages", "Market", "Tools"] },
                  { title: "Resources", links: ["Documentation", "GitHub", "Smart Contracts", "Blog"] },
                  { title: "Legal", links: ["Terms", "Privacy", "Security Model", "Audits"] },
                ].map(col => (
                  <div className="footer-col" key={col.title}>
                    <div className="footer-col-title">{col.title}</div>
                    {col.links.map(l => <a href="#" key={l}>{l}</a>)}
                  </div>
                ))}
              </div>
            </div>
            <div className="footer-bottom">
              <div className="footer-copy">© 2026 CipherVault Protocol · Open Source Infrastructure</div>
              <div className="footer-disclaimer">
                CipherVault is a decentralised protocol. Users are solely responsible for managing their cryptographic keys and backups.
              </div>
            </div>
          </div>
        </footer>

      </div>
    </>
  );
}