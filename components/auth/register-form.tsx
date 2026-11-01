"use client";

import { CircleAlert, MailCheck, UserPlus } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, type FormEvent } from "react";
import { useSession } from "@/components/providers/session-provider";
import { useToast } from "@/components/providers/toast-provider";
import { Field, Input } from "@/components/ui/form";
import { GlassButton } from "@/components/ui/glass-button";
import { fieldErrors, registerSchema } from "@/lib/validation";
import { ApiError } from "@/services";
import { PasswordInput } from "./password-input";

/** HU-01: nombre, correo y contraseña; valida campos y correo no repetido; notifica al terminar. */
export function RegisterForm() {
  const { signUp } = useSession();
  const toast = useToast();
  const router = useRouter();
  const [values, setValues] = useState({ name: "", email: "", password: "", confirm: "" });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [formError, setFormError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [sentTo, setSentTo] = useState<string | null>(null);
  const set = (k: keyof typeof values) => (e: React.ChangeEvent<HTMLInputElement>) => setValues((v) => ({ ...v, [k]: e.target.value }));

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setFormError(null);
    const parsed = registerSchema.safeParse(values);
    if (!parsed.success) {
      setErrors(fieldErrors(parsed.error));
      return;
    }
    setErrors({});
    setLoading(true);
    try {
      await signUp({ name: parsed.data.name, email: parsed.data.email, password: parsed.data.password });
      toast({ tone: "success", title: "Cuenta creada correctamente", description: "Bienvenido a HomeAssist." });
      router.replace("/dashboard");
    } catch (err) {
      if (err instanceof ApiError && err.code === "confirm_email") setSentTo(parsed.data.email);
      else setFormError((err as Error).message);
      setLoading(false);
    }
  }

  if (sentTo) {
    return (
      <div className="flex flex-col items-center gap-4 text-center" role="status">
        <span className="inline-flex size-14 items-center justify-center rounded-2xl border border-accent/30 bg-accent/10 text-accent">
          <MailCheck className="size-6" aria-hidden />
        </span>
        <div>
          <p className="text-lg font-semibold text-ink">Revisa tu correo</p>
          <p className="mt-1.5 text-sm text-ink-muted">
            Enviamos un enlace de confirmación a <span className="text-ink">{sentTo}</span>. Ábrelo para activar tu cuenta.
          </p>
        </div>
        <p className="text-xs text-ink-subtle">¿No lo ves? Revisa la carpeta de spam o correo no deseado.</p>
        <GlassButton asChild variant="glass" className="w-full">
          <Link href="/login">Ir a iniciar sesión</Link>
        </GlassButton>
      </div>
    );
  }

  return (
    <form onSubmit={onSubmit} noValidate className="flex flex-col gap-4">
      {formError && (
        <div role="alert" className="flex items-start gap-2.5 rounded-xl border border-danger/35 bg-danger/10 px-3.5 py-3 text-sm text-danger">
          <CircleAlert className="mt-0.5 size-4 shrink-0" aria-hidden />
          {formError}
        </div>
      )}
      <Field label="Nombre completo" error={errors.name}>
        {(p) => <Input {...p} autoComplete="name" placeholder="Ana Martínez" value={values.name} onChange={set("name")} />}
      </Field>
      <Field label="Correo electrónico" error={errors.email}>
        {(p) => <Input {...p} type="email" autoComplete="email" placeholder="tu@correo.com" value={values.email} onChange={set("email")} />}
      </Field>
      <Field label="Contraseña" error={errors.password} hint="Mínimo 8 caracteres, con letras y números">
        {(p) => <PasswordInput {...p} autoComplete="new-password" value={values.password} onChange={set("password")} />}
      </Field>
      <Field label="Confirmar contraseña" error={errors.confirm}>
        {(p) => <PasswordInput {...p} autoComplete="new-password" value={values.confirm} onChange={set("confirm")} />}
      </Field>
      <GlassButton type="submit" variant="primary" size="lg" loading={loading} className="mt-1 w-full">
        {!loading && <UserPlus aria-hidden />}
        {loading ? "Creando cuenta…" : "Crear cuenta"}
      </GlassButton>
      <p className="text-center text-sm text-ink-muted">
        ¿Ya tienes cuenta?{" "}
        <Link href="/login" className="font-medium text-accent hover:underline">
          Iniciar sesión
        </Link>
      </p>
    </form>
  );
}
