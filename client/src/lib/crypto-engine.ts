import { ethers } from "ethers";
import { create } from "kubo-rpc-client";
import { getTunnelUrls } from "./tunnel-sync";
import { KEY_DERIVATION_MESSAGE, ENCRYPTION_VERSION } from "./constants";

let IPFS_URL = process.env.NEXT_PUBLIC_IPFS_URL || "http://127.0.0.1:5001";

// ============================================================
// IPFS CLIENT
// ============================================================
async function getClient() {
  let targetUrl = IPFS_URL;
  if (typeof window !== "undefined" && window.location.hostname !== "localhost") {
    const urls = await getTunnelUrls();
    targetUrl = urls.ipfs || IPFS_URL;
  }
  return create({
    url: targetUrl,
    headers: { "ngrok-skip-browser-warning": "true" },
  });
}

// ============================================================
// KEY DERIVATION (Wallet-Bound Encryption) — SECURITY v2
// ============================================================
// AES file key dienkripsi dengan key yang di-derive dari
// tanda tangan wallet. Artinya hanya pemilik wallet yang bisa decrypt.
// CID bocor pun tidak membocorkan konten.

async function deriveWrapKey(signer: ethers.Signer): Promise<CryptoKey> {
  const signature = await signer.signMessage(KEY_DERIVATION_MESSAGE);
  const sigBytes = ethers.getBytes(signature);
  const wrapKeyRaw = await crypto.subtle.digest("SHA-256", toArrayBuffer(sigBytes));
  return crypto.subtle.importKey("raw", wrapKeyRaw, "AES-GCM", false, [
    "encrypt",
    "decrypt",
  ]);
}

// ============================================================
// UPLOAD PREVIEW (Unencrypted — untuk thumbnail di market)
// ============================================================
export const uploadPreview = async (file: File): Promise<string> => {
  try {
    const ipfs = await getClient();
    const added = await ipfs.add(file);
    return added.path;
  } catch (error) {
    console.error("Preview Upload Failed:", error);
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

    // 2. Encrypt file content
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

    // 3. Wrap (encrypt) the file key dengan wallet-derived key
    const wrapKey = await deriveWrapKey(signer);
    const wrapIv = crypto.getRandomValues(new Uint8Array(12));
    const encryptedFileKey = await crypto.subtle.encrypt(
      { name: "AES-GCM", iv: wrapIv },
      wrapKey,
      fileKey
    );

    // 4. Build payload — key tidak pernah plaintext
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
    console.error("encryptAndUpload error:", error);
    throw new Error("Encryption Failed");
  }
};

// ============================================================
// DECRYPT FILE — Supports v1 (legacy) & v2 (wallet-bound)
// ============================================================
export const decryptFile = async (
  cid: string,
  signer: ethers.Signer
): Promise<File> => {
  try {
    const ipfs = await getClient();
    const stream = ipfs.cat(cid);
    let raw = "";
    const decoder = new TextDecoder();
    for await (const chunk of stream) {
      raw += decoder.decode(chunk, { stream: true });
    }

    const metadata = JSON.parse(raw);

    // --- v2: wallet-bound key unwrap ---
    if (metadata.version === 2) {
      const wrapKey = await deriveWrapKey(signer);
      const fileKeyBuffer = await crypto.subtle.decrypt(
        { name: "AES-GCM", iv: toArrayBuffer(ethers.getBytes(metadata.wrapIv)) },
        wrapKey,
        base64ToArrayBuffer(metadata.encryptedKey)
      );

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

    // --- v1 legacy fallback (plaintext key in IPFS — old files) ---
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
    console.error("decryptFile error:", error);
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
// HELPERS
// ============================================================
/** Forces a Uint8Array's backing buffer to a strict ArrayBuffer,
 *  satisfying the Web Crypto API's BufferSource constraint. */
function toArrayBuffer(bytes: Uint8Array): ArrayBuffer {
  return bytes.buffer.slice(
    bytes.byteOffset,
    bytes.byteOffset + bytes.byteLength
  ) as ArrayBuffer;
}

function arrayBufferToBase64(buffer: ArrayBuffer): string {
  let binary = "";
  const bytes = new Uint8Array(buffer);
  for (let i = 0; i < bytes.byteLength; i++)
    binary += String.fromCharCode(bytes[i]);
  return window.btoa(binary);
}

function base64ToArrayBuffer(base64: string): ArrayBuffer {
  const binaryString = window.atob(base64);
  const bytes = new Uint8Array(binaryString.length);
  for (let i = 0; i < binaryString.length; i++)
    bytes[i] = binaryString.charCodeAt(i);
  return bytes.buffer as ArrayBuffer;
}