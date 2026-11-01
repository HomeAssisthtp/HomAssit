"use client";

import { Check, Siren } from "lucide-react";
import { useState } from "react";
import { useHome } from "@/components/providers/home-provider";
import { useSession } from "@/components/providers/session-provider";
import { GlassButton } from "@/components/ui/glass-button";
import { useAttendAlert } from "@/hooks/use-home-actions";
import { formatTime } from "@/lib/format";
import type { Alert } from "@/types";
import { AlertDetailModal } from "./alert-detail-modal";

/**
 * Aviso persistente en todas las pantallas mientras exista una emergencia
 * pendiente (HU-10: "la plataforma deberá mostrar la alerta de forma destacada").
 * Destaca sin bloquear la navegación.
 */
export function EmergencyBanner() {
  const { snapshot } = useHome();
  const { can } = useSession();
  const { attend, pendingId, allowed } = useAttendAlert();
  const [detail, setDetail] = useState<Alert | null>(null);

  if (!snapshot || !can("alerts:view")) return null;
  const emergencies = snapshot.alerts.filter((a) => a.status === "pending" && a.severity === "emergency");
  const top = emergencies[0];
  if (!top) return null;
  const room = snapshot.rooms.find((r) => r.id === top.roomId)?.name;

  return (
    <div className="px-4 pt-3 sm:px-6 lg:px-8">
      <div
        role="alert"
        className="mx-auto flex max-w-[1400px] animate-alert-in flex-col gap-3 rounded-2xl border border-danger/50 bg-gradient-to-r from-danger/25 via-danger/12 to-danger/5 p-3 pl-4 shadow-[0_20px_50px_-24px_rgb(255_93_108/0.7)] backdrop-blur-xl sm:flex-row sm:items-center"
      >
        <div className="flex min-w-0 flex-1 items-center gap-3">
          <span className="relative inline-flex size-10 shrink-0 items-center justify-center rounded-xl bg-danger text-white">
            <span className="absolute inset-0 rounded-xl bg-danger animate-pulse-ring" aria-hidden />
            <Siren className="relative size-5" aria-hidden />
          </span>
          <div className="min-w-0">
            <p className="text-[0.68rem] font-bold uppercase tracking-[0.16em] text-danger">
              Emergencia{emergencies.length > 1 ? ` · ${emergencies.length} activas` : ""}
            </p>
            <p className="truncate font-semibold text-ink">
              {top.title}
              <span className="font-normal text-ink-muted">
                {" "}
                · {room ?? "Hogar"} · <time dateTime={top.createdAt}>{formatTime(top.createdAt)}</time>
              </span>
            </p>
          </div>
        </div>
        <div className="flex gap-2">
          <GlassButton size="sm" variant="outline" className="flex-1 sm:flex-none" onClick={() => setDetail(top)}>
            Ver detalle
          </GlassButton>
          {allowed && (
            <GlassButton size="sm" variant="danger" className="flex-1 sm:flex-none" loading={pendingId === top.id} onClick={() => attend(top)}>
              {pendingId !== top.id && <Check aria-hidden />} Marcar atendida
            </GlassButton>
          )}
        </div>
      </div>
      <AlertDetailModal
        alert={detail}
        snapshot={snapshot}
        onClose={() => setDetail(null)}
        onAttend={attend}
        canAttend={allowed}
        attending={!!detail && pendingId === detail.id}
      />
    </div>
  );
}
