"use client";

import { useEffect, useState } from "react";
import { usePathname } from "next/navigation";
import { useTheme } from "next-themes";
import { ConnectionPill } from "./connection-pill";
import { useAuthStore } from "@/lib/store/useAuthStore";
import { Bell, Sun, Moon, Menu } from "lucide-react";
import { useAlertStore } from "@/lib/store/useAlertStore";

function ThemeToggle() {
  const { resolvedTheme, setTheme } = useTheme();
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);

  if (!mounted) return <div className="w-5 h-5" />;

  const isDark = resolvedTheme === "dark";
  return (
    <button
      onClick={() => setTheme(isDark ? "light" : "dark")}
      className="text-muted-foreground hover:text-foreground transition-colors"
      title={isDark ? "Passer en mode clair" : "Passer en mode sombre"}
    >
      {isDark ? <Sun className="w-5 h-5" /> : <Moon className="w-5 h-5" />}
    </button>
  );
}

const PAGE_TITLES: Record<string, string> = {
  "/": "Vue d'ensemble",
  "/alerts": "Centre d'Alertes",
  "/machines": "Parc Machines",
  "/production": "Saisie de Production",
  "/oee": "TRS / OEE",
  "/costs": "Analyse des Coûts",
  "/planning": "Planning & Écarts",
  "/maintenance": "File de Maintenance",
  "/quality": "Qualité ISO 9001",
  "/users": "Utilisateurs & Rôles",
  "/settings": "Paramètres Système",
};

interface TopbarProps {
  onMenuClick?: () => void;
}

export function Topbar({ onMenuClick }: TopbarProps) {
  const pathname = usePathname();
  const user = useAuthStore((state) => state.user);
  const alertCount = useAlertStore((state) => state.liveAlerts.length);

  const currentShift = () => {
    const hour = new Date().getHours();
    if (hour >= 6 && hour < 14) return "Matin";
    if (hour >= 14 && hour < 22) return "Après-midi";
    return "Nuit";
  };

  const pageTitle = PAGE_TITLES[pathname] || "ISBM";

  return (
    <header className="h-14 border-b bg-card flex items-center justify-between px-4 md:px-6 shrink-0">
      <div className="flex items-center gap-3 md:gap-4">
        <button
          onClick={onMenuClick}
          className="text-muted-foreground hover:text-foreground transition-colors md:hidden"
          aria-label="Ouvrir le menu"
        >
          <Menu className="w-5 h-5" />
        </button>
        <h2 className="font-heading uppercase tracking-widest text-foreground text-sm">{pageTitle}</h2>
      </div>
      <div className="flex items-center gap-3 md:gap-4">
        <div className="hidden sm:block text-sm text-muted-foreground font-sans mr-2 md:mr-4">
          Shift: <span className="font-mono text-foreground">{currentShift()}</span>
        </div>
        <ConnectionPill />
        <ThemeToggle />
        <div className="relative cursor-pointer text-muted-foreground hover:text-foreground transition-colors ml-2">
          <Bell className="w-5 h-5" />
          {alertCount > 0 && (
            <span className="absolute -top-1 -right-1 w-4 h-4 bg-destructive rounded-full text-[9px] flex items-center justify-center text-destructive-foreground font-mono">
              {alertCount}
            </span>
          )}
        </div>
      </div>
    </header>
  );
}
