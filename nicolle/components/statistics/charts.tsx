"use client";

import type { LucideIcon } from "lucide-react";
import { useState } from "react";
import { SpatialCard } from "@/components/ui/spatial-card";
import { IconTile } from "@/components/ui/status";
import type { Tone } from "@/lib/tone";
import { cn } from "@/lib/utils";

/* ---------------- KPI ---------------- */

export function StatsCard({
  icon,
  label,
  value,
  hint,
  tone = "accent",
}: {
  icon: LucideIcon;
  label: string;
  value: number | string;
  hint?: string;
  tone?: Tone;
}) {
  return (
    <SpatialCard padding="sm" className="flex items-center gap-4 p-4 sm:p-5">
      <IconTile icon={icon} tone={tone} />
      <div className="min-w-0">
        <p className="text-xs font-medium text-ink-subtle">{label}</p>
        <p className="text-2xl font-semibold tracking-tight text-ink tabular">{value}</p>
        {hint && <p className="truncate text-xs text-ink-muted">{hint}</p>}
      </div>
    </SpatialCard>
  );
}

/* ---------------- Columnas: actividad por periodo ---------------- */

export interface ColumnDatum {
  label: string;
  /** Etiqueta larga para tooltip y tabla. */
  full: string;
  value: number;
}

/**
 * Serie única → un solo tono (accent), sin leyenda (el título la nombra).
 * Tooltip por columna con objetivo de hover más grande que la marca.
 */
export function ColumnChart({ data, unit = "eventos", height = 200 }: { data: ColumnDatum[]; unit?: string; height?: number }) {
  const [hover, setHover] = useState<number | null>(null);
  const max = Math.max(1, ...data.map((d) => d.value));
  const nice = Math.ceil(max / 4) * 4 || 4;
  const ticks = [0, nice / 2, nice];
  const labelEvery = Math.ceil(data.length / 8);

  return (
    <div className="relative" style={{ height }}>
      {/* Grid recesivo */}
      <div className="absolute inset-0 bottom-6 left-7 flex flex-col-reverse justify-between" aria-hidden>
        {ticks.map((t) => (
          <div key={t} className="relative border-t border-dashed border-white/[0.06]">
            <span className="absolute -left-7 -top-2 w-6 text-right text-[0.65rem] text-ink-subtle tabular">{t}</span>
          </div>
        ))}
      </div>
      <div className="absolute inset-0 bottom-6 left-7 flex items-end gap-[2px]" role="img" aria-label={`Gráfico de columnas: ${unit} por periodo`}>
        {data.map((d, i) => {
          const h = (d.value / nice) * 100;
          return (
            <div
              key={d.full}
              className="group relative flex h-full flex-1 items-end justify-center"
              onMouseEnter={() => setHover(i)}
              onMouseLeave={() => setHover(null)}
            >
              <div
                className={cn(
                  "w-full max-w-[22px] rounded-t-[4px] transition-all duration-500 ease-out",
                  hover === null || hover === i ? "bg-accent/85" : "bg-accent/35",
                )}
                style={{ height: `${Math.max(d.value ? 2 : 0, h)}%` }}
              />
              {hover === i && (
                <div className="pointer-events-none absolute bottom-full z-10 mb-2 whitespace-nowrap rounded-lg border border-line-strong bg-night/95 px-2.5 py-1.5 text-xs shadow-xl" style={{ bottom: `${h}%` }}>
                  <p className="text-ink-subtle">{d.full}</p>
                  <p className="font-semibold text-ink tabular">
                    {d.value} {unit}
                  </p>
                </div>
              )}
            </div>
          );
        })}
      </div>
      <div className="absolute inset-x-0 bottom-0 left-7 flex gap-[2px]" aria-hidden>
        {data.map((d, i) => (
          <span key={d.full} className="flex-1 truncate text-center text-[0.65rem] text-ink-subtle">
            {i % labelEvery === 0 ? d.label : ""}
          </span>
        ))}
      </div>
    </div>
  );
}

/* ---------------- Barras horizontales: eventos por sensor ---------------- */

export function BarList({ data, unit = "eventos" }: { data: Array<{ label: string; sub?: string; value: number; icon?: LucideIcon }>; unit?: string }) {
  const max = Math.max(1, ...data.map((d) => d.value));
  return (
    <ul className="flex flex-col gap-3.5">
      {data.map((d) => (
        <li key={d.label} className="group" title={`${d.label}: ${d.value} ${unit}`}>
          <div className="mb-1.5 flex items-center justify-between gap-3 text-sm">
            <span className="flex min-w-0 items-center gap-2 text-ink">
              {d.icon && <d.icon className="size-4 shrink-0 text-ink-subtle" aria-hidden />}
              <span className="truncate">{d.label}</span>
              {d.sub && <span className="hidden truncate text-xs text-ink-subtle sm:inline">{d.sub}</span>}
            </span>
            <span className="shrink-0 font-medium text-ink tabular">{d.value}</span>
          </div>
          <div className="h-2 rounded-full bg-white/[0.05]">
            <div
              className="h-full rounded-full bg-accent/80 transition-[width] duration-700 ease-out group-hover:bg-accent"
              style={{ width: `${(d.value / max) * 100}%` }}
            />
          </div>
        </li>
      ))}
    </ul>
  );
}

/* ---------------- Barra segmentada: alertas por severidad ---------------- */

/** Colores de estado reservados + etiqueta y valor siempre visibles (no depende solo del color). */
export function SegmentBar({ segments }: { segments: Array<{ label: string; value: number; className: string }> }) {
  const total = segments.reduce((a, s) => a + s.value, 0);
  return (
    <div>
      <div className="flex h-3 gap-[2px] overflow-hidden rounded-full bg-white/[0.05]" role="img" aria-label={segments.map((s) => `${s.label}: ${s.value}`).join(", ")}>
        {total > 0 &&
          segments
            .filter((s) => s.value > 0)
            .map((s) => <div key={s.label} className={cn("h-full first:rounded-l-full last:rounded-r-full", s.className)} style={{ width: `${(s.value / total) * 100}%` }} />)}
      </div>
      <ul className="mt-3 flex flex-wrap gap-x-5 gap-y-2 text-sm">
        {segments.map((s) => (
          <li key={s.label} className="flex items-center gap-2">
            <span className={cn("size-2.5 rounded-sm", s.className)} aria-hidden />
            <span className="text-ink-muted">{s.label}</span>
            <span className="font-medium text-ink tabular">{s.value}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}
