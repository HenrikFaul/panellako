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
    <div className="app-surface flex min-h-screen">
      <WorkspaceSidebar
        buildingId={buildingId}
        buildingName={buildingName}
        buildingAddress={buildingAddress}
        role={role}
        collapsed={collapsed}
        onCollapse={setCollapsed}
      />
      <main
        id="workspace-main"
        className={`min-w-0 flex-1 overflow-x-hidden pt-14 transition-[padding] duration-200 lg:pt-0 ${
          collapsed ? 'lg:pl-16' : 'lg:pl-[248px]'
        }`}
      >
        {children}
      </main>
    </div>
  );
}
