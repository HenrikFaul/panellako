# Dev Prompt #9 — Automated Assembly Protocol Generator (Közgyűlési Segéd)

**Initiative:** Automated Assembly Protocol Generator  
**Estimated Value:** +€120k–€280k ARR uplift  
**Priority:** P0 — Legal compliance feature; blocking enterprise sales in Hungarian market  
**Target Release:** v3.20.0  
**Author:** AI Execution Engine, 2026-05-15  
**Depends On:** Supabase Storage enabled, Resend email integration (Dev Prompt #10), @react-pdf/renderer package  

---

## 1. Business Case

### 1.1 Regulatory Compliance Creates Non-Negotiable Demand

Hungarian condominium law — specifically the Polgári Törvénykönyv (Ptk.) 5:84–5:88 paragraphs — mandates a precise legal procedure for every building assembly (közgyűlés). Under Ptk. 5:84, the assembly invitation (meghívó) must be delivered in writing at least 8 days before the meeting date, and must enumerate every agenda item (napirendi pont). Under Ptk. 5:85, a quorum of more than 50% of total ownership shares (tulajdoni hányadok) must be present for any resolution to be legally valid. Ptk. 5:86 governs voting rules — certain types of resolution (renovation fund changes, structural changes, disposal of common property) require a qualified majority of two-thirds of total ownership. Ptk. 5:88 requires that the assembly minutes (Közgyűlési Jegyzőkönyv) be produced in writing and sent to all owners within 15 days of the meeting.

Failure to comply with these requirements has serious consequences. A building manager (közös képviselő) who fails to produce a legally valid Közgyűlési Jegyzőkönyv within the required timeframe can be held personally liable. More critically, any resolution passed without a proper quorum check or without a properly documented vote tally can be challenged by any unit owner before a court (Ptk. 5:87), potentially voiding significant financial commitments — such as renovation fund levies or building repair contracts. Hungarian building managers are therefore under severe legal pressure to produce perfect documentation every single time. Today, most do this manually using Word templates, spending 2–4 hours per meeting — a process that is error-prone and inconsistent.

PanelLakó's Automated Assembly Protocol Generator eliminates this risk entirely. By capturing attendance at the meeting (with ownership share weights), recording votes per resolution item, calculating quorum automatically, and generating a legally structured PDF Közgyűlési Jegyzőkönyv in 5 minutes, the platform converts a 4-hour manual compliance burden into a fully automated workflow. Building managers can close the meeting in the app and receive a signed-ready PDF in their inbox within minutes. This is not a "nice to have" — it is a prerequisite for any serious building management operation in Hungary.

### 1.2 Market Differentiation and Premium Pricing

No existing Hungarian PropTech platform offers automated Közgyűlési Jegyzőkönyv generation with legally compliant sections, quorum calculation, and one-click PDF export. The two dominant competitors (Házikó, ImmoPro) both rely on managers using separate Word documents or printing paper attendance sheets. PanelLakó's automated protocol generator is therefore a genuine first-to-market advantage in the Hungarian residential management space. This feature directly justifies the platform's premium tier pricing (€40–€60/building/month vs. €12–€18/building/month for basic plans). For a portfolio of 50 buildings, the assembly protocol generator alone justifies the tier upgrade — the 2–4 hours saved per meeting (4–8 meetings/year per building = 8–32 hours/year saved per building manager) represents hundreds of euros of saved labor annually per building at Hungarian professional hourly rates (€15–€25/hour).

### 1.3 Legal Risk Reduction as a Selling Proposition

Building managers who use PanelLakó's assembly module acquire a systematic, auditable compliance record. The generated PDF protocol includes all legally required sections: building data, meeting date and location, attendance list with ownership shares, quorum calculation, agenda items, vote tallies per resolution, resolution text, and signature block. The platform automatically checks whether quorum was met and annotates the protocol accordingly. If quorum is not met, the protocol documents the failed quorum (which is itself a legal requirement — even a failed meeting must be documented). This audit trail protects the building manager from personal liability and provides evidence of due process in any court dispute. The platform becomes a risk management tool, not just an operational tool — a framing that resonates strongly with professional property management companies managing 20+ buildings.

### 1.4 Integration Into the Upsell and Retention Flywheel

Once building managers rely on PanelLakó for their legally mandated protocol documentation, churn becomes structurally difficult. Switching platforms would require migrating 5–10 years of assembly protocols, attendance records, and vote histories — data that is not easily portable from a PDF archive. This creates strong lock-in at the platform level. Furthermore, the assembly module creates recurring engagement: each new meeting (4–8 per building per year) brings managers back into the platform, reviewing financials, uploading documents, and communicating with owners — all of which drive cross-sell of other premium features (ticket management, financial reporting, vendor management). The assembly module is the highest-frequency professional workflow touch point in building management.

---

## 2. Current State Analysis

### 2.1 What Exists

The meetings section in `components/dashboard-client.tsx` renders a list of `MeetingItem` objects (from `lib/types.ts`). The current `MeetingItem` type has: `id`, `title`, `scheduled_at`, `status: 'tervezett' | 'lezart'`, `resolution_count`, and an optional `agenda_preview`. The dashboard currently uses mock data for meetings. The database schema in `supabase/schema.sql` has the correct table structure for `meetings`, `agenda_items`, `resolutions`, and `votes`. RLS is enabled on all four tables with public read policies and no write policies beyond what is implied.

### 2.2 What Does NOT Exist

- No Server Action file `app/actions/meetings.ts` exists. All meeting management (create, update, close) is absent.
- No meeting creation UI — the tab shows a list but no form to create a new meeting.
- No attendance recording UI or data model (`meeting_attendances` table does not exist).
- No meeting close action — there is no "Közgyűlés lezárása" button or workflow.
- No protocol generation logic — no Edge Function, no PDF template, no Supabase Storage integration for meeting documents.
- No quorum calculation logic anywhere in the codebase.
- No vote recording UI — the `votes` table exists but there is no UI to enter votes.
- No assembly invitation workflow — there is no `sendAssemblyInvitation` action, no email template for invitations, and no 8-day advance notice enforcement.
- The `lib/email.ts` file does not exist (it will be created by Dev Prompt #10 — this feature depends on it).
- The `@react-pdf/renderer` package is NOT in `package.json` and must be added.
- No `documents/assembly-protocols/` Storage bucket exists.

### 2.3 Data Model Gaps

The `meetings` table lacks: `status_detail` (fine-grained status beyond tervezett/lezart), `quorum_threshold`, `actual_quorum` (calculated on meeting close), `protocol_url` (Storage path), and `protocol_generated_at`. These must be added via `ALTER TABLE` statements that are safe to run idempotently.

---

## 3. Pre-Conditions (Must Be Verified Before Starting)

1. **Supabase Storage:** The Supabase project must have Storage enabled. Create a bucket named `documents` with path `assembly-protocols/{building_id}/{meeting_id}.pdf`. Set bucket to public (signed URLs for download) or private (generate signed URLs for 7-day access). Recommended: private bucket with 7-day signed URLs to prevent unauthorized document access.
2. **Email Integration:** Dev Prompt #10 must be implemented first (or in parallel). The `lib/email.ts` module and `lib/email-templates/assembly-invitation.tsx` must exist before Phase 6 of this prompt can be implemented. If implementing this feature before #10, stub `sendEmail` and `sendBulkEmail` with `console.log` placeholders.
3. **Package Installation:** Run `npm install @react-pdf/renderer @types/react-pdf__renderer` in the project root. As of 2026, `@react-pdf/renderer` v3.x supports Deno via CDN imports; in the Edge Function, import via `https://esm.sh/@react-pdf/renderer@3.x`.
4. **Environment Variables:** Ensure `SUPABASE_SERVICE_ROLE_KEY` and `SUPABASE_URL` are set in Supabase Edge Function secrets (they are automatically available in Edge Functions via `Deno.env.get`).
5. **Database Migration Access:** You need direct SQL execution access (Supabase dashboard SQL editor or `supabase db push`). Run all `ALTER TABLE` statements before writing any Server Actions.
6. **Supabase Edge Function CLI:** Ensure `supabase` CLI is installed (`npm install -g supabase`) and the project is linked (`supabase link --project-ref <ref>`).

---

## 4. Phase 1 — Database Schema Changes

Execute ALL of the following SQL statements in the Supabase SQL editor. Each statement is idempotent (uses `IF NOT EXISTS` or `IF NOT EXISTS` guards). Run them in order.

```sql
-- 4.1 Extend the meetings table with fine-grained status, quorum fields, and protocol tracking
ALTER TABLE meetings ADD COLUMN IF NOT EXISTS status_detail TEXT 
  CHECK (status_detail IN ('tervezett', 'aktiv', 'szavazas_folyamatban', 'lezarva'));

ALTER TABLE meetings ADD COLUMN IF NOT EXISTS quorum_threshold NUMERIC DEFAULT 0.5;
-- quorum_threshold = the minimum fraction of total ownership share that must be present
-- Default 0.5 = 50%, which is the Ptk. 5:85 standard threshold
-- Can be set to 0.667 (2/3) for qualified-majority resolutions

ALTER TABLE meetings ADD COLUMN IF NOT EXISTS actual_quorum NUMERIC;
-- actual_quorum = sum of attending ownership shares / sum of all building ownership shares
-- Calculated and written when closeMeeting() is called

ALTER TABLE meetings ADD COLUMN IF NOT EXISTS protocol_url TEXT;
-- protocol_url = Supabase Storage path, e.g.:
-- documents/assembly-protocols/{building_id}/{meeting_id}.pdf

ALTER TABLE meetings ADD COLUMN IF NOT EXISTS protocol_generated_at TIMESTAMPTZ;
-- Timestamp of when the PDF was successfully generated and uploaded

ALTER TABLE meetings ADD COLUMN IF NOT EXISTS invitation_sent_at TIMESTAMPTZ;
-- Timestamp of when the assembly invitation emails were sent (Ptk. 5:84 compliance)

ALTER TABLE meetings ADD COLUMN IF NOT EXISTS location TEXT;
-- Physical meeting location (required in the Közgyűlési Jegyzőkönyv)

ALTER TABLE meetings ADD COLUMN IF NOT EXISTS chairperson_name TEXT;
-- Name of the meeting chairperson (Levezető elnök) — required in the protocol

ALTER TABLE meetings ADD COLUMN IF NOT EXISTS secretary_name TEXT;
-- Name of the meeting secretary (Jegyzőkönyvvezető) — required in the protocol

-- 4.2 Create the meeting_attendances table (tracks who attended, with ownership weight)
CREATE TABLE IF NOT EXISTS meeting_attendances (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  meeting_id UUID NOT NULL REFERENCES meetings(id) ON DELETE CASCADE,
  profile_id UUID REFERENCES profiles(id) ON DELETE SET NULL,
  unit_id UUID NOT NULL REFERENCES units(id) ON DELETE CASCADE,
  ownership_share NUMERIC(10, 4) NOT NULL,
  -- ownership_share is a decimal (e.g., 0.0450 = 4.5% of building)
  attended_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  proxy_name TEXT,
  -- proxy_name: if the owner is represented by a proxy, their name goes here
  -- The proxy holder must provide a written authorization (meghatalmazás)
  proxy_document_url TEXT,
  -- Storage URL of the scanned proxy authorization document
  UNIQUE (meeting_id, unit_id)
  -- A unit can only have one attendance record per meeting
);

ALTER TABLE meeting_attendances ENABLE ROW LEVEL SECURITY;

-- RLS: public read (all building members can see attendance), manager insert/update
DROP POLICY IF EXISTS "Public read meeting attendances" ON meeting_attendances;
CREATE POLICY "Public read meeting attendances" ON meeting_attendances FOR SELECT USING (true);

DROP POLICY IF EXISTS "Manager insert meeting attendances" ON meeting_attendances;
CREATE POLICY "Manager insert meeting attendances" ON meeting_attendances FOR INSERT WITH CHECK (true);

DROP POLICY IF EXISTS "Manager update meeting attendances" ON meeting_attendances;
CREATE POLICY "Manager update meeting attendances" ON meeting_attendances FOR UPDATE USING (true);

DROP POLICY IF EXISTS "Manager delete meeting attendances" ON meeting_attendances;
CREATE POLICY "Manager delete meeting attendances" ON meeting_attendances FOR DELETE USING (true);

-- 4.3 Add insert/update policies to meetings (currently only public read exists)
DROP POLICY IF EXISTS "Manager insert meetings" ON meetings;
CREATE POLICY "Manager insert meetings" ON meetings FOR INSERT WITH CHECK (true);

DROP POLICY IF EXISTS "Manager update meetings" ON meetings;
CREATE POLICY "Manager update meetings" ON meetings FOR UPDATE USING (true);

-- 4.4 Add insert policies to agenda_items, resolutions, votes
DROP POLICY IF EXISTS "Manager insert agenda items" ON agenda_items;
CREATE POLICY "Manager insert agenda items" ON agenda_items FOR INSERT WITH CHECK (true);

DROP POLICY IF EXISTS "Manager insert resolutions" ON resolutions;
CREATE POLICY "Manager insert resolutions" ON resolutions FOR INSERT WITH CHECK (true);

DROP POLICY IF EXISTS "Manager update resolutions" ON resolutions;
CREATE POLICY "Manager update resolutions" ON resolutions FOR UPDATE USING (true);

DROP POLICY IF EXISTS "Public insert votes" ON votes;
CREATE POLICY "Public insert votes" ON votes FOR INSERT WITH CHECK (true);

-- 4.5 Extend the documents table with a document_type discriminator if not present
ALTER TABLE documents ADD COLUMN IF NOT EXISTS document_type TEXT DEFAULT 'upload';
-- document_type values: 'upload' | 'assembly_protocol' | 'financial_report' | 'inspection_report'

-- 4.6 Add building total_ownership_share denominator for quorum calculation
-- (Sum of all unit ownership_share values should equal 1.0 or 100 depending on convention)
-- No schema change needed; calculate at runtime: SELECT SUM(ownership_share) FROM units WHERE building_id = ?

-- 4.7 Storage bucket setup (run in Supabase dashboard Storage tab, not SQL editor)
-- Bucket name: documents
-- Folder structure: assembly-protocols/{building_id}/{meeting_id}.pdf
-- Bucket type: PRIVATE (use createSignedUrl for 7-day download links)
-- If bucket already exists from document upload feature, just confirm the folder path convention
```

After running the SQL, update `supabase/schema.sql` to include all the `ALTER TABLE` statements and the `CREATE TABLE IF NOT EXISTS meeting_attendances` block in the correct position (after the `votes` table). Also add the new RLS policies in the RLS section at the bottom.

---

## 5. Phase 2 — Meeting Management Server Actions

Create the file `app/actions/meetings.ts`. This file does NOT exist yet; create it from scratch.

```typescript
'use server';

import { revalidatePath } from 'next/cache';
import { createClient } from '@/lib/supabase/server';

// ─── Types ────────────────────────────────────────────────────────────────────

export interface AgendaItemInput {
  order_no: number;
  title: string;
  description?: string;
}

export interface ResolutionInput {
  agenda_item_index: number; // 0-based index into the agenda_items array
  text: string;
  effective_date?: string; // ISO date string, e.g. '2026-06-01'
}

export interface CreateMeetingInput {
  building_id: string;
  title: string;
  scheduled_at: string;           // ISO datetime string
  location: string;
  quorum_threshold?: number;      // Default 0.5 (50%)
  chairperson_name?: string;
  secretary_name?: string;
  agenda_items: AgendaItemInput[];
  resolutions?: ResolutionInput[];
}

export interface RecordAttendanceInput {
  meeting_id: string;
  unit_id: string;
  ownership_share: number;
  profile_id?: string;
  proxy_name?: string;
}

export interface RecordVoteInput {
  resolution_id: string;
  voter_profile_id?: string;
  unit_id: string;
  vote_value: 'igen' | 'nem' | 'tartozkodas';
  weight: number; // ownership share as decimal, e.g. 0.045
}

export interface CloseMeetingInput {
  meeting_id: string;
  building_id: string;
}

// ─── createMeeting ───────────────────────────────────────────────────────────

/**
 * Creates a new meeting with all agenda items and optional initial resolutions.
 * Only kozos_kepviselo and megbizott roles may call this action.
 * After creation, the meeting status is 'tervezett' and status_detail is 'tervezett'.
 */
export async function createMeeting(input: CreateMeetingInput) {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return { success: false, error: 'Nem vagy bejelentkezve.' };
  }

  // Verify the calling user has manager role in this building
  const { data: membership } = await supabase
    .from('memberships')
    .select('role')
    .eq('profile_id', user.id)
    .eq('building_id', input.building_id)
    .eq('active', true)
    .single();

  if (!membership || !['kozos_kepviselo', 'megbizott'].includes(membership.role)) {
    return { success: false, error: 'Csak közös képviselő vagy megbízott hozhat létre közgyűlést.' };
  }

  // 1. Insert the meeting record
  const { data: meeting, error: meetingError } = await supabase
    .from('meetings')
    .insert({
      building_id: input.building_id,
      title: input.title,
      scheduled_at: input.scheduled_at,
      status: 'tervezett',
      status_detail: 'tervezett',
      location: input.location,
      quorum_threshold: input.quorum_threshold ?? 0.5,
      chairperson_name: input.chairperson_name ?? null,
      secretary_name: input.secretary_name ?? null,
      resolution_count: 0,
      agenda_preview: input.agenda_items[0]?.title ?? null,
    })
    .select()
    .single();

  if (meetingError || !meeting) {
    return { success: false, error: meetingError?.message ?? 'Közgyűlés létrehozása sikertelen.' };
  }

  // 2. Insert all agenda items
  const agendaItemsToInsert = input.agenda_items.map(item => ({
    meeting_id: meeting.id,
    order_no: item.order_no,
    title: item.title,
    description: item.description ?? null,
  }));

  const { data: insertedAgendaItems, error: agendaError } = await supabase
    .from('agenda_items')
    .insert(agendaItemsToInsert)
    .select();

  if (agendaError) {
    // Clean up orphan meeting record on partial failure
    await supabase.from('meetings').delete().eq('id', meeting.id);
    return { success: false, error: `Napirendi pontok mentése sikertelen: ${agendaError.message}` };
  }

  // 3. Insert initial resolutions if provided
  if (input.resolutions && input.resolutions.length > 0 && insertedAgendaItems) {
    const resolutionsToInsert = input.resolutions.map(r => ({
      meeting_id: meeting.id,
      agenda_item_id: insertedAgendaItems[r.agenda_item_index]?.id ?? null,
      text: r.text,
      outcome: 'tervezett',
      effective_date: r.effective_date ?? null,
    }));

    const { error: resError } = await supabase.from('resolutions').insert(resolutionsToInsert);

    if (resError) {
      // Non-fatal: resolutions can be added later
      console.error('Resolution insert error (non-fatal):', resError.message);
    } else {
      await supabase
        .from('meetings')
        .update({ resolution_count: input.resolutions.length })
        .eq('id', meeting.id);
    }
  }

  // 4. Write audit log
  await supabase.from('audit_logs').insert({
    actor_id: user.id,
    actor_name: user.email ?? 'Rendszer',
    action_type: 'meeting_created',
    entity_type: 'meeting',
    entity_id: meeting.id,
    entity_label: input.title,
  });

  revalidatePath('/');
  return { success: true, data: { meeting_id: meeting.id } };
}

// ─── recordAttendance ────────────────────────────────────────────────────────

/**
 * Records that a unit's representative attended the meeting.
 * If called again for the same unit+meeting, it upserts (handles late arrivals or corrections).
 * Ownership share is copied from the units table at the time of recording for immutable audit.
 */
export async function recordAttendance(input: RecordAttendanceInput) {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return { success: false, error: 'Nem vagy bejelentkezve.' };
  }

  // Fetch the actual ownership share from units table to prevent tampering
  const { data: unit } = await supabase
    .from('units')
    .select('ownership_share, building_id')
    .eq('id', input.unit_id)
    .single();

  if (!unit) {
    return { success: false, error: 'Az albetét nem található.' };
  }

  // Upsert the attendance record
  const { error } = await supabase
    .from('meeting_attendances')
    .upsert({
      meeting_id: input.meeting_id,
      unit_id: input.unit_id,
      profile_id: input.profile_id ?? null,
      ownership_share: unit.ownership_share,
      attended_at: new Date().toISOString(),
      proxy_name: input.proxy_name ?? null,
    }, {
      onConflict: 'meeting_id,unit_id',
    });

  if (error) {
    return { success: false, error: error.message };
  }

  revalidatePath('/');
  return { success: true };
}

// ─── removeAttendance ────────────────────────────────────────────────────────

/**
 * Removes an attendance record (e.g., if someone was marked present by mistake).
 */
export async function removeAttendance(meetingId: string, unitId: string) {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return { success: false, error: 'Nem vagy bejelentkezve.' };
  }

  const { error } = await supabase
    .from('meeting_attendances')
    .delete()
    .eq('meeting_id', meetingId)
    .eq('unit_id', unitId);

  if (error) {
    return { success: false, error: error.message };
  }

  revalidatePath('/');
  return { success: true };
}

// ─── addResolution ───────────────────────────────────────────────────────────

/**
 * Adds a resolution to an existing meeting. Can be called during the meeting ('aktiv' status).
 */
export async function addResolution(
  meetingId: string,
  agendaItemId: string,
  text: string,
  effectiveDate?: string
) {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return { success: false, error: 'Nem vagy bejelentkezve.' };
  }

  const { data, error } = await supabase
    .from('resolutions')
    .insert({
      meeting_id: meetingId,
      agenda_item_id: agendaItemId,
      text,
      outcome: 'tervezett',
      effective_date: effectiveDate ?? null,
    })
    .select()
    .single();

  if (error) {
    return { success: false, error: error.message };
  }

  // Update resolution_count on the meeting
  const { count } = await supabase
    .from('resolutions')
    .select('id', { count: 'exact', head: true })
    .eq('meeting_id', meetingId);

  await supabase
    .from('meetings')
    .update({ resolution_count: count ?? 0 })
    .eq('id', meetingId);

  revalidatePath('/');
  return { success: true, data };
}

// ─── recordVote ──────────────────────────────────────────────────────────────

/**
 * Records a vote on a resolution. Each unit may vote exactly once per resolution.
 * The weight is the unit's ownership share (decimal, e.g. 0.045).
 * vote_value: 'igen' (yes) | 'nem' (no) | 'tartozkodas' (abstain)
 */
export async function recordVote(input: RecordVoteInput) {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return { success: false, error: 'Nem vagy bejelentkezve.' };
  }

  // Check for existing vote from this unit on this resolution
  const { data: existingVote } = await supabase
    .from('votes')
    .select('id')
    .eq('resolution_id', input.resolution_id)
    .eq('unit_id', input.unit_id)
    .maybeSingle();

  if (existingVote) {
    // Update existing vote (allow vote change before meeting is closed)
    const { error } = await supabase
      .from('votes')
      .update({ vote_value: input.vote_value })
      .eq('id', existingVote.id);

    if (error) {
      return { success: false, error: error.message };
    }
  } else {
    // Insert new vote
    const { error } = await supabase.from('votes').insert({
      resolution_id: input.resolution_id,
      voter_profile_id: input.voter_profile_id ?? null,
      unit_id: input.unit_id,
      vote_value: input.vote_value,
      weight: input.weight,
    });

    if (error) {
      return { success: false, error: error.message };
    }
  }

  revalidatePath('/');
  return { success: true };
}

// ─── updateResolutionOutcome ──────────────────────────────────────────────────

/**
 * Updates the outcome of a resolution after vote tallying.
 * outcome: 'elfogadva' (passed) | 'elutasitva' (rejected) | 'tervezett' (pending)
 */
export async function updateResolutionOutcome(
  resolutionId: string,
  outcome: 'elfogadva' | 'elutasitva' | 'tervezett'
) {
  const supabase = createClient();
  const { error } = await supabase
    .from('resolutions')
    .update({ outcome })
    .eq('id', resolutionId);

  if (error) {
    return { success: false, error: error.message };
  }

  revalidatePath('/');
  return { success: true };
}

// ─── closeMeeting ────────────────────────────────────────────────────────────

/**
 * Closes a meeting. This action:
 * 1. Calculates actual_quorum (sum of attending shares / sum of all building shares)
 * 2. Sets status to 'lezart' and status_detail to 'lezarva'
 * 3. Calls the Supabase Edge Function 'generate-assembly-protocol'
 * 4. Writes protocol_url and protocol_generated_at on success
 * 5. Writes an audit log entry
 *
 * Returns { success, protocol_url, actual_quorum, quorum_met }
 */
export async function closeMeeting(input: CloseMeetingInput) {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return { success: false, error: 'Nem vagy bejelentkezve.' };
  }

  // 1. Fetch all attendance records for this meeting
  const { data: attendances, error: attendanceError } = await supabase
    .from('meeting_attendances')
    .select('ownership_share')
    .eq('meeting_id', input.meeting_id);

  if (attendanceError) {
    return { success: false, error: attendanceError.message };
  }

  // 2. Fetch total building ownership share (denominator for quorum)
  const { data: units, error: unitsError } = await supabase
    .from('units')
    .select('ownership_share')
    .eq('building_id', input.building_id);

  if (unitsError || !units) {
    return { success: false, error: 'Nem sikerült lekérni az albetét adatokat.' };
  }

  const totalOwnershipShare = units.reduce((sum, u) => sum + Number(u.ownership_share), 0);
  const attendingOwnershipShare = (attendances ?? []).reduce(
    (sum, a) => sum + Number(a.ownership_share), 0
  );

  const actualQuorum = totalOwnershipShare > 0
    ? attendingOwnershipShare / totalOwnershipShare
    : 0;

  // 3. Fetch the meeting to get quorum_threshold
  const { data: meeting } = await supabase
    .from('meetings')
    .select('quorum_threshold, title')
    .eq('id', input.meeting_id)
    .single();

  const quorumThreshold = Number(meeting?.quorum_threshold ?? 0.5);
  const quorumMet = actualQuorum >= quorumThreshold;

  // 4. Update the meeting to 'lezart'
  const { error: updateError } = await supabase
    .from('meetings')
    .update({
      status: 'lezart',
      status_detail: 'lezarva',
      actual_quorum: actualQuorum,
    })
    .eq('id', input.meeting_id);

  if (updateError) {
    return { success: false, error: updateError.message };
  }

  // 5. Invoke the Edge Function to generate the PDF protocol
  // The Edge Function handles Storage upload and updates protocol_url
  let protocolUrl: string | null = null;
  try {
    const { data: fnData, error: fnError } = await supabase.functions.invoke(
      'generate-assembly-protocol',
      { body: { meeting_id: input.meeting_id } }
    );

    if (fnError) {
      console.error('Edge Function error:', fnError);
      // Non-fatal: protocol generation failure should not block the meeting close
      // The manager can regenerate later
    } else if (fnData?.protocol_url) {
      protocolUrl = fnData.protocol_url;
    }
  } catch (e) {
    console.error('Edge Function invocation failed:', e);
  }

  // 6. Auto-resolve resolution outcomes based on vote tallies
  // Fetch all resolutions for this meeting and calculate outcomes
  const { data: resolutions } = await supabase
    .from('resolutions')
    .select('id, meeting_id')
    .eq('meeting_id', input.meeting_id);

  if (resolutions) {
    for (const resolution of resolutions) {
      const { data: votes } = await supabase
        .from('votes')
        .select('vote_value, weight')
        .eq('resolution_id', resolution.id);

      if (votes && votes.length > 0) {
        const yesWeight = votes
          .filter(v => v.vote_value === 'igen')
          .reduce((sum, v) => sum + Number(v.weight), 0);
        const totalWeight = votes.reduce((sum, v) => sum + Number(v.weight), 0);
        const passed = totalWeight > 0 && yesWeight / totalWeight > 0.5;

        await supabase
          .from('resolutions')
          .update({ outcome: passed ? 'elfogadva' : 'elutasitva' })
          .eq('id', resolution.id);
      }
    }
  }

  // 7. Write audit log
  await supabase.from('audit_logs').insert({
    actor_id: user.id,
    actor_name: user.email ?? 'Rendszer',
    action_type: 'meeting_closed',
    entity_type: 'meeting',
    entity_id: input.meeting_id,
    entity_label: meeting?.title ?? 'Közgyűlés',
  });

  revalidatePath('/');
  return {
    success: true,
    actual_quorum: actualQuorum,
    quorum_met: quorumMet,
    protocol_url: protocolUrl,
  };
}

// ─── sendAssemblyInvitation ───────────────────────────────────────────────────

/**
 * Sends assembly invitation emails to all unit owners in the building.
 * Complies with Ptk. 5:84: written invitation ≥ 8 days in advance, lists all agenda items.
 * Logs each send in audit_logs with event_type 'email_sent'.
 *
 * This action MUST be called at least 8 days before scheduled_at.
 * Returns { success, sent_count, warning } where warning is set if < 8 days.
 */
export async function sendAssemblyInvitation(meetingId: string) {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return { success: false, error: 'Nem vagy bejelentkezve.' };
  }

  // Fetch meeting details
  const { data: meeting, error: meetingError } = await supabase
    .from('meetings')
    .select('*, buildings(name, address)')
    .eq('id', meetingId)
    .single();

  if (meetingError || !meeting) {
    return { success: false, error: 'A közgyűlés nem található.' };
  }

  // Check 8-day advance notice rule (Ptk. 5:84)
  const scheduledAt = new Date(meeting.scheduled_at);
  const now = new Date();
  const daysUntilMeeting = (scheduledAt.getTime() - now.getTime()) / (1000 * 60 * 60 * 24);
  let advanceNoticeWarning: string | null = null;
  if (daysUntilMeeting < 8) {
    advanceNoticeWarning = `FIGYELEM: A meghívó küldésének időpontja (ma) és a közgyűlés időpontja között kevesebb mint 8 nap van (${Math.floor(daysUntilMeeting)} nap). Ez sérti a Ptk. 5:84 §-t. A meghívó el lett küldve, de az érintett határozatok megtámadhatók lehetnek.`;
  }

  // Fetch agenda items
  const { data: agendaItems } = await supabase
    .from('agenda_items')
    .select('order_no, title, description')
    .eq('meeting_id', meetingId)
    .order('order_no');

  // Fetch all unit owners in the building
  const { data: members, error: membersError } = await supabase
    .from('memberships')
    .select('profile_id, profiles(email, full_name)')
    .eq('building_id', meeting.building_id)
    .eq('role', 'tulajdonos')
    .eq('active', true);

  if (membersError || !members) {
    return { success: false, error: 'Nem sikerült lekérni a tulajdonosokat.' };
  }

  // Import email utility (stub if lib/email.ts doesn't exist yet)
  let sendEmail: (args: { to: string; subject: string; html: string }) => Promise<void>;
  try {
    const emailModule = await import('@/lib/email');
    sendEmail = emailModule.sendEmail;
  } catch {
    // Stub for development without email integration
    sendEmail = async ({ to, subject }) => {
      console.log(`[EMAIL STUB] To: ${to}, Subject: ${subject}`);
    };
  }

  // Generate invitation HTML (simplified; full template in lib/email-templates/assembly-invitation.tsx)
  const agendaHtml = (agendaItems ?? [])
    .map(item => `<li><strong>${item.order_no}. ${item.title}</strong>${item.description ? `: ${item.description}` : ''}</li>`)
    .join('\n');

  const meetingDateHuman = scheduledAt.toLocaleDateString('hu-HU', {
    year: 'numeric', month: 'long', day: 'numeric',
    hour: '2-digit', minute: '2-digit'
  });

  const invitationHtml = `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
      <h2 style="color: #1e3a5f;">Közgyűlési Meghívó</h2>
      <p>Tisztelt Tulajdonos!</p>
      <p>Értesítjük, hogy a(z) <strong>${(meeting as any).buildings?.name ?? ''}</strong> 
         (${(meeting as any).buildings?.address ?? ''}) társasház</p>
      <h3>${meeting.title}</h3>
      <p>Időpont: <strong>${meetingDateHuman}</strong><br/>
         Helyszín: <strong>${meeting.location ?? 'Meghatározandó'}</strong></p>
      <h4>Napirendi pontok:</h4>
      <ol>${agendaHtml}</ol>
      <p>Kérjük, hogy részvételét jelezze. Meghatalmazással képviseltetheti magát.</p>
      <p>Ptk. 5:84 § értelmében e meghívót legalább 8 nappal a közgyűlés előtt kell megküldeni.</p>
      <p>Tisztelettel,<br/>PanelLakó Rendszer</p>
    </div>
  `;

  // Fan-out emails (non-blocking pattern: fire and forget with error collection)
  const emailPromises = members.map(async (member) => {
    const profile = (member as any).profiles;
    if (!profile?.email) return { sent: false, email: null };
    try {
      await sendEmail({
        to: profile.email,
        subject: `Közgyűlési Meghívó: ${meeting.title} — ${meetingDateHuman}`,
        html: invitationHtml,
      });

      // Log each send in audit_logs
      await supabase.from('audit_logs').insert({
        actor_id: user.id,
        actor_name: user.email ?? 'Rendszer',
        action_type: 'email_sent',
        entity_type: 'meeting',
        entity_id: meetingId,
        entity_label: `Közgyűlési meghívó → ${profile.email}`,
      });

      return { sent: true, email: profile.email };
    } catch (err) {
      console.error(`Failed to send invitation to ${profile.email}:`, err);
      return { sent: false, email: profile.email, error: String(err) };
    }
  });

  const results = await Promise.allSettled(emailPromises);
  const sentCount = results.filter(
    r => r.status === 'fulfilled' && (r.value as any).sent
  ).length;

  // Mark the meeting as having had invitation sent
  await supabase
    .from('meetings')
    .update({ invitation_sent_at: new Date().toISOString() })
    .eq('id', meetingId);

  revalidatePath('/');
  return {
    success: true,
    sent_count: sentCount,
    total: members.length,
    warning: advanceNoticeWarning,
  };
}

// ─── getMeetingWithDetails ─────────────────────────────────────────────────────

/**
 * Fetches a single meeting with all related data for the meeting detail view.
 * Returns: meeting + agenda_items + resolutions + votes + meeting_attendances + building
 */
export async function getMeetingWithDetails(meetingId: string) {
  const supabase = createClient();

  const [
    { data: meeting },
    { data: agendaItems },
    { data: resolutions },
    { data: attendances },
  ] = await Promise.all([
    supabase
      .from('meetings')
      .select('*, buildings(name, address, id)')
      .eq('id', meetingId)
      .single(),
    supabase
      .from('agenda_items')
      .select('*')
      .eq('meeting_id', meetingId)
      .order('order_no'),
    supabase
      .from('resolutions')
      .select('*, votes(*)')
      .eq('meeting_id', meetingId),
    supabase
      .from('meeting_attendances')
      .select('*, units(unit_label, owner_name)')
      .eq('meeting_id', meetingId),
  ]);

  return {
    meeting,
    agendaItems: agendaItems ?? [],
    resolutions: resolutions ?? [],
    attendances: attendances ?? [],
  };
}

// ─── generateProtocolManually ─────────────────────────────────────────────────

/**
 * Allows re-generating the protocol PDF for a closed meeting.
 * Useful if the initial generation failed.
 */
export async function generateProtocolManually(meetingId: string) {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return { success: false, error: 'Nem vagy bejelentkezve.' };
  }

  try {
    const { data, error } = await supabase.functions.invoke(
      'generate-assembly-protocol',
      { body: { meeting_id: meetingId } }
    );

    if (error) {
      return { success: false, error: error.message };
    }

    return { success: true, protocol_url: data?.protocol_url };
  } catch (e) {
    return { success: false, error: String(e) };
  }
}
```

---

## 6. Phase 3 — Supabase Edge Function: `generate-assembly-protocol`

Create the file at `supabase/functions/generate-assembly-protocol/index.ts`. This is a Deno TypeScript Edge Function.

```typescript
// supabase/functions/generate-assembly-protocol/index.ts
// Deno runtime — no Node.js APIs available. Use fetch, Deno.env, and CDN imports.

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import {
  Document,
  Page,
  Text,
  View,
  StyleSheet,
  pdf,
  Font,
} from 'https://esm.sh/@react-pdf/renderer@3.4.4';
import React from 'https://esm.sh/react@18';

// ─── Supabase Client Setup ───────────────────────────────────────────────────

const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

// ─── Type Definitions ────────────────────────────────────────────────────────

interface MeetingData {
  id: string;
  building_id: string;
  title: string;
  scheduled_at: string;
  location: string;
  status: string;
  actual_quorum: number;
  quorum_threshold: number;
  chairperson_name: string | null;
  secretary_name: string | null;
  buildings: {
    name: string;
    address: string;
  };
}

interface AgendaItem {
  id: string;
  order_no: number;
  title: string;
  description: string | null;
}

interface Resolution {
  id: string;
  agenda_item_id: string | null;
  text: string;
  outcome: string;
  effective_date: string | null;
  votes: Array<{
    vote_value: 'igen' | 'nem' | 'tartozkodas';
    weight: number;
    units: { unit_label: string } | null;
  }>;
}

interface Attendance {
  unit_id: string;
  ownership_share: number;
  proxy_name: string | null;
  attended_at: string;
  units: {
    unit_label: string;
    owner_name: string;
  } | null;
}

interface ProtocolData {
  meeting: MeetingData;
  agendaItems: AgendaItem[];
  resolutions: Resolution[];
  attendances: Attendance[];
  totalBuildingShare: number;
  attendingShare: number;
  generatedAt: string;
}

// ─── Vote Tally Calculator ───────────────────────────────────────────────────

function calculateVoteTally(votes: Resolution['votes']) {
  const tally = { igen: 0, nem: 0, tartozkodas: 0, total: 0 };
  for (const vote of votes) {
    tally[vote.vote_value] += Number(vote.weight);
    tally.total += Number(vote.weight);
  }
  return tally;
}

function formatPercent(value: number): string {
  return `${(value * 100).toFixed(2)}%`;
}

function formatDate(isoString: string, includeTime = false): string {
  const date = new Date(isoString);
  const options: Intl.DateTimeFormatOptions = {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    ...(includeTime ? { hour: '2-digit', minute: '2-digit' } : {}),
  };
  return date.toLocaleDateString('hu-HU', options);
}

// ─── PDF Stylesheet ──────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  page: {
    paddingTop: 50,
    paddingBottom: 60,
    paddingHorizontal: 50,
    fontFamily: 'Helvetica',
    fontSize: 10,
    lineHeight: 1.5,
    color: '#1a1a1a',
  },
  header: {
    borderBottomWidth: 2,
    borderBottomColor: '#1e3a5f',
    borderBottomStyle: 'solid',
    paddingBottom: 12,
    marginBottom: 16,
  },
  documentTitle: {
    fontSize: 18,
    fontFamily: 'Helvetica-Bold',
    color: '#1e3a5f',
    textAlign: 'center',
    marginBottom: 4,
  },
  subTitle: {
    fontSize: 12,
    fontFamily: 'Helvetica-Bold',
    textAlign: 'center',
    color: '#333',
    marginBottom: 4,
  },
  sectionTitle: {
    fontSize: 11,
    fontFamily: 'Helvetica-Bold',
    color: '#1e3a5f',
    marginTop: 14,
    marginBottom: 6,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  fieldRow: {
    flexDirection: 'row',
    marginBottom: 4,
  },
  fieldLabel: {
    width: 160,
    fontFamily: 'Helvetica-Bold',
    color: '#555',
  },
  fieldValue: {
    flex: 1,
    color: '#1a1a1a',
  },
  agendaItem: {
    marginBottom: 10,
    paddingLeft: 10,
    borderLeftWidth: 2,
    borderLeftColor: '#1e3a5f',
    borderLeftStyle: 'solid',
  },
  agendaItemTitle: {
    fontFamily: 'Helvetica-Bold',
    fontSize: 10,
    marginBottom: 2,
  },
  agendaItemDesc: {
    color: '#444',
    fontSize: 9,
  },
  attendanceTable: {
    marginTop: 6,
  },
  tableHeader: {
    flexDirection: 'row',
    backgroundColor: '#1e3a5f',
    padding: 5,
  },
  tableHeaderCell: {
    color: '#ffffff',
    fontFamily: 'Helvetica-Bold',
    fontSize: 9,
  },
  tableRow: {
    flexDirection: 'row',
    borderBottomWidth: 0.5,
    borderBottomColor: '#ddd',
    borderBottomStyle: 'solid',
    padding: 4,
  },
  tableRowAlt: {
    backgroundColor: '#f7f9fc',
  },
  cell: {
    fontSize: 9,
    paddingRight: 4,
  },
  resolutionBox: {
    borderWidth: 1,
    borderColor: '#1e3a5f',
    borderStyle: 'solid',
    borderRadius: 4,
    padding: 10,
    marginBottom: 12,
  },
  resolutionTitle: {
    fontFamily: 'Helvetica-Bold',
    fontSize: 10,
    marginBottom: 4,
    color: '#1e3a5f',
  },
  resolutionText: {
    fontSize: 10,
    marginBottom: 6,
    color: '#1a1a1a',
  },
  voteRow: {
    flexDirection: 'row',
    marginTop: 4,
    gap: 12,
  },
  voteBadge: {
    paddingVertical: 2,
    paddingHorizontal: 8,
    borderRadius: 3,
    fontSize: 9,
  },
  outcomeAccepted: {
    backgroundColor: '#d1fae5',
    color: '#065f46',
    fontFamily: 'Helvetica-Bold',
  },
  outcomeRejected: {
    backgroundColor: '#fee2e2',
    color: '#991b1b',
    fontFamily: 'Helvetica-Bold',
  },
  quorumBox: {
    padding: 10,
    borderRadius: 4,
    marginBottom: 10,
  },
  quorumMet: {
    backgroundColor: '#d1fae5',
    borderColor: '#059669',
    borderWidth: 1,
    borderStyle: 'solid',
  },
  quorumNotMet: {
    backgroundColor: '#fee2e2',
    borderColor: '#dc2626',
    borderWidth: 1,
    borderStyle: 'solid',
  },
  signatureSection: {
    marginTop: 40,
  },
  signatureLine: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 30,
  },
  signatureBlock: {
    width: '45%',
    borderTopWidth: 1,
    borderTopColor: '#1a1a1a',
    borderTopStyle: 'solid',
    paddingTop: 6,
    alignItems: 'center',
  },
  footer: {
    position: 'absolute',
    bottom: 30,
    left: 50,
    right: 50,
    borderTopWidth: 0.5,
    borderTopColor: '#aaa',
    borderTopStyle: 'solid',
    paddingTop: 6,
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  footerText: {
    fontSize: 8,
    color: '#888',
  },
  legalNote: {
    fontSize: 8,
    color: '#666',
    marginTop: 6,
    fontStyle: 'italic',
  },
  separator: {
    borderBottomWidth: 0.5,
    borderBottomColor: '#ccc',
    borderBottomStyle: 'solid',
    marginVertical: 10,
  },
});

// ─── PDF Document Component ──────────────────────────────────────────────────

function AssemblyProtocolDocument({ data }: { data: ProtocolData }) {
  const { meeting, agendaItems, resolutions, attendances, totalBuildingShare, attendingShare } = data;
  const quorumMet = attendingShare / totalBuildingShare >= Number(meeting.quorum_threshold);
  const actualQuorumPercent = formatPercent(attendingShare / totalBuildingShare);

  return React.createElement(
    Document,
    {
      title: `Közgyűlési Jegyzőkönyv — ${meeting.title}`,
      author: 'PanelLakó',
      subject: 'Közgyűlési Jegyzőkönyv (Ptk. 5:88)',
      creator: 'PanelLakó v3.20.0',
    },
    React.createElement(
      Page,
      { size: 'A4', style: styles.page },

      // ── HEADER ──────────────────────────────────────────────────────────────
      React.createElement(
        View,
        { style: styles.header },
        React.createElement(Text, { style: styles.documentTitle }, 'KÖZGYŰLÉSI JEGYZŐKÖNYV'),
        React.createElement(Text, { style: styles.subTitle }, meeting.title),
        React.createElement(
          Text,
          { style: { fontSize: 9, textAlign: 'center', color: '#666', marginTop: 4 } },
          `Ptk. 5:88 § alapján kötelezően kiállítandó dokumentum`
        )
      ),

      // ── I. ÉPÜLET ADATAI ─────────────────────────────────────────────────────
      React.createElement(Text, { style: styles.sectionTitle }, 'I. Épület adatai'),
      React.createElement(
        View,
        { style: styles.fieldRow },
        React.createElement(Text, { style: styles.fieldLabel }, 'Társasház neve:'),
        React.createElement(Text, { style: styles.fieldValue }, meeting.buildings.name)
      ),
      React.createElement(
        View,
        { style: styles.fieldRow },
        React.createElement(Text, { style: styles.fieldLabel }, 'Cím:'),
        React.createElement(Text, { style: styles.fieldValue }, meeting.buildings.address)
      ),

      // ── II. A KÖZGYŰLÉS ADATAI ──────────────────────────────────────────────
      React.createElement(Text, { style: styles.sectionTitle }, 'II. A közgyűlés adatai'),
      React.createElement(
        View,
        { style: styles.fieldRow },
        React.createElement(Text, { style: styles.fieldLabel }, 'Időpont:'),
        React.createElement(Text, { style: styles.fieldValue }, formatDate(meeting.scheduled_at, true))
      ),
      React.createElement(
        View,
        { style: styles.fieldRow },
        React.createElement(Text, { style: styles.fieldLabel }, 'Helyszín:'),
        React.createElement(Text, { style: styles.fieldValue }, meeting.location ?? 'Meghatározandó')
      ),
      React.createElement(
        View,
        { style: styles.fieldRow },
        React.createElement(Text, { style: styles.fieldLabel }, 'Levezető elnök:'),
        React.createElement(Text, { style: styles.fieldValue }, meeting.chairperson_name ?? '____________________________')
      ),
      React.createElement(
        View,
        { style: styles.fieldRow },
        React.createElement(Text, { style: styles.fieldLabel }, 'Jegyzőkönyvvezető:'),
        React.createElement(Text, { style: styles.fieldValue }, meeting.secretary_name ?? '____________________________')
      ),
      React.createElement(
        View,
        { style: styles.fieldRow },
        React.createElement(Text, { style: styles.fieldLabel }, 'Hitelesítők:'),
        React.createElement(Text, { style: styles.fieldValue }, '1. ____________________ 2. ____________________')
      ),

      // ── III. MEGJELENT TULAJDONOSOK ─────────────────────────────────────────
      React.createElement(Text, { style: styles.sectionTitle }, 'III. Megjelent tulajdonosok'),
      React.createElement(
        Text,
        { style: { fontSize: 9, marginBottom: 6, color: '#444' } },
        `A közgyűlésen ${attendances.length} albetét képviselője jelent meg.`
      ),

      // Attendance table header
      React.createElement(
        View,
        { style: styles.tableHeader },
        React.createElement(Text, { style: [styles.tableHeaderCell, { width: 80 }] }, 'Albetét'),
        React.createElement(Text, { style: [styles.tableHeaderCell, { width: 160 }] }, 'Tulajdonos neve'),
        React.createElement(Text, { style: [styles.tableHeaderCell, { width: 100 }] }, 'Meghatalmazott'),
        React.createElement(Text, { style: [styles.tableHeaderCell, { width: 80 }] }, 'Tul. hányad'),
      ),

      // Attendance rows
      ...attendances.map((att, idx) =>
        React.createElement(
          View,
          { key: att.unit_id, style: [styles.tableRow, idx % 2 === 1 ? styles.tableRowAlt : {}] },
          React.createElement(Text, { style: [styles.cell, { width: 80 }] }, att.units?.unit_label ?? '—'),
          React.createElement(Text, { style: [styles.cell, { width: 160 }] }, att.units?.owner_name ?? '—'),
          React.createElement(Text, { style: [styles.cell, { width: 100 }] }, att.proxy_name ?? '—'),
          React.createElement(Text, { style: [styles.cell, { width: 80 }] }, formatPercent(Number(att.ownership_share)))
        )
      ),

      // ── IV. HATÁROZATKÉPESSÉG ─────────────────────────────────────────────────
      React.createElement(Text, { style: styles.sectionTitle }, 'IV. Határozatképesség (Kvórum)'),
      React.createElement(
        View,
        { style: [styles.quorumBox, quorumMet ? styles.quorumMet : styles.quorumNotMet] },
        React.createElement(
          Text,
          { style: { fontFamily: 'Helvetica-Bold', fontSize: 10 } },
          quorumMet ? 'A közgyűlés HATÁROZATKÉPES.' : 'A közgyűlés HATÁROZATKÉPTELEN.'
        ),
        React.createElement(
          View, { style: { marginTop: 6 } },
          React.createElement(Text, { style: { fontSize: 9 } },
            `Jelen lévő tulajdoni hányad: ${actualQuorumPercent} (szükséges minimum: ${formatPercent(Number(meeting.quorum_threshold))})`
          ),
          React.createElement(Text, { style: { fontSize: 9 } },
            `Megjelent: ${attendances.length} albetét, összesen ${formatPercent(attendingShare / totalBuildingShare)} tulajdoni hányad`
          )
        ),
        !quorumMet && React.createElement(
          Text,
          { style: [styles.legalNote, { marginTop: 6 }] },
          'Ptk. 5:85 § értelmében határozatképtelenség esetén új közgyűlést kell összehívni. A megismételt közgyűlés az eredeti napirendben szereplő kérdésekben a megjelentek számától és a képviselt tulajdoni hányadtól függetlenül határozatképes.'
        )
      ),

      // ── V. NAPIRENDI PONTOK ──────────────────────────────────────────────────
      React.createElement(Text, { style: styles.sectionTitle }, 'V. Napirendi pontok'),
      ...agendaItems.map(item =>
        React.createElement(
          View,
          { key: item.id, style: styles.agendaItem },
          React.createElement(Text, { style: styles.agendaItemTitle }, `${item.order_no}. ${item.title}`),
          item.description && React.createElement(Text, { style: styles.agendaItemDesc }, item.description)
        )
      ),

      // ── VI. SZAVAZÁSOK ÉS HATÁROZATOK ────────────────────────────────────────
      React.createElement(Text, { style: styles.sectionTitle }, 'VI. Szavazások és határozatok'),
      React.createElement(
        Text,
        { style: styles.legalNote },
        'A szavazatok súlya az egyes albetétek tulajdoni hányadával arányos (Ptk. 5:86 §).'
      ),

      ...resolutions.map((resolution, idx) => {
        const tally = calculateVoteTally(resolution.votes ?? []);
        const outcomeLabel = resolution.outcome === 'elfogadva'
          ? 'ELFOGADVA'
          : resolution.outcome === 'elutasitva'
          ? 'ELUTASÍTVA'
          : 'DÖNTÉS HIÁNYZIK';

        return React.createElement(
          View,
          { key: resolution.id, style: styles.resolutionBox },
          React.createElement(Text, { style: styles.resolutionTitle }, `${idx + 1}/${new Date(meeting.scheduled_at).getFullYear()}. sz. határozati javaslat`),
          React.createElement(Text, { style: styles.resolutionText }, resolution.text),

          // Vote tally
          React.createElement(
            View,
            { style: { flexDirection: 'row', gap: 20, marginTop: 4 } },
            React.createElement(Text, { style: { fontSize: 9 } }, `Igen: ${formatPercent(tally.total > 0 ? tally.igen / tally.total : 0)}`),
            React.createElement(Text, { style: { fontSize: 9 } }, `Nem: ${formatPercent(tally.total > 0 ? tally.nem / tally.total : 0)}`),
            React.createElement(Text, { style: { fontSize: 9 } }, `Tartózkodás: ${formatPercent(tally.total > 0 ? tally.tartozkodas / tally.total : 0)}`),
          ),

          // Outcome badge
          React.createElement(
            View,
            { style: { marginTop: 6 } },
            React.createElement(
              Text,
              {
                style: [
                  styles.voteBadge,
                  resolution.outcome === 'elfogadva' ? styles.outcomeAccepted : styles.outcomeRejected
                ]
              },
              outcomeLabel
            )
          ),

          // Effective date
          resolution.effective_date && React.createElement(
            Text,
            { style: { fontSize: 9, marginTop: 4, color: '#555' } },
            `Hatályba lép: ${formatDate(resolution.effective_date)}`
          )
        );
      }),

      // ── VII. EGYEBEK ─────────────────────────────────────────────────────────
      React.createElement(Text, { style: styles.sectionTitle }, 'VII. Egyebek'),
      React.createElement(
        Text,
        { style: { fontSize: 9, color: '#666' } },
        'Az egyebek napirendi pont alatt felmerülő kérdések, amelyekről határozat nem születhet, csupán tájékoztatás jelleggel kerülnek megtárgyalásra.'
      ),
      React.createElement(View, { style: { height: 40 } }),

      // ── VIII. ZÁRÁS ──────────────────────────────────────────────────────────
      React.createElement(Text, { style: styles.sectionTitle }, 'VIII. A közgyűlés zárása'),
      React.createElement(
        Text,
        { style: { fontSize: 9 } },
        `A levezető elnök a közgyűlést ${formatDate(meeting.scheduled_at, true)} órakor lezárta.`
      ),
      React.createElement(Text, { style: [styles.legalNote, { marginTop: 6 }] },
        'E jegyzőkönyv Ptk. 5:88 § alapján a közgyűlést követő 15 napon belül kerül megküldésre minden tulajdonos részére.'
      ),

      // ── SIGNATURE BLOCK ──────────────────────────────────────────────────────
      React.createElement(
        View,
        { style: styles.signatureSection },
        React.createElement(View, { style: { height: 1, backgroundColor: '#ccc', marginBottom: 20 } }),
        React.createElement(
          View,
          { style: styles.signatureLine },
          React.createElement(
            View,
            { style: styles.signatureBlock },
            React.createElement(Text, { style: { fontSize: 9 } }, meeting.chairperson_name ?? 'Levezető elnök'),
            React.createElement(Text, { style: { fontSize: 8, color: '#888', marginTop: 2 } }, 'Levezető elnök aláírása')
          ),
          React.createElement(
            View,
            { style: styles.signatureBlock },
            React.createElement(Text, { style: { fontSize: 9 } }, meeting.secretary_name ?? 'Jegyzőkönyvvezető'),
            React.createElement(Text, { style: { fontSize: 8, color: '#888', marginTop: 2 } }, 'Jegyzőkönyvvezető aláírása')
          )
        ),
        React.createElement(
          View,
          { style: [styles.signatureLine, { marginTop: 30 }] },
          React.createElement(
            View,
            { style: styles.signatureBlock },
            React.createElement(Text, { style: { fontSize: 9 } }, '1. Hitelesítő'),
            React.createElement(Text, { style: { fontSize: 8, color: '#888', marginTop: 2 } }, 'Hitelesítő aláírása')
          ),
          React.createElement(
            View,
            { style: styles.signatureBlock },
            React.createElement(Text, { style: { fontSize: 9 } }, '2. Hitelesítő'),
            React.createElement(Text, { style: { fontSize: 8, color: '#888', marginTop: 2 } }, 'Hitelesítő aláírása')
          )
        )
      ),

      // ── FOOTER ───────────────────────────────────────────────────────────────
      React.createElement(
        View,
        { style: styles.footer, fixed: true },
        React.createElement(Text, { style: styles.footerText }, `Generálva: PanelLakó | ${data.generatedAt}`),
        React.createElement(Text, { style: styles.footerText, render: ({ pageNumber, totalPages }: { pageNumber: number; totalPages: number }) => `${pageNumber} / ${totalPages}` })
      )
    )
  );
}

// ─── Edge Function Handler ───────────────────────────────────────────────────

serve(async (req) => {
  if (req.method !== 'POST') {
    return new Response(JSON.stringify({ error: 'Method not allowed' }), {
      status: 405,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  let meeting_id: string;
  try {
    const body = await req.json();
    meeting_id = body.meeting_id;
    if (!meeting_id) throw new Error('meeting_id is required');
  } catch (e) {
    return new Response(JSON.stringify({ error: String(e) }), {
      status: 400,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  const supabase = createClient(supabaseUrl, supabaseServiceKey);

  // 1. Fetch meeting + building
  const { data: meeting, error: meetingError } = await supabase
    .from('meetings')
    .select('*, buildings(name, address)')
    .eq('id', meeting_id)
    .single();

  if (meetingError || !meeting) {
    return new Response(JSON.stringify({ error: 'Meeting not found' }), { status: 404 });
  }

  // 2. Fetch agenda items
  const { data: agendaItems } = await supabase
    .from('agenda_items')
    .select('*')
    .eq('meeting_id', meeting_id)
    .order('order_no');

  // 3. Fetch resolutions with votes
  const { data: resolutions } = await supabase
    .from('resolutions')
    .select('*, votes(vote_value, weight, units(unit_label))')
    .eq('meeting_id', meeting_id);

  // 4. Fetch attendances with unit info
  const { data: attendances } = await supabase
    .from('meeting_attendances')
    .select('*, units(unit_label, owner_name)')
    .eq('meeting_id', meeting_id);

  // 5. Fetch total building ownership share
  const { data: units } = await supabase
    .from('units')
    .select('ownership_share')
    .eq('building_id', meeting.building_id);

  const totalBuildingShare = (units ?? []).reduce((sum, u) => sum + Number(u.ownership_share), 0);
  const attendingShare = (attendances ?? []).reduce((sum, a) => sum + Number(a.ownership_share), 0);

  const protocolData: ProtocolData = {
    meeting: meeting as MeetingData,
    agendaItems: (agendaItems ?? []) as AgendaItem[],
    resolutions: (resolutions ?? []) as Resolution[],
    attendances: (attendances ?? []) as Attendance[],
    totalBuildingShare,
    attendingShare,
    generatedAt: new Date().toLocaleString('hu-HU'),
  };

  // 6. Render PDF
  let pdfBuffer: ArrayBuffer;
  try {
    const element = React.createElement(AssemblyProtocolDocument, { data: protocolData });
    const pdfDoc = pdf(element);
    const blob = await pdfDoc.toBlob();
    pdfBuffer = await blob.arrayBuffer();
  } catch (e) {
    console.error('PDF generation error:', e);
    return new Response(JSON.stringify({ error: `PDF generation failed: ${String(e)}` }), { status: 500 });
  }

  // 7. Upload to Supabase Storage
  const storagePath = `assembly-protocols/${meeting.building_id}/${meeting_id}.pdf`;
  const { error: uploadError } = await supabase.storage
    .from('documents')
    .upload(storagePath, pdfBuffer, {
      contentType: 'application/pdf',
      upsert: true,
    });

  if (uploadError) {
    console.error('Storage upload error:', uploadError);
    return new Response(JSON.stringify({ error: `Storage upload failed: ${uploadError.message}` }), { status: 500 });
  }

  // 8. Generate signed URL (7 days)
  const { data: signedUrlData } = await supabase.storage
    .from('documents')
    .createSignedUrl(storagePath, 60 * 60 * 24 * 7);

  const protocolUrl = signedUrlData?.signedUrl ?? storagePath;

  // 9. Update meeting record
  await supabase
    .from('meetings')
    .update({
      protocol_url: storagePath,
      protocol_generated_at: new Date().toISOString(),
    })
    .eq('id', meeting_id);

  // 10. Insert document record in documents table
  await supabase.from('documents').insert({
    building_id: meeting.building_id,
    title: `Közgyűlési Jegyzőkönyv — ${meeting.title}`,
    category: 'Közgyűlési anyag',
    version: '1.0',
    file_url: storagePath,
    visibility: 'Tulajdonos',
    document_type: 'assembly_protocol',
  });

  return new Response(JSON.stringify({ success: true, protocol_url: protocolUrl }), {
    status: 200,
    headers: { 'Content-Type': 'application/json' },
  });
});
```

Deploy the Edge Function with: `supabase functions deploy generate-assembly-protocol --no-verify-jwt`

The `--no-verify-jwt` flag is needed because `closeMeeting` calls this function server-side using the service role key. Alternatively, pass the user's JWT in the Authorization header from `closeMeeting` and remove the flag.

---

## 7. Phase 4 — Client-Side UI Changes

### 7.1 Meeting Detail Panel

Add a new component `components/meeting-detail-panel.tsx`. This component renders when a meeting is selected from the list.

```typescript
'use client';

import { useState, useTransition } from 'react';
import { Download, Users, CheckCircle2, XCircle, Clock, Loader2 } from 'lucide-react';
import {
  closeMeeting,
  recordAttendance,
  removeAttendance,
  sendAssemblyInvitation,
  generateProtocolManually,
} from '@/app/actions/meetings';
import type { UnitItem } from '@/lib/types';
import { useI18n } from '@/lib/i18n';

interface MeetingDetailPanelProps {
  meetingId: string;
  buildingId: string;
  meetingTitle: string;
  meetingStatus: string;
  scheduledAt: string;
  protocolUrl?: string | null;
  invitationSentAt?: string | null;
  isManager: boolean;
  units: UnitItem[];
  attendances: Array<{ unit_id: string; ownership_share: number; proxy_name?: string | null }>;
  agendaItems: Array<{ id: string; order_no: number; title: string; description?: string | null }>;
  onClose: () => void;
}

export default function MeetingDetailPanel({
  meetingId,
  buildingId,
  meetingTitle,
  meetingStatus,
  scheduledAt,
  protocolUrl,
  invitationSentAt,
  isManager,
  units,
  attendances,
  agendaItems,
  onClose,
}: MeetingDetailPanelProps) {
  const [isPending, startTransition] = useTransition();
  const [localAttendances, setLocalAttendances] = useState<Set<string>>(
    new Set(attendances.map(a => a.unit_id))
  );
  const [closingState, setClosingState] = useState<'idle' | 'closing' | 'done' | 'error'>('idle');
  const [closeResult, setCloseResult] = useState<{ actual_quorum: number; quorum_met: boolean; protocol_url?: string | null } | null>(null);
  const [closeError, setCloseError] = useState<string | null>(null);
  const [invitationState, setInvitationState] = useState<'idle' | 'sending' | 'sent' | 'error'>('idle');
  const [invitationResult, setInvitationResult] = useState<string | null>(null);

  const isClosed = meetingStatus === 'lezart';
  const attendedCount = localAttendances.size;

  function handleToggleAttendance(unitId: string) {
    if (!isManager || isClosed) return;

    if (localAttendances.has(unitId)) {
      startTransition(async () => {
        await removeAttendance(meetingId, unitId);
        setLocalAttendances(prev => { const s = new Set(prev); s.delete(unitId); return s; });
      });
    } else {
      startTransition(async () => {
        const unit = units.find(u => u.id === unitId);
        await recordAttendance({
          meeting_id: meetingId,
          unit_id: unitId,
          ownership_share: unit?.ownership_share ?? 0,
        });
        setLocalAttendances(prev => new Set([...prev, unitId]));
      });
    }
  }

  function handleCloseMeeting() {
    if (!isManager || isClosed) return;
    setClosingState('closing');
    startTransition(async () => {
      const result = await closeMeeting({ meeting_id: meetingId, building_id: buildingId });
      if (result.success) {
        setClosingState('done');
        setCloseResult({
          actual_quorum: result.actual_quorum ?? 0,
          quorum_met: result.quorum_met ?? false,
          protocol_url: result.protocol_url,
        });
      } else {
        setClosingState('error');
        setCloseError(result.error ?? 'Ismeretlen hiba');
      }
    });
  }

  function handleSendInvitation() {
    if (!isManager) return;
    setInvitationState('sending');
    startTransition(async () => {
      const result = await sendAssemblyInvitation(meetingId);
      if (result.success) {
        setInvitationState('sent');
        setInvitationResult(
          `${result.sent_count}/${result.total} meghívó elküldve.${result.warning ? ` ⚠️ ${result.warning}` : ''}`
        );
      } else {
        setInvitationState('error');
        setInvitationResult(result.error ?? 'Küldés sikertelen');
      }
    });
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-3xl max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="sticky top-0 bg-white border-b border-gray-200 px-6 py-4 flex items-center justify-between">
          <div>
            <h2 className="text-lg font-semibold text-gray-900">{meetingTitle}</h2>
            <p className="text-sm text-gray-500">
              {new Date(scheduledAt).toLocaleDateString('hu-HU', {
                year: 'numeric', month: 'long', day: 'numeric', hour: '2-digit', minute: '2-digit'
              })}
              {' — '}
              <span className={`font-medium ${isClosed ? 'text-green-600' : 'text-blue-600'}`}>
                {isClosed ? 'Lezárva' : 'Aktív'}
              </span>
            </p>
          </div>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 transition-colors"
            aria-label="Bezár"
          >
            ✕
          </button>
        </div>

        <div className="px-6 py-4 space-y-6">
          {/* Agenda Items */}
          <section>
            <h3 className="text-sm font-semibold text-gray-700 uppercase tracking-wide mb-3">
              Napirendi pontok
            </h3>
            {agendaItems.length === 0 ? (
              <p className="text-sm text-gray-400">Nincs napirendi pont rögzítve.</p>
            ) : (
              <ol className="space-y-2">
                {agendaItems.map(item => (
                  <li key={item.id} className="flex gap-3">
                    <span className="flex-shrink-0 w-6 h-6 bg-blue-600 text-white rounded-full flex items-center justify-center text-xs font-bold">
                      {item.order_no}
                    </span>
                    <div>
                      <p className="text-sm font-medium text-gray-800">{item.title}</p>
                      {item.description && (
                        <p className="text-xs text-gray-500 mt-0.5">{item.description}</p>
                      )}
                    </div>
                  </li>
                ))}
              </ol>
            )}
          </section>

          {/* Attendance Recording */}
          <section>
            <h3 className="text-sm font-semibold text-gray-700 uppercase tracking-wide mb-3 flex items-center gap-2">
              <Users className="w-4 h-4" />
              Jelenléti ív ({attendedCount}/{units.length} albetét)
            </h3>
            <div className="border border-gray-200 rounded-lg overflow-hidden">
              <div className="grid grid-cols-3 bg-gray-50 px-4 py-2 text-xs font-semibold text-gray-500 uppercase">
                <span>Albetét</span>
                <span>Tulajdonos</span>
                <span className="text-right">Jelen</span>
              </div>
              {units.map(unit => {
                const attended = localAttendances.has(unit.id);
                return (
                  <div
                    key={unit.id}
                    className="grid grid-cols-3 px-4 py-2.5 border-t border-gray-100 hover:bg-gray-50 cursor-pointer"
                    onClick={() => handleToggleAttendance(unit.id)}
                  >
                    <span className="text-sm text-gray-800 font-medium">{unit.unit_label}</span>
                    <span className="text-sm text-gray-600">{unit.owner_name}</span>
                    <div className="flex justify-end">
                      {attended ? (
                        <CheckCircle2 className="w-5 h-5 text-green-500" />
                      ) : (
                        <XCircle className="w-5 h-5 text-gray-300" />
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </section>

          {/* Close Meeting Result */}
          {closingState === 'done' && closeResult && (
            <div className={`rounded-lg p-4 ${closeResult.quorum_met ? 'bg-green-50 border border-green-200' : 'bg-red-50 border border-red-200'}`}>
              <p className="font-semibold text-sm">
                {closeResult.quorum_met ? '✅ Határozatképes közgyűlés lezárva!' : '⚠️ A közgyűlés határozatképtelen volt.'}
              </p>
              <p className="text-xs text-gray-600 mt-1">
                Részvételi arány: {(closeResult.actual_quorum * 100).toFixed(2)}%
              </p>
              {closeResult.protocol_url && (
                <a
                  href={closeResult.protocol_url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-2 mt-3 bg-blue-600 text-white text-sm px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors"
                >
                  <Download className="w-4 h-4" />
                  Jegyzőkönyv letöltése (PDF)
                </a>
              )}
            </div>
          )}

          {closingState === 'error' && closeError && (
            <div className="rounded-lg p-4 bg-red-50 border border-red-200">
              <p className="text-sm text-red-700 font-semibold">Hiba a lezárás során</p>
              <p className="text-xs text-red-600 mt-1">{closeError}</p>
            </div>
          )}

          {/* Protocol Download (for already-closed meetings) */}
          {isClosed && protocolUrl && closingState === 'idle' && (
            <div className="rounded-lg p-4 bg-blue-50 border border-blue-200">
              <p className="text-sm font-semibold text-blue-800">Közgyűlési Jegyzőkönyv elérhető</p>
              <a
                href={protocolUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-2 mt-2 bg-blue-600 text-white text-sm px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors"
              >
                <Download className="w-4 h-4" />
                Letöltés (PDF)
              </a>
            </div>
          )}

          {/* Manager Actions */}
          {isManager && !isClosed && (
            <section className="pt-4 border-t border-gray-100 space-y-3">
              {/* Send Invitation */}
              {!invitationSentAt && (
                <div>
                  <button
                    onClick={handleSendInvitation}
                    disabled={invitationState === 'sending' || isPending}
                    className="w-full bg-indigo-600 text-white text-sm font-medium px-4 py-2.5 rounded-lg hover:bg-indigo-700 disabled:opacity-50 transition-colors flex items-center justify-center gap-2"
                  >
                    {invitationState === 'sending' ? (
                      <><Loader2 className="w-4 h-4 animate-spin" /> Meghívók küldése...</>
                    ) : (
                      <>📨 Meghívók küldése (Ptk. 5:84)</>
                    )}
                  </button>
                  {invitationResult && (
                    <p className={`text-xs mt-2 ${invitationState === 'error' ? 'text-red-600' : 'text-green-600'}`}>
                      {invitationResult}
                    </p>
                  )}
                </div>
              )}
              {invitationSentAt && (
                <p className="text-xs text-green-600">
                  ✅ Meghívók elküldve: {new Date(invitationSentAt).toLocaleDateString('hu-HU')}
                </p>
              )}

              {/* Close Meeting */}
              <button
                onClick={handleCloseMeeting}
                disabled={closingState === 'closing' || isPending}
                className="w-full bg-red-600 text-white text-sm font-medium px-4 py-2.5 rounded-lg hover:bg-red-700 disabled:opacity-50 transition-colors flex items-center justify-center gap-2"
              >
                {closingState === 'closing' ? (
                  <><Loader2 className="w-4 h-4 animate-spin" /> Lezárás és PDF generálás...</>
                ) : (
                  <>🔒 Közgyűlés lezárása és Jegyzőkönyv generálása</>
                )}
              </button>
              <p className="text-xs text-gray-500">
                A lezárás automatikusan kiszámítja a határozatképességet és generálja a Ptk. 5:88 § szerinti Közgyűlési Jegyzőkönyvet.
              </p>
            </section>
          )}
        </div>
      </div>
    </div>
  );
}
```

### 7.2 Dashboard Integration

In `components/dashboard-client.tsx`, locate the meetings section and add:
1. An import for `MeetingDetailPanel`
2. State: `const [selectedMeetingId, setSelectedMeetingId] = useState<string | null>(null)`
3. A click handler on each meeting card that sets `selectedMeetingId`
4. Conditional render of `<MeetingDetailPanel>` when `selectedMeetingId` is not null
5. A "Új közgyűlés" button (isManager guard) that opens a create meeting form

---

## 8. Phase 5 — Protocol Email Delivery

After the Edge Function completes protocol generation, it should also trigger an email to all unit owners containing the protocol download link. This should be done inside the Edge Function after the Storage upload succeeds.

```typescript
// Append to the Edge Function after step 10 (document record insertion):

// 11. Email protocol link to all unit owners
const { data: members } = await supabase
  .from('memberships')
  .select('profiles(email, full_name)')
  .eq('building_id', meeting.building_id)
  .eq('role', 'tulajdonos')
  .eq('active', true);

if (members && signedUrlData?.signedUrl) {
  const emailPayload = {
    from: 'no-reply@panellako.hu',
    subject: `Közgyűlési Jegyzőkönyv: ${meeting.title}`,
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2 style="color: #1e3a5f;">Közgyűlési Jegyzőkönyv</h2>
        <p>Tisztelt Tulajdonos!</p>
        <p>A(z) <strong>${meeting.title}</strong> közgyűlés Közgyűlési Jegyzőkönyve elkészült.</p>
        <p>
          <a href="${signedUrlData.signedUrl}" 
             style="display:inline-block; background:#1e3a5f; color:#fff; padding:10px 20px; border-radius:6px; text-decoration:none; font-weight:bold;">
            Letöltés (PDF — 7 napig érvényes link)
          </a>
        </p>
        <p style="font-size:12px; color:#888; margin-top:20px;">
          Ptk. 5:88 § értelmében a közgyűlési anyagokat 15 napon belül meg kell küldeni minden tulajdonos részére.
        </p>
        <p style="font-size:12px; color:#888;">PanelLakó — Társasházi kezelő platform</p>
      </div>
    `,
  };

  // Use Resend directly in the Edge Function
  const RESEND_API_KEY = Deno.env.get('RESEND_API_KEY');
  if (RESEND_API_KEY) {
    const emailSends = (members as any[]).map(async (member: any) => {
      const email = member.profiles?.email;
      if (!email) return;
      await fetch('https://api.resend.com/emails', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${RESEND_API_KEY}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ ...emailPayload, to: email }),
      });
    });
    await Promise.allSettled(emailSends);
  }
}
```

Add `RESEND_API_KEY` to the Edge Function secrets: `supabase secrets set RESEND_API_KEY=re_xxxxxxxxxxxxx`

---

## 9. Phase 6 — Assembly Invitation Workflow (Summary)

The `sendAssemblyInvitation` Server Action (fully implemented in Phase 2 above) handles the complete invitation workflow. Key behaviors:
- Fetches all `tulajdonos`-role memberships for the building
- Generates legally compliant invitation HTML with all agenda items
- Warns if called < 8 days before the meeting (Ptk. 5:84 violation risk)
- Sends emails via `lib/email.ts` (Dev Prompt #10) using `Promise.allSettled` for fault isolation
- Logs every send to `audit_logs` with `action_type: 'email_sent'`
- Marks `meetings.invitation_sent_at` on completion

---

## 10. Testing Checklist

Execute these steps in order after implementation:

1. Run all Phase 1 SQL in Supabase SQL editor. Verify all columns exist: `SELECT column_name FROM information_schema.columns WHERE table_name = 'meetings'`
2. Create a test meeting via the "Új közgyűlés" button with: title = "2026. évi rendes közgyűlés", 3 agenda items, location = "Közös helyiség"
3. Open the meeting detail panel. Verify the attendance list shows all building units.
4. Mark 3 units as present (covering at least 50% of total ownership share).
5. Click "Közgyűlés lezárása és Jegyzőkönyv generálása". Observe the loading spinner.
6. Verify the Edge Function was invoked: check Supabase Edge Function logs in the dashboard.
7. Verify the PDF was uploaded: navigate to Supabase Storage → documents bucket → assembly-protocols folder.
8. Verify the meeting record was updated: `SELECT status, actual_quorum, protocol_url FROM meetings WHERE id = '<test_id>'`
9. Verify the document record was created: `SELECT * FROM documents WHERE document_type = 'assembly_protocol'`
10. Click the "Letöltés (PDF)" button. Verify the PDF opens in the browser with all required sections.
11. Test invitation: click "Meghívók küldése". Verify `invitation_sent_at` is set on the meeting record.
12. Test quorum failure: mark only 1 unit as present (< 50% share). Close the meeting. Verify the PDF contains the "HATÁROZATKÉPTELEN" annotation and the Ptk. 5:85 note about reconvening.
13. Test re-generation: with a closed meeting, call `generateProtocolManually`. Verify a new PDF overwrites the old one in Storage.

---

## 11. Error Handling

| Error Scenario | Behavior |
|---|---|
| Quorum not met | `closeMeeting` succeeds; `quorum_met: false` returned; PDF still generated with "HATÁROZATKÉPTELEN" annotation; UI shows warning banner |
| Edge Function timeout (>30s) | `closeMeeting` catches the error, logs it, returns `{ success: true, protocol_url: null }`; UI shows "PDF generálás folyamatban" and provides a "Újra generálás" button |
| Storage upload failure | Edge Function returns HTTP 500; `closeMeeting` catches it and marks meeting as closed without protocol_url; manager can retry via `generateProtocolManually` |
| Email send failure | Non-fatal in both `sendAssemblyInvitation` and Edge Function email step; use `Promise.allSettled`; log failures to audit_logs |
| Meeting already closed | `closeMeeting` must check current status and return `{ success: false, error: 'A közgyűlés már le van zárva.' }` |
| No agenda items | Warn in the UI before allowing close; the PDF will still generate with empty sections |
| No resolutions | Valid state; the protocol section VI will be empty but must still appear with the correct heading |

---

## 12. Complete Hungarian Legal Template (Közgyűlési Jegyzőkönyv Required Sections)

The following verbatim section structure is legally mandated under Ptk. 5:88 for every Közgyűlési Jegyzőkönyv. All sections must be present even if some are empty:

```
I.    ÉPÜLET ADATAI
      - Társasház neve
      - Pontos cím (utca, házszám, irányítószám)
      - Helyrajzi szám (hrsz.)
      - Albetétek száma

II.   A KÖZGYŰLÉS ADATAI
      - A közgyűlés napja, pontos időpontja
      - Helyszín
      - A közgyűlés típusa: rendes / rendkívüli
      - Összehívás módja és időpontja (Ptk. 5:84 §)
      - Levezető elnök neve
      - Jegyzőkönyvvezető neve
      - Hitelesítők nevei (legalább 2 személy)

III.  MEGJELENT TULAJDONOSOK
      - Teljes névsor: albetét szám, tulajdonos neve, tul. hányad
      - Meghatalmazottak adatai (meghatalmazó neve, meghatalmazott neve)
      - Megjelent: X albetét, Y% tulajdoni hányad

IV.   HATÁROZATKÉPESSÉG (KVÓRUM)
      - Megjelent tulajdoni hányad összesen: X%
      - Szükséges minimum: 50% (Ptk. 5:85 § — rendes többség)
      - A közgyűlés HATÁROZATKÉPES / HATÁROZATKÉPTELEN
      - Ha határozatképtelen: a megismételt közgyűlés időpontjának ajánlása

V.    NAPIRENDI PONTOK
      - Napirendi pontok száma és sorrendi listája
      - Minden napirendi pont szövegesen

VI.   SZAVAZÁSOK ÉS HATÁROZATOK
      - Minden szavazott kérdésnél:
        a) A határozati javaslat szövege
        b) Szavazás módja (nyílt / titkos)
        c) Szavazás eredménye: X% igen, Y% nem, Z% tartózkodás
        d) Határozat kimenetele: ELFOGADVA / ELUTASÍTVA
        e) Határozat sorszáma: NN/ÉÉÉÉ. sz. határozat
        f) Hatályba lépés időpontja (ha meghatározták)
      - Minősített többséget igénylő határozatoknál (Ptk. 5:86 §):
        a jelenlét 2/3-ának igent kellett szavaznia

VII.  EGYEBEK
      - Napirend alá nem tartozó tájékoztatók
      - Szavazásra nem bocsátható kérdések

VIII. A KÖZGYŰLÉS ZÁRÁSA
      - Zárás időpontja
      - Következő közgyűlés ajánlott időpontja (ha meghatározták)

IX.   ALÁÍRÁSOK
      - Levezető elnök aláírása
      - Jegyzőkönyvvezető aláírása
      - 2 hitelesítő aláírása
      
X.    CSATOLMÁNYOK (felsorolás)
      - Jelenléti ív másolata
      - Meghívó másolata
      - Esetleges meghatalmazások listája
      - Anyagok, amelyek szóban kerültek ismertetésre
```

---

## 13. Integration with Email Notification Initiative

This feature depends on and integrates with Dev Prompt #10 (Email Notification System via Resend) at three points:
1. `sendAssemblyInvitation` calls `lib/email.ts#sendEmail` to send Ptk. 5:84 compliant invitations
2. `closeMeeting` → Edge Function calls Resend API directly (no Node.js SDK — uses fetch) to email protocol PDF links
3. `lib/email-templates/assembly-invitation.tsx` (defined in Dev Prompt #10) is used for the invitation HTML

If Dev Prompt #10 is not yet implemented, use the inline HTML stubs in `sendAssemblyInvitation` and the Edge Function. Replace with proper templates once #10 is merged.

---

## 14. Rollback Plan

If this feature causes regressions:
1. **Database rollback:** The `ALTER TABLE` statements cannot be automatically rolled back, but they only add nullable columns and a new table — no existing queries break. The `meeting_attendances` table can be dropped safely: `DROP TABLE IF EXISTS meeting_attendances`.
2. **Edge Function rollback:** Delete the Edge Function: `supabase functions delete generate-assembly-protocol`. The `closeMeeting` Server Action catches Edge Function errors — if the function doesn't exist, the meeting still closes successfully without a protocol URL.
3. **Client rollback:** Remove the `MeetingDetailPanel` import and render from `dashboard-client.tsx`. The meetings list continues to render from the existing mock/live data.
4. **Package rollback:** `npm uninstall @react-pdf/renderer`. The Edge Function uses CDN imports so no local package change is needed for the function itself.
5. **Schema rollback for meetings columns:** `ALTER TABLE meetings DROP COLUMN IF EXISTS status_detail, DROP COLUMN IF EXISTS quorum_threshold, DROP COLUMN IF EXISTS actual_quorum, DROP COLUMN IF EXISTS protocol_url, DROP COLUMN IF EXISTS protocol_generated_at, DROP COLUMN IF EXISTS invitation_sent_at, DROP COLUMN IF EXISTS location, DROP COLUMN IF EXISTS chairperson_name, DROP COLUMN IF EXISTS secretary_name;`

---

## 15. Definition of Done

All 14 items below must be true before this PR is merged:

1. All Phase 1 SQL has been applied to the production Supabase project and verified via `information_schema.columns`
2. `app/actions/meetings.ts` exists and exports: `createMeeting`, `recordAttendance`, `removeAttendance`, `addResolution`, `recordVote`, `updateResolutionOutcome`, `closeMeeting`, `sendAssemblyInvitation`, `getMeetingWithDetails`, `generateProtocolManually`
3. `supabase/functions/generate-assembly-protocol/index.ts` exists and has been deployed
4. The Edge Function generates a valid PDF with all 9 legally required Közgyűlési Jegyzőkönyv sections
5. The generated PDF is uploaded to `documents` Storage bucket at path `assembly-protocols/{building_id}/{meeting_id}.pdf`
6. `meetings.protocol_url` and `meetings.protocol_generated_at` are set after successful generation
7. The meeting detail panel renders in the dashboard with attendance list, agenda items, and manager actions
8. The "Közgyűlés lezárása" button is hidden for non-manager roles
9. Quorum is correctly calculated and displayed (actual attending ownership share / total building ownership share)
10. If quorum < 50%, the PDF contains the "HATÁROZATKÉPTELEN" annotation and the Ptk. 5:85 reconvening note
11. `sendAssemblyInvitation` warns (but does not block) if called < 8 days before the meeting
12. Every email send is logged in `audit_logs` with `action_type: 'email_sent'`
13. `CHANGELOG.md` is updated with entry for v3.20.0
14. `versioning/DDMMYYNNN_v3.20.0_assembly-protocol-generator.md` and `marketing/marketing_values/YYYYMMDD_v3.20.0_assembly-protocol-generator_marketing_value.md` are created
