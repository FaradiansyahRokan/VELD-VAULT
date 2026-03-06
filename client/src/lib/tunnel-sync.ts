import { NETWORK_CONFIG } from "./constants";

export interface TunnelUrls {
  blockchain: string | null;
  ipfs: string | null;
}

// Ambil URL Ngrok secara dinamis dari API lokal Ngrok
// BridgeStone jalan di port 9654
export async function getTunnelUrls(): Promise<TunnelUrls> {
  try {
    const response = await fetch("http://127.0.0.1:4040/api/tunnels", {
      signal: AbortSignal.timeout(2000),
    });
    const data = await response.json();
    const tunnels = data.tunnels;

    // Cari berdasarkan nama tunnel di ngrok.yml
    const blockchain =
      tunnels.find((t: any) => t.name === "blockchain")?.public_url || null;
    const ipfs =
      tunnels.find((t: any) => t.name === "ipfs")?.public_url || null;

    return { blockchain, ipfs };
  } catch {
    // Fallback ke localhost APEXNETWORK
    return {
      blockchain: NETWORK_CONFIG.rpcUrl,
      ipfs: null,
    };
  }
}

// Cek apakah node Avalanche lokal aktif
export async function checkNodeHealth(): Promise<boolean> {
  try {
    const response = await fetch(
      "http://127.0.0.1:9654/ext/health",
      { signal: AbortSignal.timeout(3000) }
    );
    const data = await response.json();
    return data?.healthy === true;
  } catch {
    return false;
  }
}