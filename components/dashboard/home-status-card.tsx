"use client";

import { Bell, DoorClosed, DoorOpen, ShieldCheck, Siren, Thermometer, TriangleAlert, Wifi, WifiOff, type LucideIcon } from "lucide-react";
import { Tilt3D } from "@/components/ui/tilt-3d";
import { useNow } from "@/hooks/use-now";
import { formatRelative, formatTemp } from "@/lib/format";
import type { HomeStatusSummary } from "@/lib/home-status";
import { sensorState, SENSOR_TYPE_META } from "@/lib/sensor-meta";
import { homeTone, sensorTone, TONE_DOT, TONE_GLOW, TONE_TEXT, type Tone } from "@/lib/tone";
import { cn } from "@/lib/utils";
import type { HomeSnapshot, HomeStatusLevel } from "@/types";

const LEVEL_ICON: Record<HomeStatusLevel, LucideIcon> = {
  secure: ShieldCheck,
  warning: TriangleAlert,
  emergency: Siren,
  offline: WifiOff,
};

/**
 * HOME STATUS — el elemento principal del dashboard.
 * Responde de un vistazo: ¿está segura la casa?, ¿hay conexión?, ¿hay alertas?,
 * ¿temperatura?, ¿puertas?, ¿cuándo fue la última actualización?
 */
export function HomeStatusCard({ summary, snapshot }: { summary: HomeStatusSummary; snapshot: HomeSnapshot }) {
  const now = useNow(5_000);
  const tone = homeTone(summary.level);
  const Icon = LEVEL_ICON[summary.level];
  const online = snapshot.device?.status === "connected";
  const hasDoors = snapshot.sensors.some((s) => s.type === "door" && s.enabled);

  const facts: Array<{ icon: LucideIcon; label: string; value: string; tone: Tone }> = [
    {
      icon: online ? Wifi : WifiOff,
      label: "Dispositivo",
      value: !snapshot.device ? "Sin registrar" : online ? "Conectado" : "Desconectado",
      tone: online ? "ok" : "danger",
    },
    {
      icon: Thermometer,
      label: "Temperatura",
      value: summary.temperature !== undefined && online ? formatTemp(summary.temperature) : "—",
      tone: "neutral",
    },
    {
      icon: Bell,
      label: "Alertas activas",
      value: String(summary.pendingAlerts),
      tone: summary.pendingEmergencies ? "danger" : summary.pendingAlerts ? "warn" : "ok",
    },
    hasDoors && online
      ? {
          icon: summary.doorsOpen ? DoorOpen : DoorClosed,
          label: "Puertas",
          value: summary.doorsOpen ? `${summary.doorsOpen} abierta${summary.doorsOpen > 1 ? "s" : ""}` : "Cerradas",
          tone: summary.doorsOpen ? "warn" : "ok",
        }
      : { icon: DoorClosed, label: "Puertas", value: hasDoors ? "—" : "Sin sensor", tone: "neutral" },
  ];

  return (
    <Tilt3D
      as="section"
      aria-labelledby="home-status-title"
      max={2.4}
      lift={10}
      surfaceClassName="glass-strong"
      surface={
        <span
          className={cn(
            "absolute -left-24 -top-32 block size-[28rem] rounded-full bg-radial to-transparent opacity-70 blur-3xl transition-colors duration-700 animate-breathe",
            TONE_GLOW[tone],
          )}
        />
      }
      className="spatial-enter rounded-[1.75rem] p-5 sm:p-7"
    >
      <div className="relative grid gap-7 transform-3d xl:grid-cols-[1fr_minmax(0,22rem)]">
        <div className="flex flex-col gap-6 transform-3d">
          <div className="flex items-center gap-5 transform-3d pop-2 sm:gap-6">
            {/* Indicador circular */}
            <div className="float-idle relative size-24 shrink-0 transform-3d sm:size-28" aria-hidden>
              <span className={cn("absolute -inset-2.5 rounded-full border border-dashed border-current opacity-25 animate-[ring-spin_28s_linear_infinite]", TONE_TEXT[tone])} />
              <svg viewBox="0 0 100 100" className={cn("absolute inset-0 -rotate-90", TONE_TEXT[tone])}>
                <circle cx="50" cy="50" r="46" fill="none" stroke="currentColor" strokeOpacity="0.12" strokeWidth="2" />
                <circle
                  cx="50"
                  cy="50"
                  r="46"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2.5"
                  strokeLinecap="round"
                  strokeDasharray="289"
                  strokeDashoffset={summary.level === "secure" ? 0 : summary.level === "warning" ? 96 : summary.level === "emergency" ? 0 : 200}
                  className="transition-[stroke-dashoffset] duration-1000 ease-out"
                />
              </svg>
              <div className="absolute inset-3 pop-1 rounded-full border border-white/10 bg-gradient-to-b from-white/10 to-white/[0.02] shadow-[inset_0_1px_0_rgb(255_255_255/0.15),0_14px_30px_-10px_rgb(0_0_0/0.7)]" />
              {(summary.level === "secure" || summary.level === "emergency") && (
                <span className={cn("absolute inset-3 rounded-full opacity-30 animate-pulse-ring", TONE_DOT[tone])} style={{ animationDuration: summary.level === "emergency" ? "1.4s" : "3.2s" }} />
              )}
              <Icon className={cn("absolute left-1/2 top-1/2 size-9 -translate-x-1/2 -translate-y-1/2 pop-3 drop-shadow-[0_6px_10px_rgb(0_0_0/0.5)] sm:size-10", TONE_TEXT[tone])} strokeWidth={1.6} />
            </div>

            <div className="min-w-0">
              <p className="text-[0.7rem] font-semibold uppercase tracking-[0.22em] text-ink-subtle">Estado del hogar</p>
              <h1 id="home-status-title" className={cn("mt-1 text-3xl font-semibold tracking-tight sm:text-4xl", summary.level === "secure" ? "text-ink" : TONE_TEXT[tone])}>
                <span key={summary.level} className="inline-block animate-value">{summary.title}</span>
              </h1>
              <p className="mt-1.5 text-sm text-ink-muted sm:text-base">{summary.subtitle}</p>
            </div>
          </div>

          {/* Datos clave */}
          <dl className="grid grid-cols-2 gap-2.5 transform-3d pop-1 sm:grid-cols-4">
            {facts.map((f) => (
              <div key={f.label} className="rounded-2xl glass-subtle px-3.5 py-3 transition-[translate,background-color] duration-300 hover:translate-z-4 hover:bg-white/[0.06]">
                <dt className="flex items-center gap-1.5 text-xs text-ink-subtle">
                  <f.icon className="size-3.5" aria-hidden />
                  {f.label}
                </dt>
                <dd className={cn("mt-1 flex items-center gap-2 text-[0.95rem] font-semibold tabular", f.tone === "neutral" ? "text-ink" : TONE_TEXT[f.tone])}>
                  {f.tone !== "neutral" && <span className={cn("size-1.5 rounded-full", TONE_DOT[f.tone])} aria-hidden />}
                  <span key={f.value} className="animate-value">{f.value}</span>
                </dd>
              </div>
            ))}
          </dl>

          {summary.lastUpdate && (
            <p className="text-xs text-ink-subtle">
              Última actualización: <time dateTime={summary.lastUpdate} className="text-ink-muted">{formatRelative(summary.lastUpdate, now)}</time>
            </p>
          )}
        </div>

        <RoomsOverview snapshot={snapshot} />
      </div>
    </Tilt3D>
  );
}

/** Relación habitación ↔ sensores con el estado de cada espacio. */
function RoomsOverview({ snapshot }: { snapshot: HomeSnapshot }) {
  const online = snapshot.device?.status === "connected";
  const rank: Record<Tone, number> = { danger: 3, warn: 2, offline: 1, ok: 0, accent: 0, neutral: 0 };
  return (
    <div className="flex flex-col gap-2.5 transform-3d pop-2">
      <p className="text-[0.7rem] font-semibold uppercase tracking-[0.2em] text-ink-subtle">Habitaciones</p>
      <ul className="grid grid-cols-2 gap-2.5 transform-3d">
        {snapshot.rooms.map((room) => {
          const sensors = snapshot.sensors.filter((s) => s.roomId === room.id && s.enabled);
          const tones = sensors.map((s) => sensorTone(sensorState(s, snapshot.settings, online)));
          const roomTone = sensors.length
            ? tones.reduce<Tone>((worst, t) => (rank[t] > rank[worst] ? t : worst), online ? "ok" : "offline")
            : "neutral";
          const label = !sensors.length
            ? "Sin sensores"
            : roomTone === "danger"
              ? "Alerta"
              : roomTone === "warn"
                ? "Atención"
                : roomTone === "offline"
                  ? "Sin datos"
                  : "Normal";
          return (
            <li key={room.id} className="flex flex-col rounded-2xl glass-subtle p-3 transition-[translate,background-color] duration-300 hover:translate-z-5 hover:bg-white/[0.06]">
              <span className="text-sm font-medium leading-tight text-ink">{room.name}</span>
              <span className={cn("mt-1 flex items-center gap-1.5 text-[0.7rem] font-medium", TONE_TEXT[roomTone])}>
                <span className={cn("size-1.5 rounded-full", TONE_DOT[roomTone])} aria-hidden />
                {label}
              </span>
              <div className="mt-auto flex gap-1.5 pt-2.5">
                {sensors.map((s) => {
                  const SIcon = SENSOR_TYPE_META[s.type].icon;
                  const t = sensorTone(sensorState(s, snapshot.settings, online));
                  return (
                    <span key={s.id} title={s.name} className={cn("inline-flex size-7 items-center justify-center rounded-lg bg-white/[0.05]", t === "ok" ? "text-ink-muted" : TONE_TEXT[t])}>
                      <SIcon className="size-3.5" aria-hidden />
                      <span className="sr-only">{s.name}</span>
                    </span>
                  );
                })}
              </div>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
