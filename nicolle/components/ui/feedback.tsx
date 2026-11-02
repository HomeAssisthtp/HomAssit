import { CircleAlert, Inbox, Lock, RefreshCw, type LucideIcon } from "lucide-react";
import type { ReactNode } from "react";
import { cn } from "@/lib/utils";
import { GlassButton } from "./glass-button";

export function Skeleton({ className }: { className?: string }) {
  return <div className={cn("skeleton", className)} aria-hidden />;
}

export function EmptyState({
  icon: Icon = Inbox,
  title,
  description,
  action,
  className,
}: {
  icon?: LucideIcon;
  title: string;
  description?: string;
  action?: ReactNode;
  className?: string;
}) {
  return (
    <div className={cn("flex flex-col items-center justify-center gap-3 px-6 py-12 text-center", className)}>
      <span className="inline-flex size-12 items-center justify-center rounded-2xl border border-line bg-white/4 text-ink-subtle">
        <Icon className="size-5" aria-hidden />
      </span>
      <div>
        <p className="font-medium text-ink">{title}</p>
        {description && <p className="mt-1 max-w-sm text-sm text-ink-muted">{description}</p>}
      </div>
      {action}
    </div>
  );
}

export function ErrorState({ message, onRetry }: { message: string; onRetry?: () => void }) {
  return (
    <div role="alert" className="flex flex-col items-center gap-3 px-6 py-12 text-center">
      <span className="inline-flex size-12 items-center justify-center rounded-2xl border border-danger/30 bg-danger/10 text-danger">
        <CircleAlert className="size-5" aria-hidden />
      </span>
      <div>
        <p className="font-medium text-ink">No pudimos cargar la información</p>
        <p className="mt-1 text-sm text-ink-muted">{message}</p>
      </div>
      {onRetry && (
        <GlassButton size="sm" onClick={onRetry}>
          <RefreshCw aria-hidden /> Reintentar
        </GlassButton>
      )}
    </div>
  );
}

export function RestrictedState({ description }: { description?: string }) {
  return (
    <EmptyState
      icon={Lock}
      title="Acceso restringido"
      description={description ?? "Tu cuenta no tiene permiso para ver esta sección. Solicítalo al usuario principal."}
    />
  );
}

export function PageHeader({
  title,
  description,
  actions,
  eyebrow,
}: {
  title: string;
  description?: string;
  actions?: ReactNode;
  eyebrow?: string;
}) {
  return (
    <header className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
      <div className="min-w-0">
        {eyebrow && <p className="mb-1 text-xs font-semibold uppercase tracking-[0.18em] text-accent/80">{eyebrow}</p>}
        <h1 className="text-2xl font-semibold tracking-tight text-ink sm:text-[1.75rem]">{title}</h1>
        {description && <p className="mt-1 max-w-2xl text-sm text-ink-muted">{description}</p>}
      </div>
      {actions && <div className="flex flex-wrap items-center gap-2">{actions}</div>}
    </header>
  );
}

export function SectionTitle({ title, action, id }: { title: string; action?: ReactNode; id?: string }) {
  return (
    <div className="mb-3 flex items-center justify-between gap-3">
      <h2 id={id} className="text-sm font-semibold uppercase tracking-[0.14em] text-ink-muted">
        {title}
      </h2>
      {action}
    </div>
  );
}
