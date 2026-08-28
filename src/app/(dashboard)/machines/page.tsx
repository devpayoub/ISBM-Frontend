'use client';

import { useEffect, useState } from 'react';
import { toast } from 'sonner';
import { machinesApi } from '@/lib/api/machines';
import { alertsApi } from '@/lib/api/alerts';
import { Machine, MachineType, PaginatedResponse } from '@/lib/api/types';
import { useAlertStore } from '@/lib/store/useAlertStore';
import { useAuthStore } from '@/lib/store/useAuthStore';
import { errorMessage, parseFieldErrors } from '@/lib/api/errors';
import { Input } from '@/components/ui/input';
import { connectWebSocket, disconnectWebSocket } from '@/lib/ws/client';
import { MachineCard } from '@/components/machines/MachineCard';

const MACHINE_TYPES: MachineType[] = ['ISBM', 'INJECTION', 'COMPRESSOR', 'CHILLER', 'DRYER'];

export default function MachinesPage() {
  const [data, setData] = useState<PaginatedResponse<Machine> | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const user = useAuthStore((state) => state.user);
  const canManage = user?.role === 'ADMIN' || user?.role === 'MANAGER';

  // Create form state
  const [name, setName] = useState('');
  const [code, setCode] = useState('');
  const [type, setType] = useState<MachineType>('ISBM');
  const [nominalBph, setNominalBph] = useState('0');
  const [nominalCph, setNominalCph] = useState('0');
  const [cavities, setCavities] = useState('0');
  const [productFormat, setProductFormat] = useState('');
  const [location, setLocation] = useState('');
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});

  useEffect(() => {
    machinesApi.getMachines().then(setData).catch(console.error);
    // Andon dots + the alert overlay below need live data. useAlertStore is
    // only ever seeded by whichever page happens to fetch it first (today
    // that's the Dashboard) — landing here directly leaves it empty, so
    // fetch + connect the same way Dashboard does rather than assuming
    // another page already primed the store.
    alertsApi.getActiveAlerts().then(useAlertStore.getState().setInitialAlerts).catch(console.error);
    connectWebSocket();
    return () => disconnectWebSocket();
  }, []);

  const refresh = () => machinesApi.getMachines().then(setData).catch(console.error);

  const resetForm = () => {
    setName(''); setCode(''); setType('ISBM'); setNominalBph('0'); setNominalCph('0');
    setCavities('0'); setProductFormat(''); setLocation('');
  };

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setFieldErrors({});
    try {
      await machinesApi.createMachine({
        name, code, type,
        nominal_bph: parseInt(nominalBph) || 0,
        nominal_cph: parseInt(nominalCph) || 0,
        cavities: parseInt(cavities) || 0,
        product_format: productFormat,
        location,
      });
      resetForm();
      setShowForm(false);
      await refresh();
      toast.success('Machine créée.');
    } catch (e) {
      console.error('Failed to create machine', e);
      setFieldErrors(parseFieldErrors(e));
      toast.error(errorMessage(e, 'Échec de la création de la machine.'));
    } finally {
      setIsSubmitting(false);
    }
  };

  const machinesList = Array.isArray(data?.results) ? data.results : Array.isArray(data) ? (data as unknown as Machine[]) : [];

  return (
    <div className="p-6 space-y-6">
      <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-3">
        <h1 className="font-heading font-bold text-2xl uppercase tracking-wide text-text">Parc Machines</h1>
        {canManage && (
          <button
            onClick={() => setShowForm(!showForm)}
            className="bg-cyan-500 hover:bg-cyan-600 text-white px-4 py-2 rounded font-sans text-sm font-medium transition-colors"
          >
            + Nouvelle Machine
          </button>
        )}
      </div>

      {showForm && (
        <form onSubmit={handleCreate} className="bg-panel border border-border rounded-md p-4 grid grid-cols-2 md:grid-cols-4 gap-4">
          <div>
            <label className="block text-xs font-semibold text-text-dim uppercase mb-1">Nom *</label>
            <Input type="text" value={name} onChange={(e) => setName(e.target.value)} required error={fieldErrors.name} />
          </div>
          <div>
            <label className="block text-xs font-semibold text-text-dim uppercase mb-1">Code *</label>
            <Input type="text" value={code} onChange={(e) => setCode(e.target.value)} required error={fieldErrors.code} />
          </div>
          <div>
            <label className="block text-xs font-semibold text-text-dim uppercase mb-1">Type</label>
            <select value={type} onChange={(e) => setType(e.target.value as MachineType)}
              className="w-full bg-bg border border-border rounded p-2 text-sm text-text focus:outline-none focus:border-cyan-500">
              {MACHINE_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-xs font-semibold text-text-dim uppercase mb-1">Emplacement</label>
            <input type="text" value={location} onChange={(e) => setLocation(e.target.value)}
              className="w-full bg-bg border border-border rounded p-2 text-sm text-text focus:outline-none focus:border-cyan-500" />
          </div>
          {type === 'INJECTION' ? (
            <div>
              <label className="block text-xs font-semibold text-text-dim uppercase mb-1">Cadence (CPH)</label>
              <input type="number" value={nominalCph} onChange={(e) => setNominalCph(e.target.value)}
                className="w-full bg-bg border border-border rounded p-2 text-sm text-text focus:outline-none focus:border-cyan-500" />
            </div>
          ) : (
            <div>
              <label className="block text-xs font-semibold text-text-dim uppercase mb-1">Cadence (BPH)</label>
              <input type="number" value={nominalBph} onChange={(e) => setNominalBph(e.target.value)}
                className="w-full bg-bg border border-border rounded p-2 text-sm text-text focus:outline-none focus:border-cyan-500" />
            </div>
          )}
          <div>
            <label className="block text-xs font-semibold text-text-dim uppercase mb-1">Cavités</label>
            <input type="number" value={cavities} onChange={(e) => setCavities(e.target.value)}
              className="w-full bg-bg border border-border rounded p-2 text-sm text-text focus:outline-none focus:border-cyan-500" />
          </div>
          <div>
            <label className="block text-xs font-semibold text-text-dim uppercase mb-1">Format produit</label>
            <input type="text" value={productFormat} onChange={(e) => setProductFormat(e.target.value)}
              className="w-full bg-bg border border-border rounded p-2 text-sm text-text focus:outline-none focus:border-cyan-500" />
          </div>
          <div className="col-span-full flex justify-end gap-3">
            <button type="button" onClick={() => setShowForm(false)} className="px-4 py-2 rounded text-sm text-text-dim hover:bg-panel-2 transition-colors">
              Annuler
            </button>
            <button type="submit" disabled={isSubmitting}
              className="bg-cyan-500 hover:bg-cyan-600 disabled:opacity-50 text-white px-6 py-2 rounded text-sm font-medium transition-colors">
              {isSubmitting ? 'Création...' : 'Créer'}
            </button>
          </div>
        </form>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {machinesList.map(machine => (
          <MachineCard key={machine.id} machine={machine} onChanged={refresh} />
        ))}
      </div>
    </div>
  );
}
