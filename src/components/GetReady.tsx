"use client";

import { useEffect, useState } from "react";
import { haptics } from "@/lib/haptics";
import { sfx } from "@/lib/sound";

/**
 * The 3-2-1 before a round starts. Without it, a timed round begins while the
 * phone is still being handed over and the first few seconds are wasted.
 */
export function GetReady({
  from = 3,
  label,
  onDone,
}: {
  from?: number;
  label?: string;
  onDone: () => void;
}) {
  const [count, setCount] = useState(from);

  useEffect(() => {
    if (count <= 0) {
      onDone();
      return;
    }
    haptics.tap();
    sfx.tick();
    const id = window.setTimeout(() => setCount((c) => c - 1), 800);
    return () => window.clearTimeout(id);
    // `onDone` is intentionally excluded: callers pass inline arrows, and
    // re-running this effect on every render would restart the countdown.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [count]);

  return (
    <div className="flex flex-1 flex-col items-center justify-center gap-6">
      {label && (
        <p className="text-muted px-8 text-center text-xl">{label}</p>
      )}
      <div className="relative flex items-center justify-center">
        <span className="animate-pulse-ring absolute size-40 rounded-full bg-fuchsia-500/30" />
        <span
          key={count}
          className="animate-pop text-[7rem] leading-none font-bold"
        >
          {count > 0 ? count : "Go!"}
        </span>
      </div>
    </div>
  );
}
