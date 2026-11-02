"use client";

import { useCallback, useState } from "react";
import { useToast } from "@/components/providers/toast-provider";
import { FIRMWARE_SENSORS } from "@/lib/firmware";
import { api } from "@/services";
import type { HomeSnapshot } from "@/types";

/** Sensores del firmware que aún no están registrados en el hogar, y acción para registrarlos. */
export function useFirmwareSensors(snapshot: HomeSnapshot) {
  const toast = useToast();
  const [adding, setAdding] = useState(false);
  const registered = new Set(snapshot.sensors.map((s) => s.hardwareId));
  const missing = FIRMWARE_SENSORS.filter((s) => !registered.has(s.hardwareId));

  const addMissing = useCallback(async () => {
    setAdding(true);
    let ok = 0;
    try {
      for (const s of missing) {
        const room = snapshot.rooms.find((r) => r.name.toLowerCase() === s.room.toLowerCase()) ?? snapshot.rooms[0];
        if (!room) throw new Error("Agrega al menos una habitación");
        await api.sensors.create({ type: s.type, name: s.name, hardwareId: s.hardwareId, roomId: room.id });
        ok++;
      }
      toast({ tone: "success", title: ok === 1 ? "Sensor registrado" : `${ok} sensores registrados`, description: "Coinciden con los del firmware del ESP32." });
    } catch (e) {
      toast({ tone: "error", title: "No se pudieron registrar todos los sensores", description: (e as Error).message });
    } finally {
      setAdding(false);
    }
  }, [missing, snapshot.rooms, toast]);

  return { missing, total: FIRMWARE_SENSORS.length, addMissing, adding };
}
