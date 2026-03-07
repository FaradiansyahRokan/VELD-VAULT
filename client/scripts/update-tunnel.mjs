#!/usr/bin/env node
/**
 * scripts/update-tunnel.mjs
 *
 * Jalankan script ini setiap kali tunnel Cloudflare/ngrok restart dan dapat URL baru.
 * Script ini otomatis baca URL aktif dari Cloudflare tunnel (atau ngrok),
 * lalu kirim ke Vercel KV via /api/update-tunnel.
 *
 * Setup:
 *   1. Pastikan VERCEL_APP_URL dan TUNNEL_UPDATE_SECRET ada di .env.local
 *   2. Jalankan: node scripts/update-tunnel.mjs
 *
 * Atau pasang di package.json:
 *   "tunnel": "cloudflared tunnel ... && node scripts/update-tunnel.mjs"
 */

import { readFileSync } from "fs";
import { join, dirname } from "path";
import { fileURLToPath } from "url";

const __dirname = dirname(fileURLToPath(import.meta.url));

// ── Load .env.local ───────────────────────────────────────────
function loadEnv() {
  try {
    const envPath = join(__dirname, "../.env.local");
    const content = readFileSync(envPath, "utf8");
    const env = {};
    for (const line of content.split("\n")) {
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith("#")) continue;
      const [key, ...rest] = trimmed.split("=");
      env[key.trim()] = rest.join("=").trim().replace(/^["']|["']$/g, "");
    }
    return env;
  } catch {
    return {};
  }
}

const env = loadEnv();

const VERCEL_APP_URL     = env.VERCEL_APP_URL     || process.env.VERCEL_APP_URL;
const TUNNEL_SECRET      = env.TUNNEL_UPDATE_SECRET || process.env.TUNNEL_UPDATE_SECRET;
const RPC_URL            = env.NEXT_PUBLIC_RPC_URL  || process.env.NEXT_PUBLIC_RPC_URL;
const IPFS_URL           = env.NEXT_PUBLIC_IPFS_URL || process.env.NEXT_PUBLIC_IPFS_URL;

if (!VERCEL_APP_URL) {
  console.error("❌  VERCEL_APP_URL belum diset di .env.local");
  console.error("   Tambahkan: VERCEL_APP_URL=https://your-app.vercel.app");
  process.exit(1);
}

if (!TUNNEL_SECRET) {
  console.error("❌  TUNNEL_UPDATE_SECRET belum diset di .env.local");
  console.error("   Tambahkan: TUNNEL_UPDATE_SECRET=secret-bebas-isinya");
  process.exit(1);
}

if (!RPC_URL && !IPFS_URL) {
  console.error("❌  NEXT_PUBLIC_RPC_URL dan NEXT_PUBLIC_IPFS_URL belum diset");
  process.exit(1);
}

// ── Kirim ke Vercel ───────────────────────────────────────────
async function updateTunnel() {
  const endpoint = `${VERCEL_APP_URL}/api/update-tunnel`;
  const body = {};
  if (RPC_URL)  body.rpc  = RPC_URL;
  if (IPFS_URL) body.ipfs = IPFS_URL;

  console.log("\n🚇  Updating tunnel URLs di Vercel KV...");
  console.log(`   RPC  : ${RPC_URL  || "(skip)"}`);
  console.log(`   IPFS : ${IPFS_URL || "(skip)"}`);
  console.log(`   → ${endpoint}\n`);

  try {
    const res = await fetch(endpoint, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-tunnel-secret": TUNNEL_SECRET,
      },
      body: JSON.stringify(body),
    });

    const data = await res.json();

    if (!res.ok) {
      console.error("❌  Gagal:", data.error || res.statusText);
      process.exit(1);
    }

    console.log("✅  Berhasil diupdate!");
    console.log("   RPC  :", data.updated?.rpc  || "(tidak diubah)");
    console.log("   IPFS :", data.updated?.ipfs || "(tidak diubah)");
    console.log("\n   Semua request Vercel sekarang pakai URL baru.");
    console.log("   Tidak perlu redeploy! 🎉\n");
  } catch (err) {
    console.error("❌  Network error:", err.message);
    console.error("   Pastikan Vercel app sedang running dan URL benar.");
    process.exit(1);
  }
}

updateTunnel();
