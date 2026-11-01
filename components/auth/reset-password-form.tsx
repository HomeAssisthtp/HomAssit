"use client";

import { CheckCircle2, CircleAlert, KeyRound } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, type FormEvent } from "react";
import { Field } from "@/components/ui/form";
import { GlassButton } from "@/components/ui/glass-button";
import { fieldErrors, newPasswordSchema } from "@/lib/validation";
import { api } from "@/services";
import { PasswordInput } from "./password-input";

/** Paso final de la recuperación: el enlace del correo ya abrió la sesión. */
export function ResetPasswordForm() {
  const router = useRouter();
  const [v, setV] = useState({ password: "", confirm: "" });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [formError, setFormError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [done, setDone] = useState(false);

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setFormError(null);
    const parsed = newPasswordSchema.safeParse(v);
    if (!parsed.success) {
      setErrors(fieldErrors(parsed.error));
      return;
    }
    setErrors({});
    setLoading(true);
    try {
      await api.auth.updatePassword(parsed.data.password);
      setDone(true);
    } catch (err) {
      setFormError((err as Error).message);
    } finally {
      setLoading(false);
    }
  }

  if (done) {
    return (
      <div className="flex flex-col items-center gap-4 text-center" role="status">
        <span className="inline-flex size-14 items-center justify-center rounded-2xl border border-ok/30 bg-ok/10 text-ok">
          <CheckCircle2 className="size-6" aria-hidden />
        </span>
        <div>
          <p className="text-lg font-semibold text-ink">Contraseña actualizada</p>
          <p className="mt-1.5 text-sm text-ink-muted">Ya puedes usarla para iniciar sesión.</p>
        </div>
        <GlassButton variant="primary" className="w-full" onClick={() => router.replace("/dashboard")}>
          Ir a mi hogar
        </GlassButton>
      </div>
    );
  }

  return (
    <form onSubmit={onSubmit} noValidate className="flex flex-col gap-4">
      {formError && (
        <div role="alert" className="flex items-start gap-2.5 rounded-xl border border-danger/35 bg-danger/10 px-3.5 py-3 text-sm text-danger">
          <CircleAlert className="mt-0.5 size-4 shrink-0" aria-hidden />
          <span>
            {formError}{" "}
            <Link href="/recuperar" className="font-medium underline">
              Solicitar enlace
            </Link>
          </span>
        </div>
      )}
      <Field label="Contraseña nueva" error={errors.password} hint="Mínimo 8 caracteres, con letras y números">
        {(p) => <PasswordInput {...p} autoComplete="new-password" value={v.password} onChange={(e) => setV((s) => ({ ...s, password: e.target.value }))} />}
      </Field>
      <Field label="Confirmar contraseña" error={errors.confirm}>
        {(p) => <PasswordInput {...p} autoComplete="new-password" value={v.confirm} onChange={(e) => setV((s) => ({ ...s, confirm: e.target.value }))} />}
      </Field>
      <GlassButton type="submit" variant="primary" size="lg" loading={loading} className="mt-1 w-full">
        {!loading && <KeyRound aria-hidden />}
        {loading ? "Guardando…" : "Guardar contraseña"}
      </GlassButton>
    </form>
  );
}
