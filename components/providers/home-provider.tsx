"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { useNow } from "@/hooks/use-now";
import { summarizeHome, type HomeStatusSummary } from "@/lib/home-status";
import { api } from "@/services";
import type { HomeSnapshot, Session } from "@/types";
import { useSession } from "./session-provider";

type LoadStatus = "loading" | "ready" | "error";

interface HomeContextValue {
  snapshot: HomeSnapshot | null;
  summary: HomeStatusSummary | null;
  status: LoadStatus;
  error: string | null;
  reload: () => void;
  /** Id de la última alerta recibida en vivo (para animar su entrada). */
  latestAlertId: string | null;
}

const HomeContext = createContext<HomeContextValue | null>(null);

/**
 * Estado vivo del hogar. Carga una instantánea y se suscribe a cambios
 * (mock: latido del simulador · producción: Supabase Realtime).
 */
export function HomeProvider({ children }: { children: ReactNode }) {
  const { session } = useSession();
  const [snapshot, setSnapshot] = useState<HomeSnapshot | null>(null);
  const [status, setStatus] = useState<LoadStatus>("loading");
  const [error, setError] = useState<string | null>(null);
  const [latestAlertId, setLatestAlertId] = useState<string | null>(null);
  const [nonce, setNonce] = useState(0);
  const knownAlerts = useRef<Set<string> | null>(null);

  useEffect(() => {
    if (snapshot) knownAlerts.current = new Set(snapshot.alerts.map((a) => a.id));
  }, [snapshot]);

  useEffect(() => {
    if (!session) return;
    let alive = true;
    setStatus("loading");
    setError(null);
    api.home
      .getSnapshot(session as Session)
      .then((s) => {
        if (!alive) return;
        setSnapshot(s);
        setStatus("ready");
      })
      .catch((e: unknown) => {
        if (!alive) return;
        setError(e instanceof Error ? e.message : "Error de conexión con el servidor");
        setStatus("error");
      });
    const unsubscribe = api.home.subscribe(session, (next) => {
      const newest = next.alerts[0];
      if (newest && knownAlerts.current && !knownAlerts.current.has(newest.id)) setLatestAlertId(newest.id);
      setSnapshot(next);
      setStatus("ready");
    });
    return () => {
      alive = false;
      unsubscribe();
    };
  }, [session, nonce]);

  const reload = useCallback(() => setNonce((n) => n + 1), []);

  // Tolerancia a fallos (RNF-11): si el ESP32 deja de sincronizar más allá del
  // tiempo configurado, se considera desconectado aunque el servidor no lo haya marcado.
  const now = useNow(5_000);
  const stale =
    snapshot?.device?.status === "connected" &&
    snapshot.device.connectedOnce &&
    now - new Date(snapshot.device.lastSyncAt).getTime() > snapshot.settings.offlineAfterSeconds * 1000;
  const effective = useMemo(
    () => (snapshot && stale ? { ...snapshot, device: { ...snapshot.device!, status: "disconnected" as const } } : snapshot),
    [snapshot, stale],
  );
  const summary = useMemo(() => (effective ? summarizeHome(effective) : null), [effective]);

  const value = useMemo(
    () => ({ snapshot: effective, summary, status, error, reload, latestAlertId }),
    [effective, summary, status, error, reload, latestAlertId],
  );
  return <HomeContext.Provider value={value}>{children}</HomeContext.Provider>;
}

export function useHome() {
  const ctx = useContext(HomeContext);
  if (!ctx) throw new Error("useHome debe usarse dentro de <HomeProvider>");
  return ctx;
}
