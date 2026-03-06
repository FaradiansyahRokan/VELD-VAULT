// ============================================================
// CIPHERVAULT — NETWORK & CONTRACT CONFIG
// BRIDGESTONE on Avalanche Fuji Testnet
// ============================================================

export const NETWORK_CONFIG = {
  // ── Identitas Jaringan ───────────────────────────────────────
  chainId: 777000,
  name: "BridgeStone",
  vmVersion: "v0.8.0",
  validation: "Proof Of Authority",

  // ── Token ───────────────────────────────────────────────────
  tokenSymbol: "VELD",
  tokenName: "VELD Token",

  // ── Endpoints ───────────────────────────────────────────────
  rpcUrl:
    process.env.NEXT_PUBLIC_RPC_URL ||
    "http://127.0.0.1:9654/ext/bc/w4DDDiThpt7dv6A1T2UqkAUxZkC1JVceqg3QMpZ8nL4KPQcHs/rpc",
  // IPFS Kubo default
  ipfsUrl:
    process.env.NEXT_PUBLIC_IPFS_URL || "http://127.0.0.1:5001",
  // IPFS Gateway untuk fetch preview
  ipfsGateway:
    process.env.NEXT_PUBLIC_IPFS_GATEWAY || "http://127.0.0.1:8080",

  // ── Identifiers ─────────────────────────────────────────────
  blockchainId: "w4DDDiThpt7dv6A1T2UqkAUxZkC1JVceqg3QMpZ8nL4KPQcHs",
  blockchainIdHex:
    "0x7abd425d4db2319713661a4ce92a81fb947b04c712628fe600885c5b642ea9a0",
  subnetId: "xDz4vC8zvwsF31MXWw7PgbGW1PHtobLsp3kstvcvjxVqoEvni",

  // ── Admin & Precompile ───────────────────────────────────────
  nativeMinterAdmin: "0xC0B4A49630527a15b1f818A2624423Ab340E48b9",
  icmMessenger: "0x253b2784c75e510dD0fF1da844684a1aC0aa5fcf",
  icmRegistry: "0xCF0922BbcE180d7b1144B10FEbc5ae58cf34212B",
  validatorManager: "0x0Feedc0de0000000000000000000000000000000",

  // ── Explorer (opsional, isi jika ada) ───────────────────────
  explorerUrl: process.env.NEXT_PUBLIC_EXPLORER_URL || "",
};

// ── Contract Address ────────────────────────────────────────
// ⚠️  GANTI setelah deploy: npx hardhat run scripts/deploy.js --network apexnetwork
export const CONTRACT_ADDRESS =
  process.env.NEXT_PUBLIC_CONTRACT_ADDRESS ||
  "0xCE5483C96601E97Bda3E5BAE18885944EA6Dbb8e";

// ── Encryption Config ────────────────────────────────────────
// Version 2 = wallet-bound AES key wrapping (aman, tidak bisa dibaca walau CID bocor)
// Version 1 = legacy plaintext key (backward compat untuk file lama)
export const ENCRYPTION_VERSION = 2;
export const KEY_DERIVATION_MESSAGE =
  "CipherVault-KeyDerivation-v2-BridgeStone-777000";