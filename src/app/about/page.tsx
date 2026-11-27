"use client";

import { useRef, useState } from "react";
import { isEntry, store } from "@/lib/store";
import { affirmationStore } from "@/lib/affirmations";
import { toKey } from "@/lib/dates";

const STEPS = [
  {
    title: "Tonight, write tomorrow",
    body: "Picture tomorrow already over, and it went the way you wanted. Write it in past tense: what you did, who you saw, what you overcame, how it felt.",
  },
  {
    title: "Tomorrow morning, read it",
    body: "Open the app and read the day you already wrote. It takes a minute and sets the tone for what you notice and act on.",
  },
  {
    title: "Tomorrow night, look back",
    body: "Mark whether it happened, partly happened, or hasn’t yet, and note what helped or got in the way. Then write the next day.",
  },
];

const TIPS = [
  "Feelings matter as much as events. “I felt calm walking into the meeting” beats “I had a meeting.”",
  "Be specific and believable. Small, real wins compound.",
  "Include one obstacle you handled well. It rehearses how you’ll respond.",
  "Keep it short on busy nights. Three honest sentences count.",
];

export default function AboutPage() {
  const fileRef = useRef<HTMLInputElement>(null);
  const [msg, setMsg] = useState<string | null>(null);

  function exportJson() {
    const data = JSON.stringify(
      { app: "futurejournal", version: 1, entries: store.all(), affirmations: affirmationStore.custom() },
      null,
      2,
    );
    const url = URL.createObjectURL(new Blob([data], { type: "application/json" }));
    const a = document.createElement("a");
    a.href = url;
    a.download = `futurejournal-${toKey(new Date())}.json`;
    a.click();
    URL.revokeObjectURL(url);
    setMsg("Backup downloaded.");
  }

  async function importJson(file: File) {
    try {
      const parsed = JSON.parse(await file.text());
      const list: unknown[] = Array.isArray(parsed) ? parsed : parsed?.entries;
      if (!Array.isArray(list)) throw new Error("No entries found");
      const valid = list.filter(isEntry);
      const merged = new Map(store.all().map((e) => [e.date, e]));
      for (const e of valid) merged.set(e.date, { ...e, feelings: e.feelings ?? [] });
      store.replaceAll([...merged.values()]);
      if (Array.isArray(parsed?.affirmations)) {
        const lines = parsed.affirmations.filter((x: unknown): x is string => typeof x === "string");
        affirmationStore.replaceAll([...new Set([...affirmationStore.custom(), ...lines])]);
      }
      setMsg(`Restored ${valid.length} entries.`);
    } catch {
      setMsg("That file didn’t look like a FutureJournal backup.");
    }
  }

  return (
    <div className="space-y-8">
      <header className="pt-2">
        <p className="text-sm font-medium text-dawn">FutureJournal</p>
        <h1 className="mt-1 font-serif text-3xl font-semibold text-ink">How it works</h1>
        <p className="mt-2 text-muted">
          Write the day before it happens, as if it already did. Then live it, and look back.
        </p>
      </header>

      <ol className="space-y-3">
        {STEPS.map((s, i) => (
          <li key={s.title} className="flex gap-4 rounded-3xl border border-line bg-card p-4 shadow-sm">
            <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-dawn-soft font-serif font-semibold text-ink">
              {i + 1}
            </span>
            <div>
              <h2 className="font-serif text-lg font-semibold text-ink">{s.title}</h2>
              <p className="mt-1 text-sm leading-relaxed text-muted">{s.body}</p>
            </div>
          </li>
        ))}
      </ol>

      <section className="space-y-2">
        <h2 className="px-1 text-xs font-semibold uppercase tracking-wider text-muted">Writing tips</h2>
        <ul className="space-y-2 rounded-3xl bg-plum-soft p-5 text-sm leading-relaxed text-ink">
          {TIPS.map((t) => (
            <li key={t}>• {t}</li>
          ))}
        </ul>
      </section>

      <section className="space-y-3">
        <h2 className="px-1 text-xs font-semibold uppercase tracking-wider text-muted">Your data</h2>
        <p className="px-1 text-sm text-muted">
          Entries stay on this device, in this browser. Nothing is sent anywhere. Download a backup
          now and then, especially before clearing your browser.
        </p>
        <div className="flex gap-2">
          <button onClick={exportJson} className="flex-1 rounded-xl bg-ink py-3 text-sm font-semibold text-paper">
            Download backup
          </button>
          <button onClick={() => fileRef.current?.click()} className="flex-1 rounded-xl border border-line bg-card py-3 text-sm font-semibold text-ink">
            Restore backup
          </button>
          <input
            ref={fileRef}
            type="file"
            accept="application/json,.json"
            className="hidden"
            onChange={(e) => e.target.files?.[0] && importJson(e.target.files[0])}
          />
        </div>
        {msg && <p className="px-1 text-sm text-plum">{msg}</p>}
        <p className="px-1 text-sm text-muted">
          To add it to your home screen, open your browser menu and choose <strong>Install app</strong> or{" "}
          <strong>Add to Home screen</strong>.
        </p>
      </section>
    </div>
  );
}
