import { NETWORK_CONFIG } from "./constants";

export interface TunnelUrls {
  blockchain: string | null;
  ipfs: string | null;
}

/**
 * Ambil tunnel URL.
 * Jika env var sudah URL publik → langsung pakai.
 * Jika masih localhost → coba auto-detect dari ngrok dashboard (dev only).
 */
export async function getTunnelUrls(): Promise<TunnelUrls> {
  const rpcUrl  = process.env.NEXT_PUBLIC_RPC_URL  || null;
  const ipfsUrl = process.env.NEXT_PUBLIC_IPFS_URL || null;

  const isLocalRpc  = !rpcUrl  || rpcUrl.includes("127.0.0.1")  || rpcUrl.includes("localhost");
  const isLocalIpfs = !ipfsUrl || ipfsUrl.includes("127.0.0.1") || ipfsUrl.includes("localhost");

  if (!isLocalRpc && !isLocalIpfs) {
    return { blockchain: rpcUrl, ipfs: ipfsUrl };
  }

  // Fallback: auto-detect dari ngrok (hanya saat dev lokal, dijalankan server-side)
  try {
    const response = await fetch("http://127.0.0.1:4040/api/tunnels", {
      signal: AbortSignal.timeout(2000),
    });
    const data = await response.json();
    const tunnels = data.tunnels ?? [];

    return {
      blockchain: isLocalRpc
        ? (tunnels.find((t: any) => t.name === "blockchain")?.public_url ?? rpcUrl)
        : rpcUrl,
      ipfs: isLocalIpfs
        ? (tunnels.find((t: any) => t.name === "ipfs")?.public_url ?? ipfsUrl)
        : ipfsUrl,
    };
  } catch {
    return { blockchain: rpcUrl, ipfs: ipfsUrl };
  }
}

/**
 * Cek apakah node Avalanche aktif.
 *
 * Di browser → hit /api/health (proxy, same-origin, bebas CORS).
 * Di server  → hit endpoint health node langsung.
 */
export async function checkNodeHealth(): Promise<boolean> {
  try {
    const isBrowser = typeof window !== "undefined";

    if (isBrowser) {
      // Lewat proxy — tidak kena CORS
      const res = await fetch("/api/health", {
        signal: AbortSignal.timeout(4000),
      });
      const data = await res.json();
      return data?.healthy === true;
    }

    // Server-side: langsung ke node
    const rpcUrl = process.env.NEXT_PUBLIC_RPC_URL || NETWORK_CONFIG.rpcUrl;
    const url = new URL(rpcUrl);
    const healthUrl = `${url.protocol}//${url.host}/ext/health`;

    const res = await fetch(healthUrl, {
      signal: AbortSignal.timeout(3000),
      headers: { "ngrok-skip-browser-warning": "true" },
    });
    const data = await res.json();
    return data?.healthy === true;
  } catch {
    return false;
  }
}