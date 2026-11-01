import Link from "next/link";
import { Logo } from "@/components/brand/logo";
import { GlassButton } from "@/components/ui/glass-button";

export default function NotFound() {
  return (
    <main className="flex min-h-dvh flex-col items-center justify-center gap-6 px-4 text-center">
      <Logo />
      <div className="rounded-[1.75rem] glass-strong sheen px-8 py-10">
        <p className="text-5xl font-semibold tracking-tight text-ink tabular">404</p>
        <p className="mt-2 text-ink-muted">Esta sección no existe.</p>
        <GlassButton asChild variant="primary" className="mt-6">
          <Link href="/dashboard">Volver al dashboard</Link>
        </GlassButton>
      </div>
    </main>
  );
}
