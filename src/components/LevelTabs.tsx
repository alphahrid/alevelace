import { FILTER_OPTIONS, type LevelFilter } from "@/lib/levels";
import { cn } from "@/lib/utils";

export function LevelTabs({
  value,
  onChange,
  className,
  compact,
}: {
  value: LevelFilter;
  onChange: (v: LevelFilter) => void;
  className?: string;
  compact?: boolean;
}) {
  return (
    <div className={cn("inline-flex rounded-lg border bg-muted/40 p-1", className)}>
      {FILTER_OPTIONS.map((o) => (
        <button
          key={o.value}
          type="button"
          onClick={() => onChange(o.value)}
          className={cn(
            "rounded-md px-3 py-1.5 text-xs font-medium transition",
            value === o.value ? "bg-background shadow-sm text-foreground" : "text-muted-foreground hover:text-foreground"
          )}
        >
          {compact ? o.short : o.label}
        </button>
      ))}
    </div>
  );
}
