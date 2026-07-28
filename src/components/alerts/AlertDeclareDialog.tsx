'use client';

import { useState, useEffect } from 'react';
import { useAuthStore } from '@/lib/store/useAuthStore';
import { can } from '@/lib/auth/rbac';
import { alertsApi } from '@/lib/api/alerts';
import { machinesApi } from '@/lib/api/machines';
import { Machine, AlertCategory, PaginatedResponse } from '@/lib/api/types';

export function AlertDeclareDialog() {
  const [isOpen, setIsOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [machines, setMachines] = useState<Machine[]>([]);
  const [categories, setCategories] = useState<AlertCategory[]>([]);
  const user = useAuthStore((state) => state.user);

  // Form state
  const [machine, setMachine] = useState('');
  const [category, setCategory] = useState('');
  const [severity, setSeverity] = useState('MAJOR');
  const [description, setDescription] = useState('');

  if (!can(user?.role, 'declare_alert')) {
    return null;
  }

  const isController = user?.role === 'CONTROLLER';

  const openDialog = async () => {
    setIsOpen(true);
    try {
      const [machineRes, catRes] = await Promise.all([
        machinesApi.getMachines(),
        alertsApi.getCategories(),
      ]);
      setMachines(machineRes.results);
      setCategories(catRes.results);
      if (isController && user?.machine_assignment) {
        setMachine(String(user.machine_assignment));
      }
    } catch (e) {
      console.error('Failed to load form data', e);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    try {
      await alertsApi.createAlert({
        machine: parseInt(machine),
        category: parseInt(category) || undefined,
        severity: severity as any,
        description,
      });
      // Reset form
      setDescription('');
      setMachine('');
      setCategory('');
      setSeverity('MAJOR');
      setIsOpen(false);
    } catch (e) {
      console.error('Failed to create alert', e);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <>
      <button
        onClick={openDialog}
        className="bg-red-500 hover:bg-red-600 text-white px-4 py-2 rounded-md font-sans text-sm font-medium transition-colors shadow-lg shadow-red-500/20"
      >
        🚨 Déclarer un problème
      </button>

      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
          <div className="bg-panel border border-border rounded-lg shadow-xl w-full max-w-lg overflow-hidden">
            <div className="bg-red-500/10 border-b border-red-500/20 p-4">
              <h2 className="font-heading font-bold text-xl text-text">Déclaration d'anomalie</h2>
              <p className="text-xs text-text-dim mt-1">Remplissez les informations pour signaler un problème machine.</p>
            </div>

            <form onSubmit={handleSubmit} className="p-6 space-y-4">
              <div>
                <label className="block text-xs font-semibold text-text-dim uppercase mb-1">Machine *</label>
                {isController ? (
                  user?.machine_assignment ? (
                    <div className="w-full bg-bg border border-border rounded p-2 text-sm text-text-dim">
                      {machines.find(m => m.id === user.machine_assignment)
                        ? `${machines.find(m => m.id === user.machine_assignment)!.name} (${machines.find(m => m.id === user.machine_assignment)!.code})`
                        : `Machine #${user.machine_assignment}`}
                    </div>
                  ) : (
                    <p className="text-xs text-red-500">Aucune machine ne vous est assignée. Contactez un administrateur.</p>
                  )
                ) : (
                  <select
                    value={machine}
                    onChange={(e) => setMachine(e.target.value)}
                    required
                    className="w-full bg-bg border border-border rounded p-2 text-sm text-text focus:outline-none focus:border-cyan-500"
                  >
                    <option value="">Sélectionner...</option>
                    {machines.map(m => (
                      <option key={m.id} value={m.id}>{m.name} ({m.code})</option>
                    ))}
                  </select>
                )}
              </div>

              <div>
                <label className="block text-xs font-semibold text-text-dim uppercase mb-1">Catégorie</label>
                <select
                  value={category}
                  onChange={(e) => setCategory(e.target.value)}
                  className="w-full bg-bg border border-border rounded p-2 text-sm text-text focus:outline-none focus:border-cyan-500"
                >
                  <option value="">Aucune catégorie</option>
                  {categories.map(c => (
                    <option key={c.id} value={c.id}>{c.name}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-text-dim uppercase mb-1">Sévérité *</label>
                <select
                  value={severity}
                  onChange={(e) => setSeverity(e.target.value)}
                  className="w-full bg-bg border border-border rounded p-2 text-sm text-text focus:outline-none focus:border-cyan-500"
                >
                  <option value="CRITICAL">🔴 Critique — Arrêt machine</option>
                  <option value="MAJOR">🟠 Majeur — Production dégradée</option>
                  <option value="MINOR">🟡 Mineur — Intervention planifiable</option>
                  <option value="INFO">🔵 Information</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-text-dim uppercase mb-1">Description détaillée</label>
                <textarea
                  rows={3}
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  className="w-full bg-bg border border-border rounded p-2 text-sm text-text focus:outline-none focus:border-cyan-500"
                  placeholder="Décrivez le problème observé..."
                />
              </div>

              <div className="flex justify-end gap-3 pt-4 border-t border-border mt-6">
                <button
                  type="button"
                  onClick={() => setIsOpen(false)}
                  className="px-4 py-2 rounded text-sm font-medium text-text-dim hover:bg-panel-2 transition-colors"
                >
                  Annuler
                </button>
                <button
                  type="submit"
                  disabled={isLoading || (isController && !user?.machine_assignment)}
                  className="bg-red-500 hover:bg-red-600 disabled:opacity-50 text-white px-6 py-2 rounded text-sm font-medium transition-colors"
                >
                  {isLoading ? 'Envoi...' : 'Déclarer'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  );
}
