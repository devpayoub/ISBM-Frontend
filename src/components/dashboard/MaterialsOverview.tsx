'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { dashboardApi } from '@/lib/api/dashboard';
import { MaterialsOverview as MaterialsOverviewData } from '@/lib/api/types';

export function MaterialsOverview() {
  const [data, setData] = useState<MaterialsOverviewData | null>(null);

  useEffect(() => {
    dashboardApi.getMaterialsOverview().then(setData).catch(console.error);
  }, []);

  if (!data) return null;

  const { orders, production, capacity, stock } = data;
  const blocked = orders.stock_warning + orders.stock_insufficient;

  return (
    <Link href="/planning" className="bg-panel border border-border rounded-md p-4 flex flex-col hover:border-cyan-500/50 transition-colors">
      <div className="flex justify-between items-center mb-4">
        <h2 className="text-sm font-semibold text-text-dim tracking-wider uppercase">Matières &amp; Capacité</h2>
        {blocked > 0 && (
          <span className="text-xs bg-red-500/10 text-red-500 px-2 py-1 rounded font-mono">
            {blocked} À SURVEILLER
          </span>
        )}
      </div>

      <div className="grid grid-cols-3 gap-2 mb-4">
        <div className="bg-panel-2 border border-border rounded p-2 text-center">
          <div className="font-mono text-lg font-bold text-text">{orders.queued + orders.in_progress}</div>
          <div className="text-[10px] text-text-dim uppercase">Commandes actives</div>
        </div>
        <div className="bg-panel-2 border border-border rounded p-2 text-center">
          <div className="font-mono text-lg font-bold text-green-400">{orders.stock_ok}</div>
          <div className="text-[10px] text-text-dim uppercase">Stock OK</div>
        </div>
        <div className="bg-panel-2 border border-border rounded p-2 text-center">
          <div className="font-mono text-lg font-bold text-red-500">{blocked}</div>
          <div className="text-[10px] text-text-dim uppercase">Bas / insuffisant</div>
        </div>
      </div>

      <div className="mb-4">
        <div className="flex justify-between text-xs text-text-dim mb-1">
          <span>Production planifiée vs. réalisée</span>
          <span className="font-mono">{production.actual_quantity} / {production.planned_quantity} ({production.completion_pct}%)</span>
        </div>
        <div className="w-full h-2 bg-panel-2 rounded overflow-hidden">
          <div className="h-full bg-cyan-500" style={{ width: `${Math.min(production.completion_pct, 100)}%` }} />
        </div>
      </div>

      {capacity.length === 0 ? (
        <div className="text-sm text-text-dim text-center py-4">Aucune recette active.</div>
      ) : (
        <div className="space-y-2">
          {capacity.slice(0, 3).map((c) => (
            <div key={c.id} className="flex items-center justify-between p-2 bg-panel-2 rounded border border-border text-sm">
              <div className="font-medium text-text">{c.category}</div>
              <div className="text-right">
                <div className="font-mono text-text">{c.available_capacity} u.</div>
                {c.limiting_component && (
                  <div className="text-[10px] text-text-dim font-mono">limité par {c.limiting_component}</div>
                )}
              </div>
            </div>
          ))}
          {capacity.length > 3 && (
            <div className="text-xs text-text-dim text-center pt-1">+{capacity.length - 3} autre(s) recette(s)</div>
          )}
        </div>
      )}

      {stock.near_threshold_count > 0 && (
        <div className="text-xs text-text-dim text-center pt-3 mt-1 border-t border-border/50">
          {stock.near_threshold_count} matière(s) proche(s) du seuil minimum
        </div>
      )}
    </Link>
  );
}
