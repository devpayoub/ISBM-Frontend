'use client';

import { useEffect, useState } from 'react';
import { oeeApi } from '@/lib/api/oee';
import { OEERecord } from '@/lib/api/types';

function GaugeCircle({ label, value, target, unit }: { label: string; value: number; target: number; unit: string }) {
  const pct = Math.min(value, 100);
  const radius = 45;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference - (pct / 100) * circumference;
  const color = value >= target ? '#22c55e' : value >= target * 0.93 ? '#f97316' : '#ef4444';

  return (
    <div className="flex flex-col items-center">
      <svg width="120" height="120" viewBox="0 0 120 120">
        <circle cx="60" cy="60" r={radius} fill="none" stroke="currentColor" strokeWidth="8" className="text-border" />
        <circle
          cx="60" cy="60" r={radius} fill="none" stroke={color} strokeWidth="8"
          strokeDasharray={circumference} strokeDashoffset={offset}
          strokeLinecap="round" transform="rotate(-90 60 60)"
          className="transition-all duration-1000"
        />
        <text x="60" y="55" textAnchor="middle" className="fill-text" fontSize="22" fontWeight="bold" fontFamily="monospace">
          {value.toFixed(1)}
        </text>
        <text x="60" y="72" textAnchor="middle" className="fill-text-dim" fontSize="10" fontFamily="sans-serif">
          {unit}
        </text>
      </svg>
      <span className="text-xs font-semibold text-text-dim uppercase tracking-wider mt-2">{label}</span>
      <span className="text-[10px] text-text-dim">Cible: {target}{unit}</span>
    </div>
  );
}

function average(rows: OEERecord[], field: keyof OEERecord): number {
  if (rows.length === 0) return 0;
  const sum = rows.reduce((s, r) => s + (Number(r[field]) || 0), 0);
  return sum / rows.length;
}

export default function OeePage() {
  // /oee/current returns one OEERecord per active machine for today, not a
  // single summary object — average across machines for the headline gauges.
  const [today, setToday] = useState<OEERecord[]>([]);
  const [records, setRecords] = useState<OEERecord[]>([]);

  useEffect(() => {
    oeeApi.getCurrentOee().then(setToday).catch(console.error);
    oeeApi.getOeeHistory().then(res => setRecords(res.results)).catch(console.error);
  }, []);

  const oee = average(today, 'trs_pct');
  const avail = average(today, 'availability_pct');
  const perf = average(today, 'performance_pct');
  const qual = average(today, 'quality_pct');

  return (
    <div className="p-6 space-y-6 h-full flex flex-col">
      <h1 className="font-heading font-bold text-2xl uppercase tracking-wide text-text">Analyse TRS / OEE</h1>

      {/* Gauges */}
      <div className="bg-panel border border-border rounded-md p-6">
        {today.length === 0 ? (
          <p className="text-sm text-text-dim text-center py-8">
            Aucune donnée TRS pour aujourd'hui. Renseignez la Saisie de production pour voir ces chiffres.
          </p>
        ) : (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-8 justify-items-center">
          <GaugeCircle label="TRS (OEE)" value={oee} target={75} unit="%" />
          <GaugeCircle label="Disponibilité" value={avail} target={90} unit="%" />
          <GaugeCircle label="Performance" value={perf} target={85} unit="%" />
          <GaugeCircle label="Qualité" value={qual} target={97} unit="%" />
        </div>
        )}
      </div>

      {/* History Table */}
      <div className="bg-panel border border-border rounded-md flex-1 p-4 overflow-auto">
        <h2 className="text-sm font-semibold text-text-dim tracking-wider uppercase mb-4">Historique TRS par Shift</h2>
        <div className="overflow-x-auto">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="border-b border-border text-[10px] uppercase tracking-wider text-text-dim">
              <th className="pb-2 font-semibold">Date</th>
              <th className="pb-2 font-semibold">Machine</th>
              <th className="pb-2 font-semibold">Shift</th>
              <th className="pb-2 font-semibold text-right">TRS</th>
              <th className="pb-2 font-semibold text-right">Dispo</th>
              <th className="pb-2 font-semibold text-right">Perf</th>
              <th className="pb-2 font-semibold text-right">Qualité</th>
              <th className="pb-2 font-semibold text-right">Rejets</th>
            </tr>
          </thead>
          <tbody>
            {records.map(r => {
              const trsColor = r.trs_pct >= 75 ? 'text-green-500' : r.trs_pct >= 70 ? 'text-orange-500' : 'text-red-500';
              return (
                <tr key={r.id} className="border-b border-border/30 hover:bg-panel-2/50">
                  <td className="py-2 font-mono text-xs">{r.date}</td>
                  <td className="py-2 text-sm">{r.machine_name || `Machine ${r.machine}`}</td>
                  <td className="py-2 font-mono text-xs">{r.shift}</td>
                  <td className={`py-2 font-mono text-sm text-right font-bold ${trsColor}`}>{r.trs_pct.toFixed(1)}%</td>
                  <td className="py-2 font-mono text-xs text-right">{r.availability_pct.toFixed(1)}%</td>
                  <td className="py-2 font-mono text-xs text-right">{r.performance_pct.toFixed(1)}%</td>
                  <td className="py-2 font-mono text-xs text-right">{r.quality_pct.toFixed(1)}%</td>
                  <td className="py-2 font-mono text-xs text-right">{r.reject_count}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
        </div>
      </div>
    </div>
  );
}
