import type { Metadata } from "next";
import { SensorsView } from "@/components/sensors/sensors-view";

export const metadata: Metadata = { title: "Sensores" };

export default function Page() {
  return <SensorsView />;
}