"use client";

import { cn } from "@/lib/cn";
import { haptics } from "@/lib/haptics";
import { sfx } from "@/lib/sound";
import type { DeckCategory } from "@/lib/types";

export const MIX_ID = "mix";

/**
 * Pack chooser shared by Heads Up, Imposter and Doodle Dash.
 * `categories` should already be filtered to the chosen difficulty tier.
 */
export function CategoryPicker({
  categories,
  value,
  onChange,
  allowMix = true,
}: {
  categories: DeckCategory[];
  value: string;
  onChange: (id: string) => void;
  allowMix?: boolean;
}) {
  const totalEntries = categories.reduce((sum, c) => sum + c.entries.length, 0);

  const tiles: { id: string; emoji: string; name: string; count: number }[] = [
    ...(allowMix
      ? [
          {
            id: MIX_ID,
            emoji: "🎲",
            name: "Everything",
            count: totalEntries,
          },
        ]
      : []),
    ...categories.map((c) => ({
      id: c.id,
      emoji: c.emoji,
      name: c.name,
      count: c.entries.length,
    })),
  ];

  return (
    <div className="grid grid-cols-2 gap-3">
      {tiles.map((tile) => {
        const selected = tile.id === value;
        return (
          <button
            key={tile.id}
            onClick={() => {
              haptics.tap();
              sfx.tap();
              onChange(tile.id);
            }}
            aria-pressed={selected}
            className={cn(
              "flex flex-col items-start gap-1 rounded-2xl border p-4 text-left transition active:scale-95",
              selected
                ? "border-fuchsia-400 bg-fuchsia-500/20"
                : "border-line bg-surface-2",
            )}
          >
            <span className="text-3xl">{tile.emoji}</span>
            <span className="font-semibold">{tile.name}</span>
            <span className="text-muted text-xs">{tile.count} cards</span>
          </button>
        );
      })}
    </div>
  );
}
