'use client';

import { useEffect, useState } from 'react';
import { toast } from 'sonner';
import { costsApi } from '@/lib/api/costs';
import { machinesApi } from '@/lib/api/machines';
import { stockApi } from '@/lib/api/stock';
import { catalogApi } from '@/lib/api/catalog';
import {
  CostParameter, Parameter, StockItem,
  BottleCharacteristic, BouchantType,
} from '@/lib/api/types';
import { errorMessage, parseFieldErrors } from '@/lib/api/errors';
import { Input } from '@/components/ui/input';

const BOUCHANT_TYPES: BouchantType[] = ['HDPE', 'LDPE', 'COLORANT'];

export default function SettingsPage() {
  const [tab, setTab] = useState<'bottles' | 'costs' | 'steg'>('bottles');
  const [costParams, setCostParams] = useState<CostParameter[]>([]);
  const [saving, setSaving] = useState(false);

  // STEG settings (Parameter rows, category="steg" — see plan.md §8)
  const [stegParams, setStegParams] = useState<Parameter[]>([]);
  const [stegEnabled, setStegEnabled] = useState(false);
  const [stegTime, setStegTime] = useState('');
  const [stegData, setStegData] = useState('');
  const [stegSaving, setStegSaving] = useState(false);

  // Bottle characteristics (plan.md §10) — per-category recipe: how much
  // matière première and colorant one bottle uses, and the same for its
  // bouchant. raw_material/colorant reference actual Stock items so
  // different categories can point at different quality/reference stock.
  const [bottles, setBottles] = useState<BottleCharacteristic[]>([]);
  const [rawMaterials, setRawMaterials] = useState<StockItem[]>([]);
  const [colorants, setColorants] = useState<StockItem[]>([]);
  const [showBottleForm, setShowBottleForm] = useState(false);
  const [editingBottleId, setEditingBottleId] = useState<number | null>(null);
  const [bCategory, setBCategory] = useState('');
  const [bReference, setBReference] = useState('');
  const [bTimePerBottleSec, setBTimePerBottleSec] = useState('');
  const [bRawMaterial, setBRawMaterial] = useState('');
  const [bRawMaterialQty, setBRawMaterialQty] = useState('0');
  const [bColorant, setBColorant] = useState('');
  const [bColorantQty, setBColorantQty] = useState('0');
  const [bBouchantType, setBBouchantType] = useState<BouchantType>('HDPE');
  const [bBouchantRawQty, setBBouchantRawQty] = useState('0');
  const [bBouchantColorantQty, setBBouchantColorantQty] = useState('0');
  const [bottleErrors, setBottleErrors] = useState<Record<string, string>>({});
  const [bottleSubmitting, setBottleSubmitting] = useState(false);

  // New cost parameter form
  const [showParamForm, setShowParamForm] = useState(false);
  const [newParamName, setNewParamName] = useState('');
  const [newParamLabel, setNewParamLabel] = useState('');
  const [newParamUnit, setNewParamUnit] = useState('');
  const [newParamValue, setNewParamValue] = useState('0');
  const [paramErrors, setParamErrors] = useState<Record<string, string>>({});

  useEffect(() => {
    refreshParams();
    refreshSteg();
    refreshBottles();
    stockApi.getItems({ type: 'RAW_MATERIAL', is_active: 'true' }).then(res => setRawMaterials(res.results)).catch(console.error);
    stockApi.getItems({ type: 'COLORANT', is_active: 'true' }).then(res => setColorants(res.results)).catch(console.error);
  }, []);

  const refreshParams = () => costsApi.getParameters().then(res => setCostParams(res.results)).catch(console.error);

  const refreshSteg = () => machinesApi.getSteg().then(res => {
    setStegParams(res.results);
    setStegEnabled(Number(res.results.find(p => p.key === 'STEG_ENABLED')?.value) === 1);
    setStegTime(res.results.find(p => p.key === 'STEG_TIME')?.text_value || '');
    setStegData(res.results.find(p => p.key === 'STEG_DATA')?.text_value || '');
  }).catch(console.error);

  const handleSaveSteg = async () => {
    setStegSaving(true);
    try {
      const enabledParam = stegParams.find(p => p.key === 'STEG_ENABLED');
      const timeParam = stegParams.find(p => p.key === 'STEG_TIME');
      const dataParam = stegParams.find(p => p.key === 'STEG_DATA');
      await Promise.all([
        enabledParam && machinesApi.updateParameter(enabledParam.id, { value: stegEnabled ? '1' : '0' }),
        timeParam && machinesApi.updateParameter(timeParam.id, { text_value: stegTime }),
        dataParam && machinesApi.updateParameter(dataParam.id, { text_value: stegData }),
      ].filter(Boolean));
      await refreshSteg();
      toast.success('Paramètres STEG enregistrés.');
    } catch (e) {
      console.error('Failed to save STEG settings', e);
      toast.error(errorMessage(e, 'Échec de la sauvegarde des paramètres STEG.'));
    } finally {
      setStegSaving(false);
    }
  };

  const refreshBottles = () => catalogApi.getCharacteristics().then(res => setBottles(res.results)).catch(console.error);

  const resetBottleForm = () => {
    setEditingBottleId(null);
    setBCategory(''); setBReference(''); setBTimePerBottleSec('');
    setBRawMaterial(''); setBRawMaterialQty('0');
    setBColorant(''); setBColorantQty('0');
    setBBouchantType('HDPE'); setBBouchantRawQty('0'); setBBouchantColorantQty('0');
    setBottleErrors({});
  };

  const startCreateBottle = () => {
    resetBottleForm();
    if (rawMaterials[0]) setBRawMaterial(String(rawMaterials[0].id));
    setShowBottleForm(true);
  };

  const startEditBottle = (b: BottleCharacteristic) => {
    setEditingBottleId(b.id);
    setBCategory(b.category); setBReference(b.reference);
    setBTimePerBottleSec(b.time_per_bottle_sec || '');
    setBRawMaterial(String(b.raw_material)); setBRawMaterialQty(b.raw_material_qty_g);
    setBColorant(b.colorant ? String(b.colorant) : ''); setBColorantQty(b.colorant_qty_g);
    setBBouchantType(b.bouchant_type); setBBouchantRawQty(b.bouchant_raw_material_qty_g); setBBouchantColorantQty(b.bouchant_colorant_qty_g);
    setBottleErrors({});
    setShowBottleForm(true);
  };

  const handleSaveBottle = async (e: React.FormEvent) => {
    e.preventDefault();
    setBottleSubmitting(true);
    setBottleErrors({});
    const payload = {
      category: bCategory, reference: bReference,
      time_per_bottle_sec: bTimePerBottleSec || null,
      raw_material: bRawMaterial ? Number(bRawMaterial) : undefined,
      raw_material_qty_g: bRawMaterialQty,
      colorant: bColorant ? Number(bColorant) : null,
      colorant_qty_g: bColorantQty,
      bouchant_type: bBouchantType,
      bouchant_raw_material_qty_g: bBouchantRawQty,
      bouchant_colorant_qty_g: bBouchantColorantQty,
    };
    try {
      if (editingBottleId) {
        await catalogApi.updateCharacteristic(editingBottleId, payload);
      } else {
        await catalogApi.createCharacteristic(payload);
      }
      resetBottleForm();
      setShowBottleForm(false);
      await refreshBottles();
      toast.success('Caractéristique bouteille enregistrée.');
    } catch (e) {
      console.error('Failed to save bottle characteristic', e);
      setBottleErrors(parseFieldErrors(e));
      toast.error(errorMessage(e, "Échec de l'enregistrement."));
    } finally {
      setBottleSubmitting(false);
    }
  };

  const handleArchiveBottle = async (b: BottleCharacteristic) => {
    if (!confirm(`Archiver la catégorie "${b.category}" ?`)) return;
    try {
      await catalogApi.archiveCharacteristic(b.id);
      await refreshBottles();
      toast.success('Catégorie archivée.');
    } catch (e) {
      console.error('Failed to archive bottle characteristic', e);
      toast.error(errorMessage(e, "Échec de l'archivage."));
    }
  };

  const updateCostParam = (id: number, newValue: number) => {
    setCostParams(prev => prev.map(p => p.id === id ? { ...p, value: newValue } : p));
  };

  const handleSaveCosts = async () => {
    setSaving(true);
    try {
      await costsApi.updateParameters(costParams);
      toast.success('Paramètres sauvegardés.');
    } catch (e) {
      console.error('Failed to save', e);
      toast.error(errorMessage(e, 'Échec de la sauvegarde.'));
    } finally {
      setSaving(false);
    }
  };

  const handleCreateParam = async (e: React.FormEvent) => {
    e.preventDefault();
    setParamErrors({});
    try {
      await costsApi.createParameter({ name: newParamName, label: newParamLabel, unit: newParamUnit, value: parseFloat(newParamValue) || 0 });
      setNewParamName(''); setNewParamLabel(''); setNewParamUnit(''); setNewParamValue('0');
      setShowParamForm(false);
      await refreshParams();
      toast.success('Paramètre créé.');
    } catch (e) {
      console.error('Failed to create parameter', e);
      setParamErrors(parseFieldErrors(e));
      toast.error(errorMessage(e, 'Échec de la création du paramètre.'));
    }
  };

  const handleDeleteParam = async (param: CostParameter) => {
    if (!confirm(`Supprimer le paramètre "${param.name}" ?`)) return;
    try {
      await costsApi.deleteParameter(param.id);
      await refreshParams();
      toast.success('Paramètre supprimé.');
    } catch (e) {
      console.error('Failed to delete parameter', e);
      toast.error(errorMessage(e, 'Échec de la suppression.'));
    }
  };

  return (
    <div className="p-6 space-y-6 h-full flex flex-col">
      <h1 className="font-heading font-bold text-2xl uppercase tracking-wide text-text">Paramètres Système</h1>

      {/* Tabs */}
      <div className="flex gap-1 bg-bg border border-border rounded-md p-1 w-fit">
        <button
          onClick={() => setTab('bottles')}
          className={`px-4 py-2 rounded text-sm font-medium transition-colors ${tab === 'bottles' ? 'bg-panel text-text shadow' : 'text-text-dim hover:text-text'}`}
        >
          Caractéristiques bouteille
        </button>
        <button
          onClick={() => setTab('costs')}
          className={`px-4 py-2 rounded text-sm font-medium transition-colors ${tab === 'costs' ? 'bg-panel text-text shadow' : 'text-text-dim hover:text-text'}`}
        >
          Paramètres de Coûts
        </button>
        <button
          onClick={() => setTab('steg')}
          className={`px-4 py-2 rounded text-sm font-medium transition-colors ${tab === 'steg' ? 'bg-panel text-text shadow' : 'text-text-dim hover:text-text'}`}
        >
          STEG
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
                <Input type="text" value={newParamName} onChange={(e) => setNewParamName(e.target.value)} required error={paramErrors.name} />
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

      {tab === 'steg' && (
        <div className="bg-panel border border-border rounded-md flex-1 p-6 overflow-auto">
          <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-3 mb-6">
            <h2 className="text-sm font-semibold text-text-dim tracking-wider uppercase">STEG (délestage électrique)</h2>
            <button
              onClick={handleSaveSteg}
              disabled={stegSaving}
              className="bg-cyan-500 hover:bg-cyan-600 disabled:opacity-50 text-white px-6 py-2 rounded text-sm font-medium transition-colors"
            >
              {stegSaving ? 'Enregistrement...' : 'Sauvegarder'}
            </button>
          </div>

          <div className="max-w-md space-y-4">
            <label className="flex items-center gap-3 bg-panel-2 border border-border rounded-md p-4 cursor-pointer">
              <input type="checkbox" checked={stegEnabled} onChange={(e) => setStegEnabled(e.target.checked)} />
              <div>
                <div className="text-sm font-medium text-text">STEG activé</div>
                <div className="text-xs text-text-dim">Affiche l'information STEG au-dessus du nom d'utilisateur (barre latérale).</div>
              </div>
            </label>
            <div>
              <label className="block text-xs font-semibold text-text-dim uppercase mb-1">Heure STEG (optionnel)</label>
              <Input type="text" value={stegTime} onChange={(e) => setStegTime(e.target.value)} placeholder="ex: 14h00 - 16h00" disabled={!stegEnabled} />
            </div>
            <div>
              <label className="block text-xs font-semibold text-text-dim uppercase mb-1">Information affichée (optionnel)</label>
              <Input type="text" value={stegData} onChange={(e) => setStegData(e.target.value)} placeholder="ex: Coupure programmée zone 3" disabled={!stegEnabled} />
            </div>
          </div>
        </div>
      )}

      {tab === 'bottles' && (
        <div className="bg-panel border border-border rounded-md flex-1 p-6 overflow-auto">
          <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-3 mb-6">
            <div>
              <h2 className="text-sm font-semibold text-text-dim tracking-wider uppercase">Caractéristiques bouteille</h2>
              <p className="text-xs text-text-dim mt-1">Recette par catégorie de bouteille — quantité de matière première et de colorant utilisée, pour la bouteille et pour le bouchon.</p>
            </div>
            <button
              onClick={startCreateBottle}
              className="bg-cyan-500 hover:bg-cyan-600 text-white px-4 py-2 rounded text-sm font-medium transition-colors whitespace-nowrap"
            >
              + Nouvelle catégorie
            </button>
          </div>

          {showBottleForm && (
            <form onSubmit={handleSaveBottle} className="bg-panel-2 border border-border rounded-md p-4 space-y-4 mb-6">
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-text-dim uppercase mb-1">Catégorie bouteille *</label>
                  <Input type="text" value={bCategory} onChange={(e) => setBCategory(e.target.value)} placeholder="ex: Bouteille 750ml Standard" required error={bottleErrors.category} />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-text-dim uppercase mb-1">Référence (optionnel)</label>
                  <Input type="text" value={bReference} onChange={(e) => setBReference(e.target.value)} error={bottleErrors.reference} />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-text-dim uppercase mb-1">Temps / bouteille (s)</label>
                  <Input type="number" step="0.01" min="0.01" value={bTimePerBottleSec} onChange={(e) => setBTimePerBottleSec(e.target.value)} error={bottleErrors.time_per_bottle_sec} />
                </div>
              </div>

              <div className="border-t border-border/50 pt-4">
                <h3 className="text-xs font-semibold text-text-dim uppercase mb-3">Bouteille (corps)</h3>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  <div>
                    <label className="block text-xs font-semibold text-text-dim uppercase mb-1">Matière première *</label>
                    <select value={bRawMaterial} onChange={(e) => setBRawMaterial(e.target.value)} required
                      className="w-full bg-bg border border-border rounded p-2 text-sm text-text focus:outline-none focus:border-cyan-500">
                      <option value="">Sélectionner...</option>
                      {rawMaterials.map(m => <option key={m.id} value={m.id}>{m.name} ({m.reference})</option>)}
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-text-dim uppercase mb-1">Quantité (g / bouteille)</label>
                    <input type="number" step="0.001" min="0" value={bRawMaterialQty} onChange={(e) => setBRawMaterialQty(e.target.value)}
                      className="w-full bg-bg border border-border rounded p-2 text-sm text-text focus:outline-none focus:border-cyan-500" />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-text-dim uppercase mb-1">Colorant</label>
                    <select value={bColorant} onChange={(e) => setBColorant(e.target.value)}
                      className="w-full bg-bg border border-border rounded p-2 text-sm text-text focus:outline-none focus:border-cyan-500">
                      <option value="">Aucun</option>
                      {colorants.map(c => <option key={c.id} value={c.id}>{c.name} ({c.reference}{c.ral ? ` — RAL ${c.ral}` : ''})</option>)}
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-text-dim uppercase mb-1">Quantité colorant (g / bouteille)</label>
                    <input type="number" step="0.001" min="0" value={bColorantQty} onChange={(e) => setBColorantQty(e.target.value)}
                      className="w-full bg-bg border border-border rounded p-2 text-sm text-text focus:outline-none focus:border-cyan-500" />
                  </div>
                </div>
              </div>

              <div className="border-t border-border/50 pt-4">
                <h3 className="text-xs font-semibold text-text-dim uppercase mb-3">Bouchant (bouchon)</h3>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  <div>
                    <label className="block text-xs font-semibold text-text-dim uppercase mb-1">Type</label>
                    <select value={bBouchantType} onChange={(e) => setBBouchantType(e.target.value as BouchantType)}
                      className="w-full bg-bg border border-border rounded p-2 text-sm text-text focus:outline-none focus:border-cyan-500">
                      {BOUCHANT_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-text-dim uppercase mb-1">Matière première (g / bouchon)</label>
                    <input type="number" step="0.001" min="0" value={bBouchantRawQty} onChange={(e) => setBBouchantRawQty(e.target.value)}
                      className="w-full bg-bg border border-border rounded p-2 text-sm text-text focus:outline-none focus:border-cyan-500" />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-text-dim uppercase mb-1">Colorant (g / bouchon)</label>
                    <input type="number" step="0.001" min="0" value={bBouchantColorantQty} onChange={(e) => setBBouchantColorantQty(e.target.value)}
                      className="w-full bg-bg border border-border rounded p-2 text-sm text-text focus:outline-none focus:border-cyan-500" />
                  </div>
                </div>
              </div>

              <div className="flex justify-end gap-3 pt-2">
                <button type="button" onClick={() => { setShowBottleForm(false); resetBottleForm(); }} className="px-4 py-2 rounded text-sm text-text-dim hover:bg-panel transition-colors">
                  Annuler
                </button>
                <button type="submit" disabled={bottleSubmitting} className="bg-cyan-500 hover:bg-cyan-600 disabled:opacity-50 text-white px-6 py-2 rounded text-sm font-medium transition-colors">
                  {bottleSubmitting ? 'Enregistrement...' : editingBottleId ? 'Enregistrer' : 'Créer'}
                </button>
              </div>
            </form>
          )}

          {bottles.length === 0 ? (
            <p className="text-sm text-text-dim">Aucune catégorie de bouteille définie.</p>
          ) : (
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-border text-[10px] uppercase tracking-wider text-text-dim">
                  <th className="pb-2 font-semibold">Catégorie</th>
                  <th className="pb-2 font-semibold text-right">Temps / bouteille</th>
                  <th className="pb-2 font-semibold">Matière première</th>
                  <th className="pb-2 font-semibold">Colorant</th>
                  <th className="pb-2 font-semibold">Bouchant</th>
                  <th className="pb-2 font-semibold text-right">Actions</th>
                </tr>
              </thead>
              <tbody>
                {bottles.map(b => (
                  <tr key={b.id} className="border-b border-border/30 hover:bg-panel-2/50">
                    <td className="py-3">
                      <div className="text-sm font-medium">{b.category}</div>
                      <div className="text-xs text-text-dim font-mono">{b.reference || '—'}</div>
                    </td>
                    <td className="py-3 font-mono text-xs text-text-dim text-right">{b.time_per_bottle_sec ? `${b.time_per_bottle_sec} s` : '—'}</td>
                    <td className="py-3 text-xs text-text-dim">
                      {b.raw_material_name} ({b.raw_material_reference})<br />
                      <span className="font-mono">{b.raw_material_qty_g} g</span>
                    </td>
                    <td className="py-3 text-xs text-text-dim">
                      {b.colorant_name ? <>{b.colorant_name} ({b.colorant_reference})<br /><span className="font-mono">{b.colorant_qty_g} g</span></> : '—'}
                    </td>
                    <td className="py-3 text-xs text-text-dim">
                      {b.bouchant_type}<br />
                      <span className="font-mono">{b.bouchant_raw_material_qty_g} g MP • {b.bouchant_colorant_qty_g} g col.</span>
                    </td>
                    <td className="py-3 text-right space-x-3 whitespace-nowrap">
                      <button onClick={() => startEditBottle(b)} className="text-cyan-500 hover:text-cyan-400 text-xs font-medium">Modifier</button>
                      <button onClick={() => handleArchiveBottle(b)} className="text-red-500 hover:text-red-400 text-xs font-medium">Archiver</button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      )}
    </div>
  );
}
