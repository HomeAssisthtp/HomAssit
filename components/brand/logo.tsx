import { cn } from "@/lib/utils";

export function LogoMark({ className }: { className?: string }) {
  return (
    <span
      className={cn(
        "relative inline-flex size-9 items-center justify-center rounded-xl border border-accent/30 bg-gradient-to-br from-accent/25 to-electric/15 shadow-[0_0_24px_-6px_rgb(79_209_232/0.6),inset_0_1px_0_rgb(255_255_255/0.2)]",
        className,
      )}
      aria-hidden
    >
      <svg viewBox="0 0 24 24" className="size-5" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
        <path d="M4 10.5 12 4l8 6.5V19a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1z" className="text-ink" />
        <path d="M9.5 15.2a3.5 3.5 0 0 1 5 0" className="text-accent" />
        <circle cx="12" cy="17.3" r="0.9" fill="currentColor" className="text-accent" />
      </svg>
    </span>
  );
}

export function Logo({ className, compact }: { className?: string; compact?: boolean }) {
  return (
    <span className={cn("inline-flex items-center gap-2.5", className)}>
      <LogoMark />
      {!compact && (
        <span className="text-[1.05rem] font-semibold tracking-tight text-ink">
          Home<span className="text-accent">Assist</span>
        </span>
      )}
    </span>
  );
}
