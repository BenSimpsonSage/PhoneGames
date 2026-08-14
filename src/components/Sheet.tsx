"use client";

import { useEffect, type ReactNode } from "react";

/**
 * Bottom sheet. Slides up from the thumb end of the phone rather than
 * appearing as a centred dialog, which is unreachable one-handed.
 */
export function Sheet({
  open,
  title,
  onClose,
  children,
}: {
  open: boolean;
  title: string;
  onClose: () => void;
  children: ReactNode;
}) {
  // Stop the page behind the sheet from scrolling under the user's finger.
  useEffect(() => {
    if (!open) return;
    const previous = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = previous;
    };
  }, [open]);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex flex-col justify-end">
      <button
        aria-label="Close"
        onClick={onClose}
        className="absolute inset-0 bg-black/65 backdrop-blur-sm"
      />
      <div
        role="dialog"
        aria-modal="true"
        aria-label={title}
        className="bg-surface border-line animate-rise relative max-h-[85dvh] overflow-y-auto rounded-t-[2rem] border-t px-5 pt-3 pb-[max(1.5rem,env(safe-area-inset-bottom))]"
      >
        <div className="bg-line mx-auto mb-4 h-1.5 w-12 rounded-full" />
        <div className="mb-4 flex items-center justify-between gap-4">
          <h2 className="text-xl font-semibold">{title}</h2>
          <button
            onClick={onClose}
            className="bg-surface-2 border-line text-muted flex size-9 items-center justify-center rounded-full border active:scale-95"
            aria-label="Close"
          >
            ✕
          </button>
        </div>
        {children}
      </div>
    </div>
  );
}
