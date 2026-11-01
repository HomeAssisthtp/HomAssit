import type {
  Alert,
  AuthorizedContact,
  Device,
  Room,
  Sensor,
  SensorReading,
  SystemEvent,
  SystemSettings,
  User,
} from "@/types";

/** Fila tal como la devuelve PostgREST (snake_case). */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export type Row = Record<string, any>;

const num = (v: unknown) => (v === null || v === undefined ? undefined : Number(v));
const opt = <T,>(v: T | null | undefined) => v ?? undefined;

export const toUser = (r: Row): User => ({
  id: r.id,
  name: r.name,
  email: r.email,
  phone: opt(r.phone),
  role: r.role,
  ownerId: opt(r.owner_id),
  createdAt: r.created_at,
});

export const toDevice = (r: Row): Device => ({
  id: r.id,
  deviceUid: r.device_uid,
  name: r.name,
  model: "ESP32",
  ownerId: r.owner_id,
  status: r.status,
  wifiSsid: r.wifi_ssid ?? "—",
  wifiRssi: r.wifi_rssi ?? -100,
  firmware: r.firmware ?? "—",
  ipAddress: r.ip_address ?? "—",
  // Sin sincronizar todavía: se toma la fecha de registro para que cuente como "sin datos recientes".
  lastSyncAt: r.last_sync_at ?? r.registered_at,
  connectedOnce: Boolean(r.last_sync_at),
  registeredAt: r.registered_at,
});

export const toRoom = (r: Row): Room => ({ id: r.id, name: r.name });

export const toSensor = (r: Row): Sensor => ({
  id: r.id,
  deviceId: r.device_id,
  roomId: r.room_id ?? "",
  type: r.type,
  hardwareId: r.hardware_id,
  name: r.name,
  enabled: r.enabled,
  threshold: num(r.threshold),
  lastReading:
    r.last_value !== null && r.last_value !== undefined
      ? { id: `last_${r.id}`, sensorId: r.id, value: Number(r.last_value), recordedAt: r.last_reading_at ?? r.created_at }
      : undefined,
  lastEventAt: opt(r.last_event_at),
});

export const toReading = (r: Row): SensorReading => ({
  id: String(r.id),
  sensorId: r.sensor_id,
  value: Number(r.value),
  recordedAt: r.recorded_at,
});

export const toEvent = (r: Row): SystemEvent => ({
  id: r.id,
  deviceId: r.device_id,
  sensorId: opt(r.sensor_id),
  roomId: opt(r.room_id),
  kind: r.kind,
  severity: r.severity,
  description: r.description,
  value: num(r.value),
  occurredAt: r.occurred_at,
});

export const toAlert = (r: Row): Alert => ({
  id: r.id,
  eventId: r.event_id,
  deviceId: r.device_id,
  sensorId: opt(r.sensor_id),
  roomId: opt(r.room_id),
  severity: r.severity,
  title: r.title,
  message: r.message,
  status: r.status,
  createdAt: r.created_at,
  attendedAt: opt(r.attended_at),
  attendedBy: opt(r.attended_by_name),
});

export const toContact = (r: Row): AuthorizedContact => ({
  id: r.id,
  ownerId: r.owner_id,
  userId: opt(r.user_id),
  name: r.name,
  email: r.email,
  phone: opt(r.phone),
  relationship: r.relationship,
  status: r.status,
  permissions: {
    viewAlerts: r.can_view_alerts,
    viewHistory: r.can_view_history,
    attendAlerts: r.can_attend_alerts,
  },
  createdAt: r.created_at,
});

export const toSettings = (r: Row): SystemSettings => ({
  temperatureMax: Number(r.temperature_max),
  temperatureMin: Number(r.temperature_min),
  gasThresholdPpm: Number(r.gas_threshold_ppm),
  offlineAfterSeconds: Number(r.offline_after_seconds),
  buzzerEnabled: r.buzzer_enabled,
  motionAlertsWhenAway: r.motion_alerts_when_away,
});

export const settingsToRow = (s: SystemSettings) => ({
  temperature_max: s.temperatureMax,
  temperature_min: s.temperatureMin,
  gas_threshold_ppm: s.gasThresholdPpm,
  offline_after_seconds: s.offlineAfterSeconds,
  buzzer_enabled: s.buzzerEnabled,
  motion_alerts_when_away: s.motionAlertsWhenAway,
});
