'use client';

import { useEffect, useState } from 'react';
import { machinesApi } from '@/lib/api/machines';
import { Machine } from '@/lib/api/types';
import { BackButton } from '@/components/ui/back-button';

export default function SupplierEquipmentPage() {
  const [machines, setMachines] = useState<Machine[]>([]);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    machinesApi.getMine().then(setMachines).catch(console.error).finally(() => setLoaded(true));
  }, []);

  return (
    <div className="p-4 md:p-6 space-y-6">
      <div className="flex items-start gap-3">
        <BackButton fallbackHref="/support" />
        <div>
          <h1 className="font-heading font-bold text-2xl uppercase tracking-wide text-text">Mes équipements</h1>
          <p className="text-sm text-text-dim mt-1">Machines dont vous assurez le support.</p>
        </div>
      </div>

      {loaded && machines.length === 0 && (
        <p className="text-sm text-text-dim">Aucun équipement ne vous est attribué pour le moment.</p>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {machines.map(machine => (
          <div key={machine.id} className="bg-panel border border-border rounded-md p-6">
            <div className="flex justify-between items-start mb-4">
              <div>
                <h2 className="font-heading font-bold text-xl">{machine.name}</h2>
                <span className="font-mono text-xs text-text-dim">{machine.code}</span>
              </div>
              <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-panel-2 text-text-dim">
                {machine.status}
              </span>
            </div>
            <div className="space-y-2 text-sm text-text-dim">
              <div className="flex justify-between">
                <span>Type</span>
                <span className="font-mono text-text">{machine.type}</span>
              </div>
              {machine.serial_number && (
                <div className="flex justify-between">
                  <span>N° de série</span>
                  <span className="font-mono text-text">{machine.serial_number}</span>
                </div>
              )}
              {machine.manufacturer && (
                <div className="flex justify-between">
                  <span>Fabricant</span>
                  <span className="font-mono text-text">{machine.manufacturer}</span>
                </div>
              )}
              {machine.location && (
                <div className="flex justify-between">
                  <span>Emplacement</span>
                  <span className="font-mono text-text">{machine.location}</span>
                </div>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
