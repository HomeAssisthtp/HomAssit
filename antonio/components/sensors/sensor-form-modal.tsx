"use client";

import { useEffect, useState, type FormEvent } from "react";
import { Field, Input, Select } from "@/components/ui/form";
import { GlassButton } from "@/components/ui/glass-button";
import { GlassModal } from "@/components/ui/glass-modal";
import { useAsyncAction } from "@/hooks/use-home-actions";
import { SENSOR_TYPE_META } from "@/lib/sensor-meta";
import { fieldErrors, sensorSchema } from "@/lib/validation";
import { api } from "@/services";
import type { Room, Sensor, SensorType } from "@/types";

const HAS_THRESHOLD: SensorType[] = ["temperature", "gas"];

/** Alta y edición de sensores: tipo, identificador, habitación y umbral. */
export function SensorFormModal({
  open,
  onOpenChange,
  rooms,
  sensor,
}: {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  rooms: Room[];
  sensor?: Sensor | null;
}) {
  const editing = !!sensor;
  const empty = { type: "" as SensorType | "", name: "", hardwareId: "", roomId: "", threshold: "" };
  const [v, setV] = useState(empty);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const { run, loading } = useAsyncAction();

  useEffect(() => {
    if (!open) return;
    setErrors({});
    setV(
      sensor
        ? { type: sensor.type, name: sensor.name, hardwareId: sensor.hardwareId, roomId: sensor.roomId, threshold: sensor.threshold?.toString() ?? "" }
        : empty,
    );
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, sensor]);

  const set = (k: keyof typeof v) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => setV((s) => ({ ...s, [k]: e.target.value }));

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    const parsed = sensorSchema.safeParse({
      ...v,
      threshold: HAS_THRESHOLD.includes(v.type as SensorType) && v.threshold !== "" ? v.threshold : undefined,
    });
    if (!parsed.success) {
      setErrors(fieldErrors(parsed.error));
      return;
    }
    setErrors({});
    const ok = await run(
      () =>
        editing
          ? api.sensors.update(sensor!.id, { name: parsed.data.name, roomId: parsed.data.roomId, threshold: parsed.data.threshold })
          : api.sensors.create(parsed.data),
      { success: editing ? "Sensor actualizado" : "Sensor registrado", error: "No se pudo guardar el sensor" },
    );
    if (ok) onOpenChange(false);
  }

  const showThreshold = HAS_THRESHOLD.includes(v.type as SensorType);

  return (
    <GlassModal
      open={open}
      onOpenChange={onOpenChange}
      title={editing ? "Configurar sensor" : "Registrar sensor"}
      description={editing ? "Actualiza el nombre, la ubicación o el umbral." : "Asocia un sensor conectado al ESP32 con una habitación."}
      footer={
        <>
          <GlassButton variant="ghost" onClick={() => onOpenChange(false)}>
            Cancelar
          </GlassButton>
          <GlassButton variant="primary" type="submit" form="sensor-form" loading={loading}>
            {editing ? "Guardar cambios" : "Registrar sensor"}
          </GlassButton>
        </>
      }
    >
      <form id="sensor-form" onSubmit={onSubmit} noValidate className="grid gap-4 sm:grid-cols-2">
        <Field label="Tipo de sensor" error={errors.type}>
          {(p) => (
            <Select {...p} value={v.type} onChange={set("type")} disabled={editing}>
              <option value="" disabled>
                Selecciona…
              </option>
              {(Object.keys(SENSOR_TYPE_META) as SensorType[]).map((t) => (
                <option key={t} value={t}>
                  {SENSOR_TYPE_META[t].label} ({SENSOR_TYPE_META[t].hardware})
                </option>
              ))}
            </Select>
          )}
        </Field>
        <Field label="Habitación" error={errors.roomId}>
          {(p) => (
            <Select {...p} value={v.roomId} onChange={set("roomId")}>
              <option value="" disabled>
                Selecciona…
              </option>
              {rooms.map((r) => (
                <option key={r.id} value={r.id}>
                  {r.name}
                </option>
              ))}
            </Select>
          )}
        </Field>
        <Field label="Nombre" error={errors.name} className="sm:col-span-2">
          {(p) => <Input {...p} placeholder="Ej. Movimiento pasillo" value={v.name} onChange={set("name")} />}
        </Field>
        <Field label="Identificador" error={errors.hardwareId} hint="Modelo y pin del ESP32, p. ej. PIR-GPIO13">
          {(p) => <Input {...p} className="font-mono uppercase" placeholder="PIR-GPIO13" value={v.hardwareId} onChange={set("hardwareId")} disabled={editing} />}
        </Field>
        {showThreshold && (
          <Field label={`Umbral de alerta (${v.type === "gas" ? "ppm" : "°C"})`} error={errors.threshold} hint="Vacío = usar el valor general">
            {(p) => <Input {...p} type="number" inputMode="decimal" value={v.threshold} onChange={set("threshold")} />}
          </Field>
        )}
      </form>
    </GlassModal>
  );
}
