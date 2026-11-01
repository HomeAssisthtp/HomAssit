import { isSupabaseConfigured } from "@/lib/supabase/config";
import { mockApi, mockSimulator } from "./mock/mock-api";
import { supabaseApi } from "./supabase/supabase-api";
import type { DeviceSimulator, HomeAssistApi } from "./types";

/**
 * Punto único de acceso a datos.
 * Con NEXT_PUBLIC_SUPABASE_URL / ANON_KEY en .env.local se usa Supabase;
 * sin ellas, la app funciona en modo demo con datos mock.
 */
export const api: HomeAssistApi = isSupabaseConfigured ? supabaseApi : mockApi;

/** Simulador del ESP32 en el navegador: solo existe en modo demo. */
export const simulator: DeviceSimulator | null = api.mode === "mock" ? mockSimulator : null;

export const dataSourceLabel = api.mode === "supabase" ? "Supabase" : "Datos de demostración";

export * from "./types";
