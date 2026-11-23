// All dates are local calendar days as "YYYY-MM-DD" strings.
//
// The journaling "day" rolls over at 4 AM, not midnight: if you write at
// 12:30 AM you're still finishing last night, so "tomorrow" is the day
// that's about to start, not the one after it.
export const ROLLOVER_HOUR = 4;

export function toKey(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

export function fromKey(key: string): Date {
  const [y, m, d] = key.split("-").map(Number);
  return new Date(y, m - 1, d);
}

export function addDays(key: string, n: number): string {
  const d = fromKey(key);
  d.setDate(d.getDate() + n);
  return toKey(d);
}

/** The journaling day it is right now (respects the 4 AM rollover). */
export function todayKey(now = new Date()): string {
  const d = new Date(now);
  if (d.getHours() < ROLLOVER_HOUR) d.setDate(d.getDate() - 1);
  return toKey(d);
}

export function tomorrowKey(now = new Date()): string {
  return addDays(todayKey(now), 1);
}

export function formatLong(key: string): string {
  return fromKey(key).toLocaleDateString(undefined, {
    weekday: "long",
    month: "long",
    day: "numeric",
  });
}

export function formatShort(key: string): string {
  return fromKey(key).toLocaleDateString(undefined, {
    weekday: "short",
    month: "short",
    day: "numeric",
  });
}

/** "morning" | "day" | "evening" — used to pick what the home screen leads with. */
export function partOfDay(now = new Date()): "morning" | "day" | "evening" {
  const h = now.getHours();
  if (h >= ROLLOVER_HOUR && h < 12) return "morning";
  if (h >= 12 && h < 17) return "day";
  return "evening";
}
