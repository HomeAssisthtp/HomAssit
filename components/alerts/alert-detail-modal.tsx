"use client";

import { Check } from "lucide-react";
import { GlassButton } from "@/components/ui/glass-button";
import { GlassModal } from "@/components/ui/glass-modal";
import { StatusBadge } from "@/components/ui/status";
import { formatDateTime } from "@/lib/format";
import { SEVERITY_LABEL, SENSOR_TYPE_META } from "@/lib/sensor-meta";
import { severityTone } from "@/lib/tone";
import type { Alert, HomeSnapshot } from "@/types";
import { SEVERITY_ICON, STATUS_META } from "./alert-meta";

/** Detalle de una alerta (HU-12: "el usuario deberá poder acceder al detalle"). */
export function AlertDetailModal({
  alert,
  snapshot,
  onClose,
  onAttend,
  canAttend,
  attending,
}: {
  alert: Alert | null;
  snapshot: HomeSnapshot;
  onClose: () => void;
  onAttend: (a: Alert) => void;
  canAttend: boolean;
  attending: boolean;
}) {
  // Siempre mostrar la versión viva de la alerta (puede cambiar mientras está abierta).
  const live = alert ? snapshot.alerts.find((a) => a.id === alert.id) ?? alert : null;
  if (!live) return null;

  const sensor = snapshot.sensors.find((s) => s.id === live.sensorId);
  const room = snapshot.rooms.find((r) => r.id === live.roomId);
  const event = snapshot.events.find((e) => e.id === live.eventId);
  const tone = severityTone(live.severity);
  const Icon = SEVERITY_ICON[live.severity];
  const status = STATUS_META[live.status];
  const pending = live.status === "pending";

  const rows: Array<[string, React.ReactNode]> = [
    ["Tipo", SEVERITY_LABEL[live.severity]],
    ["Fecha y hora", formatDateTime(live.createdAt)],
    ["Ubicación", room?.name ?? "General"],
    ["Origen", sensor ? `${sensor.name} (${SENSOR_TYPE_META[sensor.type].hardware})` : "Dispositivo ESP32"],
    ["Dispositivo", snapshot.device?.deviceUid ?? "—"],
  ];
  if (event?.value !== undefined && sensor && (sensor.type === "gas" || sensor.type === "temperature")) {
    rows.push(["Lectura", sensor.type === "gas" ? `${event.value} ppm` : `${event.value} °C`]);
  }
  if (!pending && live.attendedAt) {
    rows.push(["Atendida", `${formatDateTime(live.attendedAt)}${live.attendedBy ? ` · ${live.attendedBy}` : ""}`]);
  }

  return (
    <GlassModal
      open={!!alert}
      onOpenChange={(o) => !o && onClose()}
      title={
        <span className="flex items-center gap-2.5">
          <Icon className={`size-5 ${tone === "danger" ? "text-danger" : tone === "warn" ? "text-warn" : "text-accent"}`} aria-hidden />
          {live.title}
        </span>
      }
      description={live.message}
      footer={
        <>
          <GlassButton variant="ghost" onClick={onClose}>
            Cerrar
          </GlassButton>
          {pending && canAttend && (
            <GlassButton variant={live.severity === "emergency" ? "danger" : "primary"} loading={attending} onClick={() => onAttend(live)}>
              {!attending && <Check aria-hidden />} Marcar como atendida
            </GlassButton>
          )}
        </>
      }
    >
      <div className="mb-4 flex flex-wrap gap-2">
        <StatusBadge tone={tone}>{SEVERITY_LABEL[live.severity]}</StatusBadge>
        <StatusBadge tone={pending ? (live.severity === "emergency" ? "danger" : "warn") : "ok"} icon={status.icon}>
          {status.label}
        </StatusBadge>
      </div>
      <dl className="divide-y divide-line rounded-xl glass-subtle">
        {rows.map(([k, v]) => (
          <div key={k} className="flex items-start justify-between gap-4 px-4 py-3 text-sm">
            <dt className="text-ink-subtle">{k}</dt>
            <dd className="text-right font-medium text-ink">{v}</dd>
          </div>
        ))}
      </dl>
      {pending && !canAttend && (
        <p className="mt-4 text-xs text-ink-subtle">Tu cuenta puede consultar esta alerta, pero no marcarla como atendida.</p>
      )}
    </GlassModal>
  );
}
