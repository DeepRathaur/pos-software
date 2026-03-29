"use client";

import { useState } from "react";
import Link from "next/link";
import { Icon } from "@/components/stitch/Icon";

/**
 * UI matches stitch/forgot_password_step_1.
 * Wire POST /api/auth/forgot-password when backend exists.
 */
export default function ForgotPasswordPage() {
  const [email, setEmail] = useState("");
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setMsg(null);
    setBusy(true);
    await new Promise((r) => setTimeout(r, 600));
    setBusy(false);
    setMsg(
      "If an account exists for that email, password reset instructions will be sent when this feature is enabled."
    );
  }

  return (
    <div className="relative z-10 flex min-h-dvh flex-col bg-stitch-bg">
      <div className="flex items-center justify-between p-4 pb-2">
        <Link
          href="/login"
          className="flex size-12 shrink-0 items-center justify-center rounded-full text-stitch-fg transition hover:bg-stitch-primary/10"
          aria-label="Back to login"
        >
          <Icon name="arrow_back" className="text-[24px]" />
        </Link>
      </div>

      <div className="mx-auto flex w-full max-w-[480px] flex-1 flex-col justify-center px-6">
        <div className="mb-8">
          <div className="mb-6 flex h-16 w-16 items-center justify-center rounded-2xl bg-stitch-primary/10">
            <Icon name="lock_reset" className="text-[32px] text-stitch-primary" />
          </div>
          <h1 className="pb-3 text-[32px] font-bold leading-tight tracking-tight text-stitch-fg">
            Forgot password?
          </h1>
          <p className="text-base font-normal leading-relaxed text-stitch-fg-muted">
            Enter your email address and we&apos;ll send you a link to reset your password and get you back to
            your POS dashboard.
          </p>
        </div>

        <form className="space-y-6" onSubmit={onSubmit}>
          <div>
            <label className="mb-2 block text-sm font-semibold uppercase tracking-wide text-stitch-fg-secondary">
              Email address
            </label>
            <div className="relative">
              <div className="absolute left-4 top-1/2 -translate-y-1/2 text-stitch-fg-muted transition group-focus-within:text-stitch-primary">
                <Icon name="mail" />
              </div>
              <input
                className="form-input h-14 w-full rounded-xl border border-stitch-primary/20 bg-stitch-primary/5 pl-12 pr-4 text-base text-stitch-fg outline-none transition placeholder:text-stitch-fg-muted focus:border-stitch-primary focus:ring-2 focus:ring-stitch-primary/50"
                type="email"
                placeholder="name@company.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                autoComplete="email"
              />
            </div>
          </div>

          {msg ? (
            <p className="rounded-xl border border-stitch-primary/20 bg-stitch-primary/10 p-3 text-sm text-stitch-fg-secondary">
              {msg}
            </p>
          ) : null}

          <div className="pt-2">
            <button
              type="submit"
              disabled={busy}
              className="flex h-14 w-full cursor-pointer items-center justify-center rounded-xl bg-stitch-primary px-5 text-base font-bold tracking-wide text-white shadow-lg shadow-stitch-primary/20 transition hover:bg-stitch-primary/90 active:scale-[0.98] disabled:opacity-40"
            >
              <span className="truncate">{busy ? "Sending…" : "Send reset link"}</span>
            </button>
          </div>
        </form>

        <div className="mt-12 text-center">
          <p className="text-sm text-stitch-fg-muted">
            Remember your password?{" "}
            <Link href="/login" className="ml-1 font-bold text-stitch-primary hover:underline">
              Log in
            </Link>
          </p>
        </div>
      </div>

      <div className="pointer-events-none flex justify-center p-8 opacity-20 grayscale">
        <div className="flex items-center gap-2">
          <Icon name="point_of_sale" className="text-stitch-primary" />
          <span className="text-xl font-bold tracking-tighter text-stitch-fg">PREMIUM POS</span>
        </div>
      </div>
    </div>
  );
}
