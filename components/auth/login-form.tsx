"use client";

import { CircleAlert, LogIn } from "lucide-react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useState, type FormEvent } from "react";
import { useSession } from "@/components/providers/session-provider";
import { Field, Input } from "@/components/ui/form";
import { GlassButton } from "@/components/ui/glass-button";
import { DEMO_ACCOUNTS } from "@/lib/mock-data";
import { ROLE_LABEL } from "@/lib/permissions";
import { fieldErrors, loginSchema } from "@/lib/validation";
import { api } from "@/services";
import { PasswordInput } from "./password-input";

/** HU-02: correo + contraseña, error ante credenciales incorrectas, redirección al dashboard. */
export function LoginForm() {
  const { signIn } = useSession();
  const router = useRouter();
  const params = useSearchParams();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [formError, setFormError] = useState<string | null>(
    params.get("enlace") === "invalido" ? "El enlace no es válido o ya caducó. Solicita uno nuevo o inicia sesión." : null,
  );
  const [loading, setLoading] = useState(false);

  async function submit(values: { email: string; password: string }) {
    setFormError(null);
    const parsed = loginSchema.safeParse(values);
    if (!parsed.success) {
      setErrors(fieldErrors(parsed.error));
      return;
    }
    setErrors({});
    setLoading(true);
    try {
      await signIn(parsed.data.email, parsed.data.password);
      const next = params.get("next");
      router.replace(next && next.startsWith("/") ? next : "/dashboard");
    } catch (e) {
      setFormError((e as Error).message);
      setLoading(false);
    }
  }

  const onSubmit = (e: FormEvent) => {
    e.preventDefault();
    submit({ email, password });
  };

  return (
    <div className="flex flex-col gap-6">
      <form onSubmit={onSubmit} noValidate className="flex flex-col gap-4">
        {formError && (
          <div role="alert" className="flex items-start gap-2.5 rounded-xl border border-danger/35 bg-danger/10 px-3.5 py-3 text-sm text-danger">
            <CircleAlert className="mt-0.5 size-4 shrink-0" aria-hidden />
            {formError}
          </div>
        )}
        <Field label="Correo electrónico" error={errors.email}>
          {(p) => <Input {...p} type="email" autoComplete="email" placeholder="tu@correo.com" value={email} onChange={(e) => setEmail(e.target.value)} />}
        </Field>
        <Field label="Contraseña" error={errors.password}>
          {(p) => <PasswordInput {...p} autoComplete="current-password" placeholder="••••••••" value={password} onChange={(e) => setPassword(e.target.value)} />}
        </Field>
        <div className="-mt-1 flex justify-end">
          <Link href="/recuperar" className="text-sm text-accent hover:underline">
            ¿Olvidaste tu contraseña?
          </Link>
        </div>
        <GlassButton type="submit" variant="primary" size="lg" loading={loading} className="w-full">
          {!loading && <LogIn aria-hidden />}
          {loading ? "Verificando…" : "Iniciar sesión"}
        </GlassButton>
      </form>

      <p className="text-center text-sm text-ink-muted">
        ¿No tienes cuenta?{" "}
        <Link href="/registro" className="font-medium text-accent hover:underline">
          Crear cuenta
        </Link>
      </p>

      {api.mode === "mock" && (
        <div className="rounded-2xl glass-subtle p-3.5">
          <p className="mb-2.5 text-xs font-medium text-ink-subtle">Cuentas de demostración</p>
          <div className="flex flex-col gap-1.5">
            {DEMO_ACCOUNTS.filter((a) => a.role !== "admin").map((a) => (
              <button
                key={a.id}
                type="button"
                disabled={loading}
                onClick={() => {
                  setEmail(a.email);
                  setPassword(a.password);
                  submit({ email: a.email, password: a.password });
                }}
                className="flex items-center justify-between rounded-xl px-3 py-2.5 text-left text-sm transition-colors hover:bg-white/[0.05] disabled:opacity-50"
              >
                <span className="text-ink">{a.name}</span>
                <span className="text-xs text-ink-subtle">{ROLE_LABEL[a.role]}</span>
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
