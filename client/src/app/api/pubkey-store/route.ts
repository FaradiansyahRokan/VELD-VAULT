/**
 * Public Key Store API — /api/pubkey-store
 *
 * Menyimpan public key pembeli (buyer) yang dibutuhkan seller
 * untuk melakukan ECDH re-encryption saat confirmTrade.
 *
 * Saat ini pakai in-memory Map — cukup untuk dev lokal.
 * Untuk Vercel/production: uncomment bagian Redis di bawah
 * dan set env var REDIS_URL di .env.local
 */

import { NextRequest } from "next/server";

// ── Storage Backend ──────────────────────────────────────────
// Pilih salah satu: IN_MEMORY (dev) atau REDIS (production)

// --- OPTION A: In-Memory (default, dev lokal) ---
const pubkeyStore = new Map<string, string>();

async function storeGet(address: string): Promise<string | null> {
  return pubkeyStore.get(address) ?? null;
}
async function storeSet(address: string, publicKey: string): Promise<void> {
  pubkeyStore.set(address, publicKey);
}

// --- OPTION B: Redis / Vercel KV (production) ---
// Uncomment ini dan comment bagian OPTION A di atas jika deploy ke Vercel.
// Install dulu: npm install @vercel/kv
//
// import { kv } from "@vercel/kv";
// async function storeGet(address: string): Promise<string | null> {
//   return kv.get<string>(`pubkey:${address}`);
// }
// async function storeSet(address: string, publicKey: string): Promise<void> {
//   // TTL 7 hari — cukup untuk window transaksi
//   await kv.set(`pubkey:${address}`, publicKey, { ex: 60 * 60 * 24 * 7 });
// }

// ── Handlers ─────────────────────────────────────────────────

export async function POST(request: NextRequest) {
  try {
    const { address, publicKey } = await request.json();

    if (!address || !publicKey) {
      return Response.json(
        { error: "Address dan publicKey wajib ada" },
        { status: 400 }
      );
    }

    await storeSet(address.toLowerCase(), publicKey);
    return Response.json({ success: true, address: address.toLowerCase() });
  } catch (err: any) {
    return Response.json({ error: err.message }, { status: 500 });
  }
}

export async function GET(request: NextRequest) {
  try {
    const address = request.nextUrl.searchParams.get("address");

    if (!address) {
      return Response.json(
        { error: "Parameter address wajib ada" },
        { status: 400 }
      );
    }

    const publicKey = await storeGet(address.toLowerCase());

    if (!publicKey) {
      return Response.json(
        { error: "Public key tidak ditemukan. Pembeli perlu login ulang." },
        { status: 404 }
      );
    }

    return Response.json({
      success: true,
      address: address.toLowerCase(),
      publicKey,
    });
  } catch (err: any) {
    return Response.json({ error: err.message }, { status: 500 });
  }
}