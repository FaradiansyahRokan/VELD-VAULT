/**
 * Typing Indicator API — /api/typing
 *
 * Simpan state "sedang mengetik" dengan TTL 5 detik di KV.
 * Caller harus notify ulang tiap < 5 detik supaya status tidak expire.
 *
 * File ini taruh di: app/api/typing/route.ts
 */

import { NextRequest } from "next/server";
import { kv } from "@vercel/kv";

// GET /api/typing?address=SENDER&peerAddress=VIEWER
// → Cek apakah `address` sedang mengetik pesan untuk `peerAddress`
export async function GET(request: NextRequest) {
  try {
    const address     = request.nextUrl.searchParams.get("address")?.toLowerCase();
    const peerAddress = request.nextUrl.searchParams.get("peerAddress")?.toLowerCase();

    if (!address || !peerAddress) {
      return Response.json({ error: "address dan peerAddress wajib" }, { status: 400 });
    }

    // Key: typing:{from}:{to}  — nilainya "1", expire otomatis
    const key    = `typing:${address}:${peerAddress}`;
    const val    = await kv.get(key);
    const typing = val === "1" || val === 1;

    return Response.json({ typing });
  } catch (err: any) {
    return Response.json({ typing: false, error: err.message }, { status: 500 });
  }
}

// POST /api/typing  body: { from, to }
// → Set "from sedang mengetik ke to" dengan TTL 5 detik
export async function POST(request: NextRequest) {
  try {
    const { from, to } = await request.json();

    if (!from || !to) {
      return Response.json({ error: "from dan to wajib" }, { status: 400 });
    }

    const key = `typing:${from.toLowerCase()}:${to.toLowerCase()}`;
    // EX = seconds TTL — habis 5 detik otomatis hilang
    await kv.set(key, "1", { ex: 5 });

    return Response.json({ success: true });
  } catch (err: any) {
    return Response.json({ error: err.message }, { status: 500 });
  }
}