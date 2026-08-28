'use server';

import { revalidatePath } from 'next/cache';
import { createClient } from '@/lib/supabase/server';
import {
  authorizationMessage,
  requireAuthenticatedUser,
  requireWorkspaceAccess,
  requireWorkspaceCapability,
} from '@/lib/authorization/guards';

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

export type DocumentAudience =
  | 'COMMON'
  | 'OWNERS'
  | 'RESIDENTS'
  | 'SPECIFIC_UNITS'
  | 'ADMINS'
  | 'FINANCE';

const DOCUMENT_AUDIENCE_ALIASES: Record<string, DocumentAudience> = {
  mindenki: 'COMMON',
  all: 'COMMON',
  common: 'COMMON',
  tulajdonosok: 'OWNERS',
  owners: 'OWNERS',
  lakók: 'RESIDENTS',
  lakok: 'RESIDENTS',
  residents: 'RESIDENTS',
  'célzott albetétek': 'SPECIFIC_UNITS',
  'celzott albetetek': 'SPECIFIC_UNITS',
  specific_units: 'SPECIFIC_UNITS',
  admins: 'ADMINS',
  finance: 'FINANCE',
};

function normalizeDocumentAudience(value?: string): DocumentAudience | null {
  return DOCUMENT_AUDIENCE_ALIASES[(value ?? 'Mindenki').trim().toLocaleLowerCase('hu-HU')] ?? null;
}

function normalizeUnitIds(unitIds?: string[]): string[] {
  return [...new Set((unitIds ?? []).map((unitId) => unitId.trim()).filter(Boolean))];
}

function validateAudienceTargeting(audience: DocumentAudience | null, unitIds: string[]) {
  if (!audience) return 'Ismeretlen dokumentum-célközönség.';
  if (audience === 'SPECIFIC_UNITS' && unitIds.length === 0) {
    return 'Célzott dokumentumhoz legalább egy albetét szükséges.';
  }
  if (unitIds.length > 500) return 'Legfeljebb 500 albetét célozható egyszerre.';
  return null;
}

async function replaceDocumentUnits(
  supabase: ReturnType<typeof createClient>,
  documentId: string,
  audience: DocumentAudience,
  unitIds: string[],
) {
  const { error: deleteError } = await supabase
    .from('document_units')
    .delete()
    .eq('document_id', documentId);
  if (deleteError) return deleteError;
  if (audience !== 'SPECIFIC_UNITS') return null;

  const { error: insertError } = await supabase
    .from('document_units')
    .insert(unitIds.map((unitId) => ({ document_id: documentId, unit_id: unitId })));
  return insertError;
}

export async function acknowledgeDocument(documentId: string, buildingId?: string) {
  if (!buildingId) return { success: false, error: 'Lakóközösség megadása kötelező.' };
  try {
    const [{ supabase, user }, context] = await Promise.all([
      requireAuthenticatedUser(),
      requireWorkspaceAccess(buildingId),
    ]);
    const { data: document } = await supabase
      .from('documents')
      .select('id, building_id')
      .eq('id', documentId)
      .eq('building_id', context.primaryBuildingId)
      .maybeSingle();
    if (!document) return { success: false, error: 'A művelet nem engedélyezett.' };

    const { error } = await supabase
      .from('document_acknowledgements')
      .upsert(
        { document_id: documentId, profile_id: user.id, viewed_at: new Date().toISOString() },
        { onConflict: 'document_id,profile_id' },
      );

    if (error) return { success: false, error: error.message };

    revalidatePath(`/w/${buildingId}`);
    return { success: true };
  } catch (error) {
    return { success: false, error: authorizationMessage(error) };
  }
}

export interface CreateDocumentInput {
  title: string;
  category: string;
  file_url: string;
  version?: string;
  visibility?: string;
  unit_ids?: string[];
  building_id?: string;
}

export async function createDocument(input: CreateDocumentInput) {
  if (!input.building_id) return { success: false, error: 'Lakóközösség megadása kötelező.' };
  const audience = normalizeDocumentAudience(input.visibility);
  const unitIds = normalizeUnitIds(input.unit_ids);
  const audienceError = validateAudienceTargeting(audience, unitIds);
  if (audienceError || !audience) {
    return { success: false, error: audienceError ?? 'Érvénytelen célközönség.' };
  }
  try {
    const [{ supabase }, context] = await Promise.all([
      requireAuthenticatedUser(),
      requireWorkspaceCapability(input.building_id, 'document.publish'),
    ]);

    const { data, error } = await supabase
      .from('documents')
      .insert({
        workspace_id: context.workspaceId,
        title: input.title,
        category: input.category,
        file_url: input.file_url,
        version: input.version ?? '1.0',
        visibility: audience,
        building_id: context.primaryBuildingId,
      })
      .select()
      .single();

    if (error) return { success: false, error: error.message };

    const targetError = await replaceDocumentUnits(supabase, data.id, audience, unitIds);
    if (targetError) {
      await supabase.from('documents').delete().eq('id', data.id).eq('building_id', context.primaryBuildingId);
      return { success: false, error: 'A dokumentum célzása sikertelen.' };
    }

    revalidatePath(`/w/${input.building_id}`);
    return { success: true, data };
  } catch (error) {
    return { success: false, error: authorizationMessage(error) };
  }
}

export async function uploadDocument(formData: FormData) {
  const file = formData.get('file') as File | null;
  const title = (formData.get('title') as string | null)?.trim();
  const category = (formData.get('category') as string | null)?.trim();
  const version = (formData.get('version') as string | null)?.trim() || '1.0';
  const visibility = (formData.get('visibility') as string | null)?.trim() || 'Mindenki';
  const audience = normalizeDocumentAudience(visibility);
  const unitIds = normalizeUnitIds(
    formData.getAll('unit_ids').flatMap((value) => String(value).split(',')),
  );
  const workspaceId = (formData.get('workspace_id') as string | null)?.trim() || null;

  if (!file || !title || !category || !workspaceId) {
    return { success: false, error: 'Kötelező mezők: lakóközösség, fájl, cím, kategória' };
  }

  const audienceError = validateAudienceTargeting(audience, unitIds);
  if (audienceError || !audience) {
    return { success: false, error: audienceError ?? 'Érvénytelen célközönség.' };
  }

  if (!ALLOWED_MIME_TYPES.includes(file.type)) {
    return { success: false, error: 'Nem engedélyezett fájltípus. Csak PDF, JPG, PNG, DOC, DOCX, XLS, XLSX.' };
  }

  if (file.size > MAX_FILE_SIZE) {
    return { success: false, error: 'A fájl mérete nem haladhatja meg a 10 MB-ot.' };
  }

  try {
    const [{ supabase }, context] = await Promise.all([
      requireAuthenticatedUser(),
      requireWorkspaceCapability(workspaceId, 'document.publish'),
    ]);
    const documentId = crypto.randomUUID();
    const safeName = file.name.replace(/[^a-zA-Z0-9._-]/g, '_').replace(/__+/g, '_');
    const safeVersion = version.replace(/[^a-zA-Z0-9._-]/g, '_');
    const storagePath = `workspace/${workspaceId}/documents/${documentId}/versions/${safeVersion}/${Date.now()}_${safeName}`;

    const { error: reservationError } = await supabase.from('documents').insert({
      id: documentId,
      workspace_id: context.workspaceId,
      title,
      category,
      file_url: storagePath,
      version,
      visibility: audience,
      building_id: context.primaryBuildingId,
    });
    if (reservationError) return { success: false, error: `Adatbázis hiba: ${reservationError.message}` };

    const targetError = await replaceDocumentUnits(supabase, documentId, audience, unitIds);
    if (targetError) {
      await supabase.from('documents').delete().eq('id', documentId).eq('building_id', context.primaryBuildingId);
      return { success: false, error: 'A dokumentum célzása sikertelen.' };
    }

    const bytes = await file.arrayBuffer();
    const { error: uploadError } = await supabase.storage
      .from(STORAGE_BUCKET)
      .upload(storagePath, bytes, { contentType: file.type, upsert: false });

    if (uploadError) {
      await supabase.from('documents').delete().eq('id', documentId).eq('building_id', context.primaryBuildingId);
      return { success: false, error: `Feltöltési hiba: ${uploadError.message}` };
    }

    revalidatePath(`/w/${workspaceId}`);
    return { success: true };
  } catch (error) {
    return { success: false, error: authorizationMessage(error) };
  }
}

export interface UpdateDocumentInput {
  title?: string;
  category?: string;
  version?: string;
  visibility?: string;
  unit_ids?: string[];
}

export async function deleteDocument(documentId: string, buildingId?: string) {
  if (!buildingId) return { success: false, error: 'Lakóközösség megadása kötelező.' };
  try {
    const [{ supabase }, context] = await Promise.all([
      requireAuthenticatedUser(),
      requireWorkspaceCapability(buildingId, 'document.publish'),
    ]);
    const { data: doc } = await supabase
      .from('documents')
      .select('file_url, building_id')
      .eq('id', documentId)
      .eq('building_id', context.primaryBuildingId)
      .maybeSingle();
    if (!doc) return { success: false, error: 'A művelet nem engedélyezett.' };
    if (doc.file_url && !doc.file_url.startsWith('http')) {
      const { error: storageError } = await supabase.storage.from(STORAGE_BUCKET).remove([doc.file_url]);
      if (storageError) return { success: false, error: storageError.message };
    }
    const { error } = await supabase
      .from('documents')
      .delete()
      .eq('id', documentId)
      .eq('building_id', context.primaryBuildingId);
    if (error) return { success: false, error: error.message };
    revalidatePath(`/w/${buildingId}`);
    return { success: true };
  } catch (error) {
    return { success: false, error: authorizationMessage(error) };
  }
}

export async function updateDocument(documentId: string, updates: UpdateDocumentInput, buildingId?: string) {
  if (!buildingId) return { success: false, error: 'Lakóközösség megadása kötelező.' };

  const patch: Record<string, string> = {};
  if (updates.title) patch.title = updates.title;
  if (updates.category) patch.category = updates.category;
  if (updates.version) patch.version = updates.version;
  const audience = updates.visibility ? normalizeDocumentAudience(updates.visibility) : null;
  const unitIds = normalizeUnitIds(updates.unit_ids);
  if (updates.visibility) {
    const audienceError = validateAudienceTargeting(audience, unitIds);
    if (audienceError || !audience) {
      return { success: false, error: audienceError ?? 'Érvénytelen célközönség.' };
    }
  }

  try {
    const [{ supabase }, context] = await Promise.all([
      requireAuthenticatedUser(),
      requireWorkspaceCapability(buildingId, 'document.publish'),
    ]);
    const { data: original } = await supabase
      .from('documents')
      .select('title, category, version, visibility')
      .eq('id', documentId)
      .eq('building_id', context.primaryBuildingId)
      .maybeSingle();
    if (!original) return { success: false, error: 'A művelet nem engedélyezett.' };

    if (Object.keys(patch).length > 0) {
      const { error } = await supabase
        .from('documents')
        .update(patch)
        .eq('id', documentId)
        .eq('building_id', context.primaryBuildingId);
      if (error) return { success: false, error: 'A dokumentum adatait most nem sikerült módosítani.' };
    }

    if (audience) {
      const { error: targetError } = await supabase.rpc('replace_document_audience', {
        p_workspace_id: context.workspaceId,
        p_document_id: documentId,
        p_audience: audience,
        p_unit_ids: unitIds,
        p_idempotency_key: crypto.randomUUID(),
      });
      if (targetError) {
        const rollbackPatch: Record<string, string> = {};
        if (updates.title) rollbackPatch.title = original.title;
        if (updates.category) rollbackPatch.category = original.category;
        if (updates.version) rollbackPatch.version = original.version;
        if (Object.keys(rollbackPatch).length > 0) {
          await supabase
            .from('documents')
            .update(rollbackPatch)
            .eq('id', documentId)
            .eq('building_id', context.primaryBuildingId);
        }
        return { success: false, error: 'A dokumentum célzása sikertelen.' };
      }
    }
    revalidatePath(`/w/${buildingId}`);
    return { success: true };
  } catch (error) {
    return { success: false, error: authorizationMessage(error) };
  }
}

export async function getDocumentSignedUrl(documentId: string, filePath: string, buildingId?: string) {
  if (!buildingId) return { success: false, error: 'Lakóközösség megadása kötelező.', url: null };
  let supabase: ReturnType<typeof createClient>;
  try {
    const auth = await requireAuthenticatedUser();
    const context = await requireWorkspaceAccess(buildingId);
    supabase = auth.supabase;
    const { data: document } = await supabase
      .from('documents')
      .select('file_url, building_id')
      .eq('id', documentId)
      .eq('building_id', context.primaryBuildingId)
      .maybeSingle();
    if (!document || document.file_url !== filePath) {
      return { success: false, error: 'A művelet nem engedélyezett.', url: null };
    }
  } catch (error) {
    return { success: false, error: authorizationMessage(error), url: null };
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
