import { ethers } from "ethers";
import { create } from "kubo-rpc-client";
import { getTunnelUrls } from "./tunnel-sync";
import { KEY_DERIVATION_MESSAGE, ENCRYPTION_VERSION } from "./constants";

// ============================================================
// VERSI ENKRIPSI
// ============================================================
// v1 — Legacy: AES key tersimpan plaintext di IPFS (tidak aman, backward compat only)
// v2 — Wallet-bound: AES key di-wrap dengan kunci turunan wallet seller
// v3 — ECDH buyer: AES key di-wrap ulang pakai shared secret seller↔buyer
//      (dipakai saat confirmTrade — agar pembeli bisa decrypt file)

const DIRECT_IPFS_URL = process.env.NEXT_PUBLIC_IPFS_URL || "http://127.0.0.1:5001";
const isBrowser = typeof window !== "undefined";

// ============================================================
// IPFS CLIENT
// ============================================================
async function getClient() {
  if (isBrowser) {
    // Di browser: pakai proxy /api/ipfs agar bebas CORS
    return create({ url: window.location.origin, apiPath: "/api/ipfs" });
  }
  // Di server: pakai URL langsung, atau ngrok jika remote
  let targetUrl = DIRECT_IPFS_URL;
  if (typeof window !== "undefined" && window.location.hostname !== "localhost") {
    const urls = await getTunnelUrls();
    targetUrl = urls.ipfs || DIRECT_IPFS_URL;
  }
  return create({
    url: targetUrl,
    headers: { "ngrok-skip-browser-warning": "true" },
  });
}

// ============================================================
// KEY DERIVATION — Wallet-Bound (v2)
// ============================================================
// Wrap key di-cache per-wallet address dalam memori sesi.
// signMessage() hanya dipanggil SEKALI saat unlockVaultKey().
// Upload & decrypt berikutnya memakai key dari cache (tanpa popup MetaMask).

const wrapKeyCache = new Map<string, CryptoKey>();

async function deriveAndCache(signer: ethers.Signer): Promise<CryptoKey> {
  const signature = await signer.signMessage(KEY_DERIVATION_MESSAGE);
  const sigBytes = ethers.getBytes(signature);
  const wrapKeyRaw = await crypto.subtle.digest("SHA-256", toArrayBuffer(sigBytes));
  return crypto.subtle.importKey("raw", wrapKeyRaw, "AES-GCM", false, [
    "encrypt",
    "decrypt",
  ]);
}

async function getWrapKey(signer: ethers.Signer): Promise<CryptoKey> {
  const address = await signer.getAddress();
  if (wrapKeyCache.has(address)) {
    return wrapKeyCache.get(address)!;
  }
  const key = await deriveAndCache(signer);
  wrapKeyCache.set(address, key);
  return key;
}

/**
 * Unlock vault key — panggil SEKALI saat vault dibuka.
 * Satu-satunya titik munculnya MetaMask popup untuk keperluan enkripsi.
 */
export async function unlockVaultKey(signer: ethers.Signer): Promise<void> {
  await getWrapKey(signer);
}

/**
 * Hapus key dari cache saat logout agar tidak tersisa di memori.
 */
export async function clearVaultKey(signer: ethers.Signer): Promise<void> {
  const address = await signer.getAddress();
  wrapKeyCache.delete(address);
}

// ============================================================
// UPLOAD PREVIEW (tidak terenkripsi — untuk thumbnail di market)
// ============================================================
export const uploadPreview = async (file: File): Promise<string> => {
  try {
    const ipfs = await getClient();
    const added = await ipfs.add(file);
    return added.path;
  } catch (error) {
    console.error("[uploadPreview] Gagal:", error);
    return "";
  }
};

// ============================================================
// ENCRYPT & UPLOAD — v2 (Wallet-Bound Key)
// ============================================================
export const encryptAndUpload = async (
  file: File,
  signer: ethers.Signer
): Promise<{ cid: string }> => {
  try {
    const ipfs = await getClient();

    // 1. Generate random AES file key & IV
    const fileKey = crypto.getRandomValues(new Uint8Array(32));
    const fileIv = crypto.getRandomValues(new Uint8Array(12));

    // 2. Enkripsi konten file
    const fileCryptoKey = await crypto.subtle.importKey(
      "raw",
      fileKey,
      "AES-GCM",
      true,
      ["encrypt"]
    );
    const encryptedContent = await crypto.subtle.encrypt(
      { name: "AES-GCM", iv: fileIv },
      fileCryptoKey,
      await file.arrayBuffer()
    );

    // 3. Wrap file key dengan wallet-derived key (dari cache)
    const wrapKey = await getWrapKey(signer);
    const wrapIv = crypto.getRandomValues(new Uint8Array(12));
    const encryptedFileKey = await crypto.subtle.encrypt(
      { name: "AES-GCM", iv: wrapIv },
      wrapKey,
      fileKey
    );

    // 4. Simpan ke IPFS — file key tidak pernah dalam bentuk plaintext
    const payload = JSON.stringify({
      version: ENCRYPTION_VERSION,
      name: file.name,
      type: file.type,
      iv: ethers.hexlify(fileIv),
      wrapIv: ethers.hexlify(wrapIv),
      encryptedKey: arrayBufferToBase64(encryptedFileKey),
      content: arrayBufferToBase64(encryptedContent),
    });

    const result = await ipfs.add(payload);
    return { cid: result.path };
  } catch (error) {
    console.error("[encryptAndUpload] Error:", error);
    throw new Error("Encryption Failed");
  }
};

// ============================================================
// ECDH RE-ENCRYPT FOR BUYER — v3
// ============================================================
/**
 * Dipanggil oleh SELLER saat confirmTrade.
 *
 * Proses:
 *  1. Fetch metadata dari IPFS berdasarkan CID saat ini
 *  2. Unwrap file key menggunakan wallet seller (v2) atau lewati jika sudah v3
 *  3. Re-wrap file key dengan ECDH shared secret (seller privkey × buyer pubkey)
 *  4. Upload payload baru (v3) ke IPFS — konten file tidak berubah, hanya key-wrap-nya
 *
 * Idempoten: jika file sudah v3 (gagal di tengah sebelumnya), langsung return CID lama.
 */
export const reEncryptForBuyer = async (
  cid: string,
  sellerSigner: ethers.Signer,
  buyerPublicKey: string
): Promise<{ newCid: string }> => {
  try {
    const ipfs = await getClient();

    // Fetch metadata dari IPFS
    const stream = ipfs.cat(cid);
    let raw = "";
    const decoder = new TextDecoder();
    for await (const chunk of stream) {
      raw += decoder.decode(chunk, { stream: true });
    }
    const metadata = JSON.parse(raw);

    // Sudah v3 — tidak perlu re-encrypt lagi (idempoten, aman untuk retry)
    if (metadata.version === 3) {
      return { newCid: cid };
    }

    // Unwrap file key
    let fileKeyBuffer: ArrayBuffer;
    if (metadata.version === 2) {
      // v2: unwrap dengan seller's wallet-derived key
      const wrapKey = await getWrapKey(sellerSigner);
      fileKeyBuffer = await crypto.subtle.decrypt(
        { name: "AES-GCM", iv: toArrayBuffer(ethers.getBytes(metadata.wrapIv)) },
        wrapKey,
        base64ToArrayBuffer(metadata.encryptedKey)
      );
    } else {
      // v1 (legacy): key tersimpan sebagai hex plaintext
      if (!metadata.key) throw new Error("Metadata tidak valid, file mungkin rusak.");
      fileKeyBuffer = toArrayBuffer(ethers.getBytes(metadata.key));
    }

    // Hitung ECDH shared secret: seller privkey × buyer pubkey
    const wallet = sellerSigner as ethers.Wallet;
    if (!wallet.signingKey) {
      throw new Error("Signer tidak punya akses private key untuk ECDH");
    }

    const sharedSecretHex = wallet.signingKey.computeSharedSecret(buyerPublicKey);
    const sharedSecretBytes = ethers.getBytes(sharedSecretHex);
    const ecdhKeyRaw = await crypto.subtle.digest(
      "SHA-256",
      toArrayBuffer(sharedSecretBytes)
    );
    const ecdhWrapKey = await crypto.subtle.importKey(
      "raw",
      ecdhKeyRaw,
      "AES-GCM",
      true,
      ["encrypt", "decrypt"]
    );

    // Re-wrap file key dengan ECDH shared secret
    const newWrapIv = crypto.getRandomValues(new Uint8Array(12));
    const newEncryptedFileKey = await crypto.subtle.encrypt(
      { name: "AES-GCM", iv: newWrapIv },
      ecdhWrapKey,
      fileKeyBuffer
    );

    // Bangun payload v3 — konten file sama, hanya key-wrap yang baru
    const payload = JSON.stringify({
      version: 3,
      name: metadata.name,
      type: metadata.type,
      iv: metadata.iv,                              // IV file tidak berubah
      wrapIv: ethers.hexlify(newWrapIv),
      encryptedKey: arrayBufferToBase64(newEncryptedFileKey),
      content: metadata.content,                    // Konten tidak berubah
      sellerPublicKey: wallet.signingKey.publicKey, // Buyer butuh ini untuk shared secret
    });

    const result = await ipfs.add(payload);
    return { newCid: result.path };
  } catch (error) {
    console.error("[reEncryptForBuyer] Error:", error);
    throw new Error("Re-Encryption Failed");
  }
};

// ============================================================
// DECRYPT FILE — Supports v1, v2, v3
// ============================================================
export const decryptFile = async (
  cid: string,
  signer: ethers.Signer
): Promise<File> => {
  try {
    const ipfs = await getClient();

    // Fetch metadata dari IPFS
    const stream = ipfs.cat(cid);
    let raw = "";
    const decoder = new TextDecoder();
    for await (const chunk of stream) {
      raw += decoder.decode(chunk, { stream: true });
    }
    const metadata = JSON.parse(raw);

    // --- v2: wallet-bound key unwrap ---
    if (metadata.version === 2) {
      const wrapKey = await getWrapKey(signer); // dari cache, tidak sign ulang
      const fileKeyBuffer = await crypto.subtle.decrypt(
        { name: "AES-GCM", iv: toArrayBuffer(ethers.getBytes(metadata.wrapIv)) },
        wrapKey,
        base64ToArrayBuffer(metadata.encryptedKey)
      );
      return await decryptContent(fileKeyBuffer, metadata);
    }

    // --- v3: ECDH buyer unwrap ---
    if (metadata.version === 3) {
      if (!metadata.sellerPublicKey) {
        throw new Error("Seller public key tidak ada di metadata");
      }
      const wallet = signer as ethers.Wallet;
      if (!wallet.signingKey) {
        throw new Error("Signer tidak mendukung ECDH decryption");
      }

      // Buyer hitung shared secret yang sama dengan seller
      const sharedSecretHex = wallet.signingKey.computeSharedSecret(
        metadata.sellerPublicKey
      );
      const sharedSecretBytes = ethers.getBytes(sharedSecretHex);
      const ecdhKeyRaw = await crypto.subtle.digest(
        "SHA-256",
        toArrayBuffer(sharedSecretBytes)
      );
      const ecdhWrapKey = await crypto.subtle.importKey(
        "raw",
        ecdhKeyRaw,
        "AES-GCM",
        false,
        ["decrypt"]
      );

      const fileKeyBuffer = await crypto.subtle.decrypt(
        { name: "AES-GCM", iv: toArrayBuffer(ethers.getBytes(metadata.wrapIv)) },
        ecdhWrapKey,
        base64ToArrayBuffer(metadata.encryptedKey)
      );
      return await decryptContent(fileKeyBuffer, metadata);
    }

    // --- v1 legacy fallback (plaintext key) ---
    const aesKey = ethers.getBytes(metadata.key);
    const iv = ethers.getBytes(metadata.iv);
    const cryptoKey = await crypto.subtle.importKey(
      "raw",
      toArrayBuffer(aesKey),
      "AES-GCM",
      true,
      ["decrypt"]
    );
    const decrypted = await crypto.subtle.decrypt(
      { name: "AES-GCM", iv: toArrayBuffer(iv) },
      cryptoKey,
      base64ToArrayBuffer(metadata.content)
    );
    return new File([decrypted], metadata.name, { type: metadata.type });
  } catch (error) {
    console.error("[decryptFile] Error:", error);
    throw new Error("Decryption Failed. File mungkin milik wallet lain.");
  }
};

// ============================================================
// UNPIN (bersihkan IPFS saat burn)
// ============================================================
export const unpinFile = async (cid: string): Promise<boolean> => {
  try {
    const ipfs = await getClient();
    await ipfs.pin.rm(cid);
    return true;
  } catch {
    return true; // Tetap true — unpin bukan critical path
  }
};

// ============================================================
// INTERNAL HELPERS
// ============================================================

/** Decrypt konten file dari metadata, return sebagai File object. */
async function decryptContent(
  fileKeyBuffer: ArrayBuffer,
  metadata: any
): Promise<File> {
  const fileCryptoKey = await crypto.subtle.importKey(
    "raw",
    fileKeyBuffer,
    "AES-GCM",
    false,
    ["decrypt"]
  );
  const decrypted = await crypto.subtle.decrypt(
    { name: "AES-GCM", iv: toArrayBuffer(ethers.getBytes(metadata.iv)) },
    fileCryptoKey,
    base64ToArrayBuffer(metadata.content)
  );
  return new File([decrypted], metadata.name, { type: metadata.type });
}

/**
 * Konversi Uint8Array ke ArrayBuffer yang strict.
 * Diperlukan karena Web Crypto API tidak menerima SharedArrayBuffer.
 */
function toArrayBuffer(bytes: Uint8Array): ArrayBuffer {
  return bytes.buffer.slice(
    bytes.byteOffset,
    bytes.byteOffset + bytes.byteLength
  ) as ArrayBuffer;
}

function arrayBufferToBase64(buffer: ArrayBuffer): string {
  let binary = "";
  const bytes = new Uint8Array(buffer);
  for (let i = 0; i < bytes.byteLength; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return window.btoa(binary);
}

function base64ToArrayBuffer(base64: string): ArrayBuffer {
  const binaryString = window.atob(base64);
  const bytes = new Uint8Array(binaryString.length);
  for (let i = 0; i < binaryString.length; i++) {
    bytes[i] = binaryString.charCodeAt(i);
  }
  return bytes.buffer as ArrayBuffer;
}