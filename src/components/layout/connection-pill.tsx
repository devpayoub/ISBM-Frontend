"use client";

import { useAlertStore } from "@/lib/store/useAlertStore";

export function ConnectionPill() {
  const isConnected = useAlertStore((state) => state.isConnected);

  return (
    <div className={`px-3 py-1 rounded-full text-xs font-heading tracking-widest flex items-center gap-2 border ${
      isConnected ? "border-status-running/30 bg-status-running/10 text-status-running" : "border-status-stopped/30 bg-status-stopped/10 text-status-stopped"
    }`}>
      <span className={`w-2 h-2 rounded-full ${isConnected ? "bg-status-running animate-pulse" : "bg-status-stopped"}`} />
      {isConnected ? "LIVE" : "RECONNEXION..."}
    </div>
  );
}
