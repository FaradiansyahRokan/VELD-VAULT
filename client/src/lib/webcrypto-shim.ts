/**
 * WebCrypto Shim & Polyfill for Insecure Contexts (HTTP on IP addresses)
 *
 * In modern browsers (Chrome, Edge, Safari, Firefox), `window.crypto.subtle`
 * is disabled/undefined when accessing via plain HTTP (e.g. http://212.47.73.139:3005).
 *
 * This shim uses audited, pure JavaScript `@noble/ciphers` (AES-GCM) and
 * `@noble/hashes` (SHA-256) to ensure encryption, decryption, and key derivation
 * work 100% identically on both HTTP and HTTPS.
 */

import { gcm } from "@noble/ciphers/aes.js";
import { sha256 } from "@noble/hashes/sha2.js";

export interface PolyfillKey {
  raw: Uint8Array;
  algorithm: { name: string };
  extractable: boolean;
  usages: string[];
}

function toUint8(data: BufferSource | Uint8Array | ArrayBuffer): Uint8Array {
  if (data instanceof Uint8Array) return data;
  if (data instanceof ArrayBuffer) return new Uint8Array(data);
  if (ArrayBuffer.isView(data)) {
    return new Uint8Array(data.buffer, data.byteOffset, data.byteLength);
  }
  return new Uint8Array(data as any);
}

export const subtlePolyfill = {
  async digest(algorithm: string | { name: string }, data: BufferSource): Promise<ArrayBuffer> {
    const algoName = typeof algorithm === "string" ? algorithm : algorithm?.name;
    if (algoName?.toUpperCase?.().includes("256")) {
      const hash = sha256(toUint8(data));
      return hash.buffer.slice(hash.byteOffset, hash.byteOffset + hash.byteLength);
    }
    throw new Error(`Unsupported digest algorithm: ${JSON.stringify(algorithm)}`);
  },

  async importKey(
    format: "raw" | string,
    keyData: BufferSource,
    algorithm: string | { name: string },
    extractable: boolean,
    keyUsages: string[]
  ): Promise<PolyfillKey | CryptoKey> {
    const raw = new Uint8Array(toUint8(keyData));
    const algoName = typeof algorithm === "string" ? algorithm : algorithm?.name || "AES-GCM";
    return {
      raw,
      algorithm: { name: algoName },
      extractable,
      usages: keyUsages,
    } as any;
  },

  async exportKey(format: string, key: PolyfillKey | CryptoKey | any): Promise<ArrayBuffer> {
    const rawBytes = key.raw ? key.raw : toUint8(key);
    return rawBytes.buffer.slice(rawBytes.byteOffset, rawBytes.byteOffset + rawBytes.byteLength);
  },

  async encrypt(
    algorithm: { name: string; iv: BufferSource },
    key: PolyfillKey | CryptoKey | any,
    data: BufferSource
  ): Promise<ArrayBuffer> {
    const ivBytes = toUint8(algorithm.iv);
    const keyBytes = key.raw ? key.raw : toUint8(key as any);
    const dataBytes = toUint8(data);

    const cipher = gcm(keyBytes, ivBytes);
    const encrypted = cipher.encrypt(dataBytes);
    return encrypted.buffer.slice(encrypted.byteOffset, encrypted.byteOffset + encrypted.byteLength);
  },

  async decrypt(
    algorithm: { name: string; iv: BufferSource },
    key: PolyfillKey | CryptoKey | any,
    data: BufferSource
  ): Promise<ArrayBuffer> {
    const ivBytes = toUint8(algorithm.iv);
    const keyBytes = key.raw ? key.raw : toUint8(key as any);
    const dataBytes = toUint8(data);

    const cipher = gcm(keyBytes, ivBytes);
    const decrypted = cipher.decrypt(dataBytes);
    return decrypted.buffer.slice(decrypted.byteOffset, decrypted.byteOffset + decrypted.byteLength);
  },
};

/**
 * Returns either native crypto.subtle (if available in HTTPS/localhost)
 * or the noble subtlePolyfill (if running in an insecure HTTP context).
 */
export function getSubtleCrypto(): SubtleCrypto {
  if (typeof window !== "undefined" && window.crypto?.subtle) {
    return window.crypto.subtle;
  }
  if (typeof globalThis !== "undefined" && globalThis.crypto?.subtle) {
    return globalThis.crypto.subtle;
  }
  return subtlePolyfill as unknown as SubtleCrypto;
}

/**
 * Safely generate random bytes across all environments
 */
export function getRandomValues<T extends ArrayBufferView | null>(array: T): T {
  if (!array) return array;
  if (typeof window !== "undefined" && window.crypto?.getRandomValues) {
    return (window.crypto.getRandomValues as any)(array);
  }
  if (typeof globalThis !== "undefined" && globalThis.crypto?.getRandomValues) {
    return (globalThis.crypto.getRandomValues as any)(array);
  }
  const u8 = new Uint8Array(array.buffer, array.byteOffset, array.byteLength);
  for (let i = 0; i < u8.length; i++) {
    u8[i] = Math.floor(Math.random() * 256);
  }
  return array;
}

// Automatically polyfill window.crypto.subtle if missing in browser
if (typeof window !== "undefined") {
  if (!window.crypto) {
    (window as any).crypto = {};
  }
  if (!window.crypto.subtle) {
    try {
      Object.defineProperty(window.crypto, "subtle", {
        value: subtlePolyfill,
        writable: true,
        configurable: true,
      });
    } catch {
      (window.crypto as any).subtle = subtlePolyfill;
    }
  }
}
