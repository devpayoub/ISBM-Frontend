'use client';

import { useEffect, useState } from 'react';
import { toast } from 'sonner';
import { productionApi } from '@/lib/api/production';
import { ProductionEntry } from '@/lib/api/types';
import { errorMessage } from '@/lib/api/errors';

const MACHINES = [
  { id: 1, name: 'ISBM 110', field: 'bottles_produced' },
  { id: 2, name: 'ISBM 88', field: 'bottles_produced' },
  { id: 3, name: 'INJ-CAPS', field: 'caps_produced' },
];

const HOURS = Array.from({ length: 24 }, (_, i) => i + 1);

interface GridCell {
  machineId: number;
  hour: number;
  bottles_produced: number;
  caps_produced: number;
  reject_count: number;
  downtime_min: number;
  pet_kg: number;
  energy_kwh: number;
  dirty: boolean;
}

export default function ProductionPage() {
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
  const [grid, setGrid] = useState<Record<string, GridCell>>({});
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    productionApi.getEntries({ date }).then((res) => {
      const newGrid: Record<string, GridCell> = {};
      // Initialize empty grid
      MACHINES.forEach(m => {
        HOURS.forEach(h => {
          const key = `${m.id}-${h}`;
          newGrid[key] = {
            machineId: m.id,
            hour: h,
            bottles_produced: 0,
            caps_produced: 0,
            reject_count: 0,
            downtime_min: 0,
            pet_kg: 0,
            energy_kwh: 0,
            dirty: false,
          };
        });
      });
      // Overlay existing data
      res.results.forEach(entry => {
        const key = `${entry.machine}-${entry.hour}`;
        if (newGrid[key]) {
          newGrid[key] = {
            ...newGrid[key],
            bottles_produced: entry.bottles_produced,
            caps_produced: entry.caps_produced,
            reject_count: entry.reject_count,
            downtime_min: entry.downtime_min,
            pet_kg: entry.pet_kg,
            energy_kwh: entry.energy_kwh,
          };
        }
      });
      setGrid(newGrid);
    }).catch(console.error);
  }, [date]);

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
      pet_kg: c.pet_kg,
      energy_kwh: c.energy_kwh,
    }));
    try {
      await productionApi.bulkCreateEntries(payload);
      // Mark all as saved
      setGrid(prev => {
        const updated = { ...prev };
        Object.keys(updated).forEach(k => { updated[k] = { ...updated[k], dirty: false }; });
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

  const getShiftLabel = (hour: number) => {
    if (hour >= 6 && hour < 14) return 'M';
    if (hour >= 14 && hour < 22) return 'A';
    return 'N';
  };

  const dirtyCount = Object.values(grid).filter(c => c.dirty).length;

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
                  return (
                    <td key={m.id} colSpan={3} className="p-0">
                      <div className="flex">
                        <input
                          type="number"
                          value={cell[prodField as keyof GridCell] as number || ''}
                          onChange={(e) => updateCell(key, prodField as keyof GridCell, parseInt(e.target.value) || 0)}
                          className={`w-1/3 bg-transparent border-r border-border/30 p-1 text-center text-xs font-mono focus:outline-none focus:bg-cyan-500/10 ${cell.dirty ? 'text-cyan-400' : 'text-text'}`}
                          min={0}
                        />
                        <input
                          type="number"
                          value={cell.reject_count || ''}
                          onChange={(e) => updateCell(key, 'reject_count', parseInt(e.target.value) || 0)}
                          className={`w-1/3 bg-transparent border-r border-border/30 p-1 text-center text-xs font-mono focus:outline-none focus:bg-cyan-500/10 ${cell.dirty ? 'text-cyan-400' : 'text-text'}`}
                          min={0}
                        />
                        <input
                          type="number"
                          value={cell.downtime_min || ''}
                          onChange={(e) => updateCell(key, 'downtime_min', parseInt(e.target.value) || 0)}
                          className={`w-1/3 bg-transparent p-1 text-center text-xs font-mono focus:outline-none focus:bg-cyan-500/10 ${cell.dirty ? 'text-cyan-400' : 'text-text'}`}
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
    </div>
  );
}
