"use client";

import { Activity, DoorClosed, DoorOpen, FlaskConical, RotateCcw, Siren, Thermometer, Wifi, WifiOff, Wind, X } from "lucide-react";
import { useState } from "react";
import { useHome } from "@/components/providers/home-provider";
import { simulator } from "@/services";
import { cn } from "@/lib/utils";

/**
 * Herramienta de demostración (no forma parte del alcance funcional):
 * emula lo que enviaría el ESP32 de la maqueta para validar los estados
 * de la interfaz sin hardware. Desaparece cuando se conecta Supabase.
 */
export function DemoPanel() {
  const [open, setOpen] = useState(false);
  const { snapshot } = useHome();
  if (!simulator || !snapshot?.device) return null;
  const online = snapshot.device.status === "connected";
  const doorOpen = snapshot.sensors.some((s) => s.type === "door" && s.lastReading?.value === 1);

  const actions = [
    { label: "Presionar botón SOS", icon: Siren, run: simulator.pressSos, tone: "text-danger", disabled: !online },
    { label: "Detectar humo / gas", icon: Wind, run: simulator.detectGas, tone: "text-danger", disabled: !online },
    { label: "Temperatura elevada", icon: Thermometer, run: simulator.heatUp, tone: "text-warn", disabled: !online },
    doorOpen
      ? { label: "Cerrar puerta", icon: DoorClosed, run: simulator.closeDoor, tone: "text-ok", disabled: !online }
      : { label: "Abrir puerta", icon: DoorOpen, run: simulator.openDoor, tone: "text-warn", disabled: !online },
    { label: "Detectar movimiento", icon: Activity, run: simulator.detectMotion, tone: "text-accent", disabled: !online },
    online
      ? { label: "Desconectar ESP32", icon: WifiOff, run: () => simulator!.setConnection(false), tone: "text-offline", disabled: false }
      : { label: "Reconectar ESP32", icon: Wifi, run: () => simulator!.setConnection(true), tone: "text-ok", disabled: false },
  ];

  return (
    <div className="fixed bottom-[5.5rem] right-4 z-40 flex flex-col items-end gap-2 lg:bottom-6 lg:right-6">
      {open && (
        <div
          id="demo-panel"
          className="glass-strong w-72 animate-alert-in rounded-2xl p-3"
          style={{ background: "rgb(14 22 40 / 0.94)" }}
          role="dialog"
          aria-label="Simulador del dispositivo"
        >
          <div className="flex items-start justify-between gap-2 px-1 pb-2">
            <div>
              <p className="text-sm font-semibold text-ink">Simulador ESP32</p>
              <p className="text-xs text-ink-subtle">Modo demo · emula eventos de la maqueta</p>
            </div>
            <button onClick={() => setOpen(false)} className="rounded-md p-1 text-ink-subtle hover:text-ink" aria-label="Cerrar simulador">
              <X className="size-4" />
            </button>
          </div>
          <ul className="flex flex-col gap-1">
            {actions.map((a) => (
              <li key={a.label}>
                <button
                  onClick={a.run}
                  disabled={a.disabled}
                  className="flex h-10 w-full items-center gap-3 rounded-xl px-3 text-left text-sm text-ink transition-colors hover:bg-white/[0.06] disabled:opacity-40"
                >
                  <a.icon className={cn("size-4", a.tone)} aria-hidden />
                  {a.label}
                </button>
              </li>
            ))}
          </ul>
          <button
            onClick={simulator.reset}
            className="mt-2 flex h-9 w-full items-center justify-center gap-2 rounded-xl border border-line text-xs text-ink-muted hover:bg-white/[0.04]"
          >
            <RotateCcw className="size-3.5" aria-hidden /> Restablecer datos demo
          </button>
        </div>
      )}
      <button
        onClick={() => setOpen((o) => !o)}
        aria-expanded={open}
        aria-controls="demo-panel"
        className="glass flex h-11 items-center gap-2 rounded-full px-4 text-sm font-medium text-ink-muted transition-colors hover:text-ink"
      >
        <FlaskConical className="size-4 text-accent" aria-hidden />
        <span className="hidden sm:inline">Simulador</span>
        <span className="sr-only sm:hidden">Simulador</span>
      </button>
    </div>
  );
}
