'use client';

import { useEffect, useState } from 'react';
import { toast } from 'sonner';
import { usersApi } from '@/lib/api/users';
import { machinesApi } from '@/lib/api/machines';
import { User, PaginatedResponse, Role, Shift, Machine } from '@/lib/api/types';
import { useAuthStore } from '@/lib/store/useAuthStore';
import { errorMessage, parseFieldErrors } from '@/lib/api/errors';
import { Input } from '@/components/ui/input';
import { PasswordInput } from '@/components/ui/password-input';
import { ROLE_LABELS } from '@/lib/auth/rbac';

const ROLES: Role[] = ['ADMIN', 'MANAGER', 'CONTROLLER', 'MAINTENANCE', 'OPERATOR', 'SUPPLIER'];
const SHIFTS: Shift[] = ['MORNING', 'AFTERNOON', 'NIGHT'];

export default function UsersPage() {
  const [data, setData] = useState<PaginatedResponse<User> | null>(null);
  const [machines, setMachines] = useState<Machine[]>([]);
  const [showForm, setShowForm] = useState(false);
  const [editingUserId, setEditingUserId] = useState<number | null>(null);
  const [search, setSearch] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const authUser = useAuthStore((state) => state.user);

  // Form state
  const [email, setEmail] = useState('');
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [role, setRole] = useState<Role>('OPERATOR');
  const [shift, setShift] = useState<Shift>('MORNING');
  const [machineAssignment, setMachineAssignment] = useState('');
  const [assignedMachines, setAssignedMachines] = useState<number[]>([]);
  const [password, setPassword] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});

  useEffect(() => {
    const t = setTimeout(() => setDebouncedSearch(search), 300);
    return () => clearTimeout(t);
  }, [search]);

  useEffect(() => {
    usersApi.getUsers(debouncedSearch ? { search: debouncedSearch } : undefined).then(setData).catch(console.error);
  }, [debouncedSearch]);

  useEffect(() => {
    machinesApi.getMachines().then(res => setMachines(res.results)).catch(console.error);
  }, []);

  const refresh = () => usersApi.getUsers(debouncedSearch ? { search: debouncedSearch } : undefined).then(setData).catch(console.error);

  const resetForm = () => {
    setEditingUserId(null);
    setEmail(''); setFirstName(''); setLastName(''); setPassword(''); setMachineAssignment('');
    setAssignedMachines([]);
    setRole('OPERATOR'); setShift('MORNING');
  };

  const startCreate = () => {
    resetForm();
    setShowForm(true);
  };

  const startEdit = (u: User) => {
    setEditingUserId(u.id);
    setEmail(u.email); setFirstName(u.first_name); setLastName(u.last_name);
    setRole(u.role); setShift((u.shift as Shift) || 'MORNING');
    setMachineAssignment(u.machine_assignment ? String(u.machine_assignment) : '');
    setAssignedMachines(u.assigned_machines || []);
    setPassword('');
    setShowForm(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setFieldErrors({});
    try {
      if (editingUserId) {
        await usersApi.updateUser(editingUserId, {
          first_name: firstName,
          last_name: lastName,
          role,
          shift,
          machine_assignment: role === 'CONTROLLER' && machineAssignment ? parseInt(machineAssignment) : null,
          assigned_machines: role === 'SUPPLIER' ? assignedMachines : [],
        });
        toast.success('Utilisateur mis à jour.');
      } else {
        await usersApi.createUser({
          email,
          first_name: firstName,
          last_name: lastName,
          role,
          shift,
          machine_assignment: role === 'CONTROLLER' && machineAssignment ? parseInt(machineAssignment) : null,
          assigned_machines: role === 'SUPPLIER' ? assignedMachines : [],
          password,
        });
        toast.success('Utilisateur créé.');
      }
      resetForm();
      setShowForm(false);
      await refresh();
    } catch (e) {
      console.error('Failed to save user', e);
      setFieldErrors(parseFieldErrors(e));
      toast.error(errorMessage(e, "Échec de l'enregistrement de l'utilisateur."));
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = async (u: User) => {
    if (u.id === authUser?.id) {
      toast.error('Vous ne pouvez pas supprimer votre propre compte.');
      return;
    }
    if (!confirm(`Supprimer définitivement ${u.first_name} ${u.last_name} (${u.email}) ?`)) return;
    try {
      await usersApi.deleteUser(u.id);
      await refresh();
      toast.success('Utilisateur supprimé.');
    } catch (e) {
      console.error('Failed to delete user', e);
      toast.error("Échec de la suppression de l'utilisateur.");
    }
  };

  const handleToggleDuty = async (user: User) => {
    try {
      await usersApi.updateUser(user.id, { is_on_duty: !user.is_on_duty });
      const refreshed = await usersApi.getUsers();
      setData(refreshed);
    } catch (e) {
      console.error('Failed to toggle duty', e);
    }
  };

  const handleReassignMachine = async (user: User, machineId: string) => {
    try {
      await usersApi.updateUser(user.id, { machine_assignment: machineId ? parseInt(machineId) : null });
      const refreshed = await usersApi.getUsers();
      setData(refreshed);
    } catch (e) {
      console.error('Failed to reassign machine', e);
    }
  };

  const getRoleBadge = (role: string) => {
    switch (role) {
      case 'ADMIN': return 'bg-red-500/10 text-red-400';
      case 'MANAGER': return 'bg-purple-500/10 text-purple-400';
      case 'MAINTENANCE': return 'bg-blue-500/10 text-blue-400';
      case 'CONTROLLER': return 'bg-green-500/10 text-green-400';
      case 'OPERATOR': return 'bg-cyan-500/10 text-cyan-400';
      default: return 'bg-gray-500/10 text-gray-400';
    }
  };

  const usersList = Array.isArray(data?.results) ? data.results : Array.isArray(data) ? (data as unknown as User[]) : [];

  return (
    <div className="p-6 space-y-6 h-full flex flex-col">
      <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-3">
        <h1 className="font-heading font-bold text-2xl uppercase tracking-wide text-text">Utilisateurs & Rôles</h1>
        <button
          onClick={startCreate}
          className="bg-cyan-500 hover:bg-cyan-600 text-white px-4 py-2 rounded font-sans text-sm font-medium transition-colors"
        >
          + Nouvel Utilisateur
        </button>
      </div>

      {showForm && (
        <form onSubmit={handleSubmit} className="bg-panel border border-border rounded-md p-4 grid grid-cols-2 md:grid-cols-3 gap-4">
          {!editingUserId && (
            <div>
              <label className="block text-xs font-semibold text-text-dim uppercase mb-1">Email *</label>
              <Input type="email" value={email} onChange={(e) => setEmail(e.target.value)} required
                error={fieldErrors.email} />
            </div>
          )}
          <div>
            <label className="block text-xs font-semibold text-text-dim uppercase mb-1">Prénom *</label>
            <input type="text" value={firstName} onChange={(e) => setFirstName(e.target.value)} required
              className="w-full bg-bg border border-border rounded p-2 text-sm text-text focus:outline-none focus:border-cyan-500" />
          </div>
          <div>
            <label className="block text-xs font-semibold text-text-dim uppercase mb-1">Nom *</label>
            <input type="text" value={lastName} onChange={(e) => setLastName(e.target.value)} required
              className="w-full bg-bg border border-border rounded p-2 text-sm text-text focus:outline-none focus:border-cyan-500" />
          </div>
          <div>
            <label className="block text-xs font-semibold text-text-dim uppercase mb-1">Rôle</label>
            <select value={role} onChange={(e) => setRole(e.target.value as Role)}
              className="w-full bg-bg border border-border rounded p-2 text-sm text-text focus:outline-none focus:border-cyan-500">
              {ROLES.map(r => <option key={r} value={r}>{ROLE_LABELS[r]}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-xs font-semibold text-text-dim uppercase mb-1">Équipe</label>
            <select value={shift} onChange={(e) => setShift(e.target.value as Shift)}
              className="w-full bg-bg border border-border rounded p-2 text-sm text-text focus:outline-none focus:border-cyan-500">
              {SHIFTS.map(s => <option key={s} value={s}>{s}</option>)}
            </select>
          </div>
          {role === 'CONTROLLER' && (
            <div>
              <label className="block text-xs font-semibold text-text-dim uppercase mb-1">Machine à contrôler *</label>
              <select value={machineAssignment} onChange={(e) => setMachineAssignment(e.target.value)} required
                className="w-full bg-bg border border-border rounded p-2 text-sm text-text focus:outline-none focus:border-cyan-500">
                <option value="">Sélectionner...</option>
                {machines.map(m => (
                  <option key={m.id} value={m.id}>{m.name} ({m.code})</option>
                ))}
              </select>
            </div>
          )}
          {role === 'SUPPLIER' && (
            <div className="col-span-full">
              <label className="block text-xs font-semibold text-text-dim uppercase mb-1">Machines suivies par ce fournisseur</label>
              <div className="flex flex-wrap gap-2 bg-bg border border-border rounded p-2">
                {machines.map(m => {
                  const checked = assignedMachines.includes(m.id);
                  return (
                    <label key={m.id} className={`text-xs px-2 py-1 rounded border cursor-pointer ${checked ? 'bg-cyan-500/10 border-cyan-500 text-cyan-500' : 'border-border text-text-dim'}`}>
                      <input
                        type="checkbox"
                        className="hidden"
                        checked={checked}
                        onChange={(e) => setAssignedMachines(prev =>
                          e.target.checked ? [...prev, m.id] : prev.filter(id => id !== m.id)
                        )}
                      />
                      {m.name} ({m.code})
                    </label>
                  );
                })}
              </div>
            </div>
          )}
          {!editingUserId && (
            <div>
              <label className="block text-xs font-semibold text-text-dim uppercase mb-1">Mot de passe *</label>
              <PasswordInput value={password} onChange={(e) => setPassword(e.target.value)} required
                error={fieldErrors.password} />
            </div>
          )}
          <div className="col-span-full flex justify-end gap-3">
            <button type="button" onClick={() => { setShowForm(false); resetForm(); }} className="px-4 py-2 rounded text-sm text-text-dim hover:bg-panel-2 transition-colors">
              Annuler
            </button>
            <button type="submit" disabled={isSubmitting}
              className="bg-cyan-500 hover:bg-cyan-600 disabled:opacity-50 text-white px-6 py-2 rounded text-sm font-medium transition-colors">
              {isSubmitting ? 'Enregistrement...' : editingUserId ? 'Enregistrer' : 'Créer'}
            </button>
          </div>
        </form>
      )}

      {/* User Table */}
      <div className="bg-panel border border-border rounded-md flex-1 p-4 overflow-auto">
        <div className="flex justify-end mb-4">
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Rechercher (nom, email, téléphone)..."
            className="w-full sm:w-72 bg-bg border border-border rounded p-2 text-sm text-text focus:outline-none focus:border-cyan-500"
          />
        </div>
        <div className="overflow-x-auto">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="border-b border-border text-[10px] uppercase tracking-wider text-text-dim">
              <th className="pb-2 font-semibold">Nom</th>
              <th className="pb-2 font-semibold">Email</th>
              <th className="pb-2 font-semibold">Rôle</th>
              <th className="pb-2 font-semibold">Machine</th>
              <th className="pb-2 font-semibold">Équipe</th>
              <th className="pb-2 font-semibold text-center">En service</th>
              <th className="pb-2 font-semibold text-right">Actions</th>
            </tr>
          </thead>
          <tbody>
            {usersList.map(u => (
              <tr key={u.id} className="border-b border-border/30 hover:bg-panel-2/50">
                <td className="py-3 font-sans text-sm font-medium">{u.first_name} {u.last_name}</td>
                <td className="py-3 font-mono text-xs text-text-dim">{u.email}</td>
                <td className="py-3">
                  <span className={`text-[10px] font-mono px-2 py-0.5 rounded ${getRoleBadge(u.role)}`}>{ROLE_LABELS[u.role]}</span>
                </td>
                <td className="py-3">
                  {u.role === 'CONTROLLER' ? (
                    <select
                      value={u.machine_assignment ?? ''}
                      onChange={(e) => handleReassignMachine(u, e.target.value)}
                      className="bg-bg border border-border rounded p-1 text-xs text-text focus:outline-none focus:border-cyan-500"
                    >
                      <option value="">— Aucune —</option>
                      {machines.map(m => (
                        <option key={m.id} value={m.id}>{m.name} ({m.code})</option>
                      ))}
                    </select>
                  ) : (
                    <span className="text-xs text-text-dim">—</span>
                  )}
                </td>
                <td className="py-3 font-mono text-xs">{u.shift || '—'}</td>
                <td className="py-3 text-center">
                  <button
                    onClick={() => handleToggleDuty(u)}
                    className={`w-8 h-4 rounded-full transition-colors ${u.is_on_duty ? 'bg-green-500' : 'bg-gray-600'} relative`}
                  >
                    <span className={`absolute top-0.5 w-3 h-3 rounded-full bg-white transition-transform ${u.is_on_duty ? 'left-4' : 'left-0.5'}`} />
                  </button>
                </td>
                <td className="py-3 text-right space-x-3">
                  <button onClick={() => startEdit(u)} className="text-cyan-500 hover:text-cyan-400 text-xs font-medium">
                    Modifier
                  </button>
                  <button onClick={() => handleDelete(u)} className="text-red-500 hover:text-red-400 text-xs font-medium">
                    Supprimer
                  </button>
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
