"use client";

import { Activity, DoorClosed, DoorOpen, Thermometer, Wind } from "lucide-react";
import { useNow } from "@/hooks/use-now";
import { formatTemp, formatTime } from "@/lib/format";
import { sensorState, SENSOR_STATE_LABEL } from "@/lib/sensor-meta";
import { sensorTone } from "@/lib/tone";
import type { Room, Sensor, SensorReading, SystemSettings } from "@/types";
import { MotionRadar, Sparkline, ThresholdGauge } from "./indicators";
import { SensorCard } from "./sensor-card";

interface BaseProps {
  settings: SystemSettings;
  online: boolean;
  rooms: Room[];
  className?: string;
}

const roomOf = (rooms: Room[], id?: string) => rooms.find((r) => r.id === id)?.name;

/* ---------------- Temperatura (HU-06) ---------------- */

export function TemperatureCard({
  sensors,
  readings,
  settings,
  online,
  rooms,
  className,
}: BaseProps & { sensors: Sensor[]; readings: SensorReading[] }) {
  const active = sensors.filter((s) => s.enabled && s.lastReading);
  const primary = active[0];
  if (!primary) {
    return (
      <SensorCard icon={Thermometer} title="Temperatura" tone="offline" stateLabel="Sin sensor" value="—" caption="No hay sensores de temperatura activos" className={className} />
    );
  }
  const st = sensorState(primary, settings, online);
  const tone = sensorTone(st);
  const v = primary.lastReading!.value;
  const series = readings.filter((r) => r.sensorId === primary.id).slice(-48).map((r) => r.value);
  const label = st === "alert" ? "Temperatura elevada" : st === "warning" ? "Temperatura fuera de lo habitual" : st === "offline" ? "Sin lecturas recientes" : "Temperatura normal";

  return (
    <SensorCard
      icon={Thermometer}
      title="Temperatura"
      location={roomOf(rooms, primary.roomId)}
      tone={tone}
      stateLabel={SENSOR_STATE_LABEL[st]}
      value={online ? formatTemp(v) : "—"}
      valueKey={v}
      caption={
        <span className="flex flex-col gap-1">
          <span>{label}</span>
          {active.length > 1 && (
            <span className="flex flex-wrap gap-x-3 text-xs text-ink-subtle tabular">
              {active.slice(1).map((s) => (
                <span key={s.id}>
                  {roomOf(rooms, s.roomId)} {formatTemp(s.lastReading!.value)}
                </span>
              ))}
            </span>
          )}
        </span>
      }
      updatedAt={primary.lastReading!.recordedAt}
      indicator={<Sparkline values={series} tone={tone} />}
      className={className}
    />
  );
}

/* ---------------- Movimiento (HU-07) ---------------- */

export function MotionCard({ sensors, online, rooms, className }: Omit<BaseProps, "settings"> & { sensors: Sensor[] }) {
  const now = useNow(5_000);
  const active = sensors.filter((s) => s.enabled);
  const latest = [...active].sort((a, b) => (b.lastEventAt ?? "").localeCompare(a.lastEventAt ?? ""))[0];
  const recent = !!latest?.lastEventAt && now - new Date(latest.lastEventAt).getTime() < 90_000;
  const tone = !online || !latest ? "offline" : recent ? "accent" : "ok";

  return (
    <SensorCard
      icon={Activity}
      title="Movimiento"
      location={`${active.length} ${active.length === 1 ? "sensor" : "sensores"}`}
      tone={tone}
      stateLabel={!online ? "Sin datos" : recent ? "Detectado" : "En calma"}
      value={!online ? "—" : recent ? "Movimiento detectado" : "Sin movimiento"}
      valueKey={latest?.lastEventAt}
      caption={
        latest?.lastEventAt ? (
          <>
            Último evento: <span className="text-ink tabular">{formatTime(latest.lastEventAt)}</span> · {roomOf(rooms, latest.roomId)}
          </>
        ) : (
          "Sin eventos registrados"
        )
      }
      indicator={<MotionRadar active={online && recent} tone={tone} />}
      className={className}
    />
  );
}

/* ---------------- Puertas (HU-08) ---------------- */

export function DoorStatusCard({ sensor, settings, online, rooms, className }: BaseProps & { sensor?: Sensor }) {
  if (!sensor) {
    return <SensorCard icon={DoorClosed} title="Puerta" tone="offline" stateLabel="Sin sensor" value="—" className={className} />;
  }
  const open = sensor.lastReading?.value === 1;
  const st = sensorState(sensor, settings, online);
  const tone = sensorTone(st);
  const Icon = open ? DoorOpen : DoorClosed;
  return (
    <SensorCard
      icon={Icon}
      title={sensor.name}
      location={roomOf(rooms, sensor.roomId)}
      tone={tone}
      stateLabel={!online ? "Sin datos" : open ? "Abierta" : "Cerrada"}
      value={!online ? "—" : open ? "Abierta" : "Cerrada"}
      valueKey={String(open)}
      caption={
        sensor.lastEventAt ? (
          <>
            Último cambio: <span className="text-ink tabular">{formatTime(sensor.lastEventAt)}</span>
          </>
        ) : undefined
      }
      indicator={
        <div className={`relative flex h-14 w-10 items-end justify-center rounded-t-lg border-2 border-b-0 ${open ? "border-warn/60" : "border-ok/50"}`} aria-hidden>
          <span
            className={`absolute inset-x-0.5 bottom-0 top-0.5 origin-left rounded-t-md transition-transform duration-500 ${open ? "bg-warn/25 [transform:perspective(120px)_rotateY(-55deg)]" : "bg-ok/20"}`}
          />
        </div>
      }
      className={className}
    />
  );
}

/* ---------------- Humo / gas (HU-09) ---------------- */

export function GasSensorCard({ sensor, settings, online, rooms, className }: BaseProps & { sensor?: Sensor }) {
  if (!sensor) {
    return <SensorCard icon={Wind} title="Humo / gas" tone="offline" stateLabel="Sin sensor" value="—" className={className} />;
  }
  const st = sensorState(sensor, settings, online);
  const tone = sensorTone(st);
  const ppm = sensor.lastReading?.value ?? 0;
  const threshold = sensor.threshold ?? settings.gasThresholdPpm;
  const label = st === "alert" ? "Nivel peligroso" : st === "warning" ? "Nivel elevado" : st === "offline" ? "Sin datos" : "Nivel normal";
  return (
    <SensorCard
      icon={Wind}
      title="Humo / gas"
      location={roomOf(rooms, sensor.roomId)}
      tone={tone}
      stateLabel={SENSOR_STATE_LABEL[st]}
      value={online ? label : "—"}
      valueKey={st}
      caption={
        online ? (
          <span className="tabular">
            {ppm} ppm <span className="text-ink-subtle">· umbral {threshold} ppm</span>
          </span>
        ) : undefined
      }
      updatedAt={sensor.lastReading?.recordedAt}
      indicator={<ThresholdGauge value={online ? ppm : 0} threshold={threshold} max={Math.max(threshold * 1.6, ppm)} tone={tone} />}
      className={className}
    />
  );
}
