'use client';

import { useEffect, useState } from 'react';
import { useAlertStore } from '@/lib/store/useAlertStore';
import { connectWebSocket, disconnectWebSocket } from '@/lib/ws/client';
import { alertsApi } from '@/lib/api/alerts';
import { machinesApi } from '@/lib/api/machines';
import { Machine } from '@/lib/api/types';

export default function ScreenPage() {
  const [time, setTime] = useState(new Date());
  const [machines, setMachines] = useState<Machine[]>([]);
  const liveAlerts = useAlertStore((state) => state.liveAlerts);
  const machineStatus = useAlertStore((state) => state.machineStatus);
  const isConnected = useAlertStore((state) => state.isConnected);

  useEffect(() => {
    machinesApi.getMachines().then((res) => setMachines(res.results)).catch(console.error);
    // machineStatus only ever fills in from a live WS push while this tab is
    // open — an alert declared before the screen loaded (or a missed push)
    // would otherwise leave every dot on its default color forever. Seed the
    // real, already-computed alert list + andon_status from the machines
    // fetch above the same way the Dashboard/Parc Machines pages do.
    alertsApi.getActiveAlerts().then(useAlertStore.getState().setInitialAlerts).catch(console.error);
    connectWebSocket();

    const clockInterval = setInterval(() => setTime(new Date()), 1000);

    return () => {
      disconnectWebSocket();
      clearInterval(clockInterval);
    };
  }, []);

  const criticalAlerts = liveAlerts.filter(a => a.severity === 'CRITICAL');
  const latestAlert = liveAlerts[0];
  const hasCritical = criticalAlerts.length > 0;

  const getAndonColor = (machine: Machine) => {
    return machineStatus[machine.id] || machine.andon_status || 'GREEN';
  };

  const getAndonStyle = (color: string) => {
    switch (color) {
      case 'RED': return { bg: 'bg-red-500', glow: 'shadow-[0_0_30px_rgba(239,68,68,0.8)]', text: 'text-red-500', animate: 'animate-pulse' };
      case 'ORANGE': return { bg: 'bg-orange-500', glow: 'shadow-[0_0_20px_rgba(249,115,22,0.5)]', text: 'text-orange-500', animate: '' };
      case 'GREEN': return { bg: 'bg-green-500', glow: 'shadow-[0_0_15px_rgba(34,197,94,0.4)]', text: 'text-green-500', animate: '' };
      default: return { bg: 'bg-gray-500', glow: '', text: 'text-gray-500', animate: '' };
    }
  };

  const currentShift = () => {
    const hour = time.getHours();
    if (hour >= 6 && hour < 14) return 'MATIN 06h-14h';
    if (hour >= 14 && hour < 22) return 'APRÈS-MIDI 14h-22h';
    return 'NUIT 22h-06h';
  };

  return (
    <div className={`min-h-screen bg-gray-50 text-gray-900 flex flex-col select-none ${hasCritical ? 'animate-pulse-subtle' : ''}`}>
      {/* Header */}
      <header className="flex justify-between items-center px-8 py-4 border-b border-gray-200">
        <div className="flex items-center gap-4">
          <h1 className="font-heading font-bold text-2xl tracking-[0.3em] uppercase">ISBM ANDON</h1>
          <span className="text-xs text-gray-400 font-mono">{currentShift()}</span>
        </div>
        <div className="flex items-center gap-6">
          <div className={`flex items-center gap-2 text-xs font-mono ${isConnected ? 'text-green-600' : 'text-red-600'}`}>
            <span className={`w-2 h-2 rounded-full ${isConnected ? 'bg-green-500 animate-pulse' : 'bg-red-500'}`} />
            {isConnected ? 'LIVE' : 'DÉCONNECTÉ'}
          </div>
          <div className="font-mono text-3xl font-bold tracking-wider">
            {time.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
          </div>
        </div>
      </header>

      <main className="flex-1 grid grid-rows-[auto_1fr_auto] gap-4 p-6">
        {/* Alert Hero */}
        <div className={`rounded-lg p-8 flex items-center justify-center min-h-[140px] border ${
          hasCritical
            ? 'bg-red-50 border-red-300 shadow-[0_0_40px_rgba(239,68,68,0.15)]'
            : 'bg-green-50 border-green-200'
        }`}>
          {hasCritical ? (
            <div className="text-center">
              <div className="text-red-600 font-heading font-bold text-4xl mb-2 animate-pulse">
                🔴 ALERTE CRITIQUE
              </div>
              <div className="text-gray-900 font-heading text-2xl">{latestAlert?.title}</div>
              <div className="text-gray-500 text-lg mt-2">
                {latestAlert?.machine_name} • Par: {latestAlert?.worker_name || latestAlert?.reported_by_name} • {latestAlert?.created_at ? new Date(latestAlert.created_at).toLocaleTimeString() : ''}
              </div>
            </div>
          ) : (
            <div className="text-center">
              <div className="text-green-600 font-heading font-bold text-4xl">✓ PRODUCTION NORMALE</div>
              <div className="text-gray-400 text-sm mt-2 font-mono">Aucune alerte critique en cours</div>
            </div>
          )}
        </div>

        {/* Machine Status Cards */}
        <div className="grid grid-cols-3 gap-6">
          {machines.map(machine => {
            const color = getAndonColor(machine);
            const style = getAndonStyle(color);
            const rate = machine.type === 'INJECTION' ? `${machine.nominal_cph} CPH` : `${machine.nominal_bph} BPH`;
            return (
              <div key={machine.id} className={`bg-white border border-gray-200 shadow-sm rounded-lg p-6 flex flex-col items-center justify-center gap-4 ${style.animate}`}>
                <div className={`w-20 h-20 rounded-full ${style.bg} ${style.glow} transition-all duration-500`} />
                <div className="text-center">
                  <h2 className="font-heading font-bold text-2xl">{machine.name}</h2>
                  <p className="text-gray-400 text-sm font-mono">{rate}{machine.product_format ? ` • ${machine.product_format}` : ''}</p>
                </div>
                <div className={`font-mono text-sm font-bold uppercase ${style.text}`}>{color}</div>
              </div>
            );
          })}
        </div>

        {/* Bottom ticker: recent alerts */}
        <div className="bg-white border border-gray-200 shadow-sm rounded-lg p-4 overflow-hidden">
          <div className="flex gap-8 items-center">
            <span className="text-[10px] font-heading uppercase tracking-widest text-gray-400 shrink-0">HISTORIQUE</span>
            <div className="flex gap-6 overflow-x-auto scrollbar-hide">
              {liveAlerts.slice(0, 8).map(alert => (
                <div key={alert.id} className="flex items-center gap-2 shrink-0">
                  <span className={`w-2 h-2 rounded-full ${
                    alert.severity === 'CRITICAL' ? 'bg-red-500' : alert.severity === 'MAJOR' ? 'bg-orange-500' : 'bg-yellow-500'
                  }`} />
                  <span className="text-xs text-gray-600 font-mono">{alert.machine_name}</span>
                  <span className="text-xs text-gray-400">{alert.title}</span>
                  <span className="text-[10px] text-gray-300 font-mono">{alert.status}</span>
                </div>
              ))}
              {liveAlerts.length === 0 && (
                <span className="text-xs text-gray-400 font-mono">Aucune alerte récente</span>
              )}
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
