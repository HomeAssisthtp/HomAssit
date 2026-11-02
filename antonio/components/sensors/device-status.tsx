"use client";

import { Cpu, RefreshCw, Wifi, WifiOff } from "lucide-react";
import Link from "next/link";
import { useHome } from "@/components/providers/home-provider";
import { Skeleton } from "@/components/ui/feedback";
import { SpatialCard } from "@/components/ui/spatial-card";
import { StatusBadge, StatusDot } from "@/components/ui/status";
import { useNow } from "@/hooks/use-now";
import { formatRelative } from "@/lib/format";
import { cn } from "@/lib/utils";
import type { Device } from "@/types";
import { SignalBars, signalLabel } from "./indicators";

/** Indicador compacto de conexión del ESP32 para la barra superior (RF-18). */
export function ConnectionPill() {
  const { snapshot, status } = useHome();
  const now = useNow(5_000);
  if (status === "loading" && !snapshot) return <Skeleton className="h-5 w-44" />;
  const device = snapshot?.device;
  if (!device) {
    return (
      <span className="inline-flex items-center gap-2 text-sm text-ink-muted">
        <StatusDot tone="offline" /> Sin dispositivo registrado
      </span>
    );
  }
  const online = device.status === "connected";
  if (!device.connectedOnce) {
    return (
      <span className="inline-flex min-w-0 items-center gap-2 text-sm" role="status" aria-live="polite">
        <StatusDot tone="warn" pulse />
        <span className="font-medium text-warn">Esperando al ESP32</span>
        <span className="hidden truncate text-ink-subtle sm:inline">· aún no envía datos</span>
      </span>
    );
  }
  return (
    <span className="inline-flex min-w-0 items-center gap-2 text-sm" role="status" aria-live="polite">
      <StatusDot tone={online ? "ok" : "danger"} pulse={online} />
      <span className={cn("font-medium", online ? "text-ink" : "text-danger")}>{online ? "Conectado" : "Desconectado"}</span>
      <span className="hidden truncate text-ink-subtle sm:inline">
        · {online ? "sincronizado" : "última conexión"} {formatRelative(device.lastSyncAt, now)}
      </span>
    </span>
  );
}

/** Card del dispositivo ESP32 para el dashboard. */
export function DeviceStatus({ device, sensorsCount, className }: { device: Device | null; sensorsCount: number; className?: string }) {
  const now = useNow(5_000);

  if (!device) {
    return (
      <SpatialCard className={cn("flex flex-col justify-between gap-4", className)}>
        <div className="flex items-center gap-3">
          <span className="inline-flex size-11 items-center justify-center rounded-2xl border border-line bg-white/5 text-ink-subtle">
            <Cpu className="size-5" aria-hidden />
          </span>
          <div>
            <h3 className="text-sm font-semibold text-ink">Sin dispositivo</h3>
            <p className="text-xs text-ink-subtle">Registra tu ESP32 para empezar</p>
          </div>
        </div>
        <Link href="/dispositivo" className="text-sm font-medium text-accent hover:underline">
          Registrar dispositivo →
        </Link>
      </SpatialCard>
    );
  }

  const online = device.status === "connected";
  const waiting = !device.connectedOnce;
  return (
    <SpatialCard as="article" aria-label={`Dispositivo ${device.name}: ${online ? "conectado" : "desconectado"}`} className={cn("flex flex-col gap-4", className)}>
      <div className="flex items-start justify-between gap-3">
        <div className="flex min-w-0 items-center gap-3">
          <span
            className={cn(
              "relative inline-flex size-11 shrink-0 items-center justify-center rounded-2xl border",
              online ? "border-accent/30 bg-accent/10 text-accent" : "border-danger/30 bg-danger/10 text-danger",
            )}
            aria-hidden
          >
            <Cpu className="size-5" />
          </span>
          <div className="min-w-0">
            <h3 className="truncate text-sm font-semibold text-ink">{device.name}</h3>
            <p className="truncate font-mono text-xs text-ink-subtle">{device.deviceUid}</p>
          </div>
        </div>
        <StatusBadge tone={waiting ? "warn" : online ? "ok" : "danger"} dot pulse={online || waiting}>
          {waiting ? "Esperando" : online ? "Conectado" : "Desconectado"}
        </StatusBadge>
      </div>

      <dl className="grid grid-cols-2 gap-3 text-sm">
        <div className="rounded-xl glass-subtle p-3">
          <dt className="flex items-center gap-1.5 text-xs text-ink-subtle">
            {online ? <Wifi className="size-3.5" aria-hidden /> : <WifiOff className="size-3.5" aria-hidden />} Wi-Fi
          </dt>
          <dd className="mt-1 flex items-center gap-2 font-medium text-ink">
            <SignalBars rssi={device.wifiRssi} online={online} />
            {signalLabel(device.wifiRssi, online)}
          </dd>
        </div>
        <div className="rounded-xl glass-subtle p-3">
          <dt className="text-xs text-ink-subtle">Sensores</dt>
          <dd className="mt-1 font-medium text-ink tabular">{sensorsCount} {sensorsCount === 1 ? "conectado" : "conectados"}</dd>
        </div>
      </dl>

      {waiting ? (
        <p className="flex items-center gap-1.5 border-t border-line pt-3 text-xs text-warn">
          <RefreshCw className="size-3.5" aria-hidden />
          Aún no recibimos datos ·{" "}
          <Link href="/dispositivo" className="font-medium underline-offset-2 hover:underline">
            Ver cómo conectarlo
          </Link>
        </p>
      ) : (
        <p className={cn("flex items-center gap-1.5 border-t border-line pt-3 text-xs", online ? "text-ink-subtle" : "text-danger/90")}>
          <RefreshCw className="size-3.5" aria-hidden />
          {online ? "Última sincronización" : "Última conexión"}{" "}
          <time dateTime={device.lastSyncAt}>{formatRelative(device.lastSyncAt, now)}</time>
        </p>
      )}
    </SpatialCard>
  );
}
