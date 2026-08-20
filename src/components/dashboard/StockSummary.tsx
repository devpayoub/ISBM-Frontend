'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { stockApi } from '@/lib/api/stock';
import { StockItem } from '@/lib/api/types';

export function StockSummary() {
  const [items, setItems] = useState<StockItem[]>([]);

  useEffect(() => {
    stockApi.getLowStock().then(setItems).catch(console.error);
  }, []);

  const ruptureCount = items.filter((i) => i.status === 'RUPTURE').length;
  const lowCount = items.filter((i) => i.status === 'LOW').length;

  return (
    <Link href="/stock" className="bg-panel border border-border rounded-md p-4 flex flex-col hover:border-cyan-500/50 transition-colors">
      <div className="flex justify-between items-center mb-4">
        <h2 className="text-sm font-semibold text-text-dim tracking-wider uppercase">Stock</h2>
        {ruptureCount > 0 && (
          <span className="text-xs bg-red-500/10 text-red-500 px-2 py-1 rounded font-mono">
            {ruptureCount} RUPTURE
          </span>
        )}
      </div>

      {items.length === 0 ? (
        <div className="text-sm text-text-dim text-center py-8">Stock suffisant sur tous les articles.</div>
      ) : (
        <div className="space-y-2">
          {items.slice(0, 5).map((item) => (
            <div key={item.id} className="flex items-center justify-between p-2 bg-panel-2 rounded border border-border text-sm">
              <div>
                <div className="font-medium text-text">{item.name}</div>
                <div className="text-xs text-text-dim font-mono">{item.reference}</div>
              </div>
              <div className="text-right">
                <div className="font-mono text-text">{item.quantity} {item.unit}</div>
                <span className={`text-[10px] uppercase font-mono px-1.5 py-0.5 rounded ${item.status === 'RUPTURE' ? 'bg-red-500/10 text-red-500' : 'bg-yellow-500/10 text-yellow-500'}`}>
                  {item.status === 'RUPTURE' ? 'Rupture' : 'Bas'}
                </span>
              </div>
            </div>
          ))}
          {items.length > 5 && (
            <div className="text-xs text-text-dim text-center pt-1">+{items.length - 5} autre(s) — {lowCount} bas, {ruptureCount} rupture</div>
          )}
        </div>
      )}
    </Link>
  );
}
