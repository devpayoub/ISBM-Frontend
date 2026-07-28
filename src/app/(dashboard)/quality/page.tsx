'use client';

import { useEffect, useState } from 'react';
import { qualityApi } from '@/lib/api/quality';
import { NonConformity, AuditDocument, PaginatedResponse } from '@/lib/api/types';
import { useAuthStore } from '@/lib/store/useAuthStore';

export default function QualityPage() {
  const [tab, setTab] = useState<'nc' | 'audit'>('nc');
  const [ncs, setNcs] = useState<NonConformity[]>([]);
  const [docs, setDocs] = useState<AuditDocument[]>([]);
  const [showNcForm, setShowNcForm] = useState(false);
  const user = useAuthStore((state) => state.user);

  // NC Form state
  const [ncType, setNcType] = useState<'CRITICAL' | 'MAJOR' | 'MINOR'>('MAJOR');
  const [ncSource, setNcSource] = useState<'INTERNAL' | 'CUSTOMER' | 'AUDIT' | 'ALERT'>('INTERNAL');
  const [ncDescription, setNcDescription] = useState('');
  const [ncProduct, setNcProduct] = useState('');

  useEffect(() => {
    qualityApi.getNonConformities().then(res => setNcs(res.results)).catch(console.error);
    qualityApi.getAuditDocs().then(res => setDocs(res.results)).catch(console.error);
  }, []);

  const handleCreateNc = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const nc = await qualityApi.createNc({
        type: ncType,
        source: ncSource,
        description: ncDescription,
        product: ncProduct,
      });
      setNcs(prev => [nc, ...prev]);
      setShowNcForm(false);
      setNcDescription('');
      setNcProduct('');
    } catch (e) {
      console.error('Failed to create NC', e);
    }
  };

  const handleCloseNc = async (id: number) => {
    try {
      const updated = await qualityApi.closeNc(id);
      setNcs(prev => prev.map(nc => nc.id === id ? updated : nc));
    } catch (e) {
      console.error('Failed to close NC', e);
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'OPEN': return 'bg-red-500/10 text-red-500';
      case 'INVESTIGATING': return 'bg-orange-500/10 text-orange-500';
      case 'CORRECTED': return 'bg-blue-500/10 text-blue-500';
      case 'CLOSED': return 'bg-green-500/10 text-green-500';
      default: return 'bg-gray-500/10 text-gray-400';
    }
  };

  return (
    <div className="p-6 space-y-6 h-full flex flex-col">
      <h1 className="font-heading font-bold text-2xl uppercase tracking-wide text-text">Qualité ISO 9001</h1>

      {/* Tabs */}
      <div className="flex gap-1 bg-bg border border-border rounded-md p-1 w-fit">
        <button
          onClick={() => setTab('nc')}
          className={`px-4 py-2 rounded text-sm font-medium transition-colors ${tab === 'nc' ? 'bg-panel text-text shadow' : 'text-text-dim hover:text-text'}`}
        >
          Non-Conformités ({ncs.length})
        </button>
        <button
          onClick={() => setTab('audit')}
          className={`px-4 py-2 rounded text-sm font-medium transition-colors ${tab === 'audit' ? 'bg-panel text-text shadow' : 'text-text-dim hover:text-text'}`}
        >
          Documents d'Audit ({docs.length})
        </button>
      </div>

      {tab === 'nc' && (
        <>
          <div className="flex justify-end">
            <button
              onClick={() => setShowNcForm(!showNcForm)}
              className="bg-cyan-500 hover:bg-cyan-600 text-white px-4 py-2 rounded font-sans text-sm font-medium transition-colors"
            >
              + Nouvelle NC
            </button>
          </div>

          {showNcForm && (
            <form onSubmit={handleCreateNc} className="bg-panel border border-border rounded-md p-4 grid grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold text-text-dim uppercase mb-1">Type</label>
                <select value={ncType} onChange={(e) => setNcType(e.target.value as any)}
                  className="w-full bg-bg border border-border rounded p-2 text-sm text-text focus:outline-none focus:border-cyan-500">
                  <option value="CRITICAL">Critique</option>
                  <option value="MAJOR">Majeur</option>
                  <option value="MINOR">Mineur</option>
                </select>
              </div>
              <div>
                <label className="block text-xs font-semibold text-text-dim uppercase mb-1">Source</label>
                <select value={ncSource} onChange={(e) => setNcSource(e.target.value as any)}
                  className="w-full bg-bg border border-border rounded p-2 text-sm text-text focus:outline-none focus:border-cyan-500">
                  <option value="INTERNAL">Interne</option>
                  <option value="CUSTOMER">Client</option>
                  <option value="AUDIT">Audit</option>
                  <option value="ALERT">Alerte</option>
                </select>
              </div>
              <div>
                <label className="block text-xs font-semibold text-text-dim uppercase mb-1">Produit</label>
                <input type="text" value={ncProduct} onChange={(e) => setNcProduct(e.target.value)}
                  placeholder="750ml / 250ml / Cap"
                  className="w-full bg-bg border border-border rounded p-2 text-sm text-text focus:outline-none focus:border-cyan-500" />
              </div>
              <div>
                <label className="block text-xs font-semibold text-text-dim uppercase mb-1">Description *</label>
                <input type="text" value={ncDescription} onChange={(e) => setNcDescription(e.target.value)} required
                  className="w-full bg-bg border border-border rounded p-2 text-sm text-text focus:outline-none focus:border-cyan-500" />
              </div>
              <div className="col-span-full flex justify-end gap-3">
                <button type="button" onClick={() => setShowNcForm(false)} className="px-4 py-2 rounded text-sm text-text-dim hover:bg-panel-2">Annuler</button>
                <button type="submit" className="bg-cyan-500 hover:bg-cyan-600 text-white px-6 py-2 rounded text-sm font-medium transition-colors">Créer</button>
              </div>
            </form>
          )}

          <div className="bg-panel border border-border rounded-md flex-1 p-4 overflow-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-border text-[10px] uppercase tracking-wider text-text-dim">
                  <th className="pb-2 font-semibold">N° NC</th>
                  <th className="pb-2 font-semibold">Type</th>
                  <th className="pb-2 font-semibold">Source</th>
                  <th className="pb-2 font-semibold">Description</th>
                  <th className="pb-2 font-semibold">Statut</th>
                  <th className="pb-2 font-semibold text-right">Action</th>
                </tr>
              </thead>
              <tbody>
                {ncs.map(nc => (
                  <tr key={nc.id} className="border-b border-border/30 hover:bg-panel-2/50">
                    <td className="py-3 font-mono text-xs">{nc.nc_number}</td>
                    <td className="py-3 font-mono text-xs">{nc.type}</td>
                    <td className="py-3 font-mono text-xs">{nc.source}</td>
                    <td className="py-3 text-sm line-clamp-1">{nc.description}</td>
                    <td className="py-3">
                      <span className={`text-[10px] font-mono px-2 py-0.5 rounded ${getStatusBadge(nc.status)}`}>
                        {nc.status}
                      </span>
                    </td>
                    <td className="py-3 text-right">
                      {nc.status !== 'CLOSED' && (
                        <button
                          onClick={() => handleCloseNc(nc.id)}
                          className="text-cyan-500 hover:text-cyan-400 text-xs font-medium"
                        >
                          Clôturer
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      )}

      {tab === 'audit' && (
        <div className="bg-panel border border-border rounded-md flex-1 p-4 overflow-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-border text-[10px] uppercase tracking-wider text-text-dim">
                <th className="pb-2 font-semibold">Titre</th>
                <th className="pb-2 font-semibold">Clause ISO</th>
                <th className="pb-2 font-semibold">Version</th>
                <th className="pb-2 font-semibold">Statut</th>
                <th className="pb-2 font-semibold">Uploadé par</th>
              </tr>
            </thead>
            <tbody>
              {docs.map(doc => (
                <tr key={doc.id} className="border-b border-border/30 hover:bg-panel-2/50">
                  <td className="py-3 text-sm font-medium">{doc.title}</td>
                  <td className="py-3 font-mono text-xs">{doc.clause}</td>
                  <td className="py-3 font-mono text-xs">{doc.version}</td>
                  <td className="py-3">
                    <span className={`text-[10px] font-mono px-2 py-0.5 rounded ${
                      doc.status === 'APPROVED' ? 'bg-green-500/10 text-green-500' :
                      doc.status === 'READY' ? 'bg-blue-500/10 text-blue-500' :
                      'bg-gray-500/10 text-gray-400'
                    }`}>{doc.status}</span>
                  </td>
                  <td className="py-3 text-xs text-text-dim">{doc.uploaded_by_name}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
