'use client';

import { useEffect, useState } from 'react';
import { costsApi } from '@/lib/api/costs';
import { CostRecord } from '@/lib/api/types';

export default function CostsPage() {
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
  const [dailyData, setDailyData] = useState<any>(null);
  const [records, setRecords] = useState<CostRecord[]>([]);

  useEffect(() => {
    costsApi.getDailyCosts(date).then(setDailyData).catch(console.error);
    costsApi.getCostRecords().then(res => setRecords(res.results)).catch(console.error);
  }, [date]);

  // Summary from daily or fallback
  const costBreakdown = [
    { label: 'Main d\'œuvre', value: dailyData?.labor_cost ?? 0, color: '#8b5cf6' },
  ];
  const total = costBreakdown.reduce((s, c) => s + c.value, 0);

  return (
    <div className="p-6 space-y-6 h-full flex flex-col">
      <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-3">
        <h1 className="font-heading font-bold text-2xl uppercase tracking-wide text-text">Analyse des Coûts</h1>
        <input
          type="date"
          value={date}
          onChange={(e) => setDate(e.target.value)}
          className="bg-bg border border-border rounded px-3 py-2 text-sm font-mono text-text focus:outline-none focus:border-cyan-500"
        />
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-2 gap-4">
        {costBreakdown.map(c => (
          <div key={c.label} className="bg-panel border border-border rounded-md p-4">
            <div className="text-[11px] font-sans font-semibold tracking-widest text-text-dim uppercase">{c.label}</div>
            <div className="font-mono text-2xl font-bold mt-1" style={{ color: c.color }}>
              {c.value.toFixed(0)} <span className="text-sm text-text-dim">DT</span>
            </div>
          </div>
        ))}
        <div className="bg-panel border border-border rounded-md p-4">
          <div className="text-[11px] font-sans font-semibold tracking-widest text-text-dim uppercase">Total</div>
          <div className="font-mono text-2xl font-bold mt-1 text-text">
            {total.toFixed(0)} <span className="text-sm text-text-dim">DT</span>
          </div>
        </div>
      </div>

      {/* Records Table */}
      <div className="bg-panel border border-border rounded-md flex-1 p-4 overflow-auto">
        <h2 className="text-sm font-semibold text-text-dim tracking-wider uppercase mb-4">Détail par Machine/Shift</h2>
        <div className="overflow-x-auto">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="border-b border-border text-[10px] uppercase tracking-wider text-text-dim">
              <th className="pb-2 font-semibold">Date</th>
              <th className="pb-2 font-semibold">Machine</th>
              <th className="pb-2 font-semibold">Shift</th>
              <th className="pb-2 font-semibold text-right">Production</th>
              <th className="pb-2 font-semibold text-right">Coût total</th>
              <th className="pb-2 font-semibold text-right">Coût/btl</th>
            </tr>
          </thead>
          <tbody>
            {records.map(r => (
              <tr key={r.id} className="border-b border-border/30 hover:bg-panel-2/50">
                <td className="py-2 font-mono text-xs">{r.date}</td>
                <td className="py-2 text-sm">{r.machine_name || `Machine ${r.machine}`}</td>
                <td className="py-2 font-mono text-xs">{r.shift}</td>
                <td className="py-2 font-mono text-xs text-right">{r.production_count}</td>
                <td className="py-2 font-mono text-xs text-right">{r.total_cost.toFixed(2)} DT</td>
                <td className="py-2 font-mono text-sm text-right font-bold text-cyan-400">{r.cost_per_bottle.toFixed(3)} DT</td>
              </tr>
            ))}
          </tbody>
        </table>
        </div>
      </div>
    </div>
  );
}
