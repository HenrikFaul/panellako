'use client';

import { useState } from 'react';
import WorkspaceSidebar from '@/components/workspace-sidebar';
import type { WorkspaceCapability } from '@/lib/authorization/capabilities';

interface WorkspaceShellProps {
  buildingId: string;
  buildingName: string;
  buildingAddress: string;
  role: string;
  capabilities?: WorkspaceCapability[];
  children: React.ReactNode;
}

export default function WorkspaceShell({
  buildingId,
  buildingName,
  buildingAddress,
  role,
  capabilities = [],
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
        capabilities={capabilities}
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
