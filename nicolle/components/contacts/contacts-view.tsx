"use client";

import { Ban, Check, Mail, Phone, Trash2, UserPlus, Users } from "lucide-react";
import { useState } from "react";
import { CapabilityGate, HomeGate } from "@/components/layout/gates";
import { Avatar } from "@/components/layout/user-card";
import { EmptyState, PageHeader } from "@/components/ui/feedback";
import { GlassButton } from "@/components/ui/glass-button";
import { GlassModal } from "@/components/ui/glass-modal";
import { GlassPanel } from "@/components/ui/glass-panel";
import { SpatialCard } from "@/components/ui/spatial-card";
import { StatusBadge } from "@/components/ui/status";
import { useAsyncAction } from "@/hooks/use-home-actions";
import type { Tone } from "@/lib/tone";
import { api } from "@/services";
import type { AuthorizedContact, ContactPermissions, ContactStatus } from "@/types";
import { ContactFormModal } from "./contact-form-modal";

const STATUS: Record<ContactStatus, { label: string; tone: Tone }> = {
  active: { label: "Activo", tone: "ok" },
  invited: { label: "Invitación enviada", tone: "accent" },
  suspended: { label: "Suspendido", tone: "offline" },
};

const PERMS: Array<{ key: keyof ContactPermissions; label: string }> = [
  { key: "viewAlerts", label: "Consultar alertas" },
  { key: "viewHistory", label: "Eventos recientes" },
  { key: "attendAlerts", label: "Atender alertas" },
];

/** HU-17: registro y gestión de contactos autorizados. */
export function ContactsView() {
  const [adding, setAdding] = useState(false);
  const [removing, setRemoving] = useState<AuthorizedContact | null>(null);
  const { run, loading } = useAsyncAction();

  const togglePerm = (c: AuthorizedContact, key: keyof ContactPermissions) => {
    const next = { ...c.permissions, [key]: !c.permissions[key] };
    if (!next.viewAlerts) next.attendAlerts = false;
    if (key === "attendAlerts" && next.attendAlerts) next.viewAlerts = true;
    run(() => api.contacts.update(c.id, { permissions: next }), { success: "Permisos actualizados" });
  };

  return (
    <CapabilityGate cap="contacts:manage">
      <div className="spatial-stagger flex flex-col gap-6">
        <PageHeader
          eyebrow="Hogar"
          title="Contactos autorizados"
          description="Personas de confianza que pueden consultar el estado de tu hogar y sus alertas."
          actions={
            <GlassButton variant="primary" onClick={() => setAdding(true)}>
              <UserPlus aria-hidden /> Agregar contacto
            </GlassButton>
          }
        />
        <HomeGate>
          {(snapshot) =>
            snapshot.contacts.length === 0 ? (
              <GlassPanel>
                <EmptyState
                  icon={Users}
                  title="Aún no tienes contactos autorizados"
                  description="Agrega a un familiar, amigo o cuidador para que pueda enterarse si algo ocurre en tu hogar."
                  action={
                    <GlassButton variant="primary" size="sm" onClick={() => setAdding(true)}>
                      <UserPlus aria-hidden /> Agregar contacto
                    </GlassButton>
                  }
                />
              </GlassPanel>
            ) : (
              <div className="grid gap-4 md:grid-cols-2 2xl:grid-cols-3">
                {snapshot.contacts.map((c) => {
                  const st = STATUS[c.status];
                  return (
                    <SpatialCard key={c.id} as="article" aria-label={`${c.name}, ${st.label}`} className="flex flex-col gap-4">
                      <div className="flex items-start gap-3">
                        <Avatar name={c.name} className="size-11" />
                        <div className="min-w-0 flex-1">
                          <h2 className="truncate font-semibold text-ink">{c.name}</h2>
                          <p className="text-xs text-ink-subtle">{c.relationship} · Acceso limitado</p>
                        </div>
                        <StatusBadge tone={st.tone} dot>
                          {st.label}
                        </StatusBadge>
                      </div>
                      <div className="flex flex-col gap-1 text-sm text-ink-muted">
                        <span className="flex items-center gap-2 truncate">
                          <Mail className="size-3.5 shrink-0 text-ink-subtle" aria-hidden /> {c.email}
                        </span>
                        {c.phone && (
                          <span className="flex items-center gap-2">
                            <Phone className="size-3.5 shrink-0 text-ink-subtle" aria-hidden /> {c.phone}
                          </span>
                        )}
                      </div>
                      <div>
                        <p className="mb-2 text-xs font-medium text-ink-subtle">Permisos</p>
                        <div className="flex flex-wrap gap-1.5">
                          <span className="inline-flex items-center gap-1 rounded-full border border-line bg-white/5 px-2.5 py-1 text-xs text-ink-muted">
                            <Check className="size-3" aria-hidden /> Estado general
                          </span>
                          {PERMS.map((p) => {
                            const on = c.permissions[p.key];
                            return (
                              <button
                                key={p.key}
                                aria-pressed={on}
                                onClick={() => togglePerm(c, p.key)}
                                className={`inline-flex items-center gap-1 rounded-full border px-2.5 py-1 text-xs transition-colors ${
                                  on ? "border-accent/35 bg-accent/12 text-accent" : "border-line text-ink-subtle line-through decoration-ink-subtle/50 hover:text-ink-muted"
                                }`}
                              >
                                {on ? <Check className="size-3" aria-hidden /> : <Ban className="size-3" aria-hidden />}
                                {p.label}
                              </button>
                            );
                          })}
                        </div>
                      </div>
                      <div className="mt-auto flex gap-2 border-t border-line pt-3">
                        <GlassButton
                          size="sm"
                          variant="ghost"
                          onClick={() =>
                            run(() => api.contacts.update(c.id, { status: c.status === "suspended" ? "active" : "suspended" }), {
                              success: c.status === "suspended" ? "Acceso reactivado" : "Acceso suspendido",
                            })
                          }
                        >
                          {c.status === "suspended" ? "Reactivar acceso" : "Suspender acceso"}
                        </GlassButton>
                        <GlassButton size="sm" variant="ghost" className="ml-auto text-danger hover:bg-danger/10 hover:text-danger" onClick={() => setRemoving(c)}>
                          <Trash2 aria-hidden /> Eliminar
                        </GlassButton>
                      </div>
                    </SpatialCard>
                  );
                })}
              </div>
            )
          }
        </HomeGate>

        <ContactFormModal open={adding} onOpenChange={setAdding} />
        <GlassModal
          open={!!removing}
          onOpenChange={(o) => !o && setRemoving(null)}
          size="sm"
          title="¿Eliminar contacto?"
          description={removing ? `${removing.name} dejará de tener acceso a la información de tu hogar.` : undefined}
          footer={
            <>
              <GlassButton variant="ghost" onClick={() => setRemoving(null)}>
                Cancelar
              </GlassButton>
              <GlassButton
                variant="danger"
                loading={loading}
                onClick={async () => {
                  if (!removing) return;
                  await run(() => api.contacts.remove(removing.id), { success: "Contacto eliminado" });
                  setRemoving(null);
                }}
              >
                Eliminar
              </GlassButton>
            </>
          }
        >
          <p className="text-sm text-ink-muted">Podrás volver a agregarlo más adelante.</p>
        </GlassModal>
      </div>
    </CapabilityGate>
  );
}
