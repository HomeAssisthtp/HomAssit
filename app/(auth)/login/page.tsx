import type { Metadata } from "next";
import { Suspense } from "react";
import { AuthShell } from "@/components/auth/auth-shell";
import { LoginForm } from "@/components/auth/login-form";

export const metadata: Metadata = { title: "Iniciar sesión" };

export default function LoginPage() {
  return (
    <AuthShell title="Bienvenido de nuevo" subtitle="Inicia sesión para consultar el estado de tu hogar.">
      <Suspense>
        <LoginForm />
      </Suspense>
    </AuthShell>
  );
}
