'use client';

import { useEffect, useState } from 'react';
import { auditApi } from '@/lib/api/audit';
import { usersApi } from '@/lib/api/users';
import { ActivityLog, PaginatedResponse, User } from '@/lib/api/types';

const ACTION_LABELS: Record<string, string> = {
  'alert.declared': 'Alerte déclarée',
  'alert.acknowledged': 'Alerte acquittée',
  'alert.started': 'Intervention démarrée',
  'alert.resolved': 'Alerte résolue',
  'alert.closed': 'Alerte clôturée',
  'intervention.finished': 'Intervention terminée',
  'intervention.verified': 'Intervention vérifiée',
  'auth.login': 'Connexion',
  'auth.logout': 'Déconnexion',
};

const actionBadge = (action: string) => {
  if (action.startsWith('auth.')) return 'bg-purple-500/10 text-purple-400';
  if (action.includes('resolved') || action.includes('finished') || action.includes('verified')) return 'bg-green-500/10 text-green-400';
  if (action.includes('declared')) return 'bg-red-500/10 text-red-400';
  return 'bg-cyan-500/10 text-cyan-400';
};

export default function AuditPage() {
  const [data, setData] = useState<PaginatedResponse<ActivityLog> | null>(null);
  const [users, setUsers] = useState<User[]>([]);
  const [userFilter, setUserFilter] = useState('');
  const [actionFilter, setActionFilter] = useState('');
  const [search, setSearch] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');

  useEffect(() => {
    usersApi.getUsers().then(res => setUsers(res.results)).catch(console.error);
  }, []);

  useEffect(() => {
    const t = setTimeout(() => setDebouncedSearch(search), 300);
    return () => clearTimeout(t);
  }, [search]);

  useEffect(() => {
    const params: Record<string, string> = {};
    if (userFilter) params.user = userFilter;
    if (actionFilter) params.action = actionFilter;
    if (debouncedSearch) params.search = debouncedSearch;
    auditApi.getActivityLog(Object.keys(params).length ? params : undefined).then(setData).catch(console.error);
  }, [userFilter, actionFilter, debouncedSearch]);

  const logs = Array.isArray(data?.results) ? data.results : [];

  return (
    <div className="p-6 space-y-6 h-full flex flex-col">
      <h1 className="font-heading font-bold text-2xl uppercase tracking-wide text-text">Journal d'activité</h1>

      <div className="flex gap-3 flex-wrap">
        <select
          value={userFilter}
          onChange={(e) => setUserFilter(e.target.value)}
          className="bg-bg border border-border rounded p-2 text-sm text-text focus:outline-none focus:border-cyan-500"
        >
          <option value="">Tous les utilisateurs</option>
          {users.map(u => <option key={u.id} value={u.id}>{u.first_name} {u.last_name} ({u.role})</option>)}
        </select>
        <select
          value={actionFilter}
          onChange={(e) => setActionFilter(e.target.value)}
          className="bg-bg border border-border rounded p-2 text-sm text-text focus:outline-none focus:border-cyan-500"
        >
          <option value="">Toutes les actions</option>
          {Object.entries(ACTION_LABELS).map(([value, label]) => (
            <option key={value} value={value}>{label}</option>
          ))}
        </select>
        <input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Rechercher (détail)..."
          className="flex-1 min-w-[200px] bg-bg border border-border rounded p-2 text-sm text-text focus:outline-none focus:border-cyan-500"
        />
      </div>

      <div className="bg-panel border border-border rounded-md flex-1 p-4 overflow-auto">
        <div className="text-sm text-text-dim mb-4">Total: {data?.count ?? logs.length}</div>
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="border-b border-border text-[10px] uppercase tracking-wider text-text-dim">
              <th className="pb-2 font-semibold">Date / Heure</th>
              <th className="pb-2 font-semibold">Utilisateur</th>
              <th className="pb-2 font-semibold">Rôle</th>
              <th className="pb-2 font-semibold">Action</th>
              <th className="pb-2 font-semibold">Détail</th>
            </tr>
          </thead>
          <tbody>
            {logs.map(log => (
              <tr key={log.id} className="border-b border-border/30 hover:bg-panel-2/50">
                <td className="py-3 font-mono text-xs text-text-dim">
                  {new Date(log.created_at).toLocaleDateString()} {new Date(log.created_at).toLocaleTimeString()}
                </td>
                <td className="py-3 font-sans text-sm">{log.user_name || log.user_email || 'Système'}</td>
                <td className="py-3 font-mono text-xs text-text-dim">{log.user_role}</td>
                <td className="py-3">
                  <span className={`text-[10px] font-mono px-2 py-0.5 rounded ${actionBadge(log.action)}`}>
                    {ACTION_LABELS[log.action] || log.action}
                  </span>
                </td>
                <td className="py-3 font-sans text-sm text-text-dim">{log.detail || '—'}</td>
              </tr>
            ))}
          </tbody>
        </table>
        {logs.length === 0 && (
          <div className="text-center py-12 text-text-dim text-sm">Aucune activité enregistrée.</div>
        )}
      </div>
    </div>
  );
}
