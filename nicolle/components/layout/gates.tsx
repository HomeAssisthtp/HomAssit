"use client";

import type { ReactNode } from "react";
import { useHome } from "@/components/providers/home-provider";
import { useSession } from "@/components/providers/session-provider";
import { ErrorState, RestrictedState, Skeleton } from "@/components/ui/feedback";
import { GlassPanel } from "@/components/ui/glass-panel";
import type { HomeStatusSummary } from "@/lib/home-status";
import type { Capability } from "@/lib/permissions";
import type { HomeSnapshot } from "@/types";

/** Resuelve loading / error antes de renderizar una vista con datos del hogar. */
export function HomeGate({
  children,
  skeleton,
}: {
  children: (snapshot: HomeSnapshot, summary: HomeStatusSummary) => ReactNode;
  skeleton?: ReactNode;
}) {
  const { snapshot, summary, status, error, reload } = useHome();
  if (status === "error" && !snapshot) {
    return (
      <GlassPanel>
        <ErrorState message={error ?? "Error desconocido"} onRetry={reload} />
      </GlassPanel>
    );
  }
  if (!snapshot || !summary) return <>{skeleton ?? <DefaultSkeleton />}</>;
  return <>{children(snapshot, summary)}</>;
}

/** Oculta una vista si el rol no tiene el permiso (la navegación ya la oculta). */
export function CapabilityGate({ cap, children, description }: { cap: Capability; children: ReactNode; description?: string }) {
  const { can } = useSession();
  if (!can(cap)) {
    return (
      <GlassPanel className="mt-6">
        <RestrictedState description={description} />
      </GlassPanel>
    );
  }
  return <>{children}</>;
}

function DefaultSkeleton() {
  return (
    <div className="flex flex-col gap-4" aria-busy="true" aria-label="Cargando">
      <Skeleton className="h-10 w-64" />
      <Skeleton className="h-24 w-full" />
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {Array.from({ length: 6 }).map((_, i) => (
          <Skeleton key={i} className="h-40" />
        ))}
      </div>
    </div>
  );
}
