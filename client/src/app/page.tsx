"use client";

import { useState, useEffect, useRef } from "react";
import { ethers } from "ethers";

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

  /* ── DARK MODE — flip palette ── */
  .dark {
    --black: #fafaf8;
    --ink: #f0f0ee;
    --charcoal: #d4d4d2;
    --graphite: #b0b0ae;
    --mid: #a0a09e;
    --silver: #707070;
    --ash: #484848;
    --mist: #303030;
    --smoke: #222222;
    --cream: #181818;
    --white: #0f0f0f;
  }
  .dark body { background: #0f0f0f; color: #f0f0ee; }
  .dark .nav { background: rgba(15,15,15,0.92); border-bottom-color: var(--smoke); }
  .dark .ticker-wrap { background: var(--white); border-color: var(--smoke); }
  .dark .hero-stats { background: var(--cream); border-color: var(--smoke); }
  .dark .formula-box { background: var(--cream); border-color: var(--smoke); }
  .dark .strategy-card { background: var(--cream); }
  .dark .cta-section { background: var(--white); }
  .dark .chart-container { border-color: var(--smoke); }
  .dark .metrics-grid { border-color: var(--smoke); }
  .dark .metric-cell { border-color: var(--smoke); }
  .dark .allocation-row { border-color: var(--smoke); }
  .dark .risk-table th { border-color: var(--smoke); }
  .dark .risk-table td { border-color: var(--smoke); color: var(--mid); }
  .dark .section-header { border-color: var(--smoke); }
  .dark .chart-path { stroke: var(--ink); }
  .dark .chart-path-secondary { stroke: var(--ash); }
  .dark .grid-line { stroke: var(--smoke); }
  .dark .axis-label { fill: var(--silver); }
  .dark .hero-stat { border-color: var(--smoke); }
  .dark .hero-stat-bar { background: var(--smoke); }
  .dark .hero-stat-bar-fill { background: var(--ink); }

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
    background: #111111;
    color: #fafaf8;
    padding: 100px 48px;
  }
  .dark .section-dark {
    background: #0a0a0a;
    color: #fafaf8;
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
    width: 8px; height: 8px; border-radius: 0;
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
    gap: 0; border: 1px solid #2e2e2e;
  }
  .dark-metric {
    padding: 52px 44px;
    border-right: 1px solid #2e2e2e;
  }
  .dark-metric:last-child { border-right: none; }
  .dark-metric-label {
    font-family: 'DM Mono', monospace;
    font-size: 10px; letter-spacing: 0.18em;
    text-transform: uppercase; color: #707070;
    margin-bottom: 20px;
  }
  .dark-metric-value {
    font-family: 'Playfair Display', serif;
    font-size: 52px; font-weight: 700;
    color: #fafaf8; line-height: 1;
    letter-spacing: -0.03em; margin-bottom: 12px;
  }
  .dark-metric-desc {
    font-size: 14px; color: #8a8a8a; font-style: italic;
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
    background: #111111; color: #fafaf8;
    padding: 60px 48px 40px;
  }
  .footer-inner {
    max-width: 1280px; margin: 0 auto;
  }
  .footer-top {
    display: flex; justify-content: space-between; align-items: flex-start;
    padding-bottom: 40px; border-bottom: 1px solid #2e2e2e;
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
    text-transform: uppercase; color: #707070;
    margin-bottom: 16px;
  }
  .footer-col a {
    display: block;
    font-size: 15px; color: #b8b8b8;
    text-decoration: none; margin-bottom: 10px;
    transition: color 0.2s;
  }
  .footer-col a:hover { color: #fafaf8; }
  .footer-bottom {
    display: flex; justify-content: space-between; align-items: center;
  }
  .footer-copy {
    font-family: 'DM Mono', monospace;
    font-size: 11px; color: #5a5a5a;
    letter-spacing: 0.04em;
  }
  .footer-disclaimer {
    font-size: 12px; color: #5a5a5a; font-style: italic;
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
    .dark-metric { border-right: none; border-bottom: 1px solid #2e2e2e; }
    .footer-links { gap: 32px; }
    .section { padding: 72px 32px; }
    .cta-bg-text { font-size: 160px; }
  }

  @media (max-width: 768px) {
    .nav-inner { padding: 14px 20px; }
    .nav-links { display: none; }
    .hero { padding: 110px 20px 60px; gap: 40px; }
    .hero-title { font-size: clamp(36px, 9vw, 64px); }
    .hero-subtitle { font-size: 16px; margin-bottom: 36px; }
    .hero-cta-group { flex-direction: column; align-items: flex-start; gap: 14px; }
    .hero-stat { padding: 20px 24px; }
    .hero-stat-value { font-size: 32px; }
    .metrics-grid { grid-template-columns: 1fr 1fr; }
    .metric-cell { padding: 28px 20px; }
    .metric-value { font-size: 36px; }
    .section { padding: 56px 20px; }
    .section-full { padding: 56px 20px; }
    .section-dark { padding: 56px 20px; }
    .section-header { flex-direction: column; align-items: flex-start; gap: 12px; margin-bottom: 36px; }
    .section-caption { text-align: left; }
    .section-title { font-size: clamp(24px, 6vw, 40px); }
    .dark-metric { padding: 36px 24px; }
    .dark-metric-value { font-size: 36px; }
    .strategy-card { padding: 32px 28px; }
    .strategy-card-num { font-size: 48px; }
    .allocation-row { grid-template-columns: 1fr 80px; gap: 12px; }
    .allocation-bar-wrap { display: none; }
    .chart-container { padding: 24px 16px; overflow-x: auto; }
    .cta-section { padding: 72px 20px; }
    .cta-title { font-size: clamp(32px, 8vw, 52px); }
    .cta-bg-text { font-size: 90px; }
    .footer { padding: 48px 20px 32px; }
    .footer-top { flex-direction: column; gap: 36px; }
    .footer-links { flex-direction: column; gap: 28px; }
    .footer-bottom { flex-direction: column; gap: 12px; text-align: center; }
    .footer-disclaimer { text-align: center; max-width: 100%; }
    .research-grid { gap: 32px; }
    .research-title { font-size: 28px; }
  }

  @media (max-width: 480px) {
    .hero { padding: 100px 16px 48px; }
    .hero-title { font-size: clamp(30px, 10vw, 52px); }
    .metrics-grid { grid-template-columns: 1fr; }
    .metric-cell:last-child { border-right: none; }
    .dark-metrics { gap: 0; }
    .strategy-card { padding: 24px 20px; }
    .ticker-item { padding: 10px 20px; }
    .btn-primary, .btn-ghost { width: 100%; text-align: center; padding: 13px 24px; }
    .hero-cta-group { width: 100%; }
    .nav-logo { font-size: 15px; }
    .section { padding: 44px 16px; }
    .section-full { padding: 44px 16px; }
    .section-dark { padding: 44px 16px; }
    .formula-box { padding: 20px 20px; }
    .formula-eq { font-size: 15px; }
    .cta-bg-text { display: none; }
  }
`;

// ── Sparkline data removed ───────────────────────────────────

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

const tickerStatic = [
  { sym: "NETWORK", val: "BridgeStone", chg: "", up: true },
  { sym: "CHAIN ID", val: "777000", chg: "", up: true },
  { sym: "TOKEN", val: "VELD", chg: "", up: true },
  { sym: "ENCRYPTION", val: "AES-256-GCM", chg: "", up: true },
  { sym: "KEY EXCHANGE", val: "ECDH", chg: "", up: true },
  { sym: "SIGNATURES", val: "ECDSA EIP-712", chg: "", up: true },
  { sym: "CUSTODY", val: "Non-Custodial", chg: "", up: true },
  { sym: "DATA BREACHES", val: "0", chg: "All-time", up: true },
  { sym: "STORAGE", val: "IPFS", chg: "Decentralised", up: true },
  { sym: "CONTRACT", val: "ERC-721", chg: "On-chain", up: true },
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
  const [logs, setLogs] = useState<{ id: string; time: string; action: string; hash: string }[]>([]);

  // Removed fake simulation polling 

  // ── Live blockchain stats ─────────────────────────────────────
  const [liveStats, setLiveStats] = useState({
    blockNumber: 0,
    totalMinted: 0,
    listedAssets: 0,
    loading: true,
  });
  const [ticker, setTicker] = useState(tickerStatic);

  useEffect(() => {
    const RPC = process.env.NEXT_PUBLIC_RPC_URL || "http://127.0.0.1:9654/ext/bc/w4DDDiThpt7dv6A1T2UqkAUxZkC1JVceqg3QMpZ8nL4KPQcHs/rpc";
    const CONTRACT = process.env.NEXT_PUBLIC_CONTRACT_ADDRESS || "0xfEaE1829545008221d3cac836acDA2ACd39748b6";

    const getAllListedABI = ["function getAllListedAssets() view returns (tuple(uint256 id,uint256 tokenId,address seller,address owner,uint256 price,bool isListed,bool isCopy,string encryptedCid,string previewURI,string name,string description,bool useEscrow,address buyer,bool sellerConfirmed,bool buyerConfirmed,bool isEscrowActive)[])"];
    const VaultItemCreatedTopic = ethers.id("VaultItemCreated(uint256,address)");
    const AssetTransferredTopic = ethers.id("AssetTransferred(uint256,address,address,string)");
    const AssetListedTopic = ethers.id("AssetListed(uint256,uint256,bool)");
    const AssetDelistedTopic = ethers.id("AssetDelisted(uint256)");
    const EscrowStartedTopic = ethers.id("EscrowStarted(uint256,address,address,uint256)");
    const EscrowCompletedTopic = ethers.id("EscrowCompleted(uint256,address,address,uint256)");

    const mapTopicToAction = (topic: string) => {
      if (topic === VaultItemCreatedTopic) return "MINT_VAULT_ITEM";
      if (topic === AssetTransferredTopic) return "TRANSFER_ASSET";
      if (topic === AssetListedTopic) return "LIST_ASSET";
      if (topic === AssetDelistedTopic) return "DELIST_ASSET";
      if (topic === EscrowStartedTopic) return "ESCROW_LOCK";
      if (topic === EscrowCompletedTopic) return "ESCROW_RELEASE";
      return "STATE_SYNC";
    };

    async function fetchData() {
      try {
        const provider = new ethers.JsonRpcProvider(RPC);
        const latestBlock = await provider.getBlockNumber();
        const fromBlock = Math.max(0, latestBlock - 50000); // Only relatively recent to avoid heavy payloads

        const [blockNum, mintLogs, listed, allLogs] = await Promise.all([
          provider.getBlockNumber(),
          provider.getLogs({ address: CONTRACT, topics: [VaultItemCreatedTopic], fromBlock: 0, toBlock: "latest" }),
          new ethers.Contract(CONTRACT, getAllListedABI, provider).getAllListedAssets().catch(() => []),
          provider.getLogs({ address: CONTRACT, fromBlock, toBlock: "latest" }).catch(() => [])
        ]);

        const totalMinted = mintLogs.length;
        const listedCount = Array.isArray(listed) ? listed.length : 0;
        setLiveStats({ blockNumber: blockNum, totalMinted, listedAssets: listedCount, loading: false });

        // Update ticker with live values
        setTicker(prev => prev.map(t => {
          if (t.sym === "CHAIN ID") return { ...t, val: "777000" };
          return t;
        }).concat([
          { sym: "BLOCK HEIGHT", val: blockNum.toLocaleString(), chg: "Live", up: true },
          { sym: "TOTAL MINTED", val: totalMinted.toString(), chg: "On-chain", up: true },
          { sym: "LISTED ASSETS", val: listedCount.toString(), chg: "Active", up: true },
        ]));

        // Process logs for Network Monitor
        if (allLogs && allLogs.length > 0) {
          const parsedLogs = allLogs
            .filter(l => l.topics[0] && mapTopicToAction(l.topics[0]) !== "STATE_SYNC")
            .slice(-8)
            .map((l: any) => ({
              id: `${l.blockHash}-${l.logIndex}`,
              time: "Live Activity",
              action: mapTopicToAction(l.topics[0]),
              hash: l.transactionHash
            }));

          if (parsedLogs.length < 8) {
            const padding = Array.from({ length: 8 - parsedLogs.length }).map((_, i) => ({
              id: `pad-${i}`, time: "Just now", action: "SYNC_STATE", hash: "0x000...000 (polling block " + blockNum + ")"
            }));
            setLogs([...padding, ...parsedLogs]);
          } else {
            setLogs(parsedLogs);
          }
        }
      } catch {
        setLiveStats(s => ({ ...s, loading: false }));
      }
    }

    fetchData();
    const interval = setInterval(fetchData, 15000);
    const t = setTimeout(() => setHeroStatsVisible(true), 600);
    return () => { clearInterval(interval); clearTimeout(t); };
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
                <span style={{ color: 'var(--ink)', fontWeight: 500, letterSpacing: '0.1em' }}>{t.sym}</span>
                <span style={{ color: 'var(--mid)' }}>{t.val}</span>
                {t.chg && <span className={t.up ? 'up' : 'down'}>{t.chg}</span>}
              </div>
            ))}
          </div>
        </div>

        {/* ── HERO ── */}
        <div style={{ borderBottom: '1px solid var(--smoke)' }}>
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
                <button className="btn-ghost" onClick={() => window.open('/CipherVault_WhitePaper_v2.pdf', '_blank')}>Read Whitepaper</button>
              </div>
            </div>

            {/* Right — stats panel */}
            <div className="hero-stats animate-fade-up delay-3" ref={heroRef}>
              <div className="hero-stat">
                <div className="hero-stat-label">Total Tokens Minted</div>
                <div className="hero-stat-value">
                  {liveStats.loading ? <span style={{ fontSize: 20, fontStyle: 'italic', color: 'var(--silver)' }}>Connecting…</span> : liveStats.totalMinted.toLocaleString()}
                </div>
                <div className="hero-stat-bar">
                  <div className="hero-stat-bar-fill" style={{ width: heroStatsVisible && !liveStats.loading ? '100%' : '0%' }} />
                </div>
              </div>
              <div className="hero-stat">
                <div className="hero-stat-label">Listed Assets on Market</div>
                <div className="hero-stat-value">
                  {liveStats.loading ? <span style={{ fontSize: 20, fontStyle: 'italic', color: 'var(--silver)' }}>Fetching…</span> : liveStats.listedAssets.toLocaleString()}
                </div>
                <div className="hero-stat-bar">
                  <div className="hero-stat-bar-fill" style={{ width: heroStatsVisible && !liveStats.loading ? '70%' : '0%' }} />
                </div>
              </div>
              <div className="hero-stat">
                <div className="hero-stat-label">Current Block Height</div>
                <div className="hero-stat-value">
                  {liveStats.loading ? <span style={{ fontSize: 20, fontStyle: 'italic', color: 'var(--silver)' }}>Syncing…</span> : liveStats.blockNumber.toLocaleString()}
                </div>
                <div className="hero-stat-bar">
                  <div className="hero-stat-bar-fill" style={{ width: heroStatsVisible && !liveStats.loading ? '90%' : '0%' }} />
                </div>
              </div>
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
              <div className="section-caption">Live network statistics <span className="live-dot" style={{ marginLeft: 4 }} /></div>
            </div>
            <div className="metrics-grid animate-fade-up delay-2">
              <MetricCell index={1} label="Uptime" value="99.99" unit="%" desc="SLA guaranteed operational time" trend="Tier 4 Class" delay={100} />
              <MetricCell index={2} label="Tokens Minted" value={String(liveStats.totalMinted)} desc="NFTs minted on-chain to date" delay={200} />
              <MetricCell index={3} label="Market Listings" value={String(liveStats.listedAssets)} desc="Active assets listed on marketplace" delay={300} />
              <MetricCell index={4} label="Data Breaches" value="0" desc="Zero incidents, all-time record" delay={400} />
            </div>
          </div>
        </div>

        {/* ── NETWORK ACTIVITY ── */}
        <div style={{ borderTop: '1px solid var(--smoke)' }}>
          <div className="section">
            <div className="section-header animate-fade-up">
              <div>
                <div className="section-num">02 — Live Activity</div>
                <div className="section-title">Network Monitor</div>
              </div>
              <div className="section-caption">Real-time cryptographic operations</div>
            </div>
            <div className="chart-container animate-fade-up delay-2" style={{ background: '#0a0a0a', border: '1px solid var(--smoke)', padding: '32px 48px', position: 'relative', overflow: 'hidden' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 24, borderBottom: '1px solid #2e2e2e', paddingBottom: 16 }}>
                <span className="live-dot" />
                <span style={{ fontFamily: 'DM Mono, monospace', fontSize: 11, color: '#8a8a8a', letterSpacing: '0.1em' }}>NODE OP: MAINNET-SECURE / LIVE LOGS</span>
              </div>
              <div style={{ fontFamily: 'DM Mono, monospace', fontSize: 13, display: 'flex', flexDirection: 'column', gap: 16, minHeight: 280, position: 'relative' }}>
                {logs.map(log => (
                  <div key={log.id} className="animate-fade-up" style={{ display: 'flex', gap: 16, borderBottom: '1px dashed #1c1c1c', paddingBottom: 8, alignItems: 'center' }}>
                    <span style={{ color: '#5a5a5a', flexShrink: 0 }}>{log.time}</span>
                    <span style={{
                      color: log.action === 'ENCRYPT_PAYLOAD' ? '#4ade80' :
                        log.action === 'MINT_VAULT_ITEM' ? '#60a5fa' :
                          '#e5e7eb',
                      fontWeight: 500,
                      minWidth: 160,
                      flexShrink: 0
                    }}>
                      [{log.action}]
                    </span>
                    <span style={{ color: '#8a8a8a', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                      {log.hash}
                    </span>
                  </div>
                ))}
                <div style={{ position: 'absolute', bottom: 0, left: 0, right: 0, height: 100, background: 'linear-gradient(to top, #0a0a0a, transparent)', pointerEvents: 'none' }} />
              </div>
            </div>
          </div>
        </div>

        {/* ── STRATEGY ── */}
        <div style={{ borderTop: '1px solid var(--smoke)' }}>
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
        <div style={{ borderTop: '1px solid var(--smoke)' }}>
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
                <div style={{ display: 'grid', gridTemplateColumns: '180px 1fr 80px 100px', fontFamily: 'DM Mono, monospace', fontSize: 10, letterSpacing: '0.16em', textTransform: 'uppercase', color: 'var(--silver)', marginBottom: 8, gap: 24 }}>
                  <span>Feature</span><span></span><span style={{ textAlign: 'right' }}>Usage</span><span style={{ textAlign: 'right' }}>Status</span>
                </div>
                {alloc.map((a, i) => (
                  <AllocationBar key={a.name} {...a} delay={i * 150 + 200} />
                ))}
              </div>
              <div style={{ background: 'var(--smoke)' }} />
              {/* Donut-like breakdown */}
              <div>
                <svg viewBox="0 0 200 200" style={{ width: '100%' }}>
                  {alloc.map((a, i) => {
                    const colors = ['var(--ink)', 'var(--graphite)', 'var(--silver)', 'var(--ash)'];
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
                  <text x="100" y="95" textAnchor="middle" fontFamily="Playfair Display, serif" fontSize="26" fontWeight="700" fill="var(--ink)">100%</text>
                  <text x="100" y="115" textAnchor="middle" fontFamily="DM Mono, monospace" fontSize="9" fill="var(--silver)" letterSpacing="2">DEPLOYED</text>
                </svg>
                <div style={{ marginTop: 16 }}>
                  {alloc.map((a, i) => {
                    const colors = ['var(--ink)', 'var(--graphite)', 'var(--silver)', 'var(--ash)'];
                    return (
                      <div key={a.name} style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 8 }}>
                        <div style={{ width: 10, height: 10, borderRadius: '50%', background: colors[i], flexShrink: 0 }} />
                        <span style={{ fontFamily: 'EB Garamond, serif', fontSize: 14, color: 'var(--mid)', fontStyle: 'italic' }}>{a.name}</span>
                        <span style={{ marginLeft: 'auto', fontFamily: 'DM Mono, monospace', fontSize: 12, color: 'var(--silver)' }}>{a.pct}%</span>
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
            <div style={{ borderBottom: '1px solid var(--graphite)', paddingBottom: 36, marginBottom: 56, display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', flexWrap: 'wrap', gap: 20 }}>
              <div>
                <div style={{ fontFamily: 'DM Mono, monospace', fontSize: 11, letterSpacing: '0.2em', color: 'var(--silver)', textTransform: 'uppercase', marginBottom: 10 }}>05 — Security</div>
                <div style={{ fontFamily: 'Playfair Display, serif', fontSize: 44, fontWeight: 700, color: 'var(--black)', letterSpacing: '-0.02em' }}>Threat Model Defenses</div>
              </div>
              <div style={{ fontSize: 14, color: 'var(--silver)', fontStyle: 'italic', textAlign: 'right', maxWidth: 240, lineHeight: 1.6 }}>
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
                <div style={{ fontFamily: 'DM Mono, monospace', fontSize: 10, letterSpacing: '0.16em', textTransform: 'uppercase', color: 'var(--silver)', marginBottom: 20 }}>Security Statistics</div>
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
                        <td style={{ fontFamily: 'DM Mono, monospace', fontSize: 14, fontWeight: 500, color: 'var(--ink)' }}>{r.value}</td>
                        <td style={{ fontFamily: 'DM Mono, monospace', fontSize: 11, textAlign: 'right', color: 'var(--silver)' }}>{r.note}</td>
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
            <div style={{ fontFamily: 'DM Mono, monospace', fontSize: 11, letterSpacing: '0.22em', textTransform: 'uppercase', color: 'var(--silver)', marginBottom: 24 }}>
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
              <button className="btn-ghost" onClick={() => window.open('/CipherVault_WhitePaper_v2.pdf', '_blank')}>View Documentation</button>
            </div>
            <div style={{ marginTop: 52, fontFamily: 'DM Mono, monospace', fontSize: 11, color: 'var(--ash)', letterSpacing: '0.1em', display: 'flex', justifyContent: 'center', gap: 40, flexWrap: 'wrap' }}>
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
                <div style={{ fontFamily: 'DM Mono, monospace', fontSize: 10, letterSpacing: '0.14em', color: 'var(--silver)', marginTop: 8, textTransform: 'uppercase' }}>
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