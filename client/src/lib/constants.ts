// ============================================================
// CIPHERVAULT — GLOBAL CONFIG
// Semua nilai diambil dari .env.local
// Ganti di .env.local → semua file otomatis ikut
// ============================================================

export const NETWORK_CONFIG = {
  // ── Identitas Jaringan ───────────────────────────────────────
  chainId:    Number(process.env.NEXT_PUBLIC_CHAIN_ID)   || 777000,
  name:       process.env.NEXT_PUBLIC_NETWORK_NAME       || "BridgeStone",

  // ── Token ───────────────────────────────────────────────────
  tokenSymbol: process.env.NEXT_PUBLIC_TOKEN_SYMBOL      || "VELD",
  tokenName:   process.env.NEXT_PUBLIC_TOKEN_NAME        || "VELD Token",

  // ── Endpoints ───────────────────────────────────────────────
  rpcUrl:      process.env.NEXT_PUBLIC_RPC_URL           || "http://127.0.0.1:9654/ext/bc/w4DDDiThpt7dv6A1T2UqkAUxZkC1JVceqg3QMpZ8nL4KPQcHs/rpc",
  ipfsUrl:     process.env.NEXT_PUBLIC_IPFS_URL          || "http://127.0.0.1:5001",
  ipfsGateway: process.env.NEXT_PUBLIC_IPFS_GATEWAY      || "http://127.0.0.1:8080",

  // ── Explorer (opsional) ──────────────────────────────────────
  explorerUrl: process.env.NEXT_PUBLIC_EXPLORER_URL      || "",
} as const;

// ── Contract Address ─────────────────────────────────────────
export const CONTRACT_ADDRESS =
  process.env.NEXT_PUBLIC_CONTRACT_ADDRESS ||
  "0xfEaE1829545008221d3cac836acDA2ACd39748b6";

// ── Encryption ───────────────────────────────────────────────
// v2 = wallet-bound AES key wrap (default untuk upload baru)
// v3 = ECDH re-encrypted untuk buyer (dipakai saat confirmTrade)
export const ENCRYPTION_VERSION = 2;
export const KEY_DERIVATION_MESSAGE =
  `CipherVault-KeyDerivation-v2-${process.env.NEXT_PUBLIC_NETWORK_NAME || "BridgeStone"}-${process.env.NEXT_PUBLIC_CHAIN_ID || "777000"}`;