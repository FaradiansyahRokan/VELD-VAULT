/**
 * CID Override API — /api/cid-override
 *
 * Saat transferAsset, kita tidak bisa panggil updateEncryptedCid di contract
 * (function mungkin tidak ada di ABI atau restricted).
 * Solusi: simpan mapping tokenId → newCid di KV sebagai override.
 *
 * Vault page akan cek KV dulu sebelum pakai CID dari contract.
 *
 * File ini taruh di: app/api/cid-override/route.ts
 */

import { NextRequest } from "next/server";
import { kv } from "@vercel/kv";
import { ethers } from "ethers";

// GET /api/cid-override?tokenId=123
// → { cid: "QmXxx..." } atau { cid: null }
export async function GET(request: NextRequest) {
  const tokenId = request.nextUrl.searchParams.get("tokenId");
  if (!tokenId) return Response.json({ cid: null });

  try {
    const cid = await kv.get<string>(`cid:${tokenId}`);
    return Response.json({ cid: cid ?? null });
  } catch {
    return Response.json({ cid: null });
  }
}

// POST /api/cid-override  body: { tokenId, newCid, ownerAddress, signature }
// → { success: true }
//
// Signature dipakai untuk verifikasi — hanya owner yang bisa update CID.
// Message yang di-sign: "CipherVault-CID-Override:{tokenId}:{newCid}"
export async function POST(request: NextRequest) {
  try {
    const { tokenId, newCid, ownerAddress, signature } = await request.json();

    if (!tokenId || !newCid || !ownerAddress || !signature) {
      return Response.json({ error: "Field tidak lengkap" }, { status: 400 });
    }

    // Verifikasi signature — pastikan caller adalah owner
    const message = `CipherVault-CID-Override:${tokenId}:${newCid}`;
    const recovered = ethers.verifyMessage(message, signature);
    if (recovered.toLowerCase() !== ownerAddress.toLowerCase()) {
      return Response.json({ error: "Signature tidak valid" }, { status: 401 });
    }

    // Simpan dengan TTL 30 hari (2592000 detik)
    await kv.set(`cid:${tokenId}`, newCid, { ex: 2592000 });

    return Response.json({ success: true });
  } catch (err: any) {
    return Response.json({ error: err.message }, { status: 500 });
  }
}

// DELETE /api/cid-override  body: { tokenId, ownerAddress, signature }
// → { success: true }
// Hapus override saat asset di-burn atau tidak relevan lagi
export async function DELETE(request: NextRequest) {
  try {
    const { tokenId, ownerAddress, signature } = await request.json();
    const message = `CipherVault-CID-Delete:${tokenId}`;
    const recovered = ethers.verifyMessage(message, signature);
    if (recovered.toLowerCase() !== ownerAddress.toLowerCase()) {
      return Response.json({ error: "Signature tidak valid" }, { status: 401 });
    }
    await kv.del(`cid:${tokenId}`);
    return Response.json({ success: true });
  } catch (err: any) {
    return Response.json({ error: err.message }, { status: 500 });
  }
}