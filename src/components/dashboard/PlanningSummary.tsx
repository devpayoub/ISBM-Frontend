'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { planningApi } from '@/lib/api/planning';
import { ScheduledOrder } from '@/lib/api/types';

export function PlanningSummary() {
  const [schedule, setSchedule] = useState<ScheduledOrder[]>([]);

  useEffect(() => {
    planningApi.getSchedule().then(setSchedule).catch(console.error);
  }, []);

  const shortages = schedule.filter((row) => row.material_check && !row.material_check.stock_sufficient).length;

  return (
    <Link href="/planning" className="bg-panel border border-border rounded-md p-4 flex flex-col hover:border-cyan-500/50 transition-colors">
      <div className="flex justify-between items-center mb-4">
        <h2 className="text-sm font-semibold text-text-dim tracking-wider uppercase">Planning</h2>
        {shortages > 0 && (
          <span className="text-xs bg-red-500/10 text-red-500 px-2 py-1 rounded font-mono">
            {shortages} MANQUE STOCK
          </span>
        )}
      </div>

      {schedule.length === 0 ? (
        <div className="text-sm text-text-dim text-center py-8">Aucune commande en file d'attente.</div>
      ) : (
        <div className="space-y-2">
          {schedule.slice(0, 5).map((row) => (
            <div key={row.id} className="flex items-center justify-between p-2 bg-panel-2 rounded border border-border text-sm">
              <div>
                <div className="font-medium text-text">{row.product_reference || `#${row.id}`}</div>
                <div className="text-xs text-text-dim font-mono">{row.machine_code} · {row.quantity} u.</div>
              </div>
              <div className="text-right">
                <div className="font-mono text-xs text-text">{new Date(row.estimated_start).toLocaleString()}</div>
                {row.material_check && (
                  <span className={`text-[10px] uppercase font-mono px-1.5 py-0.5 rounded ${row.material_check.stock_sufficient ? 'bg-green-500/10 text-green-400' : 'bg-red-500/10 text-red-500'}`}>
                    {row.material_check.stock_sufficient ? 'Stock OK' : 'Stock insuffisant'}
                  </span>
                )}
              </div>
            </div>
          ))}
          {schedule.length > 5 && (
            <div className="text-xs text-text-dim text-center pt-1">+{schedule.length - 5} autre(s) commande(s)</div>
          )}
        </div>
      )}
    </Link>
  );
}
