"use client";

import { useEffect } from "react";
import { PlayerManager } from "@/components/PlayerManager";
import { Sheet } from "@/components/Sheet";
import { cn } from "@/lib/cn";
import { haptics } from "@/lib/haptics";
import { setSoundEnabled, sfx } from "@/lib/sound";
import { useAppState } from "@/lib/state";
import { TIERS } from "@/lib/types";

export function SettingsSheet({
  open,
  onClose,
}: {
  open: boolean;
  onClose: () => void;
}) {
  const { tier, setTier, soundOn, setSoundOn } = useAppState();

  // The synth module holds the mute flag in a plain variable, so mirror the
  // persisted setting into it whenever it changes.
  useEffect(() => setSoundEnabled(soundOn), [soundOn]);

  return (
    <Sheet open={open} title="Settings" onClose={onClose}>
      <div className="flex flex-col gap-7">
        <section>
          <h3 className="text-muted mb-3 text-sm font-semibold tracking-wide uppercase">
            Difficulty
          </h3>
          <div className="flex flex-col gap-2">
            {TIERS.map((option) => {
              const selected = option.id === tier;
              return (
                <button
                  key={option.id}
                  onClick={() => {
                    haptics.tap();
                    sfx.tap();
                    setTier(option.id);
                  }}
                  aria-pressed={selected}
                  className={cn(
                    "flex items-center gap-3 rounded-2xl border p-3 text-left transition active:scale-[0.98]",
                    selected
                      ? "border-fuchsia-400 bg-fuchsia-500/20"
                      : "border-line bg-surface-2",
                  )}
                >
                  <span className="text-2xl">{option.emoji}</span>
                  <span className="flex-1">
                    <span className="block font-semibold">{option.label}</span>
                    <span className="text-muted block text-xs">
                      {option.blurb}
                    </span>
                  </span>
                  {selected && <span className="text-fuchsia-300">✓</span>}
                </button>
              );
            })}
          </div>
        </section>

        <section>
          <h3 className="text-muted mb-3 text-sm font-semibold tracking-wide uppercase">
            Players
          </h3>
          <PlayerManager />
        </section>

        <section>
          <button
            onClick={() => {
              const next = !soundOn;
              setSoundOn(next);
              setSoundEnabled(next);
              haptics.tap();
              if (next) sfx.correct();
            }}
            className="bg-surface-2 border-line flex w-full items-center gap-3 rounded-2xl border p-4 text-left active:scale-[0.98]"
          >
            <span className="text-2xl">{soundOn ? "🔊" : "🔇"}</span>
            <span className="flex-1 font-semibold">Sound effects</span>
            <span
              className={cn(
                "relative h-7 w-12 rounded-full transition",
                soundOn ? "bg-fuchsia-500" : "bg-line",
              )}
            >
              <span
                className={cn(
                  "absolute top-1 size-5 rounded-full bg-white transition-all",
                  soundOn ? "left-6" : "left-1",
                )}
              />
            </span>
          </button>
        </section>
      </div>
    </Sheet>
  );
}
