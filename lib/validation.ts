import { z } from "zod";

const email = z.string().trim().min(1, "Ingresa tu correo electrónico").email("Correo electrónico no válido");
const name = z.string().trim().min(3, "El nombre debe tener al menos 3 caracteres").max(80, "Máximo 80 caracteres");
const phone = z
  .string()
  .trim()
  .regex(/^[0-9 +()-]{0,20}$/, "Teléfono no válido")
  .optional()
  .or(z.literal(""));

export const loginSchema = z.object({
  email,
  password: z.string().min(1, "Ingresa tu contraseña"),
});

export const registerSchema = z
  .object({
    name,
    email,
    password: z
      .string()
      .min(8, "Mínimo 8 caracteres")
      .regex(/[A-Za-z]/, "Incluye al menos una letra")
      .regex(/[0-9]/, "Incluye al menos un número"),
    confirm: z.string(),
  })
  .refine((v) => v.password === v.confirm, { path: ["confirm"], message: "Las contraseñas no coinciden" });

export const recoverSchema = z.object({ email });

export const newPasswordSchema = z
  .object({
    password: z
      .string()
      .min(8, "Mínimo 8 caracteres")
      .regex(/[A-Za-z]/, "Incluye al menos una letra")
      .regex(/[0-9]/, "Incluye al menos un número"),
    confirm: z.string(),
  })
  .refine((v) => v.password === v.confirm, { path: ["confirm"], message: "Las contraseñas no coinciden" });

export const profileSchema = z.object({ name, email, phone });

export const deviceSchema = z.object({
  deviceUid: z
    .string()
    .trim()
    .toUpperCase()
    .regex(/^HA-ESP32-[A-Z0-9]{4}$/, "Formato esperado: HA-ESP32-XXXX"),
  name: z.string().trim().min(3, "Mínimo 3 caracteres").max(40),
  wifiSsid: z.string().trim().min(1, "Indica la red Wi-Fi del dispositivo").max(32),
});

export const sensorSchema = z.object({
  type: z.enum(["temperature", "motion", "door", "gas", "sos"], { message: "Selecciona un tipo" }),
  name: z.string().trim().min(3, "Mínimo 3 caracteres").max(40),
  hardwareId: z
    .string()
    .trim()
    .toUpperCase()
    .regex(/^[A-Z0-9]+-GPIO\d{1,2}$/, "Formato esperado: MODELO-GPIO00 (p. ej. PIR-GPIO13)"),
  roomId: z.string().min(1, "Selecciona una habitación"),
  threshold: z.coerce.number().positive("Debe ser mayor a 0").optional(),
});

export const roomSchema = z.object({
  name: z.string().trim().min(2, "Mínimo 2 caracteres").max(30, "Máximo 30 caracteres"),
});

export const contactSchema = z.object({
  name,
  email,
  phone,
  relationship: z.string().trim().min(2, "Indica la relación").max(30),
  viewAlerts: z.boolean(),
  viewHistory: z.boolean(),
  attendAlerts: z.boolean(),
});

export const settingsSchema = z
  .object({
    temperatureMax: z.coerce.number().min(20, "Mínimo 20 °C").max(60, "Máximo 60 °C"),
    temperatureMin: z.coerce.number().min(-10).max(25),
    gasThresholdPpm: z.coerce.number().int().min(100, "Mínimo 100 ppm").max(2000, "Máximo 2000 ppm"),
    offlineAfterSeconds: z.coerce.number().int().min(15, "Mínimo 15 s").max(600, "Máximo 600 s"),
    buzzerEnabled: z.boolean(),
    motionAlertsWhenAway: z.boolean(),
  })
  .refine((v) => v.temperatureMin < v.temperatureMax, {
    path: ["temperatureMin"],
    message: "Debe ser menor que la máxima",
  });

/** Convierte los issues de Zod a { campo: mensaje }. */
export function fieldErrors(error: z.ZodError): Record<string, string> {
  const out: Record<string, string> = {};
  for (const issue of error.issues) {
    const key = issue.path.join(".");
    if (key && !out[key]) out[key] = issue.message;
  }
  return out;
}
