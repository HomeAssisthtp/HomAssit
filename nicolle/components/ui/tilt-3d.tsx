"use client";

import { useEffect, useRef, type ElementType, type HTMLAttributes, type PointerEvent, type ReactNode } from "react";
import { cn } from "@/lib/utils";

export interface Tilt3DProps extends HTMLAttributes<HTMLElement> {
  as?: ElementType;
  /** Inclinación máxima en grados. Piezas grandes usan menos. */
  max?: number;
  /** Cuánto se acerca al usuario al pasar el cursor (px en Z). */
  lift?: number;
  glare?: boolean;
  disabled?: boolean;
  /** Clases del fondo (vidrio). Va en una capa hermana para no aplanar el 3D del contenido. */
  surfaceClassName?: string;
  surface?: ReactNode;
}

/**
 * Plantilla base de Spatial UI: una superficie que se inclina hacia el cursor.
 * Los hijos directos pueden separarse en profundidad con `translate-z-*`.
 * Sin efecto en pantallas táctiles ni con "reducir movimiento".
 */
export function Tilt3D({
  as: Tag = "div",
  max = 5,
  lift = 14,
  glare = true,
  disabled,
  surfaceClassName,
  surface,
  className,
  children,
  ...props
}: Tilt3DProps) {
  const ref = useRef<HTMLElement>(null);
  const frame = useRef(0);
  const reduced = useRef(false);

  useEffect(() => {
    const mq = window.matchMedia("(prefers-reduced-motion: reduce)");
    reduced.current = mq.matches;
    const onChange = () => (reduced.current = mq.matches);
    mq.addEventListener("change", onChange);
    return () => {
      mq.removeEventListener("change", onChange);
      cancelAnimationFrame(frame.current);
    };
  }, []);

  const onPointerMove = (e: PointerEvent<HTMLElement>) => {
    props.onPointerMove?.(e);
    if (disabled || reduced.current || e.pointerType !== "mouse") return;
    const el = ref.current;
    if (!el) return;
    const r = el.getBoundingClientRect();
    const x = Math.min(1, Math.max(0, (e.clientX - r.left) / r.width));
    const y = Math.min(1, Math.max(0, (e.clientY - r.top) / r.height));
    cancelAnimationFrame(frame.current);
    frame.current = requestAnimationFrame(() => {
      el.style.setProperty("--ry", `${((x - 0.5) * 2 * max).toFixed(2)}deg`);
      el.style.setProperty("--rx", `${(-(y - 0.5) * 2 * max).toFixed(2)}deg`);
      el.style.setProperty("--tz", `${lift}px`);
      el.style.setProperty("--mx", `${(x * 100).toFixed(1)}%`);
      el.style.setProperty("--my", `${(y * 100).toFixed(1)}%`);
      el.dataset.tilting = "";
    });
  };

  const onPointerLeave = (e: PointerEvent<HTMLElement>) => {
    props.onPointerLeave?.(e);
    const el = ref.current;
    if (!el) return;
    cancelAnimationFrame(frame.current);
    for (const v of ["--rx", "--ry", "--tz"]) el.style.removeProperty(v);
    delete el.dataset.tilting;
  };

  return (
    <Tag ref={ref} {...props} className={cn("tilt3d", className)} onPointerMove={onPointerMove} onPointerLeave={onPointerLeave}>
      <span className={cn("tilt3d-surface", surfaceClassName)} aria-hidden>
        {surface}
      </span>
      {children}
      {glare && <span className="tilt3d-glare" aria-hidden />}
    </Tag>
  );
}
