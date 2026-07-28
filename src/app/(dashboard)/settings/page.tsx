'use client';

import { useEffect, useState } from 'react';
import { costsApi } from '@/lib/api/costs';
import { alertsApi } from '@/lib/api/alerts';
import { CostParameter, AlertCategory, AlertSeverity, PaginatedResponse } from '@/lib/api/types';

const SEVERITIES: AlertSeverity[] = ['CRITICAL', 'MAJOR', 'MINOR', 'INFO'];

export default function SettingsPage() {
  const [tab, setTab] = useState<'costs' | 'categories'>('costs');
  const [costParams, setCostParams] = useState<CostParameter[]>([]);
  const [categories, setCategories] = useState<AlertCategory[]>([]);
  const [saving, setSaving] = useState(false);

  // New cost parameter form
  const [showParamForm, setShowParamForm] = useState(false);
  const [newParamName, setNewParamName] = useState('');
  const [newParamLabel, setNewParamLabel] = useState('');
  const [newParamUnit, setNewParamUnit] = useState('');
  const [newParamValue, setNewParamValue] = useState('0');

  // Category create/edit form
  const [showCatForm, setShowCatForm] = useState(false);
  const [editingCatId, setEditingCatId] = useState<number | null>(null);
  const [catName, setCatName] = useState('');
  const [catCode, setCatCode] = useState('');
  const [catSeverity, setCatSeverity] = useState<AlertSeverity>('MAJOR');
  const [catColor, setCatColor] = useState('#f59e0b');
  const [catRequiresMaintenance, setCatRequiresMaintenance] = useState(true);

  useEffect(() => {
    refreshParams();
    refreshCategories();
  }, []);

  const refreshParams = () => costsApi.getParameters().then(res => setCostParams(res.results)).catch(console.error);
  const refreshCategories = () => alertsApi.getCategories().then(res => setCategories(res.results)).catch(console.error);

  const updateCostParam = (id: number, newValue: number) => {
    setCostParams(prev => prev.map(p => p.id === id ? { ...p, value: newValue } : p));
  };

  const handleSaveCosts = async () => {
    setSaving(true);
    try {
      await costsApi.updateParameters(costParams);
    } catch (e) {
      console.error('Failed to save', e);
    } finally {
      setSaving(false);
    }
  };

  const handleCreateParam = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await costsApi.createParameter({ name: newParamName, label: newParamLabel, unit: newParamUnit, value: parseFloat(newParamValue) || 0 });
      setNewParamName(''); setNewParamLabel(''); setNewParamUnit(''); setNewParamValue('0');
      setShowParamForm(false);
      await refreshParams();
    } catch (e) {
      console.error('Failed to create parameter', e);
    }
  };

  const handleDeleteParam = async (param: CostParameter) => {
    if (!confirm(`Supprimer le paramètre "${param.name}" ?`)) return;
    try {
      await costsApi.deleteParameter(param.id);
      await refreshParams();
    } catch (e) {
      console.error('Failed to delete parameter', e);
    }
  };

  const resetCatForm = () => {
    setEditingCatId(null);
    setCatName(''); setCatCode(''); setCatSeverity('MAJOR'); setCatColor('#f59e0b'); setCatRequiresMaintenance(true);
  };

  const startCreateCat = () => {
    resetCatForm();
    setShowCatForm(true);
  };

  const startEditCat = (cat: AlertCategory) => {
    setEditingCatId(cat.id);
    setCatName(cat.name); setCatCode(cat.code); setCatSeverity(cat.severity_default);
    setCatColor(cat.color || '#f59e0b'); setCatRequiresMaintenance(cat.requires_maintenance);
    setShowCatForm(true);
  };

  const handleSaveCat = async (e: React.FormEvent) => {
    e.preventDefault();
    const payload = { name: catName, code: catCode, severity_default: catSeverity, color: catColor, requires_maintenance: catRequiresMaintenance };
    try {
      if (editingCatId) {
        await alertsApi.updateCategory(editingCatId, payload);
      } else {
        await alertsApi.createCategory(payload);
      }
      resetCatForm();
      setShowCatForm(false);
      await refreshCategories();
    } catch (e) {
      console.error('Failed to save category', e);
    }
  };

  const handleDeleteCat = async (cat: AlertCategory) => {
    if (!confirm(`Supprimer la catégorie "${cat.name}" ?`)) return;
    try {
      await alertsApi.deleteCategory(cat.id);
      await refreshCategories();
    } catch (e: any) {
      console.error('Failed to delete category', e);
      let msg = 'Échec de la suppression.';
      try { msg = JSON.parse(e.message).detail || msg; } catch {}
      alert(msg);
    }
  };

  return (
    <div className="p-6 space-y-6 h-full flex flex-col">
      <h1 className="font-heading font-bold text-2xl uppercase tracking-wide text-text">Paramètres Système</h1>

      {/* Tabs */}
      <div className="flex gap-1 bg-bg border border-border rounded-md p-1 w-fit">
        <button
          onClick={() => setTab('costs')}
          className={`px-4 py-2 rounded text-sm font-medium transition-colors ${tab === 'costs' ? 'bg-panel text-text shadow' : 'text-text-dim hover:text-text'}`}
        >
          Paramètres de Coûts
        </button>
        <button
          onClick={() => setTab('categories')}
          className={`px-4 py-2 rounded text-sm font-medium transition-colors ${tab === 'categories' ? 'bg-panel text-text shadow' : 'text-text-dim hover:text-text'}`}
        >
          Catégories d'Alertes
        </button>
      </div>

      {tab === 'costs' && (
        <div className="bg-panel border border-border rounded-md flex-1 p-6 overflow-auto">
          <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-3 mb-6">
            <h2 className="text-sm font-semibold text-text-dim tracking-wider uppercase">Coûts Unitaires (DT)</h2>
            <div className="flex gap-3">
              <button
                onClick={() => setShowParamForm(!showParamForm)}
                className="bg-panel-2 hover:bg-panel-2/70 text-text px-4 py-2 rounded text-sm font-medium transition-colors border border-border"
              >
                + Nouveau paramètre
              </button>
              <button
                onClick={handleSaveCosts}
                disabled={saving}
                className="bg-cyan-500 hover:bg-cyan-600 disabled:opacity-50 text-white px-6 py-2 rounded text-sm font-medium transition-colors"
              >
                {saving ? 'Enregistrement...' : 'Sauvegarder'}
              </button>
            </div>
          </div>

          {showParamForm && (
            <form onSubmit={handleCreateParam} className="bg-panel-2 border border-border rounded-md p-4 grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
              <div>
                <label className="block text-xs font-semibold text-text-dim uppercase mb-1">Clé * (ex: COST_PET_KG)</label>
                <input type="text" value={newParamName} onChange={(e) => setNewParamName(e.target.value)} required
                  className="w-full bg-bg border border-border rounded p-2 text-sm text-text focus:outline-none focus:border-cyan-500" />
              </div>
              <div>
                <label className="block text-xs font-semibold text-text-dim uppercase mb-1">Libellé</label>
                <input type="text" value={newParamLabel} onChange={(e) => setNewParamLabel(e.target.value)}
                  className="w-full bg-bg border border-border rounded p-2 text-sm text-text focus:outline-none focus:border-cyan-500" />
              </div>
              <div>
                <label className="block text-xs font-semibold text-text-dim uppercase mb-1">Unité</label>
                <input type="text" value={newParamUnit} onChange={(e) => setNewParamUnit(e.target.value)} placeholder="DT/kg"
                  className="w-full bg-bg border border-border rounded p-2 text-sm text-text focus:outline-none focus:border-cyan-500" />
              </div>
              <div>
                <label className="block text-xs font-semibold text-text-dim uppercase mb-1">Valeur</label>
                <input type="number" step="0.001" value={newParamValue} onChange={(e) => setNewParamValue(e.target.value)}
                  className="w-full bg-bg border border-border rounded p-2 text-sm text-text focus:outline-none focus:border-cyan-500" />
              </div>
              <div className="col-span-full flex justify-end gap-3">
                <button type="button" onClick={() => setShowParamForm(false)} className="px-4 py-2 rounded text-sm text-text-dim hover:bg-panel transition-colors">
                  Annuler
                </button>
                <button type="submit" className="bg-cyan-500 hover:bg-cyan-600 text-white px-6 py-2 rounded text-sm font-medium transition-colors">
                  Créer
                </button>
              </div>
            </form>
          )}

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {costParams.map(param => (
              <div key={param.id} className="flex items-center gap-4 bg-panel-2 border border-border rounded-md p-4">
                <div className="flex-1">
                  <div className="font-sans text-sm font-medium">{param.label || param.name}</div>
                  <div className="text-xs text-text-dim">{param.name} {param.unit && `• ${param.unit}`}</div>
                </div>
                <input
                  type="number"
                  step="0.001"
                  value={param.value}
                  onChange={(e) => updateCostParam(param.id, parseFloat(e.target.value) || 0)}
                  className="w-32 bg-bg border border-border rounded p-2 text-sm font-mono text-text text-right focus:outline-none focus:border-cyan-500"
                />
                <button
                  onClick={() => handleDeleteParam(param)}
                  className="text-red-500 hover:text-red-400 text-xs font-medium px-2"
                  title="Supprimer"
                >
                  ✕
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {tab === 'categories' && (
        <div className="bg-panel border border-border rounded-md flex-1 p-6 overflow-auto">
          <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-3 mb-6">
            <h2 className="text-sm font-semibold text-text-dim tracking-wider uppercase">Catégories d'Alertes</h2>
            <button
              onClick={startCreateCat}
              className="bg-cyan-500 hover:bg-cyan-600 text-white px-4 py-2 rounded text-sm font-medium transition-colors"
            >
              + Nouvelle catégorie
            </button>
          </div>

          {showCatForm && (
            <form onSubmit={handleSaveCat} className="bg-panel-2 border border-border rounded-md p-4 grid grid-cols-2 md:grid-cols-5 gap-4 mb-6">
              <div>
                <label className="block text-xs font-semibold text-text-dim uppercase mb-1">Nom *</label>
                <input type="text" value={catName} onChange={(e) => setCatName(e.target.value)} required
                  className="w-full bg-bg border border-border rounded p-2 text-sm text-text focus:outline-none focus:border-cyan-500" />
              </div>
              <div>
                <label className="block text-xs font-semibold text-text-dim uppercase mb-1">Code *</label>
                <input type="text" value={catCode} onChange={(e) => setCatCode(e.target.value)} required
                  className="w-full bg-bg border border-border rounded p-2 text-sm text-text focus:outline-none focus:border-cyan-500" />
              </div>
              <div>
                <label className="block text-xs font-semibold text-text-dim uppercase mb-1">Sévérité par défaut</label>
                <select value={catSeverity} onChange={(e) => setCatSeverity(e.target.value as AlertSeverity)}
                  className="w-full bg-bg border border-border rounded p-2 text-sm text-text focus:outline-none focus:border-cyan-500">
                  {SEVERITIES.map(s => <option key={s} value={s}>{s}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-xs font-semibold text-text-dim uppercase mb-1">Couleur</label>
                <input type="color" value={catColor} onChange={(e) => setCatColor(e.target.value)}
                  className="w-full bg-bg border border-border rounded p-1 h-9" />
              </div>
              <div className="flex items-end pb-2">
                <label className="flex items-center gap-2 text-sm text-text-dim">
                  <input type="checkbox" checked={catRequiresMaintenance} onChange={(e) => setCatRequiresMaintenance(e.target.checked)} />
                  Maintenance requise
                </label>
              </div>
              <div className="col-span-full flex justify-end gap-3">
                <button type="button" onClick={() => { setShowCatForm(false); resetCatForm(); }} className="px-4 py-2 rounded text-sm text-text-dim hover:bg-panel transition-colors">
                  Annuler
                </button>
                <button type="submit" className="bg-cyan-500 hover:bg-cyan-600 text-white px-6 py-2 rounded text-sm font-medium transition-colors">
                  {editingCatId ? 'Enregistrer' : 'Créer'}
                </button>
              </div>
            </form>
          )}

          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-border text-[10px] uppercase tracking-wider text-text-dim">
                <th className="pb-2 font-semibold">Couleur</th>
                <th className="pb-2 font-semibold">Nom</th>
                <th className="pb-2 font-semibold">Code</th>
                <th className="pb-2 font-semibold">Sévérité par défaut</th>
                <th className="pb-2 font-semibold text-center">Maintenance requise</th>
                <th className="pb-2 font-semibold text-right">Actions</th>
              </tr>
            </thead>
            <tbody>
              {categories.map(cat => (
                <tr key={cat.id} className="border-b border-border/30 hover:bg-panel-2/50">
                  <td className="py-3">
                    <div className="w-4 h-4 rounded-full" style={{ backgroundColor: cat.color || '#888' }} />
                  </td>
                  <td className="py-3 font-sans text-sm font-medium">{cat.name}</td>
                  <td className="py-3 font-mono text-xs text-text-dim">{cat.code}</td>
                  <td className="py-3 font-mono text-xs">{cat.severity_default}</td>
                  <td className="py-3 text-center font-mono text-xs">{cat.requires_maintenance ? '✓' : '—'}</td>
                  <td className="py-3 text-right space-x-3">
                    <button onClick={() => startEditCat(cat)} className="text-cyan-500 hover:text-cyan-400 text-xs font-medium">
                      Modifier
                    </button>
                    <button onClick={() => handleDeleteCat(cat)} className="text-red-500 hover:text-red-400 text-xs font-medium">
                      Supprimer
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
