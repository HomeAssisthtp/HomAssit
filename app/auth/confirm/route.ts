import type { EmailOtpType } from "@supabase/supabase-js";
import { NextResponse, type NextRequest } from "next/server";
import { isSupabaseConfigured } from "@/lib/supabase/config";
import { createClient } from "@/lib/supabase/server";

/**
 * Destino de los enlaces de los correos de autenticación (confirmar cuenta,
 * restablecer contraseña, cambio de correo, invitación).
 * Valida el token de un solo uso, abre la sesión y redirige dentro de la app.
 */
const TYPES: EmailOtpType[] = ["signup", "invite", "magiclink", "recovery", "email_change", "email"];

export async function GET(req: NextRequest) {
  const params = req.nextUrl.searchParams;
  const tokenHash = params.get("token_hash");
  const type = params.get("type") as EmailOtpType | null;
  const requested = params.get("next") ?? "/dashboard";
  // Solo rutas internas: evita redirecciones a otros sitios.
  const next = requested.startsWith("/") && !requested.startsWith("//") ? requested : "/dashboard";

  if (isSupabaseConfigured && tokenHash && type && TYPES.includes(type)) {
    const supabase = await createClient();
    const { error } = await supabase.auth.verifyOtp({ type, token_hash: tokenHash });
    if (!error) return NextResponse.redirect(new URL(next, req.url));
  }
  return NextResponse.redirect(new URL("/login?enlace=invalido", req.url));
}
