// ============================================================
// CIPHERVAULT — GLOBAL CONFIG
// Semua nilai diambil dari .env.local
// Ganti di .env.local → semua file otomatis ikut
// ============================================================

export const NETWORK_CONFIG = {
  // ── Identitas Jaringan ───────────────────────────────────────
  chainId:    Number(process.env.NEXT_PUBLIC_CHAIN_ID)   || 666999,
  name:       process.env.NEXT_PUBLIC_NETWORK_NAME       || "BridgeStone",

  // ── Token ───────────────────────────────────────────────────
  tokenSymbol: process.env.NEXT_PUBLIC_TOKEN_SYMBOL      || "STC",
  tokenName:   process.env.NEXT_PUBLIC_TOKEN_NAME        || "StoneCrypt",

  // ── Endpoints ───────────────────────────────────────────────
  rpcUrl:      process.env.NEXT_PUBLIC_RPC_URL           || "http://127.0.0.1:9650/ext/bc/2N6ekKdQUxdUFxFp8x6xPSXLod3a3sXzQiEWjVepbtXPFa4Uej/rpc",
  ipfsUrl:     process.env.NEXT_PUBLIC_IPFS_URL          || "http://127.0.0.1:5001",
  ipfsGateway: process.env.NEXT_PUBLIC_IPFS_GATEWAY      || "http://127.0.0.1:8080",

  // ── Explorer (opsional) ──────────────────────────────────────
  explorerUrl: process.env.NEXT_PUBLIC_EXPLORER_URL      || "",
} as const;

// ── Contract Address ─────────────────────────────────────────
export const CONTRACT_ADDRESS =
  process.env.NEXT_PUBLIC_CONTRACT_ADDRESS ||
  "0x91Fb44b710522314Ead3A3C759b4fAe739363801";

// ── Encryption ───────────────────────────────────────────────
// v2 = wallet-bound AES key wrap (default untuk upload baru)
// v3 = ECDH re-encrypted untuk buyer (dipakai saat confirmTrade)
export const ENCRYPTION_VERSION = 2;
export const KEY_DERIVATION_MESSAGE =
  `CipherVault-KeyDerivation-v2-${process.env.NEXT_PUBLIC_NETWORK_NAME || "BridgeStone"}-${process.env.NEXT_PUBLIC_CHAIN_ID || "666999"}`;