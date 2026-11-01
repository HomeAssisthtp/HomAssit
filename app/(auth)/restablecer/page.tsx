import type { Metadata } from "next";
import { AuthShell } from "@/components/auth/auth-shell";
import { ResetPasswordForm } from "@/components/auth/reset-password-form";

export const metadata: Metadata = { title: "Nueva contraseña" };

export default function ResetPasswordPage() {
  return (
    <AuthShell title="Elige una contraseña nueva" subtitle="Será la que uses a partir de ahora para iniciar sesión.">
      <ResetPasswordForm />
    </AuthShell>
  );
}
