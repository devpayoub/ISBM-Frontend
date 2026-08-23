'use client';

import { useEffect, useState } from 'react';
import { dashboardApi } from '@/lib/api/dashboard';
import { alertsApi } from '@/lib/api/alerts';
import { useAuthStore } from '@/lib/store/useAuthStore';
import { useAlertStore } from '@/lib/store/useAlertStore';
import { AndonBoard } from '@/components/dashboard/AndonBoard';
import { AlertFeed } from '@/components/dashboard/AlertFeed';
import { StockSummary } from '@/components/dashboard/StockSummary';
import { PlanningSummary } from '@/components/dashboard/PlanningSummary';
import { MaterialsOverview } from '@/components/dashboard/MaterialsOverview';
import { AlertDeclareDialog } from '@/components/alerts/AlertDeclareDialog';
import { connectWebSocket, disconnectWebSocket } from '@/lib/ws/client';

export default function DashboardPage() {
  const [kpis, setKpis] = useState<any>(null);
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);
  const role = useAuthStore((s) => s.user?.role);
  // Same visibility as the sidebar links (lib/auth/routes.ts) — don't show a
  // dashboard card for a page the role can't open.
  const canSeeStock = role === 'ADMIN' || role === 'MANAGER';
  const canSeePlanning = role === 'ADMIN' || role === 'MANAGER' || role === 'OPERATOR';

  useEffect(() => {
    if (!isAuthenticated) return;

    dashboardApi.getKpis().then(setKpis).catch(console.error);
    // The WebSocket only pushes NEW events from here on — without this,
    // the Alert Feed store starts empty on every reload and only fills
    // back up once a fresh alert happens to fire, making already-active
    // alerts appear to "disappear" on refresh.
    alertsApi.getActiveAlerts().then(useAlertStore.getState().setInitialAlerts).catch(console.error);
    connectWebSocket();

    return () => {
      disconnectWebSocket();
    };
  }, [isAuthenticated]);

  return (
    <div className="p-6 flex flex-col gap-6">
      <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-3">
        <h1 className="font-heading font-bold text-2xl uppercase tracking-wide text-text">Vue D'ensemble</h1>
        <AlertDeclareDialog />
      </div>

      {/* KPI Strip */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[
          { label: 'TRS', value: kpis?.trs_global_pct, suffix: '%' },
          { label: 'PRODUCTION', value: kpis?.production?.bottles, suffix: '' },
          { label: 'ALERTES', value: kpis?.active_alerts, suffix: '', alert: kpis?.critical_active_alerts > 0 },
          { label: 'COÛT/BTL', value: kpis?.cost_per_bottle, suffix: ' DT' },
        ].map(({ label, value, suffix, alert }) => (
          <div key={label} className="bg-panel border border-border rounded-md p-4">
            <div className="text-[11px] font-sans font-semibold tracking-widest text-text-dim uppercase">{label}</div>
            <div className={`font-mono text-3xl font-bold mt-2 ${alert ? 'text-red-500' : ''}`}>
              {value === undefined || value === null ? '--' : `${value}${suffix}`}
            </div>
          </div>
        ))}
      </div>

      {/* Andon Board + Alert Feed have their own fixed height (not
          flex-1-fill-remaining) so they render the same on every window
          size — a "fill whatever's left" height fought with the KPI strip
          and Stock/Planning rows below for space and could collapse to
          near-zero on a short or resized window. */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <AndonBoard />
        <AlertFeed />
      </div>

      {(canSeeStock || canSeePlanning) && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {canSeeStock && <StockSummary />}
          {canSeePlanning && <PlanningSummary />}
        </div>
      )}

      {canSeeStock && (
        <div className="grid grid-cols-1 gap-6">
          <MaterialsOverview />
        </div>
      )}
    </div>
  );
}
