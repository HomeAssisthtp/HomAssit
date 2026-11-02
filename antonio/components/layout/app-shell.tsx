"use client";

import * as Dialog from "@radix-ui/react-dialog";
import { Bell, Menu, X } from "lucide-react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useState, type ReactNode } from "react";
import { EmergencyBanner } from "@/components/alerts/emergency-banner";
import { LiveAlertNotifier } from "@/components/alerts/live-alert-notifier";
import { Logo } from "@/components/brand/logo";
import { DemoPanel } from "@/components/demo/demo-panel";
import { HomeProvider, useHome } from "@/components/providers/home-provider";
import { useSession } from "@/components/providers/session-provider";
import { ConnectionPill } from "@/components/sensors/device-status";
import { MOBILE_PRIMARY, NAV } from "@/lib/navigation";
import { cn } from "@/lib/utils";
import { NavList } from "./nav-list";
import { Avatar, UserCard } from "./user-card";

export function AppShell({ children }: { children: ReactNode }) {
  const { status } = useSession();
  const router = useRouter();

  useEffect(() => {
    if (status === "anonymous") router.replace("/login");
  }, [status, router]);

  if (status !== "authenticated") {
    return (
      <div className="flex min-h-dvh items-center justify-center" role="status" aria-label="Cargando sesión">
        <div className="flex flex-col items-center gap-4">
          <Logo compact />
          <span className="h-1 w-24 overflow-hidden rounded-full bg-white/5">
            <span className="skeleton block h-full w-full" />
          </span>
        </div>
      </div>
    );
  }

  return (
    <HomeProvider>
      <ShellLayout>{children}</ShellLayout>
    </HomeProvider>
  );
}

function ShellLayout({ children }: { children: ReactNode }) {
  const [menuOpen, setMenuOpen] = useState(false);

  return (
    <div className="min-h-dvh">
      <a
        href="#contenido"
        className="sr-only focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:z-[70] focus:rounded-lg focus:bg-accent focus:px-4 focus:py-2 focus:text-bg"
      >
        Saltar al contenido
      </a>

      {/* Sidebar escritorio: panel flotante */}
      <aside className="fixed inset-y-3 left-3 z-30 hidden w-[264px] flex-col rounded-[1.5rem] glass-strong sheen p-4 spatial-enter lg:flex">
        <div className="px-2 pb-6 pt-2">
          <Link href="/dashboard" aria-label="HomeAssist, ir al dashboard">
            <Logo />
          </Link>
        </div>
        <div className="-mx-1 flex-1 overflow-y-auto px-1">
          <NavList />
        </div>
        <div className="mt-4 flex flex-col gap-3">
          <UserCard />
        </div>
      </aside>

      {/* Menú móvil (drawer) */}
      <Dialog.Root open={menuOpen} onOpenChange={setMenuOpen}>
        <Dialog.Portal>
          <Dialog.Overlay className="fixed inset-0 z-50 bg-bg-deep/70 backdrop-blur-sm lg:hidden" />
          <Dialog.Content
            className="fixed inset-y-2 left-2 z-50 flex w-[min(300px,calc(100vw-1rem))] flex-col rounded-[1.5rem] p-4 outline-none glass-strong data-[state=open]:animate-[drawer-in_0.3s_cubic-bezier(0.2,0.8,0.2,1)] lg:hidden"
            style={{ background: "rgb(12 19 34 / 0.96)" }}
          >
            <div className="flex items-center justify-between px-2 pb-6 pt-1">
              <Logo />
              <Dialog.Close className="inline-flex size-10 items-center justify-center rounded-lg text-ink-muted hover:bg-white/8" aria-label="Cerrar menú">
                <X className="size-5" />
              </Dialog.Close>
            </div>
            <Dialog.Title className="sr-only">Menú de navegación</Dialog.Title>
            <Dialog.Description className="sr-only">Secciones disponibles para tu cuenta</Dialog.Description>
            <div className="flex-1 overflow-y-auto">
              <NavList onNavigate={() => setMenuOpen(false)} />
            </div>
            <div className="mt-4">
              <UserCard />
            </div>
          </Dialog.Content>
        </Dialog.Portal>
      </Dialog.Root>

      <div className="lg:pl-[284px]">
        <TopBar onMenu={() => setMenuOpen(true)} />
        <EmergencyBanner />
        <main id="contenido" className="mx-auto w-full max-w-[1400px] px-4 pb-28 pt-4 sm:px-6 lg:px-8 lg:pb-12">
          {children}
        </main>
      </div>

      <MobileTabBar onMenu={() => setMenuOpen(true)} />
      <DemoPanel />
      <LiveAlertNotifier />
    </div>
  );
}

function TopBar({ onMenu }: { onMenu: () => void }) {
  const { session, can } = useSession();
  const { summary } = useHome();
  const pending = summary?.pendingAlerts ?? 0;
  const emergency = (summary?.pendingEmergencies ?? 0) > 0;

  return (
    <header className="sticky top-0 z-20 px-4 pt-3 sm:px-6 lg:px-8">
      <div
        className="mx-auto flex h-14 max-w-[1400px] items-center gap-3 rounded-2xl glass px-3 sm:px-4"
        style={{ background: "rgb(12 19 34 / 0.72)" }}
      >
        <button
          onClick={onMenu}
          className="inline-flex size-10 items-center justify-center rounded-lg text-ink-muted hover:bg-white/8 hover:text-ink lg:hidden"
          aria-label="Abrir menú"
        >
          <Menu className="size-5" />
        </button>
        <Link href="/dashboard" className="lg:hidden" aria-label="HomeAssist">
          <Logo compact />
        </Link>
        <div className="min-w-0 flex-1">
          <ConnectionPill />
        </div>
        {can("alerts:view") && (
          <Link
            href="/alertas"
            className={cn(
              "relative inline-flex size-10 items-center justify-center rounded-xl transition-colors hover:bg-white/8",
              emergency ? "text-danger" : "text-ink-muted hover:text-ink",
            )}
            aria-label={pending ? `Alertas: ${pending} pendientes` : "Alertas: sin pendientes"}
          >
            <Bell className="size-5" />
            {pending > 0 && (
              <span className={cn("absolute right-1.5 top-1.5 flex size-4 items-center justify-center rounded-full text-[0.62rem] font-bold tabular", emergency ? "bg-danger text-white" : "bg-warn text-bg")}>
                {pending > 9 ? "9+" : pending}
              </span>
            )}
          </Link>
        )}
        {session && (
          <Link href="/perfil" className="hidden items-center gap-2.5 rounded-xl py-1 pl-1 pr-3 hover:bg-white/6 sm:flex" aria-label="Mi perfil">
            <Avatar name={session.user.name} className="size-8" />
            <span className="max-w-[10rem] truncate text-sm text-ink-muted">{session.user.name.split(" ")[0]}</span>
          </Link>
        )}
      </div>
    </header>
  );
}

function MobileTabBar({ onMenu }: { onMenu: () => void }) {
  const pathname = usePathname();
  const { can } = useSession();
  const { summary } = useHome();
  const items = NAV.flatMap((g) => g.items).filter((i) => MOBILE_PRIMARY.includes(i.href) && can(i.cap));

  return (
    <nav aria-label="Navegación rápida" className="fixed inset-x-3 bottom-3 z-30 lg:hidden">
      <ul className="flex h-16 items-stretch justify-around rounded-2xl glass-strong px-2" style={{ background: "rgb(14 22 38 / 0.85)" }}>
        {items.map((i) => {
          const active = pathname.startsWith(i.href);
          const badge = i.href === "/alertas" ? summary?.pendingAlerts ?? 0 : 0;
          return (
            <li key={i.href} className="flex-1">
              <Link
                href={i.href}
                aria-current={active ? "page" : undefined}
                className={cn("relative flex h-full flex-col items-center justify-center gap-1 rounded-xl text-[0.7rem] font-medium", active ? "text-accent" : "text-ink-subtle")}
              >
                <i.icon className="size-5" aria-hidden />
                {i.short ?? i.label}
                {badge > 0 && <span className="absolute right-[calc(50%-1.1rem)] top-2 size-2 rounded-full bg-danger" aria-label={`${badge} pendientes`} />}
              </Link>
            </li>
          );
        })}
        <li className="flex-1">
          <button onClick={onMenu} className="flex h-full w-full flex-col items-center justify-center gap-1 text-[0.7rem] font-medium text-ink-subtle">
            <Menu className="size-5" aria-hidden />
            Más
          </button>
        </li>
      </ul>
    </nav>
  );
}
