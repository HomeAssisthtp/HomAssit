"use client";

import { SearchX, Table2 } from "lucide-react";
import { useMemo, useState } from "react";
import { CapabilityGate, HomeGate } from "@/components/layout/gates";
import { useSession } from "@/components/providers/session-provider";
import { EmptyState, PageHeader } from "@/components/ui/feedback";
import { Segmented } from "@/components/ui/form";
import { GlassButton } from "@/components/ui/glass-button";
import { GlassPanel } from "@/components/ui/glass-panel";
import { applyEventFilters, DEFAULT_FILTERS, type EventFilters } from "@/lib/event-filters";
import { CONTACT_HISTORY_DAYS } from "@/lib/permissions";
import type { HomeSnapshot } from "@/types";
import { EventFiltersBar } from "./event-filters";
import { EventTable } from "./event-table";
import { EventTimeline } from "./event-timeline";

const PAGE = 40;

/** HU-13 / HU-14: historial cronológico con filtros; timeline (móvil) o tabla (escritorio). */
export function HistoryView() {
  const { can } = useSession();
  const full = can("history:full");

  return (
    <CapabilityGate cap="history:view">
      <div className="spatial-stagger flex flex-col gap-6">
        <PageHeader
          eyebrow="Monitoreo"
          title="Historial de eventos"
          description={
            full
              ? "Registro cronológico de todo lo detectado por los sensores y el dispositivo."
              : `Eventos recientes de las últimas ${CONTACT_HISTORY_DAYS * 24} horas.`
          }
        />
        <HomeGate>{(snapshot) => <HistoryContent snapshot={snapshot} full={full} />}</HomeGate>
      </div>
    </CapabilityGate>
  );
}

function HistoryContent({ snapshot, full }: { snapshot: HomeSnapshot; full: boolean }) {
  const [filters, setFilters] = useState<EventFilters>(full ? DEFAULT_FILTERS : { ...DEFAULT_FILTERS, range: "all" });
  const [view, setView] = useState<"timeline" | "table">("timeline");
  const [limit, setLimit] = useState(PAGE);
  const results = useMemo(() => applyEventFilters(snapshot.events, filters), [snapshot.events, filters]);
  const shown = results.slice(0, limit);

  return (
    <>
      <GlassPanel>
        <EventFiltersBar
          value={filters}
          onChange={(f) => {
            setFilters(f);
            setLimit(PAGE);
          }}
          sensors={snapshot.sensors}
          rooms={snapshot.rooms}
          ranges={full ? ["today", "7d", "30d", "custom"] : ["all", "today"]}
        />
      </GlassPanel>

      <GlassPanel padding="none" className="overflow-hidden">
        <div className="flex items-center justify-between gap-3 border-b border-line px-5 py-3.5 sm:px-6">
          <p className="text-sm text-ink-muted" aria-live="polite">
            <span className="font-semibold text-ink tabular">{results.length}</span> {results.length === 1 ? "evento" : "eventos"}
          </p>
          <div className="hidden md:block">
            <Segmented
              label="Vista"
              value={view}
              onChange={setView}
              options={[
                { value: "timeline", label: "Línea de tiempo" },
                { value: "table", label: "Tabla" },
              ]}
            />
          </div>
        </div>

        {results.length === 0 ? (
          <EmptyState
            icon={SearchX}
            title="No hay eventos con estos filtros"
            description="Cambia el periodo, el sensor o el tipo de evento."
            action={
              <GlassButton size="sm" onClick={() => setFilters(DEFAULT_FILTERS)}>
                Limpiar filtros
              </GlassButton>
            }
          />
        ) : (
          <>
            <div className={view === "table" ? "md:hidden" : ""}>
              <div className="p-5 sm:p-6">
                <EventTimeline events={shown} rooms={snapshot.rooms} sensors={snapshot.sensors} />
              </div>
            </div>
            {view === "table" && (
              <div className="hidden md:block">
                <EventTable events={shown} rooms={snapshot.rooms} sensors={snapshot.sensors} alerts={snapshot.alerts} />
              </div>
            )}
            {results.length > limit && (
              <div className="flex justify-center border-t border-line p-4">
                <GlassButton size="sm" onClick={() => setLimit((l) => l + PAGE)}>
                  <Table2 aria-hidden /> Mostrar más ({results.length - limit} restantes)
                </GlassButton>
              </div>
            )}
          </>
        )}
      </GlassPanel>
    </>
  );
}
