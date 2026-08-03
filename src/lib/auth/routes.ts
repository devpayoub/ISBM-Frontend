import {
  LayoutDashboard,
  AlertCircle,
  Server,
  Activity,
  BarChart3,
  DollarSign,
  Calendar,
  Wrench,
  Users,
  Settings,
  Shield,
  History,
  LifeBuoy,
  type LucideIcon,
} from "lucide-react";
import { UserRole } from "./rbac";

export const INTERNAL_ROLES: UserRole[] = ["ADMIN", "MANAGER", "CONTROLLER", "MAINTENANCE", "OPERATOR"];

export interface AppRoute {
  href: string;
  label: string;
  icon: LucideIcon;
  roles: UserRole[] | null; // null = every authenticated role, including SUPPLIER
  badge?: "alerts" | "maintenance"; // which live count to show next to the label
}

// Single source of truth for both the sidebar menu (visibility) and
// AuthGuard (enforcement) — a route missing here, or reached via a direct
// URL by a role that shouldn't see it, is not just hidden from the menu.
export const appRoutes: AppRoute[] = [
  { href: "/", label: "Dashboard", icon: LayoutDashboard, roles: INTERNAL_ROLES },
  { href: "/alerts", label: "Alertes", icon: AlertCircle, roles: ["ADMIN", "MANAGER", "CONTROLLER"], badge: "alerts" },
  { href: "/support", label: "Support / SAV", icon: LifeBuoy, roles: ["ADMIN", "MANAGER", "OPERATOR", "SUPPLIER"] },
  { href: "/machines", label: "Machines", icon: Server, roles: ["ADMIN", "MANAGER", "OPERATOR", "CONTROLLER"] },
  { href: "/production", label: "Saisie", icon: Activity, roles: ["ADMIN", "MANAGER", "OPERATOR"] },
  { href: "/oee", label: "TRS / OEE", icon: BarChart3, roles: ["ADMIN", "MANAGER", "OPERATOR"] },
  { href: "/costs", label: "Coûts", icon: DollarSign, roles: ["ADMIN", "MANAGER"] },
  { href: "/planning", label: "Planning", icon: Calendar, roles: ["ADMIN", "MANAGER", "OPERATOR"] },
  { href: "/maintenance", label: "Maintenance", icon: Wrench, roles: ["ADMIN", "MANAGER", "MAINTENANCE"], badge: "maintenance" },
  { href: "/quality", label: "Qualité ISO", icon: Shield, roles: ["ADMIN", "MANAGER"] },
  { href: "/audit", label: "Journal d'activité", icon: History, roles: ["ADMIN"] },
  { href: "/users", label: "Utilisateurs", icon: Users, roles: ["ADMIN"] },
  { href: "/settings", label: "Paramètres", icon: Settings, roles: ["ADMIN", "MANAGER"] },
];

/** Roles allowed on a pathname, matching sub-routes (e.g. /machines/5,
 * /support/new) against their parent entry. `null` = no restriction found
 * (either an explicitly open route, or one not listed here — fail-open). */
export function getRequiredRoles(pathname: string): UserRole[] | null {
  const match = appRoutes
    .filter((r) => (r.href === "/" ? pathname === "/" : pathname === r.href || pathname.startsWith(r.href + "/")))
    .sort((a, b) => b.href.length - a.href.length)[0];
  return match ? match.roles : null;
}
