'use client';

import { useAuthStore } from '@/lib/store/useAuthStore';
import { can } from '@/lib/auth/rbac';

interface StepperProps {
  status: string;
  onAction: (action: string) => void;
}

const STEPS = ['OPEN', 'ACKNOWLEDGED', 'IN_PROGRESS', 'RESOLVED', 'CLOSED'];

export function AlertLifecycleStepper({ status, onAction }: StepperProps) {
  const user = useAuthStore((state) => state.user);
  
  const currentIndex = STEPS.indexOf(status);

  return (
    <div className="py-6">
      {/* Visual Stepper */}
      <div className="flex items-center justify-between mb-8 relative">
        <div className="absolute left-0 right-0 top-1/2 h-0.5 bg-border -z-10 transform -translate-y-1/2"></div>
        {STEPS.map((step, index) => {
          const isActive = index <= currentIndex;
          const isCurrent = index === currentIndex;
          return (
            <div key={step} className="flex flex-col items-center bg-panel px-2">
              <div className={`w-8 h-8 rounded-full flex items-center justify-center border-2 
                ${isActive ? 'border-cyan-500 bg-cyan-500/10 text-cyan-500' : 'border-border bg-bg text-text-dim'}
                ${isCurrent ? 'ring-4 ring-cyan-500/20' : ''}
              `}>
                {isActive ? '✓' : index + 1}
              </div>
              <span className={`text-[10px] mt-2 font-mono uppercase tracking-wider ${isActive ? 'text-text' : 'text-text-dim'}`}>
                {step.replace('_', ' ')}
              </span>
            </div>
          );
        })}
      </div>

      {/* Action Buttons */}
      <div className="flex justify-center gap-4 p-4 bg-panel-2 rounded border border-border">
        {status === 'OPEN' && can(user?.role, 'acknowledge_alert') && (
          <button onClick={() => onAction('acknowledge')} className="px-6 py-2 bg-blue-500 hover:bg-blue-600 text-white rounded font-medium text-sm transition-colors shadow-lg shadow-blue-500/20">
            Prendre en charge (Acknowledge)
          </button>
        )}
        
        {status === 'ACKNOWLEDGED' && can(user?.role, 'start_alert') && (
          <button onClick={() => onAction('start')} className="px-6 py-2 bg-orange-500 hover:bg-orange-600 text-white rounded font-medium text-sm transition-colors shadow-lg shadow-orange-500/20">
            Démarrer l'intervention
          </button>
        )}
        
        {status === 'IN_PROGRESS' && can(user?.role, 'resolve_alert') && (
          <button onClick={() => onAction('resolve')} className="px-6 py-2 bg-green-500 hover:bg-green-600 text-white rounded font-medium text-sm transition-colors shadow-lg shadow-green-500/20">
            Marquer comme résolu
          </button>
        )}
        
        {status === 'RESOLVED' && can(user?.role, 'close_alert') && (
          <button onClick={() => onAction('close')} className="px-6 py-2 bg-slate-500 hover:bg-slate-600 text-white rounded font-medium text-sm transition-colors">
            Clôturer définitivement
          </button>
        )}

        {/* Maintenance resolves exclusively through the /maintenance queue, which
            records what was actually done before auto-resolving the alert. */}
        {status === 'IN_PROGRESS' && user?.role === 'MAINTENANCE' && (
          <div className="text-sm text-text-dim">
            Rendez-vous sur la page Maintenance pour clôturer cette intervention.
          </div>
        )}

        {/* If no action available for this role at this step */}
        {((status === 'OPEN' && !can(user?.role, 'acknowledge_alert')) ||
          (status === 'ACKNOWLEDGED' && !can(user?.role, 'start_alert')) ||
          (status === 'IN_PROGRESS' && !can(user?.role, 'resolve_alert') && user?.role !== 'MAINTENANCE') ||
          (status === 'RESOLVED' && !can(user?.role, 'close_alert'))) && (
            <div className="text-sm text-text-dim">
              En attente d'action par un autre rôle (ex: Technicien ou Superviseur).
            </div>
        )}
        
        {status === 'CLOSED' && (
          <div className="text-sm text-green-500 font-mono">
            Alerte clôturée.
          </div>
        )}
      </div>
    </div>
  );
}
