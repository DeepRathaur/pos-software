"use client";

import { useRouter } from "next/navigation";
import { useQueryClient } from "@tanstack/react-query";
import { Icon } from "@/components/stitch/Icon";
import { cn } from "@/lib/cn";
import { useAuthStore } from "@/stores/auth-store";
import { useBusinessStore } from "@/stores/business-store";
import { useCartStore } from "@/stores/cart-store";

function logout() {
  useCartStore.getState().clear();
  useBusinessStore.getState().setBusinesses([]);
  useAuthStore.getState().clear();
}

export function LogoutButton({
  variant = "full",
  className,
}: {
  variant?: "full" | "icon";
  className?: string;
}) {
  const router = useRouter();
  const qc = useQueryClient();

  function onLogout() {
    qc.clear();
    logout();
    router.replace("/login");
  }

  if (variant === "icon") {
    return (
      <button
        type="button"
        onClick={onLogout}
        className={cn(
          "rounded-full p-2 text-stitch-fg-muted transition hover:bg-stitch-surface hover:text-stitch-primary",
          className
        )}
        aria-label="Log out"
      >
        <Icon name="logout" className="text-[22px]" />
      </button>
    );
  }

  return (
    <button
      type="button"
      className={cn(
        "min-h-[48px] w-full rounded-xl border border-stitch-border text-sm font-medium text-stitch-fg-secondary transition hover:border-stitch-primary/40 hover:bg-stitch-primary/5",
        className
      )}
      onClick={onLogout}
    >
      Log out
    </button>
  );
}
