'use client';

import { useEffect, useState } from 'react';
import { toast } from 'sonner';
import { reclamationApi } from '@/lib/api/reclamation';
import { stockApi } from '@/lib/api/stock';
import { machinesApi } from '@/lib/api/machines';
import {
  Reclamation, ReclamationSeverity, ReclamationStatus, ResolvedPersonnel,
  StockItem, Machine,
} from '@/lib/api/types';
import { errorMessage, parseFieldErrors } from '@/lib/api/errors';
import { Input } from '@/components/ui/input';

const SEVERITIES: ReclamationSeverity[] = ['CRITICAL', 'MAJOR', 'MINOR'];
const SEVERITY_LABELS: Record<ReclamationSeverity, string> = {
  CRITICAL: 'Critique', MAJOR: 'Majeur', MINOR: 'Mineur',
};
const SEVERITY_BADGE: Record<ReclamationSeverity, string> = {
  CRITICAL: 'bg-red-500/10 text-red-500',
  MAJOR: 'bg-orange-500/10 text-orange-500',
  MINOR: 'bg-yellow-500/10 text-yellow-500',
};
const STATUS_LABELS: Record<ReclamationStatus, string> = {
  OPEN: 'Ouverte', INVESTIGATING: 'En investigation', CORRECTED: 'Corrigée', CLOSED: 'Clôturée',
};
const STATUS_BADGE: Record<ReclamationStatus, string> = {
  OPEN: 'bg-red-500/10 text-red-500',
  INVESTIGATING: 'bg-orange-500/10 text-orange-500',
  CORRECTED: 'bg-cyan-500/10 text-cyan-400',
  CLOSED: 'bg-green-500/10 text-green-500',
};

export default function ReclamationPage() {
  const [reclamations, setReclamations] = useState<Reclamation[]>([]);
  const [statusFilter, setStatusFilter] = useState('');
  const [search, setSearch] = useState('');
  const [selected, setSelected] = useState<Reclamation | null>(null);
  const [creating, setCreating] = useState(false);
  const [stockItems, setStockItems] = useState<StockItem[]>([]);
  const [machines, setMachines] = useState<Machine[]>([]);

  const refresh = () => {
    const params: Record<string, string> = {};
    if (statusFilter) params.status = statusFilter;
    if (search) params.search = search;
    reclamationApi.getReclamations(Object.keys(params).length ? params : undefined).then((res) => setReclamations(res.results)).catch(console.error);
  };

  useEffect(() => {
    stockApi.getItems({ is_active: 'true' }).then((res) => setStockItems(res.results)).catch(console.error);
    machinesApi.getMachines().then((res) => setMachines(res.results)).catch(console.error);
  }, []);

  useEffect(() => {
    refresh();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [statusFilter, search]);

  const openCreate = () => {
    setSelected(null);
    setCreating(true);
  };

  const openDetail = (r: Reclamation) => {
    setCreating(false);
    setSelected(r);
  };

  const afterSave = (r: Reclamation) => {
    setCreating(false);
    setSelected(r);
    refresh();
  };

  return (
    <div className="p-6 space-y-6">
      <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-3">
        <h1 className="font-heading font-bold text-2xl uppercase tracking-wide text-text">Réclamations</h1>
        <button onClick={openCreate} className="bg-cyan-500 hover:bg-cyan-600 text-white px-4 py-2 rounded text-sm font-medium transition-colors whitespace-nowrap">
          + Nouvelle réclamation
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-[380px_1fr] gap-6 items-start">
        <div className="space-y-4">
          <div className="bg-panel border border-border rounded-md p-4 space-y-3">
            <Input type="text" placeholder="Rechercher (référence, client, description)..." value={search} onChange={(e) => setSearch(e.target.value)} />
            <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)}
              className="w-full bg-bg border border-border rounded p-2 text-sm text-text focus:outline-none focus:border-cyan-500">
              <option value="">Tous les statuts</option>
              {(Object.keys(STATUS_LABELS) as ReclamationStatus[]).map((s) => <option key={s} value={s}>{STATUS_LABELS[s]}</option>)}
            </select>
          </div>

          <div className="bg-panel border border-border rounded-md p-4">
            {reclamations.length === 0 ? (
              <p className="text-sm text-text-dim">Aucune réclamation.</p>
            ) : (
              <div className="space-y-1 max-h-[600px] overflow-auto">
                {reclamations.map((r) => (
                  <button key={r.id} onClick={() => openDetail(r)}
                    className={`w-full text-left p-3 rounded border transition-colors ${
                      selected?.id === r.id ? 'bg-panel-2 border-cyan-500' : 'border-border/50 hover:bg-panel-2/50'
                    }`}>
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-sm font-medium text-text font-mono">{r.reference}</span>
                      <span className={`text-[10px] font-mono px-1.5 py-0.5 rounded shrink-0 ${STATUS_BADGE[r.status]}`}>{STATUS_LABELS[r.status]}</span>
                    </div>
                    <div className="text-xs text-text-dim mt-0.5">{r.client}</div>
                    <div className="flex items-center justify-between gap-2 mt-1">
                      <span className="text-[10px] text-text-dim">{new Date(r.reported_at).toLocaleDateString()}</span>
                      <span className={`text-[10px] font-mono px-1.5 py-0.5 rounded ${SEVERITY_BADGE[r.severity]}`}>{SEVERITY_LABELS[r.severity]}</span>
                    </div>
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>

        {creating ? (
          <ReclamationForm stockItems={stockItems} machines={machines} onSaved={afterSave} onCancel={() => setCreating(false)} />
        ) : selected ? (
          <ReclamationDetail reclamation={selected} onUpdated={(r) => { setSelected(r); refresh(); }} />
        ) : (
          <div className="bg-panel border border-border rounded-md p-6 flex items-center justify-center min-h-[200px]">
            <p className="text-sm text-text-dim text-center max-w-sm">Sélectionnez une réclamation dans la liste, ou créez-en une nouvelle.</p>
          </div>
        )}
      </div>
    </div>
  );
}

function PersonnelPreview({ data, loading }: { data: ResolvedPersonnel | null; loading: boolean }) {
  if (loading) return <p className="text-xs text-text-dim mt-2">Recherche du personnel...</p>;
  if (!data) return null;
  const names = (list?: { id: number; name: string }[]) => (list && list.length > 0 ? list.map((p) => p.name).join(', ') : '—');
  return (
    <div className="mt-2 bg-bg border border-border rounded p-3 text-xs text-text-dim space-y-1">
      <div className="flex justify-between"><span>Date</span><span className="font-mono text-text">{data.date || '—'}</span></div>
      <div className="flex justify-between"><span>Heure</span><span className="font-mono text-text">{data.hour_label || '—'}</span></div>
      <div className="flex justify-between"><span>Shift</span><span className="font-mono text-text">{data.shift || '—'}</span></div>
      <div className="flex justify-between"><span>Machine</span><span className="font-mono text-text">{data.machine || '—'}</span></div>
      <div className="flex justify-between"><span>Maintenance</span><span className="font-mono text-text text-right">{names(data.maintenance)}</span></div>
      <div className="flex justify-between"><span>Contrôleur</span><span className="font-mono text-text text-right">{names(data.controller)}</span></div>
      <div className="flex justify-between"><span>Production</span><span className="font-mono text-text text-right">{names(data.production)}</span></div>
    </div>
  );
}

function ReclamationForm({ stockItems, machines, onSaved, onCancel }: {
  stockItems: StockItem[]; machines: Machine[]; onSaved: (r: Reclamation) => void; onCancel: () => void;
}) {
  const [client, setClient] = useState('');
  const [description, setDescription] = useState('');
  const [stockItemId, setStockItemId] = useState('');
  const [productReference, setProductReference] = useState('');
  const [machineId, setMachineId] = useState('');
  const [productionAt, setProductionAt] = useState('');
  const [severity, setSeverity] = useState<ReclamationSeverity>('MAJOR');
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [submitting, setSubmitting] = useState(false);
  const [preview, setPreview] = useState<ResolvedPersonnel | null>(null);
  const [previewLoading, setPreviewLoading] = useState(false);

  useEffect(() => {
    if (!machineId || !productionAt) { setPreview(null); return; }
    const t = setTimeout(() => {
      setPreviewLoading(true);
      const iso = new Date(productionAt).toISOString();
      reclamationApi.resolvePersonnelPreview(iso, Number(machineId))
        .then(setPreview)
        .catch(() => setPreview(null))
        .finally(() => setPreviewLoading(false));
    }, 400);
    return () => clearTimeout(t);
  }, [machineId, productionAt]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    setFieldErrors({});
    try {
      const created = await reclamationApi.createReclamation({
        client, description,
        stock_item: stockItemId ? Number(stockItemId) : null,
        product_reference: productReference,
        machine: machineId ? Number(machineId) : null,
        production_at: productionAt ? new Date(productionAt).toISOString() : null,
        severity,
      });
      toast.success('Réclamation créée.');
      onSaved(created);
    } catch (err) {
      console.error('Failed to create reclamation', err);
      setFieldErrors(parseFieldErrors(err));
      toast.error(errorMessage(err, 'Échec de la création.'));
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="bg-panel border border-border rounded-md p-6 space-y-4">
      <h2 className="font-heading font-bold text-lg text-text">Nouvelle réclamation</h2>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <label className="block text-xs font-semibold text-text-dim uppercase mb-1">Client *</label>
          <Input type="text" value={client} onChange={(e) => setClient(e.target.value)} required error={fieldErrors.client} />
        </div>
        <div>
          <label className="block text-xs font-semibold text-text-dim uppercase mb-1">Sévérité</label>
          <select value={severity} onChange={(e) => setSeverity(e.target.value as ReclamationSeverity)}
            className="w-full bg-bg border border-border rounded p-2 text-sm text-text focus:outline-none focus:border-cyan-500">
            {SEVERITIES.map((s) => <option key={s} value={s}>{SEVERITY_LABELS[s]}</option>)}
          </select>
        </div>
      </div>

      <div>
        <label className="block text-xs font-semibold text-text-dim uppercase mb-1">Description du problème *</label>
        <textarea value={description} onChange={(e) => setDescription(e.target.value)} rows={3} required
          className="w-full bg-bg border border-border rounded p-2 text-sm text-text focus:outline-none focus:border-cyan-500" />
        {fieldErrors.description && <p className="text-xs text-destructive mt-1">{fieldErrors.description}</p>}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <label className="block text-xs font-semibold text-text-dim uppercase mb-1">Référence matière/stock affectée</label>
          <select value={stockItemId} onChange={(e) => setStockItemId(e.target.value)}
            className="w-full bg-bg border border-border rounded p-2 text-sm text-text focus:outline-none focus:border-cyan-500">
            <option value="">Aucune</option>
            {stockItems.map((s) => <option key={s.id} value={s.id}>{s.name} ({s.reference})</option>)}
          </select>
        </div>
        <div>
          <label className="block text-xs font-semibold text-text-dim uppercase mb-1">Référence produit/bouteille (optionnel)</label>
          <Input type="text" value={productReference} onChange={(e) => setProductReference(e.target.value)} error={fieldErrors.product_reference} />
        </div>
      </div>

      <div className="border-t border-border/50 pt-4">
        <h3 className="text-xs font-semibold text-text-dim uppercase mb-3">Contexte de production (si connu) — pour identifier le personnel en poste</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-semibold text-text-dim uppercase mb-1">Machine / ligne</label>
            <select value={machineId} onChange={(e) => setMachineId(e.target.value)}
              className="w-full bg-bg border border-border rounded p-2 text-sm text-text focus:outline-none focus:border-cyan-500">
              <option value="">Inconnue</option>
              {machines.map((m) => <option key={m.id} value={m.id}>{m.name} ({m.code})</option>)}
            </select>
          </div>
          <div>
            <label className="block text-xs font-semibold text-text-dim uppercase mb-1">Date / heure de production</label>
            <input type="datetime-local" value={productionAt} onChange={(e) => setProductionAt(e.target.value)}
              className="w-full bg-bg border border-border rounded p-2 text-sm text-text focus:outline-none focus:border-cyan-500" />
          </div>
        </div>
        <PersonnelPreview data={preview} loading={previewLoading} />
      </div>

      <div className="flex justify-end gap-3 pt-2">
        <button type="button" onClick={onCancel} className="px-4 py-2 rounded text-sm text-text-dim hover:bg-panel-2 transition-colors">
          Annuler
        </button>
        <button type="submit" disabled={submitting} className="bg-cyan-500 hover:bg-cyan-600 disabled:opacity-50 text-white px-6 py-2 rounded text-sm font-medium transition-colors">
          {submitting ? 'Création...' : 'Créer'}
        </button>
      </div>
    </form>
  );
}

function ReclamationDetail({ reclamation, onUpdated }: { reclamation: Reclamation; onUpdated: (r: Reclamation) => void }) {
  const [resolution, setResolution] = useState('');
  const [closing, setClosing] = useState(false);

  const handleClose = async (e: React.FormEvent) => {
    e.preventDefault();
    setClosing(true);
    try {
      const updated = await reclamationApi.closeReclamation(reclamation.id, resolution);
      toast.success('Réclamation clôturée.');
      onUpdated(updated);
    } catch (err) {
      console.error('Failed to close reclamation', err);
      toast.error(errorMessage(err, 'Échec de la clôture.'));
    } finally {
      setClosing(false);
    }
  };

  const p = reclamation.resolved_personnel;
  const names = (list?: { id: number; name: string }[]) => (list && list.length > 0 ? list.map((x) => x.name).join(', ') : '—');

  return (
    <div className="bg-panel border border-border rounded-md p-6 space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 className="font-heading font-bold text-lg text-text font-mono">{reclamation.reference}</h2>
          <p className="text-xs text-text-dim mt-1">{reclamation.client} • {new Date(reclamation.reported_at).toLocaleString()}</p>
        </div>
        <div className="flex gap-2">
          <span className={`text-xs font-mono px-2 py-1 rounded ${SEVERITY_BADGE[reclamation.severity]}`}>{SEVERITY_LABELS[reclamation.severity]}</span>
          <span className={`text-xs font-mono px-2 py-1 rounded ${STATUS_BADGE[reclamation.status]}`}>{STATUS_LABELS[reclamation.status]}</span>
        </div>
      </div>

      <div>
        <h3 className="text-xs font-semibold text-text-dim tracking-wider uppercase mb-1">Description</h3>
        <p className="text-sm text-text">{reclamation.description}</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
        <div className="flex justify-between border-b border-border/30 py-1">
          <span className="text-text-dim">Matière/stock affecté</span>
          <span className="font-mono text-text">{reclamation.stock_item_name ? `${reclamation.stock_item_name} (${reclamation.stock_item_reference})` : '—'}</span>
        </div>
        <div className="flex justify-between border-b border-border/30 py-1">
          <span className="text-text-dim">Produit/bouteille</span>
          <span className="font-mono text-text">{reclamation.product_reference || '—'}</span>
        </div>
        <div className="flex justify-between border-b border-border/30 py-1">
          <span className="text-text-dim">Machine</span>
          <span className="font-mono text-text">{reclamation.machine_code || '—'}</span>
        </div>
        <div className="flex justify-between border-b border-border/30 py-1">
          <span className="text-text-dim">Production</span>
          <span className="font-mono text-text">{reclamation.production_at ? new Date(reclamation.production_at).toLocaleString() : '—'}</span>
        </div>
      </div>

      {(p?.maintenance || p?.controller || p?.production) && (
        <div>
          <h3 className="text-xs font-semibold text-text-dim tracking-wider uppercase mb-2">Personnel en poste (au moment de la production)</h3>
          <div className="bg-bg border border-border rounded p-3 text-xs text-text-dim space-y-1">
            <div className="flex justify-between"><span>Date</span><span className="font-mono text-text">{p.date || '—'}</span></div>
            <div className="flex justify-between"><span>Heure</span><span className="font-mono text-text">{p.hour_label || '—'}</span></div>
            <div className="flex justify-between"><span>Shift</span><span className="font-mono text-text">{p.shift || '—'}</span></div>
            <div className="flex justify-between"><span>Machine</span><span className="font-mono text-text">{p.machine || '—'}</span></div>
            <div className="flex justify-between"><span>Maintenance</span><span className="font-mono text-text text-right">{names(p.maintenance)}</span></div>
            <div className="flex justify-between"><span>Contrôleur</span><span className="font-mono text-text text-right">{names(p.controller)}</span></div>
            <div className="flex justify-between"><span>Production</span><span className="font-mono text-text text-right">{names(p.production)}</span></div>
          </div>
        </div>
      )}

      {reclamation.status === 'CLOSED' ? (
        <div className="bg-green-500/5 border border-green-500/20 rounded p-3">
          <p className="text-xs text-text-dim mb-1">Résolution — clôturée par {reclamation.closed_by_name || '—'} le {reclamation.closed_at ? new Date(reclamation.closed_at).toLocaleString() : ''}</p>
          <p className="text-sm text-text">{reclamation.resolution}</p>
        </div>
      ) : (
        <form onSubmit={handleClose} className="border-t border-border/50 pt-4 space-y-3">
          <label className="block text-xs font-semibold text-text-dim uppercase mb-1">Résolution / action</label>
          <textarea value={resolution} onChange={(e) => setResolution(e.target.value)} rows={3} required
            className="w-full bg-bg border border-border rounded p-2 text-sm text-text focus:outline-none focus:border-cyan-500" />
          <div className="flex justify-end">
            <button type="submit" disabled={closing} className="bg-cyan-500 hover:bg-cyan-600 disabled:opacity-50 text-white px-6 py-2 rounded text-sm font-medium transition-colors">
              {closing ? 'Clôture...' : 'Clôturer la réclamation'}
            </button>
          </div>
        </form>
      )}
    </div>
  );
}
