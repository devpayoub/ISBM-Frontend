'use client';

import { useEffect, useState } from 'react';
import { toast } from 'sonner';
import { planningApi } from '@/lib/api/planning';
import { machinesApi } from '@/lib/api/machines';
import { catalogApi } from '@/lib/api/catalog';
import { PlanningOrder, ScheduledOrder, Machine, BottleCharacteristic } from '@/lib/api/types';
import { useAuthStore } from '@/lib/store/useAuthStore';
import { can } from '@/lib/auth/rbac';
import { errorMessage, parseFieldErrors } from '@/lib/api/errors';
import { Input } from '@/components/ui/input';

export default function PlanningPage() {
  const user = useAuthStore((state) => state.user);
  const canEdit = can(user?.role, 'edit_settings');

  return (
    <div className="p-6 space-y-6 h-full flex flex-col">
      <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-3">
        <h1 className="font-heading font-bold text-2xl uppercase tracking-wide text-text">Planning</h1>
      </div>

      <OrdersTab canEdit={canEdit} />
    </div>
  );
}

const STATUS_LABELS: Record<string, string> = {
  QUEUED: "En file d'attente", IN_PROGRESS: 'En cours', DONE: 'Terminée', CANCELLED: 'Annulée',
};

function OrdersTab({ canEdit }: { canEdit: boolean }) {
  const [machines, setMachines] = useState<Machine[]>([]);
  const [bottles, setBottles] = useState<BottleCharacteristic[]>([]);
  const [machineFilter, setMachineFilter] = useState('');
  const [schedule, setSchedule] = useState<ScheduledOrder[]>([]);
  const [orders, setOrders] = useState<PlanningOrder[]>([]);
  const [showForm, setShowForm] = useState(false);

  const [machine, setMachine] = useState('');
  const [bottle, setBottle] = useState('');
  const [color, setColor] = useState('');
  const [quantity, setQuantity] = useState('');
  const [timePerBottleSec, setTimePerBottleSec] = useState('');
  const [requestedStart, setRequestedStart] = useState('');
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [submitting, setSubmitting] = useState(false);

  const refreshSchedule = () => planningApi.getSchedule(machineFilter ? Number(machineFilter) : undefined).then(setSchedule).catch(console.error);
  const refreshOrders = () => planningApi.getOrders(machineFilter ? { machine: machineFilter } : undefined).then((res) => setOrders(res.results)).catch(console.error);

  useEffect(() => {
    machinesApi.getMachines().then((res) => setMachines(res.results)).catch(console.error);
    catalogApi.getCharacteristics().then((res) => setBottles(res.results)).catch(console.error);
  }, []);

  // Temps / bouteille comes from the recipe now instead of being typed —
  // same auto-fill+lock pattern as Package's raw material/color fields.
  const handleBottleChange = (value: string) => {
    setBottle(value);
    const recipe = bottles.find((b) => String(b.id) === value);
    if (recipe?.time_per_bottle_sec) setTimePerBottleSec(recipe.time_per_bottle_sec);
    else setTimePerBottleSec('');
  };

  useEffect(() => {
    refreshSchedule();
    refreshOrders();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [machineFilter]);

  const resetForm = () => {
    setMachine(''); setBottle(''); setColor('');
    setQuantity(''); setTimePerBottleSec(''); setRequestedStart('');
    setFieldErrors({});
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    setFieldErrors({});
    try {
      await planningApi.createOrder({
        machine: Number(machine),
        bottle: bottle ? Number(bottle) : null,
        color,
        quantity: Number(quantity),
        time_per_bottle_sec: timePerBottleSec,
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
            <select value={machine} onChange={(e) => setMachine(e.target.value)} required
              className="w-full bg-bg border border-border rounded p-2 text-sm text-text focus:outline-none focus:border-cyan-500">
              <option value="">Sélectionner...</option>
              {machines.map((m) => <option key={m.id} value={m.id}>{m.name} ({m.code})</option>)}
            </select>
          </div>
          <div>
            <label className="block text-xs font-semibold text-text-dim uppercase mb-1">Bouteille (catalogue)</label>
            <select value={bottle} onChange={(e) => handleBottleChange(e.target.value)}
              className="w-full bg-bg border border-border rounded p-2 text-sm text-text focus:outline-none focus:border-cyan-500">
              <option value="">Aucune</option>
              {bottles.map((b) => <option key={b.id} value={b.id}>{b.category}</option>)}
            </select>
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
            <label className="block text-xs font-semibold text-text-dim uppercase mb-1">
              Temps / bouteille (s) * {bottle && <span className="text-cyan-500 normal-case">(auto — recette)</span>}
            </label>
            <Input type="number" step="0.01" min="0.01" value={timePerBottleSec} onChange={(e) => setTimePerBottleSec(e.target.value)}
              required disabled={!!bottle} error={fieldErrors.time_per_bottle_sec}
              className="disabled:opacity-60 disabled:cursor-not-allowed" />
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
                          `Matière première (${row.material_check.raw_material_reference}) : ${row.material_check.raw_material_physical_kg} kg physique − ${row.material_check.raw_material_reserved_kg} kg déjà pris par les commandes précédentes = ${row.material_check.raw_material_available_kg} kg disponible / ${row.material_check.raw_material_required_kg} kg requis` +
                          (row.material_check.colorant_required_kg
                            ? `\nColorant (${row.material_check.colorant_reference}) : ${row.material_check.colorant_physical_kg} kg physique − ${row.material_check.colorant_reserved_kg} kg déjà pris par les commandes précédentes = ${row.material_check.colorant_available_kg} kg disponible / ${row.material_check.colorant_required_kg} kg requis`
                            : '')
                        }>
                          <span className={`inline-block px-2 py-0.5 rounded font-semibold ${
                            row.material_check.stock_status === 'OK' ? 'bg-green-500/15 text-green-400'
                              : row.material_check.stock_status === 'WARNING' ? 'bg-orange-500/15 text-orange-400'
                              : 'bg-red-500/15 text-red-400'
                          }`}>
                            {row.material_check.stock_status === 'OK' ? 'Stock OK'
                              : row.material_check.stock_status === 'WARNING' ? 'Stock bas'
                              : 'Stock insuffisant'}
                          </span>
                          {row.material_check.is_first_shortage && (
                            <span className="ml-1 inline-block px-2 py-0.5 rounded font-semibold bg-red-500/25 text-red-300" title="Première commande de la séquence bloquée par manque de stock">
                              1ᵉʳ manque
                            </span>
                          )}
                          {row.material_check.stock_status !== 'OK' && (
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
