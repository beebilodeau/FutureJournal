"use client";

import Link from "next/link";
import { addDays, fromKey } from "@/lib/dates";
import { bestStreak, streak } from "@/lib/stats";
import { cameTrueScore } from "@/lib/parts";
import type { Entry } from "@/lib/types";

/**
 * A row of the last week of days, ending with tomorrow (tonight's entry).
 * Filled = written; a small dot under it = reflected; green = mostly came true.
 */
export function StreakStrip({ entries, today }: { entries: Entry[]; today: string }) {
  const byDate = new Map(entries.filter((e) => e.text.trim()).map((e) => [e.date, e]));
  const days = Array.from({ length: 7 }, (_, i) => addDays(today, i - 5)); // 5 back, today, tomorrow
  const count = streak(entries, today);
  const best = bestStreak(entries);
  const tomorrow = addDays(today, 1);
  const wroteTonight = byDate.has(tomorrow);

  const headline =
    count === 0
      ? "Start a streak tonight"
      : `${count}-day streak${best > count ? ` · best ${best}` : count > 1 ? " · your best" : ""}`;
  const sub =
    count > 0 && !wroteTonight
      ? "Write tomorrow tonight to keep it going."
      : wroteTonight
        ? "Tonight’s entry is in."
        : "One entry tonight starts it.";

  return (
    <section id="streak" aria-label="Streak" className="scroll-mt-4 rounded-3xl border border-line bg-card p-4 shadow-sm">
      <div className="flex items-baseline justify-between gap-2">
        <p className="font-serif text-lg font-semibold text-ink">{headline}</p>
        <Link href="/journal/#calendar" className="shrink-0 text-xs font-medium text-plum underline">
          Calendar
        </Link>
      </div>
      <p className="text-sm text-muted">{sub}</p>
      <ol className="mt-3 grid grid-cols-7 gap-1.5">
        {days.map((d) => {
          const e = byDate.get(d);
          const isTomorrow = d === tomorrow;
          const isToday = d === today;
          const score = e?.reflection ? cameTrueScore(e.reflection) : null;
          const fill = !e
            ? isTomorrow
              ? "border border-dashed border-dawn text-muted"
              : "border border-line text-muted"
            : score !== null && score >= 0.75
              ? "bg-sage text-paper"
              : "bg-dawn text-paper";
          return (
            <li key={d} className="flex flex-col items-center gap-1">
              <span className={`text-[11px] ${isToday ? "font-semibold text-ink" : "text-muted"}`}>
                {isTomorrow ? "Tmrw" : fromKey(d).toLocaleDateString(undefined, { weekday: "narrow" })}
              </span>
              <span
                className={`flex h-9 w-9 items-center justify-center rounded-full text-sm font-semibold ${fill} ${
                  isToday ? "ring-2 ring-plum/40 ring-offset-1 ring-offset-card" : ""
                }`}
                aria-label={`${fromKey(d).toLocaleDateString(undefined, { weekday: "long", month: "short", day: "numeric" })}: ${
                  e ? (score !== null ? `written, ${Math.round(score * 100)}% came true` : "written") : "not written"
                }`}
              >
                {e ? (e.reflection ? "✓" : "☀") : fromKey(d).getDate()}
              </span>
            </li>
          );
        })}
      </ol>
    </section>
  );
}
