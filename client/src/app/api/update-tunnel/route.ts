/**
 * Update Tunnel URL — /api/update-tunnel
 *
 * Endpoint ini dipanggil otomatis dari script lokal setiap kali
 * tunnel Cloudflare/ngrok restart dan dapat URL baru.
 *
 * Cara pakai (jalankan di terminal lokal setiap tunnel restart):
 *
 *   node scripts/update-tunnel.mjs
 *
 * Atau manual dengan curl:
 *   curl -X POST https://your-app.vercel.app/api/update-tunnel \
 *     -H "Content-Type: application/json" \
 *     -H "x-tunnel-secret: <TUNNEL_UPDATE_SECRET dari .env.local>" \
 *     -d '{"rpc":"https://xxx.trycloudflare.com/ext/bc/.../rpc","ipfs":"https://yyy.trycloudflare.com"}'
 *
 * Env var yang wajib ada di Vercel dashboard:
 *   TUNNEL_UPDATE_SECRET  — token rahasia (bebas isinya, misal UUID)
 */

import { NextRequest } from "next/server";
import { kv } from "@vercel/kv";

export async function POST(request: NextRequest) {
  try {
    // Validasi secret agar tidak sembarang orang bisa ganti URL
    const secret = request.headers.get("x-tunnel-secret");
    if (!secret || secret !== process.env.TUNNEL_UPDATE_SECRET) {
      return Response.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { rpc, ipfs } = await request.json();

    if (!rpc && !ipfs) {
      return Response.json(
        { error: "Minimal satu dari: rpc, ipfs wajib diisi" },
        { status: 400 }
      );
    }

    const updates: Record<string, string> = {};

    if (rpc) {
      await kv.set("tunnel:rpc", rpc, { ex: 60 * 60 * 24 }); // expire 24 jam
      updates.rpc = rpc;
    }

    if (ipfs) {
      await kv.set("tunnel:ipfs", ipfs, { ex: 60 * 60 * 24 });
      updates.ipfs = ipfs;
    }

    console.log("[update-tunnel] URLs updated:", updates);

    return Response.json({
      success: true,
      updated: updates,
      message: "Tunnel URLs berhasil diupdate. Semua request langsung pakai URL baru.",
    });
  } catch (err: any) {
    console.error("[update-tunnel] Error:", err);
    return Response.json({ error: err.message }, { status: 500 });
  }
}

// GET untuk cek URL yang sedang aktif (debug)
export async function GET(request: NextRequest) {
  const secret = request.nextUrl.searchParams.get("secret");
  if (!secret || secret !== process.env.TUNNEL_UPDATE_SECRET) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const [rpc, ipfs] = await Promise.all([
      kv.get<string>("tunnel:rpc"),
      kv.get<string>("tunnel:ipfs"),
    ]);

    return Response.json({
      rpc: rpc || process.env.NEXT_PUBLIC_RPC_URL || "(tidak diset)",
      ipfs: ipfs || process.env.NEXT_PUBLIC_IPFS_URL || "(tidak diset)",
      source: { rpc: rpc ? "KV" : "env", ipfs: ipfs ? "KV" : "env" },
    });
  } catch (err: any) {
    return Response.json({ error: err.message }, { status: 500 });
  }
}