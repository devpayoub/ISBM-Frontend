'use client';

import { useEffect, useState } from 'react';
import { toast } from 'sonner';
import { planningApi } from '@/lib/api/planning';
import { ProductionPlan } from '@/lib/api/types';
import { useAuthStore } from '@/lib/store/useAuthStore';
import { can } from '@/lib/auth/rbac';
import { errorMessage, parseFieldErrors } from '@/lib/api/errors';
import { Input } from '@/components/ui/input';

export default function PlanningPage() {
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
        {canEdit && (
          <button
            onClick={() => { if (showForm) { setShowForm(false); resetForm(); } else { resetForm(); setShowForm(true); } }}
            className="bg-cyan-500 hover:bg-cyan-600 text-white px-4 py-2 rounded font-sans text-sm font-medium transition-colors"
          >
            + Nouveau Plan
          </button>
        )}
      </div>

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
    </div>
  );
}
