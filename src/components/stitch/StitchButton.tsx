import { cn } from "@/lib/cn";

export function StitchButton({
  children,
  variant = "primary",
  className,
  ...props
}: React.ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: "primary" | "secondary" | "ghost";
}) {
  return (
    <button
      type="button"
      className={cn(
        "inline-flex min-h-[48px] items-center justify-center rounded-xl px-4 text-sm font-semibold transition active:scale-[0.99]",
        variant === "primary" && "bg-stitch-primary text-white shadow-lg shadow-stitch-primary/25",
        variant === "secondary" &&
          "border border-stitch-border bg-stitch-surface text-stitch-fg-secondary hover:bg-stitch-card",
        variant === "ghost" && "text-stitch-fg-muted hover:bg-stitch-surface hover:text-stitch-fg",
        className
      )}
      {...props}
    >
      {children}
    </button>
  );
}
