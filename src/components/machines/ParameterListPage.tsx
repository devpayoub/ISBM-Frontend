'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { toast } from 'sonner';
import { machinesApi } from '@/lib/api/machines';
import { Machine, MachineComponent, MachineParameter, MachineParameterDisplay } from '@/lib/api/types';
import { errorMessage, parseFieldErrors } from '@/lib/api/errors';
import { Input } from '@/components/ui/input';

const DISPLAY_OPTIONS: { value: MachineParameterDisplay; label: string }[] = [
  { value: 'BAR', label: 'Barre + valeur' },
  { value: 'GAUGE', label: 'Jauge (%)' },
];

function ParameterGauge({ param }: { param: MachineParameter }) {
  const current = param.current_value !== null ? parseFloat(param.current_value) : null;
  const target = param.target_value !== null ? parseFloat(param.target_value) : null;
  const pct = current !== null && target ? Math.min(Math.max((current / target) * 100, 0), 100) : 0;
  const radius = 45;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference - (pct / 100) * circumference;
  const color = param.status === 'WARNING' ? '#f97316' : '#22c55e';

  return (
    <div className="flex flex-col items-center">
      <svg width="110" height="110" viewBox="0 0 120 120">
        <circle cx="60" cy="60" r={radius} fill="none" stroke="currentColor" strokeWidth="8" className="text-border" />
        <circle cx="60" cy="60" r={radius} fill="none" stroke={color} strokeWidth="8"
          strokeDasharray={circumference} strokeDashoffset={offset} strokeLinecap="round"
          transform="rotate(-90 60 60)" className="transition-all duration-1000" />
        <text x="60" y="55" textAnchor="middle" className="fill-text" fontSize="20" fontWeight="bold" fontFamily="monospace">
          {current !== null ? current.toFixed(1) : '—'}
        </text>
        <text x="60" y="72" textAnchor="middle" className="fill-text-dim" fontSize="10" fontFamily="sans-serif">{param.unit}</text>
      </svg>
      <span className="text-xs font-semibold text-text-dim uppercase tracking-wider mt-2 text-center">{param.name}</span>
      {target !== null && <span className="text-[10px] text-text-dim">Cons: {target}{param.unit}</span>}
    </div>
  );
}

function ParameterBar({ param }: { param: MachineParameter }) {
  const current = param.current_value !== null ? parseFloat(param.current_value) : null;
  const target = param.target_value !== null ? parseFloat(param.target_value) : null;
  const pct = current !== null && target ? Math.min(Math.max((current / target) * 100, 0), 100) : 0;
  const barColor = param.status === 'WARNING' ? 'bg-orange-500' : 'bg-green-500';

  return (
    <div className="bg-panel border border-border rounded-md p-4">
      <div className="flex items-center justify-between mb-2">
        <span className="text-sm font-medium text-text">{param.name}</span>
        <span className={`w-2.5 h-2.5 rounded-full shrink-0 ${param.status === 'WARNING' ? 'bg-orange-500' : 'bg-green-500'}`} />
      </div>
      <div className="flex items-baseline justify-between mb-1">
        <span className="font-mono text-lg text-text">{current !== null ? `${current} ${param.unit}` : '—'}</span>
        {target !== null && <span className="text-xs text-text-dim">Cons: {target}</span>}
      </div>
      <div className="w-full h-2 bg-bg rounded-full overflow-hidden">
        <div className={`h-full rounded-full transition-all duration-1000 ${barColor}`} style={{ width: `${pct}%` }} />
      </div>
    </div>
  );
}

interface Crumb { label: string; href?: string }

export function ParameterListPage({ machine, component, canManage, crumbs }: {
  machine: Machine; component: MachineComponent | null; canManage: boolean; crumbs: Crumb[];
}) {
  const [parameters, setParameters] = useState<MachineParameter[]>([]);
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [name, setName] = useState('');
  const [unit, setUnit] = useState('');
  const [display, setDisplay] = useState<MachineParameterDisplay>('BAR');
  const [currentValue, setCurrentValue] = useState('');
  const [targetValue, setTargetValue] = useState('');
  const [tolerance, setTolerance] = useState('10');
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);

  const nodeName = component ? component.name : `Machine ${machine.name}`;

  const refresh = () => {
    const params = component ? { component: component.id } : { machine: machine.id };
    machinesApi.getMachineParameters(params).then((res) => setParameters(res.results)).catch(console.error);
  };

  useEffect(refresh, [machine.id, component?.id]);

  const resetForm = () => {
    setEditingId(null); setName(''); setUnit(''); setDisplay('BAR');
    setCurrentValue(''); setTargetValue(''); setTolerance('10'); setFieldErrors({});
  };

  const startCreate = () => { resetForm(); setShowForm(true); };

  const startEdit = (p: MachineParameter) => {
    setEditingId(p.id);
    setName(p.name);
    setUnit(p.unit || '');
    setDisplay(p.display);
    setCurrentValue(p.current_value ?? '');
    setTargetValue(p.target_value ?? '');
    setTolerance(p.warning_tolerance_pct);
    setFieldErrors({});
    setShowForm(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setFieldErrors({});
    const payload: Partial<MachineParameter> = {
      name, unit, display,
      current_value: currentValue === '' ? null : currentValue,
      target_value: targetValue === '' ? null : targetValue,
      warning_tolerance_pct: tolerance,
      ...(component ? { component: component.id, machine: null } : { machine: machine.id, component: null }),
    };
    try {
      if (editingId) {
        await machinesApi.updateMachineParameter(editingId, payload);
        toast.success('Paramètre mis à jour.');
      } else {
        await machinesApi.createMachineParameter(payload);
        toast.success('Paramètre créé.');
      }
      resetForm();
      setShowForm(false);
      refresh();
    } catch (err) {
      console.error('Failed to save machine parameter', err);
      setFieldErrors(parseFieldErrors(err));
      toast.error(errorMessage(err, "Échec de l'enregistrement."));
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = async (p: MachineParameter) => {
    if (!confirm(`Supprimer le paramètre "${p.name}" ?`)) return;
    try {
      await machinesApi.deleteMachineParameter(p.id);
      refresh();
      toast.success('Paramètre supprimé.');
    } catch (err) {
      console.error('Failed to delete machine parameter', err);
      toast.error(errorMessage(err, 'Échec de la suppression.'));
    }
  };

  return (
    <div className="p-6 space-y-6">
      <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-3">
        <div className="flex items-center gap-2 text-sm text-text-dim flex-wrap">
          {crumbs.map((c, i) => (
            <span key={i} className="flex items-center gap-2">
              {i > 0 && <span>&gt;</span>}
              {c.href ? <Link href={c.href} className="text-cyan-500 hover:text-cyan-400">{c.label}</Link> : <span className="text-text font-medium">{c.label}</span>}
            </span>
          ))}
        </div>
        <Link href={`/machines/${machine.id}`} className="px-4 py-2 rounded text-sm bg-panel border border-border hover:border-cyan-500/50 transition-colors whitespace-nowrap">
          ← Retour à la liste
        </Link>
      </div>

      <h1 className="font-heading font-bold text-2xl uppercase tracking-wide text-text">Fiche Technique : {nodeName}</h1>

      {canManage && (
        <div className="flex justify-end">
          <button onClick={startCreate} className="bg-cyan-500 hover:bg-cyan-600 text-white px-4 py-2 rounded text-sm font-medium transition-colors">
            + Ajouter paramètre
          </button>
        </div>
      )}

      {showForm && canManage && (
        <form onSubmit={handleSubmit} className="bg-panel border border-border rounded-md p-4 grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div>
            <label className="block text-xs font-semibold text-text-dim uppercase mb-1">Nom *</label>
            <Input type="text" value={name} onChange={(e) => setName(e.target.value)} required error={fieldErrors.name} />
          </div>
          <div>
            <label className="block text-xs font-semibold text-text-dim uppercase mb-1">Unité</label>
            <Input type="text" value={unit} onChange={(e) => setUnit(e.target.value)} placeholder="bar, °C, L/min..." error={fieldErrors.unit} />
          </div>
          <div>
            <label className="block text-xs font-semibold text-text-dim uppercase mb-1">Affichage</label>
            <select value={display} onChange={(e) => setDisplay(e.target.value as MachineParameterDisplay)}
              className="w-full bg-bg border border-border rounded p-2 text-sm text-text focus:outline-none focus:border-cyan-500">
              {DISPLAY_OPTIONS.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-xs font-semibold text-text-dim uppercase mb-1">Valeur actuelle</label>
            <Input type="number" step="0.001" value={currentValue} onChange={(e) => setCurrentValue(e.target.value)} error={fieldErrors.current_value} />
          </div>
          <div>
            <label className="block text-xs font-semibold text-text-dim uppercase mb-1">Consigne (cible)</label>
            <Input type="number" step="0.001" value={targetValue} onChange={(e) => setTargetValue(e.target.value)} error={fieldErrors.target_value} />
          </div>
          <div>
            <label className="block text-xs font-semibold text-text-dim uppercase mb-1">Tolérance avertissement (%)</label>
            <Input type="number" step="0.1" value={tolerance} onChange={(e) => setTolerance(e.target.value)} error={fieldErrors.warning_tolerance_pct} />
          </div>
          <div className="col-span-full flex justify-end gap-3">
            <button type="button" onClick={() => { setShowForm(false); resetForm(); }} className="px-4 py-2 rounded text-sm text-text-dim hover:bg-panel-2 transition-colors">
              Annuler
            </button>
            <button type="submit" disabled={isSubmitting} className="bg-cyan-500 hover:bg-cyan-600 disabled:opacity-50 text-white px-6 py-2 rounded text-sm font-medium transition-colors">
              {isSubmitting ? 'Enregistrement...' : editingId ? 'Enregistrer' : 'Créer'}
            </button>
          </div>
        </form>
      )}

      {parameters.length === 0 ? (
        <p className="text-sm text-text-dim">Aucun paramètre mesuré pour cet équipement.</p>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {parameters.map((p) => (
            <div key={p.id}>
              {p.display === 'GAUGE' ? (
                <div className="bg-panel border border-border rounded-md p-4">
                  <ParameterGauge param={p} />
                </div>
              ) : (
                <ParameterBar param={p} />
              )}
              {canManage && (
                <div className="flex gap-3 mt-2 px-1">
                  <button onClick={() => startEdit(p)} className="text-cyan-500 hover:text-cyan-400 text-xs font-medium">Modifier</button>
                  <button onClick={() => handleDelete(p)} className="text-red-500 hover:text-red-400 text-xs font-medium">Supprimer</button>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
