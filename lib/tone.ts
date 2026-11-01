import type { AlertSeverity, HomeStatusLevel, SensorState } from "@/types";

/** Lenguaje de color único: todos los estados del sistema se traducen a un "tono". */
export type Tone = "ok" | "warn" | "danger" | "offline" | "accent" | "neutral";

export const TONE_TEXT: Record<Tone, string> = {
  ok: "text-ok",
  warn: "text-warn",
  danger: "text-danger",
  offline: "text-offline",
  accent: "text-accent",
  neutral: "text-ink-muted",
};

export const TONE_BG_SOFT: Record<Tone, string> = {
  ok: "bg-ok/12",
  warn: "bg-warn/12",
  danger: "bg-danger/14",
  offline: "bg-offline/14",
  accent: "bg-accent/12",
  neutral: "bg-white/6",
};

export const TONE_BORDER: Record<Tone, string> = {
  ok: "border-ok/25",
  warn: "border-warn/30",
  danger: "border-danger/40",
  offline: "border-offline/25",
  accent: "border-accent/25",
  neutral: "border-line",
};

export const TONE_DOT: Record<Tone, string> = {
  ok: "bg-ok",
  warn: "bg-warn",
  danger: "bg-danger",
  offline: "bg-offline",
  accent: "bg-accent",
  neutral: "bg-ink-subtle",
};

/** Resplandor ambiental para piezas protagonistas. */
export const TONE_GLOW: Record<Tone, string> = {
  ok: "from-ok/25 via-accent/10",
  warn: "from-warn/25 via-warn/5",
  danger: "from-danger/35 via-danger/10",
  offline: "from-offline/20 via-offline/5",
  accent: "from-accent/25 via-electric/10",
  neutral: "from-white/10 via-white/0",
};

export const sensorTone = (s: SensorState): Tone =>
  ({ normal: "ok", warning: "warn", alert: "danger", offline: "offline" } as const)[s];

export const homeTone = (l: HomeStatusLevel): Tone =>
  ({ secure: "ok", warning: "warn", emergency: "danger", offline: "offline" } as const)[l];

export const severityTone = (s: AlertSeverity): Tone =>
  ({ info: "accent", warning: "warn", emergency: "danger" } as const)[s];
