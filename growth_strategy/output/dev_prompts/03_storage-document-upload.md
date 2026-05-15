# Dev Prompt #3: Supabase Storage Document Upload
## Initiative: "Supabase Storage Document Upload (Feature Completeness Gate)"
## Estimated Value: +€280k–€620k ARR unlock
## Priority: P0 — Feature Completeness Gate (blocks paid conversions)

---

## 1. BUSINESS CASE

### 1.1 Why Document Management Is the #1 Feature Gate for PanelLakó

Document management is not a nice-to-have feature in Hungarian residential building management — it is a legal obligation under Act CXXXIII of 2003 on Condominium Buildings (Társasházi törvény). Every közös képviselő (building representative) and megbízott (property manager) must store, distribute, and obtain read-receipts for a defined set of documents: the house rules (SZMSZ), annual budgets, audit reports, meeting minutes, fire safety certificates, insurance policies, and energy performance certificates. Failure to maintain traceable document acknowledgement from owners is an administrative violation and can expose the közös képviselő to personal liability in disputes. This is not an edge-case legal risk — it is the central day-to-day workflow of every property manager in Hungary.

The competitive implication is direct: property management software that cannot handle secure file storage and provable read-receipts cannot be sold to professional managing agencies (megbízott companies), which represent the highest-value customer segment. These agencies manage between 5 and 50 buildings each. A single megbízott agency paying the PanelLakó Pro tier (€3.00/unit/month) for a 30-building portfolio of 60-unit buildings represents €5,400/month or €64,800/year of ARR. Without functional document upload and acknowledged delivery, this segment will not convert beyond a free trial. The €280k–€620k ARR delta in the growth model represents the gap between a competitor-parity product and the current incomplete state.

### 1.2 What Currently Exists in the UI

The current `components/dashboard-client.tsx` already renders a full Dokumentumtár (Document Archive) section (around line 834) with:
- A category filter dropdown populated dynamically from `data.documents`
- Per-document cards showing title, category, version, upload date, visibility, and acknowledgement status
- An "Elolvasva" (Read/Acknowledged) button that calls `acknowledgeDocumentAction(item.id)` — this works via the existing `acknowledgeDocument` Server Action which correctly upserts into `document_acknowledgements`
- A static "Megnyitás" (Open) button that does nothing (no href, no signed URL)
- Acknowledgement state tracked via `item.acknowledged_at` (a property sourced from `DocumentItem` in `lib/types.ts`)

The UI looks complete to a demo observer. A product manager presenting a demo can click "Elolvasva" and see the green check appear. This creates a dangerous illusion of completeness.

### 1.3 What Is Missing (The Gap)

The gap is at every layer below the UI:

**File storage**: The `createDocument` Server Action in `app/actions/documents.ts` accepts a `file_url: string` as a plain text input. There is no mechanism in the codebase to actually upload a binary file to any storage service. In the current state, a manager would need to manually upload a PDF to an external service, copy the public URL, and paste it into a hypothetical admin form. No such admin form exists in the UI either. Documents in the demo are entirely mock data from `lib/mock-data.ts`.

**Upload form**: There is no `<input type="file" />` anywhere in `dashboard-client.tsx` or any other component. There is no progress indicator, no file type validation on the client, and no success/error feedback for document creation.

**Signed URL delivery**: The "Megnyitás" button has no `href` and no `onClick`. If a real `file_url` were stored, it would need to be a Supabase Storage signed URL (for private buckets) that expires. The client has no mechanism to request or refresh signed URLs.

**RLS gap**: The `supabase/schema.sql` defines INSERT policies for `tickets`, `meter_readings`, `announcements`, `notifications`, and `audit_logs` — but NOT for `documents` or `document_acknowledgements`. Any attempt to call `createDocument` or `acknowledgeDocument` against a real Supabase project will fail with an RLS policy violation. The acknowledge flow appears to work in the demo only because `hasSupabaseConfig` is likely false and the code falls back to mock data.

**Building scoping**: `getDashboardData()` in `lib/data.ts` queries `documents` without a `building_id` filter. In a multi-tenant environment with multiple buildings in the database, every user would see every building's documents.

### 1.4 Revenue Impact of Completing This Feature

Completing this feature gate unlocks three conversion vectors: (1) professional megbízott agencies who require document compliance tooling as a procurement criterion; (2) building committees (bizottság) who need to verify that specific resolutions and financial reports have been acknowledged by all owners; (3) direct municipal procurement where provable document delivery is contractually required. Based on the growth model, capturing just 3% of the addressable Hungarian market (approximately 46,000 organized residential buildings) at Pro tier pricing yields €249k/month. Document management completeness is the primary barrier cited in sales discovery conversations.

---

## 2. CURRENT STATE ANALYSIS

### 2.1 Existing `createDocument` Server Action

File: `app/actions/documents.ts`

```typescript
'use server';

import { revalidatePath } from 'next/cache';
import { createClient } from '@/lib/supabase/server';

export interface CreateDocumentInput {
  title: string;
  category: string;
  file_url: string;       // ← must be pre-computed URL; no actual upload happens here
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
      file_url: input.file_url,   // ← stored as-is, no validation
      version: input.version ?? '1.0',
      visibility: input.visibility ?? 'Mindenki',
      building_id: input.building_id ?? null
    })
    .select()
    .single();

  if (error) {
    return { success: false, error: error.message };
  }

  revalidatePath('/');
  return { success: true, data };
}
```

**Critical gap**: `file_url` is a free-text string. There is no file upload, no storage reference, no path construction, and no signed URL generation.

### 2.2 Existing `acknowledgeDocument` Server Action

```typescript
export async function acknowledgeDocument(documentId: string) {
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

  revalidatePath('/');
  return { success: true };
}
```

This action is correctly written but will fail with `new row violates row-level security policy` because no INSERT policy exists on `document_acknowledgements`. **This is a silent failure in the current demo because mock data bypasses Supabase entirely.**

### 2.3 Current Document Section in `dashboard-client.tsx` (lines 834–860)

```tsx
<SectionCard id="documents" title="Dokumentumtár" icon={<FileText size={18} />}
  action={
    <select value={documentFilter} onChange={(e) => setDocumentFilter(e.target.value)}
      className="rounded-2xl border border-slate-200 px-3 py-2 text-sm font-semibold">
      {documentCategories.map((category) => (
        <option key={category} value={category}>{category}</option>
      ))}
    </select>
  }
>
  <div className="space-y-3">
    {visibleDocuments.map((item) => (
      <article key={item.id} className="rounded-3xl border border-slate-100 bg-white p-4 shadow-sm">
        <div className="flex items-start justify-between gap-2">
          <div>
            <p className="font-black text-slate-950">{item.title}</p>
            <p className="mt-1 text-xs font-medium text-slate-500">
              {item.category} · {item.version} · {formatDate(item.uploaded_at)} · {item.visibility || 'Mindenki'}
            </p>
          </div>
          {item.acknowledged_at
            ? <CheckCircle2 className="text-emerald-500" size={18} />
            : <AlertTriangle className="text-amber-500" size={18} />
          }
        </div>
        <div className="mt-3 flex gap-2">
          <button className="rounded-xl bg-slate-950 px-3 py-2 text-xs font-black text-white" type="button">
            Megnyitás  {/* ← no href, no handler, non-functional */}
          </button>
          {!item.acknowledged_at && (
            <button
              className="rounded-xl bg-emerald-600 px-3 py-2 text-xs font-black text-white hover:bg-emerald-700"
              type="button"
              onClick={() => acknowledgeDocumentAction(item.id)}
            >
              Elolvasva
            </button>
          )}
        </div>
      </article>
    ))}
  </div>
</SectionCard>
```

**Missing**: upload form (manager-only), download/open with signed URL, upload state management.

### 2.4 Current `getDashboardData()` Document Query (lib/data.ts, line 49)

```typescript
supabase.from('documents').select('*').order('uploaded_at', { ascending: false }).limit(10),
```

**Gaps**: No `building_id` filter. No join to `document_acknowledgements` to get `viewed_at` for the current user. The `acknowledged_at` field in `DocumentItem` will always be null from Supabase because the query doesn't join acknowledgements.

---

## 3. PRE-CONDITIONS

Before writing any code, verify these conditions:

1. **Supabase project is provisioned**: `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_ANON_KEY` are set in `.env.local`. `SUPABASE_SERVICE_ROLE_KEY` must also be set for server-side Storage operations that bypass RLS.

2. **Storage is enabled**: In the Supabase dashboard → Storage, the Storage service must be active. On the free tier it is enabled by default. On self-hosted instances, verify the `storage` service is running.

3. **`buildings` table has data**: The document upload form requires a `building_id`. At minimum one building record must exist. Seed with: `INSERT INTO buildings (name, address) VALUES ('Teszt ház', 'Budapest, Fő utca 1.');`

4. **User has a `profiles` row**: The `acknowledgeDocument` action references `profile_id` → `profiles(id)`. Supabase Auth users must have a corresponding `profiles` row. If using Supabase Auth triggers this is automatic; otherwise seed manually.

5. **Environment variables for Storage**: No additional env vars are needed beyond the standard Supabase vars for Storage operations. The service role key is used only in server-side Server Actions, never exposed to the client.

6. **Next.js version is 14 with App Router**: Confirmed from `next.config.mjs`. Server Actions and `FormData` handling require Next.js 13.4+ with `experimental: { serverActions: true }` or Next.js 14 where it is stable by default.

---

## 4. PHASE 1: DATABASE CHANGES

Apply these SQL statements in the Supabase SQL Editor (or as a migration file at `supabase/migrations/20260515001_document_rls.sql`).

### 4.1 INSERT Policy on `documents` (manager roles only)

```sql
-- Allow közös képviselő and megbízott to insert documents
-- These are the two roles that manage buildings professionally
drop policy if exists "Manager insert documents" on documents;
create policy "Manager insert documents" on documents
  for insert
  with check (
    exists (
      select 1 from profiles
      where profiles.id = auth.uid()
        and profiles.role in ('kozos_kepviselo', 'megbizott')
    )
  );
```

**Rationale**: Only professional managers should be able to upload documents to the building archive. Lakó (tenant), tulajdonos (owner), bizottsag (committee member), and konyvelo (accountant) roles should not be able to add documents to the shared archive — they are consumers, not producers. This mirrors Hungarian condo law where only the képviselő or their agent controls official building communications.

### 4.2 INSERT Policy on `document_acknowledgements` (all authenticated users)

```sql
-- Allow any authenticated user to acknowledge (mark as read) a document
-- Users can only create acknowledgements for themselves (profile_id = auth.uid())
drop policy if exists "Authenticated insert document acknowledgements" on document_acknowledgements;
create policy "Authenticated insert document acknowledgements" on document_acknowledgements
  for insert
  with check (
    auth.uid() is not null
    and profile_id = auth.uid()
  );
```

**Rationale**: Any authenticated user (resident, owner, manager, accountant) should be able to mark a document as read. The `profile_id = auth.uid()` check prevents a user from creating acknowledgements on behalf of others (audit fraud prevention).

### 4.3 UPDATE Policy on `document_acknowledgements` (for upsert)

The `acknowledgeDocument` Server Action uses `.upsert()` with `onConflict: 'document_id,profile_id'`. Supabase's upsert performs an INSERT and, on conflict, an UPDATE. Without an UPDATE policy, the upsert will fail on the second call with an RLS violation even if INSERT succeeds on the first call.

```sql
-- Allow users to update their own acknowledgement record (upsert support)
-- This only allows updating viewed_at, not document_id or profile_id
drop policy if exists "Self update document acknowledgements" on document_acknowledgements;
create policy "Self update document acknowledgements" on document_acknowledgements
  for update
  using (profile_id = auth.uid())
  with check (profile_id = auth.uid());
```

### 4.4 UPDATE Policy on `documents` (managers only, for version updates)

```sql
-- Allow managers to update document records (e.g., bump version, change visibility)
drop policy if exists "Manager update documents" on documents;
create policy "Manager update documents" on documents
  for update
  using (
    exists (
      select 1 from profiles
      where profiles.id = auth.uid()
        and profiles.role in ('kozos_kepviselo', 'megbizott')
    )
  )
  with check (
    exists (
      select 1 from profiles
      where profiles.id = auth.uid()
        and profiles.role in ('kozos_kepviselo', 'megbizott')
    )
  );
```

### 4.5 ALTER `documents` Table: Add `uploaded_by` Column

Track who uploaded which document for the audit log and for display in the UI.

```sql
alter table documents add column if not exists uploaded_by uuid references profiles(id) on delete set null;
```

### 4.6 Schema Discrepancy Fix

The `supabase/schema.sql` shows `documents` table has an `acknowledged_at timestamptz` column directly on the `documents` row. This is a denormalized shortcut that conflicts with the separate `document_acknowledgements` table. The acknowledgement state is per-user per-document, so `acknowledged_at` on the `documents` row is meaningless in a multi-user context. However, do NOT drop this column now as it may be referenced elsewhere. Instead, treat it as legacy and rely on `document_acknowledgements` for all new acknowledgement logic. Add a comment:

```sql
comment on column documents.acknowledged_at is 'DEPRECATED: per-document timestamp, not per-user. Use document_acknowledgements.viewed_at instead.';
```

---

## 5. PHASE 2: SUPABASE STORAGE SETUP

### 5.1 Create the Storage Bucket

In the Supabase dashboard → Storage → New bucket:
- **Bucket name**: `documents`
- **Public bucket**: NO (private) — this is the critical choice
- **File size limit**: 50 MB (suitable for PDFs, scanned documents, spreadsheets)
- **Allowed MIME types**: `application/pdf,image/jpeg,image/png,application/vnd.openxmlformats-officedocument.wordprocessingml.document,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet`

**Why private?** Building documents often contain sensitive information: financial statements with individual balances, legal notices with owner names and addresses, insurance documents with policy numbers. A public bucket would mean anyone with the URL (which can be guessed or extracted from the DOM) could access any document without authentication. Private buckets with signed URLs expire after a configurable duration (default 1 hour), meaning a leaked URL becomes useless quickly.

Alternatively, create via SQL migration:

```sql
-- Note: Supabase Storage bucket creation via SQL uses the storage schema
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'documents',
  'documents',
  false,   -- private bucket
  52428800, -- 50 MB in bytes
  array[
    'application/pdf',
    'image/jpeg',
    'image/png',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
  ]
)
on conflict (id) do nothing;
```

### 5.2 Storage RLS Policies

```sql
-- Allow managers to upload (INSERT) to the documents bucket
-- Path convention: {building_id}/{document_id}/{filename}
drop policy if exists "Manager upload documents" on storage.objects;
create policy "Manager upload documents" on storage.objects
  for insert
  to authenticated
  with check (
    bucket_id = 'documents'
    and exists (
      select 1 from profiles
      where profiles.id = auth.uid()
        and profiles.role in ('kozos_kepviselo', 'megbizott')
    )
  );

-- Allow any authenticated user to read (SELECT) objects in documents bucket
-- Signed URL generation requires SELECT permission on storage.objects
drop policy if exists "Authenticated read documents" on storage.objects;
create policy "Authenticated read documents" on storage.objects
  for select
  to authenticated
  using (bucket_id = 'documents');

-- Allow managers to delete their own uploads (for document replacement workflow)
drop policy if exists "Manager delete documents" on storage.objects;
create policy "Manager delete documents" on storage.objects
  for delete
  to authenticated
  using (
    bucket_id = 'documents'
    and exists (
      select 1 from profiles
      where profiles.id = auth.uid()
        and profiles.role in ('kozos_kepviselo', 'megbizott')
    )
  );
```

### 5.3 Storage Path Convention

Use the following path structure for all uploaded files:
```
documents/{building_id}/{year}/{category_slug}/{document_id}_{filename_sanitized}
```

Example: `documents/a1b2c3d4-uuid/2026/szmsz/e5f6g7h8-uuid_hazirend_v2.pdf`

This convention allows:
- Building-scoped queries via path prefix
- Year-based archival browsing
- Category-based organization matching the `category` field in the `documents` table
- UUID prefix on filename prevents collisions when the same filename is uploaded multiple times

---

## 6. PHASE 3: SERVER ACTION FOR FILE UPLOAD

Create a new Server Action `uploadDocument` that handles the full lifecycle: receive FormData, upload binary to Storage, insert metadata record, return result.

File: `app/actions/documents.ts` — replace entirely with the following:

```typescript
'use server';

import { revalidatePath } from 'next/cache';
import { createClient } from '@/lib/supabase/server';
import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';

// Re-export existing types
export interface CreateDocumentInput {
  title: string;
  category: string;
  file_url: string;
  version?: string;
  visibility?: string;
  building_id?: string;
}

// --- acknowledgeDocument (unchanged logic, now with correct error messaging) ---

export async function acknowledgeDocument(documentId: string) {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return { success: false, error: 'Nem vagy bejelentkezve' };
  }

  const { error } = await supabase
    .from('document_acknowledgements')
    .upsert(
      {
        document_id: documentId,
        profile_id: user.id,
        viewed_at: new Date().toISOString()
      },
      { onConflict: 'document_id,profile_id' }
    );

  if (error) {
    console.error('[acknowledgeDocument] Supabase error:', error);
    return { success: false, error: error.message };
  }

  revalidatePath('/');
  return { success: true };
}

// --- createDocument (metadata only, for programmatic use) ---

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
      uploaded_by: user.id
    })
    .select()
    .single();

  if (error) {
    return { success: false, error: error.message };
  }

  revalidatePath('/');
  return { success: true, data };
}

// --- uploadDocument: the new full-cycle upload action ---

export interface UploadDocumentResult {
  success: boolean;
  error?: string;
  documentId?: string;
  signedUrl?: string;
}

export async function uploadDocument(formData: FormData): Promise<UploadDocumentResult> {
  // 1. Authenticate
  const supabase = createClient();
  const { data: { user }, error: authError } = await supabase.auth.getUser();

  if (authError || !user) {
    return { success: false, error: 'Nem vagy bejelentkezve' };
  }

  // 2. Check role authorization
  const { data: profile, error: profileError } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .single();

  if (profileError || !profile) {
    return { success: false, error: 'Felhasználói profil nem található' };
  }

  if (!['kozos_kepviselo', 'megbizott'].includes(profile.role)) {
    return { success: false, error: 'Nincs jogosultságod dokumentumot feltölteni' };
  }

  // 3. Extract form fields
  const file = formData.get('file') as File | null;
  const title = (formData.get('title') as string)?.trim();
  const category = (formData.get('category') as string)?.trim();
  const version = (formData.get('version') as string)?.trim() || '1.0';
  const visibility = (formData.get('visibility') as string)?.trim() || 'Mindenki';
  const buildingId = (formData.get('building_id') as string)?.trim();

  // 4. Validate inputs
  if (!file || file.size === 0) {
    return { success: false, error: 'Nincs fájl kiválasztva' };
  }
  if (!title) {
    return { success: false, error: 'Dokumentum neve kötelező' };
  }
  if (!category) {
    return { success: false, error: 'Kategória kötelező' };
  }
  if (!buildingId) {
    return { success: false, error: 'Az épület azonosítója hiányzik' };
  }

  // 5. File size validation (50 MB max)
  const MAX_FILE_SIZE = 50 * 1024 * 1024; // 50 MB
  if (file.size > MAX_FILE_SIZE) {
    return { success: false, error: `A fájl mérete meghaladja az 50 MB-os korlátot (${(file.size / 1024 / 1024).toFixed(1)} MB)` };
  }

  // 6. MIME type validation
  const ALLOWED_MIME_TYPES = [
    'application/pdf',
    'image/jpeg',
    'image/png',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
  ];
  if (!ALLOWED_MIME_TYPES.includes(file.type)) {
    return { success: false, error: `Nem támogatott fájlformátum: ${file.type}. Elfogadott: PDF, JPG, PNG, DOCX, XLSX` };
  }

  // 7. Construct storage path
  const year = new Date().getFullYear();
  const categorySlug = category.toLowerCase().replace(/[^a-z0-9]/g, '_').slice(0, 30);
  const sanitizedFilename = file.name.replace(/[^a-zA-Z0-9._-]/g, '_').slice(0, 100);
  // We use a temporary placeholder document ID for the path; we'll use crypto.randomUUID
  const tempId = crypto.randomUUID();
  const storagePath = `${buildingId}/${year}/${categorySlug}/${tempId}_${sanitizedFilename}`;

  // 8. Convert File to ArrayBuffer for upload
  const fileBuffer = await file.arrayBuffer();

  // 9. Upload to Supabase Storage
  const { data: uploadData, error: uploadError } = await supabase.storage
    .from('documents')
    .upload(storagePath, fileBuffer, {
      contentType: file.type,
      cacheControl: '3600',
      upsert: false // never silently overwrite; the tempId ensures uniqueness
    });

  if (uploadError) {
    console.error('[uploadDocument] Storage upload error:', uploadError);

    // Interpret common Supabase Storage error codes
    if (uploadError.message.includes('Bucket not found')) {
      return { success: false, error: 'A tárolóbucket nem található. Kérjük, ellenőrizze a Supabase Storage konfigurációt.' };
    }
    if (uploadError.message.includes('exceeded')) {
      return { success: false, error: 'Tárolóhely megtelt. Kérjük, töröljön régi dokumentumokat.' };
    }
    return { success: false, error: `Fájlfeltöltési hiba: ${uploadError.message}` };
  }

  // 10. Insert document metadata record
  const storageFullPath = uploadData.path; // relative path within bucket
  const { data: docRecord, error: insertError } = await supabase
    .from('documents')
    .insert({
      title,
      category,
      version,
      visibility,
      building_id: buildingId,
      file_url: storageFullPath,  // store storage path, not a URL
      uploaded_by: user.id
    })
    .select('id')
    .single();

  if (insertError) {
    console.error('[uploadDocument] Document insert error:', insertError);
    // Attempt to clean up the uploaded file to avoid orphaned storage objects
    await supabase.storage.from('documents').remove([storageFullPath]);
    return { success: false, error: `Adatbázis hiba: ${insertError.message}` };
  }

  // 11. Generate a signed URL for immediate display (1 hour expiry)
  const { data: signedUrlData, error: signedUrlError } = await supabase.storage
    .from('documents')
    .createSignedUrl(storageFullPath, 3600); // 3600 seconds = 1 hour

  if (signedUrlError) {
    // Non-fatal: the document was saved, we just can't show a preview URL
    console.warn('[uploadDocument] Signed URL generation failed:', signedUrlError);
  }

  // 12. Write audit log
  await supabase.from('audit_logs').insert({
    actor_id: user.id,
    actor_name: user.email ?? 'Ismeretlen',
    action_type: 'document_upload',
    entity_type: 'document',
    entity_id: docRecord.id,
    entity_label: title
  });

  revalidatePath('/');

  return {
    success: true,
    documentId: docRecord.id,
    signedUrl: signedUrlData?.signedUrl
  };
}
```

---

## 7. PHASE 4: SERVER ACTION FOR SIGNED URL GENERATION

When a user clicks "Megnyitás", the client needs a fresh signed URL because the one generated at upload time may have expired. Add this action to `app/actions/documents.ts`:

```typescript
// --- getDocumentSignedUrl: generate a fresh signed URL for a document ---

export interface GetSignedUrlResult {
  success: boolean;
  error?: string;
  signedUrl?: string;
  expiresIn?: number;
}

export async function getDocumentSignedUrl(documentId: string): Promise<GetSignedUrlResult> {
  const supabase = createClient();
  const { data: { user }, error: authError } = await supabase.auth.getUser();

  if (authError || !user) {
    return { success: false, error: 'Nem vagy bejelentkezve' };
  }

  // Fetch the document record to get the storage path and building_id
  const { data: doc, error: docError } = await supabase
    .from('documents')
    .select('id, file_url, building_id, visibility')
    .eq('id', documentId)
    .single();

  if (docError || !doc) {
    return { success: false, error: 'Dokumentum nem található' };
  }

  // Verify the user belongs to the building (memberships check)
  // For the MVP phase, we rely on the documents.visibility field and open SELECT RLS
  // In a future hardened version, add a memberships check here:
  // const { data: membership } = await supabase
  //   .from('memberships')
  //   .select('id')
  //   .eq('profile_id', user.id)
  //   .eq('building_id', doc.building_id)
  //   .eq('active', true)
  //   .single();
  // if (!membership) return { success: false, error: 'Nincs hozzáférésed ehhez az épülethez' };

  // Generate signed URL with 1-hour expiry
  const SIGNED_URL_EXPIRY_SECONDS = 3600;
  const { data: signedUrlData, error: signedUrlError } = await supabase.storage
    .from('documents')
    .createSignedUrl(doc.file_url, SIGNED_URL_EXPIRY_SECONDS);

  if (signedUrlError) {
    console.error('[getDocumentSignedUrl] Error:', signedUrlError);
    return { success: false, error: `Aláírt URL generálás sikertelen: ${signedUrlError.message}` };
  }

  return {
    success: true,
    signedUrl: signedUrlData.signedUrl,
    expiresIn: SIGNED_URL_EXPIRY_SECONDS
  };
}
```

---

## 8. PHASE 5: CLIENT-SIDE UPLOAD FORM COMPONENT

Modify `components/dashboard-client.tsx` to add:
1. Import the new Server Actions
2. Upload state management
3. Upload form (manager-only, guarded by `isManager`)
4. Download button with signed URL fetching

### 8.1 Add Imports and State (at the top of the component file)

Add to the existing imports block:

```typescript
import {
  acknowledgeDocument as acknowledgeDocumentAction,
  uploadDocument as uploadDocumentAction,
  getDocumentSignedUrl as getDocumentSignedUrlAction
} from '@/app/actions/documents';
```

### 8.2 Add State Variables (inside the `DashboardClient` component function)

After the existing state declarations, add:

```typescript
// Document upload state
const [docUploadOpen, setDocUploadOpen] = useState(false);
const [docUploadFile, setDocUploadFile] = useState<File | null>(null);
const [docUploadTitle, setDocUploadTitle] = useState('');
const [docUploadCategory, setDocUploadCategory] = useState('SZMSZ');
const [docUploadVersion, setDocUploadVersion] = useState('1.0');
const [docUploadVisibility, setDocUploadVisibility] = useState('Mindenki');
const [docUploadLoading, setDocUploadLoading] = useState(false);
const [docUploadError, setDocUploadError] = useState<string | null>(null);
const [docUploadSuccess, setDocUploadSuccess] = useState(false);
const [docUploadProgress, setDocUploadProgress] = useState(0);

// Document open/download state
const [docSignedUrls, setDocSignedUrls] = useState<Record<string, string>>({});
const [docSignedUrlLoading, setDocSignedUrlLoading] = useState<Record<string, boolean>>({});

// Role guard
const isManager = ['kozos_kepviselo', 'megbizott'].includes(data.currentUser.role);
```

### 8.3 Add Event Handlers

```typescript
const handleDocumentUpload = async (e: FormEvent<HTMLFormElement>) => {
  e.preventDefault();
  if (!docUploadFile) {
    setDocUploadError('Kérjük válasszon ki egy fájlt');
    return;
  }

  setDocUploadLoading(true);
  setDocUploadError(null);
  setDocUploadProgress(20);

  const formData = new FormData();
  formData.append('file', docUploadFile);
  formData.append('title', docUploadTitle);
  formData.append('category', docUploadCategory);
  formData.append('version', docUploadVersion);
  formData.append('visibility', docUploadVisibility);
  // TODO: replace with actual building_id from context
  // For the initial implementation, use a placeholder or derive from URL params
  formData.append('building_id', 'REPLACE_WITH_ACTUAL_BUILDING_ID');

  setDocUploadProgress(50);

  const result = await uploadDocumentAction(formData);

  setDocUploadProgress(100);
  setDocUploadLoading(false);

  if (result.success) {
    setDocUploadSuccess(true);
    setDocUploadTitle('');
    setDocUploadCategory('SZMSZ');
    setDocUploadVersion('1.0');
    setDocUploadFile(null);
    // Store the signed URL for immediate display
    if (result.signedUrl && result.documentId) {
      setDocSignedUrls((prev) => ({ ...prev, [result.documentId!]: result.signedUrl! }));
    }
    setTimeout(() => {
      setDocUploadOpen(false);
      setDocUploadSuccess(false);
      setDocUploadProgress(0);
    }, 2000);
  } else {
    setDocUploadError(result.error ?? 'Ismeretlen hiba');
    setDocUploadProgress(0);
  }
};

const handleDocumentOpen = async (documentId: string, existingUrl: string) => {
  // If we already have a cached signed URL, open it directly
  if (docSignedUrls[documentId]) {
    window.open(docSignedUrls[documentId], '_blank', 'noopener,noreferrer');
    return;
  }

  // If the file_url looks like a full URL (legacy mock data), open directly
  if (existingUrl.startsWith('http')) {
    window.open(existingUrl, '_blank', 'noopener,noreferrer');
    return;
  }

  // Otherwise fetch a fresh signed URL from Supabase Storage
  setDocSignedUrlLoading((prev) => ({ ...prev, [documentId]: true }));
  const result = await getDocumentSignedUrlAction(documentId);
  setDocSignedUrlLoading((prev) => ({ ...prev, [documentId]: false }));

  if (result.success && result.signedUrl) {
    setDocSignedUrls((prev) => ({ ...prev, [documentId]: result.signedUrl! }));
    window.open(result.signedUrl, '_blank', 'noopener,noreferrer');
  } else {
    alert(`Nem sikerült megnyitni a dokumentumot: ${result.error}`);
  }
};
```

### 8.4 Replace the Dokumentumtár SectionCard JSX

Replace lines 834–860 in `dashboard-client.tsx` with:

```tsx
<SectionCard
  id="documents"
  title="Dokumentumtár"
  icon={<FileText size={18} />}
  action={
    <div className="flex items-center gap-2">
      <select
        value={documentFilter}
        onChange={(e) => setDocumentFilter(e.target.value)}
        className="rounded-2xl border border-slate-200 px-3 py-2 text-sm font-semibold"
      >
        {documentCategories.map((category) => (
          <option key={category} value={category}>{category}</option>
        ))}
      </select>
      {isManager && (
        <button
          type="button"
          onClick={() => setDocUploadOpen(true)}
          className="flex items-center gap-1.5 rounded-2xl bg-brand-500 px-3 py-2 text-xs font-black text-white hover:bg-brand-600 transition-colors"
        >
          <span>+ Feltöltés</span>
        </button>
      )}
    </div>
  }
>
  {/* Upload Form (manager only, shown when docUploadOpen) */}
  {isManager && docUploadOpen && (
    <div className="mb-4 rounded-3xl border border-brand-200 bg-brand-50 p-4">
      <div className="mb-3 flex items-center justify-between">
        <p className="text-sm font-black text-brand-900">Új dokumentum feltöltése</p>
        <button
          type="button"
          onClick={() => { setDocUploadOpen(false); setDocUploadError(null); setDocUploadProgress(0); }}
          className="rounded-xl p-1.5 hover:bg-brand-100"
        >
          <X size={14} className="text-brand-700" />
        </button>
      </div>

      {docUploadSuccess ? (
        <div className="flex items-center gap-2 rounded-2xl bg-emerald-50 p-3 text-sm font-semibold text-emerald-700">
          <CheckCircle2 size={16} />
          <span>Dokumentum sikeresen feltöltve!</span>
        </div>
      ) : (
        <form onSubmit={handleDocumentUpload} className="space-y-3">
          {/* File input */}
          <div>
            <label className="mb-1 block text-xs font-bold text-brand-800">
              Fájl (PDF, DOCX, XLSX, JPG, PNG — max 50 MB) *
            </label>
            <input
              type="file"
              accept=".pdf,.docx,.xlsx,.jpg,.jpeg,.png"
              required
              onChange={(e) => setDocUploadFile(e.target.files?.[0] ?? null)}
              className="block w-full rounded-2xl border border-brand-200 bg-white px-3 py-2 text-sm text-slate-700 file:mr-3 file:rounded-xl file:border-0 file:bg-brand-500 file:px-3 file:py-1 file:text-xs file:font-black file:text-white"
            />
            {docUploadFile && (
              <p className="mt-1 text-xs text-brand-700">
                Kiválasztva: {docUploadFile.name} ({(docUploadFile.size / 1024 / 1024).toFixed(2)} MB)
              </p>
            )}
          </div>

          {/* Title */}
          <div>
            <label className="mb-1 block text-xs font-bold text-brand-800">Dokumentum neve *</label>
            <input
              type="text"
              required
              value={docUploadTitle}
              onChange={(e) => setDocUploadTitle(e.target.value)}
              placeholder="pl. Házirend 2026"
              className="w-full rounded-2xl border border-brand-200 bg-white px-3 py-2 text-sm"
            />
          </div>

          {/* Category + Version row */}
          <div className="grid gap-3 sm:grid-cols-2">
            <div>
              <label className="mb-1 block text-xs font-bold text-brand-800">Kategória *</label>
              <select
                value={docUploadCategory}
                onChange={(e) => setDocUploadCategory(e.target.value)}
                className="w-full rounded-2xl border border-brand-200 bg-white px-3 py-2 text-sm"
              >
                <option value="SZMSZ">SZMSZ</option>
                <option value="Közgyűlési jegyzőkönyv">Közgyűlési jegyzőkönyv</option>
                <option value="Éves elszámolás">Éves elszámolás</option>
                <option value="Biztosítás">Biztosítás</option>
                <option value="Tűzvédelmi irat">Tűzvédelmi irat</option>
                <option value="Energetika">Energetika</option>
                <option value="Szerződés">Szerződés</option>
                <option value="Egyéb">Egyéb</option>
              </select>
            </div>
            <div>
              <label className="mb-1 block text-xs font-bold text-brand-800">Verzió</label>
              <input
                type="text"
                value={docUploadVersion}
                onChange={(e) => setDocUploadVersion(e.target.value)}
                placeholder="1.0"
                className="w-full rounded-2xl border border-brand-200 bg-white px-3 py-2 text-sm"
              />
            </div>
          </div>

          {/* Visibility */}
          <div>
            <label className="mb-1 block text-xs font-bold text-brand-800">Láthatóság</label>
            <select
              value={docUploadVisibility}
              onChange={(e) => setDocUploadVisibility(e.target.value)}
              className="w-full rounded-2xl border border-brand-200 bg-white px-3 py-2 text-sm"
            >
              <option value="Mindenki">Mindenki (lakók + tulajdonosok)</option>
              <option value="Tulajdonos">Csak tulajdonosok</option>
              <option value="Kezelő">Csak kezelők</option>
            </select>
          </div>

          {/* Progress bar */}
          {docUploadLoading && (
            <div className="space-y-1">
              <div className="h-2 overflow-hidden rounded-full bg-brand-100">
                <div
                  className="h-full rounded-full bg-brand-500 transition-all duration-300"
                  style={{ width: `${docUploadProgress}%` }}
                />
              </div>
              <p className="text-xs text-brand-700">Feltöltés folyamatban... {docUploadProgress}%</p>
            </div>
          )}

          {/* Error display */}
          {docUploadError && (
            <div className="flex items-start gap-2 rounded-2xl bg-rose-50 p-3 text-xs font-semibold text-rose-700">
              <AlertTriangle size={14} className="mt-0.5 shrink-0" />
              <span>{docUploadError}</span>
            </div>
          )}

          <button
            type="submit"
            disabled={docUploadLoading}
            className="w-full rounded-2xl bg-brand-500 py-2.5 text-sm font-black text-white hover:bg-brand-600 disabled:cursor-not-allowed disabled:opacity-50 transition-colors"
          >
            {docUploadLoading ? 'Feltöltés...' : 'Dokumentum feltöltése'}
          </button>
        </form>
      )}
    </div>
  )}

  {/* Document list */}
  <div className="space-y-3">
    {visibleDocuments.length === 0 && (
      <p className="py-6 text-center text-sm text-slate-400">Nincsenek dokumentumok ebben a kategóriában.</p>
    )}
    {visibleDocuments.map((item) => (
      <article key={item.id} className="rounded-3xl border border-slate-100 bg-white p-4 shadow-sm">
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0">
            <p className="font-black text-slate-950">{item.title}</p>
            <p className="mt-1 text-xs font-medium text-slate-500">
              {item.category} · v{item.version} · {formatDate(item.uploaded_at)} · {item.visibility || 'Mindenki'}
            </p>
          </div>
          {item.acknowledged_at
            ? <CheckCircle2 className="shrink-0 text-emerald-500" size={18} />
            : <AlertTriangle className="shrink-0 text-amber-500" size={18} />
          }
        </div>
        <div className="mt-3 flex flex-wrap gap-2">
          <button
            type="button"
            onClick={() => handleDocumentOpen(item.id, item.file_url)}
            disabled={docSignedUrlLoading[item.id]}
            className="rounded-xl bg-slate-950 px-3 py-2 text-xs font-black text-white hover:bg-slate-800 disabled:opacity-50 transition-colors"
          >
            {docSignedUrlLoading[item.id] ? 'Betöltés...' : 'Megnyitás'}
          </button>
          {!item.acknowledged_at && (
            <button
              type="button"
              className="rounded-xl bg-emerald-600 px-3 py-2 text-xs font-black text-white hover:bg-emerald-700 transition-colors"
              onClick={() => acknowledgeDocumentAction(item.id)}
            >
              Elolvasva
            </button>
          )}
          {item.acknowledged_at && (
            <span className="rounded-xl bg-emerald-50 px-3 py-2 text-xs font-bold text-emerald-700">
              Elolvasva: {formatDate(item.acknowledged_at)}
            </span>
          )}
        </div>
      </article>
    ))}
  </div>
</SectionCard>
```

---

## 9. PHASE 6: REPLACE MOCK DOCUMENT LIST WITH REAL DATA (SCOPED BY BUILDING)

### 9.1 Current Problem

`lib/data.ts` line 49 queries:
```typescript
supabase.from('documents').select('*').order('uploaded_at', { ascending: false }).limit(10),
```

This returns ALL documents across ALL buildings. In a multi-tenant environment this is a data leak. Additionally, `DocumentItem.acknowledged_at` is populated from the `documents.acknowledged_at` column (a denormalized, deprecated field), NOT from the `document_acknowledgements` table per current user.

### 9.2 Updated `getDashboardData()` Signature

Modify `lib/data.ts` to accept an optional `buildingId` parameter and join acknowledgements:

```typescript
export async function getDashboardData(role: Role = 'lako', buildingId?: string) {
  // ... existing fallback logic unchanged ...

  if (!hasSupabaseConfig) {
    return fallback;
  }

  const supabase = createClient();

  // Get current authenticated user for acknowledgement join
  const { data: { user } } = await supabase.auth.getUser();
  const userId = user?.id;

  // Build document query with optional building scoping and per-user acknowledgement join
  let docQuery = supabase
    .from('documents')
    .select(`
      id,
      title,
      category,
      version,
      file_url,
      visibility,
      uploaded_at,
      building_id,
      document_acknowledgements!left(viewed_at)
    `)
    .order('uploaded_at', { ascending: false })
    .limit(20);

  if (buildingId) {
    docQuery = docQuery.eq('building_id', buildingId);
  }

  // If user is authenticated, filter acknowledgements by their profile
  // Note: Supabase's PostgREST join filtering on nested tables requires a different approach
  // Use a separate query for acknowledgements and merge in application code
  const [/* other queries */, documents, acknowledgements] = await Promise.all([
    // ... all existing queries ...
    docQuery,
    userId
      ? supabase
          .from('document_acknowledgements')
          .select('document_id, viewed_at')
          .eq('profile_id', userId)
      : Promise.resolve({ data: [] as Array<{ document_id: string; viewed_at: string }> | null })
  ]);

  // Merge acknowledgement viewed_at into document records
  const ackMap = new Map<string, string>();
  if (acknowledgements.data) {
    for (const ack of acknowledgements.data) {
      ackMap.set(ack.document_id, ack.viewed_at);
    }
  }

  const mergedDocuments = (documents.data ?? []).map((doc) => ({
    ...doc,
    acknowledged_at: ackMap.get(doc.id) ?? null
  }));

  return {
    // ...
    documents: mergedDocuments.length ? mergedDocuments : mockDocuments,
    // ...
  };
}
```

### 9.3 Pass `buildingId` from Page to `getDashboardData`

In `app/page.tsx`, extract the `buildingId` from URL params (or from user's active building in session) and pass it to `getDashboardData`:

```typescript
// app/page.tsx
export default async function Page({
  searchParams
}: {
  searchParams: { role?: string; buildingId?: string }
}) {
  const role = (searchParams.role as Role) || 'lako';
  const buildingId = searchParams.buildingId; // or derive from session

  const data = await getDashboardData(role, buildingId);
  // ...
}
```

---

## 10. PHASE 7: DOWNLOAD BUTTON WITH SIGNED URL

The implementation in Phase 5 already covers the "Megnyitás" button with signed URL fetching via `handleDocumentOpen`. Key behavior summary:

1. If a cached signed URL exists in `docSignedUrls` state → open it immediately (no network call)
2. If the stored `file_url` starts with `http` (legacy mock data or external URL) → open directly
3. Otherwise → call `getDocumentSignedUrlAction(documentId)`, cache the result, open in new tab

The signed URL expires after 1 hour (3600 seconds). The cache in component state is valid for the lifetime of the component mount. If the user keeps the tab open for more than an hour and tries to open a document, the cached URL will return a 403. To handle this gracefully, add URL expiry tracking:

```typescript
const [docSignedUrlExpiry, setDocSignedUrlExpiry] = useState<Record<string, number>>({});

const isCachedUrlValid = (documentId: string): boolean => {
  const expiry = docSignedUrlExpiry[documentId];
  if (!expiry) return false;
  return Date.now() < expiry - 60_000; // 60s safety margin
};

// In handleDocumentOpen, when caching:
setDocSignedUrls((prev) => ({ ...prev, [documentId]: result.signedUrl! }));
setDocSignedUrlExpiry((prev) => ({ ...prev, [documentId]: Date.now() + (result.expiresIn! * 1000) }));

// In the check:
if (docSignedUrls[documentId] && isCachedUrlValid(documentId)) {
  window.open(docSignedUrls[documentId], '_blank', 'noopener,noreferrer');
  return;
}
```

---

## 11. TESTING STEPS

Follow these steps to verify the complete implementation:

### 11.1 Database RLS Tests (via Supabase SQL Editor)

```sql
-- Test 1: Verify INSERT on documents is blocked for unauthenticated
-- (Run as anon role in SQL editor — should return RLS violation)
insert into documents (title, category, version, file_url, building_id)
values ('Test', 'SZMSZ', '1.0', 'test.pdf', (select id from buildings limit 1));

-- Test 2: Verify INSERT on document_acknowledgements works for authenticated user
-- (Run via application flow — log in as lakó, click "Elolvasva")
-- Expected: Success, row in document_acknowledgements

-- Test 3: Verify upsert works (click "Elolvasva" twice on same document)
-- Expected: Same row updated, no duplicate rows
select count(*) from document_acknowledgements where profile_id = auth.uid();
```

### 11.2 Storage Upload Test (Manual)

1. Log in as a `kozos_kepviselo` user
2. Navigate to Dokumentumtár section
3. Click "+ Feltöltés" button — verify the upload form appears
4. Select a PDF file under 50 MB
5. Fill in title and category
6. Click "Dokumentum feltöltése"
7. Verify: progress bar animates, success message appears, new document appears in list
8. Check Supabase Storage dashboard — verify file appears at expected path
9. Check Supabase `documents` table — verify new row with storage path in `file_url`

### 11.3 Download Test

1. Click "Megnyitás" on a newly uploaded document
2. Verify: loading spinner shows briefly, then PDF opens in new browser tab
3. Inspect the URL — it should be a Supabase signed URL (`https://<project>.supabase.co/storage/v1/object/sign/...`)
4. Copy the signed URL, wait 1 hour, paste it — should return 403 (URL expired)

### 11.4 Role Guard Test

1. Log in as `lako` (resident) role
2. Navigate to Dokumentumtár — verify no "+ Feltöltés" button appears
3. Attempt to call `uploadDocument` directly via browser console fetch — should receive `{ success: false, error: 'Nincs jogosultságod...' }`

### 11.5 Acknowledgement Round-Trip Test

1. Upload a new document as `kozos_kepviselo`
2. Log out, log in as a `lako` user
3. Navigate to Dokumentumtár — verify the document shows with amber warning icon (unacknowledged)
4. Click "Elolvasva" — verify green checkmark replaces the amber warning
5. Refresh page — verify acknowledgement persists (from database, not state)

---

## 12. ERROR HANDLING

### 12.1 File Too Large

**Client-side** (before form submit):
```typescript
onChange={(e) => {
  const f = e.target.files?.[0];
  if (f && f.size > 50 * 1024 * 1024) {
    setDocUploadError(`Fájl túl nagy: ${(f.size/1024/1024).toFixed(1)} MB. Maximum 50 MB.`);
    e.target.value = '';
    return;
  }
  setDocUploadFile(f ?? null);
  setDocUploadError(null);
}}
```

**Server-side**: Already handled in `uploadDocument` Phase 3 code above with explicit size check.

### 12.2 Wrong File Type

**Client-side**: The `accept=".pdf,.docx,.xlsx,.jpg,.jpeg,.png"` attribute on the file input provides browser-level filtering. This is UX-only and can be bypassed.

**Server-side**: The MIME type check in `uploadDocument` validates `file.type` against the allowlist. Note: `file.type` in a Next.js Server Action comes from the browser's reported type, which can be spoofed. For production security, add a server-side MIME magic number check using the first bytes of the file buffer:

```typescript
// Check PDF magic bytes: %PDF at offset 0
const bytes = new Uint8Array(fileBuffer.slice(0, 4));
if (file.type === 'application/pdf') {
  const isPdf = bytes[0] === 0x25 && bytes[1] === 0x50 && bytes[2] === 0x44 && bytes[3] === 0x46;
  if (!isPdf) {
    return { success: false, error: 'A fájl tartalma nem egyezik meg a deklarált PDF formátummal' };
  }
}
```

### 12.3 Supabase Storage Full / Quota Exceeded

Supabase free tier: 1 GB total storage. Pro tier: 100 GB. The error message from Supabase Storage for quota exceeded is `StorageQuotaExceeded`. Handle:

```typescript
if (uploadError.message.includes('quota') || uploadError.message.includes('exceeded')) {
  return { success: false, error: 'Tárolóhely kvóta elérve. Kérjük, töröljön régi dokumentumokat vagy frissítsen magasabb Supabase csomagra.' };
}
```

### 12.4 RLS Policy Block

If the manager's `profiles.role` doesn't match `kozos_kepviselo` or `megbizott` in the database (despite the client-side role claim), both the Storage RLS and the documents INSERT RLS will block. This returns Supabase error code `42501` (insufficient privilege). The `uploadDocument` action checks role before attempting upload so this should never be reached in normal flow, but always handle it:

```typescript
if (uploadError.message.includes('security policy') || insertError?.code === '42501') {
  return { success: false, error: 'Jogosultsági hiba. Ellenőrizze, hogy a profilja kezelői szerepkörrel rendelkezik-e.' };
}
```

### 12.5 Signed URL Expiry

Signed URLs expire after 3600 seconds. If a user bookmarks a signed URL and tries to use it after expiry, Supabase returns HTTP 400 with message `JWT expired`. The "Megnyitás" button always fetches a fresh signed URL (invalidating cache after 1 hour as described in Phase 7), so this is handled automatically in normal navigation flow.

### 12.6 Orphaned Storage Objects on DB Insert Failure

If the Storage upload succeeds but the `documents` INSERT fails (e.g., RLS violation or constraint violation), the uploaded file would be orphaned in Storage. Phase 3 handles this with an explicit cleanup:

```typescript
if (insertError) {
  await supabase.storage.from('documents').remove([storageFullPath]);
  return { success: false, error: `Adatbázis hiba: ${insertError.message}` };
}
```

Note: the cleanup itself can fail if the Storage delete also hits an RLS block (e.g., service role key not configured). In that case, log the orphaned path for manual cleanup. Consider adding an `orphaned_storage_objects` audit table for production hardening.

---

## 13. INTEGRATION WITH ACKNOWLEDGE FLOW

The acknowledge flow and the upload flow share the `document_acknowledgements` table. Ensure they do not interfere:

1. After uploading a new document, the uploader (manager) does NOT automatically get an acknowledgement row created. If the manager should also be listed as having "read" the document they just created, add this to `uploadDocument`:

```typescript
// Auto-acknowledge for the uploader (optional, discuss with product)
await supabase.from('document_acknowledgements').upsert(
  { document_id: docRecord.id, profile_id: user.id, viewed_at: new Date().toISOString() },
  { onConflict: 'document_id,profile_id' }
);
```

2. When the document list is loaded, the `acknowledged_at` for each document must be scoped to the current user (implemented in Phase 6). Without this, two users would see each other's acknowledgement status incorrectly merged.

3. The UI shows "Elolvasva" button only when `!item.acknowledged_at`. After clicking, the optimistic pattern should update the local `data.documents` state immediately without waiting for a full page revalidation. Consider an optimistic update pattern:

```typescript
const [localAckMap, setLocalAckMap] = useState<Record<string, string>>({});

const handleAcknowledge = async (documentId: string) => {
  // Optimistic update
  setLocalAckMap((prev) => ({ ...prev, [documentId]: new Date().toISOString() }));
  const result = await acknowledgeDocumentAction(documentId);
  if (!result.success) {
    // Rollback
    setLocalAckMap((prev) => { const n = { ...prev }; delete n[documentId]; return n; });
    console.error('Acknowledge failed:', result.error);
  }
};

// In visibleDocuments render:
const effectiveAcknowledgedAt = localAckMap[item.id] ?? item.acknowledged_at;
```

---

## 14. ROLLBACK PLAN

If this feature causes regressions or data issues, follow these steps:

### 14.1 Immediate Rollback (< 5 minutes)

1. **Revert the `app/actions/documents.ts` file** to the previous version via `git revert`. The existing `createDocument` and `acknowledgeDocument` actions continue to work.
2. **Revert `components/dashboard-client.tsx`** to the previous version. The document list still renders from mock data.
3. **Do NOT drop the Storage bucket** — it may contain already-uploaded files that users have referenced. Instead, leave it in place.

### 14.2 Database Rollback (safe, reversible)

The RLS policies added in Phase 1 can be dropped without data loss:

```sql
drop policy if exists "Manager insert documents" on documents;
drop policy if exists "Authenticated insert document acknowledgements" on document_acknowledgements;
drop policy if exists "Self update document acknowledgements" on document_acknowledgements;
drop policy if exists "Manager update documents" on documents;
drop policy if exists "Manager upload documents" on storage.objects;
drop policy if exists "Authenticated read documents" on storage.objects;
drop policy if exists "Manager delete documents" on storage.objects;
```

The `uploaded_by` column alter is safe to leave in place (nullable, no constraint violations). Dropping it:

```sql
alter table documents drop column if exists uploaded_by;
```

### 14.3 Storage Cleanup (only if needed)

If the Storage bucket was created and needs to be emptied:
```sql
-- List all objects in the documents bucket
select * from storage.objects where bucket_id = 'documents';
-- Delete all objects (WARNING: irreversible)
delete from storage.objects where bucket_id = 'documents';
-- Delete the bucket
delete from storage.buckets where id = 'documents';
```

---

## 15. DEFINITION OF DONE

This feature is considered complete when ALL of the following criteria are met:

1. **Storage bucket exists** in Supabase with name `documents`, configured as private with 50 MB file size limit and correct MIME type restrictions.

2. **RLS policies are applied**: documents INSERT (managers only), document_acknowledgements INSERT (authenticated users, self only), document_acknowledgements UPDATE (self only), Storage objects INSERT/SELECT/DELETE policies.

3. **`uploadDocument` Server Action** exists in `app/actions/documents.ts`, handles FormData, uploads to Storage using path convention `{buildingId}/{year}/{categorySlug}/{uuid}_{filename}`, inserts document record, and returns `{ success, documentId, signedUrl }`.

4. **`getDocumentSignedUrl` Server Action** exists, fetches a fresh 1-hour signed URL for any document by ID, handles not-found and auth errors.

5. **Upload form renders** in the Dokumentumtár section exclusively for `kozos_kepviselo` and `megbizott` roles. Lako/tulajdonos/bizottság/konyvelo see NO upload UI.

6. **Upload form has all required fields**: file input with type restrictions, title, category dropdown (8 categories), version, visibility.

7. **Upload progress indicator** shows during upload (0% → 20% → 50% → 100%) and resets after completion.

8. **Upload error states** are displayed inline in the form for all error categories: auth failure, wrong role, file too large, wrong MIME type, storage quota, database error.

9. **Upload success state** shows a confirmation message and auto-closes the form after 2 seconds.

10. **"Megnyitás" button** fetches a fresh signed URL on first click, caches it for 1 hour, opens document in new browser tab. Loading state shown while URL is being fetched.

11. **"Elolvasva" button** updates `document_acknowledgements` via the existing Server Action and shows optimistic UI feedback. Duplicate clicks (upsert) do not cause errors.

12. **Document list is scoped** to the current building via `building_id` filter in `getDashboardData()`, with per-user acknowledgement status correctly joined from `document_acknowledgements`.

13. **Audit log entry** is written for every document upload with `action_type: 'document_upload'`.

14. **Orphaned storage cleanup** is attempted if the document metadata insert fails after a successful Storage upload.

15. **All existing features are unchanged**: ticket creation, meter readings, announcements, acknowledgement button (when not being replaced by the new implementation) all continue to work without regressions.

16. **Mobile layout**: the upload form and document cards render correctly on screens narrower than 640px (all inputs are full-width, buttons are tappable at minimum 44px height).
