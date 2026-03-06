import { create } from "zustand";
import { ethers } from "ethers";
import { getTunnelUrls, checkNodeHealth } from "./tunnel-sync";
import { NETWORK_CONFIG, CONTRACT_ADDRESS } from "./constants";
import CipherVaultArtifact from "@/abis/CipherVault.json";

// ============================================================
// NETWORK SETUP — BRIDGESTONE (Avalanche Fuji, ChainID 777000)
// ============================================================
let RPC_URL =
  process.env.NEXT_PUBLIC_RPC_URL || NETWORK_CONFIG.rpcUrl;

const getProvider = (url: string): ethers.JsonRpcProvider => {
  const req = new ethers.FetchRequest(url);
  req.setHeader("ngrok-skip-browser-warning", "true");
  return new ethers.JsonRpcProvider(
    req,
    { chainId: NETWORK_CONFIG.chainId, name: NETWORK_CONFIG.name },
    { staticNetwork: true }
  );
};

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
    } catch { }

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
      } catch { }

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
    const { provider, wallet } = get();
    if (!provider || !wallet) return;
    try {
      const bal = await provider.getBalance(wallet.address);
      set({ balance: ethers.formatEther(bal) });
    } catch { }
  },

  // ----------------------------------------------------------
  // ENSURE GAS (APEX)
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
  // START AUTO REFRESH — FIXED (tunnel bug resolved)
  // ----------------------------------------------------------
  startAutoRefresh: async () => {
    // Guard: jangan mulai kalau sudah jalan
    if (get().isAutoRefreshRunning) return;
    set({ isAutoRefreshRunning: true });

    // Update RPC URL kalau pakai ngrok (non-localhost)
    if (
      typeof window !== "undefined" &&
      window.location.hostname !== "localhost"
    ) {
      try {
        const urls = await getTunnelUrls(); // ← BUG FIX: tidak di-comment lagi
        if (urls.blockchain && urls.blockchain !== RPC_URL) {
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
      } catch { }
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
  // TRANSACTION HELPERS — Parse error jadi pesan yang readable
  // ----------------------------------------------------------
  listAssetForSale: async (tokenId, price, description, previewURI, useEscrow) => {
    const { contract, syncAll } = get();
    try {
      const tx = await contract!.listAsset(
        tokenId,
        ethers.parseEther(price),
        description,
        previewURI || "",
        useEscrow
      );
      await tx.wait();
      await syncAll();
      return true;
    } catch (error: any) {
      throw new Error(parseContractError(error));
    }
  },

  updateListing: async (tokenId, newPrice, newDesc, useEscrow) => {
    const { contract, syncAll } = get();
    try {
      const tx = await contract!.updateListing(
        tokenId,
        ethers.parseEther(newPrice),
        newDesc,
        useEscrow
      );
      await tx.wait();
      await syncAll();
      return true;
    } catch (error: any) {
      throw new Error(parseContractError(error));
    }
  },

  cancelListing: async (tokenId) => {
    const { contract, syncAll } = get();
    try {
      const tx = await contract!.cancelListing(tokenId);
      await tx.wait();
      await syncAll();
      return true;
    } catch (error: any) {
      throw new Error(parseContractError(error));
    }
  },

  buyAsset: async (tokenId, price) => {
    const { contract, syncAll } = get();
    try {
      const tx = await contract!.buyAsset(tokenId, {
        value: ethers.parseEther(price),
      });
      await tx.wait();
      await syncAll();
      return true;
    } catch (error: any) {
      throw new Error(parseContractError(error));
    }
  },

  transferAsset: async (tokenId, to) => {
    const { contract, syncAll } = get();
    try {
      if (!ethers.isAddress(to)) throw new Error("Alamat tujuan tidak valid");
      const tx = await contract!.transferAsset(tokenId, to);
      await tx.wait();
      await syncAll();
      return true;
    } catch (error: any) {
      throw new Error(parseContractError(error));
    }
  },

  sendCopyAsset: async (tokenId, to, name, encryptedCid) => {
    const { contract, syncAll } = get();
    try {
      if (!ethers.isAddress(to)) throw new Error("Alamat tujuan tidak valid");
      const tx = await contract!.sendCopy(to, name, encryptedCid);
      await tx.wait();
      await syncAll();
      return true;
    } catch (error: any) {
      throw new Error(parseContractError(error));
    }
  },

  confirmTrade: async (tokenId) => {
    const { contract, syncAll } = get();
    try {
      const tx = await contract!.confirmTrade(tokenId);
      await tx.wait();
      await syncAll();
      return true;
    } catch (error: any) {
      throw new Error(parseContractError(error));
    }
  },

  // BUG FIX: cancelTrade — refund buyer, bukan cancelListing
  cancelTrade: async (tokenId) => {
    const { contract, syncAll } = get();
    try {
      const tx = await contract!.cancelTrade(tokenId);
      await tx.wait();
      await syncAll();
      return true;
    } catch (error: any) {
      throw new Error(parseContractError(error));
    }
  },

  burnAsset: async (tokenId, cid) => {
    const { contract, syncAll } = get();
    try {
      const tx = await contract!.burnAsset(tokenId);
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
  // Revert reason dari contract
  if (error?.reason) return error.reason;
  // Decoded revert data
  if (error?.data?.message) return error.data.message;
  // ethers v6 action rejected
  if (error?.code === "ACTION_REJECTED") return "Transaksi dibatalkan oleh user";
  if (error?.code === "INSUFFICIENT_FUNDS")
    return `Saldo ${NETWORK_CONFIG.tokenSymbol} tidak cukup`;
  // Pesan custom
  if (error?.message) {
    const msg: string = error.message;
    if (msg.includes("Only owner")) return "Hanya pemilik yang bisa melakukan ini";
    if (msg.includes("Wrong price")) return "Harga tidak sesuai";
    if (msg.includes("Not in escrow")) return "Asset tidak sedang dalam escrow";
    if (msg.includes("Only seller")) return "Hanya seller yang bisa melakukan ini";
    if (msg.includes("insufficient funds")) return `Saldo ${NETWORK_CONFIG.tokenSymbol} tidak cukup`;
    return msg.length > 100 ? "Transaksi gagal. Cek konsol untuk detail." : msg;
  }
  return "Transaksi gagal";
}