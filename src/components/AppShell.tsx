"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { kv, isNativeApp } from "@/lib/kv";
import { lockEnabled, lockSettings, RELOCK_AFTER_MS } from "@/lib/lock";
import { LockScreen } from "./LockScreen";

/**
 * Wraps every screen. On the website it renders nothing of its own. In the
 * apps it covers the screen until the journal has loaded from the phone's
 * storage, and shows the lock screen when the app lock is on (at start and
 * after a minute in the background).
 */
export function AppShell() {
  // "boot" renders a cover that CSS only shows inside the apps (html.fj-app),
  // so the website never flashes it.
  const [phase, setPhase] = useState<"boot" | "locked" | "open">("boot");
  const hiddenAt = useRef<number | null>(null);

  const decide = useCallback(() => setPhase(lockEnabled() ? "locked" : "open"), []);

  useEffect(() => {
    if (!isNativeApp()) {
      setPhase("open");
      return;
    }
    let live = true;
    kv.ready.then(() => live && decide());

    const onVis = () => {
      if (document.visibilityState === "hidden") {
        hiddenAt.current = Date.now();
      } else if (hiddenAt.current !== null) {
        const away = Date.now() - hiddenAt.current;
        hiddenAt.current = null;
        if (away >= RELOCK_AFTER_MS && lockSettings()) setPhase("locked");
      }
    };
    document.addEventListener("visibilitychange", onVis);
    return () => {
      live = false;
      document.removeEventListener("visibilitychange", onVis);
    };
  }, [decide]);

  if (phase === "open") return null;
  if (phase === "locked") return <LockScreen onUnlock={() => setPhase("open")} />;
  return <div className="fj-boot-cover fixed inset-0 z-50 bg-paper" aria-hidden />;
}
