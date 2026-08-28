'use client';

import { useState } from 'react';
import Link from 'next/link';
import { toast } from 'sonner';
import { machinesApi } from '@/lib/api/machines';
import { Machine, MachineStatus } from '@/lib/api/types';
import { useAlertStore } from '@/lib/store/useAlertStore';
import { useAuthStore } from '@/lib/store/useAuthStore';
import { errorMessage } from '@/lib/api/errors';

const STATUS_OPTIONS: MachineStatus[] = ['RUNNING', 'STOPPED', 'MAINTENANCE', 'BREAKDOWN'];

const getAndonDot = (color: string) => {
  switch (color) {
    case 'RED': return 'bg-red-500 shadow-[0_0_12px_rgba(239,68,68,0.8)] animate-pulse';
    case 'ORANGE': return 'bg-orange-500 shadow-[0_0_8px_rgba(249,115,22,0.5)]';
    case 'GREEN': return 'bg-green-500 shadow-[0_0_8px_rgba(34,197,94,0.4)]';
    default: return 'bg-gray-500';
  }
};

const getStatusBadge = (status: string) => {
  switch (status) {
    case 'RUNNING': return 'bg-green-500/10 text-green-500';
    case 'STOPPED': return 'bg-gray-500/10 text-gray-400';
    case 'MAINTENANCE': return 'bg-orange-500/10 text-orange-500';
    case 'BREAKDOWN': return 'bg-red-500/10 text-red-500';
    default: return 'bg-gray-500/10 text-gray-400';
  }
};

/** The single machine-card design used everywhere a machine list is shown
 * (Parc Machines page, Dashboard overview) — one definition, no duplicated
 * Andon-dot/status/equipment logic between the two. */
export function MachineCard({ machine, onChanged }: { machine: Machine; onChanged?: () => void }) {
  const [statusUpdating, setStatusUpdating] = useState(false);
  const machineStatus = useAlertStore((state) => state.machineStatus);
  const liveAlerts = useAlertStore((state) => state.liveAlerts);
  const user = useAuthStore((state) => state.user);
  const canManage = user?.role === 'ADMIN' || user?.role === 'MANAGER';
  const canOpenAlert = user?.role === 'ADMIN' || user?.role === 'MANAGER' || user?.role === 'CONTROLLER';

  const machineAlerts = liveAlerts.filter((a) => a.machine === machine.id);
  const topAlert = machineAlerts[0];
  const andonColor = machineStatus[machine.id] || machine.andon_status || 'GREEN';
  const equipmentBorder = machine.equipment_status === 'WARNING' ? 'border-l-4 border-l-orange-500' : 'border-l-4 border-l-green-500';

  const handleStatusChange = async (status: MachineStatus) => {
    setStatusUpdating(true);
    try {
      await machinesApi.updateStatus(machine.id, status);
      toast.success(`${machine.name} → ${status}`);
      onChanged?.();
    } catch (err) {
      toast.error(errorMessage(err, 'Échec du changement de statut.'));
    } finally {
      setStatusUpdating(false);
    }
  };

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
            {canManage ? (
              <select
                value={machine.status}
                disabled={statusUpdating}
                onChange={(e) => handleStatusChange(e.target.value as MachineStatus)}
                onClick={(e) => e.stopPropagation()}
                className={`text-[10px] font-mono px-1.5 py-0.5 rounded border-0 focus:outline-none focus:ring-1 focus:ring-cyan-500 disabled:opacity-50 ${getStatusBadge(machine.status)}`}
              >
                {STATUS_OPTIONS.map((s) => <option key={s} value={s}>{s}</option>)}
              </select>
            ) : (
              <span className={`text-[10px] font-mono px-2 py-0.5 rounded ${getStatusBadge(machine.status)}`}>
                {machine.status}
              </span>
            )}
          </div>
          <div className="flex items-center justify-between mt-2 text-xs text-text-dim">
            <span>Équipements: <span className="font-mono text-text">{machine.component_count}</span></span>
            <span className={`font-mono px-1.5 py-0.5 rounded text-[10px] ${machine.equipment_status === 'WARNING' ? 'bg-orange-500/10 text-orange-500' : 'bg-green-500/10 text-green-500'}`}>
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
