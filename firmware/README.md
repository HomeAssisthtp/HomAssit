# Firmware HomeAssist · ESP32

Sketch de Arduino que lee los sensores de la maqueta y los envía a la plataforma por HTTP.

## 1. Material

| Componente | Pin ESP32 | Identificador en la plataforma |
|---|---|---|
| DHT22 (temperatura) | GPIO 4 | `DHT22-GPIO4` |
| PIR HC-SR501 (movimiento) | GPIO 13 | `PIR-GPIO13` |
| MC-38 (puerta, contacto magnético) | GPIO 27 | `MC38-GPIO27` |
| MQ-2 (humo / gas), salida analógica AO | GPIO 34 | `MQ2-GPIO34` |
| Pulsador SOS | GPIO 26 | `BTN-GPIO26` |
| Buzzer pasivo o activo (ver `BUZZER_PASSIVE` en `config.h`) | GPIO 25 | — |

## 2. Conexiones

```
ESP32                         Sensor
─────                         ──────
3V3 ──────────┬─────────────  DHT22 VCC
              └─[10 kΩ]─┐
GPIO 4  ────────────────┴───  DHT22 DATA        (pull-up de 10 kΩ a 3V3)
GND  ───────────────────────  DHT22 GND

VIN (5V) ───────────────────  PIR VCC           (el HC-SR501 necesita 5 V)
GPIO 13 ────────────────────  PIR OUT           (salida de 3.3 V, segura)
GND  ───────────────────────  PIR GND

GPIO 27 ────────────────────  MC-38 cable 1     (usa el pull-up interno)
GND  ───────────────────────  MC-38 cable 2

VIN (5V) ───────────────────  MQ-2 VCC
GND  ───────────────────────  MQ-2 GND
MQ-2 AO ──[10 kΩ]──┬────────  GPIO 34           ¡DIVISOR DE VOLTAJE OBLIGATORIO!
                   └[20 kΩ]─  GND               (5 V → 3.3 V; el ADC del ESP32 no tolera 5 V)

GPIO 26 ────────────────────  Pulsador pata 1   (usa el pull-up interno)
GND  ───────────────────────  Pulsador pata 2

Buzzer · opción A: módulo de 3 pines (VCC, I/O, GND)
3V3  ───────────────────────  VCC
GPIO 25 ────────────────────  I/O
GND  ───────────────────────  GND

Buzzer · opción B: buzzer suelto de 2 patas (con transistor 2N2222)
VIN (5V) ───────────────────  Buzzer (+)
Buzzer (−) ─────────────────  2N2222 colector
GPIO 25 ──[1 kΩ]────────────  2N2222 base
GND  ───────────────────────  2N2222 emisor
```

> **Buzzer pasivo** (necesita tono): deja `BUZZER_PASSIVE 1` en `config.h`. Si el módulo
> zumba en cuanto enciende el ESP32, es de los que se activan con LOW: pon `BUZZER_ACTIVE_LOW 1`.

> **Precauciones:** el MQ-2 se calienta y necesita unos minutos de precalentamiento; el firmware
> toma su lectura de "aire limpio" a los 20 s de encender. Sus ppm son **aproximadas**
> (sin calibración con gas de referencia), suficientes para detectar humo contra un umbral.
> Para pruebas usa humo de un cerillo apagado a distancia, nunca gas directo.

## 3. Preparar Arduino IDE

1. **Archivo → Preferencias → URLs adicionales de gestor de placas:**
   `https://espressif.github.io/arduino-esp32/package_esp32_index.json`
2. **Herramientas → Placa → Gestor de placas:** instala **esp32** (Espressif Systems).
3. **Programa → Incluir biblioteca → Administrar bibliotecas:** instala
   **DHT sensor library** (Adafruit) y acepta instalar **Adafruit Unified Sensor**.
4. Placa: **ESP32 Dev Module**. Puerto: el COM que aparece al conectar el ESP32.

## 3b. Alternativa: cargar desde VS Code (PlatformIO)

En lugar de Arduino IDE puedes usar VS Code con la extensión **PlatformIO IDE**:

1. En VS Code → Extensiones, instala **PlatformIO IDE** (la primera vez descarga sus herramientas; tarda unos minutos).
2. **Archivo → Abrir carpeta…** y elige la carpeta `firmware` (la que contiene `platformio.ini`).
3. Conecta el ESP32 por USB y usa la barra inferior de VS Code:
   **✓ Build** (compilar), **→ Upload** (cargar al ESP32) y **🔌 Serial Monitor** (ver los mensajes a 115200).

Las bibliotecas (DHT y Adafruit Unified Sensor) se instalan solas desde `platformio.ini`.
Si al cargar aparece "Connecting…" sin avanzar, mantén presionado el botón **BOOT** del ESP32 hasta que empiece.

## 4. Configurar y cargar

La forma más rápida: en la app, página **Dispositivo → Conectar tu ESP32**. Ahí se genera el
`config.h` completo con tu `DEVICE_UID`, la IP de tu computadora y la clave del dispositivo.

1. Registra el dispositivo en la app y presiona **Registrar los sensores que faltan** (usa los mismos
   identificadores que el firmware: `DHT22-GPIO4`, `PIR-GPIO13`, `MC38-GPIO27`, `MQ2-GPIO34`, `BTN-GPIO26`).
2. Inicia el servidor para la red local:

   ```bash
   npm run dev:lan
   ```

   La primera vez Windows pedirá permiso de red para Node.js: acepta **Redes privadas**.
3. Copia el `config.h` que muestra la app en `firmware/homeassist_esp32/config.h` y escribe la
   contraseña de tu Wi-Fi (2.4 GHz).
4. Abre `homeassist_esp32.ino`, presiona **Subir** y abre el **Monitor serie** a **115200 baudios**.

Al arrancar suena un pitido corto y verás en el monitor:

```
HomeAssist ESP32 v1.0.0 · HA-ESP32-7F3A
[wifi] conectando a TuRed_2.4G...
[http] 202 ok · siguiente envío en 5000 ms
[mq2] línea base en aire limpio: 612
[evento] sos_pressed BTN-GPIO26
```

## 5. Probar el servidor antes de tener el hardware

Con `npm run dev` corriendo:

```bash
node scripts/simulate-esp32.mjs --once --sos
```

Opciones: `--sos`, `--gas`, `--heat`, `--door`, `--motion`, `--once`, `--url <url>`, `--key <clave>`.
Sin `--once` envía un reporte cada 5 s, como el dispositivo real.

> Para que el ESP32 llegue a tu computadora usa `npm run dev:lan` y permite Node.js en el Firewall de Windows (redes privadas).

## 6. Contrato con el servidor

`POST /api/device/readings` · `Authorization: Bearer <DEVICE_API_KEY>`

```json
{
  "deviceUid": "HA-ESP32-7F3A",
  "firmware": "v1.0.0",
  "rssi": -58,
  "ip": "192.168.1.42",
  "uptimeMs": 123456,
  "readings": [
    { "hardwareId": "DHT22-GPIO4", "type": "temperature", "value": 24.1 },
    { "hardwareId": "MQ2-GPIO34", "type": "gas", "value": 130 }
  ],
  "events": [
    { "hardwareId": "BTN-GPIO26", "kind": "sos_pressed" }
  ]
}
```

Respuesta `202`:

```json
{
  "ok": true,
  "receivedAt": "2026-09-30T10:33:58.120Z",
  "derived": [{ "kind": "sos_pressed", "severity": "emergency", "alertTitle": "Botón SOS activado" }],
  "commands": { "buzzer": true, "intervalMs": 2000 }
}
```

- El **servidor** pone la fecha y hora de cada evento (RF-15); el ESP32 no necesita reloj.
- Si falla el envío, los eventos quedan en una cola (16 como máximo) y se reenvían.
- El SOS hace sonar el buzzer **localmente al instante**; `commands.buzzer` lo activa también ante humo o gas.
- Las reglas de umbrales están en `lib/ingest.ts` y son las mismas que usará la versión con Supabase.
