'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { alertsApi } from '@/lib/api/alerts';
import { Alert, PaginatedResponse } from '@/lib/api/types';
import { AlertDeclareDialog } from '@/components/alerts/AlertDeclareDialog';
import { useAuthStore } from '@/lib/store/useAuthStore';

export default function AlertsPage() {
  const [data, setData] = useState<PaginatedResponse<Alert> | null>(null);
  const [search, setSearch] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const user = useAuthStore((state) => state.user);

  useEffect(() => {
    const t = setTimeout(() => setDebouncedSearch(search), 300);
    return () => clearTimeout(t);
  }, [search]);

  useEffect(() => {
    const params: Record<string, string> = {};
    if (user?.role === 'CONTROLLER' && user?.id) params.reported_by = String(user.id);
    if (debouncedSearch) params.search = debouncedSearch;
    alertsApi.getAlerts(Object.keys(params).length ? params : undefined).then(setData).catch(console.error);
  }, [user?.role, user?.id, debouncedSearch]);

  const alertsList = Array.isArray(data?.results) ? data.results : Array.isArray(data) ? (data as unknown as Alert[]) : [];

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'OPEN': return 'bg-red-500/10 text-red-500';
      case 'ACKNOWLEDGED': return 'bg-orange-500/10 text-orange-500';
      case 'IN_PROGRESS': return 'bg-blue-500/10 text-blue-500';
      case 'RESOLVED': return 'bg-cyan-500/10 text-cyan-500';
      case 'CLOSED': return 'bg-gray-700/30 text-gray-400';
      default: return 'bg-gray-500/10 text-gray-400';
    }
  };

  return (
    <div className="p-6 space-y-6 h-full flex flex-col">
      <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-3">
        <h1 className="font-heading font-bold text-2xl uppercase tracking-wide text-text">Centre d'Alertes</h1>
        <AlertDeclareDialog />
      </div>
      
      <div className="bg-panel border border-border rounded-md flex-1 p-4 flex flex-col">
        <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-3 mb-4">
          <div className="text-sm text-text-dim">Total: {data?.count || alertsList.length}</div>
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Rechercher (titre, description, opérateur)..."
            className="w-full sm:w-72 bg-bg border border-border rounded p-2 text-sm text-text focus:outline-none focus:border-cyan-500"
          />
        </div>

        <div className="flex-1 overflow-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-border text-xs uppercase tracking-wider text-text-dim">
                <th className="pb-3 pr-4 font-semibold pl-2">Sévérité</th>
                <th className="pb-3 pr-4 font-semibold">Titre</th>
                <th className="pb-3 pr-4 font-semibold">Machine</th>
                <th className="pb-3 pr-4 font-semibold">Statut</th>
                <th className="pb-3 pr-4 font-semibold">Date</th>
                <th className="pb-3 font-semibold text-right pr-2">Action</th>
              </tr>
            </thead>
            <tbody>
              {alertsList.map(alert => (
                <tr key={alert.id} className="border-b border-border/50 hover:bg-panel-2 transition-colors">
                  <td className="py-3 pr-4 pl-2 whitespace-nowrap">
                    <span className={`inline-block w-2 h-2 rounded-full ${
                      alert.severity === 'CRITICAL' ? 'bg-red-500 shadow-[0_0_8px_rgba(239,68,68,0.8)]' :
                      alert.severity === 'MAJOR' ? 'bg-orange-500' : 'bg-yellow-500'
                    }`} />
                    <span className="font-mono text-xs ml-2 text-text-dim">{alert.severity}</span>
                  </td>
                  <td className="py-3 pr-4 font-sans text-sm font-medium">{alert.title}</td>
                  <td className="py-3 pr-4 font-sans text-sm text-text-dim">{alert.machine_name}</td>
                  <td className="py-3 pr-4 whitespace-nowrap">
                    <span className={`font-mono text-[10px] px-2 py-1 rounded ${getStatusBadge(alert.status)}`}>{alert.status}</span>
                  </td>
                  <td className="py-3 pr-4 font-mono text-xs text-text-dim whitespace-nowrap">
                    {new Date(alert.created_at).toLocaleDateString()} {new Date(alert.created_at).toLocaleTimeString()}
                  </td>
                  <td className="py-3 text-right pr-2">
                    <Link href={`/alerts/${alert.id}`} className="text-cyan-500 hover:text-cyan-400 text-sm font-medium">
                      Gérer →
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
