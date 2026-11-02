#!/usr/bin/env node
/**
 * Simula al ESP32 enviando datos al endpoint de ingesta, igual que el firmware.
 * Sirve para probar el backend sin tener los sensores.
 *
 *   node scripts/simulate-esp32.mjs                 # envía un reporte normal cada 5 s
 *   node scripts/simulate-esp32.mjs --once          # un solo reporte
 *   node scripts/simulate-esp32.mjs --once --sos    # presiona el botón SOS
 *   node scripts/simulate-esp32.mjs --once --gas    # humo/gas sobre el umbral
 *   node scripts/simulate-esp32.mjs --once --door   # abre la puerta
 *   node scripts/simulate-esp32.mjs --url http://localhost:3001/api/device/readings
 */

// Usa la misma DEVICE_API_KEY que el servidor (de .env.local), como el firmware.
try {
  process.loadEnvFile(".env.local");
} catch {
  /* sin .env.local: clave de desarrollo */
}

const args = process.argv.slice(2);
const flag = (name) => args.includes(`--${name}`);
const opt = (name, fallback) => {
  const i = args.indexOf(`--${name}`);
  return i >= 0 && args[i + 1] ? args[i + 1] : fallback;
};

const URL_ = opt("url", "http://localhost:3000/api/device/readings");
const KEY = opt("key", process.env.DEVICE_API_KEY || "dev-homeassist-key");
const DEVICE_UID = opt("device", "HA-ESP32-7F3A");

let temp = 24;
const started = Date.now();

function buildPayload() {
  temp = Math.round((temp + (Math.random() - 0.5) * 0.4) * 10) / 10;
  const events = [];
  if (flag("sos")) events.push({ hardwareId: "BTN-GPIO26", kind: "sos_pressed" });
  if (flag("door")) events.push({ hardwareId: "MC38-GPIO27", kind: "door_opened" });
  if (flag("motion") || Math.random() < 0.15) events.push({ hardwareId: "PIR-GPIO13", kind: "motion_detected" });
  return {
    deviceUid: DEVICE_UID,
    firmware: "v1.0.0-sim",
    rssi: -55 - Math.round(Math.random() * 10),
    ip: "192.168.1.42",
    uptimeMs: Date.now() - started,
    readings: [
      { hardwareId: "DHT22-GPIO4", type: "temperature", value: flag("heat") ? 34.5 : temp },
      { hardwareId: "MQ2-GPIO34", type: "gas", value: flag("gas") ? 520 : 110 + Math.round(Math.random() * 30) },
    ],
    events,
  };
}

async function send() {
  const payload = buildPayload();
  try {
    const res = await fetch(URL_, {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${KEY}` },
      body: JSON.stringify(payload),
    });
    const body = await res.json().catch(() => ({}));
    const alerts = (body.derived ?? []).filter((e) => e.alertTitle).map((e) => e.alertTitle);
    console.log(
      `${new Date().toLocaleTimeString()}  HTTP ${res.status}  temp=${payload.readings[0].value}°C  gas=${payload.readings[1].value}ppm` +
        `  eventos=${payload.events.map((e) => e.kind).join(",") || "-"}` +
        (alerts.length ? `  ALERTAS: ${alerts.join(", ")}` : "") +
        (body.commands ? `  buzzer=${body.commands.buzzer}` : "") +
        (body.error ? `  error=${body.error}` : ""),
    );
    return body.commands?.intervalMs ?? 5000;
  } catch (e) {
    console.error(`No se pudo conectar con ${URL_}: ${e.message}`);
    return 5000;
  }
}

if (flag("once")) {
  await send();
} else {
  console.log(`Simulando ${DEVICE_UID} → ${URL_} (Ctrl+C para detener)`);
  for (;;) {
    const wait = await send();
    await new Promise((r) => setTimeout(r, wait));
  }
}
