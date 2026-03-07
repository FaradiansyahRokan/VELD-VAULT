import { ethers } from "ethers";

export interface EncryptedMessage {
  encryptedContent: string; // base64
  iv: string;               // hex
  senderPublicKey: string;  // for recipient to compute shared secret
}

export interface MessagePayload extends EncryptedMessage {
  id: string;
  from: string;
  to: string;
  timestamp: number;
  read: boolean;
}

// ── Encrypt a plaintext message from sender to recipient ──────
export async function encryptMessage(
  plaintext: string,
  senderWallet: ethers.Wallet,
  recipientPublicKey: string
): Promise<EncryptedMessage> {
  // 1. ECDH shared secret
  const sharedSecretHex = senderWallet.signingKey.computeSharedSecret(recipientPublicKey);
  const sharedSecretBytes = ethers.getBytes(sharedSecretHex);

  // 2. Derive AES key
  const keyRaw = await crypto.subtle.digest("SHA-256", toArrayBuffer(sharedSecretBytes));
  const aesKey = await crypto.subtle.importKey("raw", keyRaw, "AES-GCM", false, ["encrypt"]);

  // 3. Encrypt
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const encoded = new TextEncoder().encode(plaintext);
  const encrypted = await crypto.subtle.encrypt({ name: "AES-GCM", iv }, aesKey, encoded);

  return {
    encryptedContent: arrayBufferToBase64(encrypted),
    iv: ethers.hexlify(iv),
    senderPublicKey: senderWallet.signingKey.publicKey,
  };
}

// ── Decrypt a message received by recipient ───────────────────
export async function decryptMessage(
  encrypted: EncryptedMessage,
  recipientWallet: ethers.Wallet
): Promise<string> {
  // 1. ECDH shared secret (same as sender computed)
  const sharedSecretHex = recipientWallet.signingKey.computeSharedSecret(
    encrypted.senderPublicKey
  );
  const sharedSecretBytes = ethers.getBytes(sharedSecretHex);

  // 2. Derive AES key
  const keyRaw = await crypto.subtle.digest("SHA-256", toArrayBuffer(sharedSecretBytes));
  const aesKey = await crypto.subtle.importKey("raw", keyRaw, "AES-GCM", false, ["decrypt"]);

  // 3. Decrypt
  const iv = toArrayBuffer(ethers.getBytes(encrypted.iv));
  const ciphertext = base64ToArrayBuffer(encrypted.encryptedContent);
  const decrypted = await crypto.subtle.decrypt({ name: "AES-GCM", iv }, aesKey, ciphertext);

  return new TextDecoder().decode(decrypted);
}

// ── Sign a document hash ──────────────────────────────────────
export async function signDocument(
  fileBuffer: ArrayBuffer,
  wallet: ethers.Wallet
): Promise<{ hash: string; signature: string; signer: string; timestamp: number }> {
  const hashBuffer = await crypto.subtle.digest("SHA-256", fileBuffer);
  const hash = ethers.hexlify(new Uint8Array(hashBuffer));
  const timestamp = Date.now();
  const message = `CipherVault Document Signature\nHash: ${hash}\nTimestamp: ${timestamp}`;
  const signature = await wallet.signMessage(message);
  return { hash, signature, signer: wallet.address, timestamp };
}

// ── Verify a document signature ───────────────────────────────
export async function verifyDocument(
  fileBuffer: ArrayBuffer,
  signature: string,
  signer: string,
  timestamp: number
): Promise<{ valid: boolean; reason?: string }> {
  try {
    const hashBuffer = await crypto.subtle.digest("SHA-256", fileBuffer);
    const hash = ethers.hexlify(new Uint8Array(hashBuffer));
    const message = `CipherVault Document Signature\nHash: ${hash}\nTimestamp: ${timestamp}`;
    const recovered = ethers.verifyMessage(message, signature);
    if (recovered.toLowerCase() !== signer.toLowerCase()) {
      return { valid: false, reason: "Tanda tangan tidak cocok dengan penanda tangan" };
    }
    return { valid: true };
  } catch {
    return { valid: false, reason: "Signature tidak valid" };
  }
}

// ── Helpers ───────────────────────────────────────────────────
function toArrayBuffer(bytes: Uint8Array): ArrayBuffer {
  return bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength) as ArrayBuffer;
}

function arrayBufferToBase64(buffer: ArrayBuffer): string {
  let binary = "";
  const bytes = new Uint8Array(buffer);
  for (let i = 0; i < bytes.byteLength; i++) binary += String.fromCharCode(bytes[i]);
  return window.btoa(binary);
}

function base64ToArrayBuffer(base64: string): ArrayBuffer {
  const binary = window.atob(base64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
  return bytes.buffer as ArrayBuffer;
}