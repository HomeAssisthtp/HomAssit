import type { HomeSnapshot } from "@/types";

export type StatsPeriod = "24h" | "7d" | "30d";

const HOUR = 3_600_000;
const DAY = 24 * HOUR;

/** Estadísticas derivadas de los datos almacenados (HU-16). */
export function computeStats(s: HomeSnapshot, period: StatsPeriod, now = Date.now()) {
  const span = period === "24h" ? DAY : period === "7d" ? 7 * DAY : 30 * DAY;
  const from = now - span;
  const events = s.events.filter((e) => new Date(e.occurredAt).getTime() >= from);
  const alerts = s.alerts.filter((a) => new Date(a.createdAt).getTime() >= from);

  // Buckets: por hora en 24 h, por día en 7/30 d.
  const bucketMs = period === "24h" ? HOUR : DAY;
  const count = period === "24h" ? 24 : period === "7d" ? 7 : 30;
  const end = new Date(now);
  if (period === "24h") end.setMinutes(0, 0, 0);
  else end.setHours(0, 0, 0, 0);
  const firstStart = end.getTime() - (count - 1) * bucketMs;
  const buckets = Array.from({ length: count }, (_, i) => {
    const start = firstStart + i * bucketMs;
    const d = new Date(start);
    return {
      start,
      label: period === "24h" ? `${String(d.getHours()).padStart(2, "0")}h` : period === "7d" ? d.toLocaleDateString("es-MX", { weekday: "short" }) : String(d.getDate()),
      full:
        period === "24h"
          ? `${d.toLocaleDateString("es-MX", { day: "numeric", month: "short" })}, ${String(d.getHours()).padStart(2, "0")}:00`
          : d.toLocaleDateString("es-MX", { weekday: "long", day: "numeric", month: "short" }),
      value: 0,
    };
  });
  for (const e of events) {
    const idx = Math.floor((new Date(e.occurredAt).getTime() - firstStart) / bucketMs);
    if (idx >= 0 && idx < count) buckets[idx].value++;
  }

  const bySensor = s.sensors
    .map((sensor) => ({
      sensor,
      room: s.rooms.find((r) => r.id === sensor.roomId)?.name,
      value: events.filter((e) => e.sensorId === sensor.id).length,
    }))
    .filter((x) => x.value > 0)
    .sort((a, b) => b.value - a.value);
  const deviceEvents = events.filter((e) => !e.sensorId).length;

  const attended = alerts.filter((a) => a.status === "attended");
  const avgResponseMin = attended.length
    ? Math.round(
        attended.reduce((acc, a) => acc + (new Date(a.attendedAt!).getTime() - new Date(a.createdAt).getTime()), 0) / attended.length / 60_000,
      )
    : null;

  return {
    totalEvents: events.length,
    totalAlerts: alerts.length,
    attended: attended.length,
    pending: alerts.length - attended.length,
    avgResponseMin,
    bySeverity: {
      info: alerts.filter((a) => a.severity === "info").length,
      warning: alerts.filter((a) => a.severity === "warning").length,
      emergency: alerts.filter((a) => a.severity === "emergency").length,
    },
    buckets,
    bySensor,
    deviceEvents,
  };
}
