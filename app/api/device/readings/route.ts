import { createClient } from "@supabase/supabase-js";
import { NextResponse } from "next/server";
import { evaluateIngest, ingestPayloadSchema } from "@/lib/ingest";
import { DEFAULT_SETTINGS } from "@/lib/mock-data";
import { isSupabaseConfigured, SUPABASE_ANON_KEY, SUPABASE_URL } from "@/lib/supabase/config";

/**
 * Endpoint de ingesta para el ESP32 (RF-19). Contrato completo en firmware/README.md.
 *
 *   POST /api/device/readings
 *   Authorization: Bearer <DEVICE_API_KEY>
 *
 * Con Supabase, el reporte se guarda con la función `ingest_device_report` de la base
 * de datos, que valida la clave del dispositivo (guardada como hash) y aplica las reglas
 * de umbrales, eventos y alertas. El dashboard se actualiza por Realtime.
 * Sin Supabase (modo demo) solo valida y responde los comandos.
 */

const DEV_API_KEY = process.env.DEVICE_API_KEY || "dev-homeassist-key";

const db = isSupabaseConfigured
  ? createClient(SUPABASE_URL, SUPABASE_ANON_KEY, { auth: { persistSession: false, autoRefreshToken: false } })
  : null;

export async function POST(req: Request) {
  const auth = req.headers.get("authorization") ?? "";
  const key = auth.startsWith("Bearer ") ? auth.slice(7).trim() : "";
  if (!key) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const body = await req.json().catch(() => null);
  const parsed = ingestPayloadSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "invalid_payload", issues: parsed.error.issues }, { status: 422 });
  }
  const payload = parsed.data;

  if (!db) {
    if (key !== DEV_API_KEY) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
    const result = evaluateIngest(payload, DEFAULT_SETTINGS);
    log(payload.deviceUid, `modo demo · alertas=${result.events.filter((e) => e.alertTitle).length} buzzer=${result.commands.buzzer}`);
    return NextResponse.json(
      { ok: true, receivedAt: new Date().toISOString(), derived: result.events, commands: result.commands, persisted: false },
      { status: 202 },
    );
  }

  const { data, error } = await db.rpc("ingest_device_report", { p_key: key, p_report: payload });
  if (error) {
    if (error.code === "28000" || error.message.includes("unauthorized")) {
      log(payload.deviceUid, "clave de dispositivo rechazada");
      return NextResponse.json({ error: "unauthorized" }, { status: 401 });
    }
    // RNF-13: registrar errores de comunicación / procesamiento.
    console.error(`[ESP32 ${payload.deviceUid}] error al guardar:`, error.message);
    return NextResponse.json({ error: "storage_error" }, { status: 500 });
  }
  if (!data?.ok) {
    log(payload.deviceUid, "dispositivo no registrado en la plataforma");
    return NextResponse.json({ error: "device_not_registered", hint: "Registra este deviceUid en la página Dispositivo." }, { status: 404 });
  }

  const unknown: string[] = data.unknownSensors ?? [];
  log(
    payload.deviceUid,
    `lecturas=${data.saved.readings} eventos=${data.saved.events} alertas=${data.saved.alerts} buzzer=${data.commands.buzzer}` +
      (unknown.length ? ` · sensores sin registrar: ${unknown.join(", ")}` : ""),
  );
  return NextResponse.json({ ...data, persisted: true }, { status: 202 });
}

function log(deviceUid: string, message: string) {
  if (process.env.NODE_ENV !== "production") console.log(`[ESP32 ${deviceUid}] ${message}`);
}
