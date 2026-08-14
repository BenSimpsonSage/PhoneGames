"use client";

import { cn } from "@/lib/cn";
import { colorOf, type Player } from "@/lib/state";

export function PlayerAvatar({
  player,
  size = 44,
  className,
}: {
  player: Player;
  size?: number;
  className?: string;
}) {
  return (
    <span
      className={cn(
        "flex shrink-0 items-center justify-center rounded-full font-bold text-black/75",
        className,
      )}
      style={{
        width: size,
        height: size,
        background: colorOf(player),
        fontSize: size * 0.42,
      }}
      aria-hidden
    >
      {player.name.slice(0, 1).toUpperCase()}
    </span>
  );
}
