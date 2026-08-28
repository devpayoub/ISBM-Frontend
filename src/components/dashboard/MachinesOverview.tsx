'use client';

import { useEffect, useState } from 'react';
import { machinesApi } from '@/lib/api/machines';
import { Machine } from '@/lib/api/types';
import { MachineCard } from '@/components/machines/MachineCard';

/** Compact machine list for the Dashboard — name, code, and equipment
 * health only (see MachineCard's "compact" variant). Full specs/status
 * live on the Parc Machines page (/machines). */
export function MachinesOverview() {
  const [machines, setMachines] = useState<Machine[]>([]);

  useEffect(() => {
    machinesApi.getMachines().then((res) => setMachines(res.results)).catch(console.error);
  }, []);

  return (
    <div className="bg-panel border border-border rounded-md p-4 flex flex-col h-[420px]">
      <h2 className="text-sm font-semibold text-text-dim tracking-wider uppercase mb-4">Machines</h2>
      <div className="flex-1 overflow-y-auto">
        {machines.length === 0 ? (
          <div className="text-sm text-text-dim text-center py-8">Aucune machine.</div>
        ) : (
          <div className="grid grid-cols-1 gap-4">
            {machines.map((machine) => (
              <MachineCard key={machine.id} machine={machine} variant="compact" />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
