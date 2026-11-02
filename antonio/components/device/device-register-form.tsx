"use client";

import { Cpu } from "lucide-react";
import { useState, type FormEvent } from "react";
import { Field, Input } from "@/components/ui/form";
import { GlassButton } from "@/components/ui/glass-button";
import { useAsyncAction } from "@/hooks/use-home-actions";
import { deviceSchema, fieldErrors } from "@/lib/validation";
import { api } from "@/services";

/** HU-04: asociar un ESP32 a la cuenta mediante su identificador único. */
export function DeviceRegisterForm({ onDone, submitLabel = "Registrar dispositivo" }: { onDone?: () => void; submitLabel?: string }) {
  const [v, setV] = useState({ deviceUid: "", name: "HomeAssist Hub", wifiSsid: "" });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const { run, loading } = useAsyncAction();
  const set = (k: keyof typeof v) => (e: React.ChangeEvent<HTMLInputElement>) => setV((s) => ({ ...s, [k]: e.target.value }));

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    const parsed = deviceSchema.safeParse(v);
    if (!parsed.success) {
      setErrors(fieldErrors(parsed.error));
      return;
    }
    setErrors({});
    const ok = await run(() => api.device.register(parsed.data), {
      success: "Dispositivo registrado",
      error: "No se pudo registrar el dispositivo",
    });
    if (ok) onDone?.();
  }

  return (
    <form onSubmit={onSubmit} noValidate className="flex flex-col gap-4">
      <Field label="Identificador del dispositivo" error={errors.deviceUid} hint="Está impreso en la etiqueta del ESP32. Formato HA-ESP32-XXXX">
        {(p) => <Input {...p} className="font-mono uppercase" placeholder="HA-ESP32-7F3A" value={v.deviceUid} onChange={set("deviceUid")} />}
      </Field>
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Nombre del dispositivo" error={errors.name}>
          {(p) => <Input {...p} value={v.name} onChange={set("name")} />}
        </Field>
        <Field label="Red Wi-Fi" error={errors.wifiSsid} hint="Red 2.4 GHz a la que se conecta">
          {(p) => <Input {...p} placeholder="MiCasa_2.4G" value={v.wifiSsid} onChange={set("wifiSsid")} />}
        </Field>
      </div>
      <GlassButton type="submit" variant="primary" loading={loading} className="self-start">
        {!loading && <Cpu aria-hidden />} {submitLabel}
      </GlassButton>
    </form>
  );
}
