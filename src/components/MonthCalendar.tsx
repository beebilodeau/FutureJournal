"use client";

import { useState } from "react";
import { addDays, fromKey, toKey } from "@/lib/dates";
import { cameTrueScore } from "@/lib/parts";
import type { Entry } from "@/lib/types";

/** Month grid: which days you wrote, and how much of each came true. */
export function MonthCalendar({
  entries,
  today,
  onPick,
}: {
  entries: Entry[];
  today: string;
  onPick?: (date: string) => void;
}) {
  const [month, setMonth] = useState(() => {
    const d = fromKey(today);
    return new Date(d.getFullYear(), d.getMonth(), 1);
  });
  const byDate = new Map(entries.filter((e) => e.text.trim()).map((e) => [e.date, e]));

  const first = toKey(month);
  const startPad = month.getDay(); // 0 = Sunday
  const daysInMonth = new Date(month.getFullYear(), month.getMonth() + 1, 0).getDate();
  const cells: (string | null)[] = [
    ...Array.from({ length: startPad }, () => null),
    ...Array.from({ length: daysInMonth }, (_, i) => addDays(first, i)),
  ];
  const written = cells.filter((d) => d && byDate.has(d)).length;
  const shift = (n: number) => setMonth(new Date(month.getFullYear(), month.getMonth() + n, 1));
  const thisMonth = fromKey(today).getMonth() === month.getMonth() && fromKey(today).getFullYear() === month.getFullYear();

  return (
    <section id="calendar" className="scroll-mt-4 rounded-3xl border border-line bg-card p-4 shadow-sm">
      <div className="flex items-center justify-between">
        <button type="button" onClick={() => shift(-1)} className="h-9 w-9 rounded-full text-lg text-muted active:bg-paper" aria-label="Previous month">
          ‹
        </button>
        <div className="text-center">
          <p className="font-serif text-lg font-semibold text-ink">
            {month.toLocaleDateString(undefined, { month: "long", year: "numeric" })}
          </p>
          <p className="text-xs text-muted">
            {written} {written === 1 ? "day" : "days"} written
          </p>
        </div>
        <button
          type="button"
          onClick={() => shift(1)}
          disabled={thisMonth}
          className="h-9 w-9 rounded-full text-lg text-muted active:bg-paper disabled:opacity-30"
          aria-label="Next month"
        >
          ›
        </button>
      </div>
      <div className="mt-3 grid grid-cols-7 gap-1 text-center text-[11px] text-muted">
        {["S", "M", "T", "W", "T", "F", "S"].map((d, i) => (
          <span key={i}>{d}</span>
        ))}
      </div>
      <div className="mt-1 grid grid-cols-7 gap-1">
        {cells.map((d, i) => {
          if (!d) return <span key={`pad-${i}`} />;
          const e = byDate.get(d);
          const score = e?.reflection ? cameTrueScore(e.reflection) : null;
          const cls = !e
            ? d > addDays(today, 1)
              ? "text-muted/40"
              : "text-muted"
            : score !== null && score >= 0.75
              ? "bg-sage text-paper"
              : score !== null && score > 0
                ? "bg-sage/45 text-ink"
                : "bg-dawn-soft text-ink";
          return (
            <button
              key={d}
              type="button"
              disabled={!e}
              onClick={() => onPick?.(d)}
              className={`aspect-square rounded-xl text-sm font-medium ${cls} ${d === today ? "ring-2 ring-plum/50" : ""}`}
              aria-label={`${fromKey(d).toLocaleDateString(undefined, { month: "long", day: "numeric" })}${e ? ", written" : ""}`}
            >
              {fromKey(d).getDate()}
            </button>
          );
        })}
      </div>
      <div className="mt-3 flex flex-wrap items-center justify-center gap-x-4 gap-y-1 text-[11px] text-muted">
        <Legend cls="bg-dawn-soft" label="Written" />
        <Legend cls="bg-sage/45" label="Partly came true" />
        <Legend cls="bg-sage" label="Came true" />
      </div>
    </section>
  );
}

function Legend({ cls, label }: { cls: string; label: string }) {
  return (
    <span className="flex items-center gap-1.5">
      <span className={`h-3 w-3 rounded ${cls}`} />
      {label}
    </span>
  );
}
