"use client";

import { useEffect, useState } from "react";
import { store } from "@/lib/store";
import { checksFor, outcomeFromChecks } from "@/lib/parts";
import type { Check, Entry, Outcome } from "@/lib/types";

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
  const [checks, setChecks] = useState<Check[]>(() => checksFor(entry));
  // Once you pick an overall answer yourself, ticking stops changing it.
  const [pickedByHand, setPickedByHand] = useState(Boolean(entry.reflection));

  useEffect(() => {
    setOutcome(entry.reflection?.outcome);
    setNote(entry.reflection?.note ?? "");
    setEditing(!entry.reflection);
    setChecks(checksFor(entry));
    setPickedByHand(Boolean(entry.reflection));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [entry.date, entry.reflection, entry.text]);

  const showChecks = checks.length >= 2;
  const doneCount = checks.filter((c) => c.done).length;

  function toggle(i: number) {
    const next = checks.map((c, j) => (j === i ? { ...c, done: !c.done } : c));
    setChecks(next);
    if (!pickedByHand) setOutcome(outcomeFromChecks(next));
  }

  function save() {
    if (!outcome) return;
    const current = store.get(entry.date) ?? entry;
    store.put({
      ...current,
      reflection: {
        outcome,
        note,
        at: new Date().toISOString(),
        ...(showChecks ? { checks } : {}),
      },
    });
    setEditing(false);
    onDone?.();
  }

  if (!editing && entry.reflection) {
    const saved = entry.reflection.checks;
    const savedDone = saved?.filter((c) => c.done) ?? [];
    return (
      <div className="rounded-2xl bg-plum-soft px-4 py-3 text-sm">
        <div className="flex items-center justify-between gap-2">
          <p className="font-medium text-plum">
            {outcomeLabel(entry.reflection.outcome)}
            {saved && saved.length > 0 && (
              <span className="font-normal text-muted">
                {" "}
                · {savedDone.length} of {saved.length} came true
              </span>
            )}
          </p>
          <button onClick={() => setEditing(true)} className="shrink-0 text-xs text-muted underline">
            Edit
          </button>
        </div>
        {savedDone.length > 0 && (
          <ul className="mt-2 space-y-1">
            {savedDone.map((c) => (
              <li key={c.text} className="flex gap-2 text-ink">
                <span aria-hidden className="text-sage">✓</span>
                <span>{c.text}</span>
              </li>
            ))}
          </ul>
        )}
        {entry.reflection.note && <p className="mt-2 whitespace-pre-wrap text-ink">{entry.reflection.note}</p>}
      </div>
    );
  }

  return (
    <div id="came-true" className="scroll-mt-4 space-y-3 rounded-2xl bg-plum-soft p-4">
      {showChecks && (
        <div className="space-y-2">
          <div className="flex items-baseline justify-between gap-2">
            <p className="text-sm font-medium text-ink">Tick what came true</p>
            <p className="text-xs text-muted" aria-live="polite">
              {doneCount} of {checks.length}
            </p>
          </div>
          <ul className="space-y-2">
            {checks.map((c, i) => (
              <li key={i}>
                <button
                  type="button"
                  role="checkbox"
                  aria-checked={c.done}
                  onClick={() => toggle(i)}
                  className={`flex w-full items-start gap-3 rounded-xl px-3 py-2.5 text-left text-[15px] leading-snug active:scale-[0.99] ${
                    c.done ? "bg-card text-ink" : "bg-card/60 text-ink"
                  }`}
                >
                  <span
                    aria-hidden
                    className={`mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-md border text-xs font-bold ${
                      c.done ? "border-sage bg-sage text-paper" : "border-line bg-card"
                    }`}
                  >
                    {c.done ? "✓" : ""}
                  </span>
                  <span className="font-serif">{c.text}</span>
                </button>
              </li>
            ))}
          </ul>
        </div>
      )}
      <p className="text-sm font-medium text-ink">{showChecks ? "Overall" : "How did it actually go?"}</p>
      <div className="grid grid-cols-3 gap-2">
        {OUTCOMES.map((o) => (
          <button
            key={o.value}
            type="button"
            aria-pressed={outcome === o.value}
            onClick={() => {
              setOutcome(o.value);
              setPickedByHand(true);
            }}
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
