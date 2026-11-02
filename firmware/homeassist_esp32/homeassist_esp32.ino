/*
 * HomeAssist · Firmware ESP32
 * ------------------------------------------------------------
 * Lee los sensores de la maqueta y los envía al servidor por HTTP (RF-19).
 *  - DHT22        temperatura            → lectura periódica
 *  - PIR HC-SR501 movimiento             → evento
 *  - MC-38        puerta abierta/cerrada → evento
 *  - MQ-2         humo / gas             → lectura periódica
 *  - Pulsador     botón SOS              → evento de emergencia (RF-10)
 *  - Buzzer       señal local            → al pulsar SOS o si el servidor lo ordena
 *
 * Bibliotecas (Arduino IDE → Administrador de bibliotecas):
 *  - "DHT sensor library" de Adafruit (+ "Adafruit Unified Sensor")
 *  WiFi.h y HTTPClient.h vienen con el paquete de placas ESP32 de Espressif.
 *
 * Conexiones y pruebas: ver firmware/README.md
 */

#include <WiFi.h>
#include <HTTPClient.h>
#include <DHT.h>
#include "config.h"

#define FIRMWARE_VERSION "v1.0.0"

// ---------- Pines (coinciden con los identificadores de sensor en la plataforma) ----------
#define PIN_DHT     4   // DHT22-GPIO4
#define PIN_PIR     13  // PIR-GPIO13
#define PIN_DOOR    27  // MC38-GPIO27
#define PIN_MQ2     34  // MQ2-GPIO34  (ADC1, solo entrada — ¡usar divisor de voltaje!)
#define PIN_SOS     26  // BTN-GPIO26
#define PIN_BUZZER  25

#define ID_TEMP  "DHT22-GPIO4"
#define ID_PIR   "PIR-GPIO13"
#define ID_DOOR  "MC38-GPIO27"
#define ID_GAS   "MQ2-GPIO34"
#define ID_SOS   "BTN-GPIO26"

// ---------- Tiempos ----------
const unsigned long DEBOUNCE_MS       = 50;
const unsigned long MOTION_COOLDOWN   = 10000;  // no repetir "movimiento" más de 1 vez cada 10 s
const unsigned long MQ2_WARMUP_MS     = 20000;  // precalentamiento mínimo del MQ-2
const unsigned long HTTP_TIMEOUT_MS   = 4000;
const unsigned long WIFI_RETRY_MS     = 10000;

DHT dht(PIN_DHT, DHT22);

unsigned long sendIntervalMs = 5000;   // el servidor puede ajustarlo (commands.intervalMs)
unsigned long lastSend = 0;
unsigned long lastWifiTry = 0;
unsigned long lastMotion = 0;
unsigned long bootAt = 0;
int mq2Baseline = -1;                  // lectura en aire limpio tras el precalentamiento

// ---------- Entrada digital con antirrebote ----------
// (Los tipos van antes de cualquier función: al compilar el .ino se declaran
//  todas las funciones al inicio y deben conocer DebouncedInput.)
struct DebouncedInput {
  uint8_t pin;
  int stable;
  int lastRaw;
  unsigned long changedAt;
};
DebouncedInput sosBtn  = { PIN_SOS,  HIGH, HIGH, 0 };
DebouncedInput doorSw  = { PIN_DOOR, LOW,  LOW,  0 };
DebouncedInput pirIn   = { PIN_PIR,  LOW,  LOW,  0 };

// ---------- Cola de eventos (se conserva si se pierde la conexión) ----------
struct PendingEvent { const char* hardwareId; const char* kind; };
const int QUEUE_SIZE = 16;
PendingEvent eventQueue[QUEUE_SIZE];
int queueCount = 0;

void enqueue(const char* hardwareId, const char* kind) {
  if (queueCount == QUEUE_SIZE) {             // cola llena: descarta el más antiguo
    for (int i = 1; i < QUEUE_SIZE; i++) eventQueue[i - 1] = eventQueue[i];
    queueCount--;
  }
  eventQueue[queueCount++] = { hardwareId, kind };
  Serial.printf("[evento] %s %s\n", kind, hardwareId);
}


// Devuelve true cuando el estado estable cambia.
bool updateInput(DebouncedInput& in) {
  int raw = digitalRead(in.pin);
  if (raw != in.lastRaw) { in.lastRaw = raw; in.changedAt = millis(); }
  if (millis() - in.changedAt > DEBOUNCE_MS && raw != in.stable) {
    in.stable = raw;
    return true;
  }
  return false;
}

// ---------- Buzzer (no bloqueante) ----------
// Tipo de buzzer: se define en config.h (valores por defecto aquí).
#ifndef BUZZER_PASSIVE
#define BUZZER_PASSIVE 1      // 1 = pasivo (necesita tono PWM) · 0 = activo (suena con HIGH)
#endif
#ifndef BUZZER_ACTIVE_LOW
#define BUZZER_ACTIVE_LOW 0   // 1 = módulo que suena con LOW (los que traen transistor PNP S8550)
#endif
const unsigned int BUZZER_FREQ_HZ = 2400;   // tono del buzzer pasivo

unsigned long buzzerUntil = 0;
bool buzzerOn = false;

void setBuzzer(bool on) {
  if (on == buzzerOn) return;                // solo actuar en los cambios
  buzzerOn = on;
#if BUZZER_PASSIVE
  if (on) {
    tone(PIN_BUZZER, BUZZER_FREQ_HZ);
  } else {
    noTone(PIN_BUZZER);
    pinMode(PIN_BUZZER, OUTPUT);             // reposo: sin corriente por la bobina
    digitalWrite(PIN_BUZZER, BUZZER_ACTIVE_LOW ? HIGH : LOW);
  }
#else
  digitalWrite(PIN_BUZZER, (on != BUZZER_ACTIVE_LOW) ? HIGH : LOW);
#endif
}

void buzz(unsigned long durationMs) { buzzerUntil = max(buzzerUntil, millis() + durationMs); }
void updateBuzzer() {
  setBuzzer(millis() < buzzerUntil && (millis() / 250) % 2 == 0);   // pitido intermitente
}

// ---------- Wi-Fi ----------
void ensureWifi() {
  if (WiFi.status() == WL_CONNECTED) return;
  if (millis() - lastWifiTry < WIFI_RETRY_MS && lastWifiTry != 0) return;
  lastWifiTry = millis();
  Serial.printf("[wifi] conectando a %s...\n", WIFI_SSID);
  WiFi.mode(WIFI_STA);
  WiFi.begin(WIFI_SSID, WIFI_PASSWORD);
}

// ---------- MQ-2: estimación aproximada de ppm ----------
// El MQ-2 requiere calibración con gas de referencia para medir ppm reales.
// Para el prototipo se usa una escala relativa al aire limpio: ~100 ppm en reposo,
// y crece con la lectura analógica. Suficiente para detectar humo contra un umbral.
float readGasPpm() {
  int raw = analogRead(PIN_MQ2);                    // 0..4095
  if (mq2Baseline < 0) return 100;
  float delta = max(0, raw - mq2Baseline);
  return 100 + delta * (900.0 / max(1, 4095 - mq2Baseline));   // 100..1000
}

// ---------- Envío al servidor ----------
void sendReport() {
  if (WiFi.status() != WL_CONNECTED) return;

  String body = "{";
  body += "\"deviceUid\":\"" DEVICE_UID "\",";
  body += "\"firmware\":\"" FIRMWARE_VERSION "\",";
  body += "\"rssi\":" + String(WiFi.RSSI()) + ",";
  body += "\"ip\":\"" + WiFi.localIP().toString() + "\",";
  body += "\"uptimeMs\":" + String(millis()) + ",";

  body += "\"readings\":[";
  bool first = true;
  float t = dht.readTemperature();
  if (!isnan(t)) {
    body += "{\"hardwareId\":\"" ID_TEMP "\",\"type\":\"temperature\",\"value\":" + String(t, 1) + "}";
    first = false;
  } else {
    Serial.println("[dht] lectura inválida (revisa conexión y resistencia pull-up)");
  }
  if (mq2Baseline >= 0) {
    if (!first) body += ",";
    body += "{\"hardwareId\":\"" ID_GAS "\",\"type\":\"gas\",\"value\":" + String(readGasPpm(), 0) + "}";
  }
  body += "],";

  body += "\"events\":[";
  for (int i = 0; i < queueCount; i++) {
    if (i) body += ",";
    body += "{\"hardwareId\":\"" + String(eventQueue[i].hardwareId) + "\",\"kind\":\"" + String(eventQueue[i].kind) + "\"}";
  }
  body += "]}";

  HTTPClient http;
  http.setTimeout(HTTP_TIMEOUT_MS);
  http.begin(SERVER_URL);
  http.addHeader("Content-Type", "application/json");
  http.addHeader("Authorization", "Bearer " DEVICE_API_KEY);
  int code = http.POST(body);

  if (code == 202 || code == 200) {
    String res = http.getString();
    queueCount = 0;                                  // eventos entregados
    // Respuesta: {"commands":{"buzzer":true,"intervalMs":2000}, ...}
    if (res.indexOf("\"buzzer\":true") >= 0) buzz(10000);
    int i = res.indexOf("\"intervalMs\":");
    if (i >= 0) {
      long v = res.substring(i + 13).toInt();
      if (v >= 1000 && v <= 60000) sendIntervalMs = v;
    }
    Serial.printf("[http] %d ok · siguiente envío en %lu ms\n", code, sendIntervalMs);
  } else {
    // Los eventos se conservan en la cola y se reenvían en el siguiente ciclo.
    Serial.printf("[http] error %d · %s\n", code, http.errorToString(code).c_str());
  }
  http.end();
}

// ------------------------------------------------------------
void setup() {
  Serial.begin(115200);
  delay(200);
  Serial.println("\nHomeAssist ESP32 " FIRMWARE_VERSION " · " DEVICE_UID);

  pinMode(PIN_SOS, INPUT_PULLUP);    // pulsado = LOW
  pinMode(PIN_DOOR, INPUT_PULLUP);   // imán junto al reed = LOW (cerrada); separado = HIGH (abierta)
  pinMode(PIN_PIR, INPUT);           // HIGH = movimiento
  pinMode(PIN_BUZZER, OUTPUT);
  digitalWrite(PIN_BUZZER, BUZZER_ACTIVE_LOW ? HIGH : LOW);   // buzzer apagado al arrancar
  analogReadResolution(12);
  dht.begin();

  // Estado inicial de la puerta sin generar evento.
  doorSw.stable = doorSw.lastRaw = digitalRead(PIN_DOOR);

  bootAt = millis();
  ensureWifi();
  buzz(150);                         // pitido corto: encendido correcto
}

void loop() {
  ensureWifi();
  updateBuzzer();

  // Botón SOS: alerta local inmediata, sin esperar al servidor.
  if (updateInput(sosBtn) && sosBtn.stable == LOW) {
    enqueue(ID_SOS, "sos_pressed");
    buzz(3000);
    lastSend = 0;                    // enviar ya
  }

  // Puerta: registrar cada cambio de estado (RF-08).
  if (updateInput(doorSw)) {
    enqueue(ID_DOOR, doorSw.stable == HIGH ? "door_opened" : "door_closed");
    lastSend = 0;
  }

  // Movimiento: flanco de subida con enfriamiento (RF-07).
  if (updateInput(pirIn) && pirIn.stable == HIGH && millis() - lastMotion > MOTION_COOLDOWN) {
    lastMotion = millis();
    enqueue(ID_PIR, "motion_detected");
    lastSend = 0;
  }

  // Línea base del MQ-2 tras el precalentamiento.
  if (mq2Baseline < 0 && millis() - bootAt > MQ2_WARMUP_MS) {
    long sum = 0;
    for (int i = 0; i < 20; i++) { sum += analogRead(PIN_MQ2); delay(5); }
    mq2Baseline = sum / 20;
    Serial.printf("[mq2] línea base en aire limpio: %d\n", mq2Baseline);
  }

  if (lastSend == 0 || millis() - lastSend >= sendIntervalMs) {
    lastSend = millis();
    sendReport();
  }
}
