"use client";

import { cn } from "@/lib/cn";

type Props = {
  /** 1 at the start of the round, 0 at the buzzer. */
  fraction: number;
  secondsLeft: number;
  size?: number;
  className?: string;
};

export function TimerRing({
  fraction,
  secondsLeft,
  size = 132,
  className,
}: Props) {
  const stroke = 10;
  const radius = (size - stroke) / 2;
  const circumference = 2 * Math.PI * radius;
  const clamped = Math.min(1, Math.max(0, fraction));

  // Warm through amber into red so the pressure is readable at a glance,
  // without relying on the number for players who can't read yet.
  const colour =
    secondsLeft <= 5 ? "#fb7185" : secondsLeft <= 15 ? "#fbbf24" : "#34d399";

  return (
    <div
      className={cn("relative shrink-0", className)}
      style={{ width: size, height: size }}
      role="timer"
      aria-live="off"
      aria-label={`${secondsLeft} seconds left`}
    >
      <svg width={size} height={size} className="-rotate-90">
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke="rgba(255,255,255,0.09)"
          strokeWidth={stroke}
        />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke={colour}
          strokeWidth={stroke}
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={circumference * (1 - clamped)}
        />
      </svg>
      <div className="absolute inset-0 flex items-center justify-center">
        <span
          className={cn(
            "tabular font-bold",
            secondsLeft <= 5 && "animate-pulse text-rose-400",
          )}
          style={{ fontSize: size * 0.34 }}
        >
          {secondsLeft}
        </span>
      </div>
    </div>
  );
}
