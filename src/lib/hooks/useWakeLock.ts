"use client";

import { useEffect, useRef } from "react";

/**
 * Holds the screen awake while `active` is true.
 *
 * Rounds involve a lot of talking and not much tapping, and a phone that
 * sleeps mid-game kills the round. Unsupported on older iOS, where this
 * quietly does nothing.
 */
export function useWakeLock(active: boolean) {
  const sentinelRef = useRef<WakeLockSentinel | null>(null);

  useEffect(() => {
    if (!active) return;
    if (typeof navigator === "undefined" || !("wakeLock" in navigator)) return;

    let cancelled = false;

    const acquire = async () => {
      try {
        const sentinel = await navigator.wakeLock.request("screen");
        if (cancelled) {
          void sentinel.release();
          return;
        }
        sentinelRef.current = sentinel;
      } catch {
        // Denied, low battery, or not user-activated. Not worth surfacing.
      }
    };

    // The browser drops the lock whenever the tab is hidden, so take it again
    // when the player comes back from a notification or the lock screen.
    const onVisibility = () => {
      if (document.visibilityState === "visible") void acquire();
    };

    void acquire();
    document.addEventListener("visibilitychange", onVisibility);

    return () => {
      cancelled = true;
      document.removeEventListener("visibilitychange", onVisibility);
      void sentinelRef.current?.release().catch(() => {});
      sentinelRef.current = null;
    };
  }, [active]);
}
