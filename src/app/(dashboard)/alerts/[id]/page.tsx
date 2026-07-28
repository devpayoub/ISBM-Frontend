'use client';

import { use, useEffect, useState } from 'react';
import { alertsApi } from '@/lib/api/alerts';
import { Alert } from '@/lib/api/types';
import { AlertLifecycleStepper } from '@/components/alerts/AlertLifecycleStepper';
import { VerifySolvedToggle } from '@/components/maintenance/VerifySolvedToggle';

export default function AlertDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const [alert, setAlert] = useState<Alert | null>(null);

  useEffect(() => {
    alertsApi.getAlertDetails(parseInt(id)).then(setAlert).catch(console.error);
  }, [id]);

  const handleAction = async (action: string) => {
    try {
      let updated;
      switch(action) {
        case 'acknowledge': updated = await alertsApi.acknowledgeAlert(alert!.id); break;
        case 'start': updated = await alertsApi.startAlert(alert!.id); break;
        case 'resolve': updated = await alertsApi.resolveAlert(alert!.id); break;
        case 'close': updated = await alertsApi.closeAlert(alert!.id); break;
      }
      if (updated) setAlert(updated);
    } catch (e) {
      console.error('Action failed', e);
    }
  };

  if (!alert) return <div className="p-6">Loading...</div>;

  return (
    <div className="p-6 space-y-6 max-w-4xl mx-auto">
      <div className="bg-panel border border-border rounded-md overflow-hidden">
        <div className={`p-6 border-b ${alert.severity === 'CRITICAL' ? 'bg-red-500/10 border-red-500/20' : 'bg-orange-500/10 border-orange-500/20'}`}>
          <div className="flex justify-between items-start">
            <div>
              <h1 className="font-heading font-bold text-2xl text-text">{alert.title}</h1>
              <p className="text-text-dim mt-2">{alert.machine_name} • {alert.category_detail?.name}</p>
            </div>
            <span className="font-mono bg-bg px-3 py-1 rounded text-sm text-text-dim">
              {new Date(alert.created_at).toLocaleString()}
            </span>
          </div>
        </div>
        
        <div className="p-6 space-y-8">
          <div>
            <h3 className="text-xs uppercase tracking-wider text-text-dim font-semibold mb-2">Description</h3>
            <p className="text-sm bg-bg p-4 rounded border border-border">{alert.description}</p>
          </div>

          <AlertLifecycleStepper status={alert.status} onAction={handleAction} />

          {(alert.status === 'RESOLVED' || alert.status === 'CLOSED') && (
            <VerifySolvedToggle 
              alertId={alert.id} 
              initialVerified={false} // In reality, fetch from intervention API
              onVerify={() => console.log('Verified')} 
            />
          )}

          <div className="grid grid-cols-2 gap-4 pt-4 border-t border-border">
            <div>
              <span className="text-xs text-text-dim block mb-1">Déclarée par</span>
              <div className="font-sans text-sm">{alert.worker_name || alert.reported_by_name || 'N/A'}</div>
            </div>
            <div>
              <span className="text-xs text-text-dim block mb-1">Acquittée par</span>
              <div className="font-sans text-sm">{alert.acknowledged_by_name || 'En attente'}</div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
