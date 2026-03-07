/**
 * Public Key Store API — /api/pubkey-store
 *
 * Menyimpan public key wallet yang dibutuhkan untuk:
 * 1. ECDH re-encryption saat confirmTrade
 * 2. Enkripsi pesan antar wallet (Secure Messenger)
 *
 * Auto-register dipanggil saat user login (lihat store.ts).
 */

import { NextRequest } from "next/server";

// ── OPTION A: In-Memory (dev lokal) ──────────────────────────
// const pubkeyStore = new Map<string, string>();

// async function storeGet(address: string): Promise<string | null> {
//   return pubkeyStore.get(address) ?? null;
// }
// async function storeSet(address: string, publicKey: string): Promise<void> {
//   pubkeyStore.set(address, publicKey);
// }

// ── OPTION B: Vercel KV (production) — uncomment kalau deploy
import { kv } from "@vercel/kv";
async function storeGet(address: string): Promise<string | null> {
  return kv.get<string>(`pubkey:${address}`);
}
async function storeSet(address: string, publicKey: string): Promise<void> {
  await kv.set(`pubkey:${address}`, publicKey, { ex: 60 * 60 * 24 * 30 }); // 30 hari
}

// ── Handlers ─────────────────────────────────────────────────

// POST /api/pubkey-store — simpan/update public key
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

// GET /api/pubkey-store?address=xxx — ambil public key
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
        { error: "Public key tidak ditemukan. Pengguna perlu login ulang agar bisa menerima pesan." },
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