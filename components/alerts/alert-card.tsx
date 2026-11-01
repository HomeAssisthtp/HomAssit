"use client";

import { Check, MapPin } from "lucide-react";
import { GlassButton } from "@/components/ui/glass-button";
import { StatusBadge, StatusDot } from "@/components/ui/status";
import { useNow } from "@/hooks/use-now";
import { formatRelative, formatTime } from "@/lib/format";
import { SEVERITY_LABEL } from "@/lib/sensor-meta";
import { severityTone, TONE_TEXT } from "@/lib/tone";
import { cn } from "@/lib/utils";
import type { Alert } from "@/types";
import { SEVERITY_ICON, STATUS_META } from "./alert-meta";

export interface AlertCardProps {
  alert: Alert;
  roomName?: string;
  onDetail?: (a: Alert) => void;
  onAttend?: (a: Alert) => void;
  canAttend?: boolean;
  attending?: boolean;
  /** Entrada animada para alertas recién recibidas. */
  isNew?: boolean;
  compact?: boolean;
}

/**
 * Alerta con jerarquía por severidad. Una emergencia pendiente destaca
 * (tinte rojo, borde, pulso) sin invadir el resto de la interfaz (RF-23).
 */
export function AlertCard({ alert, roomName, onDetail, onAttend, canAttend, attending, isNew, compact }: AlertCardProps) {
  const now = useNow();
  const tone = severityTone(alert.severity);
  const Icon = SEVERITY_ICON[alert.severity];
  const pending = alert.status === "pending";
  const critical = pending && alert.severity === "emergency";
  const status = STATUS_META[alert.status];

  return (
    <article
      aria-label={`${SEVERITY_LABEL[alert.severity]}: ${alert.title}, ${status.label}`}
      className={cn(
        "group relative overflow-hidden rounded-2xl border transition-all duration-300",
        critical
          ? "border-danger/45 bg-gradient-to-br from-danger/[0.16] to-danger/[0.04] shadow-[0_0_0_1px_rgb(255_93_108/0.1),0_18px_50px_-20px_rgb(255_93_108/0.5)]"
          : pending
            ? "border-line-strong bg-white/[0.045]"
            : "border-line bg-white/[0.02]",
        isNew && "animate-alert-in",
        compact ? "p-3.5" : "p-4 sm:p-5",
      )}
    >
      {/* Barra de severidad */}
      <span
        className={cn("absolute inset-y-3 left-0 w-[3px] rounded-r-full", {
          "bg-danger": alert.severity === "emergency",
          "bg-warn": alert.severity === "warning",
          "bg-accent": alert.severity === "info",
          "opacity-40": !pending,
        })}
        aria-hidden
      />

      <div className="flex items-start gap-3.5 pl-1.5">
        <span
          className={cn(
            "relative mt-0.5 inline-flex size-10 shrink-0 items-center justify-center rounded-xl border",
            critical ? "border-danger/40 bg-danger/20" : "border-line bg-white/5",
            TONE_TEXT[tone],
            !pending && "opacity-60",
          )}
          aria-hidden
        >
          <Icon className="size-[1.15rem]" />
          {critical && <span className="absolute -right-0.5 -top-0.5"><StatusDot tone="danger" pulse /></span>}
        </span>

        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
            <span className={cn("text-[0.68rem] font-bold uppercase tracking-[0.14em]", TONE_TEXT[tone], !pending && "opacity-70")}>
              {SEVERITY_LABEL[alert.severity]}
            </span>
            <span className="text-xs text-ink-subtle">·</span>
            <time dateTime={alert.createdAt} className="text-xs text-ink-subtle tabular" title={new Date(alert.createdAt).toLocaleString("es-MX")}>
              {formatTime(alert.createdAt)} · {formatRelative(alert.createdAt, now)}
            </time>
          </div>
          <h3 className={cn("mt-1 font-semibold", critical ? "text-[1.05rem] text-ink" : "text-sm text-ink", !pending && "text-ink-muted")}>
            {alert.title}
          </h3>
          {!compact && <p className="mt-0.5 text-sm text-ink-muted">{alert.message}</p>}

          <div className="mt-2.5 flex flex-wrap items-center gap-2">
            {roomName && (
              <span className="inline-flex items-center gap-1 text-xs text-ink-subtle">
                <MapPin className="size-3.5" aria-hidden /> {roomName}
              </span>
            )}
            <StatusBadge tone={pending ? (critical ? "danger" : "warn") : "ok"} icon={status.icon}>
              {status.label}
            </StatusBadge>
          </div>

          {(onDetail || (pending && canAttend && onAttend)) && (
            <div className="mt-3.5 flex flex-wrap gap-2">
              {onDetail && (
                <GlassButton size="sm" variant={critical ? "outline" : "ghost"} onClick={() => onDetail(alert)}>
                  Ver detalle
                </GlassButton>
              )}
              {pending && canAttend && onAttend && (
                <GlassButton size="sm" variant={critical ? "danger" : "success"} loading={attending} onClick={() => onAttend(alert)}>
                  {!attending && <Check aria-hidden />}
                  Marcar como atendida
                </GlassButton>
              )}
            </div>
          )}
        </div>
      </div>
    </article>
  );
}
