import type { Metadata } from "next";
import { ProfileView } from "@/components/profile/profile-view";

export const metadata: Metadata = { title: "Perfil" };

export default function Page() {
  return <ProfileView />;
}