"use client";

import { useEffect, useState } from "react";
import { biometricUnlock, checkPin, lockSettings } from "@/lib/lock";

const KEYS = ["1", "2", "3", "4", "5", "6", "7", "8", "9", "bio", "0", "del"] as const;

export function LockScreen({ onUnlock }: { onUnlock: () => void }) {
  const [pin, setPin] = useState("");
  const [error, setError] = useState(false);
  const bio = !!lockSettings()?.biometric;

  async function tryBio() {
    if (await biometricUnlock()) onUnlock();
  }

  // Offer fingerprint or face straight away when it's turned on.
  useEffect(() => {
    if (bio) void tryBio();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function press(k: (typeof KEYS)[number]) {
    setError(false);
    if (k === "bio") return void tryBio();
    if (k === "del") return setPin((p) => p.slice(0, -1));
    const next = (pin + k).slice(0, 8);
    setPin(next);
    if (next.length >= 4 && checkPin(next)) {
      onUnlock();
    } else if (next.length === 8) {
      setError(true);
      setPin("");
    }
  }

  function submit() {
    if (checkPin(pin)) onUnlock();
    else {
      setError(true);
      setPin("");
    }
  }

  return (
    <div className="sky fixed inset-0 z-50 flex flex-col items-center justify-center px-6" role="dialog" aria-label="Unlock FutureJournal">
      <p className="text-sm font-medium text-dawn">FutureJournal</p>
      <h1 className="mt-1 font-serif text-2xl font-semibold text-ink">Enter your PIN</h1>
      <div className="mt-6 flex h-4 gap-3" aria-live="polite">
        {Array.from({ length: Math.max(4, pin.length) }, (_, i) => (
          <span key={i} className={`h-3 w-3 rounded-full ${i < pin.length ? "bg-plum" : "border border-muted"}`} />
        ))}
      </div>
      <p className="mt-3 h-5 text-sm text-dawn">{error ? "That PIN didn’t match." : ""}</p>
      <div className="mt-4 grid w-full max-w-xs grid-cols-3 gap-3">
        {KEYS.map((k) =>
          k === "bio" ? (
            bio ? (
              <button key={k} onClick={() => press(k)} className="rounded-2xl py-4 text-sm font-semibold text-plum" aria-label="Use fingerprint or face">
                Fingerprint
              </button>
            ) : (
              <span key={k} />
            )
          ) : (
            <button
              key={k}
              onClick={() => press(k)}
              className={`rounded-2xl py-4 text-xl font-semibold ${k === "del" ? "text-muted" : "border border-line bg-card text-ink shadow-sm"}`}
              aria-label={k === "del" ? "Delete" : k}
            >
              {k === "del" ? "⌫" : k}
            </button>
          ),
        )}
      </div>
      {pin.length >= 4 && (
        <button onClick={submit} className="mt-5 rounded-xl bg-ink px-8 py-3 text-sm font-semibold text-paper">
          Unlock
        </button>
      )}
    </div>
  );
}
