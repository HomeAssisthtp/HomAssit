"use client";

import type { LucideIcon } from "lucide-react";
import type { ReactNode } from "react";
import { SpatialCard } from "@/components/ui/spatial-card";
import { IconTile, StatusBadge } from "@/components/ui/status";
import { useNow } from "@/hooks/use-now";
import { formatRelative } from "@/lib/format";
import type { Tone } from "@/lib/tone";
import { cn } from "@/lib/utils";

export interface SensorCardProps {
  icon: LucideIcon;
  title: string;
  location?: string;
  tone: Tone;
  stateLabel: string;
  value: ReactNode;
  /** Clave que cambia cuando el valor cambia → dispara una transición breve. */
  valueKey?: string | number;
  caption?: ReactNode;
  updatedAt?: string;
  /** Indicador visual propio del sensor (sparkline, gauge, radar…). */
  indicator?: ReactNode;
  className?: string;
}

/**
 * Card base de sensor. Todas las variantes comparten estructura:
 * icono · nombre · ubicación · estado · valor · indicador · última actualización.
 */
export function SensorCard({
  icon,
  title,
  location,
  tone,
  stateLabel,
  value,
  valueKey,
  caption,
  updatedAt,
  indicator,
  className,
}: SensorCardProps) {
  const now = useNow();
  return (
    <SpatialCard as="article" aria-label={`${title}: ${stateLabel}`} className={cn("flex flex-col gap-4", className)}>
      <div className="flex items-start justify-between gap-3 transform-3d pop-1">
        <div className="flex min-w-0 items-center gap-3 transform-3d">
          <IconTile icon={icon} tone={tone} className="pop-2" />
          <div className="min-w-0">
            <h3 className="truncate text-sm font-semibold text-ink">{title}</h3>
            {location && <p className="truncate text-xs text-ink-subtle">{location}</p>}
          </div>
        </div>
        <StatusBadge tone={tone} dot pulse={tone === "danger"}>
          {stateLabel}
        </StatusBadge>
      </div>

      <div className="flex flex-1 items-end justify-between gap-4 transform-3d pop-2">
        <div className="min-w-0">
          <div key={valueKey} className="animate-value text-2xl font-semibold tracking-tight text-ink tabular sm:text-[1.7rem]">
            {value}
          </div>
          {caption && <div className="mt-1 text-sm text-ink-muted">{caption}</div>}
        </div>
        {indicator && <div className="shrink-0 pop-2">{indicator}</div>}
      </div>

      {updatedAt && (
        <p className="border-t border-line pt-3 text-xs text-ink-subtle">
          Actualizado <time dateTime={updatedAt}>{formatRelative(updatedAt, now)}</time>
        </p>
      )}
    </SpatialCard>
  );
}
