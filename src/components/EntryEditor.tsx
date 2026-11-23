"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { store } from "@/lib/store";
import { tenseHints } from "@/lib/tense";
import { FEELINGS, SPARKS } from "@/lib/prompts";
import type { Entry } from "@/lib/types";

const PLACEHOLDER =
  "Today I woke up rested and clear. I knew exactly what mattered, and I did it…";

export function EntryEditor({
  date,
  autoFocus = false,
  compact = false,
}: {
  date: string;
  autoFocus?: boolean;
  compact?: boolean;
}) {
  const [text, setText] = useState("");
  const [feelings, setFeelings] = useState<string[]>([]);
  const [status, setStatus] = useState<"idle" | "saving" | "saved">("idle");
  const loaded = useRef(false);
  const ref = useRef<HTMLTextAreaElement>(null);

  // Load whatever is saved for this date.
  useEffect(() => {
    const existing = store.get(date);
    setText(existing?.text ?? "");
    setFeelings(existing?.feelings ?? []);
    loaded.current = true;
    setStatus(existing ? "saved" : "idle");
  }, [date]);

  // Autosave, debounced.
  useEffect(() => {
    if (!loaded.current) return;
    const existing = store.get(date);
    if ((existing?.text ?? "") === text && sameList(existing?.feelings ?? [], feelings)) return;
    setStatus("saving");
    const id = window.setTimeout(() => {
      const now = new Date().toISOString();
      if (!text.trim() && feelings.length === 0) {
        if (existing && !existing.reflection) store.remove(date);
        setStatus("idle");
        return;
      }
      const entry: Entry = {
        date,
        text,
        feelings,
        createdAt: existing?.createdAt ?? now,
        updatedAt: now,
        reflection: existing?.reflection,
      };
      store.put(entry);
      setStatus("saved");
    }, 600);
    return () => window.clearTimeout(id);
  }, [text, feelings, date]);

  const hints = useMemo(() => tenseHints(text), [text]);
  const words = text.trim() ? text.trim().split(/\s+/).length : 0;

  function insert(starter: string) {
    const el = ref.current;
    const sep = text && !/\s$/.test(text) ? (text.endsWith(".") ? " " : ". ") : "";
    if (!el) {
      setText(text + sep + starter);
      return;
    }
    const start = el.selectionStart ?? text.length;
    const end = el.selectionEnd ?? text.length;
    const atEnd = start === text.length;
    const piece = atEnd ? sep + starter : starter;
    const next = text.slice(0, start) + piece + text.slice(end);
    setText(next);
    requestAnimationFrame(() => {
      el.focus();
      const pos = start + piece.length;
      el.setSelectionRange(pos, pos);
    });
  }

  function toggleFeeling(f: string) {
    setFeelings((cur) => (cur.includes(f) ? cur.filter((x) => x !== f) : [...cur, f]));
  }

  return (
    <div className="space-y-4">
      <div className="rounded-3xl border border-line bg-card p-4 shadow-sm">
        <textarea
          ref={ref}
          value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder={PLACEHOLDER}
          autoFocus={autoFocus}
          rows={compact ? 5 : 8}
          className="block min-h-40 w-full resize-none bg-transparent font-serif text-lg leading-relaxed text-ink placeholder:text-muted/60 focus:outline-none"
          aria-label="Journal entry"
        />
        <div className="mt-2 flex items-center justify-between text-xs text-muted">
          <span>{words > 0 ? `${words} words` : "Write it as if it already happened"}</span>
          <span aria-live="polite">
            {status === "saving" ? "Saving…" : status === "saved" ? "Saved on this device" : ""}
          </span>
        </div>
      </div>

      {hints.length > 0 && (
        <div className="rounded-2xl bg-dawn-soft px-4 py-3 text-sm text-ink">
          <p className="font-medium">Try it in past tense, like it’s already done.</p>
          <ul className="mt-1 space-y-0.5 text-muted">
            {hints.map((h) => (
              <li key={h.tip}>
                <span className="font-medium text-ink">“{h.phrase}”</span>: {h.tip}
              </li>
            ))}
          </ul>
        </div>
      )}

      {!compact && (
        <section>
          <h3 className="mb-2 text-xs font-semibold uppercase tracking-wider text-muted">
            Need a spark?
          </h3>
          <div className="flex flex-wrap gap-2">
            {SPARKS.map((s) => (
              <button
                key={s.label}
                type="button"
                onClick={() => insert(s.starter)}
                className="rounded-full border border-line bg-card px-3 py-1.5 text-sm text-ink active:scale-95"
              >
                {s.label}
              </button>
            ))}
          </div>
        </section>
      )}

      <section>
        <h3 className="mb-2 text-xs font-semibold uppercase tracking-wider text-muted">
          How did the day feel?
        </h3>
        <div className="flex flex-wrap gap-2">
          {FEELINGS.map((f) => {
            const on = feelings.includes(f);
            return (
              <button
                key={f}
                type="button"
                aria-pressed={on}
                onClick={() => toggleFeeling(f)}
                className={`rounded-full px-3 py-1.5 text-sm active:scale-95 ${
                  on ? "bg-plum text-paper" : "border border-line bg-card text-ink"
                }`}
              >
                {f}
              </button>
            );
          })}
        </div>
      </section>
    </div>
  );
}

function sameList(a: string[], b: string[]) {
  return a.length === b.length && a.every((x, i) => x === b[i]);
}
