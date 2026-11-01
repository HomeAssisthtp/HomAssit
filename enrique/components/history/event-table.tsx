"use client";

import { StatusBadge } from "@/components/ui/status";
import { formatDate, formatTime } from "@/lib/format";
import { EVENT_KIND_META, SEVERITY_LABEL } from "@/lib/sensor-meta";
import { severityTone } from "@/lib/tone";
import type { Alert, Room, Sensor, SystemEvent } from "@/types";

/** Vista tabular del historial: densa y escaneable para escritorio. */
export function EventTable({
  events,
  rooms,
  sensors,
  alerts,
}: {
  events: SystemEvent[];
  rooms: Room[];
  sensors: Sensor[];
  alerts: Alert[];
}) {
  const roomName = (id?: string) => rooms.find((r) => r.id === id)?.name ?? "—";
  const sensorName = (id?: string) => sensors.find((s) => s.id === id)?.name ?? "Dispositivo";
  const alertOf = (id: string) => alerts.find((a) => a.eventId === id);

  return (
    <div className="overflow-x-auto">
      <table className="w-full min-w-[720px] text-left text-sm">
        <caption className="sr-only">Historial de eventos</caption>
        <thead>
          <tr className="border-b border-line text-xs uppercase tracking-wider text-ink-subtle">
            <th scope="col" className="px-4 py-3 font-medium">Fecha</th>
            <th scope="col" className="px-4 py-3 font-medium">Hora</th>
            <th scope="col" className="px-4 py-3 font-medium">Evento</th>
            <th scope="col" className="px-4 py-3 font-medium">Sensor</th>
            <th scope="col" className="px-4 py-3 font-medium">Ubicación</th>
            <th scope="col" className="px-4 py-3 font-medium">Tipo</th>
            <th scope="col" className="px-4 py-3 font-medium">Estado</th>
          </tr>
        </thead>
        <tbody>
          {events.map((e) => {
            const meta = EVENT_KIND_META[e.kind];
            const alert = alertOf(e.id);
            return (
              <tr key={e.id} className="border-b border-line/60 transition-colors hover:bg-white/[0.03]">
                <td className="whitespace-nowrap px-4 py-3 text-ink-muted tabular">{formatDate(e.occurredAt)}</td>
                <td className="whitespace-nowrap px-4 py-3 text-ink tabular">{formatTime(e.occurredAt)}</td>
                <td className="px-4 py-3">
                  <span className="flex items-center gap-2 text-ink">
                    <meta.icon className="size-4 text-ink-subtle" aria-hidden />
                    {meta.label}
                  </span>
                </td>
                <td className="px-4 py-3 text-ink-muted">{sensorName(e.sensorId)}</td>
                <td className="px-4 py-3 text-ink-muted">{roomName(e.roomId)}</td>
                <td className="px-4 py-3">
                  <StatusBadge tone={severityTone(e.severity)}>{SEVERITY_LABEL[e.severity]}</StatusBadge>
                </td>
                <td className="px-4 py-3">
                  {alert ? (
                    <StatusBadge tone={alert.status === "pending" ? "warn" : "ok"}>
                      {alert.status === "pending" ? "Alerta pendiente" : "Alerta atendida"}
                    </StatusBadge>
                  ) : (
                    <span className="text-xs text-ink-subtle">Registrado</span>
                  )}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
