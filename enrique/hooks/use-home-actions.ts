"use client";

import { useCallback, useState } from "react";
import { useSession } from "@/components/providers/session-provider";
import { useToast } from "@/components/providers/toast-provider";
import { api } from "@/services";
import type { Alert } from "@/types";

/**
 * Acciones de negocio con feedback unificado (loading + toast).
 * Los componentes no llaman a `api` directamente.
 */
export function useAttendAlert() {
  const { session, can } = useSession();
  const toast = useToast();
  const [pendingId, setPendingId] = useState<string | null>(null);

  const attend = useCallback(
    async (alert: Alert) => {
      if (!session || !can("alerts:attend")) return;
      setPendingId(alert.id);
      try {
        await api.alerts.attend(alert.id, session.user);
        toast({ tone: "success", title: "Alerta marcada como atendida", description: alert.title });
      } catch (e) {
        toast({ tone: "error", title: "No se pudo actualizar la alerta", description: (e as Error).message });
      } finally {
        setPendingId(null);
      }
    },
    [session, can, toast],
  );

  return { attend, pendingId, allowed: can("alerts:attend") };
}

/** Envuelve una operación asíncrona con estado de carga y toasts. */
export function useAsyncAction() {
  const toast = useToast();
  const [loading, setLoading] = useState(false);
  const run = useCallback(
    async <T,>(fn: () => Promise<T>, messages: { success: string; error?: string }): Promise<T | undefined> => {
      setLoading(true);
      try {
        const r = await fn();
        toast({ tone: "success", title: messages.success });
        return r;
      } catch (e) {
        toast({ tone: "error", title: messages.error ?? "Ocurrió un error", description: (e as Error).message });
        return undefined;
      } finally {
        setLoading(false);
      }
    },
    [toast],
  );
  return { run, loading };
}
