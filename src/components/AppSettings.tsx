"use client";

import { useEffect, useState } from "react";
import { kv } from "@/lib/kv";
import { applyReminder, formatTime, reminderSettings, type ReminderSettings } from "@/lib/reminder";
import { biometricAvailable, biometricUnlock, clearLock, lockSettings, setBiometric, setPin, validPin } from "@/lib/lock";

/** Reminder and app lock settings, shown only inside the apps. */
export function AppSettings() {
  return (
    <section className="space-y-3">
      <h2 className="px-1 text-xs font-semibold uppercase tracking-wider text-muted">App settings</h2>
      <ReminderCard />
      <LockCard />
    </section>
  );
}

function toInput(h: number, m: number) {
  return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`;
}

function ReminderCard() {
  const [s, setS] = useState<ReminderSettings | null>(null);
  const [msg, setMsg] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    kv.ready.then(() => setS(reminderSettings()));
  }, []);
  if (!s) return null;

  async function apply(next: ReminderSettings) {
    setBusy(true);
    setMsg(null);
    try {
      const r = await applyReminder(next);
      setS(reminderSettings());
      if (r === "scheduled") setMsg(`Reminder set for ${formatTime(next.hour, next.minute)} every day.`);
      else if (r === "off") setMsg("Reminder off.");
      else if (r === "denied")
        setMsg("Notifications are off for FutureJournal. Turn them on in your phone’s Settings > Apps > FutureJournal > Notifications, then try again.");
    } catch {
      setMsg("Couldn’t set the reminder on this phone.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="rounded-3xl border border-line bg-card p-4 shadow-sm">
      <div className="flex items-center justify-between gap-3">
        <div>
          <h3 className="font-serif text-lg font-semibold text-ink">Daily reminder</h3>
          <p className="text-sm text-muted">A nudge to write tomorrow’s entry.</p>
        </div>
        <button
          role="switch"
          aria-checked={s.on}
          disabled={busy}
          onClick={() => apply({ ...s, on: !s.on })}
          className={`h-8 w-14 shrink-0 rounded-full p-1 transition ${s.on ? "bg-plum" : "bg-line"}`}
        >
          <span className={`block h-6 w-6 rounded-full bg-card shadow transition ${s.on ? "translate-x-6" : ""}`} />
        </button>
      </div>
      <label className="mt-3 flex items-center justify-between gap-3 text-sm text-ink">
        Time
        <input
          type="time"
          value={toInput(s.hour, s.minute)}
          disabled={busy}
          onChange={(e) => {
            const [h, m] = e.target.value.split(":").map(Number);
            if (Number.isNaN(h) || Number.isNaN(m)) return;
            const next = { ...s, hour: h, minute: m };
            if (s.on) void apply(next);
            else setS(next);
          }}
          className="rounded-xl border border-line bg-paper px-3 py-2 text-ink"
        />
      </label>
      {msg && <p className="mt-2 text-sm text-plum">{msg}</p>}
    </div>
  );
}

function LockCard() {
  const [ready, setReady] = useState(false);
  const [on, setOn] = useState(false);
  const [bio, setBio] = useState(false);
  const [bioAvail, setBioAvail] = useState(false);
  const [mode, setMode] = useState<"view" | "set">("view");
  const [pin1, setPin1] = useState("");
  const [pin2, setPin2] = useState("");
  const [msg, setMsg] = useState<string | null>(null);

  const refresh = () => {
    const s = lockSettings();
    setOn(!!s);
    setBio(!!s?.biometric);
  };

  useEffect(() => {
    kv.ready.then(() => {
      refresh();
      setReady(true);
    });
    biometricAvailable().then(setBioAvail);
  }, []);
  if (!ready) return null;

  async function save() {
    if (!validPin(pin1)) return setMsg("Use 4 to 8 digits.");
    if (pin1 !== pin2) return setMsg("The two PINs don’t match.");
    setPin(pin1, false);
    await kv.flush();
    setPin1("");
    setPin2("");
    setMode("view");
    refresh();
    setMsg("App lock is on.");
  }

  async function toggleBio() {
    if (!bio) {
      // Make sure it works before relying on it.
      if (!(await biometricUnlock())) return setMsg("Fingerprint wasn’t confirmed, so it’s still off.");
    }
    setBiometric(!bio);
    refresh();
  }

  return (
    <div className="rounded-3xl border border-line bg-card p-4 shadow-sm">
      <h3 className="font-serif text-lg font-semibold text-ink">App lock</h3>
      <p className="text-sm text-muted">
        Ask for a PIN when the app opens or comes back after a minute away.
        {" "}If you forget the PIN, the only way back in is clearing the app’s data, which also clears your entries, so keep a recent backup.
      </p>

      {mode === "set" ? (
        <div className="mt-3 space-y-2">
          <input
            inputMode="numeric"
            type="password"
            autoComplete="off"
            placeholder="New PIN (4 to 8 digits)"
            value={pin1}
            onChange={(e) => setPin1(e.target.value.replace(/\D/g, "").slice(0, 8))}
            className="w-full rounded-xl border border-line bg-paper px-3 py-3 text-ink"
          />
          <input
            inputMode="numeric"
            type="password"
            autoComplete="off"
            placeholder="Same PIN again"
            value={pin2}
            onChange={(e) => setPin2(e.target.value.replace(/\D/g, "").slice(0, 8))}
            className="w-full rounded-xl border border-line bg-paper px-3 py-3 text-ink"
          />
          <div className="flex gap-2">
            <button onClick={save} className="flex-1 rounded-xl bg-ink py-3 text-sm font-semibold text-paper">
              Save PIN
            </button>
            <button
              onClick={() => {
                setMode("view");
                setPin1("");
                setPin2("");
                setMsg(null);
              }}
              className="flex-1 rounded-xl border border-line bg-card py-3 text-sm font-semibold text-ink"
            >
              Cancel
            </button>
          </div>
        </div>
      ) : on ? (
        <div className="mt-3 space-y-2">
          {bioAvail && (
            <label className="flex items-center justify-between gap-3 text-sm text-ink">
              Unlock with fingerprint or face
              <button
                role="switch"
                aria-checked={bio}
                onClick={toggleBio}
                className={`h-8 w-14 shrink-0 rounded-full p-1 transition ${bio ? "bg-plum" : "bg-line"}`}
              >
                <span className={`block h-6 w-6 rounded-full bg-card shadow transition ${bio ? "translate-x-6" : ""}`} />
              </button>
            </label>
          )}
          <div className="flex gap-2">
            <button onClick={() => setMode("set")} className="flex-1 rounded-xl border border-line bg-card py-3 text-sm font-semibold text-ink">
              Change PIN
            </button>
            <button
              onClick={() => {
                clearLock();
                refresh();
                setMsg("App lock is off.");
              }}
              className="flex-1 rounded-xl border border-line bg-card py-3 text-sm font-semibold text-ink"
            >
              Turn off
            </button>
          </div>
        </div>
      ) : (
        <button onClick={() => setMode("set")} className="mt-3 w-full rounded-xl bg-ink py-3 text-sm font-semibold text-paper">
          Set a PIN
        </button>
      )}
      {msg && <p className="mt-2 text-sm text-plum">{msg}</p>}
    </div>
  );
}
