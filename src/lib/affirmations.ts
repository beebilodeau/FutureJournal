import { addDays } from "./dates";
import type { Entry } from "./types";
import { splitSentences } from "./parts";

/**
 * Daily affirmation: one line at the top of the Write screen.
 * Three sources, in this order of preference:
 *   1. "From your words": an "I am / I was / I felt" sentence pulled from the
 *      day you wrote last night (or the last few entries), turned into the
 *      present tense.
 *   2. "Yours": lines you added yourself (kept on this device).
 *   3. A built-in set.
 */

export const BUILT_IN: string[] = [
  "I am becoming the person who lives the day I wrote.",
  "I am calm, clear, and ready for what today brings.",
  "I act on what matters before the day gets loud.",
  "I am worthy of the life I am building.",
  "I handle what comes up with patience and skill.",
  "Opportunities find me because I show up ready.",
  "I keep the promises I make to myself.",
  "I am grateful for what I have and open to more.",
  "My work creates real value for the people I serve.",
  "I choose progress over perfection today.",
  "I am strong, rested, and focused.",
  "Every small step I take today compounds.",
  "I speak with confidence and listen with care.",
  "I trust myself to figure it out.",
  "I am the author of my day, and I wrote a good one.",
  "Money flows to me through work I am proud of.",
  "I give my full attention to the people I love.",
  "I finish what I start.",
  "I am allowed to rest, and I come back stronger.",
  "Today I move one goal clearly forward.",
  "I welcome challenges because they make me better.",
  "I am proud of how far I have already come.",
  "My mind is working on my goals even while I rest.",
  "I notice the good things as they happen.",
  "I lead with kindness and follow through with action.",
  "I am building something that lasts.",
  "I make decisions quickly and adjust with ease.",
  "Today is already a good day. I wrote it that way.",
];

export type AffirmationSource = "words" | "custom" | "built-in";

export interface Affirmation {
  text: string;
  source: AffirmationSource;
}

const KEY = "futurejournal.affirmations.v1";

interface Saved {
  custom: string[];
}

function read(): Saved {
  if (typeof window === "undefined") return { custom: [] };
  try {
    const raw = window.localStorage.getItem(KEY);
    const parsed = raw ? (JSON.parse(raw) as Saved) : null;
    return { custom: Array.isArray(parsed?.custom) ? parsed!.custom.filter((s) => typeof s === "string") : [] };
  } catch {
    return { custom: [] };
  }
}

function write(data: Saved) {
  try {
    window.localStorage.setItem(KEY, JSON.stringify(data));
    window.dispatchEvent(new Event("futurejournal:change"));
  } catch {
    // Storage blocked; keep going in memory.
  }
}

export const affirmationStore = {
  custom(): string[] {
    return read().custom;
  },
  add(line: string) {
    const text = tidy(line);
    if (!text) return;
    const data = read();
    if (!data.custom.includes(text)) data.custom.unshift(text);
    write(data);
  },
  remove(line: string) {
    const data = read();
    write({ custom: data.custom.filter((x) => x !== line) });
  },
  replaceAll(lines: string[]) {
    write({ custom: lines.map(tidy).filter(Boolean) });
  },
};

function tidy(s: string): string {
  let t = s.replace(/\s+/g, " ").trim();
  if (!t) return "";
  t = t[0].toUpperCase() + t.slice(1);
  if (!/[.!?]$/.test(t)) t += ".";
  return t;
}

// Past-tense openers we can safely turn into the present.
const OPENERS: [RegExp, string][] = [
  [/^I was\b/i, "I am"],
  [/^I am\b/i, "I am"],
  [/^I['’]m\b/i, "I am"],
  [/^I felt\b/i, "I feel"],
  [/^I feel\b/i, "I feel"],
];

/** "I am / I was / I felt …" sentences from recent entries, as present-tense lines. */
export function fromWords(entries: Entry[], today: string): string[] {
  const days = new Set([today, addDays(today, -1), addDays(today, -2), addDays(today, -3)]);
  // Today's entry (written last night) first, then the few before it.
  const recent = entries
    .filter((e) => days.has(e.date) && e.text.trim())
    .sort((a, b) => b.date.localeCompare(a.date));
  const out: string[] = [];
  for (const e of recent) {
    for (const sentence of splitSentences(e.text)) {
      const opener = OPENERS.find(([re]) => re.test(sentence));
      if (!opener) continue;
      const words = sentence.split(/\s+/).length;
      if (words < 3 || words > 18) continue;
      const line = tidy(sentence.replace(opener[0], opener[1]));
      if (!out.includes(line)) out.push(line);
    }
  }
  return out;
}

/**
 * Everything the card can show today, in the order "Another" steps through.
 * The first line is today's pick: your own words when there are some, else a
 * line chosen by the date so it stays the same all day.
 */
export function affirmationsFor(entries: Entry[], custom: string[], today: string): Affirmation[] {
  const words = fromWords(entries, today).map((text) => ({ text, source: "words" as const }));
  const rest: Affirmation[] = [
    ...custom.map((text) => ({ text, source: "custom" as const })),
    ...BUILT_IN.map((text) => ({ text, source: "built-in" as const })),
  ];
  // Rotate the rest by the date so each day starts somewhere new.
  const offset = rest.length ? hash(today) % rest.length : 0;
  const rotated = [...rest.slice(offset), ...rest.slice(0, offset)];
  const seen = new Set<string>();
  return [...words, ...rotated].filter((a) => (seen.has(a.text) ? false : (seen.add(a.text), true)));
}

function hash(s: string): number {
  let h = 0;
  for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) >>> 0;
  return h;
}
