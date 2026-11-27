import { addDays } from "./dates";
import type { Entry } from "./types";
import { splitSentences } from "./parts";
import { kv } from "./kv";

/**
 * Daily affirmation: one line at the top of the Write screen.
 * Three sources, in this order of preference:
 *   1. "From your words": an "I am / I was / I felt" sentence pulled from the
 *      day you wrote last night (or the last few entries), turned into the
 *      present tense.
 *   2. "Yours": lines you added yourself (kept on this device).
 *   3. Two built-in sets, Everyday and Abundance (you choose one or both).
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

/** The second built-in set: 21 abundance lines, added Nov 2026. */
export const ABUNDANCE: string[] = [
  "I am abundant, and I attract everything I desire into my life.",
  "I am a magnet for money and opportunities.",
  "All good things come into my life effortlessly.",
  "I am surrounded by love, peace, and happiness.",
  "Money comes to me in both expected and unexpected ways.",
  "I deserve all the wonderful things life has to offer.",
  "Every day, my life is filled with new blessings.",
  "I am a lucky person, and everything works in my favor.",
  "My mind is filled with thoughts of wealth and prosperity.",
  "I attract wonderful people who add value to my life.",
  "Everything I touch flourishes, grows, and prospers.",
  "My life is filled with endless opportunities.",
  "I am worthy of receiving love, success, and abundance.",
  "The universe always works in my favor.",
  "Every day, I receive more than I ever imagined possible.",
  "My heart is filled with gratitude, and my life is full of blessings.",
  "I am capable of achieving everything I set my mind to.",
  "Wealth, health, and love are part of my life.",
  "I am in the right place, at the perfect time.",
  "The best things in my life are yet to come.",
  "I am grateful for everything I already have and everything that is yet to come.",
];

export type SetId = "everyday" | "abundance";
export type SetChoice = "all" | SetId;

export const SETS: { id: SetId; name: string; lines: string[] }[] = [
  { id: "everyday", name: "Everyday", lines: BUILT_IN },
  { id: "abundance", name: "Abundance", lines: ABUNDANCE },
];

export const SET_CHOICES: { id: SetChoice; name: string }[] = [
  { id: "all", name: "Both sets" },
  ...SETS.map(({ id, name }) => ({ id, name })),
];

export type AffirmationSource = "words" | "custom" | "built-in";

export interface Affirmation {
  text: string;
  source: AffirmationSource;
  /** Which built-in set a built-in line comes from. */
  set?: SetId;
}

const KEY = "futurejournal.affirmations.v1";

interface Saved {
  custom: string[];
  /** Which built-in lines to show; both when missing. */
  set?: SetChoice;
}

function isChoice(x: unknown): x is SetChoice {
  return x === "all" || SETS.some((s) => s.id === x);
}

function read(): Saved {
  if (typeof window === "undefined") return { custom: [], set: "all" };
  try {
    const raw = kv.get(KEY);
    const parsed = raw ? (JSON.parse(raw) as Saved) : null;
    return {
      custom: Array.isArray(parsed?.custom) ? parsed!.custom.filter((s) => typeof s === "string") : [],
      set: isChoice(parsed?.set) ? parsed!.set : "all",
    };
  } catch {
    return { custom: [], set: "all" };
  }
}

function write(data: Saved) {
  try {
    // "Both sets" is the default, so it isn't stored: saved data keeps its old shape.
    const saved: Saved = data.set && data.set !== "all" ? data : { custom: data.custom };
    kv.set(KEY, JSON.stringify(saved));
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
    write({ ...data, custom: data.custom.filter((x) => x !== line) });
  },
  replaceAll(lines: string[]) {
    write({ ...read(), custom: lines.map(tidy).filter(Boolean) });
  },
  setChoice(): SetChoice {
    return read().set ?? "all";
  },
  chooseSet(choice: SetChoice) {
    if (!isChoice(choice)) return;
    write({ ...read(), set: choice });
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

// Where a sentence turns into a story about one day, we stop: "I was calm on
// the 2 PM call" becomes "I am calm."
const CUT = /,|;|:|\s[-–—]\s|\s(?:on|at|in|with|that|when|while|during|after|before|because|since|until|so|but|and (?:they|she|he|we|it|then|I))\s/i;

// "-ed" words that still read well in the present ("I am focused").
const ED_OK = new Set([
  "focused", "energized", "rested", "relaxed", "centered", "grounded", "prepared",
  "motivated", "inspired", "determined", "organized", "balanced", "connected",
  "loved", "blessed", "excited", "supported", "appreciated", "valued", "respected",
  "refreshed", "recharged", "committed", "talented", "gifted", "aligned",
]);

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
      let rest = sentence.replace(opener[0], "").replace(/[.!?]+$/, "");
      const cut = rest.search(CUT);
      if (cut >= 0) rest = rest.slice(0, cut);
      const words = rest.trim().split(/\s+/).filter(Boolean);
      if (words.length < 1 || words.length > 10) continue;
      if (words.some((w) => /\d/.test(w))) continue;
      if (words.some((w) => /ed$/i.test(w) && !ED_OK.has(w.toLowerCase()))) continue;
      // "I was able to …", "I felt like …": not an affirmation on their own.
      if (/^(?:able|like|that|so|going|about|there|here|the|a|an)$/i.test(words[0])) continue;
      const line = tidy(`${opener[1]} ${words.join(" ")}`);
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
export function affirmationsFor(
  entries: Entry[],
  custom: string[],
  today: string,
  choice: SetChoice = "all",
): Affirmation[] {
  const words = fromWords(entries, today).map((text) => ({ text, source: "words" as const }));
  const rest: Affirmation[] = [
    ...custom.map((text) => ({ text, source: "custom" as const })),
    ...builtIns(choice),
  ];
  // Rotate the rest by the date so each day starts somewhere new.
  const offset = rest.length ? hash(today) % rest.length : 0;
  const rotated = [...rest.slice(offset), ...rest.slice(0, offset)];
  const seen = new Set<string>();
  return [...words, ...rotated].filter((a) => (seen.has(a.text) ? false : (seen.add(a.text), true)));
}

/** Built-in lines for the chosen set; with both, the two sets take turns. */
function builtIns(choice: SetChoice): Affirmation[] {
  const sets = SETS.filter((s) => choice === "all" || s.id === choice).map((s) =>
    s.lines.map((text) => ({ text, source: "built-in" as const, set: s.id })),
  );
  const out: Affirmation[] = [];
  const longest = Math.max(0, ...sets.map((l) => l.length));
  for (let i = 0; i < longest; i++) for (const lines of sets) if (lines[i]) out.push(lines[i]);
  return out;
}

function hash(s: string): number {
  let h = 0;
  for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) >>> 0;
  return h;
}
