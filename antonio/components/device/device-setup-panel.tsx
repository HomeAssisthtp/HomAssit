"use client";

import { Check, Copy, Eye, EyeOff, Loader2 } from "lucide-react";
import { useEffect, useMemo, useState, type ReactNode } from "react";
import { useToast } from "@/components/providers/toast-provider";
import { GlassButton } from "@/components/ui/glass-button";
import { GlassPanel } from "@/components/ui/glass-panel";
import { useFirmwareSensors } from "@/hooks/use-firmware-sensors";
import { buildConfigH, serverUrlFor } from "@/lib/firmware";
import { cn } from "@/lib/utils";
import type { HomeSnapshot } from "@/types";

interface SetupInfo {
  apiKey: string;
  lanAddresses: string[];
}

/**
 * Guía para conectar el ESP32 físico: verifica cada requisito y genera el
 * config.h del firmware con los datos reales de este hogar.
 */
export function DeviceSetupPanel({ snapshot }: { snapshot: HomeSnapshot }) {
  const device = snapshot.device!;
  const toast = useToast();
  const { missing, total, addMissing, adding } = useFirmwareSensors(snapshot);
  const [info, setInfo] = useState<SetupInfo | null>(null);
  const [infoError, setInfoError] = useState(false);
  const [lan, setLan] = useState<string | undefined>();
  const [reveal, setReveal] = useState(false);

  useEffect(() => {
    let alive = true;
    fetch("/api/device/setup", { cache: "no-store" })
      .then((r) => (r.ok ? r.json() : Promise.reject()))
      .then((d: SetupInfo) => {
        if (!alive) return;
        setInfo(d);
        setLan(d.lanAddresses[0]);
      })
      .catch(() => alive && setInfoError(true));
    return () => {
      alive = false;
    };
  }, []);

  const server = useMemo(() => serverUrlFor(typeof window !== "undefined" ? window.location.origin : "http://localhost:3000", lan), [lan]);
  const config = info ? buildConfigH({ deviceUid: device.deviceUid, wifiSsid: device.wifiSsid, serverUrl: server.url, apiKey: info.apiKey }) : "";
  const shown = info && !reveal ? config.replace(info.apiKey, "•".repeat(Math.min(24, info.apiKey.length))) : config;

  async function copy() {
    try {
      await navigator.clipboard.writeText(config);
      toast({ tone: "success", title: "config.h copiado", description: "Pégalo en firmware/homeassist_esp32/config.h" });
    } catch {
      toast({ tone: "error", title: "No se pudo copiar", description: "Selecciona el texto y cópialo manualmente." });
    }
  }

  const sensorsOk = missing.length === 0;
  const connected = device.connectedOnce;

  return (
    <GlassPanel as="section" aria-labelledby="setup-esp32" depth={2} className="flex flex-col gap-5">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="text-[0.7rem] font-semibold uppercase tracking-[0.2em] text-accent/80">Conexión física</p>
          <h2 id="setup-esp32" className="text-lg font-semibold text-ink">
            Conectar tu ESP32
          </h2>
        </div>
        <StepBadge done={connected} label={connected ? "Recibiendo datos" : "Esperando primer reporte"} />
      </div>

      <ol className="flex flex-col gap-4">
        <Step n={1} done title="Dispositivo registrado">
          <span className="font-mono">{device.deviceUid}</span> · red <span className="text-ink">{device.wifiSsid}</span>
        </Step>

        <Step n={2} done={sensorsOk} title="Sensores del firmware registrados">
          {sensorsOk ? (
            `Los ${total} sensores del firmware están registrados con sus identificadores.`
          ) : (
            <span className="flex flex-col items-start gap-2.5">
              <span>
                Faltan {missing.length} de {total}: <span className="font-mono text-ink">{missing.map((s) => s.hardwareId).join(", ")}</span>. El servidor ignora lecturas de
                sensores no registrados.
              </span>
              <GlassButton size="sm" variant="primary" loading={adding} onClick={addMissing}>
                Registrar los {missing.length} que faltan
              </GlassButton>
            </span>
          )}
        </Step>

        <Step n={3} done={!server.isLocal || !!lan} title="Servidor accesible desde la red Wi-Fi">
          <span className="flex flex-col gap-2">
            <span>
              Inicia el servidor para la red local con <code className="rounded bg-white/6 px-1.5 py-0.5 font-mono text-ink">npm run dev:lan</code>. La computadora y el
              ESP32 deben estar en la misma red Wi-Fi.
            </span>
            {info && info.lanAddresses.length > 1 && (
              <label className="flex flex-wrap items-center gap-2">
                <span>IP de esta computadora:</span>
                <select
                  value={lan}
                  onChange={(e) => setLan(e.target.value)}
                  className="h-8 rounded-lg border border-line bg-bg-deep/60 px-2 font-mono text-xs text-ink [&>option]:bg-night"
                >
                  {info.lanAddresses.map((a) => (
                    <option key={a} value={a}>
                      {a}
                    </option>
                  ))}
                </select>
              </label>
            )}
          </span>
        </Step>

        <Step n={4} done={false} neutral title="Configura y carga el firmware">
          <span className="flex flex-col gap-2.5">
            <span>
              Copia esto en <code className="font-mono text-ink">firmware/homeassist_esp32/config.h</code>, escribe la contraseña de tu Wi-Fi y súbelo con Arduino IDE.
            </span>
            {infoError ? (
              <span className="text-danger">No se pudo obtener la configuración. Recarga la página.</span>
            ) : !info ? (
              <span className="flex items-center gap-2 text-ink-subtle">
                <Loader2 className="size-4 animate-spin" aria-hidden /> Preparando configuración…
              </span>
            ) : (
              <span className="relative block">
                <pre className="max-h-72 overflow-auto rounded-xl border border-line bg-bg-deep/70 p-4 font-mono text-[0.78rem] leading-relaxed text-ink-muted">
                  {shown}
                </pre>
                <span className="absolute right-2 top-2 flex gap-1.5">
                  <GlassButton size="icon-sm" variant="glass" onClick={() => setReveal((v) => !v)} aria-label={reveal ? "Ocultar clave" : "Mostrar clave"}>
                    {reveal ? <EyeOff /> : <Eye />}
                  </GlassButton>
                  <GlassButton size="sm" variant="glass" onClick={copy}>
                    <Copy aria-hidden /> Copiar
                  </GlassButton>
                </span>
              </span>
            )}
          </span>
        </Step>

        <Step n={5} done={connected} title="Primer reporte del ESP32">
          {connected
            ? "El dispositivo ya envía datos. El dashboard se actualiza en tiempo real."
            : "Al encender el ESP32 debe sonar un pitido corto; en unos segundos este paso se marcará solo."}
        </Step>
      </ol>
    </GlassPanel>
  );
}

function StepBadge({ done, label }: { done: boolean; label: string }) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs font-medium",
        done ? "border-ok/30 bg-ok/12 text-ok" : "border-warn/30 bg-warn/12 text-warn",
      )}
    >
      {done ? <Check className="size-3.5" aria-hidden /> : <Loader2 className="size-3.5 animate-spin" aria-hidden />}
      {label}
    </span>
  );
}

function Step({
  n,
  done,
  neutral,
  title,
  children,
}: {
  n: number;
  done: boolean;
  neutral?: boolean;
  title: string;
  children: ReactNode;
}) {
  return (
    <li className="flex gap-3.5">
      <span
        className={cn(
          "mt-0.5 inline-flex size-7 shrink-0 items-center justify-center rounded-full border text-xs font-semibold tabular",
          done ? "border-ok/35 bg-ok/15 text-ok" : neutral ? "border-accent/30 bg-accent/10 text-accent" : "border-warn/35 bg-warn/12 text-warn",
        )}
        aria-hidden
      >
        {done ? <Check className="size-3.5" /> : n}
      </span>
      <div className="min-w-0 flex-1">
        <p className="text-sm font-semibold text-ink">
          {title}
          <span className="sr-only">{done ? " (completado)" : " (pendiente)"}</span>
        </p>
        <div className="mt-1 text-sm text-ink-muted">{children}</div>
      </div>
    </li>
  );
}
