"use client";

import * as Dialog from "@radix-ui/react-dialog";
import { X } from "lucide-react";
import { useRef, type ReactNode } from "react";
import { cn } from "@/lib/utils";

/**
 * Modal con transición espacial (emerge desde la profundidad).
 * Radix gestiona foco atrapado, Escape y aria-modal.
 */
export function GlassModal({
  open,
  onOpenChange,
  title,
  description,
  children,
  footer,
  size = "md",
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: ReactNode;
  description?: ReactNode;
  children: ReactNode;
  footer?: ReactNode;
  size?: "sm" | "md" | "lg";
}) {
  const bodyRef = useRef<HTMLDivElement>(null);
  return (
    <Dialog.Root open={open} onOpenChange={onOpenChange}>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 z-50 bg-bg-deep/70 backdrop-blur-sm data-[state=open]:animate-[fade-up_0.25s_ease-out] data-[state=closed]:opacity-0 transition-opacity" />
        <Dialog.Content
          onOpenAutoFocus={(e) => {
            // Con formulario, el foco va al primer campo (no al botón de cerrar).
            const field = bodyRef.current?.querySelector<HTMLElement>("input:not([disabled]), select:not([disabled]), textarea");
            if (field) {
              e.preventDefault();
              field.focus();
            }
          }}
          className={cn(
            "glass-strong sheen fixed left-1/2 top-1/2 z-50 flex max-h-[calc(100dvh-2rem)] w-[calc(100vw-2rem)] -translate-x-1/2 -translate-y-1/2 flex-col rounded-[1.5rem] outline-none",
            "data-[state=open]:animate-[modal-in_0.35s_cubic-bezier(0.2,0.8,0.2,1)]",
            size === "sm" && "max-w-md",
            size === "md" && "max-w-lg",
            size === "lg" && "max-w-2xl",
          )}
          style={{ background: "linear-gradient(180deg, rgb(22 32 52 / 0.92), rgb(10 16 30 / 0.94))" }}
        >
          <div className="flex items-start justify-between gap-4 border-b border-line px-6 pb-4 pt-5">
            <div className="min-w-0">
              <Dialog.Title className="text-lg font-semibold text-ink">{title}</Dialog.Title>
              {description ? (
                <Dialog.Description className="mt-1 text-sm text-ink-muted">{description}</Dialog.Description>
              ) : (
                <Dialog.Description className="sr-only">Ventana de diálogo</Dialog.Description>
              )}
            </div>
            <Dialog.Close
              className="-mr-2 inline-flex size-9 shrink-0 items-center justify-center rounded-lg text-ink-muted hover:bg-white/8 hover:text-ink"
              aria-label="Cerrar"
            >
              <X className="size-4" />
            </Dialog.Close>
          </div>
          <div ref={bodyRef} className="overflow-y-auto px-6 py-5">
            {children}
          </div>
          {footer && <div className="flex flex-wrap justify-end gap-2 border-t border-line px-6 py-4">{footer}</div>}
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
