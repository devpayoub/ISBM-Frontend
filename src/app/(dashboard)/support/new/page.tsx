'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuthStore } from '@/lib/store/useAuthStore';
import { can } from '@/lib/auth/rbac';
import { supportApi } from '@/lib/api/support';
import { machinesApi } from '@/lib/api/machines';
import { usersApi } from '@/lib/api/users';
import { Machine, TicketCriticality, User } from '@/lib/api/types';
import { BackButton } from '@/components/ui/back-button';

export default function NewTicketPage() {
  const router = useRouter();
  const user = useAuthStore((state) => state.user);
  const [machines, setMachines] = useState<Machine[]>([]);
  const [suppliers, setSuppliers] = useState<User[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');

  const [machine, setMachine] = useState('');
  const [supplier, setSupplier] = useState('');
  const [criticality, setCriticality] = useState<TicketCriticality>('MEDIUM');
  const [productionLine, setProductionLine] = useState('');
  const [equipmentDetail, setEquipmentDetail] = useState('');
  const [errorCode, setErrorCode] = useState('');
  const [description, setDescription] = useState('');
  const [symptoms, setSymptoms] = useState('');
  const [productionImpacted, setProductionImpacted] = useState('');
  const [downtimeStart, setDowntimeStart] = useState('');

  const selectedMachine = machines.find(m => String(m.id) === machine);

  useEffect(() => {
    machinesApi.getMachines().then(res => setMachines(res.results)).catch(console.error);
    usersApi.getUsers({ role: 'SUPPLIER' }).then(res => setSuppliers(res.results)).catch(console.error);
  }, []);

  if (!can(user?.role, 'declare_ticket')) {
    return (
      <div className="p-4 md:p-6">
        <p className="text-sm text-text-dim">Vous n'avez pas les droits pour créer un ticket SAV.</p>
      </div>
    );
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError('');
    try {
      await supportApi.createTicket({
        machine: parseInt(machine),
        assigned_supplier: parseInt(supplier),
        criticality,
        production_line: productionLine,
        equipment_detail: equipmentDetail,
        error_code: errorCode,
        description,
        symptoms,
        production_impacted: productionImpacted,
        downtime_start: downtimeStart ? new Date(downtimeStart).toISOString() : undefined,
      });
      router.push('/support');
    } catch (e) {
      console.error('Failed to create ticket', e);
      setError("Échec de la création du ticket. Vérifiez les champs et réessayez.");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="p-4 md:p-6 space-y-6 max-w-3xl mx-auto">
      <div className="flex items-start gap-3">
        <BackButton fallbackHref="/support" />
        <div>
          <h1 className="font-heading font-bold text-2xl uppercase tracking-wide text-text">Nouveau ticket SAV</h1>
          <p className="text-sm text-text-dim mt-1">Déclarez un incident technique pour intervention du fournisseur.</p>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="bg-panel border border-border rounded-md p-6 space-y-5">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-semibold text-text-dim uppercase mb-1">Machine *</label>
            <select
              value={machine}
              onChange={(e) => setMachine(e.target.value)}
              required
              className="w-full bg-bg border border-border rounded p-2 text-sm text-text focus:outline-none focus:border-cyan-500"
            >
              <option value="">Sélectionner...</option>
              {machines.map(m => (
                <option key={m.id} value={m.id}>{m.name} ({m.code})</option>
              ))}
            </select>
            {selectedMachine?.serial_number && (
              <p className="text-xs text-text-dim mt-1">N° de série : <span className="font-mono">{selectedMachine.serial_number}</span></p>
            )}
          </div>

          <div>
            <label className="block text-xs font-semibold text-text-dim uppercase mb-1">Fournisseur *</label>
            <select
              value={supplier}
              onChange={(e) => setSupplier(e.target.value)}
              required
              className="w-full bg-bg border border-border rounded p-2 text-sm text-text focus:outline-none focus:border-cyan-500"
            >
              <option value="">Sélectionner...</option>
              {suppliers.map(s => (
                <option key={s.id} value={s.id}>{s.first_name} {s.last_name} ({s.email})</option>
              ))}
            </select>
            {suppliers.length === 0 && (
              <p className="text-xs text-text-dim mt-1">Aucun compte fournisseur trouvé — créez-en un dans Utilisateurs.</p>
            )}
          </div>

          <div>
            <label className="block text-xs font-semibold text-text-dim uppercase mb-1">Criticité *</label>
            <select
              value={criticality}
              onChange={(e) => setCriticality(e.target.value as TicketCriticality)}
              className="w-full bg-bg border border-border rounded p-2 text-sm text-text focus:outline-none focus:border-cyan-500"
            >
              <option value="CRITICAL">🔴 Critique</option>
              <option value="HIGH">🟠 Élevée</option>
              <option value="MEDIUM">🟡 Moyenne</option>
              <option value="LOW">🔵 Faible</option>
            </select>
          </div>

          <div>
            <label className="block text-xs font-semibold text-text-dim uppercase mb-1">Ligne de production</label>
            <input
              type="text"
              value={productionLine}
              onChange={(e) => setProductionLine(e.target.value)}
              className="w-full bg-bg border border-border rounded p-2 text-sm text-text focus:outline-none focus:border-cyan-500"
              placeholder="Ex: Ligne 2"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-text-dim uppercase mb-1">Équipement concerné</label>
            <input
              type="text"
              value={equipmentDetail}
              onChange={(e) => setEquipmentDetail(e.target.value)}
              className="w-full bg-bg border border-border rounded p-2 text-sm text-text focus:outline-none focus:border-cyan-500"
              placeholder="Ex: Moteur souffleuse"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-text-dim uppercase mb-1">Code erreur</label>
            <input
              type="text"
              value={errorCode}
              onChange={(e) => setErrorCode(e.target.value)}
              className="w-full bg-bg border border-border rounded p-2 text-sm text-text focus:outline-none focus:border-cyan-500"
              placeholder="Ex: E-204"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-text-dim uppercase mb-1">Production impactée</label>
            <input
              type="text"
              value={productionImpacted}
              onChange={(e) => setProductionImpacted(e.target.value)}
              className="w-full bg-bg border border-border rounded p-2 text-sm text-text focus:outline-none focus:border-cyan-500"
              placeholder="Ex: 500 bouteilles/h perdues"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-text-dim uppercase mb-1">Heure d'arrêt de production</label>
            <input
              type="datetime-local"
              value={downtimeStart}
              onChange={(e) => setDowntimeStart(e.target.value)}
              className="w-full bg-bg border border-border rounded p-2 text-sm text-text focus:outline-none focus:border-cyan-500"
            />
            <p className="text-xs text-text-dim mt-1">Laisser vide pour utiliser l'heure actuelle.</p>
          </div>
        </div>

        <div>
          <label className="block text-xs font-semibold text-text-dim uppercase mb-1">Description *</label>
          <textarea
            rows={4}
            required
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            className="w-full bg-bg border border-border rounded p-2 text-sm text-text focus:outline-none focus:border-cyan-500"
            placeholder="Décrivez la panne constatée..."
          />
        </div>

        <div>
          <label className="block text-xs font-semibold text-text-dim uppercase mb-1">Symptômes</label>
          <textarea
            rows={3}
            value={symptoms}
            onChange={(e) => setSymptoms(e.target.value)}
            className="w-full bg-bg border border-border rounded p-2 text-sm text-text focus:outline-none focus:border-cyan-500"
            placeholder="Bruits, vibrations, comportement anormal..."
          />
        </div>

        {error && <p className="text-sm text-red-500">{error}</p>}

        <div className="flex justify-end gap-3 pt-4 border-t border-border">
          <button
            type="button"
            onClick={() => router.push('/support')}
            className="px-4 py-2 rounded text-sm font-medium text-text-dim hover:bg-panel-2 transition-colors"
          >
            Annuler
          </button>
          <button
            type="submit"
            disabled={isLoading || !machine || !supplier}
            className="bg-cyan-600 hover:bg-cyan-500 disabled:opacity-50 text-white px-6 py-2 rounded text-sm font-medium transition-colors"
          >
            {isLoading ? 'Envoi...' : 'Créer le ticket'}
          </button>
        </div>
      </form>
    </div>
  );
}
