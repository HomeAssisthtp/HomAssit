"use client";

import type { PostgrestError, SupabaseClient } from "@supabase/supabase-js";
import { DEFAULT_SETTINGS } from "@/lib/mock-data";
import { CONTACT_HISTORY_DAYS } from "@/lib/permissions";
import { createClient } from "@/lib/supabase/client";
import type { HomeSnapshot, Session, User } from "@/types";
import { ApiError, type HomeAssistApi } from "../types";
import {
  settingsToRow,
  toAlert,
  toContact,
  toDevice,
  toEvent,
  toReading,
  toRoom,
  toSensor,
  toSettings,
  toUser,
  type Row,
} from "./mappers";

/**
 * Implementación real del contrato HomeAssistApi sobre Supabase.
 * La autorización la aplica la base de datos (RLS): aquí solo se consulta
 * y cada usuario recibe únicamente las filas que le corresponden.
 */

const SESSION_COOKIE = "ha_session";
const DAY = 24 * 60 * 60 * 1000;

let client: SupabaseClient | null = null;
const db = () => (client ??= createClient());

/** Suscriptores locales: se notifican tras cada cambio hecho desde esta pestaña. */
const listeners = new Set<() => void>();
const notify = () => listeners.forEach((l) => l());

function fail(error: PostgrestError | { message: string; code?: string } | null, fallback: string): never {
  const code = error?.code;
  if (code === "23505") throw new ApiError("Ya existe un registro con esos datos", "email_taken");
  if (code === "42501" || code === "PGRST301") throw new ApiError("No tienes permiso para realizar esta acción", "forbidden");
  if (code === "PGRST116") throw new ApiError("No se encontró el registro", "not_found");
  throw new ApiError(error?.message ? `${fallback}: ${error.message}` : fallback, "unknown");
}

/** Pista de rol para el proxy (redirecciones). La seguridad real es RLS. */
function setRoleCookie(role: string | null) {
  if (typeof document === "undefined") return;
  document.cookie = role
    ? `${SESSION_COOKIE}=${role}; path=/; max-age=${60 * 60 * 24 * 7}; samesite=lax`
    : `${SESSION_COOKIE}=; path=/; max-age=0; samesite=lax`;
}

async function loadSession(userId: string): Promise<Session | null> {
  const { data: profile } = await db().from("profiles").select("*").eq("id", userId).maybeSingle();
  if (!profile) return null;
  const user = toUser(profile);
  setRoleCookie(user.role);
  if (user.role !== "contact") return { user };
  const [{ data: contact }, { data: owner }] = await Promise.all([
    db().from("authorized_contacts").select("can_view_alerts, can_view_history, can_attend_alerts, status").eq("user_id", userId).maybeSingle(),
    user.ownerId ? db().from("profiles").select("name").eq("id", user.ownerId).maybeSingle() : Promise.resolve({ data: null }),
  ]);
  const active = contact?.status === "active";
  return {
    user,
    ownerName: owner?.name ?? undefined,
    contactPermissions: {
      viewAlerts: active && !!contact?.can_view_alerts,
      viewHistory: active && !!contact?.can_view_history,
      attendAlerts: active && !!contact?.can_attend_alerts,
    },
  };
}

async function currentUserId() {
  const { data } = await db().auth.getSession();
  const id = data.session?.user.id;
  if (!id) throw new ApiError("Tu sesión expiró. Inicia sesión de nuevo.", "forbidden");
  return id;
}

/** Dispositivo del hogar del usuario actual. */
async function currentDevice(): Promise<Row> {
  const owner = await currentUserId();
  const { data, error } = await db().from("devices").select("*").eq("owner_id", owner).maybeSingle();
  if (error) fail(error, "No se pudo consultar el dispositivo");
  if (!data) throw new ApiError("Registra primero un dispositivo", "not_found");
  return data;
}

async function fetchSnapshot(session: Session): Promise<HomeSnapshot> {
  const s = db();
  const isContact = session.user.role === "contact";
  const eventsSince = new Date(Date.now() - (isContact ? CONTACT_HISTORY_DAYS : 30) * DAY).toISOString();
  const readingsSince = new Date(Date.now() - DAY).toISOString();

  // Hogar que se consulta: el propio, o el del usuario principal que autorizó al contacto.
  const ownerId = (isContact ? session.user.ownerId : session.user.id) ?? session.user.id;
  const none = Promise.resolve({ data: [] as Row[], error: null });

  const [device, rooms, contacts, settings] = await Promise.all([
    s.from("devices").select("*").eq("owner_id", ownerId).maybeSingle(),
    s.from("rooms").select("*").eq("owner_id", ownerId).order("created_at"),
    isContact ? none : s.from("authorized_contacts").select("*").eq("owner_id", ownerId).order("created_at"),
    s.from("system_settings").select("*").eq("owner_id", ownerId).maybeSingle(),
  ]);
  const deviceId: string | undefined = device.data?.id;

  const [sensors, alerts, events] = await Promise.all([
    deviceId ? s.from("sensors").select("*").eq("device_id", deviceId).order("created_at") : none,
    deviceId ? s.from("alerts").select("*").eq("device_id", deviceId).order("created_at", { ascending: false }).limit(300) : none,
    deviceId
      ? s.from("events").select("*").eq("device_id", deviceId).gte("occurred_at", eventsSince).order("occurred_at", { ascending: false }).limit(1500)
      : none,
  ]);
  const sensorIds = (sensors.data ?? []).filter((x) => x.type === "temperature" || x.type === "gas").map((x) => x.id);
  const readings = sensorIds.length
    ? await s.from("sensor_readings").select("*").in("sensor_id", sensorIds).gte("recorded_at", readingsSince).order("recorded_at").limit(3000)
    : await none;

  const firstError = [device, rooms, sensors, readings, alerts, events, contacts, settings].find((r) => r.error)?.error;
  if (firstError) fail(firstError, "No se pudo cargar la información del hogar");

  return {
    device: device.data ? toDevice(device.data) : null,
    rooms: (rooms.data ?? []).map(toRoom),
    sensors: (sensors.data ?? []).map(toSensor),
    readings: (readings.data ?? []).map(toReading),
    alerts: (alerts.data ?? []).map(toAlert),
    events: (events.data ?? []).map(toEvent),
    contacts: (contacts.data ?? []).map(toContact),
    settings: settings.data ? toSettings(settings.data) : { ...DEFAULT_SETTINGS },
  };
}

function authMessage(message: string) {
  const m = message.toLowerCase();
  if (m.includes("invalid login")) return new ApiError("Correo o contraseña incorrectos", "invalid_credentials");
  if (m.includes("not confirmed")) return new ApiError("Confirma tu correo electrónico antes de iniciar sesión", "forbidden");
  if (m.includes("already registered")) return new ApiError("Este correo ya está registrado", "email_taken");
  if (m.includes("rate limit")) return new ApiError("Demasiados intentos. Espera un momento e inténtalo de nuevo.", "network");
  if (m.includes("password")) return new ApiError("La contraseña no cumple los requisitos de seguridad", "unknown");
  return new ApiError(message, "unknown");
}

export const supabaseApi: HomeAssistApi = {
  mode: "supabase",

  auth: {
    async getSession() {
      const { data } = await db().auth.getSession();
      const id = data.session?.user.id;
      if (!id) {
        setRoleCookie(null);
        return null;
      }
      return loadSession(id);
    },

    async signIn({ email, password }) {
      const { data, error } = await db().auth.signInWithPassword({ email: email.trim(), password });
      if (error || !data.user) throw authMessage(error?.message ?? "No se pudo iniciar sesión");
      const session = await loadSession(data.user.id);
      if (!session) throw new ApiError("Tu cuenta no tiene un perfil asociado", "not_found");
      return session;
    },

    async signUp({ name, email, password }) {
      const { data, error } = await db().auth.signUp({
        email: email.trim().toLowerCase(),
        password,
        options: { data: { name: name.trim() } },
      });
      if (error) throw authMessage(error.message);
      // Supabase no revela si el correo existe: devuelve un usuario sin identidades.
      if (data.user && data.user.identities?.length === 0) throw new ApiError("Este correo ya está registrado", "email_taken");
      if (!data.session || !data.user) {
        throw new ApiError("Te enviamos un correo para confirmar tu cuenta.", "confirm_email");
      }
      const session = await loadSession(data.user.id);
      if (!session) throw new ApiError("La cuenta se creó, pero no se pudo cargar el perfil", "unknown");
      return session;
    },

    async signOut() {
      await db().auth.signOut();
      setRoleCookie(null);
    },

    async requestPasswordReset(email) {
      // El enlace del correo lo arma la plantilla: /auth/confirm → /restablecer.
      await db().auth.resetPasswordForEmail(email.trim());
    },

    async updatePassword(newPassword) {
      const { error } = await db().auth.updateUser({ password: newPassword });
      if (error) {
        if (error.message.toLowerCase().includes("session")) throw new ApiError("El enlace caducó. Solicita uno nuevo.", "forbidden");
        if (error.message.toLowerCase().includes("different")) throw new ApiError("La contraseña nueva debe ser distinta a la anterior", "unknown");
        throw authMessage(error.message);
      }
    },

    async updateProfile(userId, patch) {
      const { data: current } = await db().from("profiles").select("email").eq("id", userId).single();
      const emailChanged = current && current.email.toLowerCase() !== patch.email.toLowerCase();
      if (emailChanged) {
        const { error } = await db().auth.updateUser({ email: patch.email });
        if (error) throw authMessage(error.message);
      }
      const { data, error } = await db()
        .from("profiles")
        .update({ name: patch.name, phone: patch.phone ?? null, ...(emailChanged ? { email: patch.email.toLowerCase() } : {}) })
        .eq("id", userId)
        .select()
        .single();
      if (error) fail(error, "No se pudo actualizar el perfil");
      return toUser(data as Row);
    },
  },

  home: {
    getSnapshot: fetchSnapshot,

    subscribe(session, onChange) {
      let current: HomeSnapshot | null = null;
      let timer: ReturnType<typeof setTimeout> | null = null;
      let active = true;

      const emit = (snapshot: HomeSnapshot) => {
        current = snapshot;
        if (active) onChange(snapshot);
      };
      // Recarga completa agrupada (eventos, alertas, altas/bajas): varias filas llegan juntas.
      const refresh = () => {
        if (timer) clearTimeout(timer);
        timer = setTimeout(async () => {
          try {
            emit(await fetchSnapshot(session));
          } catch {
            /* el siguiente cambio lo reintenta */
          }
        }, 300);
      };

      // Cambios frecuentes (cada reporte del ESP32): se aplican sobre el estado actual sin consultar.
      const onDevice = (payload: { eventType: string; new: Row }) => {
        if (!current || payload.eventType !== "UPDATE") return refresh();
        if (payload.new.id !== current.device?.id) return;
        emit({ ...current, device: toDevice(payload.new) });
      };
      const onSensor = (payload: { eventType: string; new: Row }) => {
        if (!current || payload.eventType !== "UPDATE") return refresh();
        const next = toSensor(payload.new);
        const prev = current.sensors.find((s) => s.id === next.id);
        if (!prev) return refresh();
        let readings = current.readings;
        const r = next.lastReading;
        if (r && (next.type === "temperature" || next.type === "gas") && r.recordedAt !== prev.lastReading?.recordedAt) {
          const cutoff = Date.now() - DAY;
          readings = [...readings.filter((x) => new Date(x.recordedAt).getTime() >= cutoff), { ...r, id: `rt_${next.id}_${r.recordedAt}` }];
        }
        emit({ ...current, sensors: current.sensors.map((s) => (s.id === next.id ? next : s)), readings });
      };

      const channel = db()
        .channel(`home-${session.user.id}-${Math.random().toString(36).slice(2, 8)}`)
        .on("postgres_changes", { event: "*", schema: "public", table: "devices" }, onDevice)
        .on("postgres_changes", { event: "*", schema: "public", table: "sensors" }, onSensor)
        .on("postgres_changes", { event: "*", schema: "public", table: "events" }, refresh)
        .on("postgres_changes", { event: "*", schema: "public", table: "alerts" }, refresh)
        .subscribe((status) => {
          // Al (re)conectarse el canal, sincroniza por si se perdieron cambios.
          if (status === "SUBSCRIBED") refresh();
        });
      listeners.add(refresh);

      return () => {
        active = false;
        if (timer) clearTimeout(timer);
        listeners.delete(refresh);
        void db().removeChannel(channel);
      };
    },
  },

  alerts: {
    async attend(alertId, by: User) {
      const { data, error } = await db()
        .from("alerts")
        .update({ status: "attended", attended_at: new Date().toISOString(), attended_by: by.id, attended_by_name: by.name })
        .eq("id", alertId)
        .select()
        .single();
      if (error) fail(error, "No se pudo actualizar la alerta");
      const alert = toAlert(data as Row);
      // El botón SOS vuelve a "en espera" (solo el dueño puede; para un contacto RLS lo ignora).
      if (alert.sensorId) {
        await db().from("sensors").update({ last_value: 0 }).eq("id", alert.sensorId).eq("type", "sos");
      }
      notify();
      return alert;
    },
  },

  device: {
    async register({ deviceUid, name, wifiSsid }) {
      const owner = await currentUserId();
      const { data, error } = await db()
        .from("devices")
        .upsert(
          { owner_id: owner, device_uid: deviceUid, name, wifi_ssid: wifiSsid, status: "disconnected", registered_at: new Date().toISOString() },
          { onConflict: "owner_id" },
        )
        .select()
        .single();
      if (error?.code === "23505") throw new ApiError("Ese dispositivo ya está registrado en otra cuenta", "email_taken");
      if (error) fail(error, "No se pudo registrar el dispositivo");
      notify();
      return toDevice(data as Row);
    },

    async ping() {
      const start = performance.now();
      const [{ data: device }, { data: settings }] = await Promise.all([
        db().from("devices").select("status, last_sync_at").limit(1).maybeSingle(),
        db().from("system_settings").select("offline_after_seconds").limit(1).maybeSingle(),
      ]);
      const limit = (settings?.offline_after_seconds ?? DEFAULT_SETTINGS.offlineAfterSeconds) * 1000;
      const fresh = !!device?.last_sync_at && Date.now() - new Date(device.last_sync_at).getTime() < limit;
      notify();
      return { ok: device?.status === "connected" && fresh, latencyMs: Math.round(performance.now() - start) };
    },
  },

  rooms: {
    async create(name) {
      const owner = await currentUserId();
      const { data, error } = await db().from("rooms").insert({ owner_id: owner, name: name.trim() }).select().single();
      if (error?.code === "23505") throw new ApiError("Ya existe una habitación con ese nombre", "email_taken");
      if (error) fail(error, "No se pudo agregar la habitación");
      notify();
      return toRoom(data as Row);
    },
  },

  sensors: {
    async create(input) {
      const device = await currentDevice();
      const { data, error } = await db()
        .from("sensors")
        .insert({
          device_id: device.id,
          room_id: input.roomId,
          type: input.type,
          hardware_id: input.hardwareId,
          name: input.name,
          threshold: input.threshold ?? null,
        })
        .select()
        .single();
      if (error?.code === "23505") throw new ApiError("Ya existe un sensor con ese identificador", "email_taken");
      if (error) fail(error, "No se pudo registrar el sensor");
      notify();
      return toSensor(data as Row);
    },

    async update(sensorId, patch) {
      const row: Row = {};
      if (patch.name !== undefined) row.name = patch.name;
      if (patch.roomId !== undefined) row.room_id = patch.roomId || null;
      if ("threshold" in patch) row.threshold = patch.threshold ?? null;
      if (patch.enabled !== undefined) row.enabled = patch.enabled;
      const { data, error } = await db().from("sensors").update(row).eq("id", sensorId).select().single();
      if (error) fail(error, "No se pudo actualizar el sensor");
      notify();
      return toSensor(data as Row);
    },
  },

  contacts: {
    async create(input) {
      const owner = await currentUserId();
      const { data, error } = await db()
        .from("authorized_contacts")
        .insert({
          owner_id: owner,
          name: input.name,
          email: input.email.toLowerCase(),
          phone: input.phone ?? null,
          relationship: input.relationship,
          can_view_alerts: input.permissions.viewAlerts,
          can_view_history: input.permissions.viewHistory,
          can_attend_alerts: input.permissions.attendAlerts,
        })
        .select()
        .single();
      if (error?.code === "23505") throw new ApiError("Ya existe un contacto con ese correo", "email_taken");
      if (error) fail(error, "No se pudo agregar el contacto");
      notify();
      return toContact(data as Row);
    },

    async update(id, patch) {
      const row: Row = {};
      if (patch.status) row.status = patch.status;
      if (patch.permissions) {
        row.can_view_alerts = patch.permissions.viewAlerts;
        row.can_view_history = patch.permissions.viewHistory;
        row.can_attend_alerts = patch.permissions.attendAlerts;
      }
      const { data, error } = await db().from("authorized_contacts").update(row).eq("id", id).select().single();
      if (error) fail(error, "No se pudo actualizar el contacto");
      notify();
      return toContact(data as Row);
    },

    async remove(id) {
      const { error } = await db().from("authorized_contacts").delete().eq("id", id);
      if (error) fail(error, "No se pudo eliminar el contacto");
      notify();
    },
  },

  settings: {
    async update(patch) {
      const owner = await currentUserId();
      const { data, error } = await db()
        .from("system_settings")
        .upsert({ owner_id: owner, ...settingsToRow(patch) }, { onConflict: "owner_id" })
        .select()
        .single();
      if (error) fail(error, "No se pudo guardar la configuración");
      notify();
      return toSettings(data as Row);
    },
  },
};
