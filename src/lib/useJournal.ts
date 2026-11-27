"use client";

import { useCallback, useEffect, useState } from "react";
import { store } from "./store";
import { maybeSeedDemo } from "./demo";
import type { Entry } from "./types";

/** Live list of entries; re-reads when any tab or component saves. */
export function useEntries(): { entries: Entry[]; ready: boolean } {
  const [entries, setEntries] = useState<Entry[]>([]);
  const [ready, setReady] = useState(false);

  const load = useCallback(() => {
    setEntries(store.all());
    setReady(true);
  }, []);

  useEffect(() => {
    maybeSeedDemo();
    load();
    const onStorage = (e: StorageEvent) => {
      if (!e.key || e.key.startsWith("futurejournal")) load();
    };
    window.addEventListener("futurejournal:change", load);
    window.addEventListener("storage", onStorage);
    return () => {
      window.removeEventListener("futurejournal:change", load);
      window.removeEventListener("storage", onStorage);
    };
  }, [load]);

  return { entries, ready };
}

/** Re-render when the journaling day rolls over (checks once a minute). */
export function useNow(): Date {
  const [now, setNow] = useState(() => new Date());
  useEffect(() => {
    const id = window.setInterval(() => setNow(new Date()), 60_000);
    const onVis = () => document.visibilityState === "visible" && setNow(new Date());
    document.addEventListener("visibilitychange", onVis);
    return () => {
      window.clearInterval(id);
      document.removeEventListener("visibilitychange", onVis);
    };
  }, []);
  return now;
}

/** Once the page has content, scroll to the #section named in the address. */
export function useScrollToHash(ready: boolean) {
  useEffect(() => {
    if (!ready || !window.location.hash) return;
    const id = decodeURIComponent(window.location.hash.slice(1));
    const t = window.setTimeout(() => {
      document.getElementById(id)?.scrollIntoView({ behavior: "smooth", block: "start" });
    }, 150);
    return () => window.clearTimeout(t);
  }, [ready]);
}
