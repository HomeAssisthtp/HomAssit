"use client";

import { ArrowRight, Bell, CheckCircle2, History } from "lucide-react";
import Link from "next/link";
import { AlertList } from "@/components/alerts/alert-list";
import { EventTimeline } from "@/components/history/event-timeline";
import { HomeGate } from "@/components/layout/gates";
import { useSession } from "@/components/providers/session-provider";
import { DeviceStatus } from "@/components/sensors/device-status";
import { DoorStatusCard, GasSensorCard, MotionCard, TemperatureCard } from "@/components/sensors/sensor-cards";
import { EmptyState, Skeleton } from "@/components/ui/feedback";
import { GlassPanel } from "@/components/ui/glass-panel";
import { computeStats } from "@/lib/stats";
import { cn } from "@/lib/utils";
import { HomeStatusCard } from "./home-status-card";
import { SetupChecklist } from "./setup-checklist";

export function DashboardView() {
  const { session, can } = useSession();
  const firstName = session?.user.name.split(" ")[0];

  return (
    <HomeGate skeleton={<DashboardSkeleton />}>
      {(snapshot, summary) => {
        const online = snapshot.device?.status === "connected";
        const byType = (t: string) => snapshot.sensors.filter((s) => s.type === t);
        const pendingAlerts = snapshot.alerts.filter((a) => a.status === "pending");
        const visibleAlerts = pendingAlerts.length ? pendingAlerts : snapshot.alerts.slice(0, 2);
        const stats = can("stats:view") ? computeStats(snapshot, "7d") : null;
        const common = { settings: snapshot.settings, online, rooms: snapshot.rooms };
        const hasPending = pendingAlerts.length > 0;
        const isContact = session?.user.role === "contact";

        return (
          <div className="flex flex-col gap-5 lg:gap-6">
            <p className="text-sm text-ink-muted">
              Hola, <span className="text-ink">{firstName}</span>.{" "}
              {isContact ? "Estás viendo el hogar que te autorizaron a consultar." : "Esto es lo que pasa en tu casa ahora mismo."}
            </p>

            {can("device:manage") && <SetupChecklist snapshot={snapshot} />}

            <HomeStatusCard summary={summary} snapshot={snapshot} />

            <div className="grid gap-5 lg:grid-cols-12 lg:gap-6">
              {/* Sensores: objetos independientes en el espacio */}
              <section
                aria-labelledby="sensores-title"
                className={cn("lg:col-span-8", hasPending && can("alerts:view") ? "order-2 lg:order-none" : "")}
              >
                <h2 id="sensores-title" className="sr-only">Sensores</h2>
                <div className="grid gap-4 sm:grid-cols-2">
                  <TemperatureCard sensors={byType("temperature")} readings={snapshot.readings} {...common} className="spatial-float [--enter-delay:80ms] [--float-duration:8s]" />
                  <MotionCard sensors={byType("motion")} online={online} rooms={snapshot.rooms} className="spatial-float [--enter-delay:160ms] [--float-duration:9.5s]" />
                  <DoorStatusCard sensor={byType("door")[0]} {...common} className="spatial-float [--enter-delay:240ms] [--float-duration:10.5s]" />
                  <GasSensorCard sensor={byType("gas")[0]} {...common} className="spatial-float [--enter-delay:320ms] [--float-duration:8.8s]" />
                </div>
              </section>

              <aside className={cn("flex flex-col gap-4 lg:col-span-4", hasPending ? "order-3 lg:order-none" : "")} aria-label="Dispositivo y resumen">
                <DeviceStatus device={snapshot.device} sensorsCount={snapshot.sensors.filter((s) => s.enabled).length} className="spatial-float [--enter-delay:200ms] [--float-duration:11s]" />
                {stats && (
                  <GlassPanel className="spatial-enter [--enter-delay:300ms]">
                    <div className="mb-4 flex items-center justify-between">
                      <h2 className="text-sm font-semibold text-ink">Últimos 7 días</h2>
                      <Link href="/estadisticas" className="text-xs font-medium text-accent hover:underline">
                        Estadísticas
                      </Link>
                    </div>
                    <dl className="grid grid-cols-3 gap-2 text-center">
                      {[
                        { k: "Eventos", v: stats.totalEvents, icon: History },
                        { k: "Alertas", v: stats.totalAlerts, icon: Bell },
                        { k: "Atendidas", v: stats.attended, icon: CheckCircle2 },
                      ].map((x) => (
                        <div key={x.k} className="rounded-xl glass-subtle px-2 py-3">
                          <dd className="text-xl font-semibold text-ink tabular">{x.v}</dd>
                          <dt className="mt-0.5 flex items-center justify-center gap-1 text-[0.7rem] text-ink-subtle">
                            <x.icon className="size-3" aria-hidden /> {x.k}
                          </dt>
                        </div>
                      ))}
                    </dl>
                  </GlassPanel>
                )}
              </aside>

              {can("alerts:view") && (
                <GlassPanel
                  as="section"
                  aria-labelledby="alertas-title"
                  className={cn("spatial-enter [--enter-delay:380ms] lg:col-span-7", hasPending ? "order-1 lg:order-none" : "")}
                >
                  <div className="mb-4 flex items-center justify-between gap-3">
                    <div className="flex items-center gap-2.5">
                      <h2 id="alertas-title" className="text-base font-semibold text-ink">
                        Alertas
                      </h2>
                      <span className={cn("rounded-full px-2 py-0.5 text-xs font-semibold tabular", hasPending ? "bg-warn/15 text-warn" : "bg-ok/12 text-ok")}>
                        {hasPending ? `${pendingAlerts.length} activa${pendingAlerts.length > 1 ? "s" : ""}` : "0 activas"}
                      </span>
                    </div>
                    <Link href="/alertas" className="inline-flex items-center gap-1 text-sm font-medium text-accent hover:underline">
                      Ver todas <ArrowRight className="size-3.5" aria-hidden />
                    </Link>
                  </div>
                  {!hasPending && (
                    <p className="mb-3 flex items-center gap-2 rounded-xl border border-ok/20 bg-ok/[0.06] px-3.5 py-2.5 text-sm text-ok">
                      <CheckCircle2 className="size-4" aria-hidden /> No hay alertas activas. Estas son las más recientes:
                    </p>
                  )}
                  <AlertList alerts={visibleAlerts} compact={!hasPending} />
                </GlassPanel>
              )}

              {can("history:view") ? (
                <GlassPanel as="section" aria-labelledby="actividad-title" className={cn(can("alerts:view") ? "lg:col-span-5" : "lg:col-span-12", "spatial-enter [--enter-delay:460ms] order-4 lg:order-none")}>
                  <div className="mb-4 flex items-center justify-between">
                    <h2 id="actividad-title" className="text-base font-semibold text-ink">
                      Actividad reciente
                    </h2>
                    <Link href="/historial" className="inline-flex items-center gap-1 text-sm font-medium text-accent hover:underline">
                      Historial <ArrowRight className="size-3.5" aria-hidden />
                    </Link>
                  </div>
                  {snapshot.events.length ? (
                    <EventTimeline events={snapshot.events.slice(0, 6)} rooms={snapshot.rooms} sensors={snapshot.sensors} groupByDay={false} />
                  ) : (
                    <EmptyState icon={History} title="Sin actividad reciente" />
                  )}
                </GlassPanel>
              ) : null}
            </div>
          </div>
        );
      }}
    </HomeGate>
  );
}

function DashboardSkeleton() {
  return (
    <div className="flex flex-col gap-6" aria-busy="true" aria-label="Cargando dashboard">
      <Skeleton className="h-5 w-72" />
      <Skeleton className="h-[19rem] w-full rounded-[1.75rem]" />
      <div className="grid gap-5 lg:grid-cols-12">
        <div className="grid gap-4 sm:grid-cols-2 lg:col-span-8">
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-48 rounded-glass" />
          ))}
        </div>
        <div className="flex flex-col gap-4 lg:col-span-4">
          <Skeleton className="h-52 rounded-glass" />
          <Skeleton className="h-40 rounded-glass" />
        </div>
      </div>
    </div>
  );
}
