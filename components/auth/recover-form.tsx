"use client";

import { ArrowLeft, MailCheck } from "lucide-react";
import Link from "next/link";
import { useState, type FormEvent } from "react";
import { Field, Input } from "@/components/ui/form";
import { GlassButton } from "@/components/ui/glass-button";
import { fieldErrors, recoverSchema } from "@/lib/validation";
import { api } from "@/services";

/** Recuperación de contraseña (preparada para Supabase Auth: resetPasswordForEmail). */
export function RecoverForm() {
  const [email, setEmail] = useState("");
  const [error, setError] = useState<string>();
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    const parsed = recoverSchema.safeParse({ email });
    if (!parsed.success) {
      setError(fieldErrors(parsed.error).email);
      return;
    }
    setError(undefined);
    setLoading(true);
    await api.auth.requestPasswordReset(parsed.data.email);
    setLoading(false);
    setSent(true);
  }

  if (sent) {
    return (
      <div className="flex flex-col items-center gap-4 text-center" role="status">
        <span className="inline-flex size-14 items-center justify-center rounded-2xl border border-ok/30 bg-ok/10 text-ok">
          <MailCheck className="size-6" aria-hidden />
        </span>
        <p className="text-sm text-ink-muted">
          Si <span className="text-ink">{email}</span> está registrado, recibirás un enlace para restablecer tu contraseña.
        </p>
        <GlassButton asChild variant="glass" className="w-full">
          <Link href="/login">
            <ArrowLeft aria-hidden /> Volver a iniciar sesión
          </Link>
        </GlassButton>
      </div>
    );
  }

  return (
    <form onSubmit={onSubmit} noValidate className="flex flex-col gap-4">
      <Field label="Correo electrónico" error={error}>
        {(p) => <Input {...p} type="email" autoComplete="email" placeholder="tu@correo.com" value={email} onChange={(e) => setEmail(e.target.value)} />}
      </Field>
      <GlassButton type="submit" variant="primary" size="lg" loading={loading} className="w-full">
        {loading ? "Enviando…" : "Enviar enlace"}
      </GlassButton>
      <Link href="/login" className="inline-flex items-center justify-center gap-1.5 text-sm text-accent hover:underline">
        <ArrowLeft className="size-4" aria-hidden /> Volver a iniciar sesión
      </Link>
    </form>
  );
}
