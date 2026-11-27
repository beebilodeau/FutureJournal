import type { Check, Entry, Outcome, Reflection } from "./types";

/** Split an entry into sentences (or lines), the parts you tick off at night. */
export function splitSentences(text: string): string[] {
  return text
    .split(/(?<=[.!?])\s+|\n+/)
    .map((s) => s.trim())
    .filter((s) => s.replace(/[^\p{L}\p{N}]/gu, "").length > 0);
}

/** Checks for an entry, keeping earlier ticks for sentences that haven't changed. */
export function checksFor(entry: Entry): Check[] {
  const previous = new Map((entry.reflection?.checks ?? []).map((c) => [c.text, c.done]));
  return splitSentences(entry.text).map((text) => ({ text, done: previous.get(text) ?? false }));
}

/** The outcome the ticks point to: all, some or none came true. */
export function outcomeFromChecks(checks: Check[]): Outcome | undefined {
  if (checks.length === 0) return undefined;
  const done = checks.filter((c) => c.done).length;
  if (done === checks.length) return "happened";
  if (done > 0) return "partly";
  return "not-yet";
}

const OUTCOME_SCORE: Record<Outcome, number> = { happened: 1, partly: 0.5, "not-yet": 0 };

/** 0 to 1: how much of the written day came true. Ticks win over the overall answer. */
export function cameTrueScore(r: Reflection): number {
  if (r.checks && r.checks.length > 0) return r.checks.filter((c) => c.done).length / r.checks.length;
  return OUTCOME_SCORE[r.outcome];
}

/** How often your written days come true, over the reflected entries given. */
export function cameTrueRate(entries: Entry[]) {
  const reflected = entries.filter((e) => e.reflection);
  let parts = 0;
  let done = 0;
  for (const e of reflected) {
    const c = e.reflection!.checks;
    if (c && c.length) {
      parts += c.length;
      done += c.filter((x) => x.done).length;
    }
  }
  const avg = reflected.length
    ? reflected.reduce((sum, e) => sum + cameTrueScore(e.reflection!), 0) / reflected.length
    : 0;
  return { days: reflected.length, percent: Math.round(avg * 100), parts, done };
}
