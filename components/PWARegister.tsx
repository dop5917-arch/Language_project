"use client";

import { useEffect } from "react";

export default function PWARegister() {
  useEffect(() => {
    if (typeof window === "undefined") return;
    if (!("serviceWorker" in navigator)) return;

    const register = async () => {
      try {
        // Keep development predictable: disable SW locally to avoid stale route cache.
        if (process.env.NODE_ENV !== "production") {
          const regs = await navigator.serviceWorker.getRegistrations();
          await Promise.all(regs.map((reg) => reg.unregister()));
          return;
        }
        await navigator.serviceWorker.register("/sw.js");
      } catch {
        // Silent fail; app works without PWA features.
      }
    };

    register();
  }, []);

  return null;
}
