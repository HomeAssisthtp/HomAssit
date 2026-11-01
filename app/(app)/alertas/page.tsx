import type { Metadata } from "next";
import { Suspense } from "react";
import { AlertsView } from "@/components/alerts/alerts-view";

export const metadata: Metadata = { title: "Alertas" };

export default function Page() {
  return (
    <Suspense>
      <AlertsView />
    </Suspense>
  );
}