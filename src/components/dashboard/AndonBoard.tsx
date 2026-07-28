'use client';

import { useAlertStore } from '@/lib/store/useAlertStore';

const MACHINES = [
  { id: 1, name: 'ISBM 110', capacity: '700 BPH' },
  { id: 2, name: 'ISBM 88', capacity: '1100 BPH' },
  { id: 3, name: 'INJ-CAPS', capacity: '1600 CPH' },
];

export function AndonBoard() {
  const machineStatus = useAlertStore((state) => state.machineStatus);

  const getColorClass = (status?: string) => {
    switch (status) {
      case 'RED': return 'bg-red-500 shadow-[0_0_15px_rgba(239,68,68,0.7)] animate-pulse';
      case 'ORANGE': return 'bg-orange-500 shadow-[0_0_10px_rgba(249,115,22,0.5)]';
      case 'GREEN': return 'bg-green-500 shadow-[0_0_10px_rgba(34,197,94,0.4)]';
      default: return 'bg-gray-600'; // Unknown or loading
    }
  };

  return (
    <div className="bg-panel border border-border rounded-md p-4 flex flex-col h-full">
      <h2 className="text-sm font-semibold text-text-dim tracking-wider uppercase mb-4">Andon Board</h2>
      <div className="flex-1 flex flex-col gap-4 justify-center">
        {MACHINES.map((machine) => {
          // Default to green if we haven't received status yet for this demo
          const status = machineStatus[machine.id] || 'GREEN'; 
          
          return (
            <div key={machine.id} className="flex items-center justify-between p-3 bg-panel-2 rounded border border-border">
              <div>
                <div className="font-heading font-bold text-lg">{machine.name}</div>
                <div className="text-xs text-text-dim">{machine.capacity}</div>
              </div>
              <div className={`w-8 h-8 rounded-full ${getColorClass(status)} transition-colors duration-500`} />
            </div>
          );
        })}
      </div>
    </div>
  );
}
