"use client";

import { CheckCircle2, CircleAlert, Info, Siren, X } from "lucide-react";
import Link from "next/link";
import { createContext, useCallback, useContext, useMemo, useState, type ReactNode } from "react";
import { cn, uid } from "@/lib/utils";

type ToastTone = "success" | "error" | "info" | "emergency";
interface Toast {
  id: string;
  tone: ToastTone;
  title: string;
  description?: string;
  action?: { label: string; href: string };
  /** ms; por defecto 4200 */
  duration?: number;
}

const ToastContext = createContext<{ toast: (t: Omit<Toast, "id">) => void } | null>(null);

const ICON = { success: CheckCircle2, error: CircleAlert, info: Info, emergency: Siren };
const TONE = { success: "text-ok", error: "text-danger", info: "text-accent", emergency: "text-danger" };

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([]);
  const dismiss = useCallback((id: string) => setToasts((t) => t.filter((x) => x.id !== id)), []);
  const toast = useCallback(
    (t: Omit<Toast, "id">) => {
      const id = uid("tst");
      setToasts((prev) => [...prev.slice(-2), { ...t, id }]);
      setTimeout(() => dismiss(id), t.duration ?? 4200);
    },
    [dismiss],
  );
  const value = useMemo(() => ({ toast }), [toast]);

  return (
    <ToastContext.Provider value={value}>
      {children}
      <div
        aria-live="polite"
        className="pointer-events-none fixed inset-x-4 bottom-4 z-[60] flex flex-col items-center gap-2 sm:inset-x-auto sm:right-6 sm:bottom-6 sm:items-end"
      >
        {toasts.map((t) => {
          const Icon = ICON[t.tone];
          return (
            <div
              key={t.id}
              role="status"
              className={cn(
                "glass-strong pointer-events-auto flex w-full max-w-sm animate-alert-in items-start gap-3 rounded-2xl p-4",
                t.tone === "emergency" && "border-danger/50 shadow-[0_20px_50px_-20px_rgb(255_93_108/0.6)]",
              )}
              style={{ background: "rgb(16 24 42 / 0.9)" }}
            >
              <Icon className={cn("mt-0.5 size-5 shrink-0", TONE[t.tone])} aria-hidden />
              <div className="min-w-0 flex-1">
                <p className="text-sm font-medium text-ink">{t.title}</p>
                {t.description && <p className="mt-0.5 text-xs text-ink-muted">{t.description}</p>}
                {t.action && (
                  <Link href={t.action.href} onClick={() => dismiss(t.id)} className="mt-2 inline-block text-xs font-semibold text-accent hover:underline">
                    {t.action.label}
                  </Link>
                )}
              </div>
              <button
                onClick={() => dismiss(t.id)}
                className="-m-1 rounded-md p-1 text-ink-subtle hover:text-ink"
                aria-label="Cerrar notificación"
              >
                <X className="size-4" />
              </button>
            </div>
          );
        })}
      </div>
    </ToastContext.Provider>
  );
}

export function useToast() {
  const ctx = useContext(ToastContext);
  if (!ctx) throw new Error("useToast debe usarse dentro de <ToastProvider>");
  return ctx.toast;
}
