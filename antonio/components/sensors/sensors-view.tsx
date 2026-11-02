"use client";

import { DoorOpen, Plus, Radar, Settings2 } from "lucide-react";
import { useState } from "react";
import { CapabilityGate, HomeGate } from "@/components/layout/gates";
import { useSession } from "@/components/providers/session-provider";
import { EmptyState, PageHeader } from "@/components/ui/feedback";
import { GlassButton } from "@/components/ui/glass-button";
import { SpatialCard } from "@/components/ui/spatial-card";
import { IconTile, StatusBadge } from "@/components/ui/status";
import { useAsyncAction } from "@/hooks/use-home-actions";
import { useNow } from "@/hooks/use-now";
import { formatRelative, formatTemp, formatTime } from "@/lib/format";
import { sensorState, SENSOR_STATE_LABEL, SENSOR_TYPE_META } from "@/lib/sensor-meta";
import { sensorTone } from "@/lib/tone";
import { api } from "@/services";
import type { Sensor } from "@/types";
import { FirmwareSensorsButton } from "./firmware-sensors-button";
import { RoomFormModal } from "./room-form-modal";
import { SensorFormModal } from "./sensor-form-modal";

function readingText(s: Sensor) {
  const v = s.lastReading?.value;
  if (v === undefined) return "—";
  switch (s.type) {
    case "temperature":
      return formatTemp(v);
    case "gas":
      return `${v} ppm`;
    case "door":
      return v === 1 ? "Abierta" : "Cerrada";
    case "motion":
      return s.lastEventAt ? `Último: ${formatTime(s.lastEventAt)}` : "Sin eventos";
    case "sos":
      return v === 1 ? "Activado" : "En espera";
  }
}

/** HU-05: sensores agrupados por habitación, con registro y configuración. */
export function SensorsView() {
  const { can } = useSession();
  const manage = can("sensors:manage");
  const [modal, setModal] = useState<{ open: boolean; sensor: Sensor | null }>({ open: false, sensor: null });
  const [roomOpen, setRoomOpen] = useState(false);
  const { run } = useAsyncAction();
  const now = useNow();

  return (
    <CapabilityGate cap="sensors:view">
      <HomeGate>
        {(snapshot) => {
          const online = snapshot.device?.status === "connected";
          return (
            <div className="spatial-stagger flex flex-col gap-6">
              <PageHeader
                eyebrow="Monitoreo"
                title="Sensores"
                description={`${snapshot.sensors.length} sensores en ${snapshot.rooms.length} habitaciones, conectados a ${snapshot.device?.name ?? "tu dispositivo"}.`}
                actions={
                  manage && snapshot.device ? (
                    <>
                      <FirmwareSensorsButton snapshot={snapshot} />
                      <GlassButton onClick={() => setRoomOpen(true)}>
                        <DoorOpen aria-hidden /> Agregar habitación
                      </GlassButton>
                      <GlassButton variant="primary" onClick={() => setModal({ open: true, sensor: null })}>
                        <Plus aria-hidden /> Registrar sensor
                      </GlassButton>
                    </>
                  ) : undefined
                }
              />

              {!snapshot.device ? (
                <SpatialCard interactive={false}>
                  <EmptyState icon={Radar} title="Sin dispositivo" description="Registra tu ESP32 para poder configurar sensores." />
                </SpatialCard>
              ) : (
                <div className="grid gap-5 min-[1680px]:grid-cols-2">
                  {snapshot.rooms.map((room) => {
                    const sensors = snapshot.sensors.filter((s) => s.roomId === room.id);
                    return (
                      <section key={room.id} aria-labelledby={`room-${room.id}`} className="rounded-[1.5rem] glass p-4 sm:p-5">
                        <div className="mb-3 flex items-center justify-between px-1">
                          <h2 id={`room-${room.id}`} className="text-base font-semibold text-ink">
                            {room.name}
                          </h2>
                          <span className="text-xs text-ink-subtle">
                            {sensors.length} {sensors.length === 1 ? "sensor" : "sensores"}
                          </span>
                        </div>
                        {sensors.length === 0 ? (
                          <p className="rounded-xl glass-subtle px-4 py-6 text-center text-sm text-ink-muted">Sin sensores en esta habitación.</p>
                        ) : (
                          <ul className="flex flex-col gap-2">
                            {sensors.map((s) => {
                              const st = sensorState(s, snapshot.settings, online);
                              const tone = sensorTone(st);
                              const meta = SENSOR_TYPE_META[s.type];
                              return (
                                <li key={s.id} className="flex flex-wrap items-center gap-3 rounded-2xl glass-subtle p-3 transition-colors hover:bg-white/[0.045] sm:flex-nowrap">
                                  <IconTile icon={meta.icon} tone={s.enabled ? tone : "offline"} className="size-10" />
                                  <div className="min-w-0 flex-1">
                                    <p className="truncate text-sm font-medium text-ink">{s.name}</p>
                                    <p className="truncate text-xs text-ink-subtle">
                                      {meta.label} · <span className="font-mono">{s.hardwareId}</span>
                                    </p>
                                  </div>
                                  <div className="ml-auto flex items-center gap-3">
                                    <div className="text-right">
                                      <p className="text-sm font-medium text-ink tabular">{s.enabled && online ? readingText(s) : "—"}</p>
                                      <p className="text-[0.7rem] text-ink-subtle">
                                        {s.lastReading ? formatRelative(s.lastReading.recordedAt, now) : ""}
                                      </p>
                                    </div>
                                    <StatusBadge tone={s.enabled ? tone : "offline"} dot>
                                      {s.enabled ? SENSOR_STATE_LABEL[st] : "Desactivado"}
                                    </StatusBadge>
                                    {manage && (
                                      <GlassButton
                                        size="icon-sm"
                                        variant="ghost"
                                        aria-label={`Configurar ${s.name}`}
                                        onClick={() => setModal({ open: true, sensor: s })}
                                      >
                                        <Settings2 />
                                      </GlassButton>
                                    )}
                                  </div>
                                  {manage && (
                                    <div className="flex">
                                      <button
                                        role="switch"
                                        aria-checked={s.enabled}
                                        aria-label={`${s.enabled ? "Desactivar" : "Activar"} ${s.name}`}
                                        onClick={() =>
                                          run(() => api.sensors.update(s.id, { enabled: !s.enabled }), {
                                            success: !s.enabled ? "Sensor activado" : "Sensor desactivado",
                                          })
                                        }
                                        className={`relative inline-flex h-6 w-10 items-center rounded-full border transition-colors ${s.enabled ? "border-accent/50 bg-accent/30" : "border-line bg-white/5"}`}
                                      >
                                        <span className={`inline-block size-4 rounded-full transition-transform ${s.enabled ? "translate-x-5 bg-accent" : "translate-x-1 bg-ink-subtle"}`} />
                                      </button>
                                    </div>
                                  )}
                                </li>
                              );
                            })}
                          </ul>
                        )}
                      </section>
                    );
                  })}
                </div>
              )}

              <RoomFormModal open={roomOpen} onOpenChange={setRoomOpen} />
              <SensorFormModal
                open={modal.open}
                onOpenChange={(open) => setModal((m) => ({ ...m, open }))}
                rooms={snapshot.rooms}
                sensor={modal.sensor}
              />
            </div>
          );
        }}
      </HomeGate>
    </CapabilityGate>
  );
}
