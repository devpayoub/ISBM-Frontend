'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { supportApi } from '@/lib/api/support';
import { Ticket, PaginatedResponse } from '@/lib/api/types';
import { useAuthStore } from '@/lib/store/useAuthStore';
import { can } from '@/lib/auth/rbac';

const CRITICALITY_DOT: Record<string, string> = {
  CRITICAL: 'bg-red-500 shadow-[0_0_8px_rgba(239,68,68,0.8)]',
  HIGH: 'bg-orange-500',
  MEDIUM: 'bg-yellow-500',
  LOW: 'bg-blue-500',
};

async function triggerDownload(blobPromise: Promise<Blob>, filename: string) {
  const blob = await blobPromise;
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

export default function SupportPage() {
  const [data, setData] = useState<PaginatedResponse<Ticket> | null>(null);
  const [search, setSearch] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [exporting, setExporting] = useState<'pdf' | 'excel' | null>(null);
  const user = useAuthStore((state) => state.user);

  useEffect(() => {
    const t = setTimeout(() => setDebouncedSearch(search), 300);
    return () => clearTimeout(t);
  }, [search]);

  const load = () => {
    const params: Record<string, string> = {};
    if (debouncedSearch) params.search = debouncedSearch;
    supportApi.getTickets(Object.keys(params).length ? params : undefined).then(setData).catch(console.error);
  };

  useEffect(load, [debouncedSearch]);

  const tickets = Array.isArray(data?.results) ? data.results : [];

  const handleExport = async (kind: 'pdf' | 'excel') => {
    setExporting(kind);
    try {
      if (kind === 'pdf') {
        await triggerDownload(supportApi.exportPdf(), 'tickets_sav.pdf');
      } else {
        await triggerDownload(supportApi.exportExcel(), 'tickets_sav.xlsx');
      }
    } catch (e) {
      console.error('Export failed', e);
    } finally {
      setExporting(null);
    }
  };

  return (
    <div className="p-4 md:p-6 space-y-6 h-full flex flex-col">
      <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-3">
        <h1 className="font-heading font-bold text-2xl uppercase tracking-wide text-text">Support Client / SAV</h1>
        <div className="flex flex-wrap gap-2">
          <Link
            href="/support/kpis"
            className="bg-panel-2 hover:bg-panel-2/70 border border-border text-text px-4 py-2 rounded-md text-sm font-medium transition-colors"
          >
            Indicateurs
          </Link>
          <button
            onClick={() => handleExport('pdf')}
            disabled={exporting !== null}
            className="bg-panel-2 hover:bg-panel-2/70 border border-border text-text px-4 py-2 rounded-md text-sm font-medium transition-colors disabled:opacity-50"
          >
            {exporting === 'pdf' ? 'Export...' : 'Export PDF'}
          </button>
          <button
            onClick={() => handleExport('excel')}
            disabled={exporting !== null}
            className="bg-panel-2 hover:bg-panel-2/70 border border-border text-text px-4 py-2 rounded-md text-sm font-medium transition-colors disabled:opacity-50"
          >
            {exporting === 'excel' ? 'Export...' : 'Export Excel'}
          </button>
          {can(user?.role, 'declare_ticket') && (
            <Link
              href="/support/new"
              className="bg-cyan-600 hover:bg-cyan-500 text-white px-4 py-2 rounded-md font-sans text-sm font-medium transition-colors shadow-lg shadow-cyan-500/20"
            >
              + Nouveau ticket SAV
            </Link>
          )}
        </div>
      </div>

      <div className="bg-panel border border-border rounded-md flex-1 p-4 flex flex-col">
        <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-3 mb-4">
          <div className="text-sm text-text-dim">Total: {data?.count ?? tickets.length}</div>
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Rechercher (n° ticket, description, code erreur)..."
            className="w-full sm:w-72 bg-bg border border-border rounded p-2 text-sm text-text focus:outline-none focus:border-cyan-500"
          />
        </div>

        <div className="flex-1 overflow-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-border text-xs uppercase tracking-wider text-text-dim">
                <th className="pb-3 pr-4 font-semibold pl-2">Criticité</th>
                <th className="pb-3 pr-4 font-semibold">N° ticket</th>
                <th className="pb-3 pr-4 font-semibold">Machine</th>
                <th className="pb-3 pr-4 font-semibold">Statut</th>
                <th className="pb-3 pr-4 font-semibold">Date</th>
                <th className="pb-3 font-semibold text-right pr-2">Action</th>
              </tr>
            </thead>
            <tbody>
              {tickets.map(ticket => (
                <tr key={ticket.id} className="border-b border-border/50 hover:bg-panel-2 transition-colors">
                  <td className="py-3 pr-4 pl-2 whitespace-nowrap">
                    <span className={`inline-block w-2 h-2 rounded-full ${CRITICALITY_DOT[ticket.criticality] || 'bg-gray-400'}`} />
                    <span className="font-mono text-xs ml-2 text-text-dim">{ticket.criticality}</span>
                  </td>
                  <td className="py-3 pr-4 font-sans text-sm font-medium">{ticket.ticket_number}</td>
                  <td className="py-3 pr-4 font-sans text-sm text-text-dim">{ticket.machine_detail?.code}</td>
                  <td className="py-3 pr-4 whitespace-nowrap">
                    <span className="font-mono text-xs bg-bg px-2 py-1 rounded">{ticket.status}</span>
                  </td>
                  <td className="py-3 pr-4 font-mono text-xs text-text-dim whitespace-nowrap">
                    {new Date(ticket.created_at).toLocaleDateString()} {new Date(ticket.created_at).toLocaleTimeString()}
                  </td>
                  <td className="py-3 text-right pr-2">
                    <Link href={`/support/${ticket.id}`} className="text-cyan-500 hover:text-cyan-400 text-sm font-medium">
                      Gérer →
                    </Link>
                  </td>
                </tr>
              ))}
              {tickets.length === 0 && (
                <tr>
                  <td colSpan={6} className="py-8 text-center text-sm text-text-dim">
                    Aucun ticket SAV pour le moment.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
