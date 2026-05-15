'use server';

import { revalidatePath } from 'next/cache';
import { createClient } from '@/lib/supabase/server';

export type VoteValue = 'igen' | 'nem' | 'tartozkodas';

export async function submitVote(resolutionId: string, voteValue: VoteValue, unitId?: string) {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return { success: false, error: 'Nem vagy bejelentkezve' };
  }

  // Prevent duplicate vote: upsert by (resolution_id, voter_profile_id)
  const { error } = await supabase
    .from('votes')
    .upsert(
      {
        resolution_id: resolutionId,
        voter_profile_id: user.id,
        unit_id: unitId ?? null,
        vote_value: voteValue,
        weight: 1
      },
      { onConflict: 'resolution_id,voter_profile_id' }
    );

  if (error) {
    return { success: false, error: error.message };
  }

  revalidatePath('/');
  return { success: true };
}
