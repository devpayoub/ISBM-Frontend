'use client';

import { useEffect, useMemo, useState } from 'react';
import { toast } from 'sonner';
import { maintenanceApi } from '@/lib/api/maintenance';
import { ControlResultStatus, MaintenanceControl, MaintenanceControlResult, Shift } from '@/lib/api/types';
import { errorMessage } from '@/lib/api/errors';

export const SHIFT_LABELS: Record<Shift, string> = {
  MORNING: 'Matin (06h-14h)',
  AFTERNOON: 'Après-midi (14h-22h)',
  NIGHT: 'Nuit (22h-06h)',
};

const STATUS_LABELS: Record<ControlResultStatus, string> = {
  PENDING: 'À vérifier',
  OK: 'Conforme',
  PROBLEM: 'Problème',
};

/** Shared detail panel for a single MaintenanceControl checklist — used by
 * both the standalone /control page (Controller run/confirm + Admin browse)
 * and the machine detail page's Contrôle préventif tab (Admin browse). */
export function ChecklistPanel({ control, onUpdated, readOnly = false, blockConfirm = false }: {
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
