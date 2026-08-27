'use client';

import { use, useEffect, useState } from 'react';
import { machinesApi } from '@/lib/api/machines';
import { Machine, MachineComponent } from '@/lib/api/types';
import { useAuthStore } from '@/lib/store/useAuthStore';
import { ParameterListPage } from '@/components/machines/ParameterListPage';

export default function ComponentParametersPage({ params }: { params: Promise<{ id: string; componentId: string }> }) {
  const { id, componentId } = use(params);
  const machineId = parseInt(id);
  const compId = parseInt(componentId);
  const [machine, setMachine] = useState<Machine | null>(null);
  const [component, setComponent] = useState<MachineComponent | null>(null);
  const user = useAuthStore((state) => state.user);
  const canManage = user?.role === 'ADMIN' || user?.role === 'MANAGER';

  useEffect(() => {
    machinesApi.getMachineDetails(machineId).then(setMachine).catch(console.error);
    machinesApi.getComponents(machineId).then((res) => {
      setComponent(res.results.find((c) => c.id === compId) || null);
    }).catch(console.error);
  }, [machineId, compId]);

  if (!machine || !component) return <div className="p-6 text-text-dim">Loading...</div>;

  return (
    <ParameterListPage
      machine={machine}
      component={component}
      canManage={canManage}
      crumbs={[
        { label: 'Sommaire Usine', href: '/machines' },
        { label: machine.code, href: `/machines/${machine.id}` },
        { label: component.name },
      ]}
    />
  );
}
