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
  HardDrive,
  ClipboardCheck,
  Boxes,
  CalendarClock,
  MessageSquareWarning,
  PackageSearch,
  type LucideIcon,
} from "lucide-react";
import { UserRole } from "./rbac";

export const INTERNAL_ROLES: UserRole[] = ["ADMIN", "MANAGER", "CONTROLLER", "MAINTENANCE", "OPERATOR"];

export type NavGroup = "Vue d'ensemble" | "Production" | "Stock & Traçabilité" | "RH & Support" | "Administration";

export interface AppRoute {
  href: string;
  label: string;
  icon: LucideIcon;
  roles: UserRole[] | null; // null = every authenticated role, including SUPPLIER
  badge?: "alerts" | "maintenance" | "stock"; // which live count to show next to the label
  group: NavGroup;
}

// Single source of truth for both the sidebar menu (visibility) and
// AuthGuard (enforcement) — a route missing here, or reached via a direct
// URL by a role that shouldn't see it, is not just hidden from the menu.
// Ordered within each group by how often it's opened during a shift —
// group order itself is the same priority logic zoomed out (glance-first
// screens, then daily production work, then stock/quality, then people/
// admin screens you touch rarely).
export const appRoutes: AppRoute[] = [
  { href: "/", label: "Dashboard", icon: LayoutDashboard, roles: INTERNAL_ROLES, group: "Vue d'ensemble" },
  { href: "/alerts", label: "Alertes", icon: AlertCircle, roles: ["ADMIN", "MANAGER", "CONTROLLER"], badge: "alerts", group: "Vue d'ensemble" },

  { href: "/machines", label: "Machines", icon: Server, roles: ["ADMIN", "MANAGER", "OPERATOR", "CONTROLLER"], group: "Production" },
  { href: "/production", label: "Saisie", icon: Activity, roles: ["ADMIN", "MANAGER", "OPERATOR"], group: "Production" },
  { href: "/planning", label: "Planning", icon: Calendar, roles: ["ADMIN", "MANAGER", "OPERATOR"], group: "Production" },
  { href: "/oee", label: "TRS / OEE", icon: BarChart3, roles: ["ADMIN", "MANAGER", "OPERATOR"], group: "Production" },
  { href: "/maintenance", label: "Maintenance", icon: Wrench, roles: ["ADMIN", "MANAGER", "MAINTENANCE"], badge: "maintenance", group: "Production" },
  { href: "/control", label: "Contrôle préventif", icon: ClipboardCheck, roles: ["ADMIN", "MANAGER", "CONTROLLER"], group: "Production" },
  { href: "/costs", label: "Coûts", icon: DollarSign, roles: ["ADMIN", "MANAGER"], group: "Production" },

  { href: "/stock", label: "Stock", icon: Boxes, roles: ["ADMIN", "MANAGER"], badge: "stock", group: "Stock & Traçabilité" },
  { href: "/package", label: "Package / Sacs", icon: PackageSearch, roles: ["ADMIN", "MANAGER"], group: "Stock & Traçabilité" },
  { href: "/quality", label: "Qualité ISO", icon: Shield, roles: ["ADMIN", "MANAGER"], group: "Stock & Traçabilité" },
  { href: "/reclamation", label: "Réclamations", icon: MessageSquareWarning, roles: ["ADMIN", "MANAGER"], group: "Stock & Traçabilité" },

  { href: "/rh", label: "RH", icon: CalendarClock, roles: ["ADMIN", "MANAGER"], group: "RH & Support" },
  { href: "/support", label: "Support / SAV", icon: LifeBuoy, roles: ["ADMIN", "MANAGER", "OPERATOR", "SUPPLIER"], group: "RH & Support" },
  { href: "/support/equipment", label: "Mes équipements", icon: HardDrive, roles: ["SUPPLIER"], group: "RH & Support" },

  { href: "/users", label: "Utilisateurs", icon: Users, roles: ["ADMIN"], group: "Administration" },
  { href: "/audit", label: "Journal d'activité", icon: History, roles: ["ADMIN"], group: "Administration" },
  { href: "/settings", label: "Paramètres", icon: Settings, roles: ["ADMIN", "MANAGER"], group: "Administration" },
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
