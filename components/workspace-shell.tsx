'use client';

import { useState } from 'react';
import WorkspaceSidebar from '@/components/workspace-sidebar';

interface WorkspaceShellProps {
  buildingId: string;
  buildingName: string;
  buildingAddress: string;
  role: string;
  children: React.ReactNode;
}

export default function WorkspaceShell({
  buildingId,
  buildingName,
  buildingAddress,
  role,
  children,
}: WorkspaceShellProps) {
  const [collapsed, setCollapsed] = useState(false);

  return (
    <div className="flex min-h-screen">
      <WorkspaceSidebar
        buildingId={buildingId}
        buildingName={buildingName}
        buildingAddress={buildingAddress}
        role={role}
        collapsed={collapsed}
        onCollapse={setCollapsed}
      />
      <main
        className="flex-1 min-w-0 transition-[padding] duration-200"
        style={{ paddingLeft: collapsed ? 60 : 272 }}
      >
        {children}
      </main>
    </div>
  );
}
