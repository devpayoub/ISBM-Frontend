"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useAuthStore } from "@/lib/store/useAuthStore";
import { useAlertStore } from "@/lib/store/useAlertStore";
import { useMaintenanceStore } from "@/lib/store/useMaintenanceStore";
import { useStockStore } from "@/lib/store/useStockStore";
import { authApi } from "@/lib/api/auth";
import { maintenanceApi } from "@/lib/api/maintenance";
import { machinesApi } from "@/lib/api/machines";
import { stockApi } from "@/lib/api/stock";
import { appRoutes, NavGroup } from "@/lib/auth/routes";
import { ROLE_LABELS, UserRole } from "@/lib/auth/rbac";
import { LogOut, Zap } from "lucide-react";

interface SidebarProps {
  open: boolean;
  onClose: () => void;
}

export function Sidebar({ open, onClose }: SidebarProps) {
  const pathname = usePathname();
  const user = useAuthStore((state) => state.user);
  const liveAlerts = useAlertStore((state) => state.liveAlerts);
  const maintenanceQueueCount = useMaintenanceStore((state) => state.queueCount);
  const setQueueCount = useMaintenanceStore((state) => state.setQueueCount);
  const stockRuptureCount = useStockStore((state) => state.ruptureCount);
  const setRuptureCount = useStockStore((state) => state.setRuptureCount);
  const logout = useAuthStore((state) => state.logout);
  const [steg, setSteg] = useState<{ enabled: boolean; time: string; data: string }>({ enabled: false, time: "", data: "" });

  // Auto-close the mobile drawer whenever the route changes.
  useEffect(() => {
    onClose();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pathname]);

  const visibleRoutes = appRoutes.filter(
    (route) => route.roles === null || (user?.role && route.roles.includes(user.role))
  );

  // Maintenance has no WebSocket feed, so the sidebar badge polls the
  // pending-intervention count itself — only for roles that can actually
  // see the Maintenance link, and only while the sidebar (i.e. any
  // dashboard page) is mounted, not just while on /maintenance itself.
  const canSeeMaintenance = visibleRoutes.some((r) => r.href === "/maintenance");
  useEffect(() => {
    if (!canSeeMaintenance) return;
    const poll = () => maintenanceApi.getQueue().then((rows) => setQueueCount(rows.length)).catch(() => {});
    poll();
    const interval = setInterval(poll, 5000);
    return () => clearInterval(interval);
  }, [canSeeMaintenance, setQueueCount]);

  // Stock has no WebSocket feed either — same polling shape as Maintenance
  // above, counting items in RUPTURE (quantity <= 0) so the sidebar surfaces
  // it before someone opens the Stock page and finds out the hard way.
  const canSeeStock = visibleRoutes.some((r) => r.href === "/stock");
  useEffect(() => {
    if (!canSeeStock) return;
    const poll = () => stockApi.getLowStock()
      .then((rows) => setRuptureCount(rows.filter((r) => r.status === "RUPTURE").length))
      .catch(() => {});
    poll();
    const interval = setInterval(poll, 30000);
    return () => clearInterval(interval);
  }, [canSeeStock, setRuptureCount]);

  // STEG display (plan.md §8) — a central on/off setting, so every screen
  // that shows it (currently just this sidebar footer) reflects the same
  // Parameter rows. Polls at a low frequency since it changes rarely.
  useEffect(() => {
    const poll = () => machinesApi.getSteg().then((res) => {
      const enabled = Number(res.results.find((p) => p.key === "STEG_ENABLED")?.value) === 1;
      const time = res.results.find((p) => p.key === "STEG_TIME")?.text_value || "";
      const data = res.results.find((p) => p.key === "STEG_DATA")?.text_value || "";
      setSteg({ enabled, time, data });
    }).catch(() => {});
    poll();
    const interval = setInterval(poll, 60000);
    return () => clearInterval(interval);
  }, []);

  const handleLogout = async () => {
    try {
      await authApi.logout();
    } catch {
      // best-effort — the session must clear locally even if the API call fails
    } finally {
      logout();
    }
  };

  return (
    <>
      {/* Backdrop: mobile only, closes the drawer on outside click */}
      {open && (
        <div
          className="fixed inset-0 z-40 bg-black/40 md:hidden"
          onClick={onClose}
          aria-hidden="true"
        />
      )}
      <aside
        className={`w-64 border-r bg-sidebar flex flex-col shrink-0 fixed inset-y-0 left-0 z-50 transition-transform duration-200 md:static md:translate-x-0 ${
          open ? "translate-x-0" : "-translate-x-full"
        }`}
      >
      <div className="h-14 border-b flex items-center px-6 bg-sidebar-primary text-sidebar-primary-foreground">
        <h1 className="font-heading uppercase tracking-widest text-lg">ISBM</h1>
      </div>
      <nav className="flex-1 p-3 space-y-0.5 overflow-auto">
        {visibleRoutes.map((route, idx) => {
          const isActive = pathname === route.href;
          const badgeCount = route.badge === "alerts" ? liveAlerts.length
            : route.badge === "maintenance" ? maintenanceQueueCount
            : route.badge === "stock" ? stockRuptureCount
            : 0;
          const prevGroup: NavGroup | undefined = visibleRoutes[idx - 1]?.group;
          const showGroupHeader = route.group !== prevGroup;
          return (
            <div key={route.href}>
              {showGroupHeader && (
                <div className={`px-2.5 text-[10px] font-sans font-semibold uppercase tracking-widest text-sidebar-foreground/40 ${idx === 0 ? "pt-0 pb-1.5" : "pt-4 pb-1.5"}`}>
                  {route.group}
                </div>
              )}
              <Link
                href={route.href}
                className={`flex items-center justify-between p-2.5 rounded-md text-sm transition-colors ${
                  isActive
                    ? "bg-sidebar-accent text-sidebar-accent-foreground font-medium"
                    : "text-sidebar-foreground hover:bg-sidebar-accent/50 hover:text-sidebar-accent-foreground"
                }`}
              >
                <div className="flex items-center gap-3 font-sans">
                  <route.icon className="w-4 h-4" />
                  {route.label}
                </div>
                {badgeCount > 0 && (
                  <span className="w-5 h-5 bg-destructive rounded-full text-[10px] flex items-center justify-center text-destructive-foreground font-mono">
                    {badgeCount}
                  </span>
                )}
              </Link>
            </div>
          );
        })}
      </nav>

      {/* STEG display — shown only when STEG_ENABLED is on (plan.md §8) */}
      {steg.enabled && (
        <div className="mx-3 mb-2 px-3 py-2 rounded-md bg-amber-500/10 border border-amber-500/30 text-amber-500">
          <div className="flex items-center gap-2 text-[11px] font-mono font-semibold uppercase tracking-wide">
            <Zap className="w-3.5 h-3.5" />
            STEG
            {steg.time && <span className="font-normal normal-case text-amber-500/80">• {steg.time}</span>}
          </div>
          {steg.data && <div className="text-[11px] mt-0.5 text-amber-500/80">{steg.data}</div>}
        </div>
      )}

      {/* User info + logout */}
      <div className="p-3 border-t">
        <div className="flex items-center justify-between p-2">
          <div>
            <div className="text-sm font-sans font-medium text-sidebar-foreground">
              {user ? `${user.first_name} ${user.last_name}` : "—"}
            </div>
            <div className="text-[10px] font-mono text-muted-foreground uppercase">
              {user?.role ? (ROLE_LABELS[user.role as UserRole] || user.role) : "—"}
            </div>
          </div>
          <button
            onClick={handleLogout}
            className="text-muted-foreground hover:text-destructive transition-colors p-1"
            title="Déconnexion"
          >
            <LogOut className="w-4 h-4" />
          </button>
        </div>
      </div>
      </aside>
    </>
  );
}
