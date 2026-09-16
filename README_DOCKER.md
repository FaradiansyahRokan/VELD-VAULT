# 🚀 VELD-VAULT (CipherVault) — Docker & VPS Deployment Guide

Dokumentasi ini menjelaskan arsitektur, struktur proyek, dan cara menjalankan VELD-VAULT menggunakan Docker di VPS.

---

## 📌 1. Analisis & Arsitektur Sistem

VELD-VAULT adalah aplikasi **Decentralized Encrypted Vault & Marketplace (Web3)**:
- **Client (Frontend & API)**:
  - Framework: **Next.js 16 (App Router)**, React 19, TailwindCSS v4, TypeScript, ethers.js, PixiJS.
  - Proxy Internal:
    - `/api/rpc`: Reverse proxy untuk request JSON-RPC ke node blockchain (bebas masalah CORS di browser).
    - `/api/ipfs/[...path]`: Reverse proxy untuk request Kubo IPFS (bebas masalah CORS di browser).
    - `/api/faucet`: Pengisian saldo token test STC otomatis ke wallet pengguna baru.
    - `/api/messages` & `/api/pubkey-store`: Relay chat E2E encrypted antar wallet (menggunakan KV/Redis).
- **Decentralized Storage (IPFS)**:
  - Menggunakan image resmi **Kubo IPFS** (`ipfs/kubo:v0.32.0`).
  - Auto-configure CORS saat startup melalui script `docker/ipfs/01-cors.sh`.
- **Smart Contract & Blockchain (Web3)**:
  - Framework: **Hardhat 3** (Solidity 0.8.28, OpenZeppelin v5).
  - Kontrak utama: `CipherVault.sol` (NFT ERC-721 dengan metadata IPFS terenkripsi, marketplace on-chain, escrow, dan transfer atomik).
  - Mode: Dapat menghubungkan ke Subnet STC / Fuji Avalanche eksternal, atau menjalankan local simulated chain melalui Hardhat node di Docker.

---

## 🌐 2. Alokasi Port VPS

Karena di VPS ini sudah berjalan service lain (seperti `sales-setter` di port 3000 dan `evolution-api` di port 8080), port VELD-VAULT telah disesuaikan agar **tidak terjadi bentrok (port collision)**:

| Service | Container Port | Host Port VPS | Keterangan |
|---|---|---|---|
| **Client (Next.js)** | 3000 | **3005** | Akses web: `http://212.47.73.139:3005` |
| **IPFS Gateway** | 8080 | **8088** | Gateway preview IPFS |
| **IPFS API (Kubo)** | 5001 | **5001** | RPC endpoint IPFS |
| **IPFS Swarm** | 4001 | **4001** | Koneksi p2p swarm IPFS |
| **Hardhat Node (Opsional)** | 8545 | **8545** | Local EVM JSON-RPC testnet |

---

## 🛠️ 3. Struktur File Docker

```text
VELD-VAULT/
├── docker-compose.yml       # Orchestrator multi-container (client, ipfs, hardhat)
├── .env.example             # Template konfigurasi environment VPS
├── .env                     # File env aktif
├── .dockerignore            # Ignore file build context
├── client/
│   ├── Dockerfile           # Multi-stage build Next.js (standalone output)
│   └── .dockerignore        # Ignore node_modules, .next, dll.
├── web3/
│   ├── Dockerfile           # Node container untuk Hardhat node
│   └── .dockerignore        # Ignore cache, artifacts, dll.
└── docker/
    └── ipfs/
        └── 01-cors.sh       # Script auto-config CORS untuk IPFS Kubo
```

---

## 🚀 4. Cara Menjalankan

### A. Menjalankan Client & IPFS (Default)
Untuk menjalankan web client dan IPFS node (dengan RPC blockchain eksternal/Subnet STC):
```bash
docker compose up -d
```

### B. Menjalankan Semua Termasuk Local Hardhat Testnet
Jika Anda ingin menjalankan local testnet blockchain Hardhat di VPS:
```bash
docker compose --profile local-chain up -d
```

### C. Melihat Status & Log
```bash
# Cek status container
docker compose ps

# Cek logs real-time
docker compose logs -f

# Cek logs client saja
docker compose logs -f client
```

### D. Menghentikan Layanan
```bash
docker compose down
```

---

## ⚙️ 5. Konfigurasi Environment (`.env`)

Ubah konfigurasi di file `.env` sesuai kebutuhan:
- `PORT`: Port web frontend di host (default: `3005`).
- `NEXT_PUBLIC_RPC_URL`: URL RPC blockchain (misal RPC STC Subnet atau `http://127.0.0.1:8545`).
- `NEXT_PUBLIC_CONTRACT_ADDRESS`: Alamat kontrak `CipherVault` hasil deploy.
- `NEXT_PUBLIC_IPFS_GATEWAY`: URL gateway untuk preview browser (contoh: `http://212.47.73.139:8088`).
- `FAUCET_PRIVATE_KEY`: Private key akun pengisi faucet (jika fitur faucet diaktifkan).
