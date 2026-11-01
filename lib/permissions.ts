import type { Role, Session } from "@/types";

/**
 * Matriz de permisos derivada de la sección "Actores del sistema".
 * - principal: control total de su hogar.
 * - contact: acceso limitado; algunas capacidades dependen de lo que el principal le otorgue.
 * - admin: rol técnico del prototipo académico (mismas vistas que principal).
 */
export type Capability =
  | "dashboard:view"
  | "alerts:view"
  | "alerts:attend"
  | "history:view"
  | "history:full"
  | "sensors:view"
  | "sensors:manage"
  | "stats:view"
  | "device:view"
  | "device:manage"
  | "contacts:manage"
  | "settings:manage"
  | "profile:edit";

const BASE: Record<Role, Capability[]> = {
  principal: [
    "dashboard:view",
    "alerts:view",
    "alerts:attend",
    "history:view",
    "history:full",
    "sensors:view",
    "sensors:manage",
    "stats:view",
    "device:view",
    "device:manage",
    "contacts:manage",
    "settings:manage",
    "profile:edit",
  ],
  admin: [
    "dashboard:view",
    "alerts:view",
    "alerts:attend",
    "history:view",
    "history:full",
    "sensors:view",
    "sensors:manage",
    "stats:view",
    "device:view",
    "device:manage",
    "contacts:manage",
    "settings:manage",
    "profile:edit",
  ],
  contact: ["dashboard:view", "profile:edit"],
};

export function capabilitiesFor(session: Session | null): Set<Capability> {
  if (!session) return new Set();
  const caps = new Set(BASE[session.user.role]);
  if (session.user.role === "contact") {
    const p = session.contactPermissions;
    if (p?.viewAlerts) caps.add("alerts:view");
    if (p?.viewAlerts && p.attendAlerts) caps.add("alerts:attend");
    if (p?.viewHistory) caps.add("history:view");
  }
  return caps;
}

export function can(session: Session | null, cap: Capability) {
  return capabilitiesFor(session).has(cap);
}

export const ROLE_LABEL: Record<Role, string> = {
  principal: "Usuario principal",
  contact: "Contacto autorizado",
  admin: "Administrador",
};

/** Días de historial visibles para un contacto autorizado ("eventos recientes"). */
export const CONTACT_HISTORY_DAYS = 2;
