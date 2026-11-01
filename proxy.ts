import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";
import { isSupabaseConfigured, SUPABASE_ANON_KEY, SUPABASE_URL } from "@/lib/supabase/config";

/**
 * Protección de rutas (Next.js 16 "proxy", antes middleware).
 *  - Con Supabase: valida la sesión real con `auth.getUser()` y refresca sus cookies.
 *  - Modo demo: usa la cookie `ha_session` escrita por el servicio mock.
 * La cookie `ha_session` (rol) solo se usa como pista para redirigir; la
 * autorización de datos la aplica la base de datos con RLS.
 */

const PUBLIC = ["/login", "/registro", "/recuperar"];
const PRINCIPAL_ONLY = ["/sensores", "/estadisticas", "/dispositivo", "/contactos", "/configuracion"];

export async function proxy(req: NextRequest) {
  const { pathname } = req.nextUrl;
  const role = req.cookies.get("ha_session")?.value;
  const isPublic = PUBLIC.some((p) => pathname.startsWith(p));

  // Los enlaces de los correos se validan en su propia ruta (app/auth/confirm).
  if (pathname.startsWith("/auth/")) return NextResponse.next({ request: req });

  let res = NextResponse.next({ request: req });
  let authenticated = Boolean(role);

  if (isSupabaseConfigured) {
    const supabase = createServerClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
      cookies: {
        getAll: () => req.cookies.getAll(),
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) => req.cookies.set(name, value));
          res = NextResponse.next({ request: req });
          cookiesToSet.forEach(({ name, value, options }) => res.cookies.set(name, value, options));
        },
      },
    });
    const { data } = await supabase.auth.getUser();
    authenticated = Boolean(data.user);
  }

  // Conserva las cookies de sesión refrescadas al redirigir.
  const redirect = (to: string, next?: string) => {
    const url = new URL(to, req.url);
    if (next) url.searchParams.set("next", next);
    const r = NextResponse.redirect(url);
    res.cookies.getAll().forEach((c) => r.cookies.set(c));
    return r;
  };

  if (pathname === "/") return redirect(authenticated ? "/dashboard" : "/login");
  if (!authenticated && !isPublic) return redirect("/login", pathname);
  if (authenticated && isPublic) return redirect("/dashboard");
  if (role === "contact" && PRINCIPAL_ONLY.some((p) => pathname.startsWith(p))) return redirect("/dashboard");
  return res;
}

export const config = {
  matcher: ["/((?!api|_next/static|_next/image|favicon.ico|icon.svg|.*\\.(?:svg|png|jpg|ico)$).*)"],
};
