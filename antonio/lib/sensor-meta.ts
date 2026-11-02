import {
  Activity,
  BellRing,
  DoorClosed,
  Thermometer,
  Wind,
  Wifi,
  WifiOff,
  DoorOpen,
  Siren,
  type LucideIcon,
} from "lucide-react";
import type { EventKind, EventSeverity, Sensor, SensorState, SensorType, SystemSettings } from "@/types";

export const SENSOR_TYPE_META: Record<SensorType, { label: string; hardware: string; icon: LucideIcon }> = {
  temperature: { label: "Temperatura", hardware: "DHT22", icon: Thermometer },
  motion: { label: "Movimiento", hardware: "PIR HC-SR501", icon: Activity },
  door: { label: "Puerta", hardware: "Magnético MC-38", icon: DoorClosed },
  gas: { label: "Humo / Gas", hardware: "MQ-2", icon: Wind },
  sos: { label: "Botón SOS", hardware: "Pulsador", icon: BellRing },
};

export const EVENT_KIND_META: Record<EventKind, { label: string; icon: LucideIcon }> = {
  reading: { label: "Lectura", icon: Thermometer },
  motion_detected: { label: "Movimiento detectado", icon: Activity },
  door_opened: { label: "Puerta abierta", icon: DoorOpen },
  door_closed: { label: "Puerta cerrada", icon: DoorClosed },
  gas_threshold: { label: "Humo / gas elevado", icon: Wind },
  temperature_threshold: { label: "Temperatura fuera de rango", icon: Thermometer },
  sos_pressed: { label: "Botón SOS", icon: Siren },
  device_connected: { label: "Dispositivo conectado", icon: Wifi },
  device_disconnected: { label: "Dispositivo desconectado", icon: WifiOff },
};

export const SEVERITY_LABEL: Record<EventSeverity, string> = {
  info: "Informativa",
  warning: "Advertencia",
  emergency: "Emergencia",
};

/** Estado de un sensor a partir de su última lectura y los parámetros del sistema. */
export function sensorState(sensor: Sensor, settings: SystemSettings, deviceOnline: boolean): SensorState {
  if (!deviceOnline || !sensor.enabled) return "offline";
  const v = sensor.lastReading?.value;
  if (v === undefined) return "offline";
  switch (sensor.type) {
    case "temperature": {
      const max = sensor.threshold ?? settings.temperatureMax;
      if (v >= max) return "alert";
      if (v >= max - 3 || v <= settings.temperatureMin) return "warning";
      return "normal";
    }
    case "gas": {
      const max = sensor.threshold ?? settings.gasThresholdPpm;
      if (v >= max) return "alert";
      if (v >= max * 0.7) return "warning";
      return "normal";
    }
    case "door":
      return v === 1 ? "warning" : "normal";
    case "motion":
      return "normal";
    case "sos":
      return v === 1 ? "alert" : "normal";
  }
}

export const SENSOR_STATE_LABEL: Record<SensorState, string> = {
  normal: "Normal",
  warning: "Atención",
  alert: "Alerta",
  offline: "Sin datos",
};
