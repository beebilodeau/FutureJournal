import type { Entry } from "./types";
import { kv } from "./kv";

/**
 * Storage boundary. Everything in the UI talks to `JournalStore`, so moving
 * from the browser to Supabase later means writing one new implementation
 * (see README → "Adding accounts").
 */
export interface JournalStore {
  all(): Entry[];
  get(date: string): Entry | undefined;
  put(entry: Entry): void;
  remove(date: string): void;
  replaceAll(entries: Entry[]): void;
}

const KEY = "futurejournal.entries.v1";

function read(): Record<string, Entry> {
  if (typeof window === "undefined") return {};
  try {
    const raw = kv.get(KEY);
    return raw ? (JSON.parse(raw) as Record<string, Entry>) : {};
  } catch {
    return {};
  }
}

function write(map: Record<string, Entry>) {
  try {
    kv.set(KEY, JSON.stringify(map));
    window.dispatchEvent(new Event("futurejournal:change"));
  } catch {
    // Storage full or blocked (private mode). The UI keeps working in memory.
  }
}

/** Entries on this device: browser storage on the website, app storage in the apps. */
export const localStore: JournalStore = {
  all() {
    return Object.values(read()).sort((a, b) => b.date.localeCompare(a.date));
  },
  get(date) {
    return read()[date];
  },
  put(entry) {
    const map = read();
    map[entry.date] = entry;
    write(map);
  },
  remove(date) {
    const map = read();
    delete map[date];
    write(map);
  },
  replaceAll(entries) {
    const map: Record<string, Entry> = {};
    for (const e of entries) map[e.date] = e;
    write(map);
  },
};

export const store: JournalStore = localStore;

export function isEntry(x: unknown): x is Entry {
  if (!x || typeof x !== "object") return false;
  const e = x as Entry;
  return (
    typeof e.date === "string" &&
    /^\d{4}-\d{2}-\d{2}$/.test(e.date) &&
    typeof e.text === "string"
  );
}
