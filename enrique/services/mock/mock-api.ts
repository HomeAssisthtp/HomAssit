"use client";

import { CONTACT_HISTORY_DAYS } from "@/lib/permissions";
import { createEmptySnapshot, createMockSnapshot, DEMO_ACCOUNTS, DEMO_OWNER_ID } from "@/lib/mock-data";
import { sleep, uid } from "@/lib/utils";
import type { Alert, EventKind, EventSeverity, HomeSnapshot, Session, SystemEvent, User } from "@/types";
import { ApiError, type DeviceSimulator, type HomeAssistApi } from "../types";

/**
 * Implementación mock: un "backend" en memoria persistido en localStorage.
 * Simula latencia de red, el ciclo ESP32 → servidor → plataforma y la
 * suscripción en tiempo real.
 */

const STORE_KEY = "ha.store.v1";
const USERS_KEY = "ha.users.v1";
const SESSION_KEY = "ha.session.v1";
const SESSION_COOKIE = "ha_session";
const STORE_TTL = 12 * 60 * 60 * 1000;
const LATENCY = 350;

type StoredUser = User & { password: string };

const safe = {
  get<T>(key: string): T | null {
    try {
      const raw = localStorage.getItem(key);
      return raw ? (JSON.parse(raw) as T) : null;
    } catch {
      return null;
    }
  },
  set(key: string, value: unknown) {
    try {
      localStorage.setItem(key, JSON.stringify(value));
    } catch {
      /* almacenamiento no disponible: la demo sigue funcionando en memoria */
    }
  },
  remove(key: string) {
    try {
      localStorage.removeItem(key);
    } catch {}
  },
};

/** Cada hogar (usuario principal) tiene su propio almacén. El demo trae datos; los nuevos, vacíos. */
let activeOwner = DEMO_OWNER_ID;
let store: HomeSnapshot | null = null;
let storeOwner: string | null = null;
const listeners = new Set<() => void>();

const storeKey = (owner: string) => `${STORE_KEY}.${owner}`;

function ownerOf(user: User) {
  if (user.role === "contact") return user.ownerId ?? DEMO_OWNER_ID;
  if (user.role === "admin") return DEMO_OWNER_ID;
  return user.id;
}

function db(): HomeSnapshot {
  if (store && storeOwner === activeOwner) return store;
  const saved = safe.get<{ at: number; data: HomeSnapshot }>(storeKey(activeOwner));
  const isDemo = activeOwner === DEMO_OWNER_ID;
  if (saved && (!isDemo || Date.now() - saved.at < STORE_TTL)) store = saved.data;
  else store = isDemo ? createMockSnapshot() : createEmptySnapshot();
  storeOwner = activeOwner;
  return store;
}

function commit() {
  safe.set(storeKey(storeOwner ?? activeOwner), { at: Date.now(), data: store });
  listeners.forEach((l) => l());
}

function users(): StoredUser[] {
  const extra = safe.get<StoredUser[]>(USERS_KEY) ?? [];
  return [...DEMO_ACCOUNTS, ...extra];
}

function setSessionCookie(session: Session | null) {
  if (typeof document === "undefined") return;
  document.cookie = session
    ? `${SESSION_COOKIE}=${session.user.role}; path=/; max-age=${60 * 60 * 24 * 7}; samesite=lax`
    : `${SESSION_COOKIE}=; path=/; max-age=0; samesite=lax`;
}

function buildSession(user: User): Session {
  activeOwner = ownerOf(user);
  if (user.role !== "contact") return { user };
  const contact = db().contacts.find((c) => c.userId === user.id || c.email === user.email);
  return {
    user,
    ownerName: DEMO_ACCOUNTS.find((a) => a.id === user.ownerId)?.name,
    contactPermissions: contact?.permissions ?? { viewAlerts: false, viewHistory: false, attendAlerts: false },
  };
}

/** Aplica las reglas de autorización (RNF-06) antes de entregar datos. */
function scopeFor(session: Session): HomeSnapshot {
  const s = db();
  if (session.user.role !== "contact") return structuredClone(s);
  const fresh = buildSession(session.user).contactPermissions!;
  const since = Date.now() - CONTACT_HISTORY_DAYS * 24 * 60 * 60 * 1000;
  return structuredClone({
    ...s,
    alerts: fresh.viewAlerts ? s.alerts : [],
    events: fresh.viewHistory ? s.events.filter((e) => new Date(e.occurredAt).getTime() >= since) : [],
    contacts: [],
  });
}

/* ---------- Motor de eventos (lo que haría el servidor al recibir datos del ESP32) ---------- */

function recordEvent(
  kind: EventKind,
  severity: EventSeverity,
  description: string,
  opts: { sensorId?: string; value?: number; alertTitle?: string } = {},
) {
  const s = db();
  if (!s.device) return;
  const sensor = s.sensors.find((x) => x.id === opts.sensorId);
  const now = new Date().toISOString();
  const ev: SystemEvent = {
    id: uid("evt"),
    deviceId: s.device.id,
    sensorId: sensor?.id,
    roomId: sensor?.roomId,
    kind,
    severity,
    description,
    value: opts.value,
    occurredAt: now,
  };
  s.events.unshift(ev);
  if (sensor) {
    sensor.lastEventAt = now;
    if (opts.value !== undefined) sensor.lastReading = { id: uid("rd"), sensorId: sensor.id, value: opts.value, recordedAt: now };
  }
  if (opts.alertTitle) {
    const alert: Alert = {
      id: uid("alr"),
      eventId: ev.id,
      deviceId: s.device.id,
      sensorId: ev.sensorId,
      roomId: ev.roomId,
      severity,
      title: opts.alertTitle,
      message: description,
      status: "pending",
      createdAt: now,
    };
    s.alerts.unshift(alert);
  }
}

function sensorOf(type: string, preferredRoom?: string) {
  const s = db();
  return (
    s.sensors.find((x) => x.type === type && x.enabled && (!preferredRoom || x.roomId === preferredRoom)) ??
    s.sensors.find((x) => x.type === type && x.enabled)
  );
}

function roomName(roomId?: string) {
  return db().rooms.find((r) => r.id === roomId)?.name ?? "el hogar";
}

/* ---------- Latido del dispositivo: lecturas periódicas ---------- */

let heartbeat: ReturnType<typeof setInterval> | null = null;
function ensureHeartbeat() {
  if (heartbeat || typeof window === "undefined") return;
  heartbeat = setInterval(() => {
    const s = db();
    if (!s.device || s.device.status !== "connected") return;
    const now = new Date().toISOString();
    s.device.lastSyncAt = now;
    s.device.wifiRssi = Math.max(-80, Math.min(-45, s.device.wifiRssi + Math.round((Math.random() - 0.5) * 4)));
    for (const sensor of s.sensors) {
      if (!sensor.enabled || !sensor.lastReading) continue;
      if (sensor.type === "temperature") {
        const drift = (Math.random() - 0.5) * 0.2;
        const v = Math.round((sensor.lastReading.value + drift) * 10) / 10;
        sensor.lastReading = { id: uid("rd"), sensorId: sensor.id, value: v, recordedAt: now };
        s.readings.push({ ...sensor.lastReading });
      } else if (sensor.type === "gas") {
        const v = Math.max(80, Math.round(sensor.lastReading.value + (Math.random() - 0.55) * 8));
        sensor.lastReading = { id: uid("rd"), sensorId: sensor.id, value: v, recordedAt: now };
      } else {
        sensor.lastReading = { ...sensor.lastReading, recordedAt: now };
      }
    }
    const cutoff = Date.now() - 24 * 60 * 60 * 1000;
    s.readings = s.readings.filter((r) => new Date(r.recordedAt).getTime() >= cutoff);
    commit();
  }, 5000);
}

/* ---------- API ---------- */

export const mockApi: HomeAssistApi = {
  mode: "mock",

  auth: {
    async getSession() {
      const saved = safe.get<Session>(SESSION_KEY);
      if (!saved) {
        setSessionCookie(null);
        return null;
      }
      const session = buildSession(saved.user);
      setSessionCookie(session);
      return session;
    },
    async signIn({ email, password }) {
      await sleep(LATENCY + 250);
      const user = users().find((u) => u.email.toLowerCase() === email.trim().toLowerCase());
      if (!user || user.password !== password) {
        throw new ApiError("Correo o contraseña incorrectos", "invalid_credentials");
      }
      const { password: _pw, ...clean } = user;
      const session = buildSession(clean);
      safe.set(SESSION_KEY, session);
      setSessionCookie(session);
      return session;
    },
    async signUp({ name, email, password }) {
      await sleep(LATENCY + 300);
      if (users().some((u) => u.email.toLowerCase() === email.trim().toLowerCase())) {
        throw new ApiError("Este correo ya está registrado", "email_taken");
      }
      const user: StoredUser = {
        id: uid("usr"),
        name: name.trim(),
        email: email.trim().toLowerCase(),
        role: "principal",
        createdAt: new Date().toISOString(),
        password,
      };
      safe.set(USERS_KEY, [...(safe.get<StoredUser[]>(USERS_KEY) ?? []), user]);
      const { password: _pw, ...clean } = user;
      const session = buildSession(clean);
      safe.set(SESSION_KEY, session);
      setSessionCookie(session);
      return session;
    },
    async signOut() {
      await sleep(150);
      safe.remove(SESSION_KEY);
      setSessionCookie(null);
    },
    async requestPasswordReset() {
      await sleep(LATENCY + 400);
    },
    async updatePassword(newPassword) {
      await sleep(LATENCY);
      const session = safe.get<Session>(SESSION_KEY);
      if (!session) throw new ApiError("Tu sesión expiró. Solicita un enlace nuevo.", "forbidden");
      const current = users().find((u) => u.id === session.user.id);
      if (!current) throw new ApiError("Usuario no encontrado", "not_found");
      const extra = (safe.get<StoredUser[]>(USERS_KEY) ?? []).filter((u) => u.id !== current.id);
      safe.set(USERS_KEY, [...extra, { ...current, password: newPassword }]);
    },
    async updateProfile(userId, patch) {
      await sleep(LATENCY);
      const all = users();
      if (all.some((u) => u.id !== userId && u.email.toLowerCase() === patch.email.toLowerCase())) {
        throw new ApiError("Ese correo ya pertenece a otra cuenta", "email_taken");
      }
      const current = all.find((u) => u.id === userId);
      if (!current) throw new ApiError("Usuario no encontrado", "not_found");
      const updated: StoredUser = { ...current, ...patch };
      const extra = (safe.get<StoredUser[]>(USERS_KEY) ?? []).filter((u) => u.id !== userId);
      safe.set(USERS_KEY, [...extra, updated]);
      const { password: _pw, ...clean } = updated;
      safe.set(SESSION_KEY, buildSession(clean));
      return clean;
    },
  },

  home: {
    async getSnapshot(session) {
      await sleep(LATENCY + 250);
      activeOwner = ownerOf(session.user);
      // Al reabrir la app, el ESP32 simulado "sigue" enviando datos.
      const d = db().device;
      if (d?.status === "connected") d.lastSyncAt = new Date().toISOString();
      ensureHeartbeat();
      return scopeFor(session);
    },
    subscribe(session, onChange) {
      const l = () => onChange(scopeFor(session));
      listeners.add(l);
      return () => listeners.delete(l);
    },
  },

  alerts: {
    async attend(alertId, by) {
      await sleep(LATENCY);
      const alert = db().alerts.find((a) => a.id === alertId);
      if (!alert) throw new ApiError("La alerta no existe", "not_found");
      alert.status = "attended";
      alert.attendedAt = new Date().toISOString();
      alert.attendedBy = by.name;
      const sos = db().sensors.find((x) => x.id === alert.sensorId && x.type === "sos");
      if (sos?.lastReading) sos.lastReading = { ...sos.lastReading, value: 0 };
      commit();
      return structuredClone(alert);
    },
  },

  device: {
    async register({ deviceUid, name, wifiSsid }) {
      await sleep(LATENCY + 500);
      const s = db();
      const now = new Date().toISOString();
      s.device = {
        id: s.device?.id ?? uid("dev"),
        deviceUid,
        name,
        model: "ESP32",
        ownerId: activeOwner,
        status: "connected",
        wifiSsid,
        wifiRssi: s.device?.wifiRssi ?? -60,
        firmware: s.device?.firmware ?? "v1.0.0",
        ipAddress: s.device?.ipAddress ?? "192.168.1.50",
        lastSyncAt: now,
        connectedOnce: true,
        registeredAt: now,
      };
      // Los sensores se conservan: cuelgan del mismo id de dispositivo.
      s.sensors.forEach((x) => (x.deviceId = s.device!.id));
      recordEvent("device_connected", "info", `Dispositivo ${deviceUid} registrado y conectado`);
      commit();
      return structuredClone(s.device);
    },
    async ping() {
      const start = performance.now();
      await sleep(180 + Math.random() * 200);
      const ok = db().device?.status === "connected";
      if (ok) {
        db().device!.lastSyncAt = new Date().toISOString();
        commit();
      }
      return { ok, latencyMs: Math.round(performance.now() - start) };
    },
  },

  rooms: {
    async create(name) {
      await sleep(LATENCY);
      const s = db();
      const clean = name.trim();
      if (s.rooms.some((r) => r.name.toLowerCase() === clean.toLowerCase())) {
        throw new ApiError("Ya existe una habitación con ese nombre", "email_taken");
      }
      const room = { id: uid("room"), name: clean };
      s.rooms.push(room);
      commit();
      return { ...room };
    },
  },

  sensors: {
    async create(input) {
      await sleep(LATENCY);
      const s = db();
      if (!s.device) throw new ApiError("Registra primero un dispositivo", "not_found");
      if (s.sensors.some((x) => x.hardwareId === input.hardwareId)) {
        throw new ApiError("Ya existe un sensor con ese identificador", "email_taken");
      }
      const now = new Date().toISOString();
      const sensor = {
        id: uid("sen"),
        deviceId: s.device.id,
        enabled: true,
        ...input,
        lastReading: {
          id: uid("rd"),
          sensorId: "",
          value: input.type === "temperature" ? 23 : input.type === "gas" ? 120 : 0,
          recordedAt: now,
        },
      };
      sensor.lastReading.sensorId = sensor.id;
      s.sensors.push(sensor);
      commit();
      return structuredClone(sensor);
    },
    async update(sensorId, patch) {
      await sleep(LATENCY);
      const sensor = db().sensors.find((x) => x.id === sensorId);
      if (!sensor) throw new ApiError("Sensor no encontrado", "not_found");
      Object.assign(sensor, patch);
      commit();
      return structuredClone(sensor);
    },
  },

  contacts: {
    async create(input) {
      await sleep(LATENCY);
      const s = db();
      if (s.contacts.some((c) => c.email.toLowerCase() === input.email.toLowerCase())) {
        throw new ApiError("Ya existe un contacto con ese correo", "email_taken");
      }
      const contact = {
        id: uid("ctc"),
        ownerId: s.device?.ownerId ?? "",
        status: "invited" as const,
        createdAt: new Date().toISOString(),
        ...input,
        email: input.email.toLowerCase(),
      };
      s.contacts.push(contact);
      commit();
      return structuredClone(contact);
    },
    async update(id, patch) {
      await sleep(LATENCY - 100);
      const contact = db().contacts.find((c) => c.id === id);
      if (!contact) throw new ApiError("Contacto no encontrado", "not_found");
      Object.assign(contact, patch);
      commit();
      return structuredClone(contact);
    },
    async remove(id) {
      await sleep(LATENCY);
      const s = db();
      s.contacts = s.contacts.filter((c) => c.id !== id);
      commit();
    },
  },

  settings: {
    async update(patch) {
      await sleep(LATENCY);
      db().settings = { ...patch };
      commit();
      return structuredClone(db().settings);
    },
  },
};

/* ---------- Simulador del ESP32 (solo demo) ---------- */

export const mockSimulator: DeviceSimulator = {
  pressSos() {
    const sos = sensorOf("sos");
    recordEvent("sos_pressed", "emergency", `Botón SOS activado en ${roomName(sos?.roomId).toLowerCase()}`, {
      sensorId: sos?.id,
      value: 1,
      alertTitle: "Botón SOS activado",
    });
    commit();
  },
  detectGas() {
    const gas = sensorOf("gas");
    const ppm = Math.max(db().settings.gasThresholdPpm, gas?.threshold ?? 0) + 60 + Math.round(Math.random() * 80);
    recordEvent("gas_threshold", "emergency", `Nivel de humo/gas de ${ppm} ppm en ${roomName(gas?.roomId).toLowerCase()}`, {
      sensorId: gas?.id,
      value: ppm,
      alertTitle: "Humo o gas detectado",
    });
    commit();
  },
  openDoor() {
    const door = sensorOf("door");
    recordEvent("door_opened", "info", `Se abrió ${door?.name.toLowerCase() ?? "una puerta"}`, { sensorId: door?.id, value: 1 });
    commit();
  },
  closeDoor() {
    const door = sensorOf("door");
    recordEvent("door_closed", "info", `Se cerró ${door?.name.toLowerCase() ?? "una puerta"}`, { sensorId: door?.id, value: 0 });
    commit();
  },
  detectMotion() {
    const motions = db().sensors.filter((x) => x.type === "motion" && x.enabled);
    const m = motions[Math.floor(Math.random() * motions.length)];
    if (!m) return;
    const hour = new Date().getHours();
    const night = hour >= 23 || hour < 6;
    recordEvent("motion_detected", "info", `Movimiento en ${roomName(m.roomId).toLowerCase()}`, {
      sensorId: m.id,
      // Parámetro del sistema: alerta informativa si hay movimiento de madrugada.
      alertTitle: db().settings.motionAlertsWhenAway && night ? "Movimiento inesperado" : undefined,
    });
    commit();
  },
  heatUp() {
    const t = sensorOf("temperature", "room_cocina");
    if (!t) return;
    const max = t.threshold ?? db().settings.temperatureMax;
    const v = Math.round((max + 1.5 + Math.random()) * 10) / 10;
    recordEvent("temperature_threshold", "warning", `Temperatura de ${v} °C en ${roomName(t.roomId).toLowerCase()}`, {
      sensorId: t.id,
      value: v,
      alertTitle: "Temperatura elevada",
    });
    commit();
  },
  setConnection(connected) {
    const s = db();
    if (!s.device || (s.device.status === "connected") === connected) return;
    s.device.status = connected ? "connected" : "disconnected";
    if (connected) s.device.lastSyncAt = new Date().toISOString();
    recordEvent(
      connected ? "device_connected" : "device_disconnected",
      connected ? "info" : "warning",
      connected ? "El ESP32 recuperó la conexión" : "Se perdió la comunicación con el ESP32",
      { alertTitle: connected ? undefined : "Dispositivo desconectado" },
    );
    commit();
  },
  reset() {
    store = activeOwner === DEMO_OWNER_ID ? createMockSnapshot() : createEmptySnapshot();
    storeOwner = activeOwner;
    commit();
  },
};
