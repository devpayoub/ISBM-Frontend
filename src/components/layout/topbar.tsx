"use client";

import { useEffect, useRef, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import { useTheme } from "next-themes";
import { ConnectionPill } from "./connection-pill";
import { useAuthStore } from "@/lib/store/useAuthStore";
import { Bell, Sun, Moon, Menu } from "lucide-react";
import { notificationsApi } from "@/lib/api/notifications";
import { Notification } from "@/lib/api/types";

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

function NotificationBell() {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const containerRef = useRef<HTMLDivElement>(null);

  const refreshCount = () => notificationsApi.getUnreadCount().then(r => setUnreadCount(r.count)).catch(() => {});

  useEffect(() => {
    refreshCount();
    const interval = setInterval(refreshCount, 30000);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    function onClickOutside(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", onClickOutside);
    return () => document.removeEventListener("mousedown", onClickOutside);
  }, []);

  const toggleOpen = () => {
    const next = !open;
    setOpen(next);
    if (next) {
      notificationsApi.getMine().then(res => setNotifications(res.results)).catch(() => {});
    }
  };

  const handleClickNotification = async (n: Notification) => {
    if (!n.is_read) {
      try {
        await notificationsApi.markRead(n.id);
        setNotifications(prev => prev.map(x => x.id === n.id ? { ...x, is_read: true } : x));
        refreshCount();
      } catch {
        // best-effort — still navigate even if marking read failed
      }
    }
    setOpen(false);
    if (n.url) router.push(n.url);
  };

  const handleMarkAllRead = async () => {
    try {
      await notificationsApi.markAllRead();
      setNotifications(prev => prev.map(x => ({ ...x, is_read: true })));
      setUnreadCount(0);
    } catch {
      // best-effort
    }
  };

  return (
    <div className="relative" ref={containerRef}>
      <button
        onClick={toggleOpen}
        className="relative cursor-pointer text-muted-foreground hover:text-foreground transition-colors ml-2"
        aria-label="Notifications"
      >
        <Bell className="w-5 h-5" />
        {unreadCount > 0 && (
          <span className="absolute -top-1 -right-1 w-4 h-4 bg-destructive rounded-full text-[9px] flex items-center justify-center text-destructive-foreground font-mono">
            {unreadCount > 9 ? '9+' : unreadCount}
          </span>
        )}
      </button>

      {open && (
        <div className="absolute right-0 mt-2 w-80 max-h-96 overflow-y-auto bg-card border border-border rounded-md shadow-xl z-50">
          <div className="flex items-center justify-between px-3 py-2 border-b border-border">
            <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Notifications</span>
            {unreadCount > 0 && (
              <button onClick={handleMarkAllRead} className="text-xs text-cyan-500 hover:text-cyan-400">
                Tout marquer comme lu
              </button>
            )}
          </div>
          {notifications.length === 0 ? (
            <div className="p-4 text-sm text-muted-foreground text-center">Aucune notification.</div>
          ) : (
            notifications.map(n => (
              <button
                key={n.id}
                onClick={() => handleClickNotification(n)}
                className={`w-full text-left px-3 py-2 border-b border-border/50 hover:bg-panel-2 transition-colors ${!n.is_read ? 'bg-cyan-500/5' : ''}`}
              >
                <div className="flex items-start gap-2">
                  {!n.is_read && <span className="w-1.5 h-1.5 rounded-full bg-cyan-500 mt-1.5 shrink-0" />}
                  <div className="min-w-0">
                    <div className="text-sm text-foreground truncate">{n.verb}</div>
                    <div className="text-[10px] font-mono text-muted-foreground">{new Date(n.created_at).toLocaleString()}</div>
                  </div>
                </div>
              </button>
            ))
          )}
        </div>
      )}
    </div>
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
        <NotificationBell />
      </div>
    </header>
  );
}
