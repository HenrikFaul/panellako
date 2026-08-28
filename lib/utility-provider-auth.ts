import { createHash } from 'node:crypto';
import { createClient } from '@supabase/supabase-js';

function createUtilityAdminClient(url: string, serviceRoleKey: string) {
  return createClient(url, serviceRoleKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
}

type UtilityAdminClient = ReturnType<typeof createUtilityAdminClient>;

export interface UtilityProviderAuthorization {
  client: UtilityAdminClient;
  workspaceId: string;
  provider: {
    id: string;
    building_id: string;
    provider_name: string;
    provider_type: string;
  };
}

/**
 * Validates an external provider credential against the stored SHA-256 hash.
 * The credential is scoped to one physical building and one provider type.
 */
export async function authorizeUtilityProvider(
  rawToken: string | null,
  buildingId: string,
  providerType: string,
): Promise<UtilityProviderAuthorization | null> {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  const token = rawToken?.trim();
  if (!url || !serviceRoleKey || !token || !buildingId || !providerType) return null;

  const client = createUtilityAdminClient(url, serviceRoleKey);
  const tokenHash = createHash('sha256').update(token, 'utf8').digest('hex');
  const { data, error } = await client
    .from('utility_provider_tokens')
    .select('id, building_id, provider_name, provider_type')
    .eq('token_hash', tokenHash)
    .eq('building_id', buildingId)
    .eq('provider_type', providerType)
    .eq('active', true)
    .maybeSingle();

  if (error || !data) return null;

  const { data: binding, error: bindingError } = await client
    .from('workspace_buildings')
    .select('workspace_id')
    .eq('physical_building_id', buildingId)
    .eq('is_primary', true)
    .is('valid_to', null)
    .maybeSingle();
  if (bindingError || !binding?.workspace_id) return null;

  // Best-effort operational timestamp; authentication does not depend on it.
  await client
    .from('utility_provider_tokens')
    .update({ last_used_at: new Date().toISOString() })
    .eq('id', data.id);

  return {
    client,
    workspaceId: binding.workspace_id as string,
    provider: data as UtilityProviderAuthorization['provider'],
  };
}
