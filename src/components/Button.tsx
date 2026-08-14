"use client";

import type { ButtonHTMLAttributes, ReactNode } from "react";
import { cn } from "@/lib/cn";
import { haptics } from "@/lib/haptics";
import { sfx } from "@/lib/sound";

type Variant = "primary" | "solid" | "ghost" | "danger";
type Size = "lg" | "md" | "sm";

const VARIANTS: Record<Variant, string> = {
  primary:
    "bg-gradient-to-br from-violet-500 to-fuchsia-600 text-white shadow-lg shadow-fuchsia-900/40",
  solid: "bg-surface-2 text-cream border border-line",
  ghost: "bg-transparent text-muted border border-line",
  danger: "bg-rose-500/15 text-rose-300 border border-rose-500/40",
};

const SIZES: Record<Size, string> = {
  lg: "min-h-16 px-7 text-xl rounded-tile",
  md: "min-h-13 px-5 text-lg rounded-2xl",
  sm: "min-h-10 px-4 text-base rounded-xl",
};

type Props = ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: Variant;
  size?: Size;
  block?: boolean;
  children: ReactNode;
};

export function Button({
  variant = "primary",
  size = "lg",
  block = false,
  className,
  onClick,
  children,
  ...rest
}: Props) {
  return (
    <button
      {...rest}
      onClick={(event) => {
        haptics.tap();
        sfx.tap();
        onClick?.(event);
      }}
      className={cn(
        "inline-flex items-center justify-center gap-2 font-semibold",
        "transition-transform duration-100 active:scale-95",
        "disabled:pointer-events-none disabled:opacity-40",
        // Focus ring only for keyboard users — it looks like a bug on touch.
        "focus-visible:ring-4 focus-visible:ring-fuchsia-400/50 focus-visible:outline-none",
        VARIANTS[variant],
        SIZES[size],
        block && "w-full",
        className,
      )}
    >
      {children}
    </button>
  );
}
