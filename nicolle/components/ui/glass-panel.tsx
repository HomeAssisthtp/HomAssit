import { cva, type VariantProps } from "class-variance-authority";
import type { ElementType, HTMLAttributes } from "react";
import { cn } from "@/lib/utils";

/**
 * Superficie base de Liquid Glass. La profundidad (`depth`) define la jerarquía:
 *  - 1: paneles de contenido (cards, listas)
 *  - 2: piezas protagonistas / flotantes (hero, sidebar, modales)
 *  - flat: agrupaciones internas sin blur (evita glass sobre glass)
 */
export const glassPanelVariants = cva("rounded-glass sheen", {
  variants: {
    depth: {
      flat: "glass-subtle",
      1: "glass",
      2: "glass-strong",
    },
    padding: {
      none: "",
      sm: "p-4",
      md: "p-5 sm:p-6",
      lg: "p-6 sm:p-8",
    },
  },
  defaultVariants: { depth: 1, padding: "md" },
});

export interface GlassPanelProps extends HTMLAttributes<HTMLElement>, VariantProps<typeof glassPanelVariants> {
  as?: ElementType;
}

export function GlassPanel({ as: Tag = "div", depth, padding, className, ...props }: GlassPanelProps) {
  return <Tag className={cn(glassPanelVariants({ depth, padding }), className)} {...props} />;
}
