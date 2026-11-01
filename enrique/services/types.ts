import type {
  Alert,
  AuthorizedContact,
  ContactPermissions,
  Device,
  HomeSnapshot,
  Room,
  Sensor,
  SensorType,
  Session,
  SystemSettings,
  User,
} from "@/types";


export interface HomeAssistApi {
  readonly mode: "mock" | "supabase";

  auth: {
    getSession(): Promise<Session | null>;
    signIn(input: { email: string; password: string }): Promise<Session>;
    signUp(input: { name: string; email: string; password: string }): Promise<Session>;
    signOut(): Promise<void>;
    requestPasswordReset(email: string): Promise<void>;
    /** Cambia la contraseña del usuario con sesión (p. ej. tras el enlace de recuperación). */
    updatePassword(newPassword: string): Promise<void>;
    updateProfile(userId: string, patch: Pick<User, "name" | "email" | "phone">): Promise<User>;
  };

  home: {
    getSnapshot(session: Session): Promise<HomeSnapshot>;
    /** Suscripción en tiempo real (Supabase Realtime en producción). */
    subscribe(session: Session, onChange: (snapshot: HomeSnapshot) => void): () => void;
  };

  alerts: {
    attend(alertId: string, by: User): Promise<Alert>;
  };

  device: {
    register(input: { deviceUid: string; name: string; wifiSsid: string }): Promise<Device>;
    ping(): Promise<{ ok: boolean; latencyMs: number }>;
  };

  rooms: {
    create(name: string): Promise<Room>;
  };

  sensors: {
    create(input: { type: SensorType; name: string; hardwareId: string; roomId: string; threshold?: number }): Promise<Sensor>;
    update(sensorId: string, patch: Partial<Pick<Sensor, "name" | "roomId" | "threshold" | "enabled">>): Promise<Sensor>;
  };

  contacts: {
    create(input: {
      name: string;
      email: string;
      phone?: string;
      relationship: string;
      permissions: ContactPermissions;
    }): Promise<AuthorizedContact>;
    update(id: string, patch: Partial<Pick<AuthorizedContact, "permissions" | "status">>): Promise<AuthorizedContact>;
    remove(id: string): Promise<void>;
  };

  settings: {
    update(patch: SystemSettings): Promise<SystemSettings>;
  };
}

export interface DeviceSimulator {
  pressSos(): void;
  detectGas(): void;
  openDoor(): void;
  closeDoor(): void;
  detectMotion(): void;
  heatUp(): void;
  setConnection(connected: boolean): void;
  reset(): void;
}

export class ApiError extends Error {
  constructor(
    message: string,
    public code: "invalid_credentials" | "email_taken" | "confirm_email" | "not_found" | "forbidden" | "network" | "unknown" = "unknown",
  ) {
    super(message);
  }
}
