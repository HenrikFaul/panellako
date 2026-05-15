'use server';

import { revalidatePath } from 'next/cache';
import { createClient } from '@/lib/supabase/server';

export interface CreateAnnouncementInput {
  title: string;
  content: string;
  target_group: string;
  category?: string;
  building_id?: string;
}

export async function createAnnouncement(input: CreateAnnouncementInput) {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return { success: false, error: 'Nem vagy bejelentkezve' };
  }

  const { data, error } = await supabase
    .from('announcements')
    .insert({
      title: input.title,
      content: input.content,
      target_group: input.target_group,
      category: input.category ?? 'egyeb',
      building_id: input.building_id ?? null,
      created_by: user.id
    })
    .select()
    .single();

  if (error) {
    return { success: false, error: error.message };
  }

  revalidatePath('/');
  return { success: true, data };
}
