'use client';

import { useEffect, useState } from 'react';
import { maintenanceApi } from '@/lib/api/maintenance';
import { machinesApi } from '@/lib/api/machines';
import { usersApi } from '@/lib/api/users';
import { Intervention, PreventiveMaintenance, Machine, User, PmFrequency } from '@/lib/api/types';
import { useAuthStore } from '@/lib/store/useAuthStore';

const FREQUENCIES: PmFrequency[] = ['DAILY', 'WEEKLY', 'MONTHLY', 'QUARTERLY'];

export default function MaintenancePage() {
  const [tasks, setTasks] = useState<Intervention[]>([]);
  const [preventive, setPreventive] = useState<PreventiveMaintenance[]>([]);
  const [machines, setMachines] = useState<Machine[]>([]);
  const [technicians, setTechnicians] = useState<User[]>([]);
  const [tab, setTab] = useState<'curative' | 'preventive'>('curative');
  const user = useAuthStore((state) => state.user);
  const canManagePreventive = user?.role === 'ADMIN' || user?.role === 'MANAGER' || user?.role === 'MAINTENANCE';

  // New PM task form
  const [showPmForm, setShowPmForm] = useState(false);
  const [pmMachine, setPmMachine] = useState('');
  const [pmTask, setPmTask] = useState('');
  const [pmFrequency, setPmFrequency] = useState<PmFrequency>('MONTHLY');
  const [pmNextDue, setPmNextDue] = useState('');
  const [pmAssignedTo, setPmAssignedTo] = useState('');

  const refreshPreventive = () => maintenanceApi.getDuePreventive().then(setPreventive).catch(console.error);

  useEffect(() => {
    maintenanceApi.getQueue().then(setTasks).catch(console.error);
    refreshPreventive();
    machinesApi.getMachines().then(res => setMachines(res.results)).catch(console.error);
    usersApi.getUsers({ role: 'MAINTENANCE' }).then(res => setTechnicians(res.results)).catch(console.error);
  }, []);

  const handleCreatePm = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await maintenanceApi.createPreventive({
        machine: parseInt(pmMachine),
        task: pmTask,
        frequency: pmFrequency,
        next_due: pmNextDue,
        assigned_to: pmAssignedTo ? parseInt(pmAssignedTo) : undefined,
      });
      setPmMachine(''); setPmTask(''); setPmFrequency('MONTHLY'); setPmNextDue(''); setPmAssignedTo('');
      setShowPmForm(false);
      await refreshPreventive();
    } catch (e) {
      console.error('Failed to create preventive task', e);
    }
  };

  const handleMarkDone = async (pm: PreventiveMaintenance) => {
    try {
      await maintenanceApi.updatePreventive(pm.id, { status: 'DONE', last_done: new Date().toISOString().slice(0, 10) });
      await refreshPreventive();
    } catch (e) {
      console.error('Failed to mark preventive task done', e);
    }
  };

  const handleFinish = async (id: number) => {
    const action = prompt('Action prise pour résoudre le problème:');
    if (!action) return;
    try {
      const updated = await maintenanceApi.finishIntervention(id, { action_taken: action });
      setTasks(prev => prev.map(t => t.id === id ? updated : t));
    } catch (e) {
      console.error('Failed to finish', e);
    }
  };

  const handleVerify = async (id: number) => {
    try {
      const updated = await maintenanceApi.verifyIntervention(id);
      setTasks(prev => prev.map(t => t.id === id ? updated : t));
    } catch (e) {
      console.error('Failed to verify', e);
    }
  };

  return (
    <div className="p-6 space-y-6 h-full flex flex-col">
      <h1 className="font-heading font-bold text-2xl uppercase tracking-wide text-text">File de Maintenance</h1>

      {/* Tabs */}
      <div className="flex gap-1 bg-bg border border-border rounded-md p-1 w-fit">
        <button
          onClick={() => setTab('curative')}
          className={`px-4 py-2 rounded text-sm font-medium transition-colors ${tab === 'curative' ? 'bg-panel text-text shadow' : 'text-text-dim hover:text-text'}`}
        >
          Curative ({tasks.length})
        </button>
        <button
          onClick={() => setTab('preventive')}
          className={`px-4 py-2 rounded text-sm font-medium transition-colors ${tab === 'preventive' ? 'bg-panel text-text shadow' : 'text-text-dim hover:text-text'}`}
        >
          Préventive ({preventive.length})
        </button>
      </div>

      {tab === 'curative' && (
        <div className="bg-panel border border-border rounded-md flex-1 p-4 overflow-auto">
          {tasks.length === 0 ? (
            <div className="text-center py-12 text-text-dim">
              <p className="text-lg mb-2">🎉 Aucune tâche en attente</p>
              <p className="text-sm">Toutes les interventions sont terminées.</p>
            </div>
          ) : (
            <div className="space-y-3">
              {tasks.map(task => (
                <div key={task.id} className="bg-panel-2 border border-border rounded-md p-4 flex items-center justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <h3 className="font-sans text-sm font-medium">{task.alert_title || `Alert #${task.alert}`}</h3>
                      <span className="text-[10px] bg-bg px-2 py-0.5 rounded font-mono text-text-dim">
                        {task.machine_name}
                      </span>
                    </div>
                    <p className="text-xs text-text-dim">
                      Début: {new Date(task.started_at).toLocaleString()}
                      {task.finished_at && ` • Fin: ${new Date(task.finished_at).toLocaleString()}`}
                      {!!task.duration_min && ` • Durée: ${task.duration_min} min`}
                    </p>
                    {task.action_taken && (
                      <p className="text-xs text-text mt-2 bg-bg p-2 rounded">{task.action_taken}</p>
                    )}
                  </div>
                  <div className="flex gap-2 ml-4">
                    {!task.finished_at && (
                      <button
                        onClick={() => handleFinish(task.id)}
                        className="bg-green-500 hover:bg-green-600 text-white px-3 py-1.5 rounded text-xs font-medium transition-colors"
                      >
                        Terminer
                      </button>
                    )}
                    {task.finished_at && !task.verified && (
                      <button
                        onClick={() => handleVerify(task.id)}
                        className="bg-cyan-500 hover:bg-cyan-600 text-white px-3 py-1.5 rounded text-xs font-medium transition-colors"
                      >
                        ✓ Vérifier
                      </button>
                    )}
                    {task.verified && (
                      <span className="text-green-500 font-mono text-xs px-3 py-1.5">✓ VÉRIFIÉ</span>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {tab === 'preventive' && (
        <div className="bg-panel border border-border rounded-md flex-1 p-4 overflow-auto">
          {canManagePreventive && (
            <div className="flex justify-end mb-4">
              <button
                onClick={() => setShowPmForm(!showPmForm)}
                className="bg-cyan-500 hover:bg-cyan-600 text-white px-4 py-2 rounded text-sm font-medium transition-colors"
              >
                + Nouvelle tâche préventive
              </button>
            </div>
          )}

          {showPmForm && (
            <form onSubmit={handleCreatePm} className="bg-panel-2 border border-border rounded-md p-4 grid grid-cols-2 md:grid-cols-3 gap-4 mb-4">
              <div>
                <label className="block text-xs font-semibold text-text-dim uppercase mb-1">Machine *</label>
                <select value={pmMachine} onChange={(e) => setPmMachine(e.target.value)} required
                  className="w-full bg-bg border border-border rounded p-2 text-sm text-text focus:outline-none focus:border-cyan-500">
                  <option value="">Sélectionner...</option>
                  {machines.map(m => <option key={m.id} value={m.id}>{m.name} ({m.code})</option>)}
                </select>
              </div>
              <div>
                <label className="block text-xs font-semibold text-text-dim uppercase mb-1">Tâche *</label>
                <input type="text" value={pmTask} onChange={(e) => setPmTask(e.target.value)} required
                  className="w-full bg-bg border border-border rounded p-2 text-sm text-text focus:outline-none focus:border-cyan-500" />
              </div>
              <div>
                <label className="block text-xs font-semibold text-text-dim uppercase mb-1">Fréquence</label>
                <select value={pmFrequency} onChange={(e) => setPmFrequency(e.target.value as PmFrequency)}
                  className="w-full bg-bg border border-border rounded p-2 text-sm text-text focus:outline-none focus:border-cyan-500">
                  {FREQUENCIES.map(f => <option key={f} value={f}>{f}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-xs font-semibold text-text-dim uppercase mb-1">Échéance *</label>
                <input type="date" value={pmNextDue} onChange={(e) => setPmNextDue(e.target.value)} required
                  className="w-full bg-bg border border-border rounded p-2 text-sm text-text focus:outline-none focus:border-cyan-500" />
              </div>
              <div>
                <label className="block text-xs font-semibold text-text-dim uppercase mb-1">Assigné à</label>
                <select value={pmAssignedTo} onChange={(e) => setPmAssignedTo(e.target.value)}
                  className="w-full bg-bg border border-border rounded p-2 text-sm text-text focus:outline-none focus:border-cyan-500">
                  <option value="">— Non assigné —</option>
                  {technicians.map(t => <option key={t.id} value={t.id}>{t.first_name} {t.last_name}</option>)}
                </select>
              </div>
              <div className="col-span-full flex justify-end gap-3">
                <button type="button" onClick={() => setShowPmForm(false)} className="px-4 py-2 rounded text-sm text-text-dim hover:bg-panel transition-colors">
                  Annuler
                </button>
                <button type="submit" className="bg-cyan-500 hover:bg-cyan-600 text-white px-6 py-2 rounded text-sm font-medium transition-colors">
                  Créer
                </button>
              </div>
            </form>
          )}

          {preventive.length === 0 ? (
            <div className="text-center py-12 text-text-dim">
              <p className="text-lg mb-2">Aucune maintenance préventive en attente.</p>
            </div>
          ) : (
            <div className="space-y-3">
              {preventive.map(pm => {
                const statusColor = pm.status === 'OVERDUE' ? 'bg-red-500/10 text-red-500' :
                  pm.status === 'DUE' ? 'bg-orange-500/10 text-orange-500' :
                  pm.status === 'IN_PROGRESS' ? 'bg-blue-500/10 text-blue-500' :
                  'bg-green-500/10 text-green-500';
                return (
                  <div key={pm.id} className="bg-panel-2 border border-border rounded-md p-4">
                    <div className="flex justify-between items-start mb-2">
                      <div>
                        <h3 className="font-sans text-sm font-medium">{pm.task}</h3>
                        <p className="text-xs text-text-dim">{pm.machine_name} • {pm.frequency}</p>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className={`text-[10px] font-mono px-2 py-1 rounded ${statusColor}`}>{pm.status}</span>
                        {canManagePreventive && (
                          <button
                            onClick={() => handleMarkDone(pm)}
                            className="bg-green-500 hover:bg-green-600 text-white px-3 py-1 rounded text-xs font-medium transition-colors"
                          >
                            ✓ Terminé
                          </button>
                        )}
                      </div>
                    </div>
                    <div className="flex gap-4 text-xs text-text-dim">
                      <span>Échéance: {new Date(pm.next_due).toLocaleDateString()}</span>
                      {pm.last_done && <span>Dernier: {new Date(pm.last_done).toLocaleDateString()}</span>}
                      {pm.assigned_to_name && <span>Assigné à: {pm.assigned_to_name}</span>}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
