'use client';

import Link from 'next/link';
import { Machine } from '@/lib/api/types';
import { useAlertStore } from '@/lib/store/useAlertStore';
import { useAuthStore } from '@/lib/store/useAuthStore';

const getAndonDot = (color: string) => {
  switch (color) {
    case 'RED': return 'bg-red-500 shadow-[0_0_12px_rgba(239,68,68,0.8)] animate-pulse';
    case 'ORANGE': return 'bg-orange-500 shadow-[0_0_8px_rgba(249,115,22,0.5)]';
    case 'GREEN': return 'bg-green-500 shadow-[0_0_8px_rgba(34,197,94,0.4)]';
    default: return 'bg-gray-500';
  }
};

const ANDON_BADGE: Record<string, string> = {
  RED: 'bg-red-500/10 text-red-500',
  ORANGE: 'bg-orange-500/10 text-orange-500',
  GREEN: 'bg-green-500/10 text-green-500',
};
const ANDON_LABEL: Record<string, string> = { RED: 'ERREUR', ORANGE: 'AVERTISSEMENT', GREEN: 'OK' };

const equipmentBadge = (status: 'OK' | 'WARNING') =>
  status === 'WARNING' ? 'bg-orange-500/10 text-orange-500' : 'bg-green-500/10 text-green-500';

/** The machine-card design shared by the Parc Machines page and the
 * Dashboard's Machines widget. `status` is always read-only here — it's
 * set exclusively by apps.alerts.services.sync_machine_andon_status when a
 * Controller declares/resolves an alert, never by hand from the UI.
 * `variant="compact"` (Dashboard) shows only name/code/équipements. */
export function MachineCard({ machine, variant = 'full' }: { machine: Machine; variant?: 'full' | 'compact' }) {
  const machineStatus = useAlertStore((state) => state.machineStatus);
  const liveAlerts = useAlertStore((state) => state.liveAlerts);
  const user = useAuthStore((state) => state.user);
  const canOpenAlert = user?.role === 'ADMIN' || user?.role === 'MANAGER' || user?.role === 'CONTROLLER';

  const machineAlerts = liveAlerts.filter((a) => a.machine === machine.id);
  const topAlert = machineAlerts[0];
  const andonColor = machineStatus[machine.id] || machine.andon_status || 'GREEN';
  const equipmentBorder = machine.equipment_status === 'WARNING' ? 'border-l-4 border-l-orange-500' : 'border-l-4 border-l-green-500';

  if (variant === 'compact') {
    return (
      <Link href={`/machines/${machine.id}`}
        className={`block bg-panel border rounded-md p-4 transition-colors ${equipmentBorder} border-border hover:border-cyan-500/50`}>
        <div className="flex items-center justify-between gap-2">
          <div className="min-w-0">
            <h2 className="font-heading font-bold text-base truncate">{machine.name}</h2>
            <span className="font-mono text-xs text-text-dim">{machine.code}</span>
          </div>
          <span className={`text-[10px] font-mono px-1.5 py-0.5 rounded shrink-0 ${equipmentBadge(machine.equipment_status)}`}>
            {machine.equipment_status === 'WARNING' ? 'Avertissement' : 'OK'}
          </span>
        </div>
        <div className="text-xs text-text-dim mt-2">Équipements: <span className="font-mono text-text">{machine.component_count}</span></div>
      </Link>
    );
  }

  return (
    <div className={`bg-panel border rounded-md overflow-hidden transition-colors group ${equipmentBorder} ${topAlert ? 'border-red-500/50' : 'border-border hover:border-cyan-500/50'}`}>
      {topAlert && (
        canOpenAlert ? (
          <Link href={`/alerts/${topAlert.id}`} className="flex items-center justify-between gap-2 bg-red-500/10 border-b border-red-500/30 px-4 py-2 text-xs hover:bg-red-500/15 transition-colors">
            <span className="text-red-400 font-medium truncate">⚠ {topAlert.title}</span>
            {machineAlerts.length > 1 && <span className="text-red-400/70 font-mono shrink-0">+{machineAlerts.length - 1}</span>}
          </Link>
        ) : (
          <div className="flex items-center justify-between gap-2 bg-red-500/10 border-b border-red-500/30 px-4 py-2 text-xs">
            <span className="text-red-400 font-medium truncate">⚠ {topAlert.title}</span>
            {machineAlerts.length > 1 && <span className="text-red-400/70 font-mono shrink-0">+{machineAlerts.length - 1}</span>}
          </div>
        )
      )}
      <div className="p-6">
        <div className="mb-4">
          <Link href={`/machines/${machine.id}`}>
            <h2 className="font-heading font-bold text-xl group-hover:text-cyan-400 transition-colors">{machine.name}</h2>
            <span className="font-mono text-xs text-text-dim">{machine.code}</span>
          </Link>
          <div className="flex items-center gap-2 mt-2">
            <div className={`w-3 h-3 rounded-full shrink-0 ${getAndonDot(andonColor)}`} />
            <span className={`text-[10px] font-mono px-2 py-0.5 rounded ${ANDON_BADGE[andonColor] ?? ANDON_BADGE.GREEN}`} title="Automatique — déterminé par les alertes actives sur cette machine.">
              {ANDON_LABEL[andonColor] ?? 'OK'}
            </span>
          </div>
          <div className="flex items-center justify-between mt-2 text-xs text-text-dim">
            <span>Équipements: <span className="font-mono text-text">{machine.component_count}</span></span>
            <span className={`font-mono px-1.5 py-0.5 rounded text-[10px] ${equipmentBadge(machine.equipment_status)}`}>
              {machine.equipment_status === 'WARNING' ? 'Avertissement' : 'OK'}
            </span>
          </div>
        </div>

        <Link href={`/machines/${machine.id}`} className="block space-y-2 text-sm text-text-dim">
          <div className="flex justify-between">
            <span>Type</span>
            <span className="font-mono text-text">{machine.type}</span>
          </div>
          <div className="flex justify-between">
            <span>Cadence nominale</span>
            <span className="font-mono text-text">
              {machine.type === 'INJECTION' ? `${machine.nominal_cph} CPH` : `${machine.nominal_bph} BPH`}
            </span>
          </div>
          {machine.cavities > 0 && (
            <div className="flex justify-between">
              <span>Cavités</span>
              <span className="font-mono text-text">{machine.cavities}</span>
            </div>
          )}
          {machine.product_format && (
            <div className="flex justify-between">
              <span>Format</span>
              <span className="font-mono text-text">{machine.product_format}</span>
            </div>
          )}
        </Link>
      </div>
    </div>
  );
}
