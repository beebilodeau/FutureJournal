/**
 * Storage round-trip test: npm test
 *
 * Proves a website backup restores into the app's phone storage and comes back
 * out unchanged, and that the website's own storage format didn't change.
 * Each step runs in a fresh process (like a fresh page load or app start):
 *
 *   1. web       website journal in localStorage -> Download backup
 *   2. app       restore that backup into the phone storage (fake Preferences
 *                kept in a file), with one entry already on the phone
 *   3. restart   app restarts: everything is still there -> Save backup
 *   4. web2      a fresh browser restores the app's backup
 *   5. migrate   app starting on an old web-view journal copies it across
 */
import { execFileSync } from "node:child_process";
import { mkdtempSync, readFileSync, writeFileSync, existsSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import assert from "node:assert/strict";

type Json = Record<string, unknown>;
const self = fileURLToPath(import.meta.url);
const step = process.env.FJ_STEP;
const dir = process.env.FJ_DIR!;

// --- fake browser and phone ---------------------------------------------
function fakeWindow(opts: { phoneFile?: string; local?: Record<string, string> }) {
  const local = new Map(Object.entries(opts.local ?? {}));
  const localStorage = {
    get length() {
      return local.size;
    },
    key: (i: number) => [...local.keys()][i] ?? null,
    getItem: (k: string) => (local.has(k) ? local.get(k)! : null),
    setItem: (k: string, v: string) => void local.set(k, String(v)),
    removeItem: (k: string) => void local.delete(k),
  };
  const w: Json = { localStorage, dispatchEvent: () => true, addEventListener() {}, removeEventListener() {} };
  if (opts.phoneFile) {
    const file = opts.phoneFile;
    const read = (): Record<string, string> => (existsSync(file) ? JSON.parse(readFileSync(file, "utf8")) : {});
    w.__fjTestBackend = {
      load: async () => read(),
      set: async (k: string, v: string) => writeFileSync(file, JSON.stringify({ ...read(), [k]: v })),
      remove: async (k: string) => {
        const m = read();
        delete m[k];
        writeFileSync(file, JSON.stringify(m));
      },
    };
  }
  (globalThis as Json).window = w;
  return local;
}

const ENTRIES = [
  {
    date: "2026-11-20",
    text: "I woke up rested. I sent five outreach emails before 9 and one owner booked a call. I felt “light” all afternoon 🌅.",
    feelings: ["Confident", "Energized"],
    createdAt: "2026-11-19T23:10:00.000Z",
    updatedAt: "2026-11-19T23:14:00.000Z",
    reflection: {
      outcome: "partly",
      note: "Call moved to Monday.",
      at: "2026-11-21T01:00:00.000Z",
      checks: [
        { text: "I woke up rested.", done: true },
        { text: "I sent five outreach emails before 9 and one owner booked a call.", done: false },
        { text: "I felt “light” all afternoon 🌅.", done: true },
      ],
    },
  },
  {
    date: "2026-11-21",
    text: "I was calm on the client call.\nI walked for thirty minutes.",
    feelings: [],
    createdAt: "2026-11-20T22:00:00.000Z",
    updatedAt: "2026-11-20T22:05:00.000Z",
    reflection: { outcome: "happened", note: "", at: "2026-11-22T02:00:00.000Z" },
  },
  {
    date: "2026-11-28",
    text: "I finished the store build and it installed on my Flip on the first try.",
    feelings: ["Proud"],
    createdAt: "2026-11-27T20:00:00.000Z",
    updatedAt: "2026-11-27T20:01:00.000Z",
  },
];
const AFFIRMATIONS = ["I finish what I start.", "I am building something that lasts."];
const PHONE_ONLY = {
  date: "2026-11-10",
  text: "An entry written in the app before restoring.",
  feelings: [],
  createdAt: "2026-11-09T21:00:00.000Z",
  updatedAt: "2026-11-09T21:00:00.000Z",
};

const byDate = (list: { date: string }[]) => [...list].sort((a, b) => a.date.localeCompare(b.date));

async function libs() {
  const store = await import("../src/lib/store");
  const affirmations = await import("../src/lib/affirmations");
  const backup = await import("../src/lib/backup");
  const { kv } = await import("../src/lib/kv");
  await kv.ready;
  return { store: store.store, aff: affirmations.affirmationStore, backup, kv };
}

async function run() {
  if (step === "web") {
    const local = fakeWindow({});
    const { store, aff, backup } = await libs();
    for (const e of ENTRIES) store.put(e as never);
    aff.replaceAll(AFFIRMATIONS);
    // The website's storage format is unchanged: same key, same {date: entry} map.
    const raw = JSON.parse(local.get("futurejournal.entries.v1")!);
    assert.deepEqual(Object.keys(raw).sort(), ENTRIES.map((e) => e.date).sort());
    assert.deepEqual(raw["2026-11-20"], ENTRIES[0]);
    assert.deepEqual(JSON.parse(local.get("futurejournal.affirmations.v1")!), { custom: AFFIRMATIONS });
    writeFileSync(join(dir, "web-backup.json"), JSON.stringify(backup.buildBackup(), null, 2));
    return "website saved 3 entries in the same format and downloaded a backup";
  }

  if (step === "app") {
    const phone = join(dir, "phone.json");
    writeFileSync(phone, JSON.stringify({ "futurejournal.entries.v1": JSON.stringify({ [PHONE_ONLY.date]: PHONE_ONLY }) }));
    fakeWindow({ phoneFile: phone });
    const { store, aff, backup } = await libs();
    assert.equal(store.all().length, 1);
    const r = await backup.restoreBackup(readFileSync(join(dir, "web-backup.json"), "utf8"));
    assert.equal(r.restored, 3);
    assert.equal(r.total, 4);
    assert.deepEqual(byDate(store.all()), byDate([...ENTRIES, PHONE_ONLY]));
    assert.deepEqual(aff.custom(), AFFIRMATIONS);
    // Written through to the phone's storage, not just memory.
    const onPhone = JSON.parse(JSON.parse(readFileSync(phone, "utf8"))["futurejournal.entries.v1"]);
    assert.deepEqual(onPhone["2026-11-20"], ENTRIES[0]);
    return "restored 3 entries into phone storage beside 1 already there; check-offs and affirmations intact";
  }

  if (step === "restart") {
    fakeWindow({ phoneFile: join(dir, "phone.json") });
    const { store, aff, backup } = await libs();
    assert.deepEqual(byDate(store.all()), byDate([...ENTRIES, PHONE_ONLY]));
    assert.deepEqual(aff.custom(), AFFIRMATIONS);
    const out = backup.buildBackup();
    assert.equal(out.app, "futurejournal");
    assert.equal(out.version, 1);
    writeFileSync(join(dir, "app-backup.json"), JSON.stringify(out, null, 2));
    return "after an app restart all 4 entries are still there; app backup saved";
  }

  if (step === "web2") {
    fakeWindow({});
    const { store, aff, backup } = await libs();
    const r = await backup.restoreBackup(readFileSync(join(dir, "app-backup.json"), "utf8"));
    assert.equal(r.restored, 4);
    assert.deepEqual(byDate(store.all()), byDate([...ENTRIES, PHONE_ONLY]));
    assert.deepEqual(aff.custom(), AFFIRMATIONS);
    // Older v0.1 backups (no affirmations) and bare arrays still restore.
    await backup.restoreBackup(JSON.stringify({ app: "futurejournal", version: 1, entries: [ENTRIES[1]] }));
    await backup.restoreBackup(JSON.stringify([ENTRIES[2]]));
    assert.equal(store.all().length, 4);
    await assert.rejects(() => backup.restoreBackup('{"hello":1}'));
    return "a fresh browser restored the app's backup exactly; older backup shapes still work";
  }

  if (step === "migrate") {
    const phone = join(dir, "phone-empty.json");
    const map = Object.fromEntries(ENTRIES.map((e) => [e.date, e]));
    fakeWindow({ phoneFile: phone, local: { "futurejournal.entries.v1": JSON.stringify(map), other: "x" } });
    const { store, kv } = await libs();
    assert.deepEqual(byDate(store.all()), byDate(ENTRIES));
    await kv.flush();
    const saved = JSON.parse(readFileSync(phone, "utf8"));
    assert.deepEqual(Object.keys(saved), ["futurejournal.entries.v1"]);
    return "an app starting with entries in its web view copies them into phone storage";
  }

  // Parent: run each step in its own process.
  const tmp = mkdtempSync(join(tmpdir(), "fj-test-"));
  for (const s of ["web", "app", "restart", "web2", "migrate"]) {
    const out = execFileSync(process.execPath, [...process.execArgv, self], {
      env: { ...process.env, FJ_STEP: s, FJ_DIR: tmp },
      encoding: "utf8",
    });
    process.stdout.write(out);
  }
  console.log("All storage round-trip checks passed.");
  return null;
}

run()
  .then((msg) => {
    if (msg) console.log(`ok  ${step}: ${msg}`);
  })
  .catch((err) => {
    console.error(`FAIL ${step ?? "runner"}:`, err);
    process.exit(1);
  });
