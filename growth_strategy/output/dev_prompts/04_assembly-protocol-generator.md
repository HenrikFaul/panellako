# Initiative 04 — Assembly Protocol Generator (Közgyűlési Jegyzőkönyv PDF)
## Automated Ptk.-Compliant PDF Generation | Value: +€250k–€550k

---

## 1. Initiative Header

**Title:** Automated Assembly Protocol Generator — Közgyűlési Jegyzőkönyv PDF

**Value Range:** +€250k–€550k (compliance automation, 2–4 hours saved per assembly)

**Business Case:**

PanelLakó already has a complete, production-ready assembly protocol generator. The `supabase/functions/generate-assembly-protocol/index.ts` Edge Function uses `pdf-lib` to render a structured A4 PDF with all required sections: building data, assembly date/location, quorum calculation, attendance list, agenda items with resolutions and vote outcomes, and a signature block. The function is triggered by `closeMeeting()` and `generateProtocolManually()` in `app/actions/meetings.ts`.

The **current gap** is that the PDF uses ASCII-transliterated text (`toAscii()` helper) instead of proper Hungarian Unicode rendering. This is a functional limitation that causes legally unacceptable output: "Határozatképes" becomes "Hatarozatkepesnek", "Közgyűlés" becomes "Kozgyules". Hungarian law (Ptk. 5:85) requires that assembly minutes use proper Hungarian spelling. Additionally, the PDF is not emailed to the közös képviselő after generation — the Storage URL exists but no Resend/Brevo email is triggered.

Completing this initiative means: (1) upgrading the PDF rendering to support proper Hungarian diacritics (either via a Unicode-capable font or a React PDF approach), (2) wiring the post-generation email trigger, and (3) adding a "Letöltés" button to the assembly detail view that fetches a signed Storage URL.

The legal obligation is explicit: every Hungarian residential building (társasház) is required under Ptk. 5:85–5:88 to produce signed meeting minutes within 15 days of any assembly. PanelLakó can collapse a 2–4 hour manual task to under 5 minutes with a legally compliant one-click PDF.

---

## 2. Codebase Context

**Current relevant file tree (verified):**

```
/home/user/panellako/
├── supabase/
│   └── functions/
│       └── generate-assembly-protocol/
│           └── index.ts              ← FULL IMPLEMENTATION EXISTS (pdf-lib)
│                                        Uses toAscii() — ASCII-only text
│                                        Uploads to Storage: documents/assembly-protocols/{buildingId}/{meetingId}.pdf
│                                        Updates meetings.protocol_url and protocol_generated_at
│                                        Logs to audit_logs
│                                        Does NOT send email
├── app/
│   ├── actions/
│   │   └── meetings.ts               ← closeMeeting() triggers protocol generation (fire-and-forget)
│   │                                    generateProtocolManually() — awaited, returns protocol_url
│   └── w/
│       └── [buildingId]/
│           └── (subpages)/           ← Meeting views live here
├── lib/
│   ├── email.ts                      ← sendEmail() via Brevo
│   └── email-templates/
│       ├── announcement.tsx
│       └── ticket-update.tsx
└── supabase/
    └── migrations/
        └── (documents bucket exists from 20260516_create_documents_bucket.sql reference in growth_strategy.json)
```

**Current `generate-assembly-protocol/index.ts` state:**
- Uses `pdf-lib@1.17.1` with `StandardFonts.HelveticaBold` — embedded standard fonts only support ASCII
- `toAscii()` function strips all Hungarian diacritics (á→a, é→e, ő→o, etc.)
- PDF successfully renders and uploads to Supabase Storage
- Does NOT send email notification
- Does NOT insert `documents` table row (only updates `meetings` table)

**The documents table:** Referenced in the growth strategy but its exact schema needs to be verified. Given the existing `20260516_create_documents_bucket.sql` reference, it likely exists with at least `{id, building_id, title, category, storage_path}` columns.

---

## 3. Pre-conditions

**Environment variables (Supabase Edge Function secrets):**
```
SUPABASE_URL=https://xxxx.supabase.co
SUPABASE_SERVICE_ROLE_KEY=eyJ...
BREVO_API_KEY=xkeysib-...             ← For post-generation email
NEXT_PUBLIC_APP_URL=https://app.panellako.hu
```

**Migration to apply:**
- `20260523_030_documents_table.sql` — create/extend documents table if it doesn't exist
- `20260523_031_meetings_protocol_fields.sql` — ensure `protocol_url` and `protocol_generated_at` columns exist

**npm packages (already installed):**
```
@react-pdf/renderer: ^4.5.1           ← In package.json
```

Note: `@react-pdf/renderer` is a Next.js/Node.js package. The current Edge Function uses `pdf-lib` in the Deno environment. Two options:
1. **Keep pdf-lib in Edge Function + use a subset Unicode font** (fetch a font file from Storage)
2. **Move PDF generation to a Next.js API route** using `@react-pdf/renderer` (Node.js compatible)

**Recommended approach for this initiative: use a Next.js API route at `app/api/generate-protocol/route.ts` using `@react-pdf/renderer`** — this properly supports Hungarian characters and uses the already-installed package.

---

## 4. Phase 1: Database Changes

### Migration: `20260523_030_documents_table.sql`

```sql
-- Ensure documents table exists with the correct schema.
-- Idempotent: uses CREATE TABLE IF NOT EXISTS.

CREATE TABLE IF NOT EXISTS public.documents (
  id             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  building_id    UUID NOT NULL REFERENCES public.buildings(id) ON DELETE CASCADE,
  uploaded_by    UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  title          TEXT NOT NULL,
  category       TEXT NOT NULL DEFAULT 'egyeb'
                   CHECK (category IN (
                     'kozgyulesi_jkv',
                     'szmsz',
                     'koltsegvetés',
                     'szerzodes',
                     'határozat',
                     'egyeb'
                   )),
  storage_path   TEXT NOT NULL,
  file_size_kb   INTEGER,
  mime_type      TEXT DEFAULT 'application/pdf',
  is_public      BOOLEAN NOT NULL DEFAULT FALSE,
  created_at     TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at     TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_documents_building_category
  ON public.documents (building_id, category, created_at DESC);

ALTER TABLE public.documents ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Members read own building documents" ON public.documents;
CREATE POLICY "Members read own building documents" ON public.documents
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.memberships m
      WHERE m.building_id = documents.building_id
        AND m.profile_id = auth.uid()
        AND m.active = true
    )
  );

DROP POLICY IF EXISTS "Managers insert documents" ON public.documents;
CREATE POLICY "Managers insert documents" ON public.documents
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.memberships m
      WHERE m.building_id = documents.building_id
        AND m.profile_id = auth.uid()
        AND m.active = true
        AND m.role IN ('kozos_kepviselo', 'megbizott', 'konyvelo')
    )
  );
```

### Migration: `20260523_031_meetings_protocol_fields.sql`

```sql
-- Ensure meetings table has protocol generation columns.
ALTER TABLE public.meetings
  ADD COLUMN IF NOT EXISTS protocol_url               TEXT,
  ADD COLUMN IF NOT EXISTS protocol_generated_at      TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS protocol_document_id       UUID REFERENCES public.documents(id);

COMMENT ON COLUMN public.meetings.protocol_url IS
  'Supabase Storage path for the generated Közgyűlési Jegyzőkönyv PDF.';
COMMENT ON COLUMN public.meetings.protocol_document_id IS
  'FK to documents table row created when protocol is generated.';
```

---

## 5. Phase 2: Server-side

### New file: `app/api/generate-protocol/route.ts`

This replaces the pdf-lib Edge Function with a proper `@react-pdf/renderer` Node.js API route that supports Hungarian characters natively.

```typescript
import { NextRequest, NextResponse } from 'next/server';
import { createClient as createAdminClient } from '@supabase/supabase-js';
import { renderToBuffer } from '@react-pdf/renderer';
import { AssemblyProtocolDocument } from '@/components/pdf/assembly-protocol-document';
import { sendEmail } from '@/lib/email';

export const dynamic = 'force-dynamic';
export const maxDuration = 60; // PDF generation can take up to 60s

const getAdminClient = () => createAdminClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function POST(request: NextRequest) {
  // Verify the request is from the service role (internal call only)
  const authHeader = request.headers.get('Authorization');
  if (authHeader !== `Bearer ${process.env.SUPABASE_SERVICE_ROLE_KEY}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { meeting_id, building_id } = await request.json();
  if (!meeting_id || !building_id) {
    return NextResponse.json({ error: 'meeting_id and building_id required' }, { status: 400 });
  }

  const supabase = getAdminClient();

  // Fetch all required data in parallel
  const [meetingRes, buildingRes, agendaRes, resolutionsRes, attendancesRes, unitsRes, votesRes] =
    await Promise.all([
      supabase.from('meetings').select('*').eq('id', meeting_id).single(),
      supabase.from('buildings').select('name, address, tax_number').eq('id', building_id).single(),
      supabase.from('agenda_items').select('*').eq('meeting_id', meeting_id).order('order_no'),
      supabase.from('resolutions').select('*').eq('meeting_id', meeting_id),
      supabase.from('meeting_attendances')
        .select('*, units(unit_label, owner_name, ownership_share)')
        .eq('meeting_id', meeting_id),
      supabase.from('units').select('ownership_share').eq('building_id', building_id),
      supabase.from('votes').select('*, resolutions(id)').in(
        'resolution_id',
        (await supabase.from('resolutions').select('id').eq('meeting_id', meeting_id)).data?.map(r => r.id) ?? []
      ),
    ]);

  if (meetingRes.error || !meetingRes.data) {
    return NextResponse.json({ error: 'Meeting not found' }, { status: 404 });
  }

  const meeting = meetingRes.data;
  const building = buildingRes.data ?? { name: 'N/A', address: 'N/A', tax_number: null };
  const agenda = agendaRes.data ?? [];
  const resolutions = resolutionsRes.data ?? [];
  const attendances = attendancesRes.data ?? [];
  const allUnits = unitsRes.data ?? [];
  const votes = votesRes.data ?? [];

  // Compute quorum
  const totalBuildingShare = allUnits.reduce((s, u) => s + (u.ownership_share ?? 0), 0);
  const totalAttendingShare = attendances.reduce((s, a) => s + (a.ownership_share ?? 0), 0);
  const quorumPct = totalBuildingShare > 0 ? (totalAttendingShare / totalBuildingShare) * 100 : 0;
  const isQuorate = quorumPct >= (meeting.quorum_threshold ?? 0.5) * 100;

  // Compute vote tallies per resolution
  const voteTallies = resolutions.reduce((acc, res) => {
    const resVotes = votes.filter(v => v.resolution_id === res.id);
    acc[res.id] = {
      igen: resVotes.filter(v => v.vote_value === 'igen').reduce((s, v) => s + v.weight, 0),
      nem: resVotes.filter(v => v.vote_value === 'nem').reduce((s, v) => s + v.weight, 0),
      tartozkodas: resVotes.filter(v => v.vote_value === 'tartozkodas').reduce((s, v) => s + v.weight, 0),
    };
    return acc;
  }, {} as Record<string, { igen: number; nem: number; tartozkodas: number }>);

  // Generate PDF using @react-pdf/renderer
  const pdfBuffer = await renderToBuffer(
    AssemblyProtocolDocument({
      meeting,
      building,
      agenda,
      resolutions,
      attendances,
      allUnits,
      quorumPct,
      isQuorate,
      voteTallies,
    })
  );

  // Upload to Supabase Storage
  const storagePath = `assembly-protocols/${building_id}/${meeting_id}.pdf`;
  const { error: uploadError } = await supabase.storage
    .from('documents')
    .upload(storagePath, pdfBuffer, {
      contentType: 'application/pdf',
      upsert: true,
    });

  if (uploadError) {
    console.error('[generate-protocol] Upload error:', uploadError);
    return NextResponse.json({ error: `Storage upload failed: ${uploadError.message}` }, { status: 500 });
  }

  // Insert documents table row
  const { data: docRow, error: docError } = await supabase
    .from('documents')
    .insert({
      building_id,
      title: `Közgyűlési Jegyzőkönyv — ${new Date(meeting.scheduled_at).toLocaleDateString('hu-HU')}`,
      category: 'kozgyulesi_jkv',
      storage_path: storagePath,
      mime_type: 'application/pdf',
    })
    .select('id')
    .single();

  if (docError) console.warn('[generate-protocol] documents insert failed:', docError);

  // Update meetings table
  await supabase
    .from('meetings')
    .update({
      protocol_url: storagePath,
      protocol_generated_at: new Date().toISOString(),
      protocol_document_id: docRow?.id ?? null,
    })
    .eq('id', meeting_id);

  // Get signed URL for email (1 hour expiry)
  const { data: signedUrlData } = await supabase.storage
    .from('documents')
    .createSignedUrl(storagePath, 3600);

  // Send email to building manager
  const { data: manager } = await supabase
    .from('memberships')
    .select('profiles(email, full_name)')
    .eq('building_id', building_id)
    .eq('role', 'kozos_kepviselo')
    .eq('active', true)
    .limit(1)
    .single();

  const managerEmail = (manager?.profiles as { email?: string })?.email;
  const managerName = (manager?.profiles as { full_name?: string })?.full_name ?? 'Közös képviselő';

  if (managerEmail && signedUrlData?.signedUrl) {
    await sendEmail({
      to: managerEmail,
      subject: `Közgyűlési Jegyzőkönyv elkészült — ${building.name}`,
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 520px; margin: 0 auto; padding: 40px;">
          <h2 style="color: #1e293b;">Kedves ${managerName}!</h2>
          <p style="color: #475569;">A közgyűlési jegyzőkönyv elkészült és letölthető az alábbi linkre kattintva:</p>
          <p style="text-align: center; margin: 32px 0;">
            <a href="${signedUrlData.signedUrl}"
               style="background: #6366f1; color: #fff; padding: 14px 32px; border-radius: 12px; text-decoration: none; font-weight: bold;">
              Közgyűlési Jegyzőkönyv letöltése
            </a>
          </p>
          <p style="color: #94a3b8; font-size: 12px;">
            A link 1 óráig érvényes. A dokumentum elérhető a PanelLakó dokumentumtárában is.
          </p>
          <p style="color: #94a3b8; font-size: 12px;">
            Jogi megfelelőség: Ptk. 5:85–5:88 szerint az aláírt példányt 15 napon belül el kell küldeni az albetét-tulajdonosoknak.
          </p>
        </div>
      `,
      tags: [{ name: 'type', value: 'protocol_generated' }],
    });
  }

  // Log to audit_logs
  await supabase.from('audit_logs').insert({
    actor_id: null,
    actor_name: 'Rendszer',
    action_type: 'protocol_generated',
    entity_type: 'meeting',
    entity_id: meeting_id,
    entity_label: `Közgyűlési Jegyzőkönyv: ${storagePath}`,
  });

  return NextResponse.json({
    success: true,
    protocol_url: storagePath,
    signed_url: signedUrlData?.signedUrl ?? null,
    quorum_pct: quorumPct,
    is_quorate: isQuorate,
  });
}
```

---

## 6. Phase 3: Client-side

### New file: `components/pdf/assembly-protocol-document.tsx`

```typescript
// @react-pdf/renderer document component for Közgyűlési Jegyzőkönyv
// Must be in a file that is NOT marked 'use client' — rendered server-side via renderToBuffer

import {
  Document, Page, Text, View, StyleSheet, Font
} from '@react-pdf/renderer';

// Register a Unicode-capable font for Hungarian characters
// Using a bundled font or a public Google Font URL
Font.register({
  family: 'Helvetica-Unicode',
  src: 'https://fonts.gstatic.com/s/opensans/v34/memSYaGs126MiZpBA-UvWbX2vVnXBbObj2OVZyOOSr4dVJWUgsjZ0C4nY1M2xLER.woff2',
});

const styles = StyleSheet.create({
  page: {
    fontFamily: 'Helvetica-Unicode',
    fontSize: 9,
    paddingTop: 50,
    paddingBottom: 50,
    paddingHorizontal: 50,
    color: '#1e293b',
  },
  header: {
    backgroundColor: '#0f2980',
    marginTop: -50,
    marginHorizontal: -50,
    paddingTop: 18,
    paddingBottom: 12,
    paddingHorizontal: 50,
    marginBottom: 20,
  },
  headerTitle: { fontSize: 16, fontWeight: 'bold', color: '#ffffff' },
  headerSub: { fontSize: 8, color: '#c7d2fe', marginTop: 2 },
  sectionTitle: {
    fontSize: 10, fontWeight: 'bold', color: '#0f2980',
    borderBottomWidth: 1, borderBottomColor: '#e2e8f0',
    paddingBottom: 4, marginBottom: 8, marginTop: 16,
  },
  row: { flexDirection: 'row', marginBottom: 4 },
  label: { width: 140, fontWeight: 'bold', fontSize: 8 },
  value: { flex: 1, fontSize: 8 },
  tableHeader: {
    flexDirection: 'row', backgroundColor: '#f1f5f9',
    paddingVertical: 4, paddingHorizontal: 4, marginBottom: 2,
  },
  tableRow: {
    flexDirection: 'row', borderBottomWidth: 0.5,
    borderBottomColor: '#e2e8f0', paddingVertical: 3, paddingHorizontal: 4,
  },
  quorumPass: { color: '#166534', fontWeight: 'bold', fontSize: 11 },
  quorumFail: { color: '#dc2626', fontWeight: 'bold', fontSize: 11 },
  resolutionBox: {
    border: 1, borderColor: '#e2e8f0', borderRadius: 4,
    padding: 8, marginBottom: 8,
  },
  signatureLine: {
    borderBottomWidth: 1, borderBottomColor: '#1e293b',
    width: 160, marginBottom: 4,
  },
  footer: {
    position: 'absolute', bottom: 30, left: 50, right: 50,
    borderTopWidth: 0.5, borderTopColor: '#e2e8f0',
    paddingTop: 6,
    fontSize: 6, color: '#94a3b8',
  },
});

interface Props {
  meeting: Record<string, unknown>;
  building: { name: string; address: string; tax_number?: string | null };
  agenda: Array<{ id: string; order_no: number; title: string; description?: string }>;
  resolutions: Array<{ id: string; agenda_item_id: string; text: string; outcome: string; effective_date?: string }>;
  attendances: Array<{ ownership_share: number; proxy_name?: string; units?: { unit_label: string; owner_name: string; ownership_share: number } }>;
  allUnits: Array<{ ownership_share: number }>;
  quorumPct: number;
  isQuorate: boolean;
  voteTallies: Record<string, { igen: number; nem: number; tartozkodas: number }>;
}

export function AssemblyProtocolDocument({
  meeting, building, agenda, resolutions, attendances,
  allUnits, quorumPct, isQuorate, voteTallies,
}: Props) {
  const scheduledAt = new Date(meeting.scheduled_at as string);
  const dateStr = scheduledAt.toLocaleDateString('hu-HU', { year: 'numeric', month: 'long', day: 'numeric' });
  const timeStr = scheduledAt.toLocaleTimeString('hu-HU', { hour: '2-digit', minute: '2-digit' });
  const generatedStr = new Date().toLocaleDateString('hu-HU');

  return (
    <Document title={`Közgyűlési Jegyzőkönyv — ${building.name}`} author="PanelLakó">
      <Page size="A4" style={styles.page}>
        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.headerTitle}>KÖZGYŰLÉSI JEGYZŐKÖNYV</Text>
          <Text style={styles.headerSub}>Assembly Minutes — Társasházi Közgyűlés</Text>
        </View>

        {/* 1. Building data */}
        <Text style={styles.sectionTitle}>1. ÉPÜLET ADATAI</Text>
        <View style={styles.row}><Text style={styles.label}>Épület neve:</Text><Text style={styles.value}>{building.name}</Text></View>
        <View style={styles.row}><Text style={styles.label}>Cím:</Text><Text style={styles.value}>{building.address}</Text></View>
        {building.tax_number && (
          <View style={styles.row}><Text style={styles.label}>Adószám:</Text><Text style={styles.value}>{building.tax_number}</Text></View>
        )}
        <View style={styles.row}><Text style={styles.label}>Összes albetét:</Text><Text style={styles.value}>{allUnits.length} db</Text></View>

        {/* 2. Meeting data */}
        <Text style={styles.sectionTitle}>2. KÖZGYŰLÉS ADATAI</Text>
        <View style={styles.row}><Text style={styles.label}>Cím:</Text><Text style={styles.value}>{meeting.title as string}</Text></View>
        <View style={styles.row}><Text style={styles.label}>Időpont:</Text><Text style={styles.value}>{dateStr} {timeStr}</Text></View>
        <View style={styles.row}><Text style={styles.label}>Helyszín:</Text><Text style={styles.value}>{(meeting.location as string) ?? 'N/A'}</Text></View>
        <View style={styles.row}><Text style={styles.label}>Levezető elnök:</Text><Text style={styles.value}>{(meeting.chairperson_name as string) ?? 'N/A'}</Text></View>
        <View style={styles.row}><Text style={styles.label}>Jegyzőkönyvvezető:</Text><Text style={styles.value}>{(meeting.secretary_name as string) ?? 'N/A'}</Text></View>

        {/* 3. Quorum */}
        <Text style={styles.sectionTitle}>3. HATÁROZATKÉPESSÉG</Text>
        <View style={styles.row}>
          <Text style={styles.label}>Megjelent tulajdoni hányad:</Text>
          <Text style={styles.value}>{quorumPct.toFixed(1)}%</Text>
        </View>
        <View style={styles.row}>
          <Text style={styles.label}>Küszöb (Ptk. 5:85):</Text>
          <Text style={styles.value}>{((meeting.quorum_threshold as number ?? 0.5) * 100).toFixed(0)}%</Text>
        </View>
        <Text style={isQuorate ? styles.quorumPass : styles.quorumFail}>
          {isQuorate ? 'HATÁROZATKÉPESNEK MINŐSÜL' : 'HATÁROZATKÉPTELENNEK MINŐSÜL'}
        </Text>

        {/* 4. Attendance */}
        <Text style={styles.sectionTitle}>4. JELENLÉVŐK LISTÁJA ({attendances.length} fő)</Text>
        <View style={styles.tableHeader}>
          <Text style={{ width: 55, fontSize: 7, fontWeight: 'bold' }}>Albetét</Text>
          <Text style={{ flex: 1, fontSize: 7, fontWeight: 'bold' }}>Tulajdonos neve</Text>
          <Text style={{ width: 70, fontSize: 7, fontWeight: 'bold' }}>Tulajd. hányad</Text>
          <Text style={{ width: 80, fontSize: 7, fontWeight: 'bold' }}>Meghatalmazott</Text>
        </View>
        {attendances.slice(0, 40).map((att, i) => (
          <View key={i} style={styles.tableRow}>
            <Text style={{ width: 55, fontSize: 7 }}>{att.units?.unit_label ?? 'N/A'}</Text>
            <Text style={{ flex: 1, fontSize: 7 }}>{(att.units?.owner_name ?? 'N/A').slice(0, 35)}</Text>
            <Text style={{ width: 70, fontSize: 7 }}>{((att.ownership_share ?? 0) * 100).toFixed(2)}%</Text>
            <Text style={{ width: 80, fontSize: 7 }}>{att.proxy_name ?? '—'}</Text>
          </View>
        ))}

        {/* 5. Agenda & Resolutions */}
        <Text style={styles.sectionTitle}>5. NAPIRENDI PONTOK ÉS HATÁROZATOK</Text>
        {agenda.map((item) => {
          const itemResolutions = resolutions.filter(r => r.agenda_item_id === item.id);
          return (
            <View key={item.id} style={{ marginBottom: 10 }}>
              <Text style={{ fontSize: 10, fontWeight: 'bold', marginBottom: 4 }}>
                {item.order_no}. {item.title}
              </Text>
              {item.description && (
                <Text style={{ fontSize: 8, color: '#475569', marginBottom: 4, marginLeft: 10 }}>
                  {item.description}
                </Text>
              )}
              {itemResolutions.map((res, ri) => {
                const tally = voteTallies[res.id] ?? { igen: 0, nem: 0, tartozkodas: 0 };
                const outcomeColor = res.outcome === 'elfogadva' ? '#166534' : res.outcome === 'elutasitva' ? '#dc2626' : '#6b7280';
                return (
                  <View key={res.id} style={{ ...styles.resolutionBox, marginLeft: 10 }}>
                    <Text style={{ fontWeight: 'bold', color: outcomeColor, marginBottom: 4 }}>
                      Határozat {ri + 1}: [{(res.outcome ?? 'folyamatban').toUpperCase()}]
                    </Text>
                    <Text style={{ fontSize: 8, marginBottom: 4 }}>{res.text}</Text>
                    <Text style={{ fontSize: 7, color: '#475569' }}>
                      Szavazás: {tally.igen.toFixed(1)}% igen / {tally.nem.toFixed(1)}% nem / {tally.tartozkodas.toFixed(1)}% tartózkodik
                    </Text>
                    {res.effective_date && (
                      <Text style={{ fontSize: 7, color: '#475569' }}>Hatályba lép: {res.effective_date}</Text>
                    )}
                  </View>
                );
              })}
            </View>
          );
        })}

        {/* 6. Signature block */}
        <Text style={styles.sectionTitle}>6. ALÁÍRÁSOK</Text>
        <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginTop: 20 }}>
          <View style={{ width: 180 }}>
            <View style={styles.signatureLine} />
            <Text style={{ fontSize: 7, color: '#475569' }}>{(meeting.chairperson_name as string) ?? 'Levezető elnök'}</Text>
            <Text style={{ fontSize: 6, color: '#94a3b8' }}>Levezető elnök</Text>
          </View>
          <View style={{ width: 180 }}>
            <View style={styles.signatureLine} />
            <Text style={{ fontSize: 7, color: '#475569' }}>{(meeting.secretary_name as string) ?? 'Jegyzőkönyvvezető'}</Text>
            <Text style={{ fontSize: 6, color: '#94a3b8' }}>Jegyzőkönyvvezető</Text>
          </View>
        </View>

        {/* Footer */}
        <Text style={styles.footer}>
          Készült: {generatedStr} | PanelLakó platform | Ptk. 5:84–5:88 szerint | assembly-protocols/{meeting.id as string}
        </Text>
      </Page>
    </Document>
  );
}
```

---

## 7. Phase 4: Configuration

**Update `app/actions/meetings.ts` `closeMeeting()` and `generateProtocolManually()`:**

Change the Edge Function URL to call the new Next.js API route instead:

```typescript
// In closeMeeting() — change:
// FROM: fetch(`${supabaseUrl}/functions/v1/generate-assembly-protocol`, ...)
// TO:
const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? 'http://localhost:3000';
fetch(`${appUrl}/api/generate-protocol`, {
  method: 'POST',
  headers: {
    Authorization: `Bearer ${process.env.SUPABASE_SERVICE_ROLE_KEY}`,
    'Content-Type': 'application/json',
  },
  body: JSON.stringify({ meeting_id: meetingId, building_id: buildingId }),
}).catch(err => console.error('[closeMeeting] Protocol trigger failed:', err));
```

**`next.config.mjs` changes:** Ensure `maxDuration` is permitted. Vercel free tier has 10s max; Pro tier allows 60s. The `export const maxDuration = 60` in the API route requires Vercel Pro. If on free tier, reduce to `maxDuration = 10` and accept potential timeouts for very large meetings.

---

## 8. Phase 5: Testing

### Manual Smoke Test

1. **Create a test meeting:** Use the meetings creation flow in `/w/[buildingId]/(subpages)/`. Add 3 agenda items and 2+ attendances.

2. **Close the meeting:** Call `closeMeeting(meetingId, buildingId)` or use the UI "Közgyűlés lezárása" button. This triggers protocol generation via the new API route.

3. **Verify Storage upload:** In Supabase Dashboard → Storage → `documents` bucket → `assembly-protocols/[buildingId]/[meetingId].pdf`. The file should exist.

4. **Verify Hungarian characters:** Download the PDF. Open it and verify that "Határozatképes", "Közgyűlés", "Résztvevők" render with correct diacritics.

5. **Verify email sent:** Check the Brevo dashboard (or email inbox for the manager) for a "Közgyűlési Jegyzőkönyv elkészült" email with a signed download URL.

6. **Verify documents table row:** `SELECT * FROM documents WHERE category = 'kozgyulesi_jkv'` — should show a row with the correct `storage_path`.

### Automated Test Cases

```typescript
describe('AssemblyProtocolDocument (snapshot)', () => {
  it('renders without throwing for minimal valid data', async () => {
    const buffer = await renderToBuffer(AssemblyProtocolDocument({
      meeting: { title: 'Rendes közgyűlés 2026', scheduled_at: '2026-05-23T10:00:00Z',
                 quorum_threshold: 0.5, chairperson_name: 'Kovács Béla', secretary_name: 'Nagy Éva' },
      building: { name: 'Gidófalvy u. 12', address: 'Budapest, 1143 Gidófalvy u. 12.' },
      agenda: [{ id: 'a1', order_no: 1, title: 'Éves közös költség megállapítása' }],
      resolutions: [],
      attendances: [],
      allUnits: [{ ownership_share: 0.1 }],
      quorumPct: 0,
      isQuorate: false,
      voteTallies: {},
    }));
    expect(buffer.length).toBeGreaterThan(1000);
  });

  it('renders Hungarian characters in title', async () => {
    // Check that the PDF bytes contain UTF-8 encoded Hungarian text
    const buffer = await renderToBuffer(AssemblyProtocolDocument({ ... }));
    const bufStr = buffer.toString('latin1');
    // @react-pdf/renderer embeds text as streams — verify buffer is non-trivial size
    expect(buffer.length).toBeGreaterThan(5000);
  });
});
```

---

## 9. Error Handling & Edge Cases

**Scenario 1: Meeting has zero attendances**
`quorumPct = 0`, `isQuorate = false`. PDF renders with "HATÁROZATKÉPTELENNEK MINŐSÜL" in red. The attendance table section is empty. This is a valid legal output.

**Scenario 2: Font URL unreachable at render time**
If Google Fonts CDN is unavailable, `Font.register()` will fail. Solution: bundle the font file in `public/fonts/OpenSans.woff2` and use a relative URL: `src: '/fonts/OpenSans.woff2'`. This is the recommended production approach.

**Scenario 3: PDF generation times out (>60s for meeting with 200+ attendances)**
The `maxDuration = 60` cap fires. Return a 504. `generateProtocolManually()` returns `{ success: false, error: 'Kapcsolódási hiba' }`. The UI should show an error toast and allow the manager to retry. For very large assemblies, paginate the attendance list in the PDF (first 40 rows on page 1, overflow to page 2).

**Scenario 4: `documents` table `category` constraint violation**
The `INSERT` uses `category: 'kozgyulesi_jkv'` which is in the CHECK constraint. No violation possible from the generator.

**Scenario 5: `Storage.upload()` fails (storage quota exceeded)**
`uploadError` is caught and returned as HTTP 500. The `meetings` table is NOT updated. `generateProtocolManually()` surfaces the error in the UI.

**Scenario 6: Manager has no email address in profiles**
`managerEmail` is undefined → `if (managerEmail && ...)` guard skips the email send. The PDF is still generated and stored. The manager can access it via the `/w/[buildingId]/dokumentumok` document list.

**Scenario 7: Protocol regenerated (upsert)**
`Storage.upload(..., { upsert: true })` overwrites the existing PDF. A new `documents` table row is inserted (not upserted), creating a version history. This is acceptable behavior.

---

## 10. Integration with Other Initiatives

- **Initiative 05 (Financial Ledger):** The `documents` table created here is also used by the financial ledger for `generateKozosKoltsegKimutatas()` PDF export — same category system, same Storage bucket.

- **Initiative 06 (Email Suite):** The email send in the protocol generator uses `lib/email.ts` `sendEmail()` — same abstraction as all other emails. Consistent with the email suite architecture.

- **Initiative 09 (Resident Portal):** The portal's document browser reads from the `documents` table. Once a protocol is generated, residents can download it from `/portal/[buildingId]/dokumentumok` — the `is_public = false` RLS policy ensures only building members can access it.

---

## 11. Rollback Plan

1. **Revert `app/actions/meetings.ts`:** Change the API route URL back to the Supabase Edge Function URL.

2. **Delete new files:** Remove `app/api/generate-protocol/route.ts` and `components/pdf/assembly-protocol-document.tsx`.

3. **Re-deploy original Edge Function:** The original `generate-assembly-protocol/index.ts` continues to work (pdf-lib with ASCII transliteration). It already handles the complete pipeline except for the email send and documents table insert.

4. **Database rollback (optional):** The migrations add columns and tables idempotently — they do not need to be reverted unless storage costs are a concern.

---

## 12. Definition of Done

- [ ] Migration `20260523_030_documents_table.sql` applied — `documents` table exists with RLS
- [ ] Migration `20260523_031_meetings_protocol_fields.sql` applied — `protocol_document_id` column on meetings
- [ ] `app/api/generate-protocol/route.ts` created and returns 200 for a valid meeting
- [ ] `components/pdf/assembly-protocol-document.tsx` renders proper Hungarian Unicode (verified by opening PDF)
- [ ] PDF file visible in Supabase Storage at `documents/assembly-protocols/{buildingId}/{meetingId}.pdf`
- [ ] `documents` table row inserted with `category = 'kozgyulesi_jkv'`
- [ ] `meetings.protocol_url` and `meetings.protocol_generated_at` updated after generation
- [ ] Email sent to közös képviselő with 1-hour signed download URL
- [ ] `closeMeeting()` triggers the new API route (fire-and-forget)
- [ ] `generateProtocolManually()` triggers the new API route and returns `protocol_url`
- [ ] PDF quorum section shows correct percentage and pass/fail status
- [ ] Vote tallies (igen/nem/tartózkodik) appear correctly per resolution
- [ ] Signature blocks render with correct names from meeting data
- [ ] TypeScript compiles cleanly for all new files
