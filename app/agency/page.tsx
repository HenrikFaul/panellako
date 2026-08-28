import type { Metadata } from 'next';
import { redirect } from 'next/navigation';
import { getAgencyPortfolioSnapshot } from '@/app/actions/agency';
import AgencyPortfolioClient from '@/components/agency-portfolio-client';
import { listMyWorkspaces } from '@/lib/authorization/workspace-context';
import { createClient } from '@/lib/supabase/server';

export const metadata: Metadata = {
  title: 'Kezelőcéges portfólió · PanelLakó',
  description: 'Kezelőcégek, munkatársak és lakóközösségi megbízások biztonságos kezelése.',
  robots: { index: false, follow: false },
};

export const dynamic = 'force-dynamic';

export default async function AgencyPortfolioPage() {
  const supabase = createClient();
  const { data: { user }, error } = await supabase.auth.getUser();
  if (error || !user) redirect('/login?next=%2Fagency');

  const [initialResult, workspaceResult] = await Promise.all([
    getAgencyPortfolioSnapshot(),
    listMyWorkspaces(),
  ]);

  return (
    <AgencyPortfolioClient
      initialResult={initialResult}
      availableWorkspaces={workspaceResult.workspaces.map((workspace) => ({
        workspaceId: workspace.workspaceId,
        workspaceName: workspace.workspaceName,
        address: workspace.address,
      }))}
    />
  );
}
