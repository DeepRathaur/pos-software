"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { AuthInput } from "@/components/auth/AuthInput";
import { Icon } from "@/components/stitch/Icon";
import { useAuthStore } from "@/stores/auth-store";
import { apiFetch } from "@/lib/api-client";

export default function RegisterPage() {
  const router = useRouter();
  const hydrated = useAuthStore((s) => s.hydrated);
  const token = useAuthStore((s) => s.token);
  const setSession = useAuthStore((s) => s.setSession);
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPw, setShowPw] = useState(false);
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
        "/api/auth/register",
        { method: "POST", body: JSON.stringify({ name, email, password }), token: null }
      );
      setSession(data.token, data.user);
      router.replace("/settings");
    } catch (e) {
      setErr(e instanceof Error ? e.message : "Registration failed");
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
    <div className="relative z-10 flex min-h-dvh flex-col overflow-x-hidden">
      <header className="sticky top-0 z-20 flex items-center justify-between bg-transparent p-4">
        <Link
          href="/login"
          className="flex size-10 items-center justify-center rounded-full text-slate-100 transition hover:bg-stitch-primary/10"
          aria-label="Back to login"
        >
          <Icon name="arrow_back" />
        </Link>
        <div className="flex items-center gap-2">
          <div className="flex size-8 items-center justify-center rounded-lg bg-stitch-primary">
            <Icon name="point_of_sale" className="text-xl text-white" />
          </div>
          <span className="font-bold tracking-tight text-white">
            POS<span className="text-stitch-primary">PRO</span>
          </span>
        </div>
        <div className="size-10" aria-hidden />
      </header>

      <main className="flex flex-1 flex-col items-center justify-center px-4 py-8">
        <div className="w-full max-w-md">
          <div className="mb-8 text-center">
            <h1 className="text-3xl font-bold leading-tight tracking-tight text-white">
              Create your account
            </h1>
            <p className="mt-2 text-base font-normal text-slate-400">
              Join businesses managing growth with POS Pro — then add your store in Setup.
            </p>
          </div>

          <div className="auth-glass rounded-xl p-6 shadow-2xl">
            <form onSubmit={onSubmit} className="space-y-5">
              <AuthInput
                icon="person"
                label="Owner name"
                value={name}
                onChange={setName}
                placeholder="Full name"
                autoComplete="name"
                required
              />
              <AuthInput
                icon="mail"
                label="Business email"
                type="email"
                value={email}
                onChange={setEmail}
                placeholder="name@business.com"
                autoComplete="email"
                required
              />
              <div className="space-y-2">
                <label className="px-1 text-sm font-medium text-slate-300">Password (min 8)</label>
                <div className="relative">
                  <Icon
                    name="lock"
                    className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-xl text-slate-500"
                  />
                  <input
                    className="w-full rounded-lg border border-stitch-primary/20 bg-stitch-bg/50 py-3.5 pl-11 pr-11 text-white outline-none transition placeholder:text-slate-600 focus:ring-2 focus:ring-stitch-primary"
                    type={showPw ? "text" : "password"}
                    autoComplete="new-password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="••••••••"
                    minLength={8}
                    required
                  />
                  <button
                    type="button"
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 hover:text-stitch-primary"
                    onClick={() => setShowPw((s) => !s)}
                    aria-label={showPw ? "Hide password" : "Show password"}
                  >
                    <Icon name={showPw ? "visibility_off" : "visibility"} />
                  </button>
                </div>
              </div>

              {err ? <p className="text-sm text-rose-400">{err}</p> : null}

              <div className="pt-4">
                <button
                  type="submit"
                  disabled={busy}
                  className="w-full rounded-xl bg-stitch-primary py-4 text-base font-bold text-white shadow-lg shadow-stitch-primary/20 transition active:scale-[0.98] disabled:opacity-40"
                >
                  {busy ? "Creating…" : "Create account"}
                </button>
              </div>
            </form>

            <div className="mt-6 flex items-center justify-center gap-2 text-sm">
              <span className="text-slate-400">Already have a business?</span>
              <Link href="/login" className="font-semibold text-stitch-primary hover:underline">
                Sign in
              </Link>
            </div>
          </div>

          <p className="mt-8 px-4 text-center text-xs leading-relaxed text-slate-500">
            By creating an account you agree to our{" "}
            <a className="underline" href="#">
              Terms of Service
            </a>{" "}
            and{" "}
            <a className="underline" href="#">
              Privacy Policy
            </a>
            .
          </p>
        </div>
      </main>
    </div>
  );
}
