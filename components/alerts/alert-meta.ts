import { CheckCircle2, Clock, Info, Siren, TriangleAlert, type LucideIcon } from "lucide-react";
import type { AlertSeverity, AlertStatus } from "@/types";

export const SEVERITY_ICON: Record<AlertSeverity, LucideIcon> = {
  info: Info,
  warning: TriangleAlert,
  emergency: Siren,
};

export const STATUS_META: Record<AlertStatus, { label: string; icon: LucideIcon }> = {
  pending: { label: "Pendiente", icon: Clock },
  attended: { label: "Atendida", icon: CheckCircle2 },
};
