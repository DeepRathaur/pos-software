"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { AuthInput } from "@/components/auth/AuthInput";
import { Icon } from "@/components/stitch/Icon";
import { useAuthStore } from "@/stores/auth-store";
import { apiFetch } from "@/lib/api-client";

export default function LoginPage() {
  const router = useRouter();
  const hydrated = useAuthStore((s) => s.hydrated);
  const token = useAuthStore((s) => s.token);
  const setSession = useAuthStore((s) => s.setSession);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [remember, setRemember] = useState(true);
  const [err, setErr] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!hydrated) return;
    if (token) router.replace("/dashboard");
  }, [hydrated, token, router]);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setErr(null);
    setBusy(true);
    try {
      const data = await apiFetch<{ token: string; user: { id: string; email: string; name: string } }>(
        "/api/auth/login",
        { method: "POST", body: JSON.stringify({ email, password }), token: null }
      );
      setSession(data.token, data.user);
      router.replace("/dashboard");
    } catch (e) {
      setErr(e instanceof Error ? e.message : "Login failed");
    } finally {
      setBusy(false);
    }
  }

  if (!hydrated) {
    return (
      <div className="relative z-10 flex min-h-dvh items-center justify-center text-sm text-slate-500">
        Loading…
      </div>
    );
  }
  if (token) return null;

  return (
    <div className="relative z-10 flex min-h-dvh flex-col items-center justify-center p-4">
      <div className="w-full max-w-[440px]">
        <div className="mb-8 flex flex-col items-center">
          <div className="mb-4 rounded-2xl border border-stitch-primary/20 bg-stitch-primary/10 p-3">
            <Icon name="point_of_sale" className="text-4xl text-stitch-primary" />
          </div>
          <h2 className="text-2xl font-bold tracking-tight text-white">POS Premium</h2>
          <p className="mt-2 text-slate-400">Manage your business from anywhere</p>
        </div>

        <div className="auth-glass auth-glow rounded-2xl p-8 shadow-2xl">
          <div className="mb-6">
            <h1 className="mb-1 text-2xl font-bold text-white">Welcome back</h1>
            <p className="text-sm text-slate-400">Please enter your details to sign in.</p>
          </div>

          <form onSubmit={onSubmit} className="space-y-5">
            <AuthInput
              icon="mail"
              label="Email"
              type="email"
              value={email}
              onChange={setEmail}
              placeholder="name@company.com"
              autoComplete="email"
              required
            />
            <div className="space-y-2">
              <div className="ml-1 flex items-center justify-between">
                <label className="text-sm font-medium text-slate-200">Password</label>
                <Link
                  href="/forgot-password"
                  className="text-xs font-semibold text-stitch-primary hover:text-stitch-primary/80"
                >
                  Forgot password?
                </Link>
              </div>
              <div className="relative">
                <Icon
                  name="lock"
                  className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-xl text-slate-400"
                />
                <input
                  className="w-full rounded-xl border border-stitch-primary/20 bg-stitch-bg/50 py-3.5 pl-12 pr-4 text-base text-white outline-none transition placeholder:text-slate-500 focus:border-stitch-primary focus:ring-2 focus:ring-stitch-primary/50"
                  type="password"
                  autoComplete="current-password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  required
                />
              </div>
            </div>

            <div className="flex items-center space-x-2 px-1">
              <input
                id="remember"
                type="checkbox"
                checked={remember}
                onChange={(e) => setRemember(e.target.checked)}
                className="h-4 w-4 rounded border-stitch-primary/30 bg-transparent text-stitch-primary focus:ring-stitch-primary"
              />
              <label htmlFor="remember" className="text-sm text-slate-400">
                Keep me logged in
              </label>
            </div>

            {err ? <p className="text-sm text-rose-400">{err}</p> : null}

            <button
              type="submit"
              disabled={busy}
              className="flex w-full items-center justify-center gap-2 rounded-xl bg-stitch-primary py-4 text-base font-semibold text-white shadow-lg shadow-stitch-primary/20 transition active:scale-[0.98] disabled:opacity-40"
            >
              {busy ? "Signing in…" : "Sign in"}
              <Icon name="arrow_forward" className="text-xl" />
            </button>
          </form>

          <div className="relative my-8">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-stitch-primary/10" />
            </div>
            <div className="relative flex justify-center text-xs uppercase">
              <span className="bg-[#211115] px-2 text-slate-500">Quick access</span>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <button
              type="button"
              className="flex items-center justify-center gap-2 rounded-lg border border-stitch-primary/20 py-2.5 text-sm font-medium text-slate-300 transition hover:bg-stitch-primary/5"
              disabled
              title="Available in native app"
            >
              <Icon name="fingerprint" className="text-lg" />
              Biometric
            </button>
            <button
              type="button"
              className="flex items-center justify-center gap-2 rounded-lg border border-stitch-primary/20 py-2.5 text-sm font-medium text-slate-300 transition hover:bg-stitch-primary/5"
              disabled
              title="Available in native app"
            >
              <Icon name="qr_code_scanner" className="text-lg" />
              QR code
            </button>
          </div>
        </div>

        <p className="mt-8 text-center text-slate-400">
          Don&apos;t have an account?{" "}
          <Link href="/register" className="ml-1 font-bold text-stitch-primary hover:underline">
            Register business
          </Link>
        </p>
      </div>

      <div className="pointer-events-none fixed bottom-6 left-1/2 flex -translate-x-1/2 items-center gap-6 text-[10px] font-medium uppercase tracking-widest text-slate-500 opacity-50">
        <span className="flex items-center gap-1.5">
          <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
          System online
        </span>
        <span>POS Studio</span>
      </div>
    </div>
  );
}
