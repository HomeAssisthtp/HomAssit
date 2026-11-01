import type { EventKind, EventSeverity, SystemEvent } from "@/types";

export type DateRange = "today" | "7d" | "30d" | "custom" | "all";

export interface EventFilters {
  range: DateRange;
  from?: string; // yyyy-mm-dd
  to?: string; // yyyy-mm-dd
  sensorId: "all" | string;
  kind: "all" | EventKind;
  severity: "all" | EventSeverity;
}

export const DEFAULT_FILTERS: EventFilters = { range: "7d", sensorId: "all", kind: "all", severity: "all" };

function startOf(range: DateRange, now: number): number | null {
  const d = new Date(now);
  switch (range) {
    case "today":
      d.setHours(0, 0, 0, 0);
      return d.getTime();
    case "7d":
      return now - 7 * 86_400_000;
    case "30d":
      return now - 30 * 86_400_000;
    default:
      return null;
  }
}

/** Filtrado del historial por fecha, sensor, tipo y severidad (RF-17 / HU-14). */
export function applyEventFilters(events: SystemEvent[], f: EventFilters, now = Date.now()): SystemEvent[] {
  let from: number | null = startOf(f.range, now);
  let to: number | null = null;
  if (f.range === "custom") {
    from = f.from ? new Date(`${f.from}T00:00:00`).getTime() : null;
    to = f.to ? new Date(`${f.to}T23:59:59.999`).getTime() : null;
  }
  return events.filter((e) => {
    const t = new Date(e.occurredAt).getTime();
    if (from !== null && t < from) return false;
    if (to !== null && t > to) return false;
    if (f.sensorId !== "all" && e.sensorId !== f.sensorId) return false;
    if (f.kind !== "all" && e.kind !== f.kind) return false;
    if (f.severity !== "all" && e.severity !== f.severity) return false;
    return true;
  });
}

export function activeFilterCount(f: EventFilters) {
  return (
    (f.range !== DEFAULT_FILTERS.range ? 1 : 0) +
    (f.sensorId !== "all" ? 1 : 0) +
    (f.kind !== "all" ? 1 : 0) +
    (f.severity !== "all" ? 1 : 0)
  );
}
