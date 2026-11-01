const LOCALE = "es-MX";

const timeFmt = new Intl.DateTimeFormat(LOCALE, { hour: "2-digit", minute: "2-digit", hour12: false });
const dateFmt = new Intl.DateTimeFormat(LOCALE, { day: "2-digit", month: "short" });
const dateTimeFmt = new Intl.DateTimeFormat(LOCALE, {
  day: "2-digit",
  month: "short",
  year: "numeric",
  hour: "2-digit",
  minute: "2-digit",
  hour12: false,
});
const dayLabelFmt = new Intl.DateTimeFormat(LOCALE, { weekday: "long", day: "numeric", month: "long" });

export const formatTime = (iso: string) => timeFmt.format(new Date(iso));
export const formatDate = (iso: string) => dateFmt.format(new Date(iso));
export const formatDateTime = (iso: string) => dateTimeFmt.format(new Date(iso));
export const formatDayLabel = (iso: string) => {
  const s = dayLabelFmt.format(new Date(iso));
  return s.charAt(0).toUpperCase() + s.slice(1);
};

/** "hace unos segundos", "hace 4 minutos", "hace 2 h", "ayer 21:40"… */
export function formatRelative(iso: string, now: number = Date.now()) {
  const diff = Math.max(0, now - new Date(iso).getTime());
  const s = Math.floor(diff / 1000);
  if (s < 30) return "hace unos segundos";
  if (s < 60) return `hace ${s} segundos`;
  const m = Math.floor(s / 60);
  if (m < 60) return m === 1 ? "hace 1 minuto" : `hace ${m} minutos`;
  const h = Math.floor(m / 60);
  if (h < 24) return h === 1 ? "hace 1 hora" : `hace ${h} horas`;
  const d = Math.floor(h / 24);
  if (d === 1) return `ayer ${formatTime(iso)}`;
  if (d < 7) return `hace ${d} días`;
  return formatDate(iso);
}

export const formatTemp = (v: number) => `${v.toFixed(1).replace(/\.0$/, "")}°C`;

export function isSameDay(a: string, b: string) {
  const da = new Date(a);
  const db = new Date(b);
  return da.getFullYear() === db.getFullYear() && da.getMonth() === db.getMonth() && da.getDate() === db.getDate();
}

export function initials(name: string) {
  return name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((p) => p[0]?.toUpperCase())
    .join("");
}
