import type { HomeSnapshot, HomeStatusLevel } from "@/types";
import { sensorState } from "./sensor-meta";

export interface HomeStatusSummary {
  level: HomeStatusLevel;
  title: string;
  subtitle: string;
  pendingAlerts: number;
  pendingEmergencies: number;
  temperature?: number;
  doorsOpen: number;
  gasAbnormal: boolean;
  lastUpdate?: string;
}

/**
 * Responde "¿qué está pasando en mi casa ahora mismo?" con un único nivel.
 * Prioridad: emergencia > desconexión > advertencia > segura.
 */
export function summarizeHome(s: HomeSnapshot): HomeStatusSummary {
  const online = s.device?.status === "connected";
  const pending = s.alerts.filter((a) => a.status === "pending");
  const emergencies = pending.filter((a) => a.severity === "emergency");
  const temps = s.sensors.filter((x) => x.type === "temperature" && x.enabled && x.lastReading);
  const temperature = temps.length
    ? temps.reduce((acc, t) => acc + (t.lastReading?.value ?? 0), 0) / temps.length
    : undefined;
  const doorsOpen = s.sensors.filter((x) => x.type === "door" && x.lastReading?.value === 1).length;
  const gasAbnormal = s.sensors.some((x) => x.type === "gas" && sensorState(x, s.settings, online) === "alert");
  const warnings =
    pending.length > 0 ||
    doorsOpen > 0 ||
    s.sensors.some((x) => {
      const st = sensorState(x, s.settings, online);
      return st === "warning" || st === "alert";
    });

  const base = {
    pendingAlerts: pending.length,
    pendingEmergencies: emergencies.length,
    temperature,
    doorsOpen,
    gasAbnormal,
    lastUpdate: s.device?.lastSyncAt,
  };

  if (!s.device) {
    return { ...base, level: "offline", title: "Sin dispositivo", subtitle: "Registra tu ESP32 para comenzar a monitorear" };
  }
  if (!s.device.connectedOnce) {
    return { ...base, lastUpdate: undefined, level: "offline", title: "Esperando al ESP32", subtitle: "Enciéndelo y conéctalo a Wi-Fi para recibir su primer reporte" };
  }
  if (emergencies.length > 0) {
    return {
      ...base,
      level: "emergency",
      title: "Emergencia activa",
      subtitle: emergencies[0].title,
    };
  }
  if (!online) {
    return { ...base, level: "offline", title: "Dispositivo desconectado", subtitle: "No se reciben datos del hogar" };
  }
  if (warnings) {
    const reason = gasAbnormal
      ? "Nivel de humo o gas elevado"
      : doorsOpen > 0
        ? doorsOpen === 1
          ? "Hay una puerta abierta"
          : `Hay ${doorsOpen} puertas abiertas`
        : pending.length > 0
          ? `${pending.length} ${pending.length === 1 ? "alerta pendiente" : "alertas pendientes"}`
          : "Un sensor requiere atención";
    return { ...base, level: "warning", title: "Requiere atención", subtitle: reason };
  }
  return { ...base, level: "secure", title: "Casa segura", subtitle: "Todo funciona con normalidad" };
}
