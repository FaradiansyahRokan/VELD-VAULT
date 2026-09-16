/**
 * Reliable Local Key-Value Store
 *
 * Provides a drop-in replacement for @vercel/kv that:
 * 1. Automatically uses @vercel/kv if KV_REST_API_URL is configured in environment.
 * 2. Otherwise persists to a local JSON file (/tmp/veld_kv_store.json) with in-memory caching.
 *
 * This prevents 500 Internal Server Errors when running on a standalone VPS or Docker container.
 */

import fs from "fs";
import path from "path";

const KV_FILE = process.env.LOCAL_KV_PATH || "/tmp/veld_kv_store.json";

interface KVEntry {
  val: any;
  expiresAt?: number;
}

interface KVMemory {
  kv: Record<string, KVEntry>;
  lists: Record<string, any[]>;
}

// Global persistence so Next.js fast-refresh / API workers share memory
const g = globalThis as unknown as { __veldLocalKV?: KVMemory };

if (!g.__veldLocalKV) {
  g.__veldLocalKV = {
    kv: {},
    lists: {},
  };

  // Load from disk if exists
  try {
    if (fs.existsSync(KV_FILE)) {
      const parsed = JSON.parse(fs.readFileSync(KV_FILE, "utf-8"));
      if (parsed && typeof parsed === "object") {
        g.__veldLocalKV.kv = parsed.kv || {};
        g.__veldLocalKV.lists = parsed.lists || {};
      }
    }
  } catch {
    // start fresh
  }
}

function flushToDisk() {
  try {
    const dir = path.dirname(KV_FILE);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
    fs.writeFileSync(KV_FILE, JSON.stringify(g.__veldLocalKV, null, 2), "utf-8");
  } catch {
    // silent failure if write-protected
  }
}

class LocalKV {
  private hasVercelKV = !!(process.env.KV_REST_API_URL && process.env.KV_REST_API_TOKEN);
  private vercelKV: any = null;

  constructor() {
    if (this.hasVercelKV) {
      try {
        const { kv } = require("@vercel/kv");
        this.vercelKV = kv;
      } catch {
        this.hasVercelKV = false;
      }
    }
  }

  async get<T = any>(key: string): Promise<T | null> {
    if (this.hasVercelKV && this.vercelKV) {
      try {
        return await this.vercelKV.get(key);
      } catch {}
    }

    const entry = g.__veldLocalKV!.kv[key];
    if (!entry) return null;
    if (entry.expiresAt && Date.now() > entry.expiresAt) {
      delete g.__veldLocalKV!.kv[key];
      flushToDisk();
      return null;
    }
    return entry.val as T;
  }

  async set(key: string, value: any, options?: { ex?: number }): Promise<void> {
    if (this.hasVercelKV && this.vercelKV) {
      try {
        await this.vercelKV.set(key, value, options);
        return;
      } catch {}
    }

    const entry: KVEntry = { val: value };
    if (options?.ex && typeof options.ex === "number") {
      entry.expiresAt = Date.now() + options.ex * 1000;
    }
    g.__veldLocalKV!.kv[key] = entry;
    flushToDisk();
  }

  async del(key: string): Promise<void> {
    if (this.hasVercelKV && this.vercelKV) {
      try {
        await this.vercelKV.del(key);
        return;
      } catch {}
    }

    delete g.__veldLocalKV!.kv[key];
    delete g.__veldLocalKV!.lists[key];
    flushToDisk();
  }

  async lpush(key: string, ...values: any[]): Promise<number> {
    if (this.hasVercelKV && this.vercelKV) {
      try {
        return await this.vercelKV.lpush(key, ...values);
      } catch {}
    }

    if (!g.__veldLocalKV!.lists[key]) {
      g.__veldLocalKV!.lists[key] = [];
    }
    for (const val of values) {
      g.__veldLocalKV!.lists[key].unshift(val);
    }
    flushToDisk();
    return g.__veldLocalKV!.lists[key].length;
  }

  async lrange(key: string, start: number, stop: number): Promise<any[]> {
    if (this.hasVercelKV && this.vercelKV) {
      try {
        return await this.vercelKV.lrange(key, start, stop);
      } catch {}
    }

    const list = g.__veldLocalKV!.lists[key] || [];
    const end = stop < 0 ? list.length + stop + 1 : stop + 1;
    return list.slice(start, end);
  }

  async ltrim(key: string, start: number, stop: number): Promise<void> {
    if (this.hasVercelKV && this.vercelKV) {
      try {
        await this.vercelKV.ltrim(key, start, stop);
        return;
      } catch {}
    }

    const list = g.__veldLocalKV!.lists[key] || [];
    const end = stop < 0 ? list.length + stop + 1 : stop + 1;
    g.__veldLocalKV!.lists[key] = list.slice(start, end);
    flushToDisk();
  }

  async lset(key: string, index: number, value: any): Promise<void> {
    if (this.hasVercelKV && this.vercelKV) {
      try {
        await this.vercelKV.lset(key, index, value);
        return;
      } catch {}
    }

    const list = g.__veldLocalKV!.lists[key];
    if (list && index >= 0 && index < list.length) {
      list[index] = value;
      flushToDisk();
    }
  }
}

export const kv = new LocalKV();
export default kv;
