import { addDays } from "./dates";
import type { Entry } from "./types";

/**
 * Streak = consecutive days with an entry, counting back from tomorrow
 * (if tonight's entry is written) or from today.
 */
export function streak(entries: Entry[], today: string): number {
  const dates = new Set(entries.filter((e) => e.text.trim()).map((e) => e.date));
  let cursor = dates.has(addDays(today, 1)) ? addDays(today, 1) : today;
  let n = 0;
  while (dates.has(cursor)) {
    n++;
    cursor = addDays(cursor, -1);
  }
  return n;
}

export function outcomeCounts(entries: Entry[]) {
  const c = { happened: 0, partly: 0, "not-yet": 0, reflected: 0 };
  for (const e of entries) {
    if (!e.reflection) continue;
    c[e.reflection.outcome]++;
    c.reflected++;
  }
  return c;
}
