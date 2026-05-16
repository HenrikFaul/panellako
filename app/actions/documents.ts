'use server';

import { revalidatePath } from 'next/cache';
import { createClient } from '@/lib/supabase/server';

const STORAGE_BUCKET = 'documents';
const ALLOWED_MIME_TYPES = [
  'application/pdf',
  'image/jpeg',
  'image/png',
  'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'application/vnd.ms-excel',
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
];
const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10 MB

export async function acknowledgeDocument(documentId: string, buildingId?: string) {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return { success: false, error: 'Nem vagy bejelentkezve' };
  }

  const { error } = await supabase
    .from('document_acknowledgements')
    .upsert(
      { document_id: documentId, profile_id: user.id, viewed_at: new Date().toISOString() },
      { onConflict: 'document_id,profile_id' }
    );

  if (error) {
    return { success: false, error: error.message };
  }

  revalidatePath(buildingId ? `/w/${buildingId}` : '/');
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
      building_id: input.building_id ?? null
    })
    .select()
    .single();

  if (error) {
    return { success: false, error: error.message };
  }

  revalidatePath(input.building_id ? `/w/${input.building_id}` : '/');
  return { success: true, data };
}

export async function uploadDocument(formData: FormData) {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return { success: false, error: 'Nem vagy bejelentkezve' };
  }

  const file = formData.get('file') as File | null;
  const title = (formData.get('title') as string | null)?.trim();
  const category = (formData.get('category') as string | null)?.trim();
  const version = (formData.get('version') as string | null)?.trim() || '1.0';
  const visibility = (formData.get('visibility') as string | null)?.trim() || 'Mindenki';
  const buildingId = (formData.get('building_id') as string | null)?.trim() || null;

  if (!file || !title || !category) {
    return { success: false, error: 'Kötelező mezők: fájl, cím, kategória' };
  }

  if (!ALLOWED_MIME_TYPES.includes(file.type)) {
    return { success: false, error: 'Nem engedélyezett fájltípus. Csak PDF, JPG, PNG, DOC, DOCX, XLS, XLSX.' };
  }

  if (file.size > MAX_FILE_SIZE) {
    return { success: false, error: 'A fájl mérete nem haladhatja meg a 10 MB-ot.' };
  }

  // Build a clean storage path: <building_id|global>/<timestamp>_<sanitized_filename>
  const safeName = file.name.replace(/[^a-zA-Z0-9._-]/g, '_').replace(/__+/g, '_');
  const storagePath = `${buildingId ?? 'global'}/${Date.now()}_${safeName}`;

  const bytes = await file.arrayBuffer();
  const { error: uploadError } = await supabase.storage
    .from(STORAGE_BUCKET)
    .upload(storagePath, bytes, { contentType: file.type, upsert: false });

  if (uploadError) {
    return { success: false, error: `Feltöltési hiba: ${uploadError.message}` };
  }

  // Store the storage path in file_url (signed URL generated on demand)
  const { error: dbError } = await supabase.from('documents').insert({
    title,
    category,
    file_url: storagePath,
    version,
    visibility,
    building_id: buildingId,
  });

  if (dbError) {
    // Rollback orphaned file
    await supabase.storage.from(STORAGE_BUCKET).remove([storagePath]);
    return { success: false, error: `Adatbázis hiba: ${dbError.message}` };
  }

  revalidatePath(buildingId ? `/w/${buildingId}` : '/');
  return { success: true };
}

export interface UpdateDocumentInput {
  title?: string;
  category?: string;
  version?: string;
  visibility?: string;
}

const MANAGER_ROLES = ['kozos_kepviselo', 'megbizott'];

async function assertManagerRole(supabase: ReturnType<typeof createClient>, userId: string, buildingId?: string): Promise<string | null> {
  if (!buildingId) return null;
  const { data: mem } = await supabase
    .from('memberships')
    .select('role')
    .eq('profile_id', userId)
    .eq('building_id', buildingId)
    .maybeSingle();
  if (!mem || !MANAGER_ROLES.includes((mem as { role: string }).role)) {
    return 'Nincs jogosultsága ehhez a művelethez';
  }
  return null;
}

export async function deleteDocument(documentId: string, buildingId?: string) {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { success: false, error: 'Nem vagy bejelentkezve' };

  const roleError = await assertManagerRole(supabase, user.id, buildingId);
  if (roleError) return { success: false, error: roleError };

  const { data: doc } = await supabase
    .from('documents')
    .select('file_url')
    .eq('id', documentId)
    .maybeSingle();

  if (doc?.file_url && !doc.file_url.startsWith('http')) {
    await supabase.storage.from(STORAGE_BUCKET).remove([doc.file_url]);
  }

  const { error } = await supabase.from('documents').delete().eq('id', documentId);
  if (error) return { success: false, error: error.message };

  revalidatePath(buildingId ? `/w/${buildingId}` : '/');
  return { success: true };
}

export async function updateDocument(documentId: string, updates: UpdateDocumentInput, buildingId?: string) {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { success: false, error: 'Nem vagy bejelentkezve' };

  const roleError = await assertManagerRole(supabase, user.id, buildingId);
  if (roleError) return { success: false, error: roleError };

  const patch: Record<string, string> = {};
  if (updates.title) patch.title = updates.title;
  if (updates.category) patch.category = updates.category;
  if (updates.version) patch.version = updates.version;
  if (updates.visibility) patch.visibility = updates.visibility;

  const { error } = await supabase.from('documents').update(patch).eq('id', documentId);
  if (error) return { success: false, error: error.message };

  revalidatePath(buildingId ? `/w/${buildingId}` : '/');
  return { success: true };
}

export async function getDocumentSignedUrl(filePath: string) {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return { success: false, error: 'Nem vagy bejelentkezve', url: null };
  }

  // Detect legacy/dead storage.panellako.hu subdomain URLs — extract path and
  // attempt Supabase Storage lookup instead of returning the dead URL.
  const LEGACY_STORAGE_HOST = 'storage.panellako.hu';
  let storagePath = filePath;
  if (filePath.includes(LEGACY_STORAGE_HOST)) {
    const idx = filePath.indexOf(LEGACY_STORAGE_HOST);
    storagePath = filePath.slice(idx + LEGACY_STORAGE_HOST.length).replace(/^\//, '');
  } else if (filePath.startsWith('http://') || filePath.startsWith('https://')) {
    // Other full URLs (e.g. external CDN links) — open directly
    return { success: true, url: filePath };
  }

  const { data, error } = await supabase.storage
    .from(STORAGE_BUCKET)
    .createSignedUrl(storagePath, 3600); // 1-hour expiry

  if (error || !data?.signedUrl) {
    // For demo/ paths: fall back to the static file served from public/demo-docs/
    // The files live at /demo-docs/<filename> as static Next.js public assets.
    if (storagePath.startsWith('demo/')) {
      const filename = storagePath.slice('demo/'.length);
      // Resolve app base URL: prefer NEXT_PUBLIC_APP_URL unless it's localhost,
      // then try VERCEL_URL (auto-set by Vercel), then hard-fall to production domain.
      const configured = process.env.NEXT_PUBLIC_APP_URL ?? '';
      const appUrl = (configured && !configured.includes('localhost'))
        ? configured.replace(/\/$/, '')
        : process.env.VERCEL_URL
          ? `https://${process.env.VERCEL_URL}`
          : 'https://panellako.hu';
      return { success: true, url: `${appUrl}/demo-docs/${filename}` };
    }
    return {
      success: false,
      error: 'A dokumentum fájlja nem található a tárolóban. Töltsd fel újra a fájlt, vagy ellenőrizd a Supabase Storage „documents" bucket tartalmát.',
      url: null,
    };
  }

  return { success: true, url: data.signedUrl };
}
