/**
 * Messages API — /api/messages
 *
 * Relay untuk pesan terenkripsi antar wallet.
 * Konten SELALU terenkripsi E2E di client — server tidak bisa membaca isi pesan.
 *
 * Storage: in-memory (dev) — uncomment Redis untuk production.
 */

import { NextRequest } from "next/server";
import { ethers } from "ethers";

interface StoredMessage {
    id: string;
    from: string;
    to: string;
    encryptedContent: string;
    iv: string;
    senderPublicKey: string;
    timestamp: number;
    read: boolean;
}

// ── OPTION A: In-Memory (dev) ─────────────────────────────────
// const messages: StoredMessage[] = [];

// async function saveMessage(msg: StoredMessage) {
//   messages.push(msg);
//   // Keep last 10k messages in memory
//   if (messages.length > 10000) messages.splice(0, messages.length - 10000);
// }

// async function getMessagesForAddress(address: string): Promise<StoredMessage[]> {
//   const normalized = address.toLowerCase();
//   return messages
//     .filter((m) => m.to === normalized || m.from === normalized)
//     .sort((a, b) => b.timestamp - a.timestamp);
// }

// async function markRead(id: string, reader: string) {
//   const msg = messages.find((m) => m.id === id && m.to === reader.toLowerCase());
//   if (msg) msg.read = true;
// }

// ── OPTION B: Vercel KV / Redis (production) ─────────────────
// Install: npm install @vercel/kv
// Uncomment below, comment out OPTION A above.
//
import { kv } from "@vercel/kv";
async function saveMessage(msg: StoredMessage) {
    await kv.lpush(`msgs:${msg.to}`, JSON.stringify(msg));
    await kv.lpush(`msgs:${msg.from}`, JSON.stringify(msg));
    await kv.ltrim(`msgs:${msg.to}`, 0, 499);
    await kv.ltrim(`msgs:${msg.from}`, 0, 499);
}
async function getMessagesForAddress(address: string): Promise<StoredMessage[]> {
    const raw = (await kv.lrange(`msgs:${address.toLowerCase()}`, 0, 499)) || [];
    return raw.map((r: any) => (typeof r === "string" ? JSON.parse(r) : r)).sort((a: any, b: any) => b.timestamp - a.timestamp);
}
async function markRead(id: string, reader: string) {
    // For simplicity, re-fetch and update — optimize later if needed
}

// ── Handlers ─────────────────────────────────────────────────

// POST /api/messages — kirim pesan
export async function POST(request: NextRequest) {
    try {
        const body = await request.json();
        const { from, to, encryptedContent, iv, senderPublicKey } = body;

        if (!from || !to || !encryptedContent || !iv || !senderPublicKey) {
            return Response.json({ error: "Field tidak lengkap" }, { status: 400 });
        }
        if (!ethers.isAddress(from) || !ethers.isAddress(to)) {
            return Response.json({ error: "Address tidak valid" }, { status: 400 });
        }

        const msg: StoredMessage = {
            id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
            from: from.toLowerCase(),
            to: to.toLowerCase(),
            encryptedContent,
            iv,
            senderPublicKey,
            timestamp: Date.now(),
            read: false,
        };

        await saveMessage(msg);
        return Response.json({ success: true, id: msg.id });
    } catch (err: any) {
        return Response.json({ error: err.message }, { status: 500 });
    }
}

// GET /api/messages?address=xxx — ambil semua pesan untuk address
export async function GET(request: NextRequest) {
    try {
        const address = request.nextUrl.searchParams.get("address");
        const after = request.nextUrl.searchParams.get("after"); // timestamp untuk polling

        if (!address || !ethers.isAddress(address)) {
            return Response.json({ error: "Address tidak valid" }, { status: 400 });
        }

        let msgs = await getMessagesForAddress(address);
        if (after) {
            msgs = msgs.filter((m) => m.timestamp > Number(after));
        }

        return Response.json({ success: true, messages: msgs });
    } catch (err: any) {
        return Response.json({ error: err.message }, { status: 500 });
    }
}

// PATCH /api/messages — tandai pesan sebagai dibaca
export async function PATCH(request: NextRequest) {
    try {
        const { id, reader } = await request.json();
        if (!id || !reader) return Response.json({ error: "id dan reader wajib" }, { status: 400 });
        await markRead(id, reader);
        return Response.json({ success: true });
    } catch (err: any) {
        return Response.json({ error: err.message }, { status: 500 });
    }
}