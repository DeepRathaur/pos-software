import { Icon } from "@/components/stitch/Icon";
import { cn } from "@/lib/cn";

export function AuthInput({
  icon,
  label,
  type = "text",
  value,
  onChange,
  placeholder,
  autoComplete,
  minLength,
  required,
  className,
}: {
  icon: string;
  label: string;
  type?: string;
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  autoComplete?: string;
  minLength?: number;
  required?: boolean;
  className?: string;
}) {
  return (
    <div className={cn("space-y-2", className)}>
      <label className="ml-1 text-sm font-medium text-stitch-fg-secondary">{label}</label>
      <div className="relative">
        <Icon
          name={icon}
          className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-xl text-stitch-fg-muted"
        />
        <input
          className="w-full rounded-xl border border-stitch-primary/20 bg-stitch-bg/50 py-3.5 pl-12 pr-4 text-base text-stitch-fg outline-none transition placeholder:text-stitch-fg-muted focus:border-stitch-primary focus:ring-2 focus:ring-stitch-primary/50"
          type={type}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder}
          autoComplete={autoComplete}
          minLength={minLength}
          required={required}
        />
      </div>
    </div>
  );
}
