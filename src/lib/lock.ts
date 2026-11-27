import { kv, isNativeApp } from "./kv";
import { sha256Hex } from "./sha256";

/**
 * App lock (apps only). A 4 to 8 digit PIN, stored as a salted, repeated
 * SHA-256 hash, never as the PIN itself. Fingerprint or face unlock can be
 * turned on as a shortcut; the PIN always works.
 *
 * There is no server, so there is no "forgot PIN" email. If the PIN is lost,
 * clearing the app's data is the way back in, which also clears entries, so
 * the settings screen says to keep a backup.
 */

const KEY = "futurejournal.lock.v1";
const ROUNDS = 2000;
/** Lock again after the app has been in the background this long. */
export const RELOCK_AFTER_MS = 60_000;

export interface LockSettings {
  salt: string;
  hash: string;
  biometric: boolean;
}

export function lockSettings(): LockSettings | null {
  try {
    const raw = kv.get(KEY);
    const s = raw ? (JSON.parse(raw) as LockSettings) : null;
    return s && typeof s.hash === "string" && typeof s.salt === "string" ? s : null;
  } catch {
    return null;
  }
}

export function lockEnabled(): boolean {
  return isNativeApp() && lockSettings() !== null;
}

export function validPin(pin: string): boolean {
  return /^\d{4,8}$/.test(pin);
}

function hashPin(pin: string, salt: string): string {
  let h = salt + ":" + pin;
  for (let i = 0; i < ROUNDS; i++) h = sha256Hex(salt + h);
  return h;
}

function randomSalt(): string {
  const bytes = new Uint8Array(16);
  crypto.getRandomValues(bytes);
  return Array.from(bytes, (b) => b.toString(16).padStart(2, "0")).join("");
}

export function setPin(pin: string, biometric: boolean) {
  if (!validPin(pin)) throw new Error("PIN must be 4 to 8 digits");
  const salt = randomSalt();
  save({ salt, hash: hashPin(pin, salt), biometric });
}

export function checkPin(pin: string): boolean {
  const s = lockSettings();
  return !!s && hashPin(pin, s.salt) === s.hash;
}

export function setBiometric(on: boolean) {
  const s = lockSettings();
  if (s) save({ ...s, biometric: on });
}

export function clearLock() {
  kv.remove(KEY);
  window.dispatchEvent(new Event("futurejournal:change"));
}

function save(s: LockSettings) {
  kv.set(KEY, JSON.stringify(s));
  window.dispatchEvent(new Event("futurejournal:change"));
}

/** Whether this phone has fingerprint or face unlock set up. */
export async function biometricAvailable(): Promise<boolean> {
  if (!isNativeApp()) return false;
  try {
    const { BiometricAuth } = await import("@aparajita/capacitor-biometric-auth");
    const r = await BiometricAuth.checkBiometry();
    return r.isAvailable;
  } catch {
    return false;
  }
}

/** Ask for fingerprint or face. Resolves true on success, false otherwise. */
export async function biometricUnlock(): Promise<boolean> {
  try {
    const { BiometricAuth } = await import("@aparajita/capacitor-biometric-auth");
    await BiometricAuth.authenticate({
      reason: "Unlock your journal",
      cancelTitle: "Use PIN",
      androidTitle: "Unlock FutureJournal",
      androidSubtitle: "Use your fingerprint or face",
      allowDeviceCredential: false,
      androidConfirmationRequired: false,
    });
    return true;
  } catch {
    return false;
  }
}
