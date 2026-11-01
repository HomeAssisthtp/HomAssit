"use client";

import { useEffect, useState } from "react";

/** Reloj compartido para textos relativos ("hace 2 minutos"). */
export function useNow(intervalMs = 10_000) {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), intervalMs);
    return () => clearInterval(id);
  }, [intervalMs]);
  return now;
}
