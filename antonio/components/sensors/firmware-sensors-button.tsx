"use client";

import { Cpu } from "lucide-react";
import { GlassButton } from "@/components/ui/glass-button";
import { useFirmwareSensors } from "@/hooks/use-firmware-sensors";
import type { HomeSnapshot } from "@/types";

/** Registra de un clic los sensores que lee el firmware del ESP32 (mismos identificadores). */
export function FirmwareSensorsButton({ snapshot }: { snapshot: HomeSnapshot }) {
  const { missing, addMissing, adding } = useFirmwareSensors(snapshot);
  if (missing.length === 0) return null;
  return (
    <GlassButton onClick={addMissing} loading={adding} title={missing.map((s) => s.hardwareId).join(", ")}>
      {!adding && <Cpu aria-hidden />} Agregar sensores del ESP32 ({missing.length})
    </GlassButton>
  );
}
