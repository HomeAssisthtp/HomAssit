"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useHome } from "@/components/providers/home-provider";
import { useSession } from "@/components/providers/session-provider";
import { navFor } from "@/lib/navigation";
import { cn } from "@/lib/utils";

/** Lista de navegación filtrada por los permisos del rol actual. */
export function NavList({ onNavigate }: { onNavigate?: () => void }) {
  const pathname = usePathname();
  const { can } = useSession();
  const { summary } = useHome();
  const groups = navFor(can);

  return (
    <nav aria-label="Navegación principal" className="flex flex-col gap-6">
      {groups.map((g) => (
        <div key={g.label}>
          <p className="mb-2 px-3 text-[0.68rem] font-semibold uppercase tracking-[0.18em] text-ink-subtle">{g.label}</p>
          <ul className="flex flex-col gap-0.5">
            {g.items.map((item) => {
              const active = pathname === item.href || pathname.startsWith(`${item.href}/`);
              const badge = item.href === "/alertas" ? summary?.pendingAlerts ?? 0 : 0;
              const emergency = item.href === "/alertas" && (summary?.pendingEmergencies ?? 0) > 0;
              return (
                <li key={item.href}>
                  <Link
                    href={item.href}
                    onClick={onNavigate}
                    aria-current={active ? "page" : undefined}
                    className={cn(
                      "group relative flex h-11 items-center gap-3 rounded-xl px-3 text-sm font-medium transition-all duration-200",
                      active
                        ? "bg-white/[0.07] text-ink shadow-[inset_0_1px_0_rgb(255_255_255/0.06)]"
                        : "text-ink-muted hover:bg-white/[0.04] hover:text-ink",
                    )}
                  >
                    {active && (
                      <span className="absolute left-0 top-1/2 h-5 w-[3px] -translate-y-1/2 rounded-full bg-accent shadow-[0_0_12px_rgb(79_209_232/0.8)]" aria-hidden />
                    )}
                    <item.icon className={cn("size-[1.1rem] transition-colors", active ? "text-accent" : "text-ink-subtle group-hover:text-ink-muted")} aria-hidden />
                    <span className="flex-1">{item.label}</span>
                    {badge > 0 && (
                      <span
                        className={cn(
                          "min-w-5 rounded-full px-1.5 py-0.5 text-center text-[0.7rem] font-semibold tabular",
                          emergency ? "bg-danger text-white" : "bg-warn/20 text-warn",
                        )}
                        aria-label={`${badge} pendientes`}
                      >
                        {badge}
                      </span>
                    )}
                  </Link>
                </li>
              );
            })}
          </ul>
        </div>
      ))}
    </nav>
  );
}
