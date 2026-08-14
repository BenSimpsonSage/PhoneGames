"use client";

import Link from "next/link";
import type { ReactNode } from "react";
import { cn } from "@/lib/cn";
import { haptics } from "@/lib/haptics";

type Props = {
  title: string;
  /** Shown under the title — usually the current round or pack. */
  subtitle?: string;
  /** Overrides the default "back to the home screen" behaviour. */
  onBack?: () => void;
  /** Hide the whole header for full-bleed screens like a live round. */
  bare?: boolean;
  className?: string;
  children: ReactNode;
};

export function GameShell({
  title,
  subtitle,
  onBack,
  bare = false,
  className,
  children,
}: Props) {
  return (
    <main className={cn("screen-h flex flex-col overflow-hidden", className)}>
      {!bare && (
        <header className="safe-top safe-x flex shrink-0 items-center gap-3 pb-3">
          {onBack ? (
            <button
              onClick={() => {
                haptics.tap();
                onBack();
              }}
              aria-label="Back"
              className="bg-surface-2 border-line text-cream flex size-11 shrink-0 items-center justify-center rounded-full border text-xl active:scale-95"
            >
              ‹
            </button>
          ) : (
            <Link
              href="/"
              aria-label="Back to games"
              onClick={() => haptics.tap()}
              className="bg-surface-2 border-line text-cream flex size-11 shrink-0 items-center justify-center rounded-full border text-xl active:scale-95"
            >
              ‹
            </Link>
          )}
          <div className="min-w-0 flex-1">
            <h1 className="truncate text-lg font-semibold">{title}</h1>
            {subtitle && (
              <p className="text-muted truncate text-sm">{subtitle}</p>
            )}
          </div>
        </header>
      )}
      {children}
    </main>
  );
}
