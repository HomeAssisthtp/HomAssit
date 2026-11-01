"use client";

import { RotateCcw } from "lucide-react";
import { Field, Input, Segmented, Select } from "@/components/ui/form";
import { GlassButton } from "@/components/ui/glass-button";
import { activeFilterCount, DEFAULT_FILTERS, type DateRange, type EventFilters } from "@/lib/event-filters";
import { EVENT_KIND_META, SEVERITY_LABEL } from "@/lib/sensor-meta";
import type { EventKind, EventSeverity, Room, Sensor } from "@/types";

/** Filtros del historial: fecha, sensor, tipo de evento y severidad (HU-14). */
export function EventFiltersBar({
  value,
  onChange,
  sensors,
  rooms,
  ranges = ["today", "7d", "30d", "custom"],
}: {
  value: EventFilters;
  onChange: (f: EventFilters) => void;
  sensors: Sensor[];
  rooms: Room[];
  ranges?: DateRange[];
}) {
  const set = <K extends keyof EventFilters>(k: K, v: EventFilters[K]) => onChange({ ...value, [k]: v });
  const count = activeFilterCount(value);
  const RANGE_LABEL: Record<DateRange, string> = { today: "Hoy", "7d": "7 días", "30d": "30 días", custom: "Personalizado", all: "Todo" };

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <Segmented
          label="Periodo"
          value={value.range}
          onChange={(r) => set("range", r)}
          options={ranges.map((r) => ({ value: r, label: RANGE_LABEL[r] }))}
          className="max-w-full overflow-x-auto"
        />
        {count > 0 && (
          <GlassButton size="sm" variant="ghost" onClick={() => onChange(DEFAULT_FILTERS)}>
            <RotateCcw aria-hidden /> Limpiar filtros ({count})
          </GlassButton>
        )}
      </div>

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {value.range === "custom" && (
          <>
            <Field label="Desde">{(p) => <Input type="date" {...p} value={value.from ?? ""} max={value.to} onChange={(e) => set("from", e.target.value)} />}</Field>
            <Field label="Hasta">{(p) => <Input type="date" {...p} value={value.to ?? ""} min={value.from} onChange={(e) => set("to", e.target.value)} />}</Field>
          </>
        )}
        <Field label="Sensor">
          {(p) => (
            <Select {...p} value={value.sensorId} onChange={(e) => set("sensorId", e.target.value)}>
              <option value="all">Todos los sensores</option>
              {rooms.map((r) => {
                const list = sensors.filter((s) => s.roomId === r.id);
                if (!list.length) return null;
                return (
                  <optgroup key={r.id} label={r.name}>
                    {list.map((s) => (
                      <option key={s.id} value={s.id}>
                        {s.name}
                      </option>
                    ))}
                  </optgroup>
                );
              })}
            </Select>
          )}
        </Field>
        <Field label="Tipo de evento">
          {(p) => (
            <Select {...p} value={value.kind} onChange={(e) => set("kind", e.target.value as EventKind | "all")}>
              <option value="all">Todos los tipos</option>
              {(Object.keys(EVENT_KIND_META) as EventKind[])
                .filter((k) => k !== "reading")
                .map((k) => (
                  <option key={k} value={k}>
                    {EVENT_KIND_META[k].label}
                  </option>
                ))}
            </Select>
          )}
        </Field>
        <Field label="Severidad">
          {(p) => (
            <Select {...p} value={value.severity} onChange={(e) => set("severity", e.target.value as EventSeverity | "all")}>
              <option value="all">Todas</option>
              {(Object.keys(SEVERITY_LABEL) as EventSeverity[]).map((s) => (
                <option key={s} value={s}>
                  {SEVERITY_LABEL[s]}
                </option>
              ))}
            </Select>
          )}
        </Field>
      </div>
    </div>
  );
}
