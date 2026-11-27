"use client";

import { useEffect } from "react";
import { isNativeApp } from "@/lib/kv";

export function RegisterSW() {
  useEffect(() => {
    if ("serviceWorker" in navigator && process.env.NODE_ENV === "production" && !isNativeApp()) {
      navigator.serviceWorker.register("/sw.js").catch(() => {});
    }
  }, []);
  return null;
}
