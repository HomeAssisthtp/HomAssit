"use client";

import { useEffect, useState, type FormEvent } from "react";
import { Field, Input } from "@/components/ui/form";
import { GlassButton } from "@/components/ui/glass-button";
import { GlassModal } from "@/components/ui/glass-modal";
import { useAsyncAction } from "@/hooks/use-home-actions";
import { fieldErrors, roomSchema } from "@/lib/validation";
import { api } from "@/services";

export function RoomFormModal({ open, onOpenChange }: { open: boolean; onOpenChange: (o: boolean) => void }) {
  const [name, setName] = useState("");
  const [error, setError] = useState<string>();
  const { run, loading } = useAsyncAction();

  useEffect(() => {
    if (open) {
      setName("");
      setError(undefined);
    }
  }, [open]);

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    const parsed = roomSchema.safeParse({ name });
    if (!parsed.success) {
      setError(fieldErrors(parsed.error).name);
      return;
    }
    setError(undefined);
    const ok = await run(() => api.rooms.create(parsed.data.name), { success: "Habitación agregada", error: "No se pudo agregar" });
    if (ok) onOpenChange(false);
  }

  return (
    <GlassModal
      open={open}
      onOpenChange={onOpenChange}
      size="sm"
      title="Agregar habitación"
      description="Las habitaciones agrupan los sensores por ubicación."
      footer={
        <>
          <GlassButton variant="ghost" onClick={() => onOpenChange(false)}>
            Cancelar
          </GlassButton>
          <GlassButton variant="primary" type="submit" form="room-form" loading={loading}>
            Agregar
          </GlassButton>
        </>
      }
    >
      <form id="room-form" onSubmit={onSubmit} noValidate>
        <Field label="Nombre" error={error}>
          {(p) => <Input {...p} placeholder="Ej. Baño, Pasillo, Cochera" value={name} onChange={(e) => setName(e.target.value)} />}
        </Field>
      </form>
    </GlassModal>
  );
}
