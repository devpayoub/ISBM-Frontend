'use client';

import { useEffect, useState } from 'react';
import { toast } from 'sonner';
import { maintenanceApi } from '@/lib/api/maintenance';
import { machinesApi } from '@/lib/api/machines';
import { usersApi } from '@/lib/api/users';
import { Intervention, PreventiveMaintenance, Machine, User, PmFrequency } from '@/lib/api/types';
import { useAuthStore } from '@/lib/store/useAuthStore';
import { errorMessage, parseFieldErrors } from '@/lib/api/errors';
import { Input } from '@/components/ui/input';

const FREQUENCIES: PmFrequency[] = ['DAILY', 'WEEKLY', 'MONTHLY', 'QUARTERLY'];

export default function MaintenancePage() {
  const [tasks, setTasks] = useState<Intervention[]>([]);
  const [day, setDay] = useState(() => new Date().toISOString().split('T')[0]);
  const [preventive, setPreventive] = useState<PreventiveMaintenance[]>([]);
  const [machines, setMachines] = useState<Machine[]>([]);
  const [technicians, setTechnicians] = useState<User[]>([]);
  const [tab, setTab] = useState<'curative' | 'preventive'>('curative');
  const user = useAuthStore((state) => state.user);
  const canManagePreventive = user?.role === 'ADMIN' || user?.role === 'MANAGER' || user?.role === 'MAINTENANCE';
  // Kept in sync with IsAdmin | IsAdminOrManager | IsController on
  // InterventionViewSet.verify in Backend/apps/maintenance/views.py.
  const canVerify = user?.role === 'ADMIN' || user?.role === 'MANAGER' || user?.role === 'CONTROLLER';

  // New/edit PM task form
  const [showPmForm, setShowPmForm] = useState(false);
  const [editingPmId, setEditingPmId] = useState<number | null>(null);
  const [pmMachine, setPmMachine] = useState('');
  const [pmTask, setPmTask] = useState('');
  const [pmFrequency, setPmFrequency] = useState<PmFrequency>('MONTHLY');
  const [pmNextDue, setPmNextDue] = useState('');
  const [pmAssignedTo, setPmAssignedTo] = useState('');
  const [pmErrors, setPmErrors] = useState<Record<string, string>>({});

  // "Terminer" modal (reason is optional)
  const [finishingId, setFinishingId] = useState<number | null>(null);
  const [finishReason, setFinishReason] = useState('');
  const [finishing, setFinishing] = useState(false);

  const refreshPreventive = () => maintenanceApi.getDuePreventive().then(setPreventive).catch(console.error);
  const refreshTasks = () => maintenanceApi.getByDay(day).then(setTasks).catch(console.error);

  useEffect(() => {
    machinesApi.getMachines().then(res => setMachines(res.results)).catch(console.error);
    usersApi.getUsers({ role: 'MAINTENANCE' }).then(res => setTechnicians(res.results)).catch(console.error);
  }, []);

  useEffect(() => {
    refreshTasks();
    refreshPreventive();
    // Maintenance doesn't have its own WebSocket feed (unlike Alertes), so
    // poll for new/updated tasks every 5s to surface freshly-declared
    // problems without a manual refresh.
    const interval = setInterval(() => {
      refreshTasks();
      refreshPreventive();
    }, 5000);
    return () => clearInterval(interval);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [day]);

  const resetPmForm = () => {
    setEditingPmId(null);
    setPmMachine(''); setPmTask(''); setPmFrequency('MONTHLY'); setPmNextDue(''); setPmAssignedTo('');
  };

  const startEditPm = (pm: PreventiveMaintenance) => {
    setEditingPmId(pm.id);
    setPmMachine(String(pm.machine));
    setPmTask(pm.task);
    setPmFrequency(pm.frequency);
    setPmNextDue(pm.next_due);
    setPmAssignedTo(pm.assigned_to ? String(pm.assigned_to) : '');
    setShowPmForm(true);
  };

  const handleSubmitPm = async (e: React.FormEvent) => {
    e.preventDefault();
    setPmErrors({});
    try {
      const payload = {
        machine: parseInt(pmMachine),
        task: pmTask,
        frequency: pmFrequency,
        next_due: pmNextDue,
        assigned_to: pmAssignedTo ? parseInt(pmAssignedTo) : undefined,
      };
      if (editingPmId) {
        await maintenanceApi.updatePreventive(editingPmId, payload);
        toast.success('Tâche préventive mise à jour.');
      } else {
        await maintenanceApi.createPreventive(payload);
        toast.success('Tâche préventive créée.');
      }
      resetPmForm();
      setShowPmForm(false);
      await refreshPreventive();
    } catch (e) {
      console.error('Failed to save preventive task', e);
      setPmErrors(parseFieldErrors(e));
      toast.error(errorMessage(e, "Échec de l'enregistrement de la tâche."));
    }
  };

  const handleMarkDone = async (pm: PreventiveMaintenance) => {
    try {
      await maintenanceApi.updatePreventive(pm.id, { status: 'DONE', last_done: new Date().toISOString().slice(0, 10) });
      await refreshPreventive();
      toast.success('Tâche marquée terminée.');
    } catch (e) {
      console.error('Failed to mark preventive task done', e);
      toast.error(errorMessage(e, 'Échec de la mise à jour.'));
    }
  };

  const openFinishModal = (id: number) => {
    setFinishingId(id);
    setFinishReason('');
  };

  const handleFinish = async (e: React.FormEvent) => {
    e.preventDefault();
    if (finishingId == null) return;
    setFinishing(true);
    try {
      const updated = await maintenanceApi.finishIntervention(finishingId, { action_taken: finishReason });
      setTasks(prev => prev.map(t => t.id === finishingId ? updated : t));
      toast.success('Intervention terminée.');
      setFinishingId(null);
    } catch (e) {
      console.error('Failed to finish', e);
      toast.error(errorMessage(e, "Échec de la clôture de l'intervention."));
    } finally {
      setFinishing(false);
    }
  };

  const handleVerify = async (id: number) => {
    try {
      const updated = await maintenanceApi.verifyIntervention(id);
      setTasks(prev => prev.map(t => t.id === id ? updated : t));
      toast.success('Intervention vérifiée.');
    } catch (e) {
      console.error('Failed to verify', e);
      toast.error(errorMessage(e, 'Échec de la vérification.'));
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
          <div className="flex justify-end mb-4">
            <input
              type="date"
              value={day}
              onChange={(e) => setDay(e.target.value)}
              className="bg-bg border border-border rounded px-3 py-2 text-sm font-mono text-text focus:outline-none focus:border-cyan-500"
            />
          </div>
          {tasks.length === 0 ? (
            <div className="text-center py-12 text-text-dim">
              <p className="text-lg mb-2">🎉 Aucune intervention ce jour-là</p>
              <p className="text-sm">Aucune tâche démarrée ou terminée à cette date.</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              {tasks.map(task => {
                const state = task.verified ? 'verified' : task.finished_at ? 'finished' : 'in_progress';
                const stateStyle = {
                  in_progress: { border: 'border-l-orange-500', badge: 'bg-orange-500/10 text-orange-500', label: 'En cours' },
                  finished: { border: 'border-l-blue-500', badge: 'bg-blue-500/10 text-blue-500', label: 'Terminée' },
                  verified: { border: 'border-l-green-500', badge: 'bg-green-500/10 text-green-500', label: 'Vérifiée' },
                }[state];
                return (
                  <div key={task.id} className={`bg-panel-2 border border-border border-l-4 ${stateStyle.border} rounded-md p-4 flex flex-col gap-3`}>
                    <div className="flex justify-between items-start gap-2">
                      <div>
                        <h3 className="font-sans text-sm font-semibold">{task.alert_title || `Alerte #${task.alert}`}</h3>
                        <span className="text-[10px] font-mono text-text-dim">{task.machine_name}</span>
                      </div>
                      <span className={`text-[10px] font-mono px-2 py-0.5 rounded whitespace-nowrap ${stateStyle.badge}`}>
                        {stateStyle.label}
                      </span>
                    </div>

                    <div className="grid grid-cols-3 gap-2 text-xs bg-bg rounded p-2">
                      <div>
                        <div className="text-text-dim text-[10px] uppercase">Début</div>
                        <div className="font-mono">{new Date(task.started_at).toLocaleString()}</div>
                      </div>
                      <div>
                        <div className="text-text-dim text-[10px] uppercase">Fin</div>
                        <div className="font-mono">{task.finished_at ? new Date(task.finished_at).toLocaleString() : '—'}</div>
                      </div>
                      <div>
                        <div className="text-text-dim text-[10px] uppercase">Durée</div>
                        <div className="font-mono">{task.duration_min ? `${task.duration_min} min` : '—'}</div>
                      </div>
                    </div>

                    {task.reported_by_name && (
                      <div className="text-xs text-text-dim">Déclaré par : <span className="text-text">{task.reported_by_name}</span></div>
                    )}

                    {task.technician_name && (
                      <div className="text-xs text-text-dim">Technicien : <span className="text-text">{task.technician_name}</span></div>
                    )}

                    {task.action_taken && (
                      <p className="text-xs text-text bg-bg p-2 rounded border border-border/50">{task.action_taken}</p>
                    )}

                    <div className="flex gap-2 justify-end pt-1 border-t border-border/50">
                      {!task.finished_at && (
                        <button
                          onClick={() => openFinishModal(task.id)}
                          className="bg-green-500 hover:bg-green-600 text-white px-3 py-1.5 rounded text-xs font-medium transition-colors"
                        >
                          Terminer
                        </button>
                      )}
                      {task.finished_at && !task.verified && canVerify && (
                        <button
                          onClick={() => handleVerify(task.id)}
                          className="bg-cyan-500 hover:bg-cyan-600 text-white px-3 py-1.5 rounded text-xs font-medium transition-colors"
                        >
                          ✓ Vérifier
                        </button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {finishingId != null && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
          <div className="bg-panel border border-border rounded-lg shadow-xl w-full max-w-md overflow-hidden">
            <div className="bg-green-500/10 border-b border-green-500/20 p-4">
              <h2 className="font-heading font-bold text-lg text-text">Terminer l'intervention</h2>
              <p className="text-xs text-text-dim mt-1">Précisez l'action prise (facultatif).</p>
            </div>
            <form onSubmit={handleFinish} className="p-6 space-y-4">
              <div>
                <label className="block text-xs font-semibold text-text-dim uppercase mb-1">Action prise</label>
                <textarea
                  rows={3}
                  value={finishReason}
                  onChange={(e) => setFinishReason(e.target.value)}
                  placeholder="Ex : Remplacement du roulement, réglage de la tension de la courroie..."
                  className="w-full bg-bg border border-border rounded p-2 text-sm text-text focus:outline-none focus:border-cyan-500"
                />
              </div>
              <div className="flex justify-end gap-3 pt-2 border-t border-border">
                <button type="button" onClick={() => setFinishingId(null)} className="px-4 py-2 rounded text-sm text-text-dim hover:bg-panel-2 transition-colors">
                  Annuler
                </button>
                <button type="submit" disabled={finishing} className="bg-green-500 hover:bg-green-600 disabled:opacity-50 text-white px-6 py-2 rounded text-sm font-medium transition-colors">
                  {finishing ? 'Enregistrement...' : 'Terminer'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {tab === 'preventive' && (
        <div className="bg-panel border border-border rounded-md flex-1 p-4 overflow-auto">
          {canManagePreventive && (
            <div className="flex justify-end mb-4">
              <button
                onClick={() => { if (showPmForm) { setShowPmForm(false); resetPmForm(); } else { resetPmForm(); setShowPmForm(true); } }}
                className="bg-cyan-500 hover:bg-cyan-600 text-white px-4 py-2 rounded text-sm font-medium transition-colors"
              >
                + Nouvelle tâche préventive
              </button>
            </div>
          )}

          {showPmForm && (
            <form onSubmit={handleSubmitPm} className="bg-panel-2 border border-border rounded-md p-4 grid grid-cols-2 md:grid-cols-3 gap-4 mb-4">
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
                <Input type="text" value={pmTask} onChange={(e) => setPmTask(e.target.value)} required error={pmErrors.task} />
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
                <button type="button" onClick={() => { setShowPmForm(false); resetPmForm(); }} className="px-4 py-2 rounded text-sm text-text-dim hover:bg-panel transition-colors">
                  Annuler
                </button>
                <button type="submit" className="bg-cyan-500 hover:bg-cyan-600 text-white px-6 py-2 rounded text-sm font-medium transition-colors">
                  {editingPmId ? 'Enregistrer' : 'Créer'}
                </button>
              </div>
            </form>
          )}

          {preventive.length === 0 ? (
            <div className="text-center py-12 text-text-dim">
              <p className="text-lg mb-2">Aucune maintenance préventive en attente.</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              {preventive.map(pm => {
                const style = {
                  OVERDUE: { border: 'border-l-red-500', badge: 'bg-red-500/10 text-red-500' },
                  DUE: { border: 'border-l-orange-500', badge: 'bg-orange-500/10 text-orange-500' },
                  IN_PROGRESS: { border: 'border-l-blue-500', badge: 'bg-blue-500/10 text-blue-500' },
                  DONE: { border: 'border-l-green-500', badge: 'bg-green-500/10 text-green-500' },
                }[pm.status];
                return (
                  <div key={pm.id} className={`bg-panel-2 border border-border border-l-4 ${style.border} rounded-md p-4 flex flex-col gap-3`}>
                    <div className="flex justify-between items-start gap-2">
                      <div>
                        <h3 className="font-sans text-sm font-semibold">{pm.task}</h3>
                        <span className="text-[10px] font-mono text-text-dim">{pm.machine_name} • {pm.frequency}</span>
                      </div>
                      <span className={`text-[10px] font-mono px-2 py-0.5 rounded whitespace-nowrap ${style.badge}`}>{pm.status}</span>
                    </div>

                    <div className="grid grid-cols-2 gap-2 text-xs bg-bg rounded p-2">
                      <div>
                        <div className="text-text-dim text-[10px] uppercase">Échéance</div>
                        <div className="font-mono">{new Date(pm.next_due).toLocaleDateString()}</div>
                      </div>
                      <div>
                        <div className="text-text-dim text-[10px] uppercase">Dernier</div>
                        <div className="font-mono">{pm.last_done ? new Date(pm.last_done).toLocaleDateString() : '—'}</div>
                      </div>
                    </div>

                    {pm.assigned_to_name && (
                      <div className="text-xs text-text-dim">Assigné à : <span className="text-text">{pm.assigned_to_name}</span></div>
                    )}

                    {canManagePreventive && (
                      <div className="flex gap-2 justify-end pt-1 border-t border-border/50">
                        <button
                          onClick={() => startEditPm(pm)}
                          className="text-cyan-500 hover:text-cyan-400 text-xs font-medium px-2"
                        >
                          Modifier
                        </button>
                        <button
                          onClick={() => handleMarkDone(pm)}
                          className="bg-green-500 hover:bg-green-600 text-white px-3 py-1.5 rounded text-xs font-medium transition-colors"
                        >
                          ✓ Terminé
                        </button>
                      </div>
                    )}
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
