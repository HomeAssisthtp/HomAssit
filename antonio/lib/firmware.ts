import type { SensorType } from "@/types";

/**
 * Sensores que lee el firmware (firmware/homeassist_esp32). Los identificadores
 * deben coincidir con los `#define ID_*` del sketch: el servidor solo acepta
 * lecturas de sensores registrados con ese mismo identificador.
 */
export const FIRMWARE_SENSORS: Array<{ type: SensorType; hardwareId: string; name: string; room: string; pin: number }> = [
  { type: "temperature", hardwareId: "DHT22-GPIO4", name: "Temperatura", room: "Sala", pin: 4 },
  { type: "motion", hardwareId: "PIR-GPIO13", name: "Movimiento", room: "Sala", pin: 13 },
  { type: "door", hardwareId: "MC38-GPIO27", name: "Puerta principal", room: "Entrada", pin: 27 },
  { type: "gas", hardwareId: "MQ2-GPIO34", name: "Humo / gas", room: "Cocina", pin: 34 },
  { type: "sos", hardwareId: "BTN-GPIO26", name: "Botón SOS", room: "Habitación principal", pin: 26 },
];

export const INGEST_PATH = "/api/device/readings";

/** URL que el ESP32 debe usar. "localhost" no sirve desde el ESP32: necesita la IP de la computadora. */
export function serverUrlFor(origin: string, lanAddress?: string) {
  const url = new URL(origin);
  const isLocal = ["localhost", "127.0.0.1", "[::1]"].includes(url.hostname);
  const host = isLocal ? `${lanAddress ?? "TU_IP_LOCAL"}:${url.port || "3000"}` : url.host;
  return { isLocal, url: `${url.protocol}//${host}${INGEST_PATH}` };
}

/** Contenido de firmware/homeassist_esp32/config.h para este dispositivo. */
export function buildConfigH({
  deviceUid,
  wifiSsid,
  serverUrl,
  apiKey,
}: {
  deviceUid: string;
  wifiSsid: string;
  serverUrl: string;
  apiKey: string;
}) {
  return `#pragma once

// Red Wi-Fi (solo 2.4 GHz)
#define WIFI_SSID     "${wifiSsid}"
#define WIFI_PASSWORD "ESCRIBE_AQUI_TU_CONTRASEÑA_WIFI"

// Servidor HomeAssist
#define SERVER_URL "${serverUrl}"

// Identidad del dispositivo
#define DEVICE_UID     "${deviceUid}"
#define DEVICE_API_KEY "${apiKey}"

// Buzzer: 1 = pasivo · 0 = activo
#define BUZZER_PASSIVE    1
#define BUZZER_ACTIVE_LOW 0
`;
}
