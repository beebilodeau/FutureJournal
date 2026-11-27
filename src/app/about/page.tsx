"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { restoreBackup, saveBackup } from "@/lib/backup";
import { isNativeApp } from "@/lib/kv";
import { AppSettings } from "@/components/AppSettings";

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
  const [inApp, setInApp] = useState(false);
  useEffect(() => setInApp(isNativeApp()), []);

  async function exportJson() {
    try {
      const how = await saveBackup();
      setMsg(how === "shared" ? "Backup ready. Save it somewhere safe, like Drive or Files." : "Backup downloaded.");
    } catch {
      setMsg("Backup not saved.");
    }
  }

  async function importJson(file: File) {
    try {
      const r = await restoreBackup(await file.text());
      setMsg(`Restored ${r.restored} entries. Your journal now has ${r.total}.`);
    } catch {
      setMsg("That file didn’t look like a FutureJournal backup.");
    } finally {
      if (fileRef.current) fileRef.current.value = "";
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
          {inApp ? (
            <>
              Entries stay on this phone, in the app’s own storage. Your journal is never uploaded. The one
              exception is the Speak button: while it’s on, your phone’s own speech recognition (Google’s, on
              most Android phones) turns what you say into text. Save a
              backup now and then, and before you change phones. Restore takes a backup from the website or
              from this app.
            </>
          ) : (
            <>
              Entries stay on this device, in this browser. Your journal is never uploaded. The one
              exception is the Speak button: while it’s on, your browser’s own speech service (Google’s,
              in Chrome) turns what you say into text. Download a backup now and then, especially before
              clearing your browser.
            </>
          )}
        </p>
        <div className="flex gap-2">
          <button onClick={exportJson} className="flex-1 rounded-xl bg-ink py-3 text-sm font-semibold text-paper">
            {inApp ? "Save backup" : "Download backup"}
          </button>
          <button onClick={() => fileRef.current?.click()} className="flex-1 rounded-xl border border-line bg-card py-3 text-sm font-semibold text-ink">
            Restore backup
          </button>
          <input
            ref={fileRef}
            type="file"
            accept={inApp ? undefined : "application/json,.json"}
            className="hidden"
            onChange={(e) => e.target.files?.[0] && importJson(e.target.files[0])}
          />
        </div>
        {msg && <p className="px-1 text-sm text-plum">{msg}</p>}
        {!inApp && (
          <p className="px-1 text-sm text-muted">
            To add it to your home screen, open your browser menu and choose <strong>Install app</strong> or{" "}
            <strong>Add to Home screen</strong>.
          </p>
        )}
        <p className="px-1 text-sm text-muted">
          <Link href="/privacy/" className="font-semibold text-plum underline">
            Privacy policy
          </Link>
        </p>
      </section>

      {inApp && <AppSettings />}
    </div>
  );
}
