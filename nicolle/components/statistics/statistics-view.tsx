"use client";

import { Bell, CheckCircle2, Clock, History, Timer } from "lucide-react";
import { useState } from "react";
import { CapabilityGate, HomeGate } from "@/components/layout/gates";
import { PageHeader } from "@/components/ui/feedback";
import { Segmented } from "@/components/ui/form";
import { GlassPanel } from "@/components/ui/glass-panel";
import { SENSOR_TYPE_META } from "@/lib/sensor-meta";
import { computeStats, type StatsPeriod } from "@/lib/stats";
import { BarList, ColumnChart, SegmentBar, StatsCard } from "./charts";

const PERIOD_LABEL: Record<StatsPeriod, string> = { "24h": "últimas 24 horas", "7d": "últimos 7 días", "30d": "últimos 30 días" };

/** HU-16: estadísticas de eventos y alertas por periodo, calculadas de los datos almacenados. */
export function StatisticsView() {
  const [period, setPeriod] = useState<StatsPeriod>("7d");
  const [showTable, setShowTable] = useState(false);

  return (
    <CapabilityGate cap="stats:view">
      <div className="spatial-stagger flex flex-col gap-6">
        <PageHeader
          eyebrow="Análisis"
          title="Estadísticas"
          description={`Actividad del sistema en los ${PERIOD_LABEL[period]}.`}
          actions={
            <Segmented
              label="Periodo"
              value={period}
              onChange={setPeriod}
              options={[
                { value: "24h", label: "24 h" },
                { value: "7d", label: "7 días" },
                { value: "30d", label: "30 días" },
              ]}
            />
          }
        />
        <HomeGate>
          {(snapshot) => {
            const s = computeStats(snapshot, period);
            return (
              <>
                <div className="grid grid-cols-1 gap-3 min-[420px]:grid-cols-2 xl:grid-cols-4">
                  <StatsCard icon={History} label="Total de eventos" value={s.totalEvents} tone="accent" />
                  <StatsCard icon={Bell} label="Total de alertas" value={s.totalAlerts} tone="warn" />
                  <StatsCard
                    icon={CheckCircle2}
                    label="Alertas atendidas"
                    value={s.attended}
                    tone="ok"
                    hint={s.avgResponseMin !== null ? `Respuesta media: ${s.avgResponseMin} min` : undefined}
                  />
                  <StatsCard icon={Clock} label="Alertas pendientes" value={s.pending} tone={s.pending ? "danger" : "ok"} />
                </div>

                <div className="grid gap-5 lg:grid-cols-5">
                  <GlassPanel as="section" aria-labelledby="actividad-periodo" className="lg:col-span-3">
                    <div className="mb-5 flex items-start justify-between gap-3">
                      <div>
                        <h2 id="actividad-periodo" className="text-base font-semibold text-ink">
                          Actividad por periodo
                        </h2>
                        <p className="text-xs text-ink-subtle">Eventos registrados por {period === "24h" ? "hora" : "día"}</p>
                      </div>
                      <button onClick={() => setShowTable((v) => !v)} className="text-xs font-medium text-accent hover:underline" aria-expanded={showTable}>
                        {showTable ? "Ver gráfico" : "Ver tabla"}
                      </button>
                    </div>
                    {showTable ? (
                      <div className="max-h-64 overflow-y-auto">
                        <table className="w-full text-sm">
                          <caption className="sr-only">Eventos por periodo</caption>
                          <thead>
                            <tr className="text-left text-xs text-ink-subtle">
                              <th scope="col" className="py-2 font-medium">Periodo</th>
                              <th scope="col" className="py-2 text-right font-medium">Eventos</th>
                            </tr>
                          </thead>
                          <tbody>
                            {s.buckets.map((b) => (
                              <tr key={b.start} className="border-t border-line/60">
                                <td className="py-2 text-ink-muted">{b.full}</td>
                                <td className="py-2 text-right font-medium text-ink tabular">{b.value}</td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    ) : (
                      <ColumnChart data={s.buckets} height={220} />
                    )}
                  </GlassPanel>

                  <GlassPanel as="section" aria-labelledby="por-sensor" className="lg:col-span-2">
                    <h2 id="por-sensor" className="text-base font-semibold text-ink">
                      Eventos por sensor
                    </h2>
                    <p className="mb-5 text-xs text-ink-subtle">Qué sensores registran más actividad</p>
                    {s.bySensor.length ? (
                      <BarList
                        data={[
                          ...s.bySensor.slice(0, 6).map((x) => ({ label: x.sensor.name, sub: x.room, value: x.value, icon: SENSOR_TYPE_META[x.sensor.type].icon })),
                          ...(s.deviceEvents ? [{ label: "Dispositivo ESP32", value: s.deviceEvents }] : []),
                        ]}
                      />
                    ) : (
                      <p className="text-sm text-ink-muted">Sin eventos en este periodo.</p>
                    )}
                  </GlassPanel>
                </div>

                <GlassPanel as="section" aria-labelledby="alertas-tipo">
                  <div className="grid gap-6 md:grid-cols-[1fr_auto] md:items-center">
                    <div>
                      <h2 id="alertas-tipo" className="text-base font-semibold text-ink">
                        Alertas por tipo
                      </h2>
                      <p className="mb-4 text-xs text-ink-subtle">Distribución de las {s.totalAlerts} alertas del periodo</p>
                      <SegmentBar
                        segments={[
                          { label: "Emergencia", value: s.bySeverity.emergency, className: "bg-danger" },
                          { label: "Advertencia", value: s.bySeverity.warning, className: "bg-warn" },
                          { label: "Informativa", value: s.bySeverity.info, className: "bg-accent" },
                        ]}
                      />
                    </div>
                    <div className="flex items-center gap-3 rounded-2xl glass-subtle px-5 py-4">
                      <Timer className="size-5 text-ink-subtle" aria-hidden />
                      <div>
                        <p className="text-xs text-ink-subtle">Tasa de atención</p>
                        <p className="text-xl font-semibold text-ink tabular">
                          {s.totalAlerts ? Math.round((s.attended / s.totalAlerts) * 100) : 100}%
                        </p>
                      </div>
                    </div>
                  </div>
                </GlassPanel>
              </>
            );
          }}
        </HomeGate>
      </div>
    </CapabilityGate>
  );
}
