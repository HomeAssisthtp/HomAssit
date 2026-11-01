"use client";

import { ShieldCheck } from "lucide-react";
import { useEffect, useState } from "react";
import { useHome } from "@/components/providers/home-provider";
import { EmptyState } from "@/components/ui/feedback";
import { useAttendAlert } from "@/hooks/use-home-actions";
import type { Alert } from "@/types";
import { AlertCard } from "./alert-card";
import { AlertDetailModal } from "./alert-detail-modal";

/**
 * Lista de alertas con detalle y atención integrados.
 * Ordena: emergencias pendientes → pendientes → atendidas (más recientes primero).
 */
export function AlertList({
  alerts,
  compact,
  emptyTitle = "Sin alertas activas",
  emptyDescription = "Tu hogar no tiene situaciones que requieran atención.",
  openAlertId,
  onDetailClose,
}: {
  alerts: Alert[];
  compact?: boolean;
  emptyTitle?: string;
  emptyDescription?: string;
  /** Abre el detalle de esta alerta al montar (enlaces directos desde notificaciones). */
  openAlertId?: string | null;
  onDetailClose?: () => void;
}) {
  const { snapshot, latestAlertId } = useHome();
  const { attend, pendingId, allowed } = useAttendAlert();
  const [detailId, setDetailId] = useState<string | null>(openAlertId ?? null);
  useEffect(() => {
    if (openAlertId) setDetailId(openAlertId);
  }, [openAlertId]);

  if (!snapshot) return null;
  const detail = snapshot.alerts.find((a) => a.id === detailId) ?? null;
  const closeDetail = () => {
    setDetailId(null);
    onDetailClose?.();
  };

  const rank = (a: Alert) => (a.status === "pending" ? (a.severity === "emergency" ? 0 : a.severity === "warning" ? 1 : 2) : 3);
  const sorted = [...alerts].sort((a, b) => rank(a) - rank(b) || b.createdAt.localeCompare(a.createdAt));
  const roomName = (id?: string) => snapshot.rooms.find((r) => r.id === id)?.name;

  return (
    <>
      {sorted.length === 0 && <EmptyState icon={ShieldCheck} title={emptyTitle} description={emptyDescription} />}
      <ul className={sorted.length ? "flex flex-col gap-2.5" : "hidden"} aria-live="polite">
        {sorted.map((a) => (
          <li key={a.id}>
            <AlertCard
              alert={a}
              roomName={roomName(a.roomId)}
              compact={compact}
              isNew={a.id === latestAlertId}
              canAttend={allowed}
              attending={pendingId === a.id}
              onAttend={attend}
              onDetail={(a) => setDetailId(a.id)}
            />
          </li>
        ))}
      </ul>
      <AlertDetailModal
        alert={detail}
        snapshot={snapshot}
        onClose={closeDetail}
        onAttend={async (a) => {
          await attend(a);
        }}
        canAttend={allowed}
        attending={!!detail && pendingId === detail.id}
      />
    </>
  );
}
