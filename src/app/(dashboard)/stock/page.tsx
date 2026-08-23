'use client';

import { useEffect, useState } from 'react';
import { toast } from 'sonner';
import { stockApi } from '@/lib/api/stock';
import { catalogApi } from '@/lib/api/catalog';
import { BottleCapacity, StockItem, StockItemType, StockMovementType } from '@/lib/api/types';
import { errorMessage, parseFieldErrors } from '@/lib/api/errors';
import { Input } from '@/components/ui/input';

const STATUS_BADGE: Record<string, string> = {
  IN_STOCK: 'bg-green-500/10 text-green-500',
  LOW: 'bg-orange-500/10 text-orange-500',
  RUPTURE: 'bg-red-500/10 text-red-500',
};
const STATUS_LABEL: Record<string, string> = {
  IN_STOCK: 'En stock',
  LOW: 'Stock bas',
  RUPTURE: 'Rupture',
};
const MOVEMENT_LABEL: Record<StockMovementType, string> = {
  RECEIPT: 'Réception',
  CONSUMPTION: 'Consommation',
  ADJUSTMENT: 'Ajustement',
};

export default function StockPage() {
  const [tab, setTab] = useState<StockItemType>('RAW_MATERIAL');
  const [search, setSearch] = useState('');
  const [items, setItems] = useState<StockItem[]>([]);

  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [name, setName] = useState('');
  const [reference, setReference] = useState('');
  const [supplier, setSupplier] = useState('');
  const [ral, setRal] = useState('');
  const [unit, setUnit] = useState('kg');
  const [initialQuantity, setInitialQuantity] = useState('0');
  const [minThreshold, setMinThreshold] = useState('0');
  const [batch, setBatch] = useState('');
  const [receivedAt, setReceivedAt] = useState('');
  const [notes, setNotes] = useState('');
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);

  const [moveItem, setMoveItem] = useState<StockItem | null>(null);
  const [historyItem, setHistoryItem] = useState<StockItem | null>(null);
  const [capacity, setCapacity] = useState<BottleCapacity[]>([]);

  const refresh = () => {
    stockApi.getItems({ type: tab, is_active: 'true' }).then((res) => setItems(res.results)).catch(console.error);
    catalogApi.getCapacity().then(setCapacity).catch(console.error);
  };

  useEffect(() => {
    refresh();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tab]);

  const resetForm = () => {
    setEditingId(null);
    setName(''); setReference(''); setSupplier(''); setRal(''); setUnit('kg');
    setInitialQuantity('0');
    setMinThreshold('0'); setBatch(''); setReceivedAt(''); setNotes('');
    setFieldErrors({});
  };

  const startCreate = () => {
    resetForm();
    setShowForm(true);
  };

  const startEdit = (item: StockItem) => {
    setEditingId(item.id);
    setName(item.name); setReference(item.reference); setSupplier(item.supplier);
    setRal(item.ral); setUnit(item.unit); setMinThreshold(item.min_threshold);
    setBatch(item.batch); setReceivedAt(item.received_at || ''); setNotes(item.notes);
    setFieldErrors({});
    setShowForm(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setFieldErrors({});
    const payload = {
      type: tab, name, reference, supplier,
      ral: tab === 'COLORANT' ? ral : '',
      unit, min_threshold: minThreshold, batch,
      received_at: receivedAt || null, notes,
    };
    try {
      if (editingId) {
        await stockApi.updateItem(editingId, payload);
        toast.success('Article mis à jour.');
      } else {
        const created = await stockApi.createItem(payload);
        const startQty = parseFloat(initialQuantity) || 0;
        if (startQty > 0) {
          await stockApi.move(created.id, { type: 'RECEIPT', delta: startQty.toString(), reason: 'Quantité initiale' });
        }
        toast.success('Article créé.');
      }
      resetForm();
      setShowForm(false);
      await refresh();
    } catch (err) {
      console.error('Failed to save stock item', err);
      setFieldErrors(parseFieldErrors(err));
      toast.error(errorMessage(err, "Échec de l'enregistrement."));
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleArchive = async (item: StockItem) => {
    if (!confirm(`Archiver "${item.name}" ? L'historique des mouvements sera conservé.`)) return;
    try {
      await stockApi.archiveItem(item.id);
      await refresh();
      toast.success('Article archivé.');
    } catch (err) {
      console.error('Failed to archive stock item', err);
      toast.error(errorMessage(err, "Échec de l'archivage."));
    }
  };

  const filtered = items.filter((item) => {
    const q = search.trim().toLowerCase();
    if (!q) return true;
    return item.name.toLowerCase().includes(q) || item.reference.toLowerCase().includes(q) || item.supplier.toLowerCase().includes(q);
  });

  return (
    <div className="p-6 space-y-6">
      <h1 className="font-heading font-bold text-2xl uppercase tracking-wide text-text">Stock</h1>

      <div className="flex gap-1 bg-bg border border-border rounded-md p-1 w-fit">
        <button
          onClick={() => setTab('RAW_MATERIAL')}
          className={`px-4 py-2 rounded text-sm font-medium transition-colors ${tab === 'RAW_MATERIAL' ? 'bg-panel text-text shadow' : 'text-text-dim hover:text-text'}`}
        >
          Matière première
        </button>
        <button
          onClick={() => setTab('COLORANT')}
          className={`px-4 py-2 rounded text-sm font-medium transition-colors ${tab === 'COLORANT' ? 'bg-panel text-text shadow' : 'text-text-dim hover:text-text'}`}
        >
          Colorant
        </button>
      </div>

      {capacity.length > 0 && (
        <div className="bg-panel border border-border rounded-md p-6">
          <h2 className="text-sm font-semibold text-text-dim tracking-wider uppercase mb-4">Capacité de production (depuis le stock actuel)</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {capacity.map((c) => (
              <div key={c.id} className="bg-bg border border-border rounded p-4">
                <div className="font-heading font-bold text-text">{c.category}</div>
                <div className="font-mono text-3xl font-bold mt-2 text-cyan-500">{c.max_producible}</div>
                <div className="text-xs text-text-dim">bouteilles restantes possibles</div>
                {c.physical_capacity > c.max_producible && (
                  <div className="text-[10px] text-text-dim mt-0.5">{c.physical_capacity} sans réservations d'autres commandes</div>
                )}
                {c.limiting_component && (
                  <div className="text-[10px] text-yellow-500 mt-0.5">limité par {c.limiting_component_name} ({c.limiting_component})</div>
                )}
                <div className="text-xs text-text-dim mt-2 space-y-0.5">
                  <div>MP {c.raw_material_reference}: {c.raw_material_available_kg} kg</div>
                  {c.colorant_reference && <div>Col {c.colorant_reference}: {c.colorant_available_kg} kg</div>}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="bg-panel border border-border rounded-md p-6">
        <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-3 mb-6">
          <Input type="text" placeholder="Rechercher (nom, référence, fournisseur)..." value={search}
            onChange={(e) => setSearch(e.target.value)} className="w-72" />
          <button onClick={startCreate} className="bg-cyan-500 hover:bg-cyan-600 text-white px-4 py-2 rounded text-sm font-medium transition-colors whitespace-nowrap">
            + Nouvel article
          </button>
        </div>

        {showForm && (
          <form onSubmit={handleSubmit} className="bg-panel-2 border border-border rounded-md p-4 grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
            <div>
              <label className="block text-xs font-semibold text-text-dim uppercase mb-1">
                {tab === 'COLORANT' ? 'Nom couleur *' : 'Nom matière *'}
              </label>
              <Input type="text" value={name} onChange={(e) => setName(e.target.value)} required error={fieldErrors.name} />
            </div>
            <div>
              <label className="block text-xs font-semibold text-text-dim uppercase mb-1">Référence *</label>
              <Input type="text" value={reference} onChange={(e) => setReference(e.target.value)} required error={fieldErrors.reference} />
            </div>
            <div>
              <label className="block text-xs font-semibold text-text-dim uppercase mb-1">Fournisseur</label>
              <input type="text" value={supplier} onChange={(e) => setSupplier(e.target.value)}
                className="w-full bg-bg border border-border rounded p-2 text-sm text-text focus:outline-none focus:border-cyan-500" />
            </div>
            {tab === 'COLORANT' && (
              <div>
                <label className="block text-xs font-semibold text-text-dim uppercase mb-1">RAL</label>
                <input type="text" value={ral} onChange={(e) => setRal(e.target.value)} placeholder="RAL 9010"
                  className="w-full bg-bg border border-border rounded p-2 text-sm text-text focus:outline-none focus:border-cyan-500" />
              </div>
            )}
            <div>
              <label className="block text-xs font-semibold text-text-dim uppercase mb-1">Unité</label>
              <input type="text" value={unit} onChange={(e) => setUnit(e.target.value)} placeholder="kg"
                className="w-full bg-bg border border-border rounded p-2 text-sm text-text focus:outline-none focus:border-cyan-500" />
            </div>
            {!editingId && (
              <div>
                <label className="block text-xs font-semibold text-text-dim uppercase mb-1">Quantité initiale ({unit || 'kg'})</label>
                <input type="number" step="0.001" min="0" value={initialQuantity} onChange={(e) => setInitialQuantity(e.target.value)}
                  className="w-full bg-bg border border-border rounded p-2 text-sm text-text focus:outline-none focus:border-cyan-500" />
              </div>
            )}
            <div>
              <label className="block text-xs font-semibold text-text-dim uppercase mb-1">Seuil minimum</label>
              <input type="number" step="0.001" value={minThreshold} onChange={(e) => setMinThreshold(e.target.value)}
                className="w-full bg-bg border border-border rounded p-2 text-sm text-text focus:outline-none focus:border-cyan-500" />
            </div>
            <div>
              <label className="block text-xs font-semibold text-text-dim uppercase mb-1">Lot (optionnel)</label>
              <input type="text" value={batch} onChange={(e) => setBatch(e.target.value)}
                className="w-full bg-bg border border-border rounded p-2 text-sm text-text focus:outline-none focus:border-cyan-500" />
            </div>
            {tab === 'RAW_MATERIAL' && (
              <div>
                <label className="block text-xs font-semibold text-text-dim uppercase mb-1">Date de réception (optionnel)</label>
                <input type="date" value={receivedAt} onChange={(e) => setReceivedAt(e.target.value)}
                  className="w-full bg-bg border border-border rounded p-2 text-sm text-text focus:outline-none focus:border-cyan-500" />
              </div>
            )}
            <div className="col-span-full">
              <label className="block text-xs font-semibold text-text-dim uppercase mb-1">Notes</label>
              <textarea value={notes} onChange={(e) => setNotes(e.target.value)} rows={2}
                className="w-full bg-bg border border-border rounded p-2 text-sm text-text focus:outline-none focus:border-cyan-500" />
            </div>
            <div className="col-span-full flex justify-end gap-3">
              <button type="button" onClick={() => { setShowForm(false); resetForm(); }} className="px-4 py-2 rounded text-sm text-text-dim hover:bg-panel transition-colors">
                Annuler
              </button>
              <button type="submit" disabled={isSubmitting} className="bg-cyan-500 hover:bg-cyan-600 disabled:opacity-50 text-white px-6 py-2 rounded text-sm font-medium transition-colors">
                {isSubmitting ? 'Enregistrement...' : editingId ? 'Enregistrer' : 'Créer'}
              </button>
            </div>
          </form>
        )}

        {filtered.length === 0 ? (
          <p className="text-sm text-text-dim">Aucun article.</p>
        ) : (
          <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-border text-[10px] uppercase tracking-wider text-text-dim">
                <th className="pb-2 font-semibold">Nom</th>
                <th className="pb-2 font-semibold">Référence</th>
                {tab === 'COLORANT' && <th className="pb-2 font-semibold">RAL</th>}
                <th className="pb-2 font-semibold">Fournisseur</th>
                <th className="pb-2 font-semibold text-right">Quantité</th>
                <th className="pb-2 font-semibold text-right">Disponible</th>
                <th className="pb-2 font-semibold">Statut</th>
                <th className="pb-2 font-semibold text-right">Actions</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((item) => (
                <tr key={item.id} className="border-b border-border/30 hover:bg-panel-2/50">
                  <td className="py-3 text-sm font-medium">{item.name}</td>
                  <td className="py-3 font-mono text-xs text-text-dim">{item.reference}</td>
                  {tab === 'COLORANT' && <td className="py-3 font-mono text-xs text-text-dim">{item.ral || '—'}</td>}
                  <td className="py-3 text-sm text-text-dim">{item.supplier || '—'}</td>
                  <td className="py-3 font-mono text-sm text-text text-right">{item.quantity} {item.unit}</td>
                  <td className="py-3 font-mono text-sm text-right">
                    <span className="text-text">{item.available_quantity} {item.unit}</span>
                    {parseFloat(item.reserved_quantity) > 0 && (
                      <div className="text-[10px] text-text-dim">−{item.reserved_quantity} réservé</div>
                    )}
                  </td>
                  <td className="py-3">
                    <span className={`text-[10px] font-mono px-1.5 py-0.5 rounded ${STATUS_BADGE[item.status]}`}>{STATUS_LABEL[item.status]}</span>
                  </td>
                  <td className="py-3 text-right space-x-3 whitespace-nowrap">
                    <button onClick={() => setMoveItem(item)} className="text-cyan-500 hover:text-cyan-400 text-xs font-medium">Mouvement</button>
                    <button onClick={() => setHistoryItem(item)} className="text-text-dim hover:text-text text-xs font-medium">Historique</button>
                    <button onClick={() => startEdit(item)} className="text-cyan-500 hover:text-cyan-400 text-xs font-medium">Modifier</button>
                    <button onClick={() => handleArchive(item)} className="text-red-500 hover:text-red-400 text-xs font-medium">Archiver</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          </div>
        )}
      </div>

      {moveItem && <MoveDialog item={moveItem} onClose={() => setMoveItem(null)} onDone={() => { setMoveItem(null); refresh(); }} />}
      {historyItem && <HistoryDialog item={historyItem} onClose={() => setHistoryItem(null)} />}
    </div>
  );
}

function MoveDialog({ item, onClose, onDone }: { item: StockItem; onClose: () => void; onDone: () => void }) {
  const [type, setType] = useState<StockMovementType>('RECEIPT');
  const [delta, setDelta] = useState('');
  const [reason, setReason] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const magnitude = Math.abs(parseFloat(delta) || 0);
    const signedDelta = type === 'CONSUMPTION' ? -magnitude : magnitude;
    setIsSubmitting(true);
    try {
      await stockApi.move(item.id, { type, delta: signedDelta.toString(), reason });
      toast.success('Mouvement enregistré.');
      onDone();
    } catch (err) {
      console.error('Failed to record stock movement', err);
      toast.error(errorMessage(err, "Échec de l'enregistrement du mouvement."));
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
      <div className="bg-panel border border-border rounded-lg shadow-xl w-full max-w-md overflow-hidden">
        <div className="p-4 border-b border-border">
          <h2 className="font-heading font-bold text-lg text-text">Mouvement de stock</h2>
          <p className="text-xs text-text-dim mt-1">{item.name} — {item.quantity} {item.unit} actuellement</p>
        </div>
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          <div>
            <label className="block text-xs font-semibold text-text-dim uppercase mb-1">Type de mouvement</label>
            <select value={type} onChange={(e) => setType(e.target.value as StockMovementType)}
              className="w-full bg-bg border border-border rounded p-2 text-sm text-text focus:outline-none focus:border-cyan-500">
              {(Object.keys(MOVEMENT_LABEL) as StockMovementType[]).map((t) => (
                <option key={t} value={t}>{MOVEMENT_LABEL[t]}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-xs font-semibold text-text-dim uppercase mb-1">
              Quantité {type === 'ADJUSTMENT' ? '(correction, en +)' : ''}
            </label>
            <Input type="number" step="0.001" min="0" value={delta} onChange={(e) => setDelta(e.target.value)} required />
            {type === 'CONSUMPTION' && <p className="text-xs text-text-dim mt-1">Sera retirée du stock ({item.quantity} → {(parseFloat(item.quantity) - (parseFloat(delta) || 0)).toFixed(3)} {item.unit}).</p>}
          </div>
          <div>
            <label className="block text-xs font-semibold text-text-dim uppercase mb-1">Motif (optionnel)</label>
            <textarea value={reason} onChange={(e) => setReason(e.target.value)} rows={2}
              className="w-full bg-bg border border-border rounded p-2 text-sm text-text focus:outline-none focus:border-cyan-500" />
          </div>
          <div className="flex justify-end gap-3 pt-2">
            <button type="button" onClick={onClose} className="px-4 py-2 rounded text-sm text-text-dim hover:bg-panel-2 transition-colors">
              Annuler
            </button>
            <button type="submit" disabled={isSubmitting} className="bg-cyan-500 hover:bg-cyan-600 disabled:opacity-50 text-white px-6 py-2 rounded text-sm font-medium transition-colors">
              {isSubmitting ? 'Enregistrement...' : 'Enregistrer'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

function HistoryDialog({ item, onClose }: { item: StockItem; onClose: () => void }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
      <div className="bg-panel border border-border rounded-lg shadow-xl w-full max-w-2xl max-h-[80vh] overflow-hidden flex flex-col">
        <div className="p-4 border-b border-border flex justify-between items-center">
          <div>
            <h2 className="font-heading font-bold text-lg text-text">Historique — {item.name}</h2>
            <p className="text-xs text-text-dim mt-1">{item.reference} • {item.quantity} {item.unit} actuellement</p>
          </div>
          <button onClick={onClose} className="text-text-dim hover:text-text text-sm">✕</button>
        </div>
        <div className="p-6 overflow-auto">
          {item.movements.length === 0 ? (
            <p className="text-sm text-text-dim">Aucun mouvement enregistré.</p>
          ) : (
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-border text-[10px] uppercase tracking-wider text-text-dim">
                  <th className="pb-2 font-semibold">Date</th>
                  <th className="pb-2 font-semibold">Type</th>
                  <th className="pb-2 font-semibold text-right">Variation</th>
                  <th className="pb-2 font-semibold text-right">Avant → Après</th>
                  <th className="pb-2 font-semibold">Motif</th>
                  <th className="pb-2 font-semibold">Par</th>
                </tr>
              </thead>
              <tbody>
                {[...item.movements].reverse().map((m) => (
                  <tr key={m.id} className="border-b border-border/30">
                    <td className="py-2 font-mono text-xs text-text-dim">{new Date(m.created_at).toLocaleString()}</td>
                    <td className="py-2 text-sm">{MOVEMENT_LABEL[m.type]}</td>
                    <td className={`py-2 font-mono text-sm text-right ${parseFloat(m.delta) < 0 ? 'text-red-400' : 'text-green-400'}`}>
                      {parseFloat(m.delta) > 0 ? '+' : ''}{m.delta}
                    </td>
                    <td className="py-2 font-mono text-xs text-text-dim text-right">{m.quantity_before} → {m.quantity_after}</td>
                    <td className="py-2 text-xs text-text-dim">{m.reason || '—'}</td>
                    <td className="py-2 text-xs text-text-dim">{m.created_by_name || '—'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </div>
  );
}
