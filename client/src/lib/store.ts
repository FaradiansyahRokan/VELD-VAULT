import { create } from "zustand";
import { ethers } from "ethers";
import { getTunnelUrls, checkNodeHealth } from "./tunnel-sync";
import { NETWORK_CONFIG, CONTRACT_ADDRESS } from "./constants";
import { gasOverride, gasOverrideWithValue, patchProviderFeeData } from "./gas-config";
import CipherVaultArtifact from "@/abis/CipherVault.json";
import {
  reEncryptForBuyer,
  encryptAndUpload,
  decryptFile,
  unlockVaultKey,
  clearVaultKey,
} from "./crypto-engine";

// ============================================================
// NETWORK SETUP — BRIDGESTONE (Avalanche L1, ChainID 777000)
// ============================================================
// Di browser: semua RPC call lewat proxy /api/rpc (same-origin, bebas CORS).
// Di server / node: pakai URL langsung.

const DIRECT_RPC_URL =
  process.env.NEXT_PUBLIC_RPC_URL || NETWORK_CONFIG.rpcUrl;

const isBrowser = typeof window !== "undefined";

let RPC_URL = isBrowser
  ? window.location.origin + "/api/rpc"
  : DIRECT_RPC_URL;

function getProvider(url: string): ethers.JsonRpcProvider {
  const req = new ethers.FetchRequest(url);
  req.setHeader("ngrok-skip-browser-warning", "true");
  const provider = new ethers.JsonRpcProvider(
    req,
    { chainId: NETWORK_CONFIG.chainId, name: NETWORK_CONFIG.name },
    { staticNetwork: true }
  );
  // ✅ Override getFeeData agar ethers tidak re-fetch fee dari node.
  // Tanpa ini, ethers bisa pakai 50+ gwei meskipun kita set 30 gwei di gasOverride.
  patchProviderFeeData(provider);
  return provider;
}

// ============================================================
// FAUCET — Request VELD otomatis untuk wallet baru
// ============================================================
async function requestFaucet(address: string): Promise<void> {
  try {
    const res = await fetch("/api/faucet", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ address }),
    });
    const data = await res.json();
    if (data.success) {
      console.log(`[Faucet] ${data.message}`);
    } else {
      // Bukan error fatal — mungkin sudah punya saldo atau cooldown
      console.warn("[Faucet]", data.error);
    }
  } catch (err) {
    console.warn("[Faucet] Tidak bisa terhubung ke faucet API:", err);
  }
}

// ============================================================
// PUBKEY REGISTER — Auto-register saat login
// ============================================================
// Dipanggil saat createWallet & importWallet selesai.
// Fire-and-forget — tidak blokir login, gagal pun tidak masalah.
async function registerPublicKey(wallet: ethers.Wallet | ethers.HDNodeWallet): Promise<void> {
  try {
    await fetch("/api/pubkey-store", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        address: wallet.address,
        publicKey: (wallet as ethers.Wallet).signingKey?.publicKey,
      }),
    });
  } catch {
    // silent fail
  }
}

// ============================================================
// TYPES
// ============================================================
export interface WalletInfo {
  address: string;
  privateKey: string;
  mnemonic?: string;
}

export type NetworkStatus = "checking" | "online" | "offline" | "wrong-network";

interface VaultState {
  provider: ethers.JsonRpcProvider | null;
  signer: ethers.Wallet | ethers.HDNodeWallet | null;
  contract: ethers.Contract | null;
  wallet: WalletInfo | null;
  balance: string;

  vaultItems: any[];
  marketItems: any[];
  salesItems: any[];

  networkStatus: NetworkStatus;
  refreshInterval: NodeJS.Timeout | null;
  isAutoRefreshRunning: boolean;

  // Auth
  createWallet: () => Promise<string>;
  importWallet: (secret: string) => Promise<boolean>;
  logout: () => void;

  // Network
  startAutoRefresh: () => Promise<void>;
  stopAutoRefresh: () => void;
  syncAll: () => Promise<void>;
  checkNetwork: () => Promise<NetworkStatus>;
  refreshBalance: () => Promise<void>;
  ensureGas: () => Promise<void>;

  // Fetch
  fetchMyAssets: () => Promise<any[]>;
  fetchMarketAssets: () => Promise<any[]>;
  fetchMyEscrowSales: () => Promise<any[]>;

  // File Operations
  mintAndEncrypt: (file: File) => Promise<number>;
  downloadAndDecrypt: (tokenId: number) => Promise<File>;
  unlockVault: () => Promise<void>;

  // Transactions
  listAssetForSale: (
    tokenId: number,
    price: string,
    description: string,
    previewURI: string | null,
    useEscrow: boolean
  ) => Promise<boolean>;
  updateListing: (
    tokenId: number,
    newPrice: string,
    newDesc: string,
    useEscrow: boolean
  ) => Promise<boolean>;
  cancelListing: (tokenId: number) => Promise<boolean>;
  buyAsset: (tokenId: number, price: string) => Promise<boolean>;
  transferAsset: (tokenId: number, to: string) => Promise<boolean>;
  sendCopyAsset: (
    tokenId: number,
    to: string,
    name: string,
    encryptedCid: string
  ) => Promise<boolean>;
  confirmTrade: (tokenId: number) => Promise<boolean>;
  cancelTrade: (tokenId: number) => Promise<boolean>;
  burnAsset: (tokenId: number, cid: string) => Promise<boolean>;
}

// ============================================================
// STORE
// ============================================================
export const useStore = create<VaultState>((set, get) => ({
  provider: null,
  signer: null,
  contract: null,
  wallet: null,
  balance: "0",
  vaultItems: [],
  marketItems: [],
  salesItems: [],
  networkStatus: "checking",
  refreshInterval: null,
  isAutoRefreshRunning: false,

  // ----------------------------------------------------------
  // LOGOUT
  // ----------------------------------------------------------
  logout: () => {
    const { signer } = get();
    // Hapus cached vault key dari memori
    if (signer) clearVaultKey(signer).catch(() => {});
    get().stopAutoRefresh();
    set({
      provider: null,
      signer: null,
      contract: null,
      wallet: null,
      balance: "0",
      vaultItems: [],
      marketItems: [],
      salesItems: [],
      networkStatus: "checking",
      isAutoRefreshRunning: false,
    });
  },

  // ----------------------------------------------------------
  // CHECK NETWORK
  // ----------------------------------------------------------
  checkNetwork: async (): Promise<NetworkStatus> => {
    try {
      const healthy = await checkNodeHealth();
      if (!healthy) {
        set({ networkStatus: "offline" });
        return "offline";
      }
      const { provider } = get();
      if (provider) {
        const network = await provider.getNetwork();
        if (Number(network.chainId) !== NETWORK_CONFIG.chainId) {
          set({ networkStatus: "wrong-network" });
          return "wrong-network";
        }
      }
      set({ networkStatus: "online" });
      return "online";
    } catch {
      set({ networkStatus: "offline" });
      return "offline";
    }
  },

  // ----------------------------------------------------------
  // CREATE WALLET
  // ----------------------------------------------------------
  createWallet: async (): Promise<string> => {
    get().logout();
    const provider = getProvider(RPC_URL);
    const randomWallet = ethers.Wallet.createRandom();
    const connectedWallet = randomWallet.connect(provider);
    const contract = new ethers.Contract(
      CONTRACT_ADDRESS,
      CipherVaultArtifact.abi,
      connectedWallet
    );

    let balance = "0.0";
    try {
      const bal = await provider.getBalance(connectedWallet.address);
      balance = ethers.formatEther(bal);
    } catch {}

    // Drip VELD otomatis jika wallet baru/kosong
    if (parseFloat(balance) < 0.01) {
      requestFaucet(connectedWallet.address).then(() => get().refreshBalance());
    }

    set({
      provider,
      signer: connectedWallet,
      contract,
      wallet: {
        address: connectedWallet.address,
        privateKey: connectedWallet.privateKey,
        mnemonic: randomWallet.mnemonic?.phrase,
      },
      balance,
      vaultItems: [],
      salesItems: [],
    });

    // Daftarkan public key agar bisa menerima pesan & re-encrypt escrow
    registerPublicKey(connectedWallet);

    get().startAutoRefresh();
    return randomWallet.mnemonic!.phrase;
  },

  // ----------------------------------------------------------
  // IMPORT WALLET
  // ----------------------------------------------------------
  importWallet: async (secret: string): Promise<boolean> => {
    get().logout();
    try {
      const provider = getProvider(RPC_URL);
      const cleanSecret = secret.trim();

      let walletInstance: ethers.Wallet | ethers.HDNodeWallet;
      if (cleanSecret.split(" ").length > 1) {
        walletInstance = ethers.Wallet.fromPhrase(cleanSecret);
      } else {
        walletInstance = new ethers.Wallet(cleanSecret);
      }

      const connectedWallet = walletInstance.connect(provider);
      const contract = new ethers.Contract(
        CONTRACT_ADDRESS,
        CipherVaultArtifact.abi,
        connectedWallet
      );

      let balance = "0.0";
      try {
        const bal = await provider.getBalance(connectedWallet.address);
        balance = ethers.formatEther(bal);
      } catch {}

      // Drip VELD otomatis jika saldo rendah
      if (parseFloat(balance) < 0.01) {
        requestFaucet(connectedWallet.address).then(() => get().refreshBalance());
      }

      set({
        provider,
        signer: connectedWallet,
        contract,
        wallet: {
          address: connectedWallet.address,
          privateKey: connectedWallet.privateKey,
        },
        balance,
      });

      // Daftarkan public key agar bisa menerima pesan & re-encrypt escrow
      registerPublicKey(connectedWallet);

      get().startAutoRefresh();
      return true;
    } catch (e) {
      console.error("importWallet error:", e);
      return false;
    }
  },

  // ----------------------------------------------------------
  // REFRESH BALANCE
  // ----------------------------------------------------------
  refreshBalance: async () => {
    const { wallet } = get();
    if (!wallet) return;
    try {
      const response = await fetch(RPC_URL, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "ngrok-skip-browser-warning": "true",
        },
        body: JSON.stringify({
          jsonrpc: "2.0",
          method: "eth_getBalance",
          params: [wallet.address, "latest"],
          id: 1,
        }),
        signal: AbortSignal.timeout(5000),
      });
      const data = await response.json();
      if (data?.result) {
        set({ balance: ethers.formatEther(BigInt(data.result)) });
      }
    } catch (err) {
      console.error("[refreshBalance] Gagal fetch balance:", err);
    }
  },

  // ----------------------------------------------------------
  // ENSURE GAS
  // ----------------------------------------------------------
  ensureGas: async () => {
    await get().refreshBalance();
    const { balance } = get();
    if (parseFloat(balance) < 0.001) {
      throw new Error(
        `Saldo ${NETWORK_CONFIG.tokenSymbol} tidak cukup. Minimal 0.001 ${NETWORK_CONFIG.tokenSymbol}.`
      );
    }
  },

  // ----------------------------------------------------------
  // START AUTO REFRESH
  // ----------------------------------------------------------
  startAutoRefresh: async () => {
    if (get().isAutoRefreshRunning) return;
    set({ isAutoRefreshRunning: true });

    // Update RPC URL jika pakai ngrok (hanya di server, bukan browser)
    if (typeof window !== "undefined" && window.location.hostname !== "localhost") {
      try {
        const urls = await getTunnelUrls();
        if (urls.blockchain && !isBrowser) {
          RPC_URL = urls.blockchain;
          const provider = getProvider(RPC_URL);
          const currentSigner = get().signer;
          if (currentSigner) {
            const newSigner = currentSigner.connect(provider);
            const contract = new ethers.Contract(
              CONTRACT_ADDRESS,
              CipherVaultArtifact.abi,
              newSigner
            );
            set({ provider, signer: newSigner, contract });
          }
        }
      } catch {}
    }

    if (get().refreshInterval) return;

    // Initial sync
    get().syncAll();
    get().checkNetwork();

    // Polling setiap 4 detik
    const interval = setInterval(() => {
      if (get().contract) {
        get().syncAll();
        get().checkNetwork();
      }
    }, 4000);

    set({ refreshInterval: interval });
  },

  // ----------------------------------------------------------
  // STOP AUTO REFRESH
  // ----------------------------------------------------------
  stopAutoRefresh: () => {
    const { refreshInterval } = get();
    if (refreshInterval) clearInterval(refreshInterval);
    set({ refreshInterval: null, isAutoRefreshRunning: false });
  },

  // ----------------------------------------------------------
  // SYNC ALL
  // ----------------------------------------------------------
  syncAll: async () => {
    const { contract } = get();
    if (!contract) return;
    try {
      const [vault, market, sales] = await Promise.all([
        get().fetchMyAssets(),
        get().fetchMarketAssets(),
        get().fetchMyEscrowSales(),
      ]);
      set({
        vaultItems: [...(vault || [])],
        marketItems: [...(market || [])],
        salesItems: [...(sales || [])],
      });
      get().refreshBalance();
    } catch (e) {
      console.error("syncAll error:", e);
    }
  },

  // ----------------------------------------------------------
  // FETCH MY ASSETS
  // ----------------------------------------------------------
  fetchMyAssets: async () => {
    const { contract } = get();
    if (!contract) return [];
    try {
      const rawData = await contract.getMyAssets();
      return Array.from(rawData)
        .map((item: any) => ({
          id: Number(item.id),
          name: item.name,
          cid: item.encryptedCid,
          owner: item.owner,
          seller: item.seller,
          buyer: item.buyer,
          isListed: item.isListed,
          price: ethers.formatEther(item.price),
          description: item.description,
          isCopy: item.isCopy,
          useEscrow: item.useEscrow,
          previewURI: item.previewURI,
          sellerConfirmed: item.sellerConfirmed,
          buyerConfirmed: item.buyerConfirmed,
          isEscrowActive: item.isEscrowActive,
        }))
        .filter((p) => p.id > 0);
    } catch {
      return [];
    }
  },

  // ----------------------------------------------------------
  // FETCH MARKET ASSETS
  // ----------------------------------------------------------
  fetchMarketAssets: async () => {
    const { contract } = get();
    if (!contract) return [];
    try {
      const rawData = await contract.getAllListedAssets();
      return Array.from(rawData)
        .map((item: any) => ({
          tokenId: Number(item.tokenId ?? item.id),
          seller: item.seller,
          price: ethers.formatEther(item.price),
          name: item.name,
          description: item.description,
          isCopy: item.isCopy,
          previewURI: item.previewURI,
          useEscrow: item.useEscrow,
        }))
        .filter((p) => p.tokenId > 0);
    } catch {
      return [];
    }
  },

  // ----------------------------------------------------------
  // FETCH MY ESCROW SALES
  // Menampilkan item di mana seller belum konfirmasi (tombol "Terima" masih aktif).
  // ----------------------------------------------------------
  fetchMyEscrowSales: async () => {
    const { contract, wallet } = get();
    if (!contract || !wallet) return [];
    try {
      const rawData = await contract.getMyAssets();
      return Array.from(rawData)
        .filter(
          (item: any) =>
            item.isEscrowActive &&
            !item.sellerConfirmed &&
            item.seller.toLowerCase() === wallet.address.toLowerCase()
        )
        .map((item: any) => ({
          tokenId: Number(item.id),
          name: item.name,
          price: ethers.formatEther(item.price),
          buyer: item.buyer,
          sellerConfirmed: item.sellerConfirmed,
        }))
        .filter((p) => p.tokenId > 0);
    } catch {
      return [];
    }
  },

  // ----------------------------------------------------------
  // UNLOCK VAULT
  // Panggil sekali saat vault dibuka — MetaMask popup muncul di sini.
  // ----------------------------------------------------------
  unlockVault: async () => {
    const { signer } = get();
    if (!signer) throw new Error("Wallet tidak terhubung");
    await unlockVaultKey(signer);
  },

  // ----------------------------------------------------------
  // MINT & ENCRYPT — Upload file, enkripsi, mint NFT
  // ----------------------------------------------------------
  mintAndEncrypt: async (file: File): Promise<number> => {
    const { contract, signer, syncAll } = get();
    if (!contract || !signer) throw new Error("Wallet tidak terhubung");

    // 1. Enkripsi & upload ke IPFS
    const { cid } = await encryptAndUpload(file, signer);

    // 2. Mint NFT di contract
    const tx = await contract.mintAsset(file.name, cid, gasOverride("mintAsset"));
    const receipt = await tx.wait();

    // 3. Ambil tokenId dari event Transfer
    let tokenId = 0;
    for (const log of receipt.logs) {
      try {
        const parsed = contract.interface.parseLog(log);
        if (parsed?.name === "Transfer" && parsed.args[0] === ethers.ZeroAddress) {
          tokenId = Number(parsed.args[2]);
          break;
        }
      } catch {}
    }

    await syncAll();
    return tokenId;
  },

  // ----------------------------------------------------------
  // DOWNLOAD & DECRYPT — Ambil file dari IPFS, dekripsi
  // ----------------------------------------------------------
  downloadAndDecrypt: async (tokenId: number): Promise<File> => {
    const { vaultItems, signer } = get();
    if (!signer) throw new Error("Wallet tidak terhubung");

    const item = vaultItems.find((i) => i.id === tokenId);
    if (!item) throw new Error("Asset tidak ditemukan di vault");

    return decryptFile(item.cid, signer);
  },

  // ----------------------------------------------------------
  // LIST ASSET FOR SALE
  // ----------------------------------------------------------
  listAssetForSale: async (tokenId, price, description, previewURI, useEscrow) => {
    const { contract, syncAll } = get();
    try {
      const tx = await contract!.listAsset(
        tokenId,
        ethers.parseEther(price),
        description,
        previewURI || "",
        useEscrow,
        gasOverride("listAsset")
      );
      await tx.wait();
      await syncAll();
      return true;
    } catch (error: any) {
      throw new Error(parseContractError(error));
    }
  },

  // ----------------------------------------------------------
  // UPDATE LISTING
  // ----------------------------------------------------------
  updateListing: async (tokenId, newPrice, newDesc, useEscrow) => {
    const { contract, syncAll } = get();
    try {
      const tx = await contract!.updateListing(
        tokenId,
        ethers.parseEther(newPrice),
        newDesc,
        useEscrow,
        gasOverride("updateListing")
      );
      await tx.wait();
      await syncAll();
      return true;
    } catch (error: any) {
      throw new Error(parseContractError(error));
    }
  },

  // ----------------------------------------------------------
  // CANCEL LISTING
  // ----------------------------------------------------------
  cancelListing: async (tokenId) => {
    const { contract, syncAll } = get();
    try {
      const tx = await contract!.cancelListing(tokenId, gasOverride("cancelListing"));
      await tx.wait();
      await syncAll();
      return true;
    } catch (error: any) {
      throw new Error(parseContractError(error));
    }
  },

  // ----------------------------------------------------------
  // BUY ASSET
  // Setelah beli, daftarkan public key ke server untuk proses ECDH re-encryption.
  // ----------------------------------------------------------
  buyAsset: async (tokenId, price) => {
    const { contract, syncAll, signer, wallet } = get();
    try {
      if (!signer || !wallet) throw new Error("Wallet tidak terhubung");

      const tx = await contract!.buyAsset(
        tokenId,
        gasOverrideWithValue("buyAsset", ethers.parseEther(price))
      );
      await tx.wait();

      // Register public key pembeli agar seller bisa re-encrypt file
      const w = signer as ethers.Wallet;
      if (w.signingKey?.publicKey) {
        await fetch("/api/pubkey-store", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            address: wallet.address,
            publicKey: w.signingKey.publicKey,
          }),
        }).catch((err) => console.warn("[buyAsset] Gagal register pubkey:", err));
      }

      await syncAll();
      return true;
    } catch (error: any) {
      throw new Error(parseContractError(error));
    }
  },

  // ----------------------------------------------------------
  // TRANSFER ASSET
  // ----------------------------------------------------------
  transferAsset: async (tokenId, to) => {
    const { contract, syncAll } = get();
    try {
      if (!ethers.isAddress(to)) throw new Error("Alamat tujuan tidak valid");
      const tx = await contract!.transferAsset(tokenId, to, gasOverride("transferAsset"));
      await tx.wait();
      await syncAll();
      return true;
    } catch (error: any) {
      throw new Error(parseContractError(error));
    }
  },

  // ----------------------------------------------------------
  // SEND COPY ASSET
  // ----------------------------------------------------------
  sendCopyAsset: async (tokenId, to, name, encryptedCid) => {
    const { contract, syncAll } = get();
    try {
      if (!ethers.isAddress(to)) throw new Error("Alamat tujuan tidak valid");
      const tx = await contract!.sendCopy(to, name, encryptedCid, gasOverride("sendCopy"));
      await tx.wait();
      await syncAll();
      return true;
    } catch (error: any) {
      throw new Error(parseContractError(error));
    }
  },

  // ----------------------------------------------------------
  // CONFIRM TRADE (Escrow)
  //
  // Alur untuk SELLER:
  //   1. Ambil public key pembeli dari server
  //   2. ECDH re-encrypt file key → CID baru di IPFS
  //   3. Update CID di contract (hanya jika CID berubah)
  //   4. Panggil confirmTrade di contract → sellerConfirmed = true
  //
  // Alur untuk BUYER:
  //   1. Langsung panggil confirmTrade → buyerConfirmed = true
  //   2. Jika keduanya sudah confirm → trade selesai, dana ke seller
  //
  // Note: Setiap tx di-await satu per satu, sehingga nonce dikelola
  //       otomatis oleh ethers tanpa perlu tracking manual.
  // ----------------------------------------------------------
  confirmTrade: async (tokenId) => {
    const { contract, syncAll, vaultItems, signer } = get();
    try {
      if (!signer) throw new Error("Signer tidak ditemukan");

      const item = vaultItems.find((p) => p.id === tokenId);
      if (!item) throw new Error("Asset tidak ditemukan di vault");

      const myAddress = await signer.getAddress();
      const isSeller =
        item.seller?.toLowerCase() === myAddress.toLowerCase();

      // Seller: re-encrypt file untuk buyer sebelum konfirmasi
      if (isSeller && item.isEscrowActive) {
        // 1. Ambil public key pembeli dari server
        const res = await fetch(`/api/pubkey-store?address=${item.buyer}`);
        if (!res.ok) {
          throw new Error(
            "Gagal mengambil Public Key pembeli. Minta pembeli untuk mencoba login ulang."
          );
        }
        const { publicKey } = await res.json();

        // 2. Re-encrypt file key dengan ECDH shared secret
        //    Jika file sudah v3 (re-encrypt sebelumnya gagal di tengah),
        //    fungsi ini otomatis return CID yang sama tanpa proses ulang.
        const { newCid } = await reEncryptForBuyer(item.cid, signer, publicKey);

        // 3. Update CID di contract hanya jika CID benar-benar berubah.
        //    Ini mencegah tx yang sia-sia saat re-try setelah partial failure.
        if (newCid !== item.cid) {
          const txUpdate = await contract!.updateEncryptedCid(tokenId, newCid, gasOverride("updateEncryptedCid"));
          await txUpdate.wait();
        }
      }

      // 4. Konfirmasi trade (baik seller maupun buyer)
      const tx = await contract!.confirmTrade(tokenId, gasOverride("confirmTrade"));
      await tx.wait();

      await syncAll();
      return true;
    } catch (error: any) {
      console.error("[confirmTrade] Error:", error);
      throw new Error(parseContractError(error));
    }
  },

  // ----------------------------------------------------------
  // CANCEL TRADE (Escrow) — Refund buyer, asset balik ke seller
  // ----------------------------------------------------------
  cancelTrade: async (tokenId) => {
    const { contract, syncAll } = get();
    try {
      const tx = await contract!.cancelTrade(tokenId, gasOverride("cancelTrade"));
      await tx.wait();
      await syncAll();
      return true;
    } catch (error: any) {
      throw new Error(parseContractError(error));
    }
  },

  // ----------------------------------------------------------
  // BURN ASSET
  // ----------------------------------------------------------
  burnAsset: async (tokenId, _cid) => {
    const { contract, syncAll } = get();
    try {
      const tx = await contract!.burnAsset(tokenId, gasOverride("burnAsset"));
      await tx.wait();
      await syncAll();
      return true;
    } catch (error: any) {
      throw new Error(parseContractError(error));
    }
  },
}));

// ============================================================
// HELPER: Parse ethers/contract errors jadi pesan user-friendly
// ============================================================
function parseContractError(error: any): string {
  if (error?.reason) return error.reason;
  if (error?.data?.message) return error.data.message;
  if (error?.code === "ACTION_REJECTED") return "Transaksi dibatalkan oleh user";
  if (error?.code === "INSUFFICIENT_FUNDS")
    return `Saldo ${NETWORK_CONFIG.tokenSymbol} tidak cukup`;
  if (error?.message) {
    const msg: string = error.message;
    if (msg.includes("Only owner")) return "Hanya pemilik yang bisa melakukan ini";
    if (msg.includes("Wrong price")) return "Harga tidak sesuai";
    if (msg.includes("Not in escrow")) return "Asset tidak sedang dalam escrow";
    if (msg.includes("Only seller")) return "Hanya seller yang bisa melakukan ini";
    if (msg.includes("insufficient funds"))
      return `Saldo ${NETWORK_CONFIG.tokenSymbol} tidak cukup`;
    return msg.length > 120 ? "Transaksi gagal. Cek konsol untuk detail." : msg;
  }
  return "Transaksi gagal";
}