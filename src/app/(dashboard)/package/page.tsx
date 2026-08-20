'use client';

import { useEffect, useState } from 'react';
import { toast } from 'sonner';
import { packageApi } from '@/lib/api/package';
import { stockApi } from '@/lib/api/stock';
import { machinesApi } from '@/lib/api/machines';
import { catalogApi } from '@/lib/api/catalog';
import { Package, PackageSummary, PersonnelSnapshotEntry, StockItem, Machine, BottleCharacteristic } from '@/lib/api/types';
import { errorMessage, parseFieldErrors } from '@/lib/api/errors';
import { Input } from '@/components/ui/input';
import { ROLE_LABELS, UserRole } from '@/lib/auth/rbac';

export default function PackagePage() {
  const [packages, setPackages] = useState<Package[]>([]);
  const [search, setSearch] = useState('');
  const [dateFilter, setDateFilter] = useState('');
  const [machineFilter, setMachineFilter] = useState('');
  const [selected, setSelected] = useState<Package | null>(null);
  const [creating, setCreating] = useState(false);
  const [stockItems, setStockItems] = useState<StockItem[]>([]);
  const [machines, setMachines] = useState<Machine[]>([]);
  const [bottles, setBottles] = useState<BottleCharacteristic[]>([]);
  const [summary, setSummary] = useState<PackageSummary | null>(null);

  const refresh = () => {
    const params: Record<string, string> = {};
    if (search) params.search = search;
    if (dateFilter) params.date = dateFilter;
    if (machineFilter) params.machine = machineFilter;
    packageApi.getPackages(Object.keys(params).length ? params : undefined).then((res) => setPackages(res.results)).catch(console.error);
    packageApi.getSummary(Object.keys(params).length ? params : undefined).then(setSummary).catch(console.error);
  };

  useEffect(() => {
    stockApi.getItems({ is_active: 'true' }).then((res) => setStockItems(res.results)).catch(console.error);
    machinesApi.getMachines().then((res) => setMachines(res.results)).catch(console.error);
    catalogApi.getCharacteristics().then((res) => setBottles(res.results)).catch(console.error);
  }, []);

  useEffect(() => {
    refresh();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [search, dateFilter, machineFilter]);

  const afterSave = (p: Package) => {
    setCreating(false);
    setSelected(p);
    refresh();
  };

  return (
    <div className="p-6 space-y-6">
      <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-3">
        <h1 className="font-heading font-bold text-2xl uppercase tracking-wide text-text">Package / Traçabilité des sacs</h1>
        <button onClick={() => { setSelected(null); setCreating(true); }} className="bg-cyan-500 hover:bg-cyan-600 text-white px-4 py-2 rounded text-sm font-medium transition-colors whitespace-nowrap">
          + Nouveau sac
        </button>
      </div>

      {summary && (
        <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
          {[
            { label: 'Sacs', value: summary.bags_total },
            { label: 'Bouteilles fabriquées', value: summary.bottles_made },
            { label: 'Bouteilles expédiées', value: summary.bottles_shipped },
            { label: 'Bouteilles en stock', value: summary.bottles_on_hand },
            { label: 'Sacs expédiés', value: summary.bags_shipped },
          ].map(({ label, value }) => (
            <div key={label} className="bg-panel border border-border rounded-md p-4">
              <div className="text-[11px] font-sans font-semibold tracking-widest text-text-dim uppercase">{label}</div>
              <div className="font-mono text-2xl font-bold mt-2 text-text">{value}</div>
            </div>
          ))}
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-[380px_1fr] gap-6 items-start">
        <div className="space-y-4">
          <div className="bg-panel border border-border rounded-md p-4 space-y-3">
            <Input type="text" placeholder="Rechercher (référence, matière, couleur, fournisseur)..." value={search} onChange={(e) => setSearch(e.target.value)} />
            <select value={machineFilter} onChange={(e) => setMachineFilter(e.target.value)}
              className="w-full bg-bg border border-border rounded p-2 text-sm text-text focus:outline-none focus:border-cyan-500">
              <option value="">Toutes les machines</option>
              {machines.map((m) => <option key={m.id} value={m.id}>{m.name} ({m.code})</option>)}
            </select>
            <input type="date" value={dateFilter} onChange={(e) => setDateFilter(e.target.value)}
              className="w-full bg-bg border border-border rounded p-2 text-sm text-text focus:outline-none focus:border-cyan-500" />
          </div>

          <div className="bg-panel border border-border rounded-md p-4">
            {packages.length === 0 ? (
              <p className="text-sm text-text-dim">Aucun sac trouvé.</p>
            ) : (
              <div className="space-y-1 max-h-[600px] overflow-auto">
                {packages.map((p) => (
                  <button key={p.id} onClick={() => { setCreating(false); setSelected(p); }}
                    className={`w-full text-left p-3 rounded border transition-colors ${
                      selected?.id === p.id ? 'bg-panel-2 border-cyan-500' : 'border-border/50 hover:bg-panel-2/50'
                    }`}>
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-sm font-medium text-text font-mono">{p.reference}</span>
                      <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-cyan-500/10 text-cyan-400 shrink-0">{p.bottle_count} btl</span>
                    </div>
                    <div className="text-xs text-text-dim mt-0.5">{p.machine_code} • {p.supplier || '—'}</div>
                    <div className="text-[10px] text-text-dim mt-1">{new Date(p.production_started_at).toLocaleString()}</div>
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>

        {creating ? (
          <PackageForm stockItems={stockItems} machines={machines} bottles={bottles} onSaved={afterSave} onCancel={() => setCreating(false)} />
        ) : selected ? (
          <PackageDetail pkg={selected} onShipped={(p) => { setSelected(p); refresh(); }} />
        ) : (
          <div className="bg-panel border border-border rounded-md p-6 flex items-center justify-center min-h-[200px]">
            <p className="text-sm text-text-dim text-center max-w-sm">Sélectionnez un sac dans la liste, ou créez-en un nouveau.</p>
          </div>
        )}
      </div>
    </div>
  );
}

function PersonnelPreview({ data, loading }: { data: PersonnelSnapshotEntry[] | null; loading: boolean }) {
  if (loading) return <p className="text-xs text-text-dim mt-2">Recherche du personnel...</p>;
  if (!data) return null;
  return (
    <div className="mt-2 bg-bg border border-border rounded p-3 text-xs text-text-dim">
      {data.length === 0 ? 'Aucun personnel identifié pour cette période.' : (
        <ul className="space-y-1">
          {data.map((p) => (
            <li key={p.id} className="flex justify-between">
              <span className="font-mono text-text">{p.name}</span>
              <span className="text-text-dim">{ROLE_LABELS[p.role as UserRole] || p.role}</span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

function PackageForm({ stockItems, machines, bottles, onSaved, onCancel }: {
  stockItems: StockItem[]; machines: Machine[]; bottles: BottleCharacteristic[]; onSaved: (p: Package) => void; onCancel: () => void;
}) {
  const [machine, setMachine] = useState('');
  const [bottle, setBottle] = useState('');
  const [bottleCount, setBottleCount] = useState('');
  const [rawMaterial, setRawMaterial] = useState('');
  const [color, setColor] = useState('');
  const [supplier, setSupplier] = useState('');
  const [startedAt, setStartedAt] = useState('');
  const [finishedAt, setFinishedAt] = useState('');
  const [notes, setNotes] = useState('');
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [submitting, setSubmitting] = useState(false);
  const [preview, setPreview] = useState<PersonnelSnapshotEntry[] | null>(null);
  const [previewLoading, setPreviewLoading] = useState(false);

  useEffect(() => {
    if (!machine || !startedAt) { setPreview(null); return; }
    const t = setTimeout(() => {
      setPreviewLoading(true);
      const startIso = new Date(startedAt).toISOString();
      const endIso = finishedAt ? new Date(finishedAt).toISOString() : undefined;
      packageApi.resolvePersonnelPreview(Number(machine), startIso, endIso)
        .then(setPreview).catch(() => setPreview(null)).finally(() => setPreviewLoading(false));
    }, 400);
    return () => clearTimeout(t);
  }, [machine, startedAt, finishedAt]);

  const handleBottleChange = (value: string) => {
    setBottle(value);
    const recipe = bottles.find((b) => String(b.id) === value);
    if (recipe) {
      setRawMaterial(String(recipe.raw_material));
      setColor(recipe.colorant ? String(recipe.colorant) : '');
    } else {
      setRawMaterial('');
      setColor('');
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    setFieldErrors({});
    try {
      const created = await packageApi.createPackage({
        machine: Number(machine),
        bottle: bottle ? Number(bottle) : null,
        bottle_count: Number(bottleCount),
        raw_material: rawMaterial ? Number(rawMaterial) : null,
        color: color ? Number(color) : null,
        supplier,
        production_started_at: startedAt ? new Date(startedAt).toISOString() : undefined,
        production_finished_at: finishedAt ? new Date(finishedAt).toISOString() : null,
        notes,
      });
      toast.success('Sac créé.');
      onSaved(created);
    } catch (err) {
      console.error('Failed to create package', err);
      setFieldErrors(parseFieldErrors(err));
      toast.error(errorMessage(err, 'Échec de la création.'));
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="bg-panel border border-border rounded-md p-6 space-y-4">
      <h2 className="font-heading font-bold text-lg text-text">Nouveau sac</h2>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <label className="block text-xs font-semibold text-text-dim uppercase mb-1">Machine / ligne *</label>
          <select value={machine} onChange={(e) => setMachine(e.target.value)} required
            className="w-full bg-bg border border-border rounded p-2 text-sm text-text focus:outline-none focus:border-cyan-500">
            <option value="">Sélectionner...</option>
            {machines.map((m) => <option key={m.id} value={m.id}>{m.name} ({m.code})</option>)}
          </select>
        </div>
        <div>
          <label className="block text-xs font-semibold text-text-dim uppercase mb-1">Nombre de bouteilles *</label>
          <Input type="number" min="1" value={bottleCount} onChange={(e) => setBottleCount(e.target.value)} required error={fieldErrors.bottle_count} />
        </div>
        <div>
          <label className="block text-xs font-semibold text-text-dim uppercase mb-1">Recette bouteille (catalogue)</label>
          <select value={bottle} onChange={(e) => handleBottleChange(e.target.value)}
            className="w-full bg-bg border border-border rounded p-2 text-sm text-text focus:outline-none focus:border-cyan-500">
            <option value="">Aucune</option>
            {bottles.map((b) => <option key={b.id} value={b.id}>{b.category}</option>)}
          </select>
          {bottle && <p className="text-xs text-text-dim mt-1">Matière première et colorant renseignés automatiquement depuis cette recette, et seront déduits du stock à la création.</p>}
        </div>
        <div>
          <label className="block text-xs font-semibold text-text-dim uppercase mb-1">
            Matière première {bottle && <span className="text-cyan-500 normal-case">(auto — recette)</span>}
          </label>
          <select value={rawMaterial} onChange={(e) => setRawMaterial(e.target.value)} disabled={!!bottle}
            className="w-full bg-bg border border-border rounded p-2 text-sm text-text focus:outline-none focus:border-cyan-500 disabled:opacity-60 disabled:cursor-not-allowed">
            <option value="">Aucune</option>
            {stockItems.filter((s) => s.type === 'RAW_MATERIAL').map((s) => <option key={s.id} value={s.id}>{s.name} ({s.reference})</option>)}
          </select>
        </div>
        <div>
          <label className="block text-xs font-semibold text-text-dim uppercase mb-1">
            Couleur {bottle && <span className="text-cyan-500 normal-case">(auto — recette)</span>}
          </label>
          <select value={color} onChange={(e) => setColor(e.target.value)} disabled={!!bottle}
            className="w-full bg-bg border border-border rounded p-2 text-sm text-text focus:outline-none focus:border-cyan-500 disabled:opacity-60 disabled:cursor-not-allowed">
            <option value="">Aucune</option>
            {stockItems.filter((s) => s.type === 'COLORANT').map((s) => <option key={s.id} value={s.id}>{s.name} ({s.reference})</option>)}
          </select>
        </div>
        <div>
          <label className="block text-xs font-semibold text-text-dim uppercase mb-1">Fournisseur</label>
          <input type="text" value={supplier} onChange={(e) => setSupplier(e.target.value)}
            className="w-full bg-bg border border-border rounded p-2 text-sm text-text focus:outline-none focus:border-cyan-500" />
        </div>
        <div />
        <div>
          <label className="block text-xs font-semibold text-text-dim uppercase mb-1">Début de production *</label>
          <input type="datetime-local" value={startedAt} onChange={(e) => setStartedAt(e.target.value)} required
            className="w-full bg-bg border border-border rounded p-2 text-sm text-text focus:outline-none focus:border-cyan-500" />
        </div>
        <div>
          <label className="block text-xs font-semibold text-text-dim uppercase mb-1">Fin de production (optionnel)</label>
          <input type="datetime-local" value={finishedAt} onChange={(e) => setFinishedAt(e.target.value)}
            className="w-full bg-bg border border-border rounded p-2 text-sm text-text focus:outline-none focus:border-cyan-500" />
        </div>
      </div>

      <PersonnelPreview data={preview} loading={previewLoading} />

      <div>
        <label className="block text-xs font-semibold text-text-dim uppercase mb-1">Notes</label>
        <textarea value={notes} onChange={(e) => setNotes(e.target.value)} rows={2}
          className="w-full bg-bg border border-border rounded p-2 text-sm text-text focus:outline-none focus:border-cyan-500" />
      </div>

      <div className="flex justify-end gap-3 pt-2">
        <button type="button" onClick={onCancel} className="px-4 py-2 rounded text-sm text-text-dim hover:bg-panel-2 transition-colors">
          Annuler
        </button>
        <button type="submit" disabled={submitting} className="bg-cyan-500 hover:bg-cyan-600 disabled:opacity-50 text-white px-6 py-2 rounded text-sm font-medium transition-colors">
          {submitting ? 'Création...' : 'Créer'}
        </button>
      </div>
    </form>
  );
}

function PackageDetail({ pkg, onShipped }: { pkg: Package; onShipped: (p: Package) => void }) {
  const [shippedTo, setShippedTo] = useState('');
  const [shipping, setShipping] = useState(false);

  const handleShip = async () => {
    setShipping(true);
    try {
      const updated = await packageApi.ship(pkg.id, shippedTo);
      toast.success('Sac marqué comme expédié.');
      onShipped(updated);
    } catch (err) {
      toast.error(errorMessage(err, "Échec de l'expédition."));
    } finally {
      setShipping(false);
    }
  };

  return (
    <div className="bg-panel border border-border rounded-md p-6 space-y-6">
      <div className="flex items-start justify-between">
        <div>
          <h2 className="font-heading font-bold text-lg text-text font-mono">{pkg.reference}</h2>
          <p className="text-xs text-text-dim mt-1">{pkg.bottle_count} bouteilles</p>
        </div>
        {pkg.shipped_at ? (
          <span className="text-xs bg-green-500/10 text-green-400 px-2 py-1 rounded font-mono uppercase">Expédié</span>
        ) : (
          <span className="text-xs bg-yellow-500/10 text-yellow-500 px-2 py-1 rounded font-mono uppercase">En stock</span>
        )}
      </div>

      {!pkg.shipped_at && (
        <div className="bg-bg border border-border rounded p-3">
          <label className="block text-xs font-semibold text-text-dim uppercase mb-1">Marquer comme expédié (destinataire)</label>
          <div className="flex gap-2">
            <input type="text" value={shippedTo} onChange={(e) => setShippedTo(e.target.value)} placeholder="Client / destination"
              className="flex-1 bg-panel border border-border rounded p-2 text-sm text-text focus:outline-none focus:border-cyan-500" />
            <button onClick={handleShip} disabled={shipping}
              className="bg-cyan-500 hover:bg-cyan-600 disabled:opacity-50 text-white px-4 py-2 rounded text-sm font-medium transition-colors whitespace-nowrap">
              {shipping ? 'Envoi...' : 'Expédier'}
            </button>
          </div>
        </div>
      )}

      <div>
        <h3 className="text-xs font-semibold text-text-dim tracking-wider uppercase mb-2">Traçabilité</h3>
        <div className="bg-bg border border-border rounded p-3 text-sm space-y-2">
          <div className="flex justify-between"><span className="text-text-dim">Sac</span><span className="font-mono text-text">{pkg.reference}</span></div>
          <div className="flex justify-between"><span className="text-text-dim">Machine</span><span className="font-mono text-text">{pkg.machine_name} ({pkg.machine_code})</span></div>
          <div className="flex justify-between"><span className="text-text-dim">Recette bouteille</span><span className="font-mono text-text">{pkg.bottle_category || '—'}</span></div>
          <div className="flex justify-between"><span className="text-text-dim">Matière première</span><span className="font-mono text-text">{pkg.raw_material_reference_snapshot || '—'}{pkg.raw_material_consumed_kg ? ` (−${pkg.raw_material_consumed_kg} kg)` : ''}</span></div>
          <div className="flex justify-between"><span className="text-text-dim">Couleur</span><span className="font-mono text-text">{pkg.color_reference_snapshot || '—'}{pkg.colorant_consumed_kg ? ` (−${pkg.colorant_consumed_kg} kg)` : ''}</span></div>
          <div className="flex justify-between"><span className="text-text-dim">Fournisseur</span><span className="font-mono text-text">{pkg.supplier || '—'}</span></div>
          <div className="flex justify-between"><span className="text-text-dim">Début production</span><span className="font-mono text-text">{new Date(pkg.production_started_at).toLocaleString()}</span></div>
          <div className="flex justify-between"><span className="text-text-dim">Fin production</span><span className="font-mono text-text">{pkg.production_finished_at ? new Date(pkg.production_finished_at).toLocaleString() : 'En cours'}</span></div>
          <div className="flex justify-between"><span className="text-text-dim">Expédié</span><span className="font-mono text-text">{pkg.shipped_at ? `${new Date(pkg.shipped_at).toLocaleString()} → ${pkg.shipped_to || '—'}` : '—'}</span></div>
        </div>
      </div>

      <div>
        <h3 className="text-xs font-semibold text-text-dim tracking-wider uppercase mb-2">Personnel</h3>
        {pkg.personnel_snapshot.length === 0 ? (
          <p className="text-sm text-text-dim">Aucun personnel identifié pour cette période.</p>
        ) : (
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-border text-[10px] uppercase tracking-wider text-text-dim">
                <th className="pb-2 font-semibold">Nom</th>
                <th className="pb-2 font-semibold">Rôle</th>
              </tr>
            </thead>
            <tbody>
              {pkg.personnel_snapshot.map((p) => (
                <tr key={p.id} className="border-b border-border/30">
                  <td className="py-2 text-sm">{p.name}</td>
                  <td className="py-2 font-mono text-xs text-text-dim">{ROLE_LABELS[p.role as UserRole] || p.role}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {pkg.notes && (
        <div>
          <h3 className="text-xs font-semibold text-text-dim tracking-wider uppercase mb-1">Notes</h3>
          <p className="text-sm text-text">{pkg.notes}</p>
        </div>
      )}

      <p className="text-xs text-text-dim">Créé par {pkg.created_by_name || '—'} le {new Date(pkg.created_at).toLocaleString()}</p>
    </div>
  );
}
