import type { Metadata } from "next";
import { DeviceView } from "@/components/device/device-view";

export const metadata: Metadata = { title: "Dispositivo" };

export default function Page() {
  return <DeviceView />;
}