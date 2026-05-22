import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import WorkspaceShell from '@/components/workspace-shell';
import type { Role } from '@/lib/types';

interface SubpageLayoutProps {
  children: React.ReactNode;
  params: { buildingId: string };
}

const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

const ALLOWED_ROLES: Role[] = [
  'lako', 'tulajdonos', 'kozos_kepviselo', 'megbizott', 'bizottsag', 'konyvelo',
];

export default async function SubpageLayout({ children, params }: SubpageLayoutProps) {
  const { buildingId } = params;

  if (!UUID_REGEX.test(buildingId)) redirect('/app');

  const supabase = createClient();

  const { data: { user }, error: authError } = await supabase.auth.getUser();
  if (authError || !user) redirect('/login');

  const { data: memberships } = await supabase
    .from('memberships')
    .select('role')
    .eq('profile_id', user.id)
    .eq('building_id', buildingId)
    .eq('active', true)
    .limit(1);

  if (!memberships || memberships.length === 0) redirect('/app');

  const rawRole = (memberships[0] as { role: string }).role;
  const role: Role = ALLOWED_ROLES.includes(rawRole as Role) ? (rawRole as Role) : 'lako';

  const { data: building } = await supabase
    .from('buildings')
    .select('name, address')
    .eq('id', buildingId)
    .single();

  if (!building) redirect('/app');

  const buildingName =
    (building as { name?: string | null }).name ?? building.address;

  return (
    <WorkspaceShell
      buildingId={buildingId}
      buildingName={buildingName}
      buildingAddress={building.address}
      role={role}
    >
      {children}
    </WorkspaceShell>
  );
}
