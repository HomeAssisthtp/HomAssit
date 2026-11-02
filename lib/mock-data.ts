/**
 * Datos mock realistas. Se generan en el cliente relativos a "ahora" para que la
 * demo siempre parezca en vivo. Cuando Supabase esté conectado, estos datos se
 * reemplazan por las consultas de `services/` sin tocar los componentes.
 */
import type {
  Alert,
  AuthorizedContact,
  Device,
  EventKind,
  EventSeverity,
  HomeSnapshot,
  Room,
  Sensor,
  SensorReading,
  SystemEvent,
  SystemSettings,
  User,
} from "@/types";

export const DEMO_OWNER_ID = "usr_principal";

/** Cuentas de prueba del prototipo (solo modo mock). */
export const DEMO_ACCOUNTS: Array<User & { password: string }> = [
  {
    id: DEMO_OWNER_ID,
    name: "Ana Martínez",
    email: "ana@homeassist.demo",
    phone: "55 1234 5678",
    role: "principal",
    createdAt: "2026-09-01T10:00:00.000Z",
    password: "homeassist",
  },
  {
    id: "usr_contacto",
    name: "Luis Martínez",
    email: "luis@homeassist.demo",
    phone: "55 8765 4321",
    role: "contact",
    ownerId: DEMO_OWNER_ID,
    createdAt: "2026-09-03T10:00:00.000Z",
    password: "homeassist",
  },
  {
    id: "usr_admin",
    name: "Soporte técnico",
    email: "admin@homeassist.demo",
    role: "admin",
    createdAt: "2026-09-01T09:00:00.000Z",
    password: "homeassist",
  },
];

export const DEFAULT_SETTINGS: SystemSettings = {
  temperatureMax: 32,
  temperatureMin: 12,
  gasThresholdPpm: 400,
  offlineAfterSeconds: 60,
  buzzerEnabled: true,
  motionAlertsWhenAway: false,
};

/** Hogar recién creado: sin dispositivo ni sensores (flujo HU-04 → HU-05). */
export function createEmptySnapshot(): HomeSnapshot {
  return {
    device: null,
    rooms: ROOMS.map((r) => ({ ...r })),
    sensors: [],
    readings: [],
    alerts: [],
    events: [],
    contacts: [],
    settings: { ...DEFAULT_SETTINGS },
  };
}

const ROOMS: Room[] = [
  { id: "room_sala", name: "Sala" },
  { id: "room_cocina", name: "Cocina" },
  { id: "room_entrada", name: "Entrada" },
  { id: "room_dormitorio", name: "Habitación principal" },
];

/** PRNG determinista para que el historial sea estable entre recargas. */
function mulberry32(seed: number) {
  return () => {
    seed |= 0;
    seed = (seed + 0x6d2b79f5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const iso = (ms: number) => new Date(ms).toISOString();
const MIN = 60_000;
const HOUR = 60 * MIN;
const DAY = 24 * HOUR;

export function createMockSnapshot(now = Date.now()): HomeSnapshot {
  const rand = mulberry32(903);
  const deviceId = "dev_esp32_01";

  const device: Device = {
    id: deviceId,
    deviceUid: "HA-ESP32-7F3A",
    name: "HomeAssist Hub",
    model: "ESP32",
    ownerId: DEMO_OWNER_ID,
    status: "connected",
    wifiSsid: "Casa_Martinez_2.4G",
    wifiRssi: -58,
    firmware: "v1.2.0",
    ipAddress: "192.168.1.42",
    lastSyncAt: iso(now - 4_000),
    connectedOnce: true,
    registeredAt: iso(now - 28 * DAY),
  };

  const sensorDefs: Array<Omit<Sensor, "deviceId" | "enabled">> = [
    { id: "sen_temp_sala", roomId: "room_sala", type: "temperature", hardwareId: "DHT22-GPIO4", name: "Temperatura sala", threshold: 32 },
    { id: "sen_mov_sala", roomId: "room_sala", type: "motion", hardwareId: "PIR-GPIO13", name: "Movimiento sala" },
    { id: "sen_gas_cocina", roomId: "room_cocina", type: "gas", hardwareId: "MQ2-GPIO34", name: "Humo / gas cocina", threshold: 400 },
    { id: "sen_temp_cocina", roomId: "room_cocina", type: "temperature", hardwareId: "DHT22-GPIO5", name: "Temperatura cocina", threshold: 35 },
    { id: "sen_puerta_principal", roomId: "room_entrada", type: "door", hardwareId: "MC38-GPIO27", name: "Puerta principal" },
    { id: "sen_mov_entrada", roomId: "room_entrada", type: "motion", hardwareId: "PIR-GPIO14", name: "Movimiento entrada" },
    { id: "sen_mov_dorm", roomId: "room_dormitorio", type: "motion", hardwareId: "PIR-GPIO12", name: "Movimiento habitación" },
    { id: "sen_temp_dorm", roomId: "room_dormitorio", type: "temperature", hardwareId: "DHT22-GPIO15", name: "Temperatura habitación", threshold: 32 },
    { id: "sen_sos", roomId: "room_dormitorio", type: "sos", hardwareId: "BTN-GPIO26", name: "Botón SOS" },
  ];

  /* ---- Lecturas de temperatura de las últimas 24 h (cada 30 min) ---- */
  const readings: SensorReading[] = [];
  const baseTemp: Record<string, number> = { sen_temp_sala: 23.6, sen_temp_cocina: 25.1, sen_temp_dorm: 22.4 };
  for (const sid of Object.keys(baseTemp)) {
    for (let i = 48; i >= 0; i--) {
      const t = now - i * 30 * MIN;
      const hour = new Date(t).getHours();
      const daily = Math.sin(((hour - 9) / 24) * Math.PI * 2) * 1.8;
      readings.push({
        id: `rd_${sid}_${i}`,
        sensorId: sid,
        value: Math.round((baseTemp[sid] + daily + (rand() - 0.5) * 0.6) * 10) / 10,
        recordedAt: iso(t),
      });
    }
  }
  readings.push(
    ...[48, 32, 16, 0].map((i) => ({
      id: `rd_gas_${i}`,
      sensorId: "sen_gas_cocina",
      value: 110 + Math.round(rand() * 40),
      recordedAt: iso(now - i * 30 * MIN),
    })),
  );

  /* ---- Historial de eventos: 30 días ---- */
  const events: SystemEvent[] = [];
  const alerts: Alert[] = [];
  let n = 0;
  const pushEvent = (
    t: number,
    kind: EventKind,
    severity: EventSeverity,
    description: string,
    sensorId?: string,
    roomId?: string,
    value?: number,
  ) => {
    const ev: SystemEvent = {
      id: `evt_${++n}`,
      deviceId,
      sensorId,
      roomId,
      kind,
      severity,
      description,
      value,
      occurredAt: iso(t),
    };
    events.push(ev);
    return ev;
  };

  for (let d = 29; d >= 0; d--) {
    const dayStart = new Date(now - d * DAY);
    dayStart.setHours(0, 0, 0, 0);
    const ds = dayStart.getTime();
    // Salida por la mañana y regreso por la tarde.
    const out = ds + 8 * HOUR + Math.floor(rand() * 60) * MIN;
    const back = ds + 18 * HOUR + Math.floor(rand() * 120) * MIN;
    const slots: Array<[number, () => void]> = [
      [out - 6 * MIN, () => pushEvent(out - 6 * MIN, "motion_detected", "info", "Movimiento en la entrada", "sen_mov_entrada", "room_entrada")],
      [out, () => pushEvent(out, "door_opened", "info", "Se abrió la puerta principal", "sen_puerta_principal", "room_entrada", 1)],
      [out + 40_000, () => pushEvent(out + 40_000, "door_closed", "info", "Se cerró la puerta principal", "sen_puerta_principal", "room_entrada", 0)],
      [back, () => pushEvent(back, "door_opened", "info", "Se abrió la puerta principal", "sen_puerta_principal", "room_entrada", 1)],
      [back + 55_000, () => pushEvent(back + 55_000, "door_closed", "info", "Se cerró la puerta principal", "sen_puerta_principal", "room_entrada", 0)],
      [back + 5 * MIN, () => pushEvent(back + 5 * MIN, "motion_detected", "info", "Movimiento en la sala", "sen_mov_sala", "room_sala")],
    ];
    const extraMotion = 1 + Math.floor(rand() * 3);
    for (let k = 0; k < extraMotion; k++) {
      const t = back + (30 + Math.floor(rand() * 180)) * MIN;
      const inDorm = rand() > 0.5;
      slots.push([
        t,
        () =>
          pushEvent(
            t,
            "motion_detected",
            "info",
            inDorm ? "Movimiento en la habitación principal" : "Movimiento en la sala",
            inDorm ? "sen_mov_dorm" : "sen_mov_sala",
            inDorm ? "room_dormitorio" : "room_sala",
          ),
      ]);
    }
    slots
      .filter(([t]) => t < now - 3 * MIN)
      .sort((a, b) => a[0] - b[0])
      .forEach(([, fn]) => fn());
  }

  /* ---- Incidentes históricos (ya atendidos) ---- */
  const addAlertFrom = (ev: SystemEvent, title: string, attendedAfterMin: number) => {
    alerts.push({
      id: `alr_${ev.id}`,
      eventId: ev.id,
      deviceId,
      sensorId: ev.sensorId,
      roomId: ev.roomId,
      severity: ev.severity,
      title,
      message: ev.description,
      status: "attended",
      createdAt: ev.occurredAt,
      attendedAt: iso(new Date(ev.occurredAt).getTime() + attendedAfterMin * MIN),
      attendedBy: "Ana Martínez",
    });
  };

  const t1 = now - 21 * DAY + 14 * HOUR;
  addAlertFrom(pushEvent(t1, "gas_threshold", "warning", "Nivel de humo/gas de 430 ppm en cocina", "sen_gas_cocina", "room_cocina", 430), "Humo o gas elevado", 6);
  const t2 = now - 12 * DAY + 20 * HOUR;
  addAlertFrom(pushEvent(t2, "sos_pressed", "emergency", "Botón SOS activado en la habitación principal", "sen_sos", "room_dormitorio", 1), "Botón SOS activado", 3);
  const t3 = now - 9 * DAY + 3 * HOUR;
  const dc = pushEvent(t3, "device_disconnected", "warning", "Se perdió la comunicación con el ESP32", undefined, undefined);
  addAlertFrom(dc, "Dispositivo desconectado", 14);
  pushEvent(t3 + 11 * MIN, "device_connected", "info", "El ESP32 recuperó la conexión");
  const t4 = now - 5 * DAY + 15 * HOUR;
  addAlertFrom(pushEvent(t4, "temperature_threshold", "warning", "Temperatura de 35.4 °C en cocina", "sen_temp_cocina", "room_cocina", 35.4), "Temperatura elevada", 20);
  const t5 = now - 2 * DAY + 2 * HOUR;
  addAlertFrom(pushEvent(t5, "motion_detected", "info", "Movimiento nocturno en la entrada", "sen_mov_entrada", "room_entrada"), "Movimiento inesperado", 480);

  events.sort((a, b) => b.occurredAt.localeCompare(a.occurredAt));
  alerts.sort((a, b) => b.createdAt.localeCompare(a.createdAt));

  /* ---- Estado actual de cada sensor ---- */
  const lastEventOf = (sid: string) => events.find((e) => e.sensorId === sid)?.occurredAt;
  const lastTemp = (sid: string) => [...readings].reverse().find((r) => r.sensorId === sid);
  const sensors: Sensor[] = sensorDefs.map((s) => {
    const sensor: Sensor = { ...s, deviceId, enabled: true };
    if (s.type === "temperature" || s.type === "gas") {
      sensor.lastReading = lastTemp(s.id);
    } else {
      sensor.lastReading = { id: `rd_${s.id}_now`, sensorId: s.id, value: 0, recordedAt: iso(now - 4_000) };
    }
    sensor.lastEventAt = lastEventOf(s.id);
    return sensor;
  });

  const contacts: AuthorizedContact[] = [
    {
      id: "ctc_luis",
      ownerId: DEMO_OWNER_ID,
      userId: "usr_contacto",
      name: "Luis Martínez",
      email: "luis@homeassist.demo",
      phone: "55 8765 4321",
      relationship: "Hermano",
      status: "active",
      permissions: { viewAlerts: true, viewHistory: true, attendAlerts: true },
      createdAt: iso(now - 26 * DAY),
    },
    {
      id: "ctc_sofia",
      ownerId: DEMO_OWNER_ID,
      name: "Sofía Ramírez",
      email: "sofia.ramirez@correo.demo",
      relationship: "Vecina",
      status: "invited",
      permissions: { viewAlerts: true, viewHistory: false, attendAlerts: false },
      createdAt: iso(now - 3 * DAY),
    },
  ];

  return {
    device,
    rooms: ROOMS,
    sensors,
    readings,
    alerts,
    events,
    contacts,
    settings: { ...DEFAULT_SETTINGS },
  };
}
