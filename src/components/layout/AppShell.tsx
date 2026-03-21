"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const links = [
  { href: "/dashboard", label: "Home" },
  { href: "/pos", label: "POS" },
  { href: "/products", label: "Items" },
  { href: "/inventory", label: "Stock" },
  { href: "/customers", label: "People" },
  { href: "/reports", label: "Stats" },
  { href: "/settings", label: "Setup" },
];

export function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  return (
    <div className="flex min-h-dvh flex-col bg-zinc-950 text-zinc-50">
      <main className="flex-1 pb-24">{children}</main>
      <nav
        className="fixed bottom-0 left-0 right-0 z-40 border-t border-zinc-800 bg-zinc-950/95 backdrop-blur"
        aria-label="Primary"
      >
        <ul className="mx-auto flex max-w-lg items-stretch justify-between gap-1 px-2 py-2">
          {links.map((l) => {
            const active = pathname === l.href || pathname.startsWith(l.href + "/");
            return (
              <li key={l.href} className="flex-1">
                <Link
                  href={l.href}
                  className={`flex min-h-[48px] flex-col items-center justify-center rounded-xl px-1 text-[11px] font-medium ${
                    active ? "bg-emerald-500/15 text-emerald-300" : "text-zinc-400 hover:text-zinc-200"
                  }`}
                >
                  <span>{l.label}</span>
                </Link>
              </li>
            );
          })}
        </ul>
      </nav>
    </div>
  );
}
