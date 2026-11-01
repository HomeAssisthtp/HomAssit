export type ISODateString = string;

export type Role = "principal" | "contact" | "admin";

export interface User {
  id: string;
  name: string;
  email: string;
  phone?: string;
  role: Role;
  
  ownerId?: string;
  createdAt: ISODateString;
}


export type ConnectionStatus = "connected" | "disconnected";

export interface Device {
  id: string;

  deviceUid: string;
  name: string;
  model: "ESP32";
  ownerId: string;
  status: ConnectionStatus;
  wifiSsid: string;

  wifiRssi: number;
  firmware: string;
  ipAddress: string;
  lastSyncAt: ISODateString;
  /** false = registrado en la plataforma pero el ESP32 aún no ha enviado datos. */
  connectedOnce: boolean;
  registeredAt: ISODateString;
}


export interface Room {
  id: string;
  name: string;
}

export type SensorType = "temperature" | "motion" | "door" | "gas" | "sos";

export type SensorState = "normal" | "warning" | "alert" | "offline";

export interface SensorReading {
  id: string;
  sensorId: string;
  value: number;
  recordedAt: ISODateString;
}

export interface Sensor {
  id: string;
  deviceId: string;
  roomId: string;
  type: SensorType;
  hardwareId: string;
  name: string;
  enabled: boolean;
  threshold?: number;
  lastReading?: SensorReading;
  lastEventAt?: ISODateString;
}


export type EventKind =
  | "reading"
  | "motion_detected"
  | "door_opened"
  | "door_closed"
  | "gas_threshold"
  | "temperature_threshold"
  | "sos_pressed"
  | "device_connected"
  | "device_disconnected";

export type EventSeverity = "info" | "warning" | "emergency";

export interface SystemEvent {
  id: string;
  deviceId: string;
  sensorId?: string;
  roomId?: string;
  kind: EventKind;
  severity: EventSeverity;
  description: string;
  value?: number;
  occurredAt: ISODateString;
}


export type AlertSeverity = EventSeverity;
export type AlertStatus = "pending" | "attended";

export interface Alert {
  id: string;
  eventId: string;
  deviceId: string;
  sensorId?: string;
  roomId?: string;
  severity: AlertSeverity;
  title: string;
  message: string;
  status: AlertStatus;
  createdAt: ISODateString;
  attendedAt?: ISODateString;
  attendedBy?: string;
}


export interface ContactPermissions {
  viewAlerts: boolean;
  viewHistory: boolean;
  attendAlerts: boolean;
}

export type ContactStatus = "active" | "invited" | "suspended";

export interface AuthorizedContact {
  id: string;
  ownerId: string;
  userId?: string;
  name: string;
  email: string;
  phone?: string;
  relationship: string;
  status: ContactStatus;
  permissions: ContactPermissions;
  createdAt: ISODateString;
}


export interface SystemSettings {
  temperatureMax: number;
  temperatureMin: number;
  gasThresholdPpm: number;
 
  offlineAfterSeconds: number;
  buzzerEnabled: boolean;
  motionAlertsWhenAway: boolean;
}


export type HomeStatusLevel = "secure" | "warning" | "emergency" | "offline";

export interface HomeSnapshot {
  device: Device | null;
  rooms: Room[];
  sensors: Sensor[];

  readings: SensorReading[];
  alerts: Alert[];
  events: SystemEvent[];
  contacts: AuthorizedContact[];
  settings: SystemSettings;
}

export interface Session {
  user: User;

  contactPermissions?: ContactPermissions;
  /** Contacto autorizado: nombre del usuario principal que lo autorizó. */
  ownerName?: string;
}
