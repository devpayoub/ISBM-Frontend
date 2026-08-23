'use client';

import { use, useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import { machinesApi } from '@/lib/api/machines';
import { alertsApi } from '@/lib/api/alerts';
import { maintenanceApi } from '@/lib/api/maintenance';
import {
  Machine, Alert, AuxiliaryEquipment, PreventiveMaintenance, PmStatus,
} from '@/lib/api/types';
import { useAlertStore } from '@/lib/store/useAlertStore';
import { useAuthStore } from '@/lib/store/useAuthStore';
import { errorMessage, parseFieldErrors } from '@/lib/api/errors';
import { BackButton } from '@/components/ui/back-button';
import { Input } from '@/components/ui/input';
import { EquipmentCrudSection } from '@/components/machines/EquipmentCrudSection';

type Tab = 'overview' | 'components' | 'auxiliary' | 'molds' | 'maintenance';

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
    { key: 'components', label: 'Composants' },
    { key: 'auxiliary', label: 'Équipements auxiliaires' },
    { key: 'molds', label: 'Moules' },
    { key: 'maintenance', label: 'Maintenance préventive' },
  ];

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <BackButton fallbackHref="/machines" />
          <div className={`w-6 h-6 rounded-full ${andonStyle}`} />
          <h1 className="font-heading font-bold text-2xl uppercase tracking-wide text-text">{machine.name}</h1>
          <span className="font-mono text-sm text-text-dim bg-bg px-3 py-1 rounded">{machine.code}</span>
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
      <div className="flex gap-1 bg-bg border border-border rounded-md p-1 w-fit overflow-x-auto">
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

      {tab === 'components' && (
        <EquipmentCrudSection
          title="Composants machine"
          itemLabel="Composant"
          machineId={machine.id}
          canManage={canManage}
          list={(id) => machinesApi.getComponents(id)}
          create={(data) => machinesApi.createComponent(data)}
          update={(id, data) => machinesApi.updateComponent(id, data)}
          remove={(id) => machinesApi.deleteComponent(id)}
        />
      )}

      {tab === 'auxiliary' && <AuxiliaryEquipmentSection machine={machine} canManage={canManage} />}

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
    </div>
  );
}

/** Auxiliary equipment (Air compressor, Air dryer, ...) is M2M across
 * machines — unlike Components/Molds it isn't owned by a single machine,
 * so this page just scopes the list to equipment already assigned here
 * and lets the admin (re)assign it across any of the site's machines. */
function AuxiliaryEquipmentSection({ machine, canManage }: { machine: Machine; canManage: boolean }) {
  const [items, setItems] = useState<AuxiliaryEquipment[]>([]);
  const [allMachines, setAllMachines] = useState<Machine[]>([]);
  const [search, setSearch] = useState('');
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [name, setName] = useState('');
  const [reference, setReference] = useState('');
  const [selectedMachines, setSelectedMachines] = useState<number[]>([]);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);

  const refresh = () => machinesApi.getAuxiliaryEquipment().then((res) => setItems(res.results)).catch(console.error);

  useEffect(() => {
    refresh();
    machinesApi.getMachines().then((res) => setAllMachines(res.results)).catch(console.error);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const scoped = items.filter((eq) => eq.machines.includes(machine.id));

  const resetForm = () => {
    setEditingId(null);
    setName('');
    setReference('');
    setSelectedMachines([machine.id]);
    setFieldErrors({});
  };

  const startCreate = () => {
    resetForm();
    setShowForm(true);
  };

  const startEdit = (eq: AuxiliaryEquipment) => {
    setEditingId(eq.id);
    setName(eq.name);
    setReference(eq.reference || '');
    setSelectedMachines(eq.machines);
    setFieldErrors({});
    setShowForm(true);
  };

  const toggleMachine = (id: number) => {
    setSelectedMachines((prev) => prev.includes(id) ? prev.filter((m) => m !== id) : [...prev, id]);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setFieldErrors({});
    try {
      if (editingId) {
        await machinesApi.updateAuxiliaryEquipment(editingId, { name, reference, machines: selectedMachines });
        toast.success('Équipement auxiliaire mis à jour.');
      } else {
        await machinesApi.createAuxiliaryEquipment({ name, reference, machines: selectedMachines });
        toast.success('Équipement auxiliaire créé.');
      }
      resetForm();
      setShowForm(false);
      await refresh();
    } catch (err) {
      console.error('Failed to save auxiliary equipment', err);
      setFieldErrors(parseFieldErrors(err));
      toast.error(errorMessage(err, "Échec de l'enregistrement."));
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = async (eq: AuxiliaryEquipment) => {
    if (!confirm(`Supprimer "${eq.name}" ?`)) return;
    try {
      await machinesApi.deleteAuxiliaryEquipment(eq.id);
      await refresh();
      toast.success('Équipement auxiliaire supprimé.');
    } catch (err) {
      console.error('Failed to delete auxiliary equipment', err);
      toast.error(errorMessage(err, 'Échec de la suppression.'));
    }
  };

  const filtered = scoped.filter((eq) => {
    const q = search.trim().toLowerCase();
    if (!q) return true;
    return eq.name.toLowerCase().includes(q) || (eq.reference || '').toLowerCase().includes(q);
  });

  return (
    <div className="bg-panel border border-border rounded-md p-6">
      <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-3 mb-4">
        <h2 className="text-sm font-semibold text-text-dim tracking-wider uppercase">Équipements auxiliaires</h2>
        <div className="flex gap-3">
          <Input type="text" placeholder="Rechercher..." value={search} onChange={(e) => setSearch(e.target.value)} className="w-48" />
          {canManage && (
            <button onClick={startCreate} className="bg-cyan-500 hover:bg-cyan-600 text-white px-4 py-2 rounded text-sm font-medium transition-colors whitespace-nowrap">
              + Ajouter
            </button>
          )}
        </div>
      </div>

      {showForm && canManage && (
        <form onSubmit={handleSubmit} className="bg-panel-2 border border-border rounded-md p-4 grid grid-cols-1 sm:grid-cols-3 gap-4 mb-4">
          <div>
            <label className="block text-xs font-semibold text-text-dim uppercase mb-1">Nom *</label>
            <Input type="text" value={name} onChange={(e) => setName(e.target.value)} required error={fieldErrors.name} />
          </div>
          <div>
            <label className="block text-xs font-semibold text-text-dim uppercase mb-1">Référence</label>
            <Input type="text" value={reference} onChange={(e) => setReference(e.target.value)} error={fieldErrors.reference} />
          </div>
          <div>
            <label className="block text-xs font-semibold text-text-dim uppercase mb-1">Machines desservies</label>
            <div className="bg-bg border border-border rounded p-2 max-h-24 overflow-auto space-y-1">
              {allMachines.map((m) => (
                <label key={m.id} className="flex items-center gap-2 text-xs text-text-dim">
                  <input type="checkbox" checked={selectedMachines.includes(m.id)} onChange={() => toggleMachine(m.id)} />
                  {m.name} ({m.code})
                </label>
              ))}
            </div>
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

      {filtered.length === 0 ? (
        <p className="text-sm text-text-dim">Aucun équipement auxiliaire assigné à cette machine.</p>
      ) : (
        <div className="overflow-x-auto">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="border-b border-border text-[10px] uppercase tracking-wider text-text-dim">
              <th className="pb-2 font-semibold">Nom</th>
              <th className="pb-2 font-semibold">Référence</th>
              <th className="pb-2 font-semibold">Machines desservies</th>
              {canManage && <th className="pb-2 font-semibold text-right">Actions</th>}
            </tr>
          </thead>
          <tbody>
            {filtered.map((eq) => (
              <tr key={eq.id} className="border-b border-border/30 hover:bg-panel-2/50">
                <td className="py-3 text-sm font-medium">{eq.name}</td>
                <td className="py-3 font-mono text-xs text-text-dim">{eq.reference || '—'}</td>
                <td className="py-3 font-mono text-xs text-text-dim">
                  {(eq.machines_detail || []).map((m) => m.code).join(', ') || '—'}
                </td>
                {canManage && (
                  <td className="py-3 text-right space-x-3">
                    <button onClick={() => startEdit(eq)} className="text-cyan-500 hover:text-cyan-400 text-xs font-medium">Modifier</button>
                    <button onClick={() => handleDelete(eq)} className="text-red-500 hover:text-red-400 text-xs font-medium">Supprimer</button>
                  </td>
                )}
              </tr>
            ))}
          </tbody>
        </table>
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
