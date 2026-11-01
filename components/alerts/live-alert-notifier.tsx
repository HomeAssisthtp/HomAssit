"use client";

import { useEffect, useRef } from "react";
import { useHome } from "@/components/providers/home-provider";
import { useSession } from "@/components/providers/session-provider";
import { useToast } from "@/components/providers/toast-provider";
import { SEVERITY_LABEL } from "@/lib/sensor-meta";

/**
 * Sistema de notificaciones interno (objetivo específico del proyecto):
 * avisa en pantalla cuando llega una alerta nueva y refleja las pendientes
 * en el título de la pestaña, visible aunque el usuario esté en otra sección.
 */
export function LiveAlertNotifier() {
  const { snapshot, latestAlertId } = useHome();
  const { can } = useSession();
  const toast = useToast();
  const notified = useRef<string | null>(null);
  const allowed = can("alerts:view");

  useEffect(() => {
    if (!allowed || !snapshot || !latestAlertId || notified.current === latestAlertId) return;
    const alert = snapshot.alerts.find((a) => a.id === latestAlertId);
    if (!alert || alert.status !== "pending") return;
    notified.current = latestAlertId;
    const room = snapshot.rooms.find((r) => r.id === alert.roomId)?.name;
    toast({
      tone: alert.severity === "emergency" ? "emergency" : alert.severity === "warning" ? "error" : "info",
      title: `${SEVERITY_LABEL[alert.severity]}: ${alert.title}`,
      description: room ? `${room} · ${alert.message}` : alert.message,
      action: { label: "Ver detalle", href: `/alertas?alerta=${alert.id}` },
      duration: alert.severity === "emergency" ? 10_000 : 7_000,
    });
  }, [allowed, snapshot, latestAlertId, toast]);

  const pending = allowed ? (snapshot?.alerts.filter((a) => a.status === "pending").length ?? 0) : 0;
  useEffect(() => {
    const base = document.title.replace(/^\(\d+\)\s/, "");
    document.title = pending ? `(${pending}) ${base}` : base;
  });

  return null;
}
