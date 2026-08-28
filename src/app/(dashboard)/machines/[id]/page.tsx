'use client';

import { use, useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import { machinesApi } from '@/lib/api/machines';
import { alertsApi } from '@/lib/api/alerts';
import { maintenanceApi } from '@/lib/api/maintenance';
import {
  Machine, Alert, MachineComponent, MachineParameter, MaintenanceControl,
  PreventiveMaintenance, PmStatus,
} from '@/lib/api/types';
import { useAlertStore } from '@/lib/store/useAlertStore';
import { useAuthStore } from '@/lib/store/useAuthStore';
import { errorMessage, parseFieldErrors } from '@/lib/api/errors';
import { BackButton } from '@/components/ui/back-button';
import { Input } from '@/components/ui/input';
import { EquipmentCrudSection } from '@/components/machines/EquipmentCrudSection';
import { ChecklistPanel, SHIFT_LABELS } from '@/components/maintenance/ChecklistPanel';

type Tab = 'overview' | 'components' | 'molds' | 'maintenance' | 'controls';

const PM_STATUS_BADGE: Record<PmStatus, string> = {
  DUE: 'bg-cyan-500/10 text-cyan-400',
  IN_PROGRESS: 'bg-orange-500/10 text-orange-500',
  DONE: 'bg-green-500/10 text-green-500',
  OVERDUE: 'bg-red-500/10 text-red-500',
};

export default function MachineDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const machineId = parseInt(id);
  const router = useRouter();
  const [machine, setMachine] = useState<Machine | null>(null);
  const [alerts, setAlerts] = useState<Alert[]>([]);
  const [isEditing, setIsEditing] = useState(false);
  const [editValues, setEditValues] = useState<Partial<Machine>>({});
  const [tab, setTab] = useState<Tab>('overview');
  const machineStatus = useAlertStore((state) => state.machineStatus);
  const user = useAuthStore((state) => state.user);
  const canManage = user?.role === 'ADMIN' || user?.role === 'MANAGER';

  useEffect(() => {
    machinesApi.getMachineDetails(machineId).then(setMachine).catch(console.error);
    alertsApi.getAlerts({ machine: id }).then(res => setAlerts(res.results)).catch(console.error);
  }, [id, machineId]);

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
      toast.success('Machine mise à jour.');
    } catch (e) {
      console.error('Failed to update machine', e);
      toast.error(errorMessage(e, 'Échec de la mise à jour de la machine.'));
    }
  };

  const handleDelete = async () => {
    if (!confirm(`Supprimer définitivement la machine ${machine.name} (${machine.code}) ?`)) return;
    try {
      await machinesApi.deleteMachine(machine.id);
      router.push('/machines');
      toast.success('Machine supprimée.');
    } catch (e) {
      console.error('Failed to delete machine', e);
      toast.error(errorMessage(e, 'Échec de la suppression.'));
    }
  };

  const TABS: { key: Tab; label: string }[] = [
    { key: 'overview', label: "Vue d'ensemble" },
    { key: 'components', label: 'Équipements' },
    { key: 'molds', label: 'Moules' },
    { key: 'maintenance', label: 'Maintenance préventive' },
    { key: 'controls', label: 'Contrôle préventif' },
  ];

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div className="flex items-center gap-3 flex-wrap min-w-0">
          <BackButton fallbackHref="/machines" />
          <div className={`w-6 h-6 rounded-full shrink-0 ${andonStyle}`} />
          <h1 className="font-heading font-bold text-xl sm:text-2xl uppercase tracking-wide text-text break-words">{machine.name}</h1>
          <span className="font-mono text-sm text-text-dim bg-bg px-3 py-1 rounded shrink-0">{machine.code}</span>
        </div>
        {canManage && tab === 'overview' && (
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

      {/* Tabs */}
      <div className="flex gap-1 bg-bg border border-border rounded-md p-1 max-w-full overflow-x-auto">
        {TABS.map((t) => (
          <button
            key={t.key}
            onClick={() => setTab(t.key)}
            className={`px-4 py-2 rounded text-sm font-medium transition-colors whitespace-nowrap ${tab === t.key ? 'bg-panel text-text shadow' : 'text-text-dim hover:text-text'}`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {tab === 'overview' && (
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
                  <span className="font-mono text-sm text-text" title="Automatique — déterminé par les alertes actives sur cette machine.">
                    {machine.status}
                  </span>
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
      )}

      {tab === 'components' && <EquipmentGridSection machine={machine} canManage={canManage} />}

      {tab === 'molds' && (
        <EquipmentCrudSection
          title="Moules"
          itemLabel="Moule"
          machineId={machine.id}
          canManage={canManage}
          list={(id) => machinesApi.getMolds(id)}
          create={(data) => machinesApi.createMold(data)}
          update={(id, data) => machinesApi.updateMold(id, data)}
          remove={(id) => machinesApi.deleteMold(id)}
          emptyReferenceHint="référence à configurer si absente du plan source"
        />
      )}

      {tab === 'maintenance' && <MaintenanceSummarySection machineId={machine.id} />}

      {tab === 'controls' && <ControlsSection machineId={machine.id} />}
    </div>
  );
}

const STATUS_BADGE: Record<'OK' | 'WARNING', string> = {
  OK: 'bg-green-500/10 text-green-500',
  WARNING: 'bg-orange-500/10 text-orange-500',
};
const STATUS_LABEL: Record<'OK' | 'WARNING', string> = { OK: 'Normal', WARNING: 'Avertissement' };
// Same Andon dot + colored-left-border language as the /machines list page's
// getAndonDot, so a component's health reads the same way at a glance.
const STATUS_DOT: Record<'OK' | 'WARNING', string> = {
  OK: 'bg-green-500 shadow-[0_0_8px_rgba(34,197,94,0.4)]',
  WARNING: 'bg-orange-500 shadow-[0_0_8px_rgba(249,115,22,0.5)]',
};
const STATUS_BORDER: Record<'OK' | 'WARNING', string> = {
  OK: 'border-l-4 border-l-green-500',
  WARNING: 'border-l-4 border-l-orange-500',
};

/** Card-grid drill-down replacing the old plain "Composants" table: one card
 * for the machine's own directly-attached parameters (Zone Vis, pressures...)
 * plus one card per MachineComponent (Dryer, Chiller, Hot Runner...), each
 * showing a live component/parameter-derived status and linking to its own
 * Fiche Technique page. Admin add/edit/delete of components stays inline. */
function EquipmentGridSection({ machine, canManage }: { machine: Machine; canManage: boolean }) {
  const [components, setComponents] = useState<MachineComponent[]>([]);
  const [ownParams, setOwnParams] = useState<MachineParameter[]>([]);
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [name, setName] = useState('');
  const [reference, setReference] = useState('');
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);

  const refresh = () => {
    machinesApi.getComponents(machine.id).then((res) => setComponents(res.results)).catch(console.error);
    machinesApi.getMachineParameters({ machine: machine.id }).then((res) => setOwnParams(res.results)).catch(console.error);
  };

  useEffect(refresh, [machine.id]);

  const ownStatus: 'OK' | 'WARNING' = ownParams.some((p) => p.status === 'WARNING') ? 'WARNING' : 'OK';

  const resetForm = () => { setEditingId(null); setName(''); setReference(''); setFieldErrors({}); };
  const startCreate = () => { resetForm(); setShowForm(true); };
  const startEdit = (c: MachineComponent) => {
    setEditingId(c.id); setName(c.name); setReference(c.reference || ''); setFieldErrors({}); setShowForm(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setFieldErrors({});
    try {
      if (editingId) {
        await machinesApi.updateComponent(editingId, { name, reference });
        toast.success('Équipement mis à jour.');
      } else {
        await machinesApi.createComponent({ machine: machine.id, name, reference });
        toast.success('Équipement créé.');
      }
      resetForm();
      setShowForm(false);
      refresh();
    } catch (err) {
      console.error('Failed to save machine component', err);
      setFieldErrors(parseFieldErrors(err));
      toast.error(errorMessage(err, "Échec de l'enregistrement."));
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = async (c: MachineComponent) => {
    if (!confirm(`Supprimer "${c.name}" ?`)) return;
    try {
      await machinesApi.deleteComponent(c.id);
      refresh();
      toast.success('Équipement supprimé.');
    } catch (err) {
      console.error('Failed to delete machine component', err);
      toast.error(errorMessage(err, 'Échec de la suppression.'));
    }
  };

  return (
    <div className="space-y-4">
      {canManage && (
        <div className="flex justify-end">
          <button onClick={startCreate} className="bg-cyan-500 hover:bg-cyan-600 text-white px-4 py-2 rounded text-sm font-medium transition-colors">
            + Ajouter équipement
          </button>
        </div>
      )}

      {showForm && canManage && (
        <form onSubmit={handleSubmit} className="bg-panel-2 border border-border rounded-md p-4 grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div>
            <label className="block text-xs font-semibold text-text-dim uppercase mb-1">Nom *</label>
            <Input type="text" value={name} onChange={(e) => setName(e.target.value)} required error={fieldErrors.name} />
          </div>
          <div>
            <label className="block text-xs font-semibold text-text-dim uppercase mb-1">Référence</label>
            <Input type="text" value={reference} onChange={(e) => setReference(e.target.value)} error={fieldErrors.reference} />
          </div>
          <div className="col-span-full flex justify-end gap-3">
            <button type="button" onClick={() => { setShowForm(false); resetForm(); }} className="px-4 py-2 rounded text-sm text-text-dim hover:bg-panel transition-colors">
              Annuler
            </button>
            <button type="submit" disabled={isSubmitting} className="bg-cyan-500 hover:bg-cyan-600 disabled:opacity-50 text-white px-6 py-2 rounded text-sm font-medium transition-colors">
              {isSubmitting ? 'Enregistrement...' : editingId ? 'Enregistrer' : 'Créer'}
            </button>
          </div>
        </form>
      )}

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        <Link href={`/machines/${machine.id}/equipment/machine`}
          className={`block bg-panel border rounded-md p-4 border-border hover:border-cyan-500/50 transition-colors ${STATUS_BORDER[ownStatus]}`}>
          <div className="flex items-center gap-2 mb-1">
            <div className={`w-3 h-3 rounded-full shrink-0 ${STATUS_DOT[ownStatus]}`} />
            <div className="font-semibold text-text">Machine {machine.name}</div>
          </div>
          <div className="text-xs text-text-dim mb-3">{ownParams.length} Paramètres Mesurés</div>
          <span className={`text-[10px] font-mono px-1.5 py-0.5 rounded ${STATUS_BADGE[ownStatus]}`}>{STATUS_LABEL[ownStatus]}</span>
        </Link>

        {components.map((c) => (
          <div key={c.id} className={`bg-panel border rounded-md p-4 border-border hover:border-cyan-500/50 transition-colors ${STATUS_BORDER[c.status]}`}>
            <Link href={`/machines/${machine.id}/equipment/${c.id}`} className="block">
              <div className="flex items-center gap-2 mb-1">
                <div className={`w-3 h-3 rounded-full shrink-0 ${STATUS_DOT[c.status]}`} />
                <div className="font-semibold text-text">{c.name}</div>
              </div>
              <div className="text-xs text-text-dim mb-3">{c.parameter_count} Paramètres Mesurés</div>
              <span className={`text-[10px] font-mono px-1.5 py-0.5 rounded ${STATUS_BADGE[c.status]}`}>{STATUS_LABEL[c.status]}</span>
            </Link>
            {canManage && (
              <div className="flex gap-3 mt-3 pt-3 border-t border-border/50">
                <button onClick={() => startEdit(c)} className="text-cyan-500 hover:text-cyan-400 text-xs font-medium">Modifier</button>
                <button onClick={() => handleDelete(c)} className="text-red-500 hover:text-red-400 text-xs font-medium">Supprimer</button>
              </div>
            )}
          </div>
        ))}
      </div>

      {components.length === 0 && (
        <p className="text-sm text-text-dim">Aucun équipement pour cette machine.</p>
      )}
    </div>
  );
}

/** Contrôle préventif history for this machine — who ran each control and
 * when, reusing the same MaintenanceControl data the Controller's /control
 * page writes to (read-only here). */
/** Same list + detail design as the standalone /control page's history/
 * supervisor views (reuses the shared ChecklistPanel) — just pre-scoped to
 * this machine, and always read-only since Admin/Manager only browse here. */
function ControlsSection({ machineId }: { machineId: number }) {
  const [date, setDate] = useState('');
  const [controls, setControls] = useState<MaintenanceControl[]>([]);
  const [selected, setSelected] = useState<MaintenanceControl | null>(null);

  const refresh = () => {
    const params: Record<string, string> = { machine: String(machineId) };
    if (date) params.date = date;
    maintenanceApi.getControls(params).then((res) => setControls(res.results)).catch(console.error);
  };

  useEffect(refresh, [machineId, date]);

  return (
    <div className="grid grid-cols-1 lg:grid-cols-[320px_1fr] gap-6 items-start">
      <div className="space-y-4">
        <div className="bg-panel border border-border rounded-md p-4">
          <label className="block text-xs font-semibold text-text-dim uppercase mb-1">Date</label>
          <input type="date" value={date} onChange={(e) => setDate(e.target.value)}
            className="w-full bg-bg border border-border rounded p-2 text-sm text-text focus:outline-none focus:border-cyan-500" />
        </div>

        <div className="bg-panel border border-border rounded-md p-4">
          {controls.length === 0 ? (
            <p className="text-sm text-text-dim">Aucun contrôle préventif enregistré pour cette machine.</p>
          ) : (
            <div className="space-y-1 max-h-[560px] overflow-auto">
              {controls.map((c) => (
                <button key={c.id} onClick={() => setSelected(c)}
                  className={`w-full text-left p-3 rounded border transition-colors ${
                    selected?.id === c.id ? 'bg-panel-2 border-cyan-500' : 'border-border/50 hover:bg-panel-2/50'
                  }`}>
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-sm font-medium text-text">{c.template_name}</span>
                    <span className={`text-[10px] font-mono px-1.5 py-0.5 rounded shrink-0 ${c.is_locked ? 'bg-green-500/10 text-green-500' : 'bg-orange-500/10 text-orange-500'}`}>
                      {c.is_locked ? 'Confirmé' : 'En cours'}
                    </span>
                  </div>
                  <div className="text-xs text-text-dim mt-0.5">{c.date} • {SHIFT_LABELS[c.shift]} • {c.controller_name || '—'}</div>
                </button>
              ))}
            </div>
          )}
        </div>
      </div>

      {selected ? (
        <ChecklistPanel control={selected} onUpdated={(c) => { setSelected(c); refresh(); }} readOnly />
      ) : (
        <div className="bg-panel border border-border rounded-md p-6 flex items-center justify-center min-h-[200px]">
          <p className="text-sm text-text-dim text-center max-w-sm">Sélectionnez un contrôle dans la liste pour afficher le détail.</p>
        </div>
      )}
    </div>
  );
}

/** Read-only summary — full PM CRUD already lives on /maintenance for the
 * MAINTENANCE role; this tab just satisfies plan.md §3.2's "maintenance
 * status / last control summary" requirement in the machine's own context. */
function MaintenanceSummarySection({ machineId }: { machineId: number }) {
  const [tasks, setTasks] = useState<PreventiveMaintenance[]>([]);

  useEffect(() => {
    maintenanceApi.getPreventive({ machine: String(machineId) }).then((res) => setTasks(res.results)).catch(console.error);
  }, [machineId]);

  const lastDone = tasks
    .filter((t) => t.last_done)
    .sort((a, b) => (b.last_done! > a.last_done! ? 1 : -1))[0];

  return (
    <div className="bg-panel border border-border rounded-md p-6">
      <h2 className="text-sm font-semibold text-text-dim tracking-wider uppercase mb-4">Maintenance préventive</h2>
      {lastDone && (
        <p className="text-sm text-text-dim mb-4">
          Dernier contrôle : <span className="font-mono text-text">{lastDone.task}</span> le{' '}
          <span className="font-mono text-text">{lastDone.last_done}</span>
        </p>
      )}
      {tasks.length === 0 ? (
        <p className="text-sm text-text-dim">Aucune tâche de maintenance préventive pour cette machine.</p>
      ) : (
        <div className="overflow-x-auto">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="border-b border-border text-[10px] uppercase tracking-wider text-text-dim">
              <th className="pb-2 font-semibold">Tâche</th>
              <th className="pb-2 font-semibold">Fréquence</th>
              <th className="pb-2 font-semibold">Dernier contrôle</th>
              <th className="pb-2 font-semibold">Prochaine échéance</th>
              <th className="pb-2 font-semibold">Statut</th>
              <th className="pb-2 font-semibold">Responsable</th>
            </tr>
          </thead>
          <tbody>
            {tasks.map((t) => (
              <tr key={t.id} className="border-b border-border/30 hover:bg-panel-2/50">
                <td className="py-3 text-sm font-medium">{t.task}</td>
                <td className="py-3 font-mono text-xs text-text-dim">{t.frequency}</td>
                <td className="py-3 font-mono text-xs text-text-dim">{t.last_done || '—'}</td>
                <td className="py-3 font-mono text-xs text-text-dim">{t.next_due}</td>
                <td className="py-3">
                  <span className={`text-[10px] font-mono px-1.5 py-0.5 rounded ${PM_STATUS_BADGE[t.status]}`}>{t.status}</span>
                </td>
                <td className="py-3 font-mono text-xs text-text-dim">{t.assigned_to_name || '—'}</td>
              </tr>
            ))}
          </tbody>
        </table>
        </div>
      )}
    </div>
  );
}
