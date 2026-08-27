'use client';

import { use, useEffect, useState } from 'react';
import { machinesApi } from '@/lib/api/machines';
import { Machine } from '@/lib/api/types';
import { useAuthStore } from '@/lib/store/useAuthStore';
import { ParameterListPage } from '@/components/machines/ParameterListPage';

export default function MachineOwnParametersPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const machineId = parseInt(id);
  const [machine, setMachine] = useState<Machine | null>(null);
  const user = useAuthStore((state) => state.user);
  const canManage = user?.role === 'ADMIN' || user?.role === 'MANAGER';

  useEffect(() => {
    machinesApi.getMachineDetails(machineId).then(setMachine).catch(console.error);
  }, [machineId]);

  if (!machine) return <div className="p-6 text-text-dim">Loading...</div>;

  return (
    <ParameterListPage
      machine={machine}
      component={null}
      canManage={canManage}
      crumbs={[
        { label: 'Sommaire Usine', href: '/machines' },
        { label: machine.code, href: `/machines/${machine.id}` },
        { label: `Machine ${machine.name}` },
      ]}
    />
  );
}
