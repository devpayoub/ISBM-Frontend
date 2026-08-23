'use client';

import { useEffect, useState } from 'react';
import { toast } from 'sonner';
import { productionApi } from '@/lib/api/production';
import { planningApi } from '@/lib/api/planning';
import { ProductionEntry, ProductionEntryStatus, PlanningOrder } from '@/lib/api/types';
import { errorMessage } from '@/lib/api/errors';

const MACHINES = [
  { id: 1, name: 'ISBM 110', field: 'bottles_produced' },
  { id: 2, name: 'ISBM 88', field: 'bottles_produced' },
  { id: 3, name: 'INJ-CAPS', field: 'caps_produced' },
];

const HOURS = Array.from({ length: 24 }, (_, i) => i + 1);

const STATUS_LABELS: Record<ProductionEntryStatus, string> = {
  DRAFT: 'Brouillon',
  VALIDATED: 'Validée',
  STOCK_CONSUMED: 'Stock consommé',
};

interface GridCell {
  id: number | null;
  machineId: number;
  hour: number;
  bottles_produced: number;
  caps_produced: number;
  reject_count: number;
  downtime_min: number;
  status: ProductionEntryStatus;
  planning_order: number | null;
  planning_order_reference: string;
  raw_material_consumed_kg: string | null;
  colorant_consumed_kg: string | null;
  theoretical_raw_kg: string | null;
  theoretical_colorant_kg: string | null;
  dirty: boolean;
}

const emptyCell = (machineId: number, hour: number): GridCell => ({
  id: null,
  machineId,
  hour,
  bottles_produced: 0,
  caps_produced: 0,
  reject_count: 0,
  downtime_min: 0,
  status: 'DRAFT',
  planning_order: null,
  planning_order_reference: '',
  raw_material_consumed_kg: null,
  colorant_consumed_kg: null,
  theoretical_raw_kg: null,
  theoretical_colorant_kg: null,
  dirty: false,
});

const overlayEntry = (cell: GridCell, entry: ProductionEntry): GridCell => ({
  ...cell,
  id: entry.id,
  bottles_produced: entry.bottles_produced,
  caps_produced: entry.caps_produced,
  reject_count: entry.reject_count,
  downtime_min: entry.downtime_min,
  status: entry.status,
  planning_order: entry.planning_order,
  planning_order_reference: entry.planning_order_reference || '',
  raw_material_consumed_kg: entry.raw_material_consumed_kg,
  colorant_consumed_kg: entry.colorant_consumed_kg,
  theoretical_raw_kg: entry.theoretical_raw_kg,
  theoretical_colorant_kg: entry.theoretical_colorant_kg,
  dirty: false,
});

export default function ProductionPage() {
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
  const [grid, setGrid] = useState<Record<string, GridCell>>({});
  const [saving, setSaving] = useState(false);
  const [orders, setOrders] = useState<PlanningOrder[]>([]);
  const [validatingKey, setValidatingKey] = useState<string | null>(null);

  const loadEntries = () => {
    productionApi.getEntries({ date }).then((res) => {
      const newGrid: Record<string, GridCell> = {};
      MACHINES.forEach(m => {
        HOURS.forEach(h => {
          newGrid[`${m.id}-${h}`] = emptyCell(m.id, h);
        });
      });
      res.results.forEach(entry => {
        const key = `${entry.machine}-${entry.hour}`;
        if (newGrid[key]) newGrid[key] = overlayEntry(newGrid[key], entry);
      });
      setGrid(newGrid);
    }).catch(console.error);
  };

  useEffect(() => {
    loadEntries();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [date]);

  useEffect(() => {
    Promise.all([
      planningApi.getOrders({ status: 'QUEUED' }),
      planningApi.getOrders({ status: 'IN_PROGRESS' }),
    ]).then(([queued, inProgress]) => {
      setOrders([...queued.results, ...inProgress.results]);
    }).catch(console.error);
  }, []);

  const updateCell = (key: string, field: keyof GridCell, value: number) => {
    setGrid(prev => ({
      ...prev,
      [key]: { ...prev[key], [field]: value, dirty: true },
    }));
  };

  const handleSave = async () => {
    setSaving(true);
    const dirtyCells = Object.values(grid).filter(c => c.dirty);
    const payload = dirtyCells.map(c => ({
      date,
      hour: c.hour,
      machine: c.machineId,
      bottles_produced: c.bottles_produced,
      caps_produced: c.caps_produced,
      reject_count: c.reject_count,
      downtime_min: c.downtime_min,
    }));
    try {
      const saved = await productionApi.bulkCreateEntries(payload);
      setGrid(prev => {
        const updated = { ...prev };
        saved.forEach(entry => {
          const key = `${entry.machine}-${entry.hour}`;
          if (updated[key]) updated[key] = overlayEntry(updated[key], entry);
        });
        return updated;
      });
      toast.success('Saisie enregistrée.');
    } catch (e) {
      console.error('Save failed', e);
      toast.error(errorMessage(e, "Échec de l'enregistrement de la saisie."));
    } finally {
      setSaving(false);
    }
  };

  const handleLinkOrder = async (key: string, orderId: string) => {
    const cell = grid[key];
    if (!cell?.id) return;
    try {
      const updated = await productionApi.updateEntry(cell.id, { planning_order: orderId ? Number(orderId) : null });
      setGrid(prev => ({ ...prev, [key]: overlayEntry(prev[key], updated) }));
    } catch (e) {
      toast.error(errorMessage(e, "Échec de la liaison à la commande."));
    }
  };

  const handleValidate = async (key: string) => {
    const cell = grid[key];
    if (!cell?.id) return;
    setValidatingKey(key);
    try {
      const updated = await productionApi.validateEntry(cell.id);
      setGrid(prev => ({ ...prev, [key]: overlayEntry(prev[key], updated) }));
      toast.success('Saisie validée.');
    } catch (e) {
      toast.error(errorMessage(e, 'Échec de la validation.'));
    } finally {
      setValidatingKey(null);
    }
  };

  const getShiftLabel = (hour: number) => {
    if (hour >= 6 && hour < 14) return 'M';
    if (hour >= 14 && hour < 22) return 'A';
    return 'N';
  };

  const dirtyCount = Object.values(grid).filter(c => c.dirty).length;

  const validationRows = Object.entries(grid)
    .filter(([, c]) => c.id && (c.bottles_produced > 0 || c.caps_produced > 0))
    .sort((a, b) => a[1].hour - b[1].hour || a[1].machineId - b[1].machineId);

  return (
    <div className="p-6 space-y-4 h-full flex flex-col">
      <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-3">
        <h1 className="font-heading font-bold text-2xl uppercase tracking-wide text-text">Saisie de Production</h1>
        <div className="flex items-center gap-4">
          <input
            type="date"
            value={date}
            onChange={(e) => setDate(e.target.value)}
            className="bg-bg border border-border rounded px-3 py-2 text-sm font-mono text-text focus:outline-none focus:border-cyan-500"
          />
          <button
            onClick={handleSave}
            disabled={dirtyCount === 0 || saving}
            className="bg-cyan-500 hover:bg-cyan-600 disabled:opacity-40 text-white px-6 py-2 rounded font-sans text-sm font-medium transition-colors"
          >
            {saving ? 'Enregistrement...' : `Sauvegarder (${dirtyCount})`}
          </button>
        </div>
      </div>

      <div className="bg-panel border border-border rounded-md flex-1 overflow-auto">
        <table className="w-full text-left border-collapse min-w-[900px]">
          <thead className="sticky top-0 z-10 bg-panel">
            <tr className="border-b border-border text-[10px] uppercase tracking-wider text-text-dim">
              <th className="p-2 w-12 font-semibold">H</th>
              <th className="p-2 w-8 font-semibold">Eq</th>
              {MACHINES.map(m => (
                <th key={m.id} className="p-2 font-semibold text-center" colSpan={3}>
                  {m.name}
                  <div className="flex gap-0 mt-1 text-[9px]">
                    <span className="flex-1">Prod</span>
                    <span className="flex-1">Rej</span>
                    <span className="flex-1">Arrêt</span>
                  </div>
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {HOURS.map(hour => (
              <tr key={hour} className="border-b border-border/30 hover:bg-panel-2/50">
                <td className="p-1 font-mono text-xs text-text-dim text-center">{hour.toString().padStart(2, '0')}h</td>
                <td className="p-1 font-mono text-[10px] text-text-dim text-center">{getShiftLabel(hour)}</td>
                {MACHINES.map(m => {
                  const key = `${m.id}-${hour}`;
                  const cell = grid[key];
                  if (!cell) return <td key={m.id} colSpan={3} />;
                  const prodField = m.id === 3 ? 'caps_produced' : 'bottles_produced';
                  const locked = cell.status !== 'DRAFT';
                  return (
                    <td key={m.id} colSpan={3} className="p-0" title={locked ? `${STATUS_LABELS[cell.status]} — non modifiable` : undefined}>
                      <div className={`flex ${locked ? 'opacity-50' : ''}`}>
                        <input
                          type="number"
                          value={cell[prodField as keyof GridCell] as number || ''}
                          onChange={(e) => updateCell(key, prodField as keyof GridCell, parseInt(e.target.value) || 0)}
                          disabled={locked}
                          className={`w-1/3 bg-transparent border-r border-border/30 p-1 text-center text-xs font-mono focus:outline-none focus:bg-cyan-500/10 disabled:cursor-not-allowed ${cell.dirty ? 'text-cyan-400' : 'text-text'}`}
                          min={0}
                        />
                        <input
                          type="number"
                          value={cell.reject_count || ''}
                          onChange={(e) => updateCell(key, 'reject_count', parseInt(e.target.value) || 0)}
                          disabled={locked}
                          className={`w-1/3 bg-transparent border-r border-border/30 p-1 text-center text-xs font-mono focus:outline-none focus:bg-cyan-500/10 disabled:cursor-not-allowed ${cell.dirty ? 'text-cyan-400' : 'text-text'}`}
                          min={0}
                        />
                        <input
                          type="number"
                          value={cell.downtime_min || ''}
                          onChange={(e) => updateCell(key, 'downtime_min', parseInt(e.target.value) || 0)}
                          disabled={locked}
                          className={`w-1/3 bg-transparent p-1 text-center text-xs font-mono focus:outline-none focus:bg-cyan-500/10 disabled:cursor-not-allowed ${cell.dirty ? 'text-cyan-400' : 'text-text'}`}
                          min={0}
                        />
                      </div>
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {validationRows.length > 0 && (
        <div className="bg-panel border border-border rounded-md p-4 space-y-3">
          <h2 className="font-heading font-bold text-sm uppercase tracking-wide text-text">Liaison commande &amp; validation</h2>
          <p className="text-xs text-text-dim">
            Lier une heure produite à une commande de planning déduit automatiquement la matière/colorant de cette recette du stock une fois validée — irréversible, la ligne devient alors non modifiable.
          </p>
          <div className="overflow-auto">
            <table className="w-full text-left border-collapse min-w-[820px]">
              <thead>
                <tr className="border-b border-border text-[10px] uppercase tracking-wider text-text-dim">
                  <th className="p-2 font-semibold">Heure</th>
                  <th className="p-2 font-semibold">Machine</th>
                  <th className="p-2 font-semibold">Produit</th>
                  <th className="p-2 font-semibold">Commande liée</th>
                  <th className="p-2 font-semibold">Théorique (kg)</th>
                  <th className="p-2 font-semibold">Consommé (kg)</th>
                  <th className="p-2 font-semibold">Statut</th>
                  <th className="p-2 font-semibold text-right">Action</th>
                </tr>
              </thead>
              <tbody>
                {validationRows.map(([key, cell]) => {
                  const machine = MACHINES.find(m => m.id === cell.machineId);
                  const produced = cell.machineId === 3 ? cell.caps_produced : cell.bottles_produced;
                  const eligibleOrders = orders.filter(o => o.machine === cell.machineId);
                  const locked = cell.status !== 'DRAFT';
                  return (
                    <tr key={key} className="border-b border-border/30">
                      <td className="p-2 font-mono text-xs text-text">{cell.hour.toString().padStart(2, '0')}h</td>
                      <td className="p-2 text-xs text-text">{machine?.name}</td>
                      <td className="p-2 font-mono text-xs text-text">{produced}</td>
                      <td className="p-2">
                        {locked ? (
                          <span className="font-mono text-xs text-text">{cell.planning_order_reference || '—'}</span>
                        ) : (
                          <select
                            value={cell.planning_order ?? ''}
                            onChange={(e) => handleLinkOrder(key, e.target.value)}
                            className="bg-bg border border-border rounded p-1.5 text-xs text-text focus:outline-none focus:border-cyan-500"
                          >
                            <option value="">Aucune</option>
                            {eligibleOrders.map(o => (
                              <option key={o.id} value={o.id}>{o.product_reference}{o.bottle_category ? ` — ${o.bottle_category}` : ''}</option>
                            ))}
                          </select>
                        )}
                      </td>
                      <td className="p-2 font-mono text-xs text-text-dim">
                        {cell.theoretical_raw_kg ? `MP ${cell.theoretical_raw_kg}` : '—'}
                        {cell.theoretical_colorant_kg ? ` / Col ${cell.theoretical_colorant_kg}` : ''}
                      </td>
                      <td className="p-2 font-mono text-xs text-cyan-400">
                        {cell.raw_material_consumed_kg ? `MP ${cell.raw_material_consumed_kg}` : '—'}
                        {cell.colorant_consumed_kg ? ` / Col ${cell.colorant_consumed_kg}` : ''}
                      </td>
                      <td className="p-2">
                        <span className={`text-[10px] font-mono px-1.5 py-0.5 rounded uppercase ${
                          cell.status === 'DRAFT' ? 'bg-text-dim/10 text-text-dim' :
                          cell.status === 'STOCK_CONSUMED' ? 'bg-green-500/10 text-green-400' : 'bg-cyan-500/10 text-cyan-400'
                        }`}>
                          {STATUS_LABELS[cell.status]}
                        </span>
                      </td>
                      <td className="p-2 text-right">
                        {!locked && (
                          <button
                            onClick={() => handleValidate(key)}
                            disabled={cell.dirty || validatingKey === key}
                            title={cell.dirty ? 'Sauvegardez la saisie avant de valider' : undefined}
                            className="bg-cyan-500 hover:bg-cyan-600 disabled:opacity-40 text-white px-3 py-1 rounded text-xs font-medium transition-colors whitespace-nowrap"
                          >
                            {validatingKey === key ? '...' : 'Valider'}
                          </button>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
