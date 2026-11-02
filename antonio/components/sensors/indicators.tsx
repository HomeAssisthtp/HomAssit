import { TONE_TEXT, type Tone } from "@/lib/tone";
import { cn } from "@/lib/utils";

/** Mini tendencia de lecturas (últimas 24 h). */
export function Sparkline({ values, tone, className }: { values: number[]; tone: Tone; className?: string }) {
  if (values.length < 2) return null;
  const w = 112;
  const h = 44;
  const min = Math.min(...values);
  const max = Math.max(...values);
  const span = max - min || 1;
  const pts = values.map((v, i) => [(i / (values.length - 1)) * w, h - 4 - ((v - min) / span) * (h - 8)] as const);
  const line = pts.map(([x, y], i) => `${i ? "L" : "M"}${x.toFixed(1)},${y.toFixed(1)}`).join(" ");
  const area = `${line} L${w},${h} L0,${h} Z`;
  const [lx, ly] = pts[pts.length - 1];
  const gid = `spark-${tone}`;
  return (
    <svg viewBox={`0 0 ${w} ${h}`} className={cn("h-11 w-28", TONE_TEXT[tone], className)} aria-hidden>
      <defs>
        <linearGradient id={gid} x1="0" x2="0" y1="0" y2="1">
          <stop offset="0%" stopColor="currentColor" stopOpacity="0.28" />
          <stop offset="100%" stopColor="currentColor" stopOpacity="0" />
        </linearGradient>
      </defs>
      <path d={area} fill={`url(#${gid})`} />
      <path d={line} fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" />
      <circle cx={lx} cy={ly} r="2.75" fill="currentColor" />
    </svg>
  );
}

/** Medidor horizontal con marca de umbral (humo / gas). */
export function ThresholdGauge({ value, threshold, max, tone }: { value: number; threshold: number; max: number; tone: Tone }) {
  const pct = Math.min(100, (value / max) * 100);
  const tPct = Math.min(100, (threshold / max) * 100);
  return (
    <div className="w-28" aria-hidden>
      <div className="relative h-2 rounded-full bg-white/8">
        <div
          className={cn("absolute inset-y-0 left-0 rounded-full transition-[width] duration-700 ease-out", {
            "bg-ok": tone === "ok",
            "bg-warn": tone === "warn",
            "bg-danger": tone === "danger",
            "bg-offline": tone === "offline" || tone === "neutral" || tone === "accent",
          })}
          style={{ width: `${pct}%` }}
        />
        <div className="absolute -top-1 h-4 w-0.5 rounded bg-ink/70" style={{ left: `${tPct}%` }} />
      </div>
      <div className="mt-1.5 flex justify-between text-[0.65rem] text-ink-subtle tabular">
        <span>0</span>
        <span>umbral {threshold}</span>
      </div>
    </div>
  );
}

/** Radar de movimiento: anillos que se expanden si hubo actividad reciente. */
export function MotionRadar({ active, tone }: { active: boolean; tone: Tone }) {
  return (
    <div className={cn("relative size-14", TONE_TEXT[tone])} aria-hidden>
      <span className="absolute inset-0 rounded-full border border-current opacity-20" />
      <span className="absolute inset-3 rounded-full border border-current opacity-30" />
      {active && (
        <>
          <span className="absolute inset-0 rounded-full border border-current animate-pulse-ring" />
          <span className="absolute inset-0 rounded-full border border-current animate-pulse-ring [animation-delay:0.8s]" />
        </>
      )}
      <span className={cn("absolute left-1/2 top-1/2 size-2.5 -translate-x-1/2 -translate-y-1/2 rounded-full bg-current", !active && "opacity-50")} />
    </div>
  );
}

/** Barras de señal Wi-Fi a partir del RSSI. */
export function SignalBars({ rssi, online }: { rssi: number; online: boolean }) {
  const level = !online ? 0 : rssi > -55 ? 4 : rssi > -65 ? 3 : rssi > -75 ? 2 : 1;
  return (
    <span className="inline-flex items-end gap-0.5" aria-hidden>
      {[1, 2, 3, 4].map((b) => (
        <span
          key={b}
          className={cn("w-1 rounded-sm transition-colors", b <= level ? "bg-accent" : "bg-white/12")}
          style={{ height: `${4 + b * 3}px` }}
        />
      ))}
    </span>
  );
}

export function signalLabel(rssi: number, online: boolean) {
  if (!online) return "Sin señal";
  if (rssi > -55) return "Excelente";
  if (rssi > -65) return "Buena";
  if (rssi > -75) return "Regular";
  return "Débil";
}
