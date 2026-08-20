'use client';

import { useEffect, useState } from 'react';
import { toast } from 'sonner';
import { errorMessage, parseFieldErrors } from '@/lib/api/errors';
import { Input } from '@/components/ui/input';

/** Shared shape of MachineComponent and Mold — both are a name + optional
 * reference permanently attached to one machine. Auxiliary equipment isn't
 * this shape (it's M2M across machines), so it gets its own section. */
interface EquipmentItem {
  id: number;
  name: string;
  reference?: string;
  is_active: boolean;
}

interface EquipmentCrudSectionProps<T extends EquipmentItem> {
  title: string;
  itemLabel: string;
  machineId: number;
  canManage: boolean;
  list: (machineId: number) => Promise<{ results: T[] } | T[]>;
  create: (data: { machine: number; name: string; reference: string }) => Promise<T>;
  update: (id: number, data: { name: string; reference: string }) => Promise<T>;
  remove: (id: number) => Promise<void>;
  nameOptions?: string[];
  emptyReferenceHint?: string;
}

export function EquipmentCrudSection<T extends EquipmentItem>({
  title, itemLabel, machineId, canManage, list, create, update, remove, nameOptions, emptyReferenceHint,
}: EquipmentCrudSectionProps<T>) {
  const [items, setItems] = useState<T[]>([]);
  const [search, setSearch] = useState('');
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [name, setName] = useState('');
  const [reference, setReference] = useState('');
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);

  const refresh = () => list(machineId).then((res) => setItems(Array.isArray(res) ? res : res.results)).catch(console.error);

  useEffect(() => {
    refresh();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [machineId]);

  const resetForm = () => {
    setEditingId(null);
    setName('');
    setReference('');
    setFieldErrors({});
  };

  const startCreate = () => {
    resetForm();
    setShowForm(true);
  };

  const startEdit = (item: T) => {
    setEditingId(item.id);
    setName(item.name);
    setReference(item.reference || '');
    setFieldErrors({});
    setShowForm(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setFieldErrors({});
    try {
      if (editingId) {
        await update(editingId, { name, reference });
        toast.success(`${itemLabel} mis à jour.`);
      } else {
        await create({ machine: machineId, name, reference });
        toast.success(`${itemLabel} créé.`);
      }
      resetForm();
      setShowForm(false);
      await refresh();
    } catch (err) {
      console.error(`Failed to save ${itemLabel}`, err);
      setFieldErrors(parseFieldErrors(err));
      toast.error(errorMessage(err, `Échec de l'enregistrement.`));
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = async (item: T) => {
    if (!confirm(`Supprimer "${item.name}" ?`)) return;
    try {
      await remove(item.id);
      await refresh();
      toast.success(`${itemLabel} supprimé.`);
    } catch (err) {
      console.error(`Failed to delete ${itemLabel}`, err);
      toast.error(errorMessage(err, 'Échec de la suppression.'));
    }
  };

  const filtered = items.filter((item) => {
    const q = search.trim().toLowerCase();
    if (!q) return true;
    return item.name.toLowerCase().includes(q) || (item.reference || '').toLowerCase().includes(q);
  });

  return (
    <div className="bg-panel border border-border rounded-md p-6">
      <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-3 mb-4">
        <h2 className="text-sm font-semibold text-text-dim tracking-wider uppercase">{title}</h2>
        <div className="flex gap-3">
          <Input
            type="text"
            placeholder="Rechercher..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-48"
          />
          {canManage && (
            <button
              onClick={startCreate}
              className="bg-cyan-500 hover:bg-cyan-600 text-white px-4 py-2 rounded text-sm font-medium transition-colors whitespace-nowrap"
            >
              + Ajouter
            </button>
          )}
        </div>
      </div>

      {showForm && canManage && (
        <form onSubmit={handleSubmit} className="bg-panel-2 border border-border rounded-md p-4 grid grid-cols-1 sm:grid-cols-3 gap-4 mb-4">
          <div>
            <label className="block text-xs font-semibold text-text-dim uppercase mb-1">Nom *</label>
            {nameOptions && nameOptions.length > 0 ? (
              <input
                list={`${title}-name-options`}
                value={name}
                onChange={(e) => setName(e.target.value)}
                required
                className="w-full bg-bg border border-border rounded p-2 text-sm text-text focus:outline-none focus:border-cyan-500"
              />
            ) : (
              <Input type="text" value={name} onChange={(e) => setName(e.target.value)} required error={fieldErrors.name} />
            )}
            {nameOptions && (
              <datalist id={`${title}-name-options`}>
                {nameOptions.map((opt) => <option key={opt} value={opt} />)}
              </datalist>
            )}
          </div>
          <div>
            <label className="block text-xs font-semibold text-text-dim uppercase mb-1">
              Référence {emptyReferenceHint && <span className="normal-case font-normal text-text-dim/70">({emptyReferenceHint})</span>}
            </label>
            <Input type="text" value={reference} onChange={(e) => setReference(e.target.value)} error={fieldErrors.reference} />
          </div>
          <div className="flex items-end gap-3">
            <button type="button" onClick={() => { setShowForm(false); resetForm(); }} className="px-4 py-2 rounded text-sm text-text-dim hover:bg-panel transition-colors">
              Annuler
            </button>
            <button type="submit" disabled={isSubmitting} className="bg-cyan-500 hover:bg-cyan-600 disabled:opacity-50 text-white px-6 py-2 rounded text-sm font-medium transition-colors">
              {isSubmitting ? 'Enregistrement...' : editingId ? 'Enregistrer' : 'Créer'}
            </button>
          </div>
        </form>
      )}

      {filtered.length === 0 ? (
        <p className="text-sm text-text-dim">Aucun élément.</p>
      ) : (
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="border-b border-border text-[10px] uppercase tracking-wider text-text-dim">
              <th className="pb-2 font-semibold">Nom</th>
              <th className="pb-2 font-semibold">Référence</th>
              <th className="pb-2 font-semibold text-center">Actif</th>
              {canManage && <th className="pb-2 font-semibold text-right">Actions</th>}
            </tr>
          </thead>
          <tbody>
            {filtered.map((item) => (
              <tr key={item.id} className="border-b border-border/30 hover:bg-panel-2/50">
                <td className="py-3 text-sm font-medium">{item.name}</td>
                <td className="py-3 font-mono text-xs text-text-dim">{item.reference || '—'}</td>
                <td className="py-3 text-center font-mono text-xs">{item.is_active ? '✓' : '—'}</td>
                {canManage && (
                  <td className="py-3 text-right space-x-3">
                    <button onClick={() => startEdit(item)} className="text-cyan-500 hover:text-cyan-400 text-xs font-medium">
                      Modifier
                    </button>
                    <button onClick={() => handleDelete(item)} className="text-red-500 hover:text-red-400 text-xs font-medium">
                      Supprimer
                    </button>
                  </td>
                )}
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
}
