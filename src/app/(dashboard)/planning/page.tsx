'use client';

import { useEffect, useState } from 'react';
import { toast } from 'sonner';
import { planningApi } from '@/lib/api/planning';
import { machinesApi } from '@/lib/api/machines';
import { catalogApi } from '@/lib/api/catalog';
import {
  ProductionPlan, PlanningOrder, ScheduledOrder, Machine, Mold, BottleCharacteristic,
} from '@/lib/api/types';
import { useAuthStore } from '@/lib/store/useAuthStore';
import { can } from '@/lib/auth/rbac';
import { errorMessage, parseFieldErrors } from '@/lib/api/errors';
import { Input } from '@/components/ui/input';

export default function PlanningPage() {
  const [tab, setTab] = useState<'ecarts' | 'orders'>('ecarts');
  const [plans, setPlans] = useState<ProductionPlan[]>([]);
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const user = useAuthStore((state) => state.user);
  const canEdit = can(user?.role, 'edit_settings');

  // Form state
  const [formMachine, setFormMachine] = useState('1');
  const [formProduct, setFormProduct] = useState('');
  const [formTarget, setFormTarget] = useState('');
  const [formNotes, setFormNotes] = useState('');
  const [formDate, setFormDate] = useState(new Date().toISOString().split('T')[0]);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});

  const load = () => {
    planningApi.getTodayPlan().then((data: any) => {
      if (Array.isArray(data)) setPlans(data);
      else if (data?.results) setPlans(data.results);
      else if (data?.rows) setPlans(data.rows);
    }).catch(console.error);
  };

  useEffect(load, []);

  const resetForm = () => {
    setEditingId(null);
    setFormMachine('1'); setFormProduct(''); setFormTarget(''); setFormNotes('');
    setFormDate(new Date().toISOString().split('T')[0]);
  };

  const startEdit = (plan: ProductionPlan) => {
    setEditingId(plan.id);
    setFormMachine(String(plan.machine));
    setFormProduct(plan.product);
    setFormTarget(String(plan.target_bph));
    setFormNotes(plan.notes || '');
    setFormDate(plan.date);
    setShowForm(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFieldErrors({});
    try {
      if (editingId) {
        await planningApi.updatePlan(editingId, {
          product: formProduct,
          target_bph: parseInt(formTarget),
          notes: formNotes,
        });
        toast.success('Plan mis à jour.');
      } else {
        await planningApi.createPlan({
          date: formDate,
          machine: parseInt(formMachine),
          product: formProduct,
          target_bph: parseInt(formTarget),
          notes: formNotes,
        });
        toast.success('Plan créé.');
      }
      resetForm();
      setShowForm(false);
      load();
    } catch (e) {
      console.error('Failed to save plan', e);
      setFieldErrors(parseFieldErrors(e));
      toast.error(errorMessage(e, "Échec de l'enregistrement du plan."));
    }
  };

  const handleDelete = async (plan: ProductionPlan) => {
    if (!confirm(`Supprimer le plan "${plan.product}" du ${plan.date} ?`)) return;
    try {
      await planningApi.deletePlan(plan.id);
      load();
      toast.success('Plan supprimé.');
    } catch (e) {
      console.error('Failed to delete plan', e);
      toast.error(errorMessage(e, 'Échec de la suppression.'));
    }
  };

  return (
    <div className="p-6 space-y-6 h-full flex flex-col">
      <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-3">
        <h1 className="font-heading font-bold text-2xl uppercase tracking-wide text-text">Planning & Écarts</h1>
        {canEdit && tab === 'ecarts' && (
          <button
            onClick={() => { if (showForm) { setShowForm(false); resetForm(); } else { resetForm(); setShowForm(true); } }}
            className="bg-cyan-500 hover:bg-cyan-600 text-white px-4 py-2 rounded font-sans text-sm font-medium transition-colors"
          >
            + Nouveau Plan
          </button>
        )}
      </div>

      <div className="flex gap-1 bg-bg border border-border rounded-md p-1 w-fit">
        <button
          onClick={() => setTab('ecarts')}
          className={`px-4 py-2 rounded text-sm font-medium transition-colors ${tab === 'ecarts' ? 'bg-panel text-text shadow' : 'text-text-dim hover:text-text'}`}
        >
          Écarts (objectif / réalisé)
        </button>
        <button
          onClick={() => setTab('orders')}
          className={`px-4 py-2 rounded text-sm font-medium transition-colors ${tab === 'orders' ? 'bg-panel text-text shadow' : 'text-text-dim hover:text-text'}`}
        >
          Commandes & Séquençage
        </button>
      </div>

      {tab === 'ecarts' && (
      <>
      {showForm && (
        <form onSubmit={handleSubmit} className="bg-panel border border-border rounded-md p-4 grid grid-cols-2 md:grid-cols-5 gap-4 items-end">
          <div>
            <label className="block text-xs font-semibold text-text-dim uppercase mb-1">Date</label>
            <input type="date" value={formDate} onChange={(e) => setFormDate(e.target.value)} disabled={!!editingId}
              className="w-full bg-bg border border-border rounded p-2 text-sm font-mono text-text focus:outline-none focus:border-cyan-500 disabled:opacity-50" />
          </div>
          <div>
            <label className="block text-xs font-semibold text-text-dim uppercase mb-1">Machine</label>
            <select value={formMachine} onChange={(e) => setFormMachine(e.target.value)} disabled={!!editingId}
              className="w-full bg-bg border border-border rounded p-2 text-sm text-text focus:outline-none focus:border-cyan-500 disabled:opacity-50">
              <option value="1">ISBM 110</option>
              <option value="2">ISBM 88</option>
              <option value="3">INJ-CAPS</option>
            </select>
          </div>
          <div>
            <label className="block text-xs font-semibold text-text-dim uppercase mb-1">Produit</label>
            <Input type="text" value={formProduct} onChange={(e) => setFormProduct(e.target.value)} required
              placeholder="750ml / 250ml / Cap" error={fieldErrors.product} />
          </div>
          <div>
            <label className="block text-xs font-semibold text-text-dim uppercase mb-1">Objectif (BPH)</label>
            <Input type="number" value={formTarget} onChange={(e) => setFormTarget(e.target.value)} required min={0}
              className="font-mono" error={fieldErrors.target_bph} />
          </div>
          <div className="flex gap-2">
            <button type="submit" className="bg-cyan-500 hover:bg-cyan-600 text-white px-4 py-2 rounded font-sans text-sm font-medium transition-colors">
              {editingId ? 'Enregistrer' : 'Créer'}
            </button>
            <button type="button" onClick={() => { setShowForm(false); resetForm(); }}
              className="px-4 py-2 rounded text-sm text-text-dim hover:bg-panel-2 transition-colors">
              Annuler
            </button>
          </div>
        </form>
      )}

      {/* Variance Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {plans.map(plan => {
          const varianceColor = plan.variance_pct >= 0 ? 'text-green-500' : plan.variance_pct >= -10 ? 'text-orange-500' : 'text-red-500';
          const barPct = plan.target_bph > 0 ? Math.min((plan.actual_bph / plan.target_bph) * 100, 120) : 0;
          return (
            <div key={plan.id} className="bg-panel border border-border rounded-md p-5">
              <div className="flex justify-between items-start mb-4">
                <div>
                  <h3 className="font-heading font-bold text-lg">{plan.machine_name || `Machine ${plan.machine}`}</h3>
                  <p className="text-xs text-text-dim">{plan.product} • {plan.date}</p>
                </div>
                <span className={`font-mono text-lg font-bold ${varianceColor}`}>
                  {plan.variance_pct >= 0 ? '+' : ''}{plan.variance_pct.toFixed(1)}%
                </span>
              </div>
              <div className="space-y-2">
                <div className="flex justify-between text-xs text-text-dim">
                  <span>Objectif: {plan.target_bph} BPH</span>
                  <span>Réalisé: {plan.actual_bph} BPH</span>
                </div>
                <div className="w-full h-3 bg-bg rounded-full overflow-hidden">
                  <div
                    className="h-full rounded-full transition-all duration-1000"
                    style={{
                      width: `${Math.min(barPct, 100)}%`,
                      backgroundColor: plan.variance_pct >= 0 ? '#22c55e' : plan.variance_pct >= -10 ? '#f97316' : '#ef4444',
                    }}
                  />
                </div>
                {canEdit && (
                  <div className="flex justify-end gap-3 pt-2">
                    <button onClick={() => startEdit(plan)} className="text-cyan-500 hover:text-cyan-400 text-xs font-medium">
                      Modifier
                    </button>
                    <button onClick={() => handleDelete(plan)} className="text-red-500 hover:text-red-400 text-xs font-medium">
                      Supprimer
                    </button>
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>
      </>
      )}

      {tab === 'orders' && <OrdersTab canEdit={canEdit} />}
    </div>
  );
}

const STATUS_LABELS: Record<string, string> = {
  QUEUED: "En file d'attente", IN_PROGRESS: 'En cours', DONE: 'Terminée', CANCELLED: 'Annulée',
};

function OrdersTab({ canEdit }: { canEdit: boolean }) {
  const [machines, setMachines] = useState<Machine[]>([]);
  const [molds, setMolds] = useState<Mold[]>([]);
  const [bottles, setBottles] = useState<BottleCharacteristic[]>([]);
  const [machineFilter, setMachineFilter] = useState('');
  const [schedule, setSchedule] = useState<ScheduledOrder[]>([]);
  const [orders, setOrders] = useState<PlanningOrder[]>([]);
  const [showForm, setShowForm] = useState(false);

  const [machine, setMachine] = useState('');
  const [mold, setMold] = useState('');
  const [bottle, setBottle] = useState('');
  const [productReference, setProductReference] = useState('');
  const [color, setColor] = useState('');
  const [quantity, setQuantity] = useState('');
  const [timePerBottleSec, setTimePerBottleSec] = useState('');
  const [moldChangeMin, setMoldChangeMin] = useState('0');
  const [priority, setPriority] = useState('100');
  const [requestedStart, setRequestedStart] = useState('');
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [submitting, setSubmitting] = useState(false);

  const refreshSchedule = () => planningApi.getSchedule(machineFilter ? Number(machineFilter) : undefined).then(setSchedule).catch(console.error);
  const refreshOrders = () => planningApi.getOrders(machineFilter ? { machine: machineFilter } : undefined).then((res) => setOrders(res.results)).catch(console.error);

  useEffect(() => {
    machinesApi.getMachines().then((res) => setMachines(res.results)).catch(console.error);
    catalogApi.getCharacteristics().then((res) => setBottles(res.results)).catch(console.error);
  }, []);

  useEffect(() => {
    if (machine) machinesApi.getMolds(Number(machine)).then((res) => setMolds(res.results)).catch(console.error);
    else setMolds([]);
  }, [machine]);

  useEffect(() => {
    refreshSchedule();
    refreshOrders();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [machineFilter]);

  const resetForm = () => {
    setMachine(''); setMold(''); setBottle(''); setProductReference(''); setColor('');
    setQuantity(''); setTimePerBottleSec(''); setMoldChangeMin('0'); setPriority('100'); setRequestedStart('');
    setFieldErrors({});
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    setFieldErrors({});
    try {
      await planningApi.createOrder({
        machine: Number(machine),
        mold: mold ? Number(mold) : null,
        bottle: bottle ? Number(bottle) : null,
        product_reference: productReference,
        color,
        quantity: Number(quantity),
        time_per_bottle_sec: timePerBottleSec,
        mold_change_min: Number(moldChangeMin) || 0,
        priority: Number(priority) || 100,
        requested_start: requestedStart ? new Date(requestedStart).toISOString() : null,
      });
      toast.success('Commande créée.');
      resetForm();
      setShowForm(false);
      refreshSchedule();
      refreshOrders();
    } catch (err) {
      console.error('Failed to create planning order', err);
      setFieldErrors(parseFieldErrors(err));
      toast.error(errorMessage(err, 'Échec de la création.'));
    } finally {
      setSubmitting(false);
    }
  };

  const handlePriorityChange = async (order: PlanningOrder, newPriority: number) => {
    try {
      await planningApi.updateOrder(order.id, { priority: newPriority });
      refreshSchedule();
      refreshOrders();
    } catch (err) {
      console.error('Failed to reprioritize order', err);
      toast.error(errorMessage(err, 'Échec de la modification de la priorité.'));
    }
  };

  const handleDelete = async (order: PlanningOrder) => {
    if (!confirm(`Supprimer la commande "${order.product_reference || order.id}" ?`)) return;
    try {
      await planningApi.deleteOrder(order.id);
      toast.success('Commande supprimée.');
      refreshSchedule();
      refreshOrders();
    } catch (err) {
      console.error('Failed to delete planning order', err);
      toast.error(errorMessage(err, 'Échec de la suppression.'));
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-3">
        <select value={machineFilter} onChange={(e) => setMachineFilter(e.target.value)}
          className="bg-bg border border-border rounded p-2 text-sm text-text focus:outline-none focus:border-cyan-500">
          <option value="">Toutes les machines</option>
          {machines.map((m) => <option key={m.id} value={m.id}>{m.name} ({m.code})</option>)}
        </select>
        {canEdit && (
          <button onClick={() => { resetForm(); setShowForm(!showForm); }}
            className="bg-cyan-500 hover:bg-cyan-600 text-white px-4 py-2 rounded text-sm font-medium transition-colors whitespace-nowrap">
            + Nouvelle commande
          </button>
        )}
      </div>

      {showForm && (
        <form onSubmit={handleSubmit} className="bg-panel border border-border rounded-md p-4 grid grid-cols-2 md:grid-cols-4 gap-4">
          <div>
            <label className="block text-xs font-semibold text-text-dim uppercase mb-1">Machine *</label>
            <select value={machine} onChange={(e) => { setMachine(e.target.value); setMold(''); }} required
              className="w-full bg-bg border border-border rounded p-2 text-sm text-text focus:outline-none focus:border-cyan-500">
              <option value="">Sélectionner...</option>
              {machines.map((m) => <option key={m.id} value={m.id}>{m.name} ({m.code})</option>)}
            </select>
          </div>
          <div>
            <label className="block text-xs font-semibold text-text-dim uppercase mb-1">Moule</label>
            <select value={mold} onChange={(e) => setMold(e.target.value)} disabled={!machine}
              className="w-full bg-bg border border-border rounded p-2 text-sm text-text focus:outline-none focus:border-cyan-500 disabled:opacity-50">
              <option value="">Aucun</option>
              {molds.map((m) => <option key={m.id} value={m.id}>{m.name} ({m.reference || 'sans référence'})</option>)}
            </select>
          </div>
          <div>
            <label className="block text-xs font-semibold text-text-dim uppercase mb-1">Bouteille (catalogue)</label>
            <select value={bottle} onChange={(e) => setBottle(e.target.value)}
              className="w-full bg-bg border border-border rounded p-2 text-sm text-text focus:outline-none focus:border-cyan-500">
              <option value="">Aucune</option>
              {bottles.map((b) => <option key={b.id} value={b.id}>{b.category}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-xs font-semibold text-text-dim uppercase mb-1">Référence produit</label>
            <Input type="text" value={productReference} onChange={(e) => setProductReference(e.target.value)} placeholder="Bottles A" error={fieldErrors.product_reference} />
          </div>
          <div>
            <label className="block text-xs font-semibold text-text-dim uppercase mb-1">Couleur</label>
            <input type="text" value={color} onChange={(e) => setColor(e.target.value)}
              className="w-full bg-bg border border-border rounded p-2 text-sm text-text focus:outline-none focus:border-cyan-500" />
          </div>
          <div>
            <label className="block text-xs font-semibold text-text-dim uppercase mb-1">Quantité *</label>
            <Input type="number" min="1" value={quantity} onChange={(e) => setQuantity(e.target.value)} required error={fieldErrors.quantity} />
          </div>
          <div>
            <label className="block text-xs font-semibold text-text-dim uppercase mb-1">Temps / bouteille (s) *</label>
            <Input type="number" step="0.01" min="0.01" value={timePerBottleSec} onChange={(e) => setTimePerBottleSec(e.target.value)} required error={fieldErrors.time_per_bottle_sec} />
          </div>
          <div>
            <label className="block text-xs font-semibold text-text-dim uppercase mb-1">Changement moule (min)</label>
            <input type="number" min="0" value={moldChangeMin} onChange={(e) => setMoldChangeMin(e.target.value)}
              className="w-full bg-bg border border-border rounded p-2 text-sm text-text focus:outline-none focus:border-cyan-500" />
          </div>
          <div>
            <label className="block text-xs font-semibold text-text-dim uppercase mb-1">Priorité (plus petit = plus urgent)</label>
            <input type="number" value={priority} onChange={(e) => setPriority(e.target.value)}
              className="w-full bg-bg border border-border rounded p-2 text-sm text-text focus:outline-none focus:border-cyan-500" />
          </div>
          <div>
            <label className="block text-xs font-semibold text-text-dim uppercase mb-1">Début souhaité (optionnel)</label>
            <input type="datetime-local" value={requestedStart} onChange={(e) => setRequestedStart(e.target.value)}
              className="w-full bg-bg border border-border rounded p-2 text-sm text-text focus:outline-none focus:border-cyan-500" />
          </div>
          <div className="col-span-full flex justify-end gap-3">
            <button type="button" onClick={() => { setShowForm(false); resetForm(); }} className="px-4 py-2 rounded text-sm text-text-dim hover:bg-panel-2 transition-colors">
              Annuler
            </button>
            <button type="submit" disabled={submitting} className="bg-cyan-500 hover:bg-cyan-600 disabled:opacity-50 text-white px-6 py-2 rounded text-sm font-medium transition-colors">
              {submitting ? 'Création...' : 'Créer'}
            </button>
          </div>
        </form>
      )}

      <div className="bg-panel border border-border rounded-md p-6">
        <h2 className="text-sm font-semibold text-text-dim tracking-wider uppercase mb-4">Séquence calculée</h2>
        {schedule.length === 0 ? (
          <p className="text-sm text-text-dim">Aucune commande en file d'attente.</p>
        ) : (
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-border text-[10px] uppercase tracking-wider text-text-dim">
                <th className="pb-2 font-semibold">#</th>
                <th className="pb-2 font-semibold">Machine</th>
                <th className="pb-2 font-semibold">Produit</th>
                <th className="pb-2 font-semibold">Moule</th>
                <th className="pb-2 font-semibold">Couleur</th>
                <th className="pb-2 font-semibold text-right">Quantité</th>
                <th className="pb-2 font-semibold text-right">Chgt moule</th>
                <th className="pb-2 font-semibold">Début estimé</th>
                <th className="pb-2 font-semibold">Fin estimée</th>
                <th className="pb-2 font-semibold text-right">Durée totale</th>
                <th className="pb-2 font-semibold">Stock</th>
                {canEdit && <th className="pb-2 font-semibold text-right">Actions</th>}
              </tr>
            </thead>
            <tbody>
              {schedule.map((row, idx) => {
                const order = orders.find((o) => o.id === row.id);
                return (
                  <tr key={row.id} className="border-b border-border/30 hover:bg-panel-2/50">
                    <td className="py-3 font-mono text-xs text-text-dim">{idx + 1}</td>
                    <td className="py-3 font-mono text-xs text-text-dim">{row.machine_code}</td>
                    <td className="py-3 text-sm font-medium">{row.product_reference || '—'}</td>
                    <td className="py-3 font-mono text-xs text-text-dim">{row.mold_name || '—'}</td>
                    <td className="py-3 text-xs text-text-dim">{row.color || '—'}</td>
                    <td className="py-3 font-mono text-sm text-text text-right">{row.quantity}</td>
                    <td className="py-3 font-mono text-xs text-text-dim text-right">{row.mold_change_min > 0 ? `${row.mold_change_min} min` : '—'}</td>
                    <td className="py-3 font-mono text-xs text-text">{new Date(row.estimated_start).toLocaleString()}</td>
                    <td className="py-3 font-mono text-xs text-text">{new Date(row.estimated_finish).toLocaleString()}</td>
                    <td className="py-3 font-mono text-sm text-text text-right">{row.total_duration_min} min</td>
                    <td className="py-3 text-xs">
                      {row.material_check ? (
                        <div title={
                          `Matière première (${row.material_check.raw_material_reference}) : ${row.material_check.raw_material_physical_kg} kg physique − ${row.material_check.raw_material_reserved_kg} kg réservé par d'autres commandes = ${row.material_check.raw_material_available_kg} kg disponible / ${row.material_check.raw_material_required_kg} kg requis` +
                          (row.material_check.colorant_required_kg
                            ? `\nColorant (${row.material_check.colorant_reference}) : ${row.material_check.colorant_physical_kg} kg physique − ${row.material_check.colorant_reserved_kg} kg réservé par d'autres commandes = ${row.material_check.colorant_available_kg} kg disponible / ${row.material_check.colorant_required_kg} kg requis`
                            : '')
                        }>
                          <span className={`inline-block px-2 py-0.5 rounded font-semibold ${row.material_check.stock_sufficient ? 'bg-green-500/15 text-green-400' : 'bg-red-500/15 text-red-400'}`}>
                            {row.material_check.stock_sufficient ? 'Stock OK' : 'Stock insuffisant'}
                          </span>
                          {!row.material_check.stock_sufficient && (
                            <div className="text-text-dim mt-1 font-mono">
                              MP : {row.material_check.raw_material_available_kg}/{row.material_check.raw_material_required_kg} kg
                              {row.material_check.colorant_required_kg && (
                                <> · Col : {row.material_check.colorant_available_kg}/{row.material_check.colorant_required_kg} kg</>
                              )}
                            </div>
                          )}
                        </div>
                      ) : (
                        <span className="text-text-dim">—</span>
                      )}
                    </td>
                    {canEdit && (
                      <td className="py-3 text-right whitespace-nowrap space-x-2">
                        {order && (
                          <input
                            type="number"
                            defaultValue={row.priority}
                            onBlur={(e) => { const v = Number(e.target.value); if (!Number.isNaN(v) && v !== row.priority) handlePriorityChange(order, v); }}
                            title="Priorité (plus petit = plus urgent)"
                            className="w-14 bg-bg border border-border rounded p-1 text-xs font-mono text-text text-right focus:outline-none focus:border-cyan-500"
                          />
                        )}
                        {order && (
                          <button onClick={() => handleDelete(order)} className="text-red-500 hover:text-red-400 text-xs font-medium">
                            Supprimer
                          </button>
                        )}
                      </td>
                    )}
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
