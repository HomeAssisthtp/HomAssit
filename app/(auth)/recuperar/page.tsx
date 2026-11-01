import type { Metadata } from "next";
import { AuthShell } from "@/components/auth/auth-shell";
import { RecoverForm } from "@/components/auth/recover-form";

export const metadata: Metadata = { title: "Recuperar contraseña" };

export default function RecoverPage() {
  return (
    <AuthShell title="Recupera tu acceso" subtitle="Te enviaremos un enlace para restablecer tu contraseña.">
      <RecoverForm />
    </AuthShell>
  );
}
