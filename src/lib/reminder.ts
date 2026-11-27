import { kv, isNativeApp } from "./kv";

/**
 * Daily reminder (apps only): a notification the phone schedules itself, at
 * the time the person picks. No server is involved; it keeps working offline
 * and after a restart.
 */

const KEY = "futurejournal.reminder.v1";
const ID = 1001;
const CHANNEL = "daily-reminder";

export interface ReminderSettings {
  on: boolean;
  hour: number; // 0 to 23
  minute: number;
}

export const DEFAULT_REMINDER: ReminderSettings = { on: false, hour: 21, minute: 0 };

export function reminderSettings(): ReminderSettings {
  try {
    const raw = kv.get(KEY);
    const s = raw ? (JSON.parse(raw) as ReminderSettings) : null;
    if (s && typeof s.hour === "number" && typeof s.minute === "number") return { ...DEFAULT_REMINDER, ...s };
  } catch {
    // fall through
  }
  return DEFAULT_REMINDER;
}

function save(s: ReminderSettings) {
  kv.set(KEY, JSON.stringify(s));
  window.dispatchEvent(new Event("futurejournal:change"));
}

export type ReminderResult = "scheduled" | "off" | "denied" | "unavailable";

/**
 * Turn the reminder on (asking for notification permission first, which
 * Android 13 and later require) or off, and save the choice.
 */
export async function applyReminder(next: ReminderSettings): Promise<ReminderResult> {
  if (!isNativeApp()) return "unavailable";
  const { LocalNotifications } = await import("@capacitor/local-notifications");
  await LocalNotifications.cancel({ notifications: [{ id: ID }] }).catch(() => {});

  if (!next.on) {
    save({ ...next, on: false });
    return "off";
  }

  let perm = await LocalNotifications.checkPermissions();
  if (perm.display !== "granted") perm = await LocalNotifications.requestPermissions();
  if (perm.display !== "granted") {
    save({ ...next, on: false });
    return "denied";
  }

  await LocalNotifications.createChannel({
    id: CHANNEL,
    name: "Daily reminder",
    description: "A nudge to write tomorrow's entry",
    importance: 4,
  }).catch(() => {}); // iOS has no channels

  await LocalNotifications.schedule({
    notifications: [
      {
        id: ID,
        title: "Write tomorrow tonight",
        body: "Take two minutes to write tomorrow as if it already happened.",
        channelId: CHANNEL,
        smallIcon: "ic_stat_futurejournal",
        iconColor: "#5f4b8b",
        schedule: { on: { hour: next.hour, minute: next.minute }, allowWhileIdle: true },
        // A nudge can land a few minutes late, so skip Android's "Alarms &
        // reminders" permission (the app doesn't request it, so the switch
        // there is greyed out) and schedule it as a normal alarm.
        isExactNotification: false,
      },
    ],
  });
  save({ ...next, on: true });
  return "scheduled";
}

export function formatTime(hour: number, minute: number): string {
  const h12 = hour % 12 === 0 ? 12 : hour % 12;
  return `${h12}:${String(minute).padStart(2, "0")} ${hour < 12 ? "AM" : "PM"}`;
}
