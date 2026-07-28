'use client';

import { useState } from 'react';
import { useAuthStore } from '@/lib/store/useAuthStore';
import { can } from '@/lib/auth/rbac';

interface VerifyProps {
  alertId: number;
  initialVerified: boolean;
  onVerify: () => void;
}

export function VerifySolvedToggle({ alertId, initialVerified, onVerify }: VerifyProps) {
  const [verified, setVerified] = useState(initialVerified);
  const user = useAuthStore((state) => state.user);

  if (!can(user?.role, 'verify_alert')) {
    return (
      <div className="flex items-center gap-2">
        <span className="text-xs text-text-dim">Vérification Technicien:</span>
        <span className={`text-xs font-mono px-2 py-1 rounded ${verified ? 'bg-green-500/10 text-green-500' : 'bg-orange-500/10 text-orange-500'}`}>
          {verified ? 'VÉRIFIÉ' : 'EN ATTENTE'}
        </span>
      </div>
    );
  }

  const handleToggle = () => {
    // In reality call maintenanceApi.verifyIntervention(alertId)
    setVerified(!verified);
    onVerify();
  };

  return (
    <div className="flex items-center gap-3 bg-panel border border-border p-3 rounded-md">
      <div className="flex-1">
        <div className="text-sm font-semibold text-text">Confirmation de résolution</div>
        <div className="text-xs text-text-dim mt-1">En tant que technicien, je confirme que le problème est physiquement résolu sur la machine.</div>
      </div>
      <button 
        onClick={handleToggle}
        className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-cyan-500 focus:ring-offset-2 focus:ring-offset-bg ${verified ? 'bg-green-500' : 'bg-gray-600'}`}
      >
        <span className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${verified ? 'translate-x-6' : 'translate-x-1'}`} />
      </button>
    </div>
  );
}
