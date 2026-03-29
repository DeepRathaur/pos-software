"use client";

import Link from "next/link";

export function ModuleFallback({
  title,
  description,
}: {
  title: string;
  description?: string;
}) {
  return (
    <div className="mx-auto max-w-md space-y-4 px-4 py-10 text-center">
      <h1 className="text-lg font-semibold text-stitch-fg">{title}</h1>
      {description ? <p className="text-sm text-stitch-fg-muted">{description}</p> : null}
      <Link
        href="/dashboard"
        className="inline-flex min-h-[48px] items-center justify-center rounded-2xl bg-stitch-primary px-6 text-sm font-semibold text-white shadow-lg shadow-stitch-primary/25"
      >
        Back to home
      </Link>
    </div>
  );
}
