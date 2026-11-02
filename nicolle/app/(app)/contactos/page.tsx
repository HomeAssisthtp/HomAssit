import type { Metadata } from "next";
import { ContactsView } from "@/components/contacts/contacts-view";

export const metadata: Metadata = { title: "Contactos autorizados" };

export default function Page() {
  return <ContactsView />;
}