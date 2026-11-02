"use client";

import { Activity, Cpu, PlugZap, RefreshCw, Replace, WifiOff } from "lucide-react";
import { useState } from "react";
import { CapabilityGate, HomeGate } from "@/components/layout/gates";
import { useSession } from "@/components/providers/session-provider";
import { useToast } from "@/components/providers/toast-provider";
import { SignalBars, signalLabel } from "@/components/sensors/indicators";
import { PageHeader } from "@/components/ui/feedback";
import { Tilt3D } from "@/components/ui/tilt-3d";
import { GlassButton } from "@/components/ui/glass-button";
import { GlassModal } from "@/components/ui/glass-modal";
import { GlassPanel } from "@/components/ui/glass-panel";
import { StatusBadge, StatusDot } from "@/components/ui/status";
import { useNow } from "@/hooks/use-now";
import { formatDateTime, formatRelative } from "@/lib/format";
import { SENSOR_TYPE_META } from "@/lib/sensor-meta";
import { cn } from "@/lib/utils";
import { api } from "@/services";
import type { SensorType } from "@/types";
import { DeviceRegisterForm } from "./device-register-form";
import { DeviceSetupPanel } from "./device-setup-panel";

export function DeviceView() {
  const { can } = useSession();
  const toast = useToast();
  const now = useNow(5_000);
  const [replaceOpen, setReplaceOpen] = useState(false);
  const [pinging, setPinging] = useState(false);
  const manage = can("device:manage");

  async function ping() {
    setPinging(true);
    const r = await api.device.ping();
    setPinging(false);
    toast(
      r.ok
        ? { tone: "success", title: "El dispositivo respondió", description: `Latencia ${r.latencyMs} ms` }
        : { tone: "error", title: "Sin respuesta del dispositivo", description: "Verifica la alimentación y la red Wi-Fi." },
    );
  }

  return (
    <CapabilityGate cap="device:view">
      <div className="spatial-stagger flex flex-col gap-6">
        <PageHeader eyebrow="Hogar" title="Dispositivo" description="Unidad central ESP32 que recibe los datos de los sensores y los envía a la plataforma." />
        <HomeGate>
          {(snapshot) => {
            const d = snapshot.device;
            if (!d) {
              return (
                <GlassPanel depth={2} padding="lg" className="max-w-2xl">
                  <div className="mb-6 flex items-center gap-4">
                    <span className="inline-flex size-14 items-center justify-center rounded-2xl border border-accent/30 bg-accent/10 text-accent">
                      <Cpu className="size-6" aria-hidden />
                    </span>
                    <div>
                      <h2 className="text-lg font-semibold text-ink">Registra tu dispositivo</h2>
                      <p className="text-sm text-ink-muted">Asocia tu ESP32 a tu cuenta para comenzar a recibir información.</p>
                    </div>
                  </div>
                  {manage ? <DeviceRegisterForm /> : <p className="text-sm text-ink-muted">Solo el usuario principal puede registrar el dispositivo.</p>}
                </GlassPanel>
              );
            }
            const online = d.status === "connected";
            const counts = snapshot.sensors.reduce<Record<string, number>>((acc, s) => ({ ...acc, [s.type]: (acc[s.type] ?? 0) + (s.enabled ? 1 : 0) }), {});
            const info: Array<[string, React.ReactNode]> = [
              ["Device ID", <span key="id" className="font-mono">{d.deviceUid}</span>],
              ["Modelo", `${d.model} · firmware ${d.firmware}`],
              ["Red Wi-Fi", d.wifiSsid],
              ["Dirección IP", <span key="ip" className="font-mono">{online ? d.ipAddress : "—"}</span>],
              ["Registrado", formatDateTime(d.registeredAt)],
              [online ? "Última sincronización" : "Última conexión", d.connectedOnce ? formatRelative(d.lastSyncAt, now) : "Aún no se conecta"],
            ];

            return (
              <div className="grid gap-5 lg:grid-cols-5">
                <Tilt3D
                  as="section"
                  aria-labelledby="device-title"
                  max={3}
                  lift={10}
                  surfaceClassName="glass-strong"
                  surface={
                    <span
                      className={cn(
                        "absolute -right-20 -top-24 block size-80 rounded-full bg-radial to-transparent blur-3xl",
                        online ? "from-accent/25 via-electric/10" : "from-danger/25 via-danger/5",
                      )}
                    />
                  }
                  className="rounded-[1.75rem] p-6 sm:p-8 lg:col-span-3"
                >
                  <div className="relative flex flex-col gap-7 transform-3d">
                    <div className="flex flex-wrap items-start justify-between gap-4 transform-3d pop-2">
                      <div className="flex items-center gap-4 transform-3d">
                        <span
                          className={cn(
                            "float-idle pop-2 relative inline-flex size-16 items-center justify-center rounded-2xl border",
                            online ? "border-accent/35 bg-accent/10 text-accent" : "border-danger/35 bg-danger/10 text-danger",
                          )}
                        >
                          <Cpu className="size-7" strokeWidth={1.6} aria-hidden />
                          <span className="absolute -right-1 -top-1">
                            <StatusDot tone={online ? "ok" : "danger"} pulse={online} />
                          </span>
                        </span>
                        <div>
                          <p className="text-[0.7rem] font-semibold uppercase tracking-[0.22em] text-ink-subtle">HomeAssist Device</p>
                          <h2 id="device-title" className="text-2xl font-semibold tracking-tight text-ink">
                            {d.name}
                          </h2>
                          <p className="text-sm text-ink-muted">ESP32</p>
                        </div>
                      </div>
                      <StatusBadge
                        tone={!d.connectedOnce ? "warn" : online ? "ok" : "danger"}
                        dot
                        pulse={online || !d.connectedOnce}
                        className="px-3 py-1.5 text-[0.72rem] font-bold tracking-[0.14em]"
                      >
                        {!d.connectedOnce ? "ESPERANDO" : online ? "CONECTADO" : "DESCONECTADO"}
                      </StatusBadge>
                    </div>

                    {!d.connectedOnce ? (
                      <div role="status" className="flex items-start gap-3 rounded-2xl border border-warn/35 bg-warn/10 p-4">
                        <WifiOff className="mt-0.5 size-5 shrink-0 text-warn" aria-hidden />
                        <div>
                          <p className="font-semibold text-warn">Aún no recibimos datos del ESP32</p>
                          <p className="text-sm text-ink-muted">Sigue los pasos de “Conectar tu ESP32” para que envíe su primer reporte.</p>
                        </div>
                      </div>
                    ) : !online && (
                      <div role="alert" className="flex items-start gap-3 rounded-2xl border border-danger/35 bg-danger/10 p-4">
                        <WifiOff className="mt-0.5 size-5 shrink-0 text-danger" aria-hidden />
                        <div>
                          <p className="font-semibold text-danger">Dispositivo desconectado</p>
                          <p className="text-sm text-ink-muted">
                            Última conexión {formatRelative(d.lastSyncAt, now)}. Los datos del dashboard pueden no estar actualizados. Verifica la
                            alimentación del ESP32 y la red Wi-Fi.
                          </p>
                        </div>
                      </div>
                    )}

                    <dl className="grid gap-2.5 sm:grid-cols-2">
                      {info.map(([k, v]) => (
                        <div key={k} className="rounded-xl glass-subtle px-4 py-3">
                          <dt className="text-xs text-ink-subtle">{k}</dt>
                          <dd className="mt-0.5 truncate text-sm font-medium text-ink">{v}</dd>
                        </div>
                      ))}
                    </dl>

                    <div className="flex flex-wrap gap-2">
                      <GlassButton onClick={ping} loading={pinging}>
                        {!pinging && <RefreshCw aria-hidden />} Probar conexión
                      </GlassButton>
                      {manage && (
                        <GlassButton variant="ghost" onClick={() => setReplaceOpen(true)}>
                          <Replace aria-hidden /> Registrar otro dispositivo
                        </GlassButton>
                      )}
                    </div>
                  </div>
                </Tilt3D>

                <div className="flex flex-col gap-5 lg:col-span-2">
                  <GlassPanel>
                    <h2 className="mb-4 text-sm font-semibold text-ink">Señal Wi-Fi</h2>
                    <div className="flex items-center gap-4">
                      <span className="scale-150 origin-left">
                        <SignalBars rssi={d.wifiRssi} online={online} />
                      </span>
                      <div className="ml-4">
                        <p className="text-lg font-semibold text-ink">{signalLabel(d.wifiRssi, online)}</p>
                        <p className="text-xs text-ink-subtle tabular">{online ? `${d.wifiRssi} dBm` : "Sin datos"}</p>
                      </div>
                    </div>
                  </GlassPanel>

                  <GlassPanel>
                    <div className="mb-4 flex items-center justify-between">
                      <h2 className="text-sm font-semibold text-ink">Sensores conectados</h2>
                      <span className="text-xs text-ink-subtle tabular">{snapshot.sensors.filter((s) => s.enabled).length} activos</span>
                    </div>
                    <ul className="flex flex-col gap-2">
                      {(Object.keys(SENSOR_TYPE_META) as SensorType[]).map((t) => {
                        const meta = SENSOR_TYPE_META[t];
                        const n = counts[t] ?? 0;
                        return (
                          <li key={t} className="flex items-center justify-between rounded-xl glass-subtle px-3.5 py-2.5 text-sm">
                            <span className="flex items-center gap-2.5 text-ink">
                              <meta.icon className="size-4 text-ink-subtle" aria-hidden />
                              {meta.label}
                              <span className="text-xs text-ink-subtle">{meta.hardware}</span>
                            </span>
                            <span className="font-medium text-ink tabular">{n}</span>
                          </li>
                        );
                      })}
                    </ul>
                  </GlassPanel>

                  <GlassPanel>
                    <h2 className="mb-3 flex items-center gap-2 text-sm font-semibold text-ink">
                      <Activity className="size-4 text-ink-subtle" aria-hidden /> Comunicación
                    </h2>
                    <p className="text-sm text-ink-muted">
                      El ESP32 envía lecturas por HTTP cada pocos segundos. Si no se reciben datos en {snapshot.settings.offlineAfterSeconds} s, el
                      sistema lo marca como desconectado y genera una alerta.
                    </p>
                    <p className="mt-3 flex items-center gap-2 text-xs text-ink-subtle">
                      <PlugZap className="size-3.5" aria-hidden /> Buzzer local {snapshot.settings.buzzerEnabled ? "activado" : "desactivado"}
                    </p>
                  </GlassPanel>
                </div>

                {manage && (
                  <div className={cn("lg:col-span-5", !d.connectedOnce && "order-first")}>
                    <DeviceSetupPanel snapshot={snapshot} />
                  </div>
                )}

                <GlassModal
                  open={replaceOpen}
                  onOpenChange={setReplaceOpen}
                  title="Registrar otro dispositivo"
                  description="El nuevo ESP32 reemplazará al actual y conservará los sensores configurados."
                >
                  <DeviceRegisterForm onDone={() => setReplaceOpen(false)} submitLabel="Registrar y reemplazar" />
                </GlassModal>
              </div>
            );
          }}
        </HomeGate>
      </div>
    </CapabilityGate>
  );
}
