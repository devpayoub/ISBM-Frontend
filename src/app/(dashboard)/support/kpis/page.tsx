'use client';

import { useEffect, useState } from 'react';
import { supportApi } from '@/lib/api/support';
import { SupportKPIs } from '@/lib/api/types';
import { BackButton } from '@/components/ui/back-button';

function StatTile({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="bg-panel border border-border rounded-md p-4">
      <div className="text-xs uppercase tracking-wider text-text-dim font-semibold">{label}</div>
      <div className="text-2xl font-heading font-bold text-text mt-1">{value}</div>
    </div>
  );
}

export default function SupportKPIsPage() {
  const [kpis, setKpis] = useState<SupportKPIs | null>(null);
  const [days, setDays] = useState(30);

  useEffect(() => {
    supportApi.getKpis(days).then(setKpis).catch(console.error);
  }, [days]);

  if (!kpis) return <div className="p-4 md:p-6">Chargement...</div>;

  return (
    <div className="p-4 md:p-6 space-y-6">
      <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-3">
        <div className="flex items-center gap-3">
          <BackButton fallbackHref="/support" />
          <h1 className="font-heading font-bold text-2xl uppercase tracking-wide text-text">Indicateurs SAV</h1>
        </div>
        <select
          value={days}
          onChange={(e) => setDays(parseInt(e.target.value))}
          className="bg-bg border border-border rounded p-2 text-sm text-text focus:outline-none focus:border-cyan-500"
        >
          <option value={7}>7 derniers jours</option>
          <option value={30}>30 derniers jours</option>
          <option value={90}>90 derniers jours</option>
          <option value={365}>12 derniers mois</option>
        </select>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-5 gap-4">
        <StatTile label="Tickets clôturés" value={kpis.ticket_count} />
        <StatTile label="Temps moyen de réponse fournisseur" value={kpis.avg_supplier_response_min != null ? `${kpis.avg_supplier_response_min} min` : '—'} />
        <StatTile label="Temps moyen de résolution" value={kpis.avg_resolution_min != null ? `${kpis.avg_resolution_min} min` : '—'} />
        <StatTile label="Coût moyen d'intervention" value={kpis.avg_intervention_cost != null ? kpis.avg_intervention_cost : '—'} />
        <StatTile label="Coût total d'intervention" value={kpis.total_intervention_cost != null ? kpis.total_intervention_cost : '—'} />
      </div>

      <div className="bg-panel border border-border rounded-md p-4">
        <h2 className="font-heading font-bold text-lg text-text mb-3">Pannes par machine (MTTR / MTBF)</h2>
        <div className="overflow-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-border text-xs uppercase tracking-wider text-text-dim">
                <th className="pb-2 pr-4 font-semibold">Machine</th>
                <th className="pb-2 pr-4 font-semibold">Pannes</th>
                <th className="pb-2 pr-4 font-semibold">MTTR</th>
                <th className="pb-2 font-semibold">MTBF</th>
              </tr>
            </thead>
            <tbody>
              {kpis.by_machine.map(row => (
                <tr key={row.machine__code} className="border-b border-border/50">
                  <td className="py-2 pr-4 text-sm">{row.machine__code}</td>
                  <td className="py-2 pr-4 text-sm">{row.count}</td>
                  <td className="py-2 pr-4 text-sm font-mono">{row.mttr_min} min</td>
                  <td className="py-2 text-sm font-mono">{row.mtbf_min != null ? `${row.mtbf_min} min` : '—'}</td>
                </tr>
              ))}
              {kpis.by_machine.length === 0 && (
                <tr><td colSpan={4} className="py-4 text-center text-sm text-text-dim">Aucune donnée pour cette période.</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      <div className="bg-panel border border-border rounded-md p-4">
        <h2 className="font-heading font-bold text-lg text-text mb-3">Pannes par fournisseur</h2>
        <div className="overflow-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-border text-xs uppercase tracking-wider text-text-dim">
                <th className="pb-2 pr-4 font-semibold">Fournisseur</th>
                <th className="pb-2 pr-4 font-semibold">Pannes traitées</th>
                <th className="pb-2 pr-4 font-semibold">Coût moyen</th>
                <th className="pb-2 font-semibold">Coût total</th>
              </tr>
            </thead>
            <tbody>
              {kpis.by_supplier.map(row => (
                <tr key={row.supplier_name} className="border-b border-border/50">
                  <td className="py-2 pr-4 text-sm">{row.supplier_name || '—'}</td>
                  <td className="py-2 pr-4 text-sm">{row.count}</td>
                  <td className="py-2 pr-4 text-sm font-mono">{row.avg_cost ?? '—'}</td>
                  <td className="py-2 text-sm font-mono">{row.total_cost ?? '—'}</td>
                </tr>
              ))}
              {kpis.by_supplier.length === 0 && (
                <tr><td colSpan={4} className="py-4 text-center text-sm text-text-dim">Aucune donnée pour cette période.</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      <div className="bg-panel border border-border rounded-md p-4">
        <h2 className="font-heading font-bold text-lg text-text mb-3">Historique des interventions</h2>
        <div className="overflow-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-border text-xs uppercase tracking-wider text-text-dim">
                <th className="pb-2 pr-4 font-semibold">Ticket</th>
                <th className="pb-2 pr-4 font-semibold">Machine</th>
                <th className="pb-2 pr-4 font-semibold">Fournisseur</th>
                <th className="pb-2 pr-4 font-semibold">Clôturé le</th>
                <th className="pb-2 pr-4 font-semibold">Arrêt</th>
                <th className="pb-2 pr-4 font-semibold">Pièces remplacées</th>
                <th className="pb-2 font-semibold">Coût</th>
              </tr>
            </thead>
            <tbody>
              {kpis.interventions.map(row => (
                <tr key={row.ticket_number} className="border-b border-border/50">
                  <td className="py-2 pr-4 text-sm font-mono">{row.ticket_number}</td>
                  <td className="py-2 pr-4 text-sm">{row.machine_code}</td>
                  <td className="py-2 pr-4 text-sm">{row.supplier_name || '—'}</td>
                  <td className="py-2 pr-4 text-xs font-mono text-text-dim">{new Date(row.closed_at).toLocaleString()}</td>
                  <td className="py-2 pr-4 text-sm font-mono">{row.total_downtime_min} min</td>
                  <td className="py-2 pr-4 text-sm">{row.parts_replaced || '—'}</td>
                  <td className="py-2 text-sm font-mono">{row.intervention_cost ?? '—'}</td>
                </tr>
              ))}
              {kpis.interventions.length === 0 && (
                <tr><td colSpan={7} className="py-4 text-center text-sm text-text-dim">Aucune donnée pour cette période.</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
