"use client";

import { LogOut } from "lucide-react";
import { useState } from "react";
import { useSession } from "@/components/providers/session-provider";
import { initials } from "@/lib/format";
import { ROLE_LABEL } from "@/lib/permissions";

export function Avatar({ name, className = "size-9" }: { name: string; className?: string }) {
  return (
    <span
      className={`${className} inline-flex shrink-0 items-center justify-center rounded-full border border-line-strong bg-gradient-to-br from-electric/30 to-accent/20 text-xs font-semibold text-ink`}
      aria-hidden
    >
      {initials(name)}
    </span>
  );
}

export function UserCard() {
  const { session, signOut } = useSession();
  const [leaving, setLeaving] = useState(false);
  if (!session) return null;
  return (
    <div className="flex items-center gap-3 rounded-2xl glass-subtle p-2.5">
      <Avatar name={session.user.name} />
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-medium text-ink">{session.user.name}</p>
        <p className="truncate text-xs text-ink-subtle">{ROLE_LABEL[session.user.role]}</p>
      </div>
      <button
        onClick={async () => {
          setLeaving(true);
          await signOut();
        }}
        disabled={leaving}
        className="inline-flex size-9 items-center justify-center rounded-lg text-ink-subtle transition-colors hover:bg-white/8 hover:text-danger disabled:opacity-50"
        aria-label="Cerrar sesión"
        title="Cerrar sesión"
      >
        <LogOut className="size-4" />
      </button>
    </div>
  );
}
