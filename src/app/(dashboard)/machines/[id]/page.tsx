'use client';

import { use, useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { machinesApi } from '@/lib/api/machines';
import { alertsApi } from '@/lib/api/alerts';
import { Machine, MachineStatus, Alert, PaginatedResponse } from '@/lib/api/types';
import { useAlertStore } from '@/lib/store/useAlertStore';
import { useAuthStore } from '@/lib/store/useAuthStore';

const STATUSES: MachineStatus[] = ['RUNNING', 'STOPPED', 'MAINTENANCE', 'BREAKDOWN'];

export default function MachineDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const router = useRouter();
  const [machine, setMachine] = useState<Machine | null>(null);
  const [alerts, setAlerts] = useState<Alert[]>([]);
  const [isEditing, setIsEditing] = useState(false);
  const [editValues, setEditValues] = useState<Partial<Machine>>({});
  const machineStatus = useAlertStore((state) => state.machineStatus);
  const user = useAuthStore((state) => state.user);
  const canManage = user?.role === 'ADMIN' || user?.role === 'MANAGER';

  useEffect(() => {
    machinesApi.getMachineDetails(parseInt(id)).then(setMachine).catch(console.error);
    alertsApi.getAlerts({ machine: id }).then(res => setAlerts(res.results)).catch(console.error);
  }, [id]);

  if (!machine) return <div className="p-6 text-text-dim">Loading...</div>;

  const andonColor = machineStatus[machine.id] || machine.andon_status || 'GREEN';
  const andonStyle = andonColor === 'RED' ? 'bg-red-500 shadow-[0_0_20px_rgba(239,68,68,0.6)] animate-pulse' :
    andonColor === 'ORANGE' ? 'bg-orange-500 shadow-[0_0_15px_rgba(249,115,22,0.4)]' :
    'bg-green-500 shadow-[0_0_15px_rgba(34,197,94,0.3)]';

  const startEdit = () => {
    setEditValues({
      name: machine.name, location: machine.location, product_format: machine.product_format,
      nominal_bph: machine.nominal_bph, nominal_cph: machine.nominal_cph, cavities: machine.cavities,
    });
    setIsEditing(true);
  };

  const handleSaveEdit = async () => {
    try {
      const updated = await machinesApi.updateMachine(machine.id, editValues);
      setMachine(updated);
      setIsEditing(false);
    } catch (e) {
      console.error('Failed to update machine', e);
    }
  };

  const handleStatusChange = async (status: MachineStatus) => {
    try {
      const updated = await machinesApi.updateStatus(machine.id, status);
      setMachine(updated);
    } catch (e) {
      console.error('Failed to change status', e);
    }
  };

  const handleDelete = async () => {
    if (!confirm(`Supprimer définitivement la machine ${machine.name} (${machine.code}) ?`)) return;
    try {
      await machinesApi.deleteMachine(machine.id);
      router.push('/machines');
    } catch (e: any) {
      console.error('Failed to delete machine', e);
      let msg = 'Échec de la suppression.';
      try { msg = JSON.parse(e.message).detail || msg; } catch {}
      alert(msg);
    }
  };

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <div className={`w-6 h-6 rounded-full ${andonStyle}`} />
          <h1 className="font-heading font-bold text-2xl uppercase tracking-wide text-text">{machine.name}</h1>
          <span className="font-mono text-sm text-text-dim bg-bg px-3 py-1 rounded">{machine.code}</span>
        </div>
        {canManage && (
          <div className="flex gap-2">
            <button onClick={isEditing ? handleSaveEdit : startEdit}
              className="bg-cyan-500 hover:bg-cyan-600 text-white px-4 py-2 rounded text-sm font-medium transition-colors">
              {isEditing ? 'Enregistrer' : 'Modifier'}
            </button>
            {isEditing && (
              <button onClick={() => setIsEditing(false)}
                className="px-4 py-2 rounded text-sm text-text-dim hover:bg-panel-2 transition-colors">
                Annuler
              </button>
            )}
            <button onClick={handleDelete}
              className="bg-red-500/10 hover:bg-red-500/20 text-red-500 px-4 py-2 rounded text-sm font-medium transition-colors">
              Supprimer
            </button>
          </div>
        )}
      </div>

      {/* Details Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="bg-panel border border-border rounded-md p-6">
          <h2 className="text-sm font-semibold text-text-dim tracking-wider uppercase mb-4">Spécifications</h2>
          {isEditing ? (
            <div className="space-y-3">
              <div>
                <label className="block text-xs text-text-dim mb-1">Nom</label>
                <input type="text" value={editValues.name ?? ''} onChange={(e) => setEditValues(v => ({ ...v, name: e.target.value }))}
                  className="w-full bg-bg border border-border rounded p-2 text-sm text-text focus:outline-none focus:border-cyan-500" />
              </div>
              <div>
                <label className="block text-xs text-text-dim mb-1">Emplacement</label>
                <input type="text" value={editValues.location ?? ''} onChange={(e) => setEditValues(v => ({ ...v, location: e.target.value }))}
                  className="w-full bg-bg border border-border rounded p-2 text-sm text-text focus:outline-none focus:border-cyan-500" />
              </div>
              <div>
                <label className="block text-xs text-text-dim mb-1">Format produit</label>
                <input type="text" value={editValues.product_format ?? ''} onChange={(e) => setEditValues(v => ({ ...v, product_format: e.target.value }))}
                  className="w-full bg-bg border border-border rounded p-2 text-sm text-text focus:outline-none focus:border-cyan-500" />
              </div>
              <div>
                <label className="block text-xs text-text-dim mb-1">Cadence nominale ({machine.type === 'INJECTION' ? 'CPH' : 'BPH'})</label>
                <input type="number"
                  value={machine.type === 'INJECTION' ? (editValues.nominal_cph ?? 0) : (editValues.nominal_bph ?? 0)}
                  onChange={(e) => setEditValues(v => machine.type === 'INJECTION'
                    ? { ...v, nominal_cph: parseInt(e.target.value) || 0 }
                    : { ...v, nominal_bph: parseInt(e.target.value) || 0 })}
                  className="w-full bg-bg border border-border rounded p-2 text-sm text-text focus:outline-none focus:border-cyan-500" />
              </div>
              <div>
                <label className="block text-xs text-text-dim mb-1">Cavités</label>
                <input type="number" value={editValues.cavities ?? 0} onChange={(e) => setEditValues(v => ({ ...v, cavities: parseInt(e.target.value) || 0 }))}
                  className="w-full bg-bg border border-border rounded p-2 text-sm text-text focus:outline-none focus:border-cyan-500" />
              </div>
            </div>
          ) : (
            <div className="space-y-3">
              {[
                ['Type', machine.type],
                ['Cadence nominale', machine.type === 'INJECTION' ? `${machine.nominal_cph} CPH` : `${machine.nominal_bph} BPH`],
                ['Cavités', machine.cavities > 0 ? machine.cavities.toString() : 'N/A'],
                ['Format produit', machine.product_format || 'N/A'],
                ['Emplacement', machine.location || 'N/A'],
                ['ANDON', andonColor],
              ].map(([label, value]) => (
                <div key={label} className="flex justify-between py-1 border-b border-border/30">
                  <span className="text-sm text-text-dim">{label}</span>
                  <span className="font-mono text-sm text-text">{value}</span>
                </div>
              ))}
              <div className="flex justify-between items-center py-1">
                <span className="text-sm text-text-dim">Statut</span>
                {canManage ? (
                  <select value={machine.status} onChange={(e) => handleStatusChange(e.target.value as MachineStatus)}
                    className="bg-bg border border-border rounded p-1 text-xs font-mono text-text focus:outline-none focus:border-cyan-500">
                    {STATUSES.map(s => <option key={s} value={s}>{s}</option>)}
                  </select>
                ) : (
                  <span className="font-mono text-sm text-text">{machine.status}</span>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Recent Alerts for this machine */}
        <div className="bg-panel border border-border rounded-md p-6">
          <h2 className="text-sm font-semibold text-text-dim tracking-wider uppercase mb-4">Alertes récentes</h2>
          {alerts.length === 0 ? (
            <p className="text-sm text-text-dim">Aucune alerte pour cette machine.</p>
          ) : (
            <div className="space-y-2 max-h-[400px] overflow-auto">
              {alerts.slice(0, 10).map(alert => (
                <div key={alert.id} className="p-3 bg-panel-2 rounded border border-border/50">
                  <div className="flex justify-between items-start mb-1">
                    <span className="text-sm font-medium">{alert.title}</span>
                    <span className={`text-[10px] font-mono px-1.5 py-0.5 rounded ${
                      alert.severity === 'CRITICAL' ? 'bg-red-500/10 text-red-500' :
                      alert.severity === 'MAJOR' ? 'bg-orange-500/10 text-orange-500' :
                      'bg-yellow-500/10 text-yellow-500'
                    }`}>{alert.severity}</span>
                  </div>
                  <div className="flex justify-between text-xs text-text-dim">
                    <span>{alert.worker_name || alert.reported_by_name || 'Système'}</span>
                    <span className="font-mono">{alert.status} • {new Date(alert.created_at).toLocaleDateString()}</span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
