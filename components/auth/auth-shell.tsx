import { Bell, DoorClosed, ShieldCheck, Thermometer, Wifi } from "lucide-react";
import type { ReactNode } from "react";
import { Logo } from "@/components/brand/logo";

/** Escenario visual compartido por login / registro / recuperación. */
export function AuthShell({ title, subtitle, children }: { title: string; subtitle: string; children: ReactNode }) {
  return (
    <div className="relative grid min-h-dvh lg:grid-cols-[1.1fr_1fr]">
      {/* Escena espacial (solo escritorio) */}
      <div className="relative hidden overflow-hidden lg:flex lg:flex-col lg:justify-between lg:p-12">
        <Logo />
        <div className="relative mx-auto w-full max-w-md [perspective:1400px]" aria-hidden>
          <div className="absolute -inset-20 rounded-full bg-radial from-ok/20 via-accent/5 to-transparent blur-2xl animate-breathe" />
          <div className="float-idle [--float-duration:9s] [--float-y:-12px] transform-3d">
          <div className="relative rounded-[1.75rem] p-7 transform-3d [transform:rotateY(16deg)_rotateX(7deg)_rotateZ(-1.5deg)]">
            <span className="absolute inset-0 -z-10 rounded-[inherit] glass-strong shadow-[0_60px_100px_-30px_rgb(0_0_0/0.9),0_0_80px_-30px_rgb(79_209_232/0.35)]" />
            <p className="translate-z-6 text-[0.7rem] font-semibold uppercase tracking-[0.22em] text-ink-subtle">Estado del hogar</p>
            <div className="mt-3 flex items-center gap-4 transform-3d translate-z-12">
              <span className="relative inline-flex size-16 translate-z-10 items-center justify-center rounded-full border border-ok/30 bg-ok/10 text-ok">
                <span className="absolute inset-0 rounded-full bg-ok/40 animate-pulse-ring [animation-duration:3.2s]" />
                <ShieldCheck className="relative size-7" strokeWidth={1.6} />
              </span>
              <div>
                <p className="text-3xl font-semibold tracking-tight text-ink">Casa segura</p>
                <p className="text-sm text-ink-muted">Todo funciona con normalidad</p>
              </div>
            </div>
            <div className="mt-6 grid grid-cols-2 gap-2.5 text-sm transform-3d translate-z-8">
              {[
                { i: Wifi, k: "Conectado", c: "text-ok" },
                { i: Thermometer, k: "24 °C", c: "text-ink" },
                { i: DoorClosed, k: "Puertas cerradas", c: "text-ok" },
                { i: Bell, k: "0 alertas", c: "text-ok" },
              ].map((x) => (
                <div key={x.k} className="flex items-center gap-2 rounded-xl glass-subtle px-3 py-2.5">
                  <x.i className="size-4 text-ink-subtle" />
                  <span className={x.c}>{x.k}</span>
                </div>
              ))}
            </div>
          </div>
          </div>
          <div className="float-idle absolute -bottom-12 -right-4 rounded-2xl glass-strong px-4 py-3 text-sm shadow-[0_30px_60px_-20px_rgb(0_0_0/0.8)] [--float-delay:-3s] [--float-duration:6.5s] [--float-y:-16px] [transform:translateZ(120px)_rotateY(-10deg)]">
            <p className="text-xs text-ink-subtle">Movimiento · Sala</p>
            <p className="font-medium text-ink">Último evento 21:42</p>
          </div>
          <div className="float-idle absolute -left-8 -top-10 flex items-center gap-2.5 rounded-2xl glass-strong px-4 py-3 text-sm shadow-[0_30px_60px_-20px_rgb(0_0_0/0.8)] [--float-delay:-1.5s] [--float-duration:7.5s] [--float-y:-14px] [transform:translateZ(80px)_rotateY(12deg)]">
            <Thermometer className="size-4 text-accent" />
            <span className="font-medium text-ink tabular">24 °C</span>
            <span className="text-xs text-ink-subtle">Sala</span>
          </div>
        </div>
        <p className="max-w-md text-sm text-ink-muted">
          Monitorea temperatura, movimiento, puertas y humo o gas de tu hogar en tiempo real, y recibe alertas cuando algo requiere tu atención.
        </p>
      </div>

      {/* Formulario */}
      <main className="flex items-center justify-center px-4 py-10 sm:px-8">
        <div className="w-full max-w-[26rem] animate-fade-up">
          <div className="mb-8 lg:hidden">
            <Logo />
          </div>
          <div className="rounded-[1.75rem] glass-strong sheen p-6 sm:p-8">
            <h1 className="text-2xl font-semibold tracking-tight text-ink">{title}</h1>
            <p className="mt-1.5 text-sm text-ink-muted">{subtitle}</p>
            <div className="mt-7">{children}</div>
          </div>
        </div>
      </main>
    </div>
  );
}
