"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useState } from "react";
import { CapabilityGate, HomeGate } from "@/components/layout/gates";
import { Segmented } from "@/components/ui/form";
import { GlassPanel } from "@/components/ui/glass-panel";
import { PageHeader } from "@/components/ui/feedback";
import { SEVERITY_LABEL } from "@/lib/sensor-meta";
import type { AlertSeverity } from "@/types";
import { AlertList } from "./alert-list";

type StatusFilter = "pending" | "attended" | "all";

/** HU-12 / HU-15: consulta, detalle y atención de alertas. */
export function AlertsView() {
  const router = useRouter();
  const openAlertId = useSearchParams().get("alerta");
  const [status, setStatus] = useState<StatusFilter>("pending");
  const [severity, setSeverity] = useState<AlertSeverity | "all">("all");

  return (
    <CapabilityGate cap="alerts:view">
      <div className="spatial-stagger flex flex-col gap-6">
        <PageHeader eyebrow="Monitoreo" title="Alertas" description="Situaciones detectadas por el sistema que requieren o requirieron atención." />
        <HomeGate>
          {(snapshot) => {
            const pending = snapshot.alerts.filter((a) => a.status === "pending");
            const counts = {
              pending: pending.length,
              emergency: pending.filter((a) => a.severity === "emergency").length,
              attended: snapshot.alerts.length - pending.length,
            };
            const list = snapshot.alerts.filter(
              (a) => (status === "all" || a.status === status) && (severity === "all" || a.severity === severity),
            );
            return (
              <>
                <div className="grid grid-cols-3 gap-3">
                  {[
                    { k: "Pendientes", v: counts.pending, c: counts.pending ? "text-warn" : "text-ink" },
                    { k: "Emergencias", v: counts.emergency, c: counts.emergency ? "text-danger" : "text-ink" },
                    { k: "Atendidas", v: counts.attended, c: "text-ok" },
                  ].map((x) => (
                    <GlassPanel key={x.k} padding="sm">
                      <p className="text-xs text-ink-subtle">{x.k}</p>
                      <p className={`mt-1 text-2xl font-semibold tabular ${x.c}`}>{x.v}</p>
                    </GlassPanel>
                  ))}
                </div>

                <GlassPanel>
                  <div className="mb-5 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                    <Segmented
                      label="Estado de la alerta"
                      value={status}
                      onChange={setStatus}
                      options={[
                        { value: "pending", label: `Pendientes (${counts.pending})` },
                        { value: "attended", label: "Atendidas" },
                        { value: "all", label: "Todas" },
                      ]}
                    />
                    <Segmented
                      label="Tipo de alerta"
                      value={severity}
                      onChange={setSeverity}
                      options={[
                        { value: "all", label: "Todos" },
                        ...(Object.keys(SEVERITY_LABEL) as AlertSeverity[]).map((s) => ({ value: s, label: SEVERITY_LABEL[s] })),
                      ]}
                      className="max-w-full overflow-x-auto"
                    />
                  </div>
                  <AlertList
                    alerts={list}
                    openAlertId={openAlertId}
                    onDetailClose={() => openAlertId && router.replace("/alertas", { scroll: false })}
                    emptyTitle={status === "pending" ? "Sin alertas pendientes" : "No hay alertas con estos filtros"}
                    emptyDescription={status === "pending" ? "Todo en orden: no hay situaciones que requieran atención." : "Prueba con otro filtro."}
                  />
                </GlassPanel>
              </>
            );
          }}
        </HomeGate>
      </div>
    </CapabilityGate>
  );
}
