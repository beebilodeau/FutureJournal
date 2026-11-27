"use client";

import { useEffect, useMemo, useState } from "react";
import {
  SET_CHOICES,
  SETS,
  affirmationStore,
  affirmationsFor,
  type Affirmation,
  type SetChoice,
} from "@/lib/affirmations";
import type { Entry } from "@/lib/types";
import { kv } from "@/lib/kv";

function labelFor(a: Affirmation): string {
  if (a.source === "words") return "From what you wrote";
  if (a.source === "custom") return "Yours";
  return SETS.find((s) => s.id === a.set)?.name ?? "";
}

/** A preview link can open on one set: ?set=abundance. The address is tidied after. */
function takeSetFromAddress() {
  const url = new URL(window.location.href);
  const wanted = url.searchParams.get("set");
  if (!wanted) return;
  url.searchParams.delete("set");
  window.history.replaceState(null, "", url.pathname + url.search + url.hash);
  if (SET_CHOICES.some((c) => c.id === wanted)) affirmationStore.chooseSet(wanted as SetChoice);
}

function useAffirmationSettings(): { custom: string[]; choice: SetChoice } {
  const [custom, setCustom] = useState<string[]>([]);
  const [choice, setChoice] = useState<SetChoice>("all");
  useEffect(() => {
    const load = () => {
      setCustom(affirmationStore.custom());
      setChoice(affirmationStore.setChoice());
    };
    kv.ready.then(() => {
      takeSetFromAddress();
      load();
    });
    window.addEventListener("futurejournal:change", load);
    window.addEventListener("storage", load);
    return () => {
      window.removeEventListener("futurejournal:change", load);
      window.removeEventListener("storage", load);
    };
  }, []);
  return { custom, choice };
}

export function AffirmationCard({ entries, today }: { entries: Entry[]; today: string }) {
  const { custom, choice } = useAffirmationSettings();
  const list = useMemo(() => affirmationsFor(entries, custom, today, choice), [entries, custom, today, choice]);
  const [index, setIndex] = useState(0);
  const [panel, setPanel] = useState<"none" | "add" | "mine" | "sets">("none");
  const [draft, setDraft] = useState("");

  // New day, start from the day's pick again.
  useEffect(() => setIndex(0), [today, choice]);

  const current = list[index % Math.max(list.length, 1)];
  if (!current) return null;
  const label = labelFor(current);

  function save() {
    if (!draft.trim()) return;
    affirmationStore.add(draft);
    setDraft("");
    setPanel("none");
    // Show the line they just added (custom lines sit right after "your words").
    const wordsCount = list.filter((a) => a.source === "words").length;
    setIndex(wordsCount);
  }

  return (
    <section
      id="affirmation"
      aria-label="Today's affirmation"
      className="scroll-mt-4 rounded-3xl bg-plum-soft p-5 text-ink"
    >
      <div className="flex items-center justify-between gap-2">
        <p className="text-xs font-semibold uppercase tracking-wider text-plum">Today’s affirmation</p>
        {label && <p className="truncate text-xs text-muted">{label}</p>}
      </div>
      <p className="mt-2 font-serif text-xl font-semibold leading-snug" aria-live="polite">
        {current.text}
      </p>

      <div className="mt-4 flex flex-wrap gap-2 text-sm">
        <button
          type="button"
          onClick={() => setIndex((i) => (i + 1) % list.length)}
          className="rounded-full bg-card px-3.5 py-2 font-medium active:scale-95"
        >
          ↻ Another
        </button>
        <button
          type="button"
          onClick={() => setPanel(panel === "add" ? "none" : "add")}
          aria-expanded={panel === "add"}
          className="rounded-full bg-card px-3.5 py-2 font-medium active:scale-95"
        >
          + Add your own
        </button>
        <button
          type="button"
          onClick={() => setPanel(panel === "sets" ? "none" : "sets")}
          aria-expanded={panel === "sets"}
          className="rounded-full px-3 py-2 font-medium text-plum active:scale-95"
        >
          Sets
        </button>
        {custom.length > 0 && (
          <button
            type="button"
            onClick={() => setPanel(panel === "mine" ? "none" : "mine")}
            aria-expanded={panel === "mine"}
            className="rounded-full px-3 py-2 font-medium text-plum active:scale-95"
          >
            Mine ({custom.length})
          </button>
        )}
      </div>

      {panel === "add" && (
        <div className="mt-3 space-y-2">
          <textarea
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            rows={2}
            autoFocus
            placeholder="I am…"
            className="block w-full resize-none rounded-xl bg-card p-3 text-base text-ink placeholder:text-muted/70 focus:outline-none"
            aria-label="Your affirmation"
          />
          <button
            type="button"
            onClick={save}
            disabled={!draft.trim()}
            className="w-full rounded-xl bg-plum py-2.5 text-sm font-semibold text-paper disabled:opacity-40"
          >
            Save affirmation
          </button>
        </div>
      )}

      {panel === "sets" && (
        <div className="mt-3" role="radiogroup" aria-label="Which built-in affirmations to show">
          <p className="text-xs text-muted">Built-in lines to show. Yours and lines from your words always show.</p>
          <div className="mt-2 flex flex-wrap gap-2 text-sm">
            {SET_CHOICES.map((c) => (
              <button
                key={c.id}
                type="button"
                role="radio"
                aria-checked={choice === c.id}
                onClick={() => affirmationStore.chooseSet(c.id)}
                className={`rounded-full px-3.5 py-2 font-medium active:scale-95 ${
                  choice === c.id ? "bg-plum text-paper" : "bg-card"
                }`}
              >
                {c.name}
              </button>
            ))}
          </div>
        </div>
      )}

      {panel === "mine" && (
        <ul className="mt-3 space-y-2">
          {custom.map((line) => (
            <li key={line} className="flex items-start gap-2 rounded-xl bg-card p-3 text-sm">
              <span className="flex-1">{line}</span>
              <button
                type="button"
                onClick={() => affirmationStore.remove(line)}
                className="shrink-0 text-xs text-muted underline"
                aria-label={`Remove “${line}”`}
              >
                Remove
              </button>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
