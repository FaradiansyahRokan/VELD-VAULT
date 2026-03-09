/**
 * Faucet API — /api/faucet
 *
 * Kirim sejumlah kecil STC ke wallet baru yang belum punya saldo.
 *
 * URL RPC diambil dari KV (paling fresh) → env var → localhost.
 */

import { ethers } from "ethers";
import { NextRequest } from "next/server";
import { getActiveRpcUrl } from "@/lib/tunnel-url";

const FAUCET_PRIVATE_KEY = process.env.FAUCET_PRIVATE_KEY || "";
const FAUCET_AMOUNT      = process.env.FAUCET_AMOUNT      || "0.05";
const COOLDOWN_MS        = Number(process.env.FAUCET_COOLDOWN_MS || 24 * 60 * 60 * 1000);
const MIN_THRESHOLD      = ethers.parseEther("0.01");

// In-memory rate limit — cukup untuk dev lokal.
// Untuk production: ganti dengan Redis/Vercel KV.
const lastClaim = new Map<string, number>();

export async function POST(request: NextRequest) {
  try {
    if (!FAUCET_PRIVATE_KEY) {
      return Response.json(
        { success: false, error: "Faucet belum dikonfigurasi (FAUCET_PRIVATE_KEY kosong)" },
        { status: 503 }
      );
    }

    const { address } = await request.json();

    if (!address || !ethers.isAddress(address)) {
      return Response.json(
        { success: false, error: "Address tidak valid" },
        { status: 400 }
      );
    }

    const normalizedAddress = address.toLowerCase();
    const now = Date.now();

    const lastClaimTime = lastClaim.get(normalizedAddress) || 0;
    if (now - lastClaimTime < COOLDOWN_MS) {
      const remaining = Math.ceil((COOLDOWN_MS - (now - lastClaimTime)) / 1000 / 60);
      return Response.json(
        { success: false, error: `Sudah claim. Coba lagi dalam ${remaining} menit.` },
        { status: 429 }
      );
    }

    const RPC_URL  = await getActiveRpcUrl(); // ← baca dari KV, selalu fresh
    const provider = new ethers.JsonRpcProvider(RPC_URL);
    const funder   = new ethers.Wallet(FAUCET_PRIVATE_KEY, provider);

    const userBalance = await provider.getBalance(address);
    if (userBalance >= MIN_THRESHOLD) {
      return Response.json(
        {
          success: false,
          error: `Saldo sudah cukup (${ethers.formatEther(userBalance)} STC). Faucet hanya untuk saldo < 0.01 STC.`,
        },
        { status: 400 }
      );
    }

    const amountWei     = ethers.parseEther(FAUCET_AMOUNT);
    const funderBalance = await provider.getBalance(funder.address);
    if (funderBalance < amountWei) {
      console.error("[Faucet] Saldo funder habis:", ethers.formatEther(funderBalance));
      return Response.json(
        { success: false, error: "Faucet sedang kosong. Hubungi admin." },
        { status: 503 }
      );
    }

    const tx = await funder.sendTransaction({ to: address, value: amountWei });
    lastClaim.set(normalizedAddress, now);
    await tx.wait();

    console.log(`[Faucet] Sent ${FAUCET_AMOUNT} STC → ${address} | tx: ${tx.hash}`);

    return Response.json({
      success: true,
      amount:  FAUCET_AMOUNT,
      txHash:  tx.hash,
      message: `${FAUCET_AMOUNT} STC telah dikirim ke wallet kamu!`,
    });
  } catch (err: any) {
    console.error("[Faucet] Error:", err);
    return Response.json(
      { success: false, error: err.message || "Faucet gagal" },
      { status: 500 }
    );
  }
}