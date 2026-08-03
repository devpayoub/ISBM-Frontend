'use client';

import { useEffect, useState } from 'react';
import { machinesApi } from '@/lib/api/machines';
import { Machine } from '@/lib/api/types';
import { useAlertStore } from '@/lib/store/useAlertStore';

export function AndonBoard() {
  const [machines, setMachines] = useState<Machine[]>([]);
  const machineStatus = useAlertStore((state) => state.machineStatus);

  useEffect(() => {
    machinesApi.getMachines().then(res => setMachines(res.results)).catch(console.error);
  }, []);

  const getColorClass = (status?: string) => {
    switch (status) {
      case 'RED': return 'bg-red-500 shadow-[0_0_15px_rgba(239,68,68,0.7)] animate-pulse';
      case 'ORANGE': return 'bg-orange-500 shadow-[0_0_10px_rgba(249,115,22,0.5)]';
      case 'GREEN': return 'bg-green-500 shadow-[0_0_10px_rgba(34,197,94,0.4)]';
      default: return 'bg-gray-600';
    }
  };

  return (
    <div className="bg-panel border border-border rounded-md p-4 flex flex-col h-full">
      <h2 className="text-sm font-semibold text-text-dim tracking-wider uppercase mb-4">Andon Board</h2>
      <div className="flex-1 flex flex-col gap-4 justify-center overflow-y-auto">
        {machines.length === 0 ? (
          <div className="text-sm text-text-dim text-center py-8">Aucune machine.</div>
        ) : (
          machines.map((machine) => {
            // Prefer live WS status, fallback to the API's computed andon_status.
            const status = machineStatus[machine.id] || machine.andon_status || 'GREEN';
            return (
              <div key={machine.id} className="flex items-center justify-between p-3 bg-panel-2 rounded border border-border">
                <div>
                  <div className="font-heading font-bold text-lg">{machine.name}</div>
                  <div className="text-xs text-text-dim">
                    {machine.type === 'INJECTION' ? `${machine.nominal_cph} CPH` : `${machine.nominal_bph} BPH`}
                  </div>
                </div>
                <div className={`w-8 h-8 rounded-full ${getColorClass(status)} transition-colors duration-500`} />
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
