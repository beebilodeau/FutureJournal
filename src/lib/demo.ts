import { addDays, todayKey } from "./dates";
import { store } from "./store";
import { isNativeApp } from "./kv";
import { splitSentences } from "./parts";
import type { Entry, Outcome } from "./types";

/**
 * Sample entries for preview links, so a new feature can be tried on a phone
 * without first writing a week of entries. Only runs when the address has
 * ?demo=1, the host is a preview (not the live site), and there are no entries
 * yet. Never touches real journals.
 */

const SAMPLES: { text: string; outcome?: Outcome; feelings: string[] }[] = [
  {
    text: "I woke up before my alarm and felt rested. I finished the proposal by noon. I was calm on the client call and they said yes to a pilot. I walked for thirty minutes after lunch.",
    outcome: "happened",
    feelings: ["Proud", "Calm"],
  },
  {
    text: "I wrote for an hour before work. I'm grateful that the team meeting was short and clear. I cooked dinner at home and went to bed by eleven.",
    outcome: "partly",
    feelings: ["Focused"],
  },
  {
    text: "I sent five outreach emails before 9. One owner wrote back and booked a call. I felt confident and light all afternoon.",
    outcome: "happened",
    feelings: ["Confident", "Energized"],
  },
  {
    text: "I was patient when the build broke and fixed it in twenty minutes. I called my son on the drive home. I read for half an hour before sleep.",
    outcome: "happened",
    feelings: ["Calm", "Loved"],
  },
  {
    text: "I published the new page and shared it. Two people signed up. I stretched in the morning and my back felt great.",
    outcome: "not-yet",
    feelings: ["Grateful"],
  },
  {
    text: "I spent the morning on the one task that mattered. I am proud of how I handled a hard conversation. We laughed at dinner.",
    outcome: "partly",
    feelings: ["Proud", "Joyful"],
  },
  {
    text: "I closed my laptop at six and took a long walk. I felt clear about next week's plan. I slept well.",
    outcome: "happened",
    feelings: ["Calm"],
  },
  {
    text: "I finished the game level I'd been stuck on. I answered every email that mattered by 3. I felt focused and steady all day.",
    outcome: "happened",
    feelings: ["Focused"],
  },
  // Today: written last night, not reflected yet, so the evening check-off can be tried.
  {
    text: "I woke up rested and clear. I finished the first draft of the proposal before lunch. I was calm and confident on the 2 PM call, and they asked for a quote. I took a walk at sunset. I went to bed grateful.",
    feelings: ["Calm", "Confident"],
  },
];

const LIVE_HOSTS = ["journal.leadinspiregrow.com"];

export function maybeSeedDemo(): boolean {
  if (typeof window === "undefined") return false;
  const url = new URL(window.location.href);
  if (url.searchParams.get("demo") !== "1") return false;
  // Tidy the address either way, so a reload or a shared link stays clean.
  url.searchParams.delete("demo");
  window.history.replaceState(null, "", url.pathname + url.search + url.hash);
  if (LIVE_HOSTS.includes(url.hostname) || isNativeApp()) return false;
  if (store.all().length > 0) return false;

  const today = todayKey();
  const now = new Date().toISOString();
  const entries: Entry[] = [];
  const first = addDays(today, -(SAMPLES.length - 1));
  SAMPLES.forEach((s, i) => {
    const date = addDays(first, i);
    entries.push({
      date,
      text: s.text,
      feelings: s.feelings,
      createdAt: now,
      updatedAt: now,
      reflection: s.outcome
        ? { outcome: s.outcome, note: "", at: now, checks: sampleChecks(s.text, s.outcome) }
        : undefined,
    });
  });
  // An older run with a gap, so the calendar has some shape.
  for (const back of [11, 12, 13]) {
    entries.push({
      date: addDays(today, -back),
      text: "I kept my morning routine and moved my main goal forward.",
      feelings: [],
      createdAt: now,
      updatedAt: now,
      reflection: { outcome: "happened", note: "", at: now },
    });
  }
  store.replaceAll(entries);
  return true;
}

function sampleChecks(text: string, outcome: Outcome) {
  const parts = splitSentences(text);
  const doneUpTo = outcome === "happened" ? parts.length : outcome === "partly" ? Math.ceil(parts.length / 2) : 0;
  return parts.map((t, i) => ({ text: t, done: i < doneUpTo }));
}
