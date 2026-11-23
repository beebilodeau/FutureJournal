"use client";

import { useEffect, useState } from "react";
import { store } from "@/lib/store";
import type { Entry, Outcome } from "@/lib/types";

export const OUTCOMES: { value: Outcome; label: string; emoji: string }[] = [
  { value: "happened", label: "It happened", emoji: "✦" },
  { value: "partly", label: "Partly", emoji: "◐" },
  { value: "not-yet", label: "Not yet", emoji: "○" },
];

export function outcomeLabel(o: Outcome) {
  return OUTCOMES.find((x) => x.value === o)?.label ?? o;
}

export function ReflectCard({ entry, onDone }: { entry: Entry; onDone?: () => void }) {
  const [outcome, setOutcome] = useState<Outcome | undefined>(entry.reflection?.outcome);
  const [note, setNote] = useState(entry.reflection?.note ?? "");
  const [editing, setEditing] = useState(!entry.reflection);

  useEffect(() => {
    setOutcome(entry.reflection?.outcome);
    setNote(entry.reflection?.note ?? "");
    setEditing(!entry.reflection);
  }, [entry.date, entry.reflection]);

  function save() {
    if (!outcome) return;
    const current = store.get(entry.date) ?? entry;
    store.put({
      ...current,
      reflection: { outcome, note, at: new Date().toISOString() },
    });
    setEditing(false);
    onDone?.();
  }

  if (!editing && entry.reflection) {
    return (
      <div className="rounded-2xl bg-plum-soft px-4 py-3 text-sm">
        <div className="flex items-center justify-between">
          <p className="font-medium text-plum">{outcomeLabel(entry.reflection.outcome)}</p>
          <button onClick={() => setEditing(true)} className="text-xs text-muted underline">
            Edit
          </button>
        </div>
        {entry.reflection.note && <p className="mt-1 whitespace-pre-wrap text-ink">{entry.reflection.note}</p>}
      </div>
    );
  }

  return (
    <div className="space-y-3 rounded-2xl bg-plum-soft p-4">
      <p className="text-sm font-medium text-ink">How did it actually go?</p>
      <div className="grid grid-cols-3 gap-2">
        {OUTCOMES.map((o) => (
          <button
            key={o.value}
            type="button"
            aria-pressed={outcome === o.value}
            onClick={() => setOutcome(o.value)}
            className={`rounded-xl px-2 py-2.5 text-sm font-medium active:scale-95 ${
              outcome === o.value ? "bg-plum text-paper" : "bg-card text-ink"
            }`}
          >
            <span className="mr-1">{o.emoji}</span>
            {o.label}
          </button>
        ))}
      </div>
      <textarea
        value={note}
        onChange={(e) => setNote(e.target.value)}
        rows={3}
        placeholder="What showed up? What moved you closer, or what got in the way?"
        className="block w-full resize-none rounded-xl bg-card p-3 text-base text-ink placeholder:text-muted/70 focus:outline-none"
      />
      <button
        type="button"
        onClick={save}
        disabled={!outcome}
        className="w-full rounded-xl bg-ink py-3 text-sm font-semibold text-paper disabled:opacity-40"
      >
        Save reflection
      </button>
    </div>
  );
}
