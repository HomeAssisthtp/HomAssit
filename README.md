# HomeAssist

Plataforma web de asistencia, monitoreo y seguridad para el hogar, integrada con un ESP32 y sensores físicos.
Prototipo académico · UTN · ITIC-903M · Administración de Proyectos de TI.

## Ejecutar

```bash
npm install
npm run dev
```

Abre `http://localhost:3000`. Sin variables de Supabase la app funciona en **modo demo** con datos mock.

Cuentas demo (botones en el login): **Ana Martínez** (usuario principal) y **Luis Martínez** (contacto autorizado).
El botón **Simulador** (esquina inferior) emula eventos del ESP32: SOS, humo/gas, puerta, movimiento, desconexión.

Una cuenta creada desde **Registro** empieza con su hogar vacío y una guía de primeros pasos:
registrar el dispositivo → configurar sensores y habitaciones → agregar contactos.

## Dispositivo ESP32

- Firmware listo para Arduino IDE en [firmware/](firmware/README.md): conexiones, bibliotecas y carga.
- Sin hardware, prueba el endpoint de ingesta simulando al ESP32:

```bash
node scripts/simulate-esp32.mjs --once --sos
```

## Stack

Next.js 16.2.6 (App Router, Turbopack) · React 19.2 · TypeScript 5.7.3 · Tailwind CSS 4.2.0 · shadcn/ui (convenciones: cva + tailwind-merge + Radix) · Lucide · Zod · Supabase (`@supabase/ssr`, preparado).

## Arquitectura

```
app/
  (auth)/login · registro · recuperar      Pantallas públicas
  (app)/dashboard · alertas · sensores · historial · estadisticas
        dispositivo · contactos · perfil · configuracion
  api/device/readings                       Ingesta HTTP del ESP32 (RF-19)
proxy.ts                                    Protección de rutas por sesión y rol (Next 16)
components/
  ui/            GlassPanel, SpatialCard, GlassButton, GlassModal, StatusBadge, Field…
  layout/        AppShell (sidebar, top bar, tab bar móvil), NavList, gates de permisos/carga
  dashboard/     HomeStatusCard (hero) y DashboardView
  sensors/       SensorCard + Temperature/Motion/DoorStatus/GasSensor cards, DeviceStatus
  alerts/        AlertCard, AlertList, AlertDetailModal, EmergencyBanner
  history/       EventTimeline, EventTable, EventFiltersBar
  statistics/    StatsCard, ColumnChart, BarList, SegmentBar
  device/ contacts/ profile/ settings/ auth/ demo/
  providers/     SessionProvider, HomeProvider (estado vivo), ToastProvider
lib/             reglas de dominio puras: estado del hogar, permisos, filtros, estadísticas, tonos
services/        contrato HomeAssistApi + implementación mock (services/mock)
types/           User, Role, Device, Sensor, Room, SensorReading, SystemEvent, Alert, AuthorizedContact
supabase/        schema.sql con RLS por rol
```

**Flujo de datos:** componentes → hooks/providers → `services/` (interfaz) → mock hoy / Supabase mañana.
Ningún componente importa datos mock directamente.

## Conectar Supabase

La app cambia sola de datos mock a Supabase cuando existe `.env.local`.

1. Crea un proyecto en [supabase.com](https://supabase.com).
2. **SQL Editor → New query**: pega todo [supabase/schema.sql](supabase/schema.sql) y presiona **Run**.
3. **Authentication → Emails → Templates**: pega las plantillas de [supabase/email-templates](supabase/email-templates/README.md).
4. Copia `.env.example` como `.env.local` y completa, desde **Project Settings → API**:
   `NEXT_PUBLIC_SUPABASE_URL` y `NEXT_PUBLIC_SUPABASE_ANON_KEY`, y define una `DEVICE_API_KEY`
   (su hash va en `private.ingest_keys`; ver "Clave del dispositivo").
5. Reinicia `npm run dev` y crea tu cuenta desde **Registro**.

Qué hace cada pieza:

| Archivo | Función |
|---|---|
| `services/supabase/supabase-api.ts` | Implementa `HomeAssistApi`: auth, hogar, alertas, sensores, contactos, Realtime |
| `supabase/schema.sql` | Tablas, RLS por rol y alta automática de perfil al registrarse |
| `proxy.ts` | Valida la sesión de Supabase en cada navegación |
| `ingest_device_report` (función SQL) | Guarda lo que envía el ESP32 y genera alertas; valida la clave del dispositivo |

Contactos autorizados: el usuario principal agrega el correo en **Contactos**; cuando esa
persona se registra con ese mismo correo queda vinculada con acceso limitado.

Probar el flujo completo sin hardware (después de registrar el dispositivo y sus sensores en la app):

```bash
node scripts/simulate-esp32.mjs --device HA-ESP32-7F3A
```

## Clave del dispositivo

El ESP32 se identifica con `DEVICE_API_KEY` (en `.env.local` y en el `config.h` del firmware).
La base de datos solo guarda su hash SHA-256 en `private.ingest_keys`; la función
`ingest_device_report` lo compara en cada reporte. Para cambiar la clave, calcula el hash:

```bash
node -e "process.loadEnvFile('.env.local'); console.log(require('crypto').createHash('sha256').update(process.env.DEVICE_API_KEY).digest('hex'))"
```

Regístralo en Supabase → SQL Editor con `insert into private.ingest_keys (key_hash) values ('HASH');`
(borra la fila anterior si ya no se usa) y vuelve a copiar el `config.h` desde la app.
