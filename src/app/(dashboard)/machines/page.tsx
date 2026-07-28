'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { machinesApi } from '@/lib/api/machines';
import { Machine, MachineType, PaginatedResponse } from '@/lib/api/types';
import { useAlertStore } from '@/lib/store/useAlertStore';
import { useAuthStore } from '@/lib/store/useAuthStore';

const MACHINE_TYPES: MachineType[] = ['ISBM', 'INJECTION', 'COMPRESSOR', 'CHILLER', 'DRYER'];

export default function MachinesPage() {
  const [data, setData] = useState<PaginatedResponse<Machine> | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const machineStatus = useAlertStore((state) => state.machineStatus);
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

  useEffect(() => {
    machinesApi.getMachines().then(setData).catch(console.error);
  }, []);

  const refresh = () => machinesApi.getMachines().then(setData).catch(console.error);

  const resetForm = () => {
    setName(''); setCode(''); setType('ISBM'); setNominalBph('0'); setNominalCph('0');
    setCavities('0'); setProductFormat(''); setLocation('');
  };

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
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
    } catch (e) {
      console.error('Failed to create machine', e);
    } finally {
      setIsSubmitting(false);
    }
  };

  const getAndonDot = (machine: Machine) => {
    // Prefer live WS status, fallback to machine.andon_status
    const color = machineStatus[machine.id] || machine.andon_status || 'GREEN';
    switch (color) {
      case 'RED': return 'bg-red-500 shadow-[0_0_12px_rgba(239,68,68,0.8)] animate-pulse';
      case 'ORANGE': return 'bg-orange-500 shadow-[0_0_8px_rgba(249,115,22,0.5)]';
      case 'GREEN': return 'bg-green-500 shadow-[0_0_8px_rgba(34,197,94,0.4)]';
      default: return 'bg-gray-500';
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'RUNNING': return 'bg-green-500/10 text-green-500';
      case 'STOPPED': return 'bg-gray-500/10 text-gray-400';
      case 'MAINTENANCE': return 'bg-orange-500/10 text-orange-500';
      case 'BREAKDOWN': return 'bg-red-500/10 text-red-500';
      default: return 'bg-gray-500/10 text-gray-400';
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
            <input type="text" value={name} onChange={(e) => setName(e.target.value)} required
              className="w-full bg-bg border border-border rounded p-2 text-sm text-text focus:outline-none focus:border-cyan-500" />
          </div>
          <div>
            <label className="block text-xs font-semibold text-text-dim uppercase mb-1">Code *</label>
            <input type="text" value={code} onChange={(e) => setCode(e.target.value)} required
              className="w-full bg-bg border border-border rounded p-2 text-sm text-text focus:outline-none focus:border-cyan-500" />
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
          <Link href={`/machines/${machine.id}`} key={machine.id}>
            <div className="bg-panel border border-border rounded-md p-6 hover:border-cyan-500/50 transition-colors cursor-pointer group">
              <div className="flex justify-between items-start mb-4">
                <div>
                  <h2 className="font-heading font-bold text-xl group-hover:text-cyan-400 transition-colors">{machine.name}</h2>
                  <span className="font-mono text-xs text-text-dim">{machine.code}</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className={`w-4 h-4 rounded-full ${getAndonDot(machine)}`} />
                  <span className={`text-[10px] font-mono px-2 py-0.5 rounded ${getStatusBadge(machine.status)}`}>
                    {machine.status}
                  </span>
                </div>
              </div>
              <div className="space-y-2 text-sm text-text-dim">
                <div className="flex justify-between">
                  <span>Type</span>
                  <span className="font-mono text-text">{machine.type}</span>
                </div>
                <div className="flex justify-between">
                  <span>Cadence nominale</span>
                  <span className="font-mono text-text">
                    {machine.type === 'INJECTION' ? `${machine.nominal_cph} CPH` : `${machine.nominal_bph} BPH`}
                  </span>
                </div>
                {machine.cavities > 0 && (
                  <div className="flex justify-between">
                    <span>Cavités</span>
                    <span className="font-mono text-text">{machine.cavities}</span>
                  </div>
                )}
                {machine.product_format && (
                  <div className="flex justify-between">
                    <span>Format</span>
                    <span className="font-mono text-text">{machine.product_format}</span>
                  </div>
                )}
              </div>
            </div>
          </Link>
        ))}
      </div>
    </div>
  );
}
