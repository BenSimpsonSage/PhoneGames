"use client";

import {
  useIsHydrated,
  usePersistentState,
} from "@/lib/hooks/usePersistentState";

/**
 * Nudges iOS users through "Add to Home Screen", which is the only way to get
 * a real app icon and a fullscreen launch on an iPhone — and the whole point
 * of the app feeling like *hers* rather than like a website.
 *
 * Android/Chrome gets its own install prompt from the browser, so this stays
 * out of the way there.
 */
export function InstallHint() {
  const [dismissed, setDismissed] = usePersistentState(
    "partybox.installHint.dismissed.v1",
    false,
  );
  const hydrated = useIsHydrated();

  // Safe to sniff the browser during render because this only runs once
  // `hydrated` is true, which never happens on the server or during the
  // hydrating render — so there's no HTML for it to disagree with.
  const shouldShow =
    hydrated &&
    /iphone|ipad|ipod/i.test(window.navigator.userAgent) &&
    !window.matchMedia("(display-mode: standalone)").matches &&
    // iOS exposes its own flag rather than the standard display-mode.
    (window.navigator as unknown as { standalone?: boolean }).standalone !==
      true;

  if (!shouldShow || dismissed) return null;

  return (
    <div className="border-line bg-surface-2 mt-4 flex items-start gap-3 rounded-2xl border p-4">
      <span className="text-2xl">📲</span>
      <p className="text-muted flex-1 text-sm leading-relaxed">
        Tap <span className="text-cream font-semibold">Share</span> then{" "}
        <span className="text-cream font-semibold">Add to Home Screen</span> to
        keep this on your phone like a real app.
      </p>
      <button
        onClick={() => setDismissed(true)}
        aria-label="Dismiss"
        className="text-muted -mt-1 -mr-1 flex size-8 items-center justify-center rounded-full"
      >
        ✕
      </button>
    </div>
  );
}
