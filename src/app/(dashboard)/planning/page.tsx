'use client';

import { useEffect, useState } from 'react';
import { planningApi } from '@/lib/api/planning';
import { ProductionPlan, PaginatedResponse } from '@/lib/api/types';
import { useAuthStore } from '@/lib/store/useAuthStore';
import { can } from '@/lib/auth/rbac';

export default function PlanningPage() {
  const [plans, setPlans] = useState<ProductionPlan[]>([]);
  const [showForm, setShowForm] = useState(false);
  const user = useAuthStore((state) => state.user);

  // Form state
  const [formMachine, setFormMachine] = useState('1');
  const [formProduct, setFormProduct] = useState('');
  const [formTarget, setFormTarget] = useState('');
  const [formDate, setFormDate] = useState(new Date().toISOString().split('T')[0]);

  useEffect(() => {
    planningApi.getTodayPlan().then((data: any) => {
      if (Array.isArray(data)) setPlans(data);
      else if (data?.results) setPlans(data.results);
    }).catch(console.error);
  }, []);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const plan = await planningApi.createPlan({
        date: formDate,
        machine: parseInt(formMachine),
        product: formProduct,
        target_bph: parseInt(formTarget),
      });
      setPlans(prev => [...prev, plan]);
      setShowForm(false);
      setFormProduct('');
      setFormTarget('');
    } catch (e) {
      console.error('Failed to create plan', e);
    }
  };

  return (
    <div className="p-6 space-y-6 h-full flex flex-col">
      <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-3">
        <h1 className="font-heading font-bold text-2xl uppercase tracking-wide text-text">Planning & Écarts</h1>
        {can(user?.role, 'edit_settings') && (
          <button
            onClick={() => setShowForm(!showForm)}
            className="bg-cyan-500 hover:bg-cyan-600 text-white px-4 py-2 rounded font-sans text-sm font-medium transition-colors"
          >
            + Nouveau Plan
          </button>
        )}
      </div>

      {showForm && (
        <form onSubmit={handleCreate} className="bg-panel border border-border rounded-md p-4 grid grid-cols-2 md:grid-cols-5 gap-4 items-end">
          <div>
            <label className="block text-xs font-semibold text-text-dim uppercase mb-1">Date</label>
            <input type="date" value={formDate} onChange={(e) => setFormDate(e.target.value)}
              className="w-full bg-bg border border-border rounded p-2 text-sm font-mono text-text focus:outline-none focus:border-cyan-500" />
          </div>
          <div>
            <label className="block text-xs font-semibold text-text-dim uppercase mb-1">Machine</label>
            <select value={formMachine} onChange={(e) => setFormMachine(e.target.value)}
              className="w-full bg-bg border border-border rounded p-2 text-sm text-text focus:outline-none focus:border-cyan-500">
              <option value="1">ISBM 110</option>
              <option value="2">ISBM 88</option>
              <option value="3">INJ-CAPS</option>
            </select>
          </div>
          <div>
            <label className="block text-xs font-semibold text-text-dim uppercase mb-1">Produit</label>
            <input type="text" value={formProduct} onChange={(e) => setFormProduct(e.target.value)} required
              placeholder="750ml / 250ml / Cap"
              className="w-full bg-bg border border-border rounded p-2 text-sm text-text focus:outline-none focus:border-cyan-500" />
          </div>
          <div>
            <label className="block text-xs font-semibold text-text-dim uppercase mb-1">Objectif (BPH)</label>
            <input type="number" value={formTarget} onChange={(e) => setFormTarget(e.target.value)} required min={0}
              className="w-full bg-bg border border-border rounded p-2 text-sm font-mono text-text focus:outline-none focus:border-cyan-500" />
          </div>
          <button type="submit" className="bg-cyan-500 hover:bg-cyan-600 text-white px-4 py-2 rounded font-sans text-sm font-medium transition-colors">
            Créer
          </button>
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
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
