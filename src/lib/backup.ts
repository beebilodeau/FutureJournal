import { isEntry, store } from "./store";
import { affirmationStore } from "./affirmations";
import { kv, isNativeApp } from "./kv";
import { toKey } from "./dates";

/**
 * Backup file format (unchanged since v0.1, so every older backup restores):
 *   { app: "futurejournal", version: 1, entries: Entry[], affirmations: string[] }
 * A bare array of entries is accepted too.
 */
export interface BackupFile {
  app: "futurejournal";
  version: 1;
  entries: ReturnType<typeof store.all>;
  affirmations: string[];
}

export function buildBackup(): BackupFile {
  return { app: "futurejournal", version: 1, entries: store.all(), affirmations: affirmationStore.custom() };
}

export interface RestoreResult {
  /** Entries found in the file. */
  restored: number;
  /** Entries in the journal after the merge. */
  total: number;
  affirmations: number;
}

/**
 * Merge a backup into this device's journal. Entries are matched by day: a day
 * in the file replaces the same day here, and days only on this device stay.
 * Throws if the text isn't a FutureJournal backup.
 */
export async function restoreBackup(text: string): Promise<RestoreResult> {
  const parsed = JSON.parse(text);
  const list: unknown[] = Array.isArray(parsed) ? parsed : parsed?.entries;
  if (!Array.isArray(list)) throw new Error("No entries found");
  const valid = list.filter(isEntry);
  const merged = new Map(store.all().map((e) => [e.date, e]));
  for (const e of valid) merged.set(e.date, { ...e, feelings: e.feelings ?? [] });
  store.replaceAll([...merged.values()]);
  let affirmations = 0;
  if (Array.isArray(parsed?.affirmations)) {
    const lines = parsed.affirmations.filter((x: unknown): x is string => typeof x === "string");
    affirmationStore.replaceAll([...new Set([...affirmationStore.custom(), ...lines])]);
    affirmations = lines.length;
  }
  // In the apps, wait until the phone's storage has the restored journal.
  await kv.flush();
  return { restored: valid.length, total: merged.size, affirmations };
}

export function backupFileName(now = new Date()): string {
  return `futurejournal-${toKey(now)}.json`;
}

/**
 * Hand the backup to the person. The website downloads the file; the apps
 * write it to the app's cache and open the share sheet, so it can go to
 * Drive, Files, email or anywhere else they choose.
 */
export async function saveBackup(): Promise<"downloaded" | "shared"> {
  const data = JSON.stringify(buildBackup(), null, 2);
  const name = backupFileName();
  if (isNativeApp()) {
    const { Filesystem, Directory, Encoding } = await import("@capacitor/filesystem");
    const { Share } = await import("@capacitor/share");
    const { uri } = await Filesystem.writeFile({ path: name, data, directory: Directory.Cache, encoding: Encoding.UTF8 });
    await Share.share({ title: "FutureJournal backup", files: [uri], dialogTitle: "Save your FutureJournal backup" });
    return "shared";
  }
  const url = URL.createObjectURL(new Blob([data], { type: "application/json" }));
  const a = document.createElement("a");
  a.href = url;
  a.download = name;
  a.click();
  URL.revokeObjectURL(url);
  return "downloaded";
}
