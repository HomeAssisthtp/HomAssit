import { z } from "zod";
import type { AlertSeverity, EventKind, SystemSettings } from "@/types";

/**
 * Contrato ESP32 → servidor (RF-19) y reglas que convierten lecturas en
 * eventos/alertas (RF-09, RF-10, RF-12). Función pura: la usa el endpoint
 * ahora y la usará la implementación con Supabase después.
 */

export const DEVICE_UID_RE = /^HA-ESP32-[A-Z0-9]{4}$/;

export const ingestPayloadSchema = z.object({
  deviceUid: z.string().regex(DEVICE_UID_RE, "deviceUid inválido (HA-ESP32-XXXX)"),
  firmware: z.string().max(20).optional(),
  rssi: z.number().int().min(-120).max(0).optional(),
  ip: z.string().max(45).optional(),
  uptimeMs: z.number().int().nonnegative().optional(),
  readings: z
    .array(
      z.object({
        hardwareId: z.string().min(1).max(40),
        type: z.enum(["temperature", "gas"]),
        value: z.number().finite(),
      }),
    )
    .max(32)
    .default([]),
  events: z
    .array(
      z.object({
        hardwareId: z.string().min(1).max(40),
        kind: z.enum(["motion_detected", "door_opened", "door_closed", "sos_pressed"]),
      }),
    )
    .max(32)
    .default([]),
});

export type IngestPayload = z.infer<typeof ingestPayloadSchema>;

export interface DerivedEvent {
  hardwareId: string;
  kind: EventKind;
  severity: AlertSeverity;
  description: string;
  value?: number;
  /** Si la regla genera una alerta, su título. */
  alertTitle?: string;
}

export interface IngestResult {
  events: DerivedEvent[];
  commands: {
    /** El ESP32 activa el buzzer local (RF-12 / módulo IoT). */
    buzzer: boolean;
    /** Intervalo sugerido para el siguiente envío. */
    intervalMs: number;
  };
}

const DESCRIPTION: Record<IngestPayload["events"][number]["kind"], string> = {
  motion_detected: "Movimiento detectado",
  door_opened: "Se abrió una puerta",
  door_closed: "Se cerró una puerta",
  sos_pressed: "Botón SOS activado",
};

/**
 * @param thresholds umbrales por sensor (hardwareId → valor); si falta, se usan los generales.
 */
export function evaluateIngest(
  payload: IngestPayload,
  settings: Pick<SystemSettings, "temperatureMax" | "gasThresholdPpm" | "buzzerEnabled">,
  thresholds: Record<string, number | undefined> = {},
): IngestResult {
  const events: DerivedEvent[] = [];

  for (const r of payload.readings) {
    if (r.type === "temperature") {
      const max = thresholds[r.hardwareId] ?? settings.temperatureMax;
      if (r.value >= max) {
        events.push({
          hardwareId: r.hardwareId,
          kind: "temperature_threshold",
          severity: "warning",
          description: `Temperatura de ${r.value} °C (umbral ${max} °C)`,
          value: r.value,
          alertTitle: "Temperatura elevada",
        });
      }
    } else if (r.type === "gas") {
      const max = thresholds[r.hardwareId] ?? settings.gasThresholdPpm;
      if (r.value >= max) {
        events.push({
          hardwareId: r.hardwareId,
          kind: "gas_threshold",
          severity: "emergency",
          description: `Nivel de humo/gas de ${Math.round(r.value)} ppm (umbral ${max} ppm)`,
          value: r.value,
          alertTitle: "Humo o gas detectado",
        });
      }
    }
  }

  for (const e of payload.events) {
    const sos = e.kind === "sos_pressed";
    events.push({
      hardwareId: e.hardwareId,
      kind: e.kind,
      severity: sos ? "emergency" : "info",
      description: DESCRIPTION[e.kind],
      value: e.kind === "door_opened" || sos ? 1 : e.kind === "door_closed" ? 0 : undefined,
      alertTitle: sos ? "Botón SOS activado" : undefined,
    });
  }

  const critical = events.some((e) => e.severity === "emergency");
  return {
    events,
    commands: {
      buzzer: settings.buzzerEnabled && critical,
      // Ante una emergencia, el ESP32 reporta más seguido.
      intervalMs: critical ? 2000 : 5000,
    },
  };
}
