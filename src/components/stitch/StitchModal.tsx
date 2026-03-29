"use client";

import { useEffect } from "react";
import { Icon } from "@/components/stitch/Icon";

export function StitchModal({
  open,
  title,
  onClose,
  children,
}: {
  open: boolean;
  title: string;
  onClose: () => void;
  children: React.ReactNode;
}) {
  useEffect(() => {
    if (!open) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prev;
    };
  }, [open]);

  if (!open) return null;

  return (
    <div className="stitch-modal-root fixed inset-0 z-50 flex items-end justify-center sm:items-center">
      <button
        type="button"
        className="no-print absolute inset-0 bg-black/70"
        aria-label="Close"
        onClick={onClose}
      />
      <div className="stitch-modal-panel relative z-10 max-h-[85dvh] w-full max-w-lg overflow-y-auto rounded-t-2xl border border-stitch-border bg-stitch-bg p-4 shadow-2xl sm:rounded-2xl">
        <div className="no-print mb-4 flex items-center justify-between">
          <h2 className="text-lg font-bold text-stitch-fg">{title}</h2>
          <button
            type="button"
            onClick={onClose}
            className="rounded-full p-2 text-stitch-fg-muted hover:bg-stitch-surface"
          >
            <Icon name="close" />
          </button>
        </div>
        {children}
      </div>
    </div>
  );
}
