'use client';

import { useEffect, useState } from 'react';
import { toast } from 'sonner';
import { qualityApi } from '@/lib/api/quality';
import { NonConformity, AuditDocument, PaginatedResponse } from '@/lib/api/types';
import { useAuthStore } from '@/lib/store/useAuthStore';
import { errorMessage, parseFieldErrors } from '@/lib/api/errors';
import { Input } from '@/components/ui/input';

export default function QualityPage() {
  const [tab, setTab] = useState<'nc' | 'audit'>('nc');
  const [ncs, setNcs] = useState<NonConformity[]>([]);
  const [docs, setDocs] = useState<AuditDocument[]>([]);
  const [showNcForm, setShowNcForm] = useState(false);
  const [editingNcId, setEditingNcId] = useState<number | null>(null);
  const user = useAuthStore((state) => state.user);
  const canManage = user?.role === 'ADMIN' || user?.role === 'MANAGER' || user?.role === 'CONTROLLER';

  // NC Form state
  const [ncType, setNcType] = useState<'CRITICAL' | 'MAJOR' | 'MINOR'>('MAJOR');
  const [ncSource, setNcSource] = useState<'INTERNAL' | 'CUSTOMER' | 'AUDIT' | 'ALERT'>('INTERNAL');
  const [ncDescription, setNcDescription] = useState('');
  const [ncProduct, setNcProduct] = useState('');
  const [ncRootCause, setNcRootCause] = useState('');
  const [ncCorrectiveAction, setNcCorrectiveAction] = useState('');
  const [ncPreventiveAction, setNcPreventiveAction] = useState('');
  const [ncErrors, setNcErrors] = useState<Record<string, string>>({});

  // Audit document upload form state
  const [showDocForm, setShowDocForm] = useState(false);
  const [docTitle, setDocTitle] = useState('');
  const [docClause, setDocClause] = useState('');
  const [docVersion, setDocVersion] = useState('1.0');
  const [docFile, setDocFile] = useState<File | null>(null);
  const [docErrors, setDocErrors] = useState<Record<string, string>>({});
  const [uploading, setUploading] = useState(false);

  const refreshNcs = () => qualityApi.getNonConformities().then(res => setNcs(res.results)).catch(console.error);
  const refreshDocs = () => qualityApi.getAuditDocs().then(res => setDocs(res.results)).catch(console.error);

  useEffect(() => {
    refreshNcs();
    refreshDocs();
  }, []);

  const resetNcForm = () => {
    setEditingNcId(null);
    setNcType('MAJOR'); setNcSource('INTERNAL'); setNcDescription(''); setNcProduct('');
    setNcRootCause(''); setNcCorrectiveAction(''); setNcPreventiveAction('');
  };

  const startEditNc = (nc: NonConformity) => {
    setEditingNcId(nc.id);
    setNcType(nc.type); setNcSource(nc.source); setNcDescription(nc.description); setNcProduct(nc.product || '');
    setNcRootCause(nc.root_cause || ''); setNcCorrectiveAction(nc.corrective_action || ''); setNcPreventiveAction(nc.preventive_action || '');
    setShowNcForm(true);
  };

  const handleSubmitNc = async (e: React.FormEvent) => {
    e.preventDefault();
    setNcErrors({});
    const payload = {
      type: ncType, source: ncSource, description: ncDescription, product: ncProduct,
      root_cause: ncRootCause, corrective_action: ncCorrectiveAction, preventive_action: ncPreventiveAction,
    };
    try {
      if (editingNcId) {
        const updated = await qualityApi.updateNc(editingNcId, payload);
        setNcs(prev => prev.map(nc => nc.id === editingNcId ? updated : nc));
        toast.success('Non-conformité mise à jour.');
      } else {
        const nc = await qualityApi.createNc(payload);
        setNcs(prev => [nc, ...prev]);
        toast.success('Non-conformité créée.');
      }
      resetNcForm();
      setShowNcForm(false);
    } catch (e) {
      console.error('Failed to save NC', e);
      setNcErrors(parseFieldErrors(e));
      toast.error(errorMessage(e, "Échec de l'enregistrement de la non-conformité."));
    }
  };

  const handleCloseNc = async (id: number) => {
    try {
      const updated = await qualityApi.closeNc(id);
      setNcs(prev => prev.map(nc => nc.id === id ? updated : nc));
      toast.success('Non-conformité clôturée.');
    } catch (e) {
      console.error('Failed to close NC', e);
      toast.error(errorMessage(e, 'Échec de la clôture.'));
    }
  };

  const handleDeleteNc = async (nc: NonConformity) => {
    if (!confirm(`Supprimer la non-conformité ${nc.nc_number} ?`)) return;
    try {
      await qualityApi.deleteNc(nc.id);
      setNcs(prev => prev.filter(n => n.id !== nc.id));
      toast.success('Non-conformité supprimée.');
    } catch (e) {
      console.error('Failed to delete NC', e);
      toast.error(errorMessage(e, 'Échec de la suppression.'));
    }
  };

  const handleUploadDoc = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!docFile) return;
    setDocErrors({});
    setUploading(true);
    try {
      const form = new FormData();
      form.append('title', docTitle);
      form.append('clause', docClause);
      form.append('version', docVersion);
      form.append('file', docFile);
      const doc = await qualityApi.createAuditDoc(form);
      setDocs(prev => [doc, ...prev]);
      setDocTitle(''); setDocClause(''); setDocVersion('1.0'); setDocFile(null);
      setShowDocForm(false);
      toast.success('Document ajouté.');
    } catch (e) {
      console.error('Failed to upload audit doc', e);
      setDocErrors(parseFieldErrors(e));
      toast.error(errorMessage(e, "Échec de l'envoi du document."));
    } finally {
      setUploading(false);
    }
  };

  const handleDeleteDoc = async (doc: AuditDocument) => {
    if (!confirm(`Supprimer le document "${doc.title}" ?`)) return;
    try {
      await qualityApi.deleteAuditDoc(doc.id);
      setDocs(prev => prev.filter(d => d.id !== doc.id));
      toast.success('Document supprimé.');
    } catch (e) {
      console.error('Failed to delete audit doc', e);
      toast.error(errorMessage(e, 'Échec de la suppression.'));
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
          {canManage && (
            <div className="flex justify-end">
              <button
                onClick={() => { if (showNcForm) { setShowNcForm(false); resetNcForm(); } else { resetNcForm(); setShowNcForm(true); } }}
                className="bg-cyan-500 hover:bg-cyan-600 text-white px-4 py-2 rounded font-sans text-sm font-medium transition-colors"
              >
                + Nouvelle NC
              </button>
            </div>
          )}

          {showNcForm && (
            <form onSubmit={handleSubmitNc} className="bg-panel border border-border rounded-md p-4 grid grid-cols-2 gap-4">
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
                <Input type="text" value={ncProduct} onChange={(e) => setNcProduct(e.target.value)}
                  placeholder="750ml / 250ml / Cap" error={ncErrors.product} />
              </div>
              <div>
                <label className="block text-xs font-semibold text-text-dim uppercase mb-1">Description *</label>
                <Input type="text" value={ncDescription} onChange={(e) => setNcDescription(e.target.value)} required
                  error={ncErrors.description} />
              </div>
              <div className="col-span-full">
                <label className="block text-xs font-semibold text-text-dim uppercase mb-1">Cause racine</label>
                <textarea value={ncRootCause} onChange={(e) => setNcRootCause(e.target.value)} rows={2}
                  className="w-full bg-bg border border-border rounded p-2 text-sm text-text focus:outline-none focus:border-cyan-500" />
              </div>
              <div>
                <label className="block text-xs font-semibold text-text-dim uppercase mb-1">Action corrective</label>
                <textarea value={ncCorrectiveAction} onChange={(e) => setNcCorrectiveAction(e.target.value)} rows={2}
                  className="w-full bg-bg border border-border rounded p-2 text-sm text-text focus:outline-none focus:border-cyan-500" />
              </div>
              <div>
                <label className="block text-xs font-semibold text-text-dim uppercase mb-1">Action préventive</label>
                <textarea value={ncPreventiveAction} onChange={(e) => setNcPreventiveAction(e.target.value)} rows={2}
                  className="w-full bg-bg border border-border rounded p-2 text-sm text-text focus:outline-none focus:border-cyan-500" />
              </div>
              <div className="col-span-full flex justify-end gap-3">
                <button type="button" onClick={() => { setShowNcForm(false); resetNcForm(); }} className="px-4 py-2 rounded text-sm text-text-dim hover:bg-panel-2">Annuler</button>
                <button type="submit" className="bg-cyan-500 hover:bg-cyan-600 text-white px-6 py-2 rounded text-sm font-medium transition-colors">
                  {editingNcId ? 'Enregistrer' : 'Créer'}
                </button>
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
                    <td className="py-3 text-right space-x-3">
                      {canManage && (
                        <button onClick={() => startEditNc(nc)} className="text-cyan-500 hover:text-cyan-400 text-xs font-medium">
                          Modifier
                        </button>
                      )}
                      {nc.status !== 'CLOSED' && (
                        <button
                          onClick={() => handleCloseNc(nc.id)}
                          className="text-cyan-500 hover:text-cyan-400 text-xs font-medium"
                        >
                          Clôturer
                        </button>
                      )}
                      {canManage && (
                        <button onClick={() => handleDeleteNc(nc)} className="text-red-500 hover:text-red-400 text-xs font-medium">
                          Supprimer
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
        <>
          {canManage && (
            <div className="flex justify-end">
              <button
                onClick={() => setShowDocForm(!showDocForm)}
                className="bg-cyan-500 hover:bg-cyan-600 text-white px-4 py-2 rounded font-sans text-sm font-medium transition-colors"
              >
                + Ajouter un document
              </button>
            </div>
          )}

          {showDocForm && (
            <form onSubmit={handleUploadDoc} className="bg-panel border border-border rounded-md p-4 grid grid-cols-2 md:grid-cols-4 gap-4 items-end">
              <div>
                <label className="block text-xs font-semibold text-text-dim uppercase mb-1">Titre *</label>
                <Input type="text" value={docTitle} onChange={(e) => setDocTitle(e.target.value)} required error={docErrors.title} />
              </div>
              <div>
                <label className="block text-xs font-semibold text-text-dim uppercase mb-1">Clause ISO</label>
                <Input type="text" value={docClause} onChange={(e) => setDocClause(e.target.value)} placeholder="7.1.5" error={docErrors.clause} />
              </div>
              <div>
                <label className="block text-xs font-semibold text-text-dim uppercase mb-1">Version</label>
                <Input type="text" value={docVersion} onChange={(e) => setDocVersion(e.target.value)} error={docErrors.version} />
              </div>
              <div>
                <label className="block text-xs font-semibold text-text-dim uppercase mb-1">Fichier *</label>
                <input type="file" required onChange={(e) => setDocFile(e.target.files?.[0] || null)}
                  className="w-full text-sm text-text-dim file:mr-3 file:py-2 file:px-3 file:rounded file:border-0 file:bg-cyan-600 file:text-white file:text-sm hover:file:bg-cyan-500 file:cursor-pointer" />
              </div>
              <div className="col-span-full flex justify-end gap-3">
                <button type="button" onClick={() => setShowDocForm(false)} className="px-4 py-2 rounded text-sm text-text-dim hover:bg-panel-2">Annuler</button>
                <button type="submit" disabled={uploading} className="bg-cyan-500 hover:bg-cyan-600 disabled:opacity-50 text-white px-6 py-2 rounded text-sm font-medium transition-colors">
                  {uploading ? 'Envoi...' : 'Envoyer'}
                </button>
              </div>
            </form>
          )}

          <div className="bg-panel border border-border rounded-md flex-1 p-4 overflow-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-border text-[10px] uppercase tracking-wider text-text-dim">
                  <th className="pb-2 font-semibold">Titre</th>
                  <th className="pb-2 font-semibold">Clause ISO</th>
                  <th className="pb-2 font-semibold">Version</th>
                  <th className="pb-2 font-semibold">Statut</th>
                  <th className="pb-2 font-semibold">Uploadé par</th>
                  <th className="pb-2 font-semibold text-right">Action</th>
                </tr>
              </thead>
              <tbody>
                {docs.map(doc => (
                  <tr key={doc.id} className="border-b border-border/30 hover:bg-panel-2/50">
                    <td className="py-3 text-sm font-medium">
                      <a href={doc.file} target="_blank" rel="noreferrer" className="hover:text-cyan-500">{doc.title}</a>
                    </td>
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
                    <td className="py-3 text-right">
                      {canManage && (
                        <button onClick={() => handleDeleteDoc(doc)} className="text-red-500 hover:text-red-400 text-xs font-medium">
                          Supprimer
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
    </div>
  );
}
