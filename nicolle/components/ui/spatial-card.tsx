import type { ElementType, HTMLAttributes } from "react";
import { cn } from "@/lib/utils";
import { Tilt3D } from "./tilt-3d";

const PADDING = { none: "", sm: "p-4", md: "p-5 sm:p-6", lg: "p-6 sm:p-8" } as const;
const SURFACE = { flat: "glass-subtle", 1: "glass", 2: "glass-strong" } as const;

export interface SpatialCardProps extends HTMLAttributes<HTMLElement> {
  as?: ElementType;
  depth?: keyof typeof SURFACE;
  padding?: keyof typeof PADDING;
  /** false = panel estático (sin inclinación). */
  interactive?: boolean;
  /** Inclinación máxima en grados. */
  tilt?: number;
}

/**
 * Card espacial: objeto de vidrio flotante que se inclina hacia el cursor.
 * Sus hijos directos pueden salir en profundidad con `translate-z-*`.
 * Para animar la entrada/flotación: `spatial-enter` o `spatial-float` + `[--enter-delay:120ms]`.
 */
export function SpatialCard({ depth = 1, padding = "md", interactive = true, tilt = 5, className, ...props }: SpatialCardProps) {
  return (
    <Tilt3D
      max={tilt}
      disabled={!interactive}
      glare={interactive}
      surfaceClassName={SURFACE[depth]}
      className={cn("rounded-glass", PADDING[padding], className)}
      {...props}
    />
  );
}
