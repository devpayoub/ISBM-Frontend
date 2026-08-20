'use client';

import { useEffect, useMemo, useState } from 'react';
import { toast } from 'sonner';
import { maintenanceApi } from '@/lib/api/maintenance';
import { machinesApi } from '@/lib/api/machines';
import { usersApi } from '@/lib/api/users';
import {
  ControlResultStatus, Machine, MaintenanceControl, MaintenanceControlResult, Shift, User,
} from '@/lib/api/types';
import { errorMessage } from '@/lib/api/errors';
import { useAuthStore } from '@/lib/store/useAuthStore';
import { ROLE_LABELS, UserRole } from '@/lib/auth/rbac';
import { Input } from '@/components/ui/input';

const SHIFT_LABELS: Record<Shift, string> = {
  MORNING: 'Matin (06h-14h)',
  AFTERNOON: 'Après-midi (14h-22h)',
  NIGHT: 'Nuit (22h-06h)',
};

function todayStr(): string {
  return new Date().toISOString().slice(0, 10);
}

// Fixed set of PDF-sourced targets — must match Backend/apps/maintenance/services.py's
// resolve_template mapping exactly (machine code / equipment reference -> template).
type Target = { key: string; label: string; machine?: number; equipment?: number };

export default function ControlPage() {
  const user = useAuthStore((state) => state.user);
  const isController = user?.role === 'CONTROLLER';

  return (
    <div className="p-6 space-y-6">
      <h1 className="font-heading font-bold text-2xl uppercase tracking-wide text-text">Contrôle préventif</h1>
      {isController ? <ControllerView /> : <SupervisorView />}
    </div>
  );
}

// ─────────────────────── Controller: run/confirm the checklist ───────────────────────

function ControllerView() {
  const [tab, setTab] = useState<'today' | 'history'>('today');
  const [targets, setTargets] = useState<Target[]>([]);

  useEffect(() => {
    Promise.all([machinesApi.getMachines(), machinesApi.getAuxiliaryEquipment()]).then(([machinesRes, equipmentRes]) => {
      const byCode: Record<string, Machine> = {};
      machinesRes.results.forEach((m) => { byCode[m.code] = m; });
      const compressor = equipmentRes.results.find((e) => e.reference === 'AC-88/110');
      const list: Target[] = [];
      if (byCode['ISBM110']) list.push({ key: 'ISBM110', label: 'ISBM 110', machine: byCode['ISBM110'].id });
      if (byCode['ISBM88']) list.push({ key: 'ISBM88', label: 'ISBM 88', machine: byCode['ISBM88'].id });
      if (byCode['INJ-CAPS']) list.push({ key: 'INJ-CAPS', label: 'Injection 1580', machine: byCode['INJ-CAPS'].id });
      if (compressor) list.push({ key: 'COMPRESSOR', label: 'Compresseur', equipment: compressor.id });
      setTargets(list);
    }).catch(console.error);
  }, []);

  return (
    <>
      <div className="flex gap-1 bg-bg border border-border rounded-md p-1 w-fit">
        <button
          onClick={() => setTab('today')}
          className={`px-4 py-2 rounded text-sm font-medium transition-colors ${tab === 'today' ? 'bg-panel text-text shadow' : 'text-text-dim hover:text-text'}`}
        >
          Contrôle du jour
        </button>
        <button
          onClick={() => setTab('history')}
          className={`px-4 py-2 rounded text-sm font-medium transition-colors ${tab === 'history' ? 'bg-panel text-text shadow' : 'text-text-dim hover:text-text'}`}
        >
          Historique
        </button>
      </div>

      <div className="mt-6">
        {tab === 'today' && <TodayTab targets={targets} />}
        {tab === 'history' && <HistoryTab targets={targets} />}
      </div>
    </>
  );
}

function TodayTab({ targets }: { targets: Target[] }) {
  // Date is always today and shift is whatever the admin already assigned to
  // this controller (CustomUser.shift) — neither is a choice the controller
  // makes here, so there's nothing to show as an editable field for either.
  const user = useAuthStore((state) => state.user);
  const shift = user?.shift as Shift | undefined;
  const date = todayStr();

  const [targetKey, setTargetKey] = useState('');
  const [control, setControl] = useState<MaintenanceControl | null>(null);
  const [loading, setLoading] = useState(false);
  // One confirmation per controller per day, across every machine/equipment —
  // checked once per day (mirrors the server-side guard in confirm()) and
  // flipped to true the moment any confirm succeeds, without a refetch.
  const [alreadyConfirmedToday, setAlreadyConfirmedToday] = useState(false);

  useEffect(() => {
    if (!user?.id) return;
    maintenanceApi.getControls({ controller: String(user.id), date })
      .then((res) => setAlreadyConfirmedToday(res.results.some((c) => c.is_locked)))
      .catch(() => {});
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.id, date]);

  const handleControlUpdated = (updated: MaintenanceControl) => {
    setControl(updated);
    if (updated.is_locked) setAlreadyConfirmedToday(true);
  };

  const openTarget = async (key: string) => {
    const target = targets.find((t) => t.key === key);
    if (!target || !shift) return;
    setControl(null);
    setLoading(true);
    try {
      const result = await maintenanceApi.startControl({
        machine: target.machine, equipment: target.equipment, date, shift,
      });
      setControl(result);
    } catch (e) {
      console.error('Failed to start control', e);
      toast.error(errorMessage(e, "Échec de l'ouverture du contrôle."));
    } finally {
      setLoading(false);
    }
  };

  // Selecting a target opens its checklist immediately — no separate button.
  useEffect(() => {
    if (targets.length > 0 && !targetKey && shift) {
      const firstKey = targets[0].key;
      setTargetKey(firstKey);
      openTarget(firstKey);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [targets, shift]);

  const handleTargetChange = (key: string) => {
    setTargetKey(key);
    openTarget(key);
  };

  if (!shift) {
    return <EmptyState text="Aucun shift ne vous est assigné. Contactez un administrateur." />;
  }

  return (
    <div className="grid grid-cols-1 lg:grid-cols-[320px_1fr] gap-6 items-start">
      <div className="bg-panel border border-border rounded-md p-4">
        <label className="block text-xs font-semibold text-text-dim uppercase mb-1">Machine / Équipement</label>
        <select value={targetKey} onChange={(e) => handleTargetChange(e.target.value)}
          className="w-full bg-bg border border-border rounded p-2 text-sm text-text focus:outline-none focus:border-cyan-500">
          {targets.map((t) => <option key={t.key} value={t.key}>{t.label}</option>)}
        </select>
      </div>

      {loading ? (
        <EmptyState text="Chargement du contrôle..." />
      ) : control ? (
        <ChecklistPanel control={control} onUpdated={handleControlUpdated} blockConfirm={alreadyConfirmedToday} />
      ) : (
        <EmptyState text="Sélectionnez une machine ou un équipement." />
      )}
    </div>
  );
}

function HistoryTab({ targets }: { targets: Target[] }) {
  const [targetKey, setTargetKey] = useState('');
  const [date, setDate] = useState('');
  const [rows, setRows] = useState<MaintenanceControl[]>([]);
  const [selected, setSelected] = useState<MaintenanceControl | null>(null);

  const refresh = () => {
    const target = targets.find((t) => t.key === targetKey);
    const params: Record<string, string> = {};
    if (target?.machine) params.machine = String(target.machine);
    if (target?.equipment) params.equipment = String(target.equipment);
    if (date) params.date = date;
    maintenanceApi.getControls(params).then((res) => setRows(res.results)).catch(console.error);
  };

  useEffect(() => {
    refresh();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [targetKey, date]);

  return (
    <div className="grid grid-cols-1 lg:grid-cols-[320px_1fr] gap-6 items-start">
      <div className="space-y-4">
        <div className="bg-panel border border-border rounded-md p-4 space-y-4">
          <div>
            <label className="block text-xs font-semibold text-text-dim uppercase mb-1">Machine / Équipement</label>
            <select value={targetKey} onChange={(e) => setTargetKey(e.target.value)}
              className="w-full bg-bg border border-border rounded p-2 text-sm text-text focus:outline-none focus:border-cyan-500">
              <option value="">Tous</option>
              {targets.map((t) => <option key={t.key} value={t.key}>{t.label}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-xs font-semibold text-text-dim uppercase mb-1">Date</label>
            <input type="date" value={date} onChange={(e) => setDate(e.target.value)}
              className="w-full bg-bg border border-border rounded p-2 text-sm text-text focus:outline-none focus:border-cyan-500" />
          </div>
        </div>

        <div className="bg-panel border border-border rounded-md p-4">
          {rows.length === 0 ? (
            <p className="text-sm text-text-dim">Aucun contrôle trouvé.</p>
          ) : (
            <div className="space-y-1 max-h-[560px] overflow-auto">
              {rows.map((row) => (
                <button key={row.id} onClick={() => setSelected(row)}
                  className={`w-full text-left p-3 rounded border transition-colors ${
                    selected?.id === row.id ? 'bg-panel-2 border-cyan-500' : 'border-border/50 hover:bg-panel-2/50'
                  }`}>
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-sm font-medium text-text">{row.target_label}</span>
                    <span className={`text-[10px] font-mono px-1.5 py-0.5 rounded shrink-0 ${row.is_locked ? 'bg-green-500/10 text-green-500' : 'bg-orange-500/10 text-orange-500'}`}>
                      {row.is_locked ? 'Confirmé' : 'En cours'}
                    </span>
                  </div>
                  <div className="text-xs text-text-dim mt-0.5">{row.date} • {SHIFT_LABELS[row.shift]} • {row.controller_name || '—'}</div>
                </button>
              ))}
            </div>
          )}
        </div>
      </div>

      {selected ? (
        <ChecklistPanel control={selected} onUpdated={(c) => { setSelected(c); refresh(); }} />
      ) : (
        <EmptyState text="Sélectionnez un contrôle dans la liste pour afficher le détail." />
      )}
    </div>
  );
}

function EmptyState({ text }: { text: string }) {
  return (
    <div className="bg-panel border border-border rounded-md p-6 flex items-center justify-center min-h-[200px]">
      <p className="text-sm text-text-dim text-center max-w-sm">{text}</p>
    </div>
  );
}

// ─────────────────────── Admin/Manager: view-only, browse by worker ───────────────────────
// Admin/Manager never start or confirm a checklist themselves — only CONTROLLER does
// (enforced server-side too, apps/maintenance/views.py's CAN_RUN_CONTROL). This view is
// purely supervisory: pick a controller, see everything they've done.

function SupervisorView() {
  const [controllers, setControllers] = useState<User[]>([]);
  const [search, setSearch] = useState('');
  const [selectedController, setSelectedController] = useState<User | null>(null);
  const [controlDate, setControlDate] = useState('');
  const [controls, setControls] = useState<MaintenanceControl[]>([]);
  const [selectedControl, setSelectedControl] = useState<MaintenanceControl | null>(null);

  useEffect(() => {
    usersApi.getUsers({ role: 'CONTROLLER' }).then((res) => setControllers(res.results)).catch(console.error);
  }, []);

  useEffect(() => {
    setSelectedControl(null);
    if (!selectedController) { setControls([]); return; }
    const params: Record<string, string> = { controller: String(selectedController.id) };
    if (controlDate) params.date = controlDate;
    maintenanceApi.getControls(params).then((res) => setControls(res.results)).catch(console.error);
  }, [selectedController, controlDate]);

  const selectController = (c: User) => {
    setControlDate('');
    setSelectedController(c);
  };

  const filteredControllers = controllers.filter((c) => {
    const q = search.trim().toLowerCase();
    if (!q) return true;
    const name = c.full_name || `${c.first_name} ${c.last_name}`;
    return name.toLowerCase().includes(q);
  });

  return (
    <div className="grid grid-cols-1 lg:grid-cols-[320px_1fr] gap-6 items-start">
      <div className="space-y-4">
        {selectedController && (
          <button onClick={() => setSelectedController(null)} className="text-sm text-cyan-500 hover:text-cyan-400">
            ← Retour aux contrôleurs
          </button>
        )}

        {!selectedController ? (
          <div className="bg-panel border border-border rounded-md p-4">
            <h2 className="text-sm font-semibold text-text-dim tracking-wider uppercase mb-3">Contrôleurs</h2>
            <Input
              type="text"
              placeholder="Rechercher par nom..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="mb-3"
            />
            {controllers.length === 0 ? (
              <p className="text-sm text-text-dim">Aucun contrôleur enregistré.</p>
            ) : filteredControllers.length === 0 ? (
              <p className="text-sm text-text-dim">Aucun contrôleur ne correspond à « {search} ».</p>
            ) : (
              <div className="space-y-1">
                {filteredControllers.map((c) => (
                  <button key={c.id} onClick={() => selectController(c)}
                    className="w-full text-left p-3 rounded border border-border/50 hover:bg-panel-2/50 transition-colors">
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-sm font-medium text-text">{c.full_name || `${c.first_name} ${c.last_name}`}</span>
                      <span className={`text-[10px] font-mono px-1.5 py-0.5 rounded shrink-0 ${c.is_active ? 'bg-green-500/10 text-green-500' : 'bg-gray-500/10 text-gray-400'}`}>
                        {c.is_active ? 'Actif' : 'Inactif'}
                      </span>
                    </div>
                    <div className="text-xs text-text-dim mt-0.5">{ROLE_LABELS[c.role as UserRole] || c.role}</div>
                  </button>
                ))}
              </div>
            )}
          </div>
        ) : (
          <div className="bg-panel border border-border rounded-md p-4">
            <h2 className="font-heading font-bold text-sm text-text mb-3">
              {selectedController.full_name || `${selectedController.first_name} ${selectedController.last_name}`}
              <span className="block text-xs font-mono text-text-dim uppercase font-normal mt-0.5">{ROLE_LABELS[selectedController.role as UserRole] || selectedController.role}</span>
            </h2>
            <input type="date" value={controlDate} onChange={(e) => setControlDate(e.target.value)}
              className="w-full bg-bg border border-border rounded p-2 text-sm text-text focus:outline-none focus:border-cyan-500 mb-3" />
            {controls.length === 0 ? (
              <p className="text-sm text-text-dim">
                {controlDate ? `Aucun contrôle préventif le ${controlDate}.` : 'Aucun contrôle préventif enregistré pour ce contrôleur.'}
              </p>
            ) : (
              <div className="space-y-1 max-h-[480px] overflow-auto">
                {controls.map((row) => (
                  <button key={row.id} onClick={() => setSelectedControl(row)}
                    className={`w-full text-left p-3 rounded border transition-colors ${
                      selectedControl?.id === row.id ? 'bg-panel-2 border-cyan-500' : 'border-border/50 hover:bg-panel-2/50'
                    }`}>
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-sm font-medium text-text">{row.target_label}</span>
                      <span className={`text-[10px] font-mono px-1.5 py-0.5 rounded shrink-0 ${row.is_locked ? 'bg-green-500/10 text-green-500' : 'bg-orange-500/10 text-orange-500'}`}>
                        {row.is_locked ? 'Confirmé' : 'En cours'}
                      </span>
                    </div>
                    <div className="text-xs text-text-dim mt-0.5">{row.date} • {SHIFT_LABELS[row.shift]}</div>
                  </button>
                ))}
              </div>
            )}
          </div>
        )}
      </div>

      {selectedControl ? (
        <ChecklistPanel control={selectedControl} onUpdated={setSelectedControl} readOnly />
      ) : (
        <EmptyState text={selectedController
          ? "Sélectionnez un contrôle dans la liste pour afficher le détail."
          : "Sélectionnez un contrôleur pour voir ses contrôles préventifs."} />
      )}
    </div>
  );
}

// ─────────────────────── Shared checklist display ───────────────────────

const STATUS_LABELS: Record<ControlResultStatus, string> = {
  PENDING: 'À vérifier',
  OK: 'Conforme',
  PROBLEM: 'Problème',
};

function ChecklistPanel({ control, onUpdated, readOnly = false, blockConfirm = false }: {
  control: MaintenanceControl; onUpdated: (c: MaintenanceControl) => void; readOnly?: boolean; blockConfirm?: boolean;
}) {
  const [local, setLocal] = useState<Record<number, { status: ControlResultStatus; note: string }>>({});
  const [saving, setSaving] = useState(false);
  const [confirming, setConfirming] = useState(false);

  // Admin/Manager browsing (readOnly=true) never shows edit controls, even if the
  // controller hasn't confirmed yet — only is_locked drives the "Confirmé" banner.
  const isDisplayReadOnly = readOnly || control.is_locked;

  useEffect(() => {
    const next: Record<number, { status: ControlResultStatus; note: string }> = {};
    control.results.forEach((r) => { next[r.item] = { status: r.status, note: r.note }; });
    setLocal(next);
  }, [control]);

  const grouped = useMemo(() => {
    const sections: { name: string; results: MaintenanceControlResult[] }[] = [];
    control.results.forEach((r) => {
      let section = sections.find((s) => s.name === r.section_name);
      if (!section) { section = { name: r.section_name, results: [] }; sections.push(section); }
      section.results.push(r);
    });
    return sections;
  }, [control.results]);

  const setItemStatus = (item: number, status: ControlResultStatus) => {
    setLocal((prev) => ({ ...prev, [item]: { status, note: prev[item]?.note || '' } }));
  };
  const setItemNote = (item: number, note: string) => {
    setLocal((prev) => ({ ...prev, [item]: { status: prev[item]?.status || 'PENDING', note } }));
  };

  const buildResultsPayload = () => Object.entries(local).map(([item, v]) => ({
    item: Number(item), status: v.status, note: v.note,
  }));

  const handleSave = async () => {
    setSaving(true);
    try {
      const updated = await maintenanceApi.submitControlResults(control.id, buildResultsPayload());
      onUpdated(updated);
      toast.success('Résultats enregistrés.');
    } catch (e) {
      console.error('Failed to save control results', e);
      toast.error(errorMessage(e, "Échec de l'enregistrement."));
    } finally {
      setSaving(false);
    }
  };

  const handleConfirm = async () => {
    if (!confirm('Confirmer ce contrôle ? Il sera verrouillé et ne pourra plus être modifié.')) return;
    setConfirming(true);
    try {
      await maintenanceApi.submitControlResults(control.id, buildResultsPayload());
      const updated = await maintenanceApi.confirmControl(control.id);
      onUpdated(updated);
      toast.success('Contrôle confirmé.');
    } catch (e) {
      console.error('Failed to confirm control', e);
      toast.error(errorMessage(e, 'Échec de la confirmation.'));
    } finally {
      setConfirming(false);
    }
  };

  return (
    <div className="bg-panel border border-border rounded-md p-6 space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="font-heading font-bold text-lg text-text">{control.target_label} — {control.template_name}</h2>
          <p className="text-xs text-text-dim">{control.date} • {SHIFT_LABELS[control.shift]}</p>
        </div>
        {control.is_locked ? (
          <span className="text-xs font-mono px-3 py-1.5 rounded bg-green-500/10 text-green-500">
            Confirmé par {control.confirmed_by_name || '—'} le {control.confirmed_at ? new Date(control.confirmed_at).toLocaleString() : ''}
          </span>
        ) : readOnly ? (
          <span className="text-xs font-mono px-3 py-1.5 rounded bg-gray-500/10 text-gray-400">En cours — lecture seule</span>
        ) : (
          <div className="flex flex-col items-end gap-1">
            <div className="flex gap-3">
              <button onClick={handleSave} disabled={saving || confirming}
                className="bg-panel-2 hover:bg-panel-2/70 disabled:opacity-50 text-text px-4 py-2 rounded text-sm font-medium transition-colors border border-border">
                {saving ? 'Enregistrement...' : 'Enregistrer'}
              </button>
              <button onClick={handleConfirm} disabled={saving || confirming || blockConfirm}
                title={blockConfirm ? 'Vous avez déjà confirmé un contrôle aujourd\'hui.' : undefined}
                className="bg-cyan-500 hover:bg-cyan-600 disabled:opacity-50 text-white px-6 py-2 rounded text-sm font-medium transition-colors">
                {confirming ? 'Confirmation...' : 'Confirmer le contrôle'}
              </button>
            </div>
            {blockConfirm && (
              <p className="text-xs text-orange-400 max-w-xs text-right">
                Vous avez déjà confirmé un contrôle aujourd'hui — un seul contrôle peut être confirmé par jour.
              </p>
            )}
          </div>
        )}
      </div>

      {grouped.map((section) => (
        <div key={section.name}>
          <h3 className="text-xs font-semibold text-text-dim tracking-wider uppercase mb-2 pb-1 border-b border-border/50">{section.name}</h3>
          <div className="space-y-2">
            {section.results.map((r) => {
              const state = local[r.item] || { status: r.status, note: r.note };
              return (
                <div key={r.id} className="p-3 bg-panel-2 rounded border border-border/50">
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <span className="text-sm text-text flex-1 min-w-[240px]">{r.item_text}</span>
                    {isDisplayReadOnly ? (
                      <span className={`text-[10px] font-mono px-1.5 py-0.5 rounded ${
                        state.status === 'OK' ? 'bg-green-500/10 text-green-500' :
                        state.status === 'PROBLEM' ? 'bg-red-500/10 text-red-500' :
                        'bg-gray-500/10 text-gray-400'
                      }`}>{STATUS_LABELS[state.status]}</span>
                    ) : (
                      <div className="flex gap-1.5">
                        {(['PENDING', 'OK', 'PROBLEM'] as ControlResultStatus[]).map((s) => (
                          <button key={s} onClick={() => setItemStatus(r.item, s)}
                            className={`text-[10px] font-mono px-2 py-1 rounded transition-colors ${
                              state.status === s
                                ? s === 'OK' ? 'bg-green-500 text-white' : s === 'PROBLEM' ? 'bg-red-500 text-white' : 'bg-gray-500 text-white'
                                : 'bg-bg text-text-dim border border-border hover:text-text'
                            }`}>
                            {STATUS_LABELS[s]}
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                  {(state.status === 'PROBLEM') && (
                    isDisplayReadOnly ? (
                      state.note && <p className="text-xs text-red-400 mt-2">{state.note}</p>
                    ) : (
                      <textarea
                        value={state.note}
                        onChange={(e) => setItemNote(r.item, e.target.value)}
                        placeholder="Décrire le problème (obligatoire pour confirmer)..."
                        rows={2}
                        className="w-full mt-2 bg-bg border border-border rounded p-2 text-xs text-text focus:outline-none focus:border-red-500"
                      />
                    )
                  )}
                </div>
              );
            })}
          </div>
        </div>
      ))}
    </div>
  );
}
