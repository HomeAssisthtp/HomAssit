import { networkInterfaces } from "node:os";
import { NextResponse } from "next/server";
import { isSupabaseConfigured } from "@/lib/supabase/config";
import { createClient } from "@/lib/supabase/server";

/**
 * Datos para configurar el firmware desde la página Dispositivo.
 * Solo el usuario principal (o admin) con sesión puede ver la clave del dispositivo.
 */
const DEVICE_API_KEY = process.env.DEVICE_API_KEY || "dev-homeassist-key";

/** IPv4 privadas de esta computadora: el ESP32 se conecta a una de ellas por Wi-Fi. */
function lanAddresses() {
  const out: string[] = [];
  for (const list of Object.values(networkInterfaces())) {
    for (const a of list ?? []) {
      if (a.family !== "IPv4" || a.internal) continue;
      if (/^(192.168.|10.|172.(1[6-9]|2d|3[01]).)/.test(a.address)) out.push(a.address);
    }
  }
  // Las redes 192.168.x suelen ser el Wi-Fi de casa; las virtuales (VirtualBox, WSL) quedan al final.
  return out.sort((a, b) => Number(b.startsWith("192.168.") && !b.startsWith("192.168.56.")) - Number(a.startsWith("192.168.") && !a.startsWith("192.168.56.")));
}

export async function GET() {
  if (isSupabaseConfigured) {
    const supabase = await createClient();
    const { data } = await supabase.auth.getUser();
    if (!data.user) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
    const { data: profile } = await supabase.from("profiles").select("role").eq("id", data.user.id).maybeSingle();
    if (profile?.role !== "principal" && profile?.role !== "admin") {
      return NextResponse.json({ error: "forbidden" }, { status: 403 });
    }
  }
  return NextResponse.json(
    { apiKey: DEVICE_API_KEY, lanAddresses: lanAddresses() },
    { headers: { "Cache-Control": "no-store" } },
  );
}
