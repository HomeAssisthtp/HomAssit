"use client";

import { ArrowRight, Check, Cpu, Radar, Users, type LucideIcon } from "lucide-react";
import Link from "next/link";
import { GlassPanel } from "@/components/ui/glass-panel";
import { cn } from "@/lib/utils";
import type { HomeSnapshot } from "@/types";

/**
 * Primeros pasos para un hogar nuevo: HU-04 (dispositivo) → HU-05 (sensores) → HU-17 (contactos).
 * Desaparece cuando el dispositivo y al menos un sensor están configurados.
 */
export function SetupChecklist({ snapshot }: { snapshot: HomeSnapshot }) {
  const steps: Array<{ done: boolean; title: string; text: string; href: string; icon: LucideIcon; optional?: boolean }> = [
    { done: !!snapshot.device, title: "Registra tu dispositivo", text: "Asocia el ESP32 con su identificador único.", href: "/dispositivo", icon: Cpu },
    { done: snapshot.sensors.length > 0, title: "Configura tus sensores", text: "Indica el tipo, el identificador y la habitación.", href: "/sensores", icon: Radar },
    { done: snapshot.contacts.length > 0, title: "Agrega un contacto", text: "Una persona de confianza que reciba tus alertas.", href: "/contactos", icon: Users, optional: true },
  ];
  if (steps[0].done && steps[1].done) return null;
  const next = steps.findIndex((s) => !s.done);
  const doneCount = steps.filter((s) => s.done).length;

  return (
    <GlassPanel as="section" aria-labelledby="setup-title" depth={2} className="animate-fade-up">
      <div className="mb-5 flex flex-wrap items-end justify-between gap-2">
        <div>
          <p className="text-[0.7rem] font-semibold uppercase tracking-[0.2em] text-accent/80">Primeros pasos</p>
          <h2 id="setup-title" className="text-lg font-semibold text-ink">
            Configura tu hogar para empezar a monitorear
          </h2>
        </div>
        <p className="text-sm text-ink-muted tabular">
          {doneCount} de {steps.length} completados
        </p>
      </div>
      <ol className="grid gap-3 md:grid-cols-3">
        {steps.map((s, i) => {
          const current = i === next;
          return (
            <li key={s.href}>
              <Link
                href={s.href}
                aria-current={current ? "step" : undefined}
                className={cn(
                  "group flex h-full flex-col gap-3 rounded-2xl border p-4 transition-all duration-200",
                  s.done
                    ? "border-ok/25 bg-ok/[0.06]"
                    : current
                      ? "border-accent/40 bg-accent/[0.08] hover:-translate-y-0.5 hover:bg-accent/[0.12]"
                      : "border-line bg-white/[0.02] hover:bg-white/[0.04]",
                )}
              >
                <span className="flex items-center justify-between">
                  <span
                    className={cn(
                      "inline-flex size-9 items-center justify-center rounded-xl border",
                      s.done ? "border-ok/30 bg-ok/15 text-ok" : current ? "border-accent/35 bg-accent/15 text-accent" : "border-line text-ink-subtle",
                    )}
                    aria-hidden
                  >
                    {s.done ? <Check className="size-4" /> : <s.icon className="size-4" />}
                  </span>
                  <span className="text-xs text-ink-subtle">
                    Paso {i + 1}
                    {s.optional ? " · opcional" : ""}
                  </span>
                </span>
                <span>
                  <span className={cn("block text-sm font-semibold", s.done ? "text-ink-muted line-through decoration-ok/50" : "text-ink")}>
                    {s.title}
                    <span className="sr-only">{s.done ? " (completado)" : " (pendiente)"}</span>
                  </span>
                  <span className="mt-0.5 block text-sm text-ink-muted">{s.text}</span>
                </span>
                {current && (
                  <span className="mt-auto inline-flex items-center gap-1 text-sm font-medium text-accent">
                    Comenzar <ArrowRight className="size-3.5 transition-transform group-hover:translate-x-0.5" aria-hidden />
                  </span>
                )}
              </Link>
            </li>
          );
        })}
      </ol>
    </GlassPanel>
  );
}
