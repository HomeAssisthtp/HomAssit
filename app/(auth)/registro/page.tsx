import type { Metadata } from "next";
import { AuthShell } from "@/components/auth/auth-shell";
import { RegisterForm } from "@/components/auth/register-form";

export const metadata: Metadata = { title: "Crear cuenta" };

export default function RegisterPage() {
  return (
    <AuthShell title="Crea tu cuenta" subtitle="Registra tu cuenta para monitorear tu hogar con HomeAssist.">
      <RegisterForm />
    </AuthShell>
  );
}
