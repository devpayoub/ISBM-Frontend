'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { toast } from 'sonner';
import { machinesApi } from '@/lib/api/machines';
import { productionApi } from '@/lib/api/production';
import { alertsApi } from '@/lib/api/alerts';
import { Machine, MachineStatus, MachineType, PaginatedResponse } from '@/lib/api/types';
import { useAlertStore } from '@/lib/store/useAlertStore';
import { useAuthStore } from '@/lib/store/useAuthStore';
import { errorMessage, parseFieldErrors } from '@/lib/api/errors';
import { Input } from '@/components/ui/input';
import { connectWebSocket, disconnectWebSocket } from '@/lib/ws/client';

const MACHINE_TYPES: MachineType[] = ['ISBM', 'INJECTION', 'COMPRESSOR', 'CHILLER', 'DRYER'];
// Utility equipment (compressor/chiller/dryer) doesn't produce bottles — the
// pace bar and today's-output stat only make sense for lines that do.
const PRODUCTION_TYPES: MachineType[] = ['ISBM', 'INJECTION'];
const STATUS_OPTIONS: MachineStatus[] = ['RUNNING', 'STOPPED', 'MAINTENANCE', 'BREAKDOWN'];

export default function MachinesPage() {
  const [data, setData] = useState<PaginatedResponse<Machine> | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [perMachineToday, setPerMachineToday] = useState<Record<string, number>>({});
  const [statusUpdating, setStatusUpdating] = useState<number | null>(null);
  const machineStatus = useAlertStore((state) => state.machineStatus);
  const liveAlerts = useAlertStore((state) => state.liveAlerts);
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
    productionApi.getDailySummary(new Date().toISOString().split('T')[0])
      .then((res) => setPerMachineToday(res.per_machine || {})).catch(console.error);
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

  const handleStatusChange = async (machine: Machine, status: MachineStatus) => {
    setStatusUpdating(machine.id);
    try {
      await machinesApi.updateStatus(machine.id, status);
      await refresh();
      toast.success(`${machine.name} → ${status}`);
    } catch (err) {
      toast.error(errorMessage(err, 'Échec du changement de statut.'));
    } finally {
      setStatusUpdating(null);
    }
  };

  // "Current BPH vs nominal" as an honest, always-available number: today's
  // cumulative output vs. what nominal rate would have produced by now —
  // there's no live instantaneous-rate feed, so pace-so-far is the closest
  // truthful stand-in (matches Plan_Frontend's "animated bar" intent without
  // inventing a metric the backend doesn't actually compute).
  const getPace = (machine: Machine) => {
    const nominal = machine.type === 'INJECTION' ? machine.nominal_cph : machine.nominal_bph;
    const today = perMachineToday[machine.code] || 0;
    const now = new Date();
    const midnight = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const hoursElapsed = Math.max((now.getTime() - midnight.getTime()) / 3600000, 1 / 60);
    const expected = Math.round(nominal * hoursElapsed);
    const pct = expected > 0 ? Math.min((today / expected) * 100, 100) : 0;
    return { today, expected, pct };
  };

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
        {machinesList.map(machine => {
          const machineAlerts = liveAlerts.filter((a) => a.machine === machine.id);
          const topAlert = machineAlerts[0];
          const canOpenAlert = user?.role === 'ADMIN' || user?.role === 'MANAGER' || user?.role === 'CONTROLLER';
          const isProduction = PRODUCTION_TYPES.includes(machine.type);
          const pace = isProduction ? getPace(machine) : null;
          const paceBarColor = pace && pace.pct >= 90 ? 'bg-green-500' : pace && pace.pct >= 60 ? 'bg-orange-500' : 'bg-red-500';

          const equipmentBorder = machine.equipment_status === 'WARNING' ? 'border-l-4 border-l-orange-500' : 'border-l-4 border-l-green-500';

          return (
          <div key={machine.id} className={`bg-panel border rounded-md overflow-hidden transition-colors group ${equipmentBorder} ${topAlert ? 'border-red-500/50' : 'border-border hover:border-cyan-500/50'}`}>
            {topAlert && (
              canOpenAlert ? (
                <Link href={`/alerts/${topAlert.id}`} className="flex items-center justify-between gap-2 bg-red-500/10 border-b border-red-500/30 px-4 py-2 text-xs hover:bg-red-500/15 transition-colors">
                  <span className="text-red-400 font-medium truncate">⚠ {topAlert.title}</span>
                  {machineAlerts.length > 1 && <span className="text-red-400/70 font-mono shrink-0">+{machineAlerts.length - 1}</span>}
                </Link>
              ) : (
                <div className="flex items-center justify-between gap-2 bg-red-500/10 border-b border-red-500/30 px-4 py-2 text-xs">
                  <span className="text-red-400 font-medium truncate">⚠ {topAlert.title}</span>
                  {machineAlerts.length > 1 && <span className="text-red-400/70 font-mono shrink-0">+{machineAlerts.length - 1}</span>}
                </div>
              )
            )}
            <div className="p-6">
              <div className="mb-4">
                <Link href={`/machines/${machine.id}`}>
                  <h2 className="font-heading font-bold text-xl group-hover:text-cyan-400 transition-colors">{machine.name}</h2>
                  <span className="font-mono text-xs text-text-dim">{machine.code}</span>
                </Link>
                <div className="flex items-center gap-2 mt-2">
                  <div className={`w-3 h-3 rounded-full shrink-0 ${getAndonDot(machine)}`} />
                  {canManage ? (
                    <select
                      value={machine.status}
                      disabled={statusUpdating === machine.id}
                      onChange={(e) => handleStatusChange(machine, e.target.value as MachineStatus)}
                      onClick={(e) => e.stopPropagation()}
                      className={`text-[10px] font-mono px-1.5 py-0.5 rounded border-0 focus:outline-none focus:ring-1 focus:ring-cyan-500 disabled:opacity-50 ${getStatusBadge(machine.status)}`}
                    >
                      {STATUS_OPTIONS.map((s) => <option key={s} value={s}>{s}</option>)}
                    </select>
                  ) : (
                    <span className={`text-[10px] font-mono px-2 py-0.5 rounded ${getStatusBadge(machine.status)}`}>
                      {machine.status}
                    </span>
                  )}
                </div>
                <div className="flex items-center justify-between mt-2 text-xs text-text-dim">
                  <span>Équipements: <span className="font-mono text-text">{machine.component_count}</span></span>
                  <span className={`font-mono px-1.5 py-0.5 rounded text-[10px] ${machine.equipment_status === 'WARNING' ? 'bg-orange-500/10 text-orange-500' : 'bg-green-500/10 text-green-500'}`}>
                    {machine.equipment_status === 'WARNING' ? 'Avertissement' : 'OK'}
                  </span>
                </div>
              </div>

              {pace && (
                <div className="mb-4">
                  <div className="flex justify-between items-baseline mb-1">
                    <span className="text-xs text-text-dim">Production du jour</span>
                    <span className="font-mono text-sm text-text">{pace.today} / {pace.expected} <span className="text-text-dim">attendu</span></span>
                  </div>
                  <div className="w-full h-2 bg-bg rounded-full overflow-hidden">
                    <div className={`h-full rounded-full transition-all duration-1000 ${paceBarColor}`} style={{ width: `${pace.pct}%` }} />
                  </div>
                </div>
              )}

              <Link href={`/machines/${machine.id}`} className="block space-y-2 text-sm text-text-dim">
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
              </Link>
            </div>
          </div>
          );
        })}
      </div>
    </div>
  );
}
