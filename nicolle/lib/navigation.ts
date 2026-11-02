import {
  Bell,
  ChartColumn,
  Cpu,
  History,
  LayoutDashboard,
  Radar,
  Settings,
  UserRound,
  Users,
  type LucideIcon,
} from "lucide-react";
import type { Capability } from "./permissions";

export interface NavItem {
  href: string;
  label: string;
  icon: LucideIcon;
  cap: Capability;
  /** Etiqueta corta para la barra inferior en móvil. */
  short?: string;
}

export interface NavGroup {
  label: string;
  items: NavItem[];
}

export const NAV: NavGroup[] = [
  {
    label: "Monitoreo",
    items: [
      { href: "/dashboard", label: "Dashboard", short: "Inicio", icon: LayoutDashboard, cap: "dashboard:view" },
      { href: "/alertas", label: "Alertas", icon: Bell, cap: "alerts:view" },
      { href: "/sensores", label: "Sensores", icon: Radar, cap: "sensors:view" },
      { href: "/historial", label: "Historial", icon: History, cap: "history:view" },
      { href: "/estadisticas", label: "Estadísticas", icon: ChartColumn, cap: "stats:view" },
    ],
  },
  {
    label: "Hogar",
    items: [
      { href: "/dispositivo", label: "Dispositivo", icon: Cpu, cap: "device:view" },
      { href: "/contactos", label: "Contactos", icon: Users, cap: "contacts:manage" },
    ],
  },
  {
    label: "Cuenta",
    items: [
      { href: "/perfil", label: "Perfil", icon: UserRound, cap: "profile:edit" },
      { href: "/configuracion", label: "Configuración", icon: Settings, cap: "settings:manage" },
    ],
  },
];

export const MOBILE_PRIMARY = ["/dashboard", "/alertas", "/historial"];

export function navFor(can: (c: Capability) => boolean): NavGroup[] {
  return NAV.map((g) => ({ ...g, items: g.items.filter((i) => can(i.cap)) })).filter((g) => g.items.length > 0);
}
