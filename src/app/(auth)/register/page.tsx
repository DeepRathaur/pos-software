"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
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
      <div className="flex min-h-dvh items-center justify-center text-sm text-zinc-500">Loading…</div>
    );
  }
  if (token) return null;

  return (
    <div className="mx-auto flex min-h-dvh max-w-md flex-col justify-center px-4 py-10">
      <div className="rounded-3xl border border-zinc-800 bg-zinc-900/60 p-6 shadow-xl">
        <h1 className="text-xl font-semibold text-zinc-50">Create account</h1>
        <p className="mt-1 text-sm text-zinc-500">Set up your operator profile in seconds.</p>
        <form onSubmit={onSubmit} className="mt-6 space-y-4">
          <label className="block text-sm text-zinc-400">
            Name
            <input
              className="mt-1 w-full rounded-xl border border-zinc-700 bg-zinc-950 px-3 py-3 text-base text-zinc-50"
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
            />
          </label>
          <label className="block text-sm text-zinc-400">
            Email
            <input
              className="mt-1 w-full rounded-xl border border-zinc-700 bg-zinc-950 px-3 py-3 text-base text-zinc-50"
              type="email"
              autoComplete="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />
          </label>
          <label className="block text-sm text-zinc-400">
            Password (min 8)
            <input
              className="mt-1 w-full rounded-xl border border-zinc-700 bg-zinc-950 px-3 py-3 text-base text-zinc-50"
              type="password"
              autoComplete="new-password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              minLength={8}
              required
            />
          </label>
          {err ? <p className="text-sm text-rose-400">{err}</p> : null}
          <button
            type="submit"
            disabled={busy}
            className="flex min-h-[52px] w-full items-center justify-center rounded-2xl bg-emerald-500 text-base font-semibold text-emerald-950 disabled:opacity-40"
          >
            {busy ? "Creating…" : "Create account"}
          </button>
        </form>
        <p className="mt-4 text-center text-sm text-zinc-500">
          Already have access?{" "}
          <Link className="text-emerald-400" href="/login">
            Sign in
          </Link>
        </p>
      </div>
    </div>
  );
}
