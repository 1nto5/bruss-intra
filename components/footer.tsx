import { cn } from "@/lib/utils/cn";

export default function Footer() {
  return (
    <footer
      className={cn(
        // Industrial footer: panel styling matching header
        "w-full transition-all",
        "bg-[var(--panel-bg)] border-t border-[var(--panel-border)]",
        "shadow-[0_-1px_3px_oklch(0.2_0.02_260/0.08)]",
        "px-4 py-3",
      )}
    >
      <div className="mx-auto flex h-6 w-full items-center justify-end">
        <span className="text-muted-foreground text-xs font-medium tracking-wide">
          A. Antosiak 2026
        </span>
      </div>
    </footer>
  );
}
