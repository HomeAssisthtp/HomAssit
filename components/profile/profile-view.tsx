"use client";

import { Check, LogOut, ShieldCheck, X } from "lucide-react";
import { useState, type FormEvent } from "react";
import { Avatar } from "@/components/layout/user-card";
import { useSession } from "@/components/providers/session-provider";
import { useToast } from "@/components/providers/toast-provider";
import { PageHeader } from "@/components/ui/feedback";
import { Field, Input } from "@/components/ui/form";
import { GlassButton } from "@/components/ui/glass-button";
import { GlassPanel } from "@/components/ui/glass-panel";
import { StatusBadge } from "@/components/ui/status";
import { formatDateTime } from "@/lib/format";
import { ROLE_LABEL } from "@/lib/permissions";
import { fieldErrors, profileSchema } from "@/lib/validation";

/** HU-03: consultar y actualizar datos personales. RF-21: cierre de sesión. */
export function ProfileView() {
  const { session, updateProfile, signOut } = useSession();
  const toast = useToast();
  const user = session!.user;
  const [v, setV] = useState({ name: user.name, email: user.email, phone: user.phone ?? "" });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState(false);
  const [leaving, setLeaving] = useState(false);
  const dirty = v.name !== user.name || v.email !== user.email || v.phone !== (user.phone ?? "");
  const set = (k: keyof typeof v) => (e: React.ChangeEvent<HTMLInputElement>) => setV((s) => ({ ...s, [k]: e.target.value }));

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    const parsed = profileSchema.safeParse(v);
    if (!parsed.success) {
      setErrors(fieldErrors(parsed.error));
      return;
    }
    setErrors({});
    setSaving(true);
    try {
      await updateProfile({ name: parsed.data.name, email: parsed.data.email, phone: parsed.data.phone || undefined });
      toast({ tone: "success", title: "Perfil actualizado" });
    } catch (err) {
      toast({ tone: "error", title: "No se pudo guardar", description: (err as Error).message });
    } finally {
      setSaving(false);
    }
  }

  const owner = session!.ownerName;
  const perms = session!.contactPermissions;

  return (
    <div className="spatial-stagger flex flex-col gap-6">
      <PageHeader eyebrow="Cuenta" title="Perfil" description="Tu información personal y datos de acceso." />
      <div className="grid gap-5 lg:grid-cols-3">
        <GlassPanel depth={2} className="flex flex-col items-center gap-4 text-center lg:col-span-1">
          <Avatar name={user.name} className="size-20 text-xl" />
          <div>
            <p className="text-lg font-semibold text-ink">{user.name}</p>
            <p className="text-sm text-ink-muted">{user.email}</p>
          </div>
          <StatusBadge tone="accent" icon={ShieldCheck}>
            {ROLE_LABEL[user.role]}
          </StatusBadge>
          <p className="text-xs text-ink-subtle">Miembro desde {formatDateTime(user.createdAt).split(",")[0]}</p>
          {user.role === "contact" && (
            <div className="w-full rounded-2xl glass-subtle p-4 text-left">
              <p className="text-xs text-ink-subtle">Hogar autorizado por</p>
              <p className="font-medium text-ink">{owner ?? "Usuario principal"}</p>
              <ul className="mt-3 flex flex-col gap-1.5 text-sm">
                {[
                  ["Estado general del hogar", true],
                  ["Consultar alertas", !!perms?.viewAlerts],
                  ["Eventos recientes", !!perms?.viewHistory],
                  ["Marcar alertas como atendidas", !!perms?.attendAlerts],
                  ["Modificar configuración", false],
                ].map(([label, on]) => (
                  <li key={label as string} className={`flex items-center gap-2 ${on ? "text-ink" : "text-ink-subtle"}`}>
                    {on ? <Check className="size-4 text-ok" aria-hidden /> : <X className="size-4" aria-hidden />}
                    <span>
                      {label as string}
                      <span className="sr-only">{on ? ": permitido" : ": no permitido"}</span>
                    </span>
                  </li>
                ))}
              </ul>
            </div>
          )}
          <GlassButton
            variant="outline"
            className="mt-auto w-full hover:border-danger/40 hover:text-danger"
            loading={leaving}
            onClick={async () => {
              setLeaving(true);
              await signOut();
            }}
          >
            {!leaving && <LogOut aria-hidden />} Cerrar sesión
          </GlassButton>
        </GlassPanel>

        <GlassPanel as="section" aria-labelledby="datos-title" className="lg:col-span-2">
          <h2 id="datos-title" className="mb-5 text-base font-semibold text-ink">
            Datos personales
          </h2>
          <form onSubmit={onSubmit} noValidate className="grid gap-4 sm:grid-cols-2">
            <Field label="Nombre completo" error={errors.name} className="sm:col-span-2">
              {(p) => <Input {...p} autoComplete="name" value={v.name} onChange={set("name")} />}
            </Field>
            <Field label="Correo electrónico" error={errors.email}>
              {(p) => <Input {...p} type="email" autoComplete="email" value={v.email} onChange={set("email")} />}
            </Field>
            <Field label="Teléfono" error={errors.phone} hint="Opcional">
              {(p) => <Input {...p} type="tel" autoComplete="tel" value={v.phone} onChange={set("phone")} />}
            </Field>
            <div className="flex gap-2 sm:col-span-2">
              <GlassButton type="submit" variant="primary" loading={saving} disabled={!dirty}>
                Guardar cambios
              </GlassButton>
              {dirty && (
                <GlassButton type="button" variant="ghost" onClick={() => setV({ name: user.name, email: user.email, phone: user.phone ?? "" })}>
                  Descartar
                </GlassButton>
              )}
            </div>
          </form>
        </GlassPanel>
      </div>
    </div>
  );
}
