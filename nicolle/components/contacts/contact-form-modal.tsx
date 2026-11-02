"use client";

import { useEffect, useState, type FormEvent } from "react";
import { Field, Input, Switch } from "@/components/ui/form";
import { GlassButton } from "@/components/ui/glass-button";
import { GlassModal } from "@/components/ui/glass-modal";
import { useAsyncAction } from "@/hooks/use-home-actions";
import { contactSchema, fieldErrors } from "@/lib/validation";
import { api } from "@/services";

const EMPTY = { name: "", email: "", phone: "", relationship: "", viewAlerts: true, viewHistory: false, attendAlerts: false };

export function ContactFormModal({ open, onOpenChange }: { open: boolean; onOpenChange: (o: boolean) => void }) {
  const [v, setV] = useState(EMPTY);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const { run, loading } = useAsyncAction();

  useEffect(() => {
    if (open) {
      setV(EMPTY);
      setErrors({});
    }
  }, [open]);

  const set = (k: "name" | "email" | "phone" | "relationship") => (e: React.ChangeEvent<HTMLInputElement>) => setV((s) => ({ ...s, [k]: e.target.value }));

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    const parsed = contactSchema.safeParse(v);
    if (!parsed.success) {
      setErrors(fieldErrors(parsed.error));
      return;
    }
    setErrors({});
    const { viewAlerts, viewHistory, attendAlerts, phone, ...rest } = parsed.data;
    const ok = await run(
      () => api.contacts.create({ ...rest, phone: phone || undefined, permissions: { viewAlerts, viewHistory, attendAlerts: viewAlerts && attendAlerts } }),
      { success: "Contacto agregado", error: "No se pudo agregar el contacto" },
    );
    if (ok) onOpenChange(false);
  }

  return (
    <GlassModal
      open={open}
      onOpenChange={onOpenChange}
      size="lg"
      title="Agregar contacto autorizado"
      description="Una persona de confianza que podrá consultar el estado de tu hogar con acceso limitado."
      footer={
        <>
          <GlassButton variant="ghost" onClick={() => onOpenChange(false)}>
            Cancelar
          </GlassButton>
          <GlassButton variant="primary" type="submit" form="contact-form" loading={loading}>
            Agregar contacto
          </GlassButton>
        </>
      }
    >
      <form id="contact-form" onSubmit={onSubmit} noValidate className="flex flex-col gap-5">
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Nombre completo" error={errors.name}>
            {(p) => <Input {...p} autoComplete="off" value={v.name} onChange={set("name")} />}
          </Field>
          <Field label="Relación" error={errors.relationship}>
            {(p) => <Input {...p} placeholder="Familiar, vecino, cuidador…" value={v.relationship} onChange={set("relationship")} />}
          </Field>
          <Field label="Correo electrónico" error={errors.email} hint="Recibirá una invitación para crear su acceso">
            {(p) => <Input {...p} type="email" autoComplete="off" value={v.email} onChange={set("email")} />}
          </Field>
          <Field label="Teléfono (opcional)" error={errors.phone}>
            {(p) => <Input {...p} type="tel" value={v.phone} onChange={set("phone")} />}
          </Field>
        </div>
        <fieldset className="flex flex-col gap-4 rounded-2xl glass-subtle p-4">
          <legend className="px-1 text-sm font-semibold text-ink">Permisos</legend>
          <p className="-mt-1 text-xs text-ink-subtle">Siempre podrá ver el estado general del hogar. Nunca podrá modificar configuraciones.</p>
          <Switch label="Consultar alertas" description="Ver alertas activas y su detalle" checked={v.viewAlerts} onCheckedChange={(c) => setV((s) => ({ ...s, viewAlerts: c, attendAlerts: c && s.attendAlerts }))} />
          <Switch label="Consultar eventos recientes" description="Historial de las últimas 48 horas" checked={v.viewHistory} onCheckedChange={(c) => setV((s) => ({ ...s, viewHistory: c }))} />
          <Switch
            label="Marcar alertas como atendidas"
            description="Requiere el permiso de consultar alertas"
            checked={v.attendAlerts}
            disabled={!v.viewAlerts}
            onCheckedChange={(c) => setV((s) => ({ ...s, attendAlerts: c }))}
          />
        </fieldset>
      </form>
    </GlassModal>
  );
}
