'use client';

import { useEffect, useState } from 'react';
import { toast } from 'sonner';
import { shiftsApi } from '@/lib/api/shifts';
import { usersApi } from '@/lib/api/users';
import { machinesApi } from '@/lib/api/machines';
import { ShiftAssignment, User, Machine, Shift } from '@/lib/api/types';
import { errorMessage } from '@/lib/api/errors';
import { ROLE_LABELS, UserRole } from '@/lib/auth/rbac';

const SHIFT_LABELS: Record<Shift, string> = {
  MORNING: 'Matin (06h-14h)',
  AFTERNOON: 'Après-midi (14h-22h)',
  NIGHT: 'Nuit (22h-06h)',
};

export default function RhPage() {
  const [tab, setTab] = useState<'workers' | 'lookup'>('workers');
  const [assignments, setAssignments] = useState<ShiftAssignment[]>([]);
  const [users, setUsers] = useState<User[]>([]);
  const [machines, setMachines] = useState<Machine[]>([]);
  const [userFilter, setUserFilter] = useState('');

  // Shift assignments are entirely self-populating — clock_in()/clock_out()
  // on login/logout create and close these rows automatically (see
  // apps.accounts.ShiftAssignment). This page only ever fetches and
  // displays them, the same way the audit log is a read-only view.
  const refresh = () => {
    const params: Record<string, string> = {};
    if (userFilter) params.user = userFilter;
    shiftsApi.getAssignments(Object.keys(params).length ? params : undefined).then((res) => setAssignments(res.results)).catch(console.error);
  };

  useEffect(() => {
    usersApi.getUsers().then((res) => setUsers(res.results)).catch(console.error);
    machinesApi.getMachines().then((res) => setMachines(res.results)).catch(console.error);
  }, []);

  useEffect(() => {
    refresh();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [userFilter]);

  return (
    <div className="p-6 space-y-6 h-full flex flex-col">
      <h1 className="font-heading font-bold text-2xl uppercase tracking-wide text-text">RH — Personnel &amp; Shifts</h1>

      <div className="flex gap-1 bg-bg border border-border rounded-md p-1 w-fit">
        <button
          onClick={() => setTab('workers')}
          className={`px-4 py-2 rounded text-sm font-medium transition-colors ${tab === 'workers' ? 'bg-panel text-text shadow' : 'text-text-dim hover:text-text'}`}
        >
          Personnel
        </button>
        <button
          onClick={() => setTab('lookup')}
          className={`px-4 py-2 rounded text-sm font-medium transition-colors ${tab === 'lookup' ? 'bg-panel text-text shadow' : 'text-text-dim hover:text-text'}`}
        >
          Qui travaillait ?
        </button>
      </div>

      {tab === 'workers' && (
        <>
          <div className="flex gap-3 flex-wrap">
            <select
              value={userFilter}
              onChange={(e) => setUserFilter(e.target.value)}
              className="bg-bg border border-border rounded p-2 text-sm text-text focus:outline-none focus:border-cyan-500"
            >
              <option value="">Tout le personnel</option>
              {users.map((u) => <option key={u.id} value={u.id}>{u.first_name} {u.last_name} ({ROLE_LABELS[u.role as UserRole] || u.role})</option>)}
            </select>
          </div>

          <div className="bg-panel border border-border rounded-md flex-1 p-4 overflow-auto">
            <div className="text-sm text-text-dim mb-4">Total: {assignments.length}</div>
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-border text-[10px] uppercase tracking-wider text-text-dim">
                  <th className="pb-2 font-semibold">Nom</th>
                  <th className="pb-2 font-semibold">Rôle</th>
                  <th className="pb-2 font-semibold">Machine</th>
                  <th className="pb-2 font-semibold">Shift</th>
                  <th className="pb-2 font-semibold">Connexion</th>
                  <th className="pb-2 font-semibold">Déconnexion</th>
                </tr>
              </thead>
              <tbody>
                {assignments.map((a) => (
                  <tr key={a.id} className="border-b border-border/30 hover:bg-panel-2/50">
                    <td className="py-3 text-sm font-medium">{a.user_name || '—'}</td>
                    <td className="py-3 font-mono text-xs text-text-dim">{ROLE_LABELS[a.user_role as UserRole] || a.user_role || '—'}</td>
                    <td className="py-3 font-mono text-xs text-text-dim">{a.machine_code || '—'}</td>
                    <td className="py-3 font-mono text-xs text-text-dim">{SHIFT_LABELS[a.shift]}</td>
                    <td className="py-3 font-mono text-xs text-text">{new Date(a.starts_at).toLocaleString()}</td>
                    <td className="py-3 font-mono text-xs text-text-dim">
                      {a.ends_at ? new Date(a.ends_at).toLocaleString() : <span className="text-green-500">En cours</span>}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            {assignments.length === 0 && (
              <div className="text-center py-12 text-text-dim text-sm">Aucune connexion enregistrée.</div>
            )}
          </div>
        </>
      )}

      {tab === 'lookup' && <WorkingAtLookup machines={machines} />}
    </div>
  );
}

function WorkingAtLookup({ machines }: { machines: Machine[] }) {
  const [when, setWhen] = useState('');
  const [machineId, setMachineId] = useState('');
  const [results, setResults] = useState<ShiftAssignment[] | null>(null);
  const [searching, setSearching] = useState(false);
  const [searched, setSearched] = useState(false);

  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!when) return;
    setSearching(true);
    setSearched(true);
    try {
      const iso = new Date(when).toISOString();
      const rows = await shiftsApi.workingAt(iso, machineId ? { machine: Number(machineId) } : undefined);
      setResults(rows);
    } catch (err) {
      console.error('Failed to look up who was working', err);
      toast.error(errorMessage(err, 'Échec de la recherche.'));
      setResults(null);
    } finally {
      setSearching(false);
    }
  };

  return (
    <div className="bg-panel border border-border rounded-md p-6">
      <h2 className="text-sm font-semibold text-text-dim tracking-wider uppercase mb-1">Qui travaillait ?</h2>
      <p className="text-xs text-text-dim mb-4">Recherche le personnel en poste à une date/heure donnée — utilisé pour les Réclamations et la traçabilité.</p>

      <form onSubmit={handleSearch} className="flex flex-wrap items-end gap-4 mb-6">
        <div>
          <label className="block text-xs font-semibold text-text-dim uppercase mb-1">Date / heure *</label>
          <input type="datetime-local" value={when} onChange={(e) => setWhen(e.target.value)} required
            className="bg-bg border border-border rounded p-2 text-sm text-text focus:outline-none focus:border-cyan-500" />
        </div>
        <div>
          <label className="block text-xs font-semibold text-text-dim uppercase mb-1">Machine (optionnel)</label>
          <select value={machineId} onChange={(e) => setMachineId(e.target.value)}
            className="bg-bg border border-border rounded p-2 text-sm text-text focus:outline-none focus:border-cyan-500">
            <option value="">Toutes</option>
            {machines.map((m) => <option key={m.id} value={m.id}>{m.name} ({m.code})</option>)}
          </select>
        </div>
        <button type="submit" disabled={searching || !when} className="bg-cyan-500 hover:bg-cyan-600 disabled:opacity-50 text-white px-6 py-2 rounded text-sm font-medium transition-colors">
          {searching ? 'Recherche...' : 'Rechercher'}
        </button>
      </form>

      {searched && (
        results && results.length > 0 ? (
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-border text-[10px] uppercase tracking-wider text-text-dim">
                <th className="pb-2 font-semibold">Nom</th>
                <th className="pb-2 font-semibold">Rôle</th>
                <th className="pb-2 font-semibold">Machine</th>
                <th className="pb-2 font-semibold">Shift</th>
                <th className="pb-2 font-semibold">Connexion</th>
                <th className="pb-2 font-semibold">Déconnexion</th>
              </tr>
            </thead>
            <tbody>
              {results.map((a) => (
                <tr key={a.id} className="border-b border-border/30">
                  <td className="py-3 text-sm font-medium">{a.user_name || '—'}</td>
                  <td className="py-3 font-mono text-xs text-text-dim">{ROLE_LABELS[a.user_role as UserRole] || a.user_role || '—'}</td>
                  <td className="py-3 font-mono text-xs text-text-dim">{a.machine_code || '—'}</td>
                  <td className="py-3 font-mono text-xs text-text-dim">{SHIFT_LABELS[a.shift]}</td>
                  <td className="py-3 font-mono text-xs text-text">{new Date(a.starts_at).toLocaleString()}</td>
                  <td className="py-3 font-mono text-xs text-text-dim">
                    {a.ends_at ? new Date(a.ends_at).toLocaleString() : <span className="text-green-500">En cours</span>}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        ) : (
          <p className="text-sm text-text-dim">Personne trouvé pour cette date/heure.</p>
        )
      )}
    </div>
  );
}
