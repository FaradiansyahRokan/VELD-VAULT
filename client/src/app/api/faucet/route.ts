/**
 * Faucet API — /api/faucet
 *
 * Kirim sejumlah kecil VELD ke wallet baru yang belum punya saldo.
 * Dipanggil otomatis dari client saat createWallet / importWallet.
 *
 * Semua konfigurasi diambil dari .env.local:
 *   NEXT_PUBLIC_RPC_URL   — blockchain node
 *   FAUCET_PRIVATE_KEY    — wallet pengirim (server-side only)
 *   FAUCET_AMOUNT         — jumlah VELD per drip (default: 0.05)
 *   FAUCET_COOLDOWN_MS    — cooldown per address (default: 24 jam)
 */

import { ethers } from "ethers";
import { NextRequest } from "next/server";

const RPC_URL          = process.env.NEXT_PUBLIC_RPC_URL  || "http://127.0.0.1:9654/ext/bc/w4DDDiThpt7dv6A1T2UqkAUxZkC1JVceqg3QMpZ8nL4KPQcHs/rpc";
const FAUCET_PRIVATE_KEY = process.env.FAUCET_PRIVATE_KEY || "";
const FAUCET_AMOUNT    = process.env.FAUCET_AMOUNT        || "0.05";
const COOLDOWN_MS      = Number(process.env.FAUCET_COOLDOWN_MS || 24 * 60 * 60 * 1000);
const MIN_THRESHOLD    = ethers.parseEther("0.01");

// In-memory rate limit — cukup untuk dev lokal.
// Untuk Vercel/production: ganti dengan Redis/Vercel KV.
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

    // Rate limit check
    const lastClaimTime = lastClaim.get(normalizedAddress) || 0;
    if (now - lastClaimTime < COOLDOWN_MS) {
      const remaining = Math.ceil((COOLDOWN_MS - (now - lastClaimTime)) / 1000 / 60);
      return Response.json(
        { success: false, error: `Sudah claim. Coba lagi dalam ${remaining} menit.` },
        { status: 429 }
      );
    }

    const provider = new ethers.JsonRpcProvider(RPC_URL);
    const funder   = new ethers.Wallet(FAUCET_PRIVATE_KEY, provider);

    // Jangan drip jika user sudah punya saldo cukup
    const userBalance = await provider.getBalance(address);
    if (userBalance >= MIN_THRESHOLD) {
      return Response.json(
        {
          success: false,
          error: `Saldo sudah cukup (${ethers.formatEther(userBalance)} VELD). Faucet hanya untuk saldo < 0.01 VELD.`,
        },
        { status: 400 }
      );
    }

    // Cek saldo funder
    const amountWei     = ethers.parseEther(FAUCET_AMOUNT);
    const funderBalance = await provider.getBalance(funder.address);
    if (funderBalance < amountWei) {
      console.error("[Faucet] Saldo funder habis:", ethers.formatEther(funderBalance));
      return Response.json(
        { success: false, error: "Faucet sedang kosong. Hubungi admin." },
        { status: 503 }
      );
    }

    // Kirim VELD
    const tx = await funder.sendTransaction({ to: address, value: amountWei });
    lastClaim.set(normalizedAddress, now); // catat sebelum wait agar rate limit aktif segera
    await tx.wait();

    console.log(`[Faucet] Sent ${FAUCET_AMOUNT} VELD → ${address} | tx: ${tx.hash}`);

    return Response.json({
      success: true,
      amount:  FAUCET_AMOUNT,
      txHash:  tx.hash,
      message: `${FAUCET_AMOUNT} VELD telah dikirim ke wallet kamu!`,
    });
  } catch (err: any) {
    console.error("[Faucet] Error:", err);
    return Response.json(
      { success: false, error: err.message || "Faucet gagal" },
      { status: 500 }
    );
  }
}