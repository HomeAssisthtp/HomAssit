"use client";

import { BellRing, Thermometer, Timer, Wind } from "lucide-react";
import { useEffect, useState, type FormEvent } from "react";
import { CapabilityGate, HomeGate } from "@/components/layout/gates";
import { PageHeader } from "@/components/ui/feedback";
import { Field, Input, Switch } from "@/components/ui/form";
import { GlassButton } from "@/components/ui/glass-button";
import { GlassPanel } from "@/components/ui/glass-panel";
import { useAsyncAction } from "@/hooks/use-home-actions";
import { fieldErrors, settingsSchema } from "@/lib/validation";
import { api } from "@/services";
import type { SystemSettings } from "@/types";

/** Parámetros del sistema (Usuario principal): umbrales que generan alertas (RF-09, RF-12). */
export function SettingsView() {
  return (
    <CapabilityGate cap="settings:manage">
      <div className="spatial-stagger flex flex-col gap-6">
        <PageHeader eyebrow="Cuenta" title="Configuración" description="Parámetros que determinan cuándo el sistema genera una alerta." />
        <HomeGate>{(snapshot) => <SettingsForm initial={snapshot.settings} />}</HomeGate>
      </div>
    </CapabilityGate>
  );
}

function SettingsForm({ initial }: { initial: SystemSettings }) {
  const toStr = (s: SystemSettings) => ({
    temperatureMax: String(s.temperatureMax),
    temperatureMin: String(s.temperatureMin),
    gasThresholdPpm: String(s.gasThresholdPpm),
    offlineAfterSeconds: String(s.offlineAfterSeconds),
    buzzerEnabled: s.buzzerEnabled,
    motionAlertsWhenAway: s.motionAlertsWhenAway,
  });
  const [v, setV] = useState(() => toStr(initial));
  const [errors, setErrors] = useState<Record<string, string>>({});
  const { run, loading } = useAsyncAction();
  const initialKey = JSON.stringify(initial);

  useEffect(() => setV(toStr(JSON.parse(initialKey))), [initialKey]);

  const dirty = JSON.stringify(v) !== JSON.stringify(toStr(initial));
  const num = (k: "temperatureMax" | "temperatureMin" | "gasThresholdPpm" | "offlineAfterSeconds") => (e: React.ChangeEvent<HTMLInputElement>) =>
    setV((s) => ({ ...s, [k]: e.target.value }));

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    const parsed = settingsSchema.safeParse(v);
    if (!parsed.success) {
      setErrors(fieldErrors(parsed.error));
      return;
    }
    setErrors({});
    await run(() => api.settings.update(parsed.data), { success: "Configuración guardada", error: "No se pudo guardar" });
  }

  return (
    <form onSubmit={onSubmit} noValidate className="flex flex-col gap-5">
      <div className="grid gap-5 lg:grid-cols-2">
        <GlassPanel as="fieldset">
          <legend className="sr-only">Temperatura</legend>
          <h2 className="mb-1 flex items-center gap-2 text-base font-semibold text-ink">
            <Thermometer className="size-4 text-accent" aria-hidden /> Temperatura
          </h2>
          <p className="mb-5 text-sm text-ink-muted">Se genera una alerta cuando se supera la máxima.</p>
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Máxima (°C)" error={errors.temperatureMax}>
              {(p) => <Input {...p} type="number" inputMode="decimal" value={v.temperatureMax} onChange={num("temperatureMax")} />}
            </Field>
            <Field label="Mínima (°C)" error={errors.temperatureMin}>
              {(p) => <Input {...p} type="number" inputMode="decimal" value={v.temperatureMin} onChange={num("temperatureMin")} />}
            </Field>
          </div>
        </GlassPanel>

        <GlassPanel as="fieldset">
          <legend className="sr-only">Humo y gas</legend>
          <h2 className="mb-1 flex items-center gap-2 text-base font-semibold text-ink">
            <Wind className="size-4 text-accent" aria-hidden /> Humo / gas
          </h2>
          <p className="mb-5 text-sm text-ink-muted">Umbral general del sensor MQ-2. Cada sensor puede tener el suyo.</p>
          <Field label="Umbral de alerta (ppm)" error={errors.gasThresholdPpm}>
            {(p) => <Input {...p} type="number" inputMode="numeric" value={v.gasThresholdPpm} onChange={num("gasThresholdPpm")} />}
          </Field>
        </GlassPanel>

        <GlassPanel as="fieldset">
          <legend className="sr-only">Conexión</legend>
          <h2 className="mb-1 flex items-center gap-2 text-base font-semibold text-ink">
            <Timer className="size-4 text-accent" aria-hidden /> Conexión del dispositivo
          </h2>
          <p className="mb-5 text-sm text-ink-muted">Tiempo sin datos para considerar el ESP32 desconectado.</p>
          <Field label="Tiempo de espera (segundos)" error={errors.offlineAfterSeconds}>
            {(p) => <Input {...p} type="number" inputMode="numeric" value={v.offlineAfterSeconds} onChange={num("offlineAfterSeconds")} />}
          </Field>
        </GlassPanel>

        <GlassPanel as="fieldset">
          <legend className="sr-only">Avisos</legend>
          <h2 className="mb-5 flex items-center gap-2 text-base font-semibold text-ink">
            <BellRing className="size-4 text-accent" aria-hidden /> Avisos
          </h2>
          <div className="flex flex-col gap-5">
            <Switch
              label="Buzzer local"
              description="El ESP32 emite una señal sonora al generarse una alerta"
              checked={v.buzzerEnabled}
              onCheckedChange={(c) => setV((s) => ({ ...s, buzzerEnabled: c }))}
            />
            <Switch
              label="Alertar movimiento inesperado"
              description="Genera una alerta informativa al detectar movimiento durante la noche"
              checked={v.motionAlertsWhenAway}
              onCheckedChange={(c) => setV((s) => ({ ...s, motionAlertsWhenAway: c }))}
            />
          </div>
        </GlassPanel>
      </div>

      <div className="flex gap-2">
        <GlassButton type="submit" variant="primary" loading={loading} disabled={!dirty}>
          Guardar configuración
        </GlassButton>
        {dirty && (
          <GlassButton type="button" variant="ghost" onClick={() => setV(toStr(initial))}>
            Descartar cambios
          </GlassButton>
        )}
      </div>
    </form>
  );
}
