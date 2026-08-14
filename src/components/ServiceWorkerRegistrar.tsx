"use client";

import { useEffect } from "react";

/**
 * Registers the offline worker. Renders nothing.
 *
 * Development is skipped deliberately — a service worker caching a dev build
 * makes local changes appear not to take effect, which is a miserable bug to
 * chase.
 */
export function ServiceWorkerRegistrar() {
  useEffect(() => {
    if (process.env.NODE_ENV !== "production") return;
    if (!("serviceWorker" in navigator)) return;

    const register = () => {
      navigator.serviceWorker.register("/sw.js").catch(() => {
        // Unsupported, blocked by settings, or running on http. The app works
        // fine without it, just not offline.
      });
    };

    // Wait for load so registration never competes with the first paint.
    if (document.readyState === "complete") {
      register();
    } else {
      window.addEventListener("load", register, { once: true });
      return () => window.removeEventListener("load", register);
    }
  }, []);

  return null;
}
