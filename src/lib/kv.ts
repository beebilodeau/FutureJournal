import { Capacitor } from "@capacitor/core";

/**
 * Key-value storage under every store in the app (entries, affirmations,
 * reminder and lock settings).
 *
 * - On the website it is the browser's localStorage, read and written
 *   directly, exactly as before. Nothing moves, so journals already in a
 *   browser keep working.
 * - In the Android and iOS apps it is the phone's own app storage (Capacitor
 *   Preferences), which the system doesn't clear the way it can clear a web
 *   view's storage. Values are loaded into memory once at start
 *   (`kvReady`), so reads stay synchronous; writes update memory at once
 *   and are saved to the phone in the background, in order.
 */

export interface KVBackend {
  /** Every stored key and value under our prefix. */
  load(): Promise<Record<string, string>>;
  set(key: string, value: string): Promise<void>;
  remove(key: string): Promise<void>;
}

export const PREFIX = "futurejournal.";

export interface KV {
  get(key: string): string | null;
  set(key: string, value: string): void;
  remove(key: string): void;
  /** Resolves once values are in memory (immediately on the web). */
  ready: Promise<void>;
  /** Resolves once every write so far has reached the backend. */
  flush(): Promise<void>;
}

/** The website's storage: plain localStorage, unchanged behaviour. */
export function webKV(): KV {
  return {
    get(key) {
      if (typeof window === "undefined") return null;
      try {
        return window.localStorage.getItem(key);
      } catch {
        return null;
      }
    },
    set(key, value) {
      window.localStorage.setItem(key, value);
    },
    remove(key) {
      window.localStorage.removeItem(key);
    },
    ready: Promise.resolve(),
    flush: () => Promise.resolve(),
  };
}

/**
 * Memory cache over an async backend. `legacy` is read once: if the backend
 * holds nothing yet, anything already in the web view's localStorage is
 * copied across, so nothing written before this storage existed is lost.
 */
export function cachedKV(backend: KVBackend, legacy?: () => Record<string, string>): KV {
  const cache = new Map<string, string>();
  let chain: Promise<unknown> = Promise.resolve();
  const queue = (job: () => Promise<void>) => {
    chain = chain.then(job).catch((err) => console.error("FutureJournal storage write failed", err));
  };

  const ready = (async () => {
    const stored = await backend.load();
    for (const [k, v] of Object.entries(stored)) cache.set(k, v);
    if (cache.size === 0 && legacy) {
      for (const [k, v] of Object.entries(legacy())) {
        if (!k.startsWith(PREFIX)) continue;
        cache.set(k, v);
        queue(() => backend.set(k, v));
      }
    }
  })();

  return {
    get: (key) => cache.get(key) ?? null,
    set(key, value) {
      cache.set(key, value);
      queue(() => backend.set(key, value));
    },
    remove(key) {
      cache.delete(key);
      queue(() => backend.remove(key));
    },
    ready,
    flush: async () => {
      await ready;
      await chain;
    },
  };
}

/** Capacitor Preferences as a backend (loaded only inside the apps). */
async function preferencesBackend(): Promise<KVBackend> {
  const { Preferences } = await import("@capacitor/preferences");
  return {
    async load() {
      const { keys } = await Preferences.keys();
      const out: Record<string, string> = {};
      for (const key of keys) {
        if (!key.startsWith(PREFIX)) continue;
        const { value } = await Preferences.get({ key });
        if (value !== null) out[key] = value;
      }
      return out;
    },
    set: (key, value) => Preferences.set({ key, value }),
    remove: (key) => Preferences.remove({ key }),
  };
}

function readLocalStorage(): Record<string, string> {
  const out: Record<string, string> = {};
  try {
    for (let i = 0; i < window.localStorage.length; i++) {
      const k = window.localStorage.key(i);
      if (k) out[k] = window.localStorage.getItem(k) ?? "";
    }
  } catch {
    // Storage blocked; nothing to copy.
  }
  return out;
}

/** True inside the Android or iOS app, false on the website. */
export function isNativeApp(): boolean {
  if (typeof window === "undefined") return false;
  return Capacitor.isNativePlatform();
}

function makeKV(): KV {
  // The storage round-trip test (scripts/test-storage.ts) stands in a fake
  // phone storage here; the app never sets this.
  const testBackend = typeof window !== "undefined" ? (window as unknown as { __fjTestBackend?: KVBackend }).__fjTestBackend : undefined;
  if (testBackend) return cachedKV(testBackend, readLocalStorage);
  if (!isNativeApp()) return webKV();
  const backendPromise = preferencesBackend();
  const lazy: KVBackend = {
    load: async () => (await backendPromise).load(),
    set: async (k, v) => (await backendPromise).set(k, v),
    remove: async (k) => (await backendPromise).remove(k),
  };
  return cachedKV(lazy, readLocalStorage);
}

export const kv: KV = makeKV();
