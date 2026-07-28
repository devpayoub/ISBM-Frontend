'use client';

import { useAlertStore } from '@/lib/store/useAlertStore';
import { useAuthStore } from '@/lib/store/useAuthStore';
import Link from 'next/link';

export function AlertFeed() {
  const liveAlerts = useAlertStore((state) => state.liveAlerts);
  const user = useAuthStore((state) => state.user);
  
  const getSeverityBorder = (severity: string) => {
    switch (severity) {
      case 'CRITICAL': return 'border-l-red-500';
      case 'MAJOR': return 'border-l-orange-500';
      case 'MINOR': return 'border-l-yellow-500';
      default: return 'border-l-blue-500';
    }
  };

  return (
    <div className="bg-panel border border-border rounded-md p-4 flex flex-col h-full">
      <div className="flex justify-between items-center mb-4">
        <h2 className="text-sm font-semibold text-text-dim tracking-wider uppercase">Alert Feed</h2>
        <span className="text-xs bg-red-500/10 text-red-500 px-2 py-1 rounded font-mono">
          {liveAlerts.length} ACTIVES
        </span>
      </div>
      
      <div className="flex-1 overflow-y-auto pr-2 space-y-3">
        {liveAlerts.length === 0 ? (
          <div className="text-sm text-text-dim text-center py-8">
            Aucune alerte en cours.
          </div>
        ) : (
          liveAlerts.map(alert => (
            <Link href={`/alerts/${alert.id}`} key={alert.id}>
              <div className={`block p-3 bg-panel-2 rounded border border-border border-l-4 ${getSeverityBorder(alert.severity)} hover:bg-panel transition-colors mb-3`}>
                <div className="flex justify-between items-start mb-1">
                  <span className="font-mono text-xs text-text-dim">{alert.machine_name}</span>
                  <span className="font-mono text-[10px] bg-bg px-1.5 py-0.5 rounded text-text-dim">
                    {new Date(alert.created_at).toLocaleTimeString()}
                  </span>
                </div>
                <h3 className="font-sans text-sm font-medium text-text mb-2 line-clamp-1">{alert.title}</h3>

                <div className="flex justify-between items-center text-xs text-text-dim">
                  <span>Par: {alert.worker_name || alert.reported_by_name || 'Système'}</span>
                  <span className="font-mono uppercase px-1.5 py-0.5 bg-bg rounded">{alert.status}</span>
                </div>
              </div>
            </Link>
          ))
        )}
      </div>
    </div>
  );
}
