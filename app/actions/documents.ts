'use server';

import { revalidatePath } from 'next/cache';
import { createClient } from '@/lib/supabase/server';

export async function acknowledgeDocument(documentId: string) {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return { success: false, error: 'Nem vagy bejelentkezve' };
  }

  const { error } = await supabase
    .from('document_acknowledgements')
    .upsert(
      { document_id: documentId, profile_id: user.id, acknowledged_at: new Date().toISOString() },
      { onConflict: 'document_id,profile_id' }
    );

  if (error) {
    return { success: false, error: error.message };
  }

  revalidatePath('/');
  return { success: true };
}

export interface CreateDocumentInput {
  title: string;
  category: string;
  file_url: string;
  version?: string;
  visibility?: string;
  building_id?: string;
}

export async function createDocument(input: CreateDocumentInput) {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return { success: false, error: 'Nem vagy bejelentkezve' };
  }

  const { data, error } = await supabase
    .from('documents')
    .insert({
      title: input.title,
      category: input.category,
      file_url: input.file_url,
      version: input.version ?? '1.0',
      visibility: input.visibility ?? 'Mindenki',
      building_id: input.building_id ?? null,
      uploaded_by: user.id,
      uploaded_at: new Date().toISOString()
    })
    .select()
    .single();

  if (error) {
    return { success: false, error: error.message };
  }

  revalidatePath('/');
  return { success: true, data };
}
