"use client";

import { useEffect, useRef } from "react";

/**
 * Fondo ambiental con profundidad: orbes de luz en tres planos que derivan
 * lentamente y responden al cursor con paralaje, sobre un piso en perspectiva.
 */
export function SpatialBackground() {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = ref.current;
    if (!el || window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    let frame = 0;
    const onMove = (e: PointerEvent) => {
      if (e.pointerType !== "mouse") return;
      cancelAnimationFrame(frame);
      frame = requestAnimationFrame(() => {
        el.style.setProperty("--px", ((e.clientX / window.innerWidth - 0.5) * 2).toFixed(3));
        el.style.setProperty("--py", ((e.clientY / window.innerHeight - 0.5) * 2).toFixed(3));
      });
    };
    window.addEventListener("pointermove", onMove, { passive: true });
    return () => {
      window.removeEventListener("pointermove", onMove);
      cancelAnimationFrame(frame);
    };
  }, []);

  // Cada orbe se desplaza según su "distancia": los cercanos se mueven más (paralaje).
  const parallax = (px: number) => ({
    transform: `translate3d(calc(var(--px, 0) * ${px}px), calc(var(--py, 0) * ${px}px), 0)`,
    transition: "transform 0.9s cubic-bezier(0.2, 0.8, 0.2, 1)",
  });

  return (
    <div ref={ref} className="pointer-events-none fixed inset-0 -z-10 overflow-hidden" aria-hidden>
      <div className="ambient-bg absolute inset-0" />

      <div className="absolute inset-0" style={parallax(-14)}>
        <div className="absolute -left-[10%] -top-[18%] size-[46rem] rounded-full bg-radial from-accent/14 via-accent/4 to-transparent blur-3xl animate-[orb-drift_38s_ease-in-out_infinite]" />
      </div>
      <div className="absolute inset-0" style={parallax(-26)}>
        <div className="absolute -right-[12%] top-[6%] size-[40rem] rounded-full bg-radial from-electric/16 via-electric/4 to-transparent blur-3xl animate-[orb-drift_46s_ease-in-out_infinite_reverse]" />
      </div>
      <div className="absolute inset-0" style={parallax(-44)}>
        <div className="absolute bottom-[-22%] left-[32%] size-[34rem] rounded-full bg-radial from-ok/10 via-accent/4 to-transparent blur-3xl animate-[orb-drift_30s_ease-in-out_infinite]" />
        <div className="absolute left-[58%] top-[38%] size-40 rounded-full bg-radial from-white/8 to-transparent blur-2xl animate-[orb-drift_22s_ease-in-out_infinite_reverse]" />
      </div>

      <div className="space-floor absolute inset-x-[-60%] bottom-0 h-[170vh]" />
    </div>
  );
}
