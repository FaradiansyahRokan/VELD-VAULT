/**
 * tunnel-url.ts
 *
 * Helper terpusat untuk mendapatkan URL tunnel yang aktif.
 *
 * Priority:
 *  1. Vercel KV  — diupdate otomatis tiap tunnel restart (tanpa redeploy)
 *  2. Env vars   — fallback jika KV belum diset
 *  3. Localhost  — fallback terakhir untuk dev lokal
 *
 * Dipakai oleh semua API routes: /api/rpc, /api/ipfs, /api/faucet, /api/health
 */

import { kv } from "@vercel/kv";

const DEFAULT_RPC =
  process.env.NEXT_PUBLIC_RPC_URL ||
  "https://mixed-washer-scott-epson.trycloudflare.com/ext/bc/2N6ekKdQUxdUFxFp8x6xPSXLod3a3sXzQiEWjVepbtXPFa4Uej/rpc";

const DEFAULT_IPFS =
  process.env.NEXT_PUBLIC_IPFS_URL || "http://127.0.0.1:5001";

/**
 * Ambil RPC URL aktif.
 * Baca dari KV dulu — kalau ada, pakai itu (paling fresh).
 * Kalau tidak ada di KV, fallback ke env var / localhost.
 */
export async function getActiveRpcUrl(): Promise<string> {
  try {
    const url = await kv.get<string>("tunnel:rpc");
    if (url) return url;
  } catch {
    // KV tidak tersedia (dev lokal tanpa KV) — langsung fallback
  }
  return DEFAULT_RPC;
}

/**
 * Ambil IPFS URL aktif.
 */
export async function getActiveIpfsUrl(): Promise<string> {
  try {
    const url = await kv.get<string>("tunnel:ipfs");
    if (url) return url;
  } catch {
    // silent fallback
  }
  return DEFAULT_IPFS;
}