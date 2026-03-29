import { cn } from "@/lib/cn";

/** Mobile-first column; matches stitch max-width patterns */
export function Screen({
  children,
  className,
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "mx-auto w-full max-w-lg px-4 pb-[calc(6rem+env(safe-area-inset-bottom,0px))] pt-4",
        className
      )}
    >
      {children}
    </div>
  );
}
