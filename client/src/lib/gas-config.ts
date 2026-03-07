// ============================================================
// GAS CONFIG — CipherVault / BridgeStone (ChainID 777000)
// ============================================================
// Semua gas override terpusat di sini.
// Ubah nilai di sini → berlaku untuk semua transaksi sekaligus.
//
// PENTING: BridgeStone pakai EIP-1559 (tx type 0x02), bukan legacy.
// Jadi "gasPrice" diabaikan oleh ethers — harus pakai maxFeePerGas.
//
// Cara patch provider (panggil sekali saat init di store.ts):
//   patchProviderFeeData(provider);
// ============================================================


import { ethers, FeeData } from "ethers";

// ── Fee Settings (EIP-1559) ───────────────────────────────────
// maxFeePerGas      = batas atas total fee yang mau dibayar per gas unit
// maxPriorityFeeGas = tip untuk validator (biasanya 1-2 gwei)
//
// Kalau mau lebih murah → turunkan MAX_FEE_PER_GAS
// Kalau tx sering pending → naikkan MAX_PRIORITY_FEE
export const MAX_FEE_PER_GAS = ethers.parseUnits("30", "gwei"); // maks 30 gwei
export const MAX_PRIORITY_FEE = ethers.parseUnits("1", "gwei"); // tip 1 gwei

// ── Gas Limits per operasi ────────────────────────────────────
// Diturunkan dari versi sebelumnya berdasarkan actual tx cost.
// Jika revert "out of gas" → naikkan operasi yang bersangkutan sebesar 20k-50k.
export const GAS_LIMITS = {
    mintAsset: 400_000,  // actual usage ~150k-300k
    listAsset: 300_000,  // actual usage ~150k-250k
    updateListing: 150_000,  // actual usage ~80k-120k
    cancelListing: 150_000,  // actual usage ~60k
    buyAsset: 300_000,  // actual usage ~120k-250k
    transferAsset: 150_000,  // actual usage ~60k-100k
    sendCopy: 300_000,  // actual usage ~120k-200k
    updateEncryptedCid: 150_000,  // actual usage ~80k
    confirmTrade: 300_000,  // actual usage ~150k-250k
    cancelTrade: 150_000,  // actual usage ~80k-120k
    burnAsset: 150_000,  // actual usage ~80k-120k
} as const;

// ── Patch provider.getFeeData ─────────────────────────────────
// INI YANG PALING PENTING — override getFeeData agar ethers tidak
// re-fetch fee dari node (yang bisa kasih 50+ gwei dan override limit kita).
// Panggil fungsi ini di store.ts tepat setelah getProvider() dipanggil.
export function patchProviderFeeData(provider: ethers.JsonRpcProvider): void {
    provider.getFeeData = async (): Promise<FeeData> =>
        new FeeData(null, MAX_FEE_PER_GAS, MAX_PRIORITY_FEE);
}

// ── Helper: override untuk tx biasa (tanpa value) ─────────────
export function gasOverride(operation: keyof typeof GAS_LIMITS) {
    return {
        maxFeePerGas: MAX_FEE_PER_GAS,
        maxPriorityFeePerGas: MAX_PRIORITY_FEE,
        gasLimit: GAS_LIMITS[operation],
    };
}

// ── Helper: override untuk tx dengan value (buyAsset) ─────────
export function gasOverrideWithValue(operation: keyof typeof GAS_LIMITS, value: bigint) {
    return {
        maxFeePerGas: MAX_FEE_PER_GAS,
        maxPriorityFeePerGas: MAX_PRIORITY_FEE,
        gasLimit: GAS_LIMITS[operation],
        value,
    };
}

// ── Estimasi biaya worst-case per operasi ─────────────────────
// Berguna untuk UI: tampilkan estimasi fee sebelum user konfirmasi tx.
export function estimateCost(operation: keyof typeof GAS_LIMITS): string {
    const costWei = BigInt(GAS_LIMITS[operation]) * MAX_FEE_PER_GAS;
    return ethers.formatEther(costWei); // return dalam VELD
}