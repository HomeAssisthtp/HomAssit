// Copia este archivo como "config.h" (en la misma carpeta) y completa tus datos.
// config.h está en .gitignore: nunca subas tu contraseña Wi-Fi ni la API key.
#pragma once

// Red Wi-Fi (el ESP32 solo funciona en 2.4 GHz)
#define WIFI_SSID     "TuRed_2.4G"
#define WIFI_PASSWORD "tu-contraseña"

// Dirección del servidor HomeAssist.
// En desarrollo: la IP de tu computadora en la red local + el puerto de `npm run dev`.
// (En Windows la ves con `ipconfig` → "Dirección IPv4").
#define SERVER_URL "http://192.168.1.100:3000/api/device/readings"

// Identificador único del dispositivo (el mismo que registras en la página Dispositivo).
#define DEVICE_UID "HA-ESP32-7F3A"

// Tipo de buzzer
//   BUZZER_PASSIVE    1 = pasivo (el que suena con un tono)  ·  0 = activo (suena solo con corriente)
//   BUZZER_ACTIVE_LOW 1 = módulo de 3 pines que suena con LOW (trae transistor S8550)  ·  0 = normal
// Si al encender el ESP32 el buzzer se queda zumbando o haciendo ruido, cambia BUZZER_ACTIVE_LOW.
#define BUZZER_PASSIVE    1
#define BUZZER_ACTIVE_LOW 0

// Clave del dispositivo. En desarrollo coincide con DEVICE_API_KEY del servidor
// (por defecto "dev-homeassist-key").
#define DEVICE_API_KEY "dev-homeassist-key"
