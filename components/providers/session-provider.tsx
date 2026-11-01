"use client";

import { useRouter } from "next/navigation";
import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import { capabilitiesFor, type Capability } from "@/lib/permissions";
import { api } from "@/services";
import type { Session, User } from "@/types";

type SessionStatus = "loading" | "authenticated" | "anonymous";

interface SessionContextValue {
  session: Session | null;
  status: SessionStatus;
  can: (cap: Capability) => boolean;
  signIn: (email: string, password: string) => Promise<void>;
  signUp: (input: { name: string; email: string; password: string }) => Promise<void>;
  signOut: () => Promise<void>;
  updateProfile: (patch: Pick<User, "name" | "email" | "phone">) => Promise<void>;
}

const SessionContext = createContext<SessionContextValue | null>(null);

export function SessionProvider({ children }: { children: ReactNode }) {
  const router = useRouter();
  const [session, setSession] = useState<Session | null>(null);
  const [status, setStatus] = useState<SessionStatus>("loading");

  useEffect(() => {
    let alive = true;
    api.auth.getSession().then((s) => {
      if (!alive) return;
      setSession(s);
      setStatus(s ? "authenticated" : "anonymous");
    });
    return () => {
      alive = false;
    };
  }, []);

  const signIn = useCallback(async (email: string, password: string) => {
    const s = await api.auth.signIn({ email, password });
    setSession(s);
    setStatus("authenticated");
  }, []);

  const signUp = useCallback(async (input: { name: string; email: string; password: string }) => {
    const s = await api.auth.signUp(input);
    setSession(s);
    setStatus("authenticated");
  }, []);

  const signOut = useCallback(async () => {
    await api.auth.signOut();
    setSession(null);
    setStatus("anonymous");
    router.replace("/login");
    router.refresh();
  }, [router]);

  const updateProfile = useCallback(
    async (patch: Pick<User, "name" | "email" | "phone">) => {
      if (!session) return;
      const user = await api.auth.updateProfile(session.user.id, patch);
      setSession((s) => (s ? { ...s, user } : s));
    },
    [session],
  );

  const value = useMemo<SessionContextValue>(() => {
    const caps = capabilitiesFor(session);
    return { session, status, can: (c) => caps.has(c), signIn, signUp, signOut, updateProfile };
  }, [session, status, signIn, signUp, signOut, updateProfile]);

  return <SessionContext.Provider value={value}>{children}</SessionContext.Provider>;
}

export function useSession() {
  const ctx = useContext(SessionContext);
  if (!ctx) throw new Error("useSession debe usarse dentro de <SessionProvider>");
  return ctx;
}
