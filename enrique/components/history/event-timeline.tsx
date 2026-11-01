"use client";

import { MapPin } from "lucide-react";
import { formatDayLabel, formatTime, isSameDay } from "@/lib/format";
import { EVENT_KIND_META } from "@/lib/sensor-meta";
import { severityTone, TONE_BG_SOFT, TONE_BORDER, TONE_TEXT } from "@/lib/tone";
import { cn } from "@/lib/utils";
import type { Room, Sensor, SystemEvent } from "@/types";

/**
 * Línea de tiempo de eventos agrupada por día.
 * Se usa en el dashboard (actividad reciente) y en el historial (vista timeline).
 */
export function EventTimeline({
  events,
  rooms,
  sensors,
  groupByDay = true,
  className,
}: {
  events: SystemEvent[];
  rooms: Room[];
  sensors: Sensor[];
  groupByDay?: boolean;
  className?: string;
}) {
  const groups: Array<{ day: string; items: SystemEvent[] }> = [];
  for (const e of events) {
    const g = groups[groups.length - 1];
    if (groupByDay && g && isSameDay(g.day, e.occurredAt)) g.items.push(e);
    else if (!groupByDay && g) g.items.push(e);
    else groups.push({ day: e.occurredAt, items: [e] });
  }
  const roomName = (id?: string) => rooms.find((r) => r.id === id)?.name;
  const sensorName = (id?: string) => sensors.find((s) => s.id === id)?.name;
  const today = new Date().toISOString();

  return (
    <div className={cn("flex flex-col gap-6", className)}>
      {groups.map((g) => (
        <section key={g.day} aria-label={groupByDay ? formatDayLabel(g.day) : "Eventos recientes"}>
          {groupByDay && (
            <h3 className="sticky top-20 z-[1] mb-3 inline-flex rounded-full glass-subtle px-3 py-1 text-xs font-medium text-ink-muted backdrop-blur-md">
              {isSameDay(g.day, today) ? "Hoy" : formatDayLabel(g.day)}
            </h3>
          )}
          <ol className="relative flex flex-col">
            {g.items.map((e, i) => {
              const meta = EVENT_KIND_META[e.kind];
              const tone = severityTone(e.severity);
              const last = i === g.items.length - 1;
              return (
                <li key={e.id} className="relative flex gap-3.5 pb-4 last:pb-0">
                  {!last && <span className="absolute left-[17px] top-9 bottom-0 w-px bg-gradient-to-b from-line-strong to-transparent" aria-hidden />}
                  <span
                    className={cn(
                      "relative z-[1] inline-flex size-9 shrink-0 items-center justify-center rounded-xl border",
                      e.severity === "info" ? "border-line bg-white/5 text-ink-muted" : cn(TONE_BG_SOFT[tone], TONE_BORDER[tone], TONE_TEXT[tone]),
                    )}
                    aria-hidden
                  >
                    <meta.icon className="size-4" />
                  </span>
                  <div className="min-w-0 flex-1 pt-0.5">
                    <div className="flex items-baseline justify-between gap-3">
                      <p className={cn("text-sm font-medium", e.severity === "emergency" ? "text-danger" : "text-ink")}>{meta.label}</p>
                      <time dateTime={e.occurredAt} className="shrink-0 text-xs text-ink-subtle tabular">
                        {formatTime(e.occurredAt)}
                      </time>
                    </div>
                    <p className="mt-0.5 text-sm text-ink-muted">{e.description}</p>
                    {(e.roomId || e.sensorId) && (
                      <p className="mt-1 flex items-center gap-1 text-xs text-ink-subtle">
                        <MapPin className="size-3" aria-hidden />
                        {[roomName(e.roomId), sensorName(e.sensorId)].filter(Boolean).join(" · ")}
                      </p>
                    )}
                  </div>
                </li>
              );
            })}
          </ol>
        </section>
      ))}
    </div>
  );
}
