import type { LucideIcon } from "lucide-react";
import type { ReactNode } from "react";
import { TONE_BG_SOFT, TONE_BORDER, TONE_DOT, TONE_TEXT, type Tone } from "@/lib/tone";
import { cn } from "@/lib/utils";

/** Punto de estado. `pulse` = señal viva (dispositivo conectado, emergencia). */
export function StatusDot({ tone, pulse, className }: { tone: Tone; pulse?: boolean; className?: string }) {
  return (
    <span className={cn("relative inline-flex size-2.5 shrink-0", className)} aria-hidden>
      {pulse && <span className={cn("absolute inset-0 rounded-full animate-pulse-ring", TONE_DOT[tone])} />}
      <span className={cn("relative inline-flex size-full rounded-full", TONE_DOT[tone])} />
    </span>
  );
}

/**
 * Etiqueta de estado. Siempre combina color + texto (+ icono opcional) para no
 * depender solo del color (accesibilidad).
 */
export function StatusBadge({
  tone,
  children,
  icon: Icon,
  dot,
  pulse,
  className,
}: {
  tone: Tone;
  children: ReactNode;
  icon?: LucideIcon;
  dot?: boolean;
  pulse?: boolean;
  className?: string;
}) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs font-medium leading-none",
        TONE_BG_SOFT[tone],
        TONE_BORDER[tone],
        TONE_TEXT[tone],
        className,
      )}
    >
      {dot && <StatusDot tone={tone} pulse={pulse} className="size-1.5" />}
      {Icon && <Icon className="size-3.5" aria-hidden />}
      {children}
    </span>
  );
}

/** Contenedor de icono con tinte de estado. */
export function IconTile({ icon: Icon, tone, className }: { icon: LucideIcon; tone: Tone; className?: string }) {
  return (
    <span
      className={cn(
        "inline-flex size-11 shrink-0 items-center justify-center rounded-2xl border",
        TONE_BG_SOFT[tone],
        TONE_BORDER[tone],
        TONE_TEXT[tone],
        className,
      )}
      aria-hidden
    >
      <Icon className="size-5" />
    </span>
  );
}
