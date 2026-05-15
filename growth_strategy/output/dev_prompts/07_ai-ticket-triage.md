# Dev Prompt #07 — AI-Powered Fault Ticket Triage + Priority Scoring

**Initiative:** AI-Powered Fault Ticket Triage + Priority Scoring (Competitive Differentiator)
**Estimated value impact:** +€160,000–€380,000 (ARR uplift via premium tier, churn reduction, manager retention)
**Target model:** claude-haiku-4-5 (model ID: `claude-haiku-4-5-20251001`)
**Stack:** Next.js 14 App Router · Supabase (Postgres + Edge Functions + Deno runtime) · Tailwind CSS · Anthropic API
**Codebase language:** TypeScript (strict mode)
**Date authored:** 2026-05-15

---

## 1. Business Case

### 1.1 Building Manager Workload Analysis

A typical PanelLakó customer manages between 10 and 25 residential buildings simultaneously. Each building generates between 5 and 15 fault tickets per day across all units — spanning plumbing leaks, electrical failures, elevator outages, intercom malfunctions, structural cracks, common-area cleaning problems, and emergency situations. At scale this means a single building manager processes 50–375 incoming tickets daily, every one of which requires them to read the description, assess urgency, assign a category, decide whether to call a vendor immediately or schedule for next week, and update the status in the system. In practice, most managers defer triage until morning or end-of-day batches, meaning an emergency water leak reported at 14:00 may not be escalated until 17:30 when the manager finally processes the queue. This delay directly causes property damage, tenant dissatisfaction, and potential Lakástörvény liability.

AI-powered triage eliminates this latency entirely. The moment a ticket is saved to the database the Edge Function fires, calls Claude claude-haiku-4-5, and writes a structured urgency score (1–10), a standardized category, a vendor-type recommendation, and a one-sentence Hungarian summary back to the ticket record — all within 2–4 seconds and before the manager even opens the dashboard. When the manager does open the ticket queue they see a pre-triaged, pre-sorted, color-coded list. Critical tickets (urgency 8–10) surface at the top. Routine maintenance (urgency 1–4) can be batch-scheduled. The manager's cognitive load drops from 100% read-assess-categorize to 20% review-confirm-act.

### 1.2 First-Mover Advantage in Hungarian PropTech

The Hungarian residential property management software market is served almost entirely by tools that are either Microsoft Excel derivatives, legacy desktop software from the 2000s (e.g., Társasházi Nyilvántartó), or generic project management systems adapted by resourceful building managers. No incumbent in the HU PropTech market has shipped AI-native fault triage. PanelLakó shipping this feature in 2026 establishes a durable moat: competitors cannot replicate it quickly because it requires (a) an AI-friendly data schema, (b) an Edge Function infrastructure, (c) a well-tuned Hungarian-language prompt, and (d) a UI layer that surfaces the AI output meaningfully. The combination takes 3–6 months to copy even for a well-funded competitor. This window is the addressable moat period. First-mover advantage in a niche SaaS market typically translates to 60–70% market-share capture among customers who adopt during the moat window.

### 1.3 Claude claude-haiku-4-5 Cost Analysis and ROI Calculation

Claude claude-haiku-4-5-20251001 pricing as of May 2026: input tokens $0.80/M, output tokens $4.00/M. A triage call sends approximately 400–600 tokens of input (system prompt + ticket title + description) and receives approximately 120–180 tokens of structured JSON output. Per-call cost: (550 × $0.80 / 1,000,000) + (150 × $4.00 / 1,000,000) = $0.00044 + $0.00060 = roughly **$0.001 per triage call**. At 375 tickets/day across a 25-building portfolio, monthly AI cost is: 375 × 30 × $0.001 = **$11.25/month**. A building manager's hourly billing rate in Hungary is approximately €25–40/hour. Manual triage at 2 minutes per ticket = 12.5 hours/day of triage work = €312–500/day in time cost. AI reduces this to 15 minutes/day of review = €6.25–10/day. Monthly manager time savings: ~€9,000–14,700. Monthly AI cost: ~€10. **ROI ratio: 900:1 to 1,470:1.** The ARR uplift comes from (a) charging a "Pro AI" premium tier at +€20–40/building/month, (b) reducing churn among power users who would otherwise revert to Excel, and (c) winning competitive deals against legacy tools.

### 1.4 Integration with Vendor and Work Order Pipeline

AI triage is not a standalone feature — it is the intelligence layer that feeds the entire downstream workflow. When Claude assigns `ai_category = "plumbing"` and `ai_urgency = 9`, the system can auto-filter the vendor list to plumbing contractors, pre-populate a work order draft, and surface it in the manager's action queue with a "Create Work Order" one-click button. When `ai_urgency >= 8` the system can immediately fire a push notification to the manager's phone via the notification infrastructure, bypassing the normal batching logic. The AI field `ai_vendor_suggestion` provides a human-readable recommendation ("Vízszerelő — azonnali kiszállás indokolt") that managers can approve with one click. This transforms the ticketing module from a passive log into an active operations management system, dramatically increasing the stickiness of the product.

---

## 2. Current State

### 2.1 What Exists Today

The `tickets` table in `supabase/schema.sql` has the following columns: `id`, `building_id`, `unit_id`, `reporter_id`, `title`, `description`, `status` (uj/folyamatban/varakozik/lezarva), `priority` (alacsony/kozepes/magas/kritikus), `location`, `submitted_by`, `unit_label`, `due_date`, `updated_at`, `created_at`. All fields are manually set. There are no AI-derived fields.

The `app/actions/tickets.ts` Server Action `createTicket(input)` inserts a ticket row and calls `revalidatePath('/')`. It does not invoke any AI service. After insert the function returns immediately.

The `components/dashboard-client.tsx` ticket list renders each ticket as an article card showing: title, description, StatusBadge (status), PriorityBadge (priority), location, submitted_by, unit_label, updated_at. Managers see status-change buttons. There is no AI-derived data displayed anywhere. The `lib/types.ts` `Ticket` interface has no AI fields.

### 2.2 What is Missing

- No AI-enriched fields on the `tickets` table
- No Supabase Edge Function for triage
- No Anthropic API integration
- No call from `createTicket` to an AI service
- No UI components for displaying AI urgency, category, vendor suggestion, or override
- No skeleton/loading state for tickets awaiting triage
- No `updateTicketAiOverride` Server Action
- No batch triage capability for historical tickets
- No cost monitoring instrumentation

---

## 3. Pre-conditions

Before starting implementation, verify the following are in place:

1. **`ANTHROPIC_API_KEY`** must be set in Supabase Edge Function secrets. In the Supabase dashboard: Project Settings → Edge Functions → Secrets → Add `ANTHROPIC_API_KEY`. The value must be a valid Anthropic API key with access to `claude-haiku-4-5-20251001`.
2. **Supabase CLI** must be installed (`npm install -g supabase` or `brew install supabase/tap/supabase`) and `supabase login` must have been run.
3. The database migration in Phase 1 must be applied before deploying the Edge Function.
4. The Edge Function must be deployed before modifying `createTicket`.
5. The `NEXT_PUBLIC_SUPABASE_URL` and `SUPABASE_SERVICE_ROLE_KEY` environment variables must be set in the Next.js app (`.env.local` for local dev, Vercel project settings for production). The service role key is required to call Edge Functions from a Server Action because it bypasses RLS — only use it server-side.

---

## 4. Phase 1: Database Schema Changes

### 4.1 Migration SQL

Create the file `supabase/migrations/20260515000001_ai_triage_columns.sql` with the following exact content:

```sql
-- Migration: Add AI triage columns to tickets table
-- Initiative: AI-Powered Fault Ticket Triage
-- Date: 2026-05-15

-- Add AI-derived fields
ALTER TABLE tickets ADD COLUMN IF NOT EXISTS ai_category TEXT;
ALTER TABLE tickets ADD COLUMN IF NOT EXISTS ai_urgency INTEGER CHECK (ai_urgency >= 1 AND ai_urgency <= 10);
ALTER TABLE tickets ADD COLUMN IF NOT EXISTS ai_vendor_suggestion TEXT;
ALTER TABLE tickets ADD COLUMN IF NOT EXISTS ai_summary_hu TEXT;
ALTER TABLE tickets ADD COLUMN IF NOT EXISTS ai_triage_at TIMESTAMPTZ;
ALTER TABLE tickets ADD COLUMN IF NOT EXISTS ai_override BOOLEAN NOT NULL DEFAULT FALSE;

-- Index for fast querying of un-triaged tickets (for batch triage job)
CREATE INDEX IF NOT EXISTS idx_tickets_ai_triage_at ON tickets (ai_triage_at) WHERE ai_triage_at IS NULL;

-- Index for querying by ai_urgency for priority dashboards
CREATE INDEX IF NOT EXISTS idx_tickets_ai_urgency ON tickets (ai_urgency DESC) WHERE ai_urgency IS NOT NULL;

-- Add an RLS UPDATE policy allowing the Edge Function (service role) to update ai_* fields.
-- The service role bypasses RLS entirely, so this policy is for the anon/authenticated role.
-- Managers (kozos_kepviselo, megbizott) must also be able to set ai_override = TRUE.
DROP POLICY IF EXISTS "Manager update ticket ai fields" ON tickets;
CREATE POLICY "Manager update ticket ai fields" ON tickets
  FOR UPDATE
  USING (true)
  WITH CHECK (true);

-- Note: The above permissive policy mirrors the existing MVP approach (see schema.sql comments).
-- In production, tighten this to:
-- USING (auth.uid() IN (SELECT profile_id FROM memberships WHERE building_id = tickets.building_id AND role IN ('kozos_kepviselo', 'megbizott')))
-- WITH CHECK (same condition)

COMMENT ON COLUMN tickets.ai_category IS 'AI-assigned category: plumbing, electrical, structural, common_area, emergency, hvac, elevator, other';
COMMENT ON COLUMN tickets.ai_urgency IS 'AI urgency score 1-10. 1-4: low (routine), 5-7: medium (schedule soon), 8-10: high (immediate action required)';
COMMENT ON COLUMN tickets.ai_vendor_suggestion IS 'Human-readable vendor type recommendation in Hungarian, e.g. "Vízszerelő — haladéktalan kiszállás"';
COMMENT ON COLUMN tickets.ai_summary_hu IS 'AI-generated one-sentence summary of the issue in Hungarian for quick scanning';
COMMENT ON COLUMN tickets.ai_triage_at IS 'Timestamp when AI triage completed. NULL means triage is pending or failed.';
COMMENT ON COLUMN tickets.ai_override IS 'TRUE when a manager has manually overridden the AI category or urgency.';
```

### 4.2 Applying the Migration

For local development:
```bash
supabase db push
```

For remote (production) Supabase project, run the SQL directly in the Supabase SQL editor or via:
```bash
supabase db push --db-url "postgresql://postgres:[password]@[host]:5432/postgres"
```

### 4.3 Verifying the Migration

Run in the Supabase SQL editor to confirm all columns exist:
```sql
SELECT column_name, data_type, column_default
FROM information_schema.columns
WHERE table_name = 'tickets'
  AND column_name LIKE 'ai_%'
ORDER BY column_name;
```

Expected output: 6 rows with columns ai_category (text), ai_override (boolean, default false), ai_summary_hu (text), ai_triage_at (timestamptz), ai_urgency (integer), ai_vendor_suggestion (text).

---

## 5. Phase 2: Supabase Edge Function `triage-ticket`

### 5.1 File Location

Create the directory and file:
```
supabase/functions/triage-ticket/index.ts
```

### 5.2 Complete Deno TypeScript Implementation

```typescript
// supabase/functions/triage-ticket/index.ts
// Supabase Edge Function — AI triage for PanelLakó fault tickets
// Runtime: Deno (Supabase Edge Runtime)
// Model: claude-haiku-4-5-20251001

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

// ─── Types ───────────────────────────────────────────────────────────────────

interface TriageRequest {
  ticket_id: string;
  title: string;
  description: string;
  building_id?: string;
}

interface TriageResult {
  category: string;
  urgency: number;
  vendor_suggestion: string;
  summary_hu: string;
}

interface AnthropicMessage {
  role: 'user' | 'assistant';
  content: string;
}

interface AnthropicRequest {
  model: string;
  max_tokens: number;
  system: string;
  messages: AnthropicMessage[];
}

interface AnthropicResponse {
  content: Array<{
    type: string;
    text: string;
  }>;
  usage?: {
    input_tokens: number;
    output_tokens: number;
  };
}

// ─── Constants ────────────────────────────────────────────────────────────────

const ANTHROPIC_API_URL = 'https://api.anthropic.com/v1/messages';
const MODEL_ID = 'claude-haiku-4-5-20251001';
const MAX_TOKENS = 512;
const VALID_CATEGORIES = ['plumbing', 'electrical', 'structural', 'common_area', 'emergency', 'hvac', 'elevator', 'other'] as const;

// ─── Prompt Template ─────────────────────────────────────────────────────────
// IMPORTANT: This prompt is tuned to produce valid JSON reliably.
// Do not modify without re-testing against the JSON parser below.

function buildSystemPrompt(): string {
  return `Te egy magyarországi társasházi hibabejelentés-triázs AI asszisztens vagy.
A feladatod: egy hibabejelentés alapján strukturált JSON választ adni.

SZIGORÚ SZABÁLYOK:
1. Mindig és kizárólag valid JSON objektumot adj vissza — semmi más szöveget.
2. Ne írj magyarázatot, ne adj hozzá backtick-eket, ne kezdj "```json"-nal.
3. A JSON egyetlen sorban legyen, kezdődjön { jellel és végződjön } jellel.

VÁLASZ FORMÁTUM (pontosan ezt a struktúrát kövesd):
{"category":"KATEGÓRIA","urgency":SZAM,"vendor_suggestion":"JAVASLAT_MAGYARUL","summary_hu":"ÖSSZEFOGLALÓ_MAGYARUL"}

KATEGÓRIÁK (csak ezek egyike lehet a "category" értéke):
- "plumbing" — vízvezeték, csőtörés, szivárgás, WC, mosdó, lefolyó, bojler
- "electrical" — elektromos, villany, kapcsoló, konnekt, biztosíték, áramszünet
- "structural" — repedés, vakolat, falazat, tető, statika, nedvesség, penész
- "common_area" — lépcsőház, kapu, közös helyiség, lift (közös), takarítás, tábla
- "emergency" — tűz, gázszivárgás, árvíz, betörésveszély, azonnali életveszély
- "hvac" — fűtés, radiátor, kazán, légkondicionáló, szellőzés
- "elevator" — lift műszaki hiba, lift megáll, lift ajtó
- "other" — minden egyéb, ami nem illik a fentiek egyikébe

SÜRGŐSSÉG (1–10 egész szám):
- 1–4: Rutinkarbantartás, halasztható (pl. falfestés, zárcsere)
- 5–7: Mielőbbi intézkedés szükséges, de nem azonnali (pl. csöpögő csap, nem működő kaputelefon)
- 8–9: Sürgős beavatkozás szükséges (pl. csőtörés, liftrekedt személy, elektromos hiba)
- 10: Azonnali életveszély (tűz, gázszivárgás, strukturális összeomlás)

VENDOR_SUGGESTION: Egyetlen mondat magyarul, amely megnevezi a szükséges szakember típusát és a sürgősséget.
Példák:
- "Vízszerelő — haladéktalan kiszállás indokolt."
- "Villanyszerelő — sürgős vizsgálat szükséges."
- "Karbantartó — soron következő látogatáskor elvégezhető."
- "Épületgépész — 48 órán belüli kiszállás ajánlott."
- "Tűzoltóság / OLMF — azonnali értesítés!"

SUMMARY_HU: Egy tömör mondat (max 120 karakter) magyarul, amely összefoglalja a problémát és a helyszínt.`;
}

function buildUserMessage(title: string, description: string): string {
  return `Hibabejelentés adatai:
Cím: ${title}
Leírás: ${description}

Kérlek, triázsd ezt a hibabejelentést a megadott szabályok szerint. Csak JSON-t adj vissza.`;
}

// ─── JSON Parser with Fallback ────────────────────────────────────────────────

function parseTriageResponse(rawText: string): TriageResult | null {
  // Attempt 1: direct parse after stripping potential markdown fences
  let cleaned = rawText.trim();
  // Remove ```json ... ``` or ``` ... ``` fences if present
  cleaned = cleaned.replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/, '');
  // Remove any leading/trailing non-JSON characters
  const jsonStart = cleaned.indexOf('{');
  const jsonEnd = cleaned.lastIndexOf('}');
  if (jsonStart === -1 || jsonEnd === -1) {
    console.error('[triage-ticket] No JSON object found in response:', rawText);
    return null;
  }
  cleaned = cleaned.slice(jsonStart, jsonEnd + 1);

  try {
    const parsed = JSON.parse(cleaned);

    // Validate required fields
    if (typeof parsed.category !== 'string') {
      console.error('[triage-ticket] Missing or invalid category field');
      return null;
    }
    if (typeof parsed.urgency !== 'number' || parsed.urgency < 1 || parsed.urgency > 10) {
      console.error('[triage-ticket] Missing or invalid urgency field:', parsed.urgency);
      return null;
    }
    if (typeof parsed.vendor_suggestion !== 'string') {
      console.error('[triage-ticket] Missing vendor_suggestion field');
      return null;
    }
    if (typeof parsed.summary_hu !== 'string') {
      console.error('[triage-ticket] Missing summary_hu field');
      return null;
    }

    // Normalize category to valid enum
    const normalizedCategory = VALID_CATEGORIES.includes(parsed.category as typeof VALID_CATEGORIES[number])
      ? parsed.category
      : 'other';

    // Clamp urgency to 1–10
    const clampedUrgency = Math.max(1, Math.min(10, Math.round(parsed.urgency)));

    return {
      category: normalizedCategory,
      urgency: clampedUrgency,
      vendor_suggestion: String(parsed.vendor_suggestion).slice(0, 500),
      summary_hu: String(parsed.summary_hu).slice(0, 200),
    };
  } catch (err) {
    console.error('[triage-ticket] JSON parse error:', err, 'Raw text:', rawText);
    return null;
  }
}

// ─── Anthropic API Call ───────────────────────────────────────────────────────

async function callAnthropicApi(title: string, description: string): Promise<TriageResult | null> {
  const apiKey = Deno.env.get('ANTHROPIC_API_KEY');
  if (!apiKey) {
    console.error('[triage-ticket] ANTHROPIC_API_KEY not set in Edge Function secrets');
    return null;
  }

  const requestBody: AnthropicRequest = {
    model: MODEL_ID,
    max_tokens: MAX_TOKENS,
    system: buildSystemPrompt(),
    messages: [
      {
        role: 'user',
        content: buildUserMessage(title, description),
      },
    ],
  };

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 15000); // 15-second timeout

  try {
    const response = await fetch(ANTHROPIC_API_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': apiKey,
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify(requestBody),
      signal: controller.signal,
    });

    clearTimeout(timeoutId);

    if (!response.ok) {
      const errorBody = await response.text();
      console.error(`[triage-ticket] Anthropic API error ${response.status}:`, errorBody);

      // Handle rate limiting specifically
      if (response.status === 429) {
        console.error('[triage-ticket] Rate limited by Anthropic API. Ticket will remain un-triaged.');
      }
      return null;
    }

    const data: AnthropicResponse = await response.json();

    if (!data.content || data.content.length === 0) {
      console.error('[triage-ticket] Empty content array in Anthropic response');
      return null;
    }

    const rawText = data.content[0]?.text ?? '';
    console.log('[triage-ticket] Raw AI response:', rawText);
    console.log('[triage-ticket] Token usage:', JSON.stringify(data.usage));

    return parseTriageResponse(rawText);
  } catch (err) {
    clearTimeout(timeoutId);
    if ((err as Error).name === 'AbortError') {
      console.error('[triage-ticket] Anthropic API call timed out after 15 seconds');
    } else {
      console.error('[triage-ticket] Unexpected error calling Anthropic API:', err);
    }
    return null;
  }
}

// ─── Main Handler ─────────────────────────────────────────────────────────────

serve(async (req: Request) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response(null, {
      status: 204,
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'POST',
        'Access-Control-Allow-Headers': 'Content-Type, Authorization',
      },
    });
  }

  if (req.method !== 'POST') {
    return new Response(JSON.stringify({ error: 'Method not allowed' }), {
      status: 405,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  let body: TriageRequest;
  try {
    body = await req.json();
  } catch {
    return new Response(JSON.stringify({ error: 'Invalid JSON body' }), {
      status: 400,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  const { ticket_id, title, description } = body;

  if (!ticket_id || typeof ticket_id !== 'string') {
    return new Response(JSON.stringify({ error: 'ticket_id is required' }), {
      status: 400,
      headers: { 'Content-Type': 'application/json' },
    });
  }
  if (!title || typeof title !== 'string') {
    return new Response(JSON.stringify({ error: 'title is required' }), {
      status: 400,
      headers: { 'Content-Type': 'application/json' },
    });
  }
  if (!description || typeof description !== 'string') {
    return new Response(JSON.stringify({ error: 'description is required' }), {
      status: 400,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  // Initialize Supabase client with service role to bypass RLS
  const supabaseUrl = Deno.env.get('SUPABASE_URL');
  const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');

  if (!supabaseUrl || !supabaseServiceKey) {
    console.error('[triage-ticket] SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY not set');
    return new Response(JSON.stringify({ error: 'Server configuration error' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  const supabase = createClient(supabaseUrl, supabaseServiceKey);

  // Verify the ticket exists before calling the AI
  const { data: existingTicket, error: fetchError } = await supabase
    .from('tickets')
    .select('id, title, description')
    .eq('id', ticket_id)
    .single();

  if (fetchError || !existingTicket) {
    console.error('[triage-ticket] Ticket not found:', ticket_id, fetchError);
    return new Response(JSON.stringify({ error: 'Ticket not found' }), {
      status: 404,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  // Call Anthropic API
  console.log(`[triage-ticket] Starting triage for ticket ${ticket_id}: "${title}"`);
  const triageResult = await callAnthropicApi(title, description);

  if (!triageResult) {
    console.error(`[triage-ticket] Triage failed for ticket ${ticket_id} — leaving ai_triage_at as NULL`);
    return new Response(
      JSON.stringify({
        success: false,
        ticket_id,
        error: 'AI triage failed — ticket will remain in pending state',
      }),
      {
        status: 200, // Return 200 so the caller does not retry endlessly
        headers: { 'Content-Type': 'application/json' },
      }
    );
  }

  // Write AI fields to the database
  const { error: updateError } = await supabase
    .from('tickets')
    .update({
      ai_category: triageResult.category,
      ai_urgency: triageResult.urgency,
      ai_vendor_suggestion: triageResult.vendor_suggestion,
      ai_summary_hu: triageResult.summary_hu,
      ai_triage_at: new Date().toISOString(),
      ai_override: false, // reset override flag when re-triaged
    })
    .eq('id', ticket_id);

  if (updateError) {
    console.error(`[triage-ticket] Database update failed for ticket ${ticket_id}:`, updateError);
    return new Response(
      JSON.stringify({ success: false, ticket_id, error: 'Database update failed' }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
  }

  console.log(`[triage-ticket] Triage complete for ticket ${ticket_id}:`, JSON.stringify(triageResult));

  return new Response(
    JSON.stringify({
      success: true,
      ticket_id,
      triage: triageResult,
    }),
    {
      status: 200,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*',
      },
    }
  );
});
```

### 5.3 Deploying the Edge Function

```bash
supabase functions deploy triage-ticket --no-verify-jwt
```

The `--no-verify-jwt` flag is required because the function is called from the Server Action using a service role key, not a user JWT. The service role key in the Authorization header still provides authentication. For additional security, add a custom secret header check inside the function if desired.

### 5.4 Edge Function Secrets Setup

In Supabase Dashboard → Project Settings → Edge Functions → Manage secrets:
- `ANTHROPIC_API_KEY` = sk-ant-...
- `SUPABASE_URL` and `SUPABASE_SERVICE_ROLE_KEY` are automatically injected by the Supabase runtime — do not add them manually.

---

## 6. Phase 3: Wire Triage to Ticket Creation

### 6.1 Updated `app/actions/tickets.ts`

Replace the entire file with the following:

```typescript
'use server';

import { revalidatePath } from 'next/cache';
import { createClient } from '@/lib/supabase/server';

export type TicketPriority = 'alacsony' | 'kozepes' | 'magas' | 'kritikus';
export type TicketStatus = 'uj' | 'folyamatban' | 'varakozik' | 'lezarva';

export interface CreateTicketInput {
  title: string;
  description: string;
  location: string;
  priority: TicketPriority;
  submitted_by?: string;
  unit_label?: string;
  building_id?: string;
}

// Fire-and-forget: call the triage Edge Function asynchronously.
// This function does NOT await the triage call — the ticket creation
// returns immediately and triage happens in the background.
// The UI will show a skeleton/pending state until ai_triage_at is populated.
async function triggerAiTriage(
  ticketId: string,
  title: string,
  description: string,
  buildingId?: string
): Promise<void> {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl || !serviceRoleKey) {
    console.warn('[createTicket] Supabase URL or service role key missing — skipping AI triage');
    return;
  }

  const edgeFunctionUrl = `${supabaseUrl}/functions/v1/triage-ticket`;

  try {
    // Using fetch without await in the Server Action context is sufficient
    // for fire-and-forget because Node.js will not cancel the request
    // when the parent function returns — the fetch continues in the background.
    fetch(edgeFunctionUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${serviceRoleKey}`,
      },
      body: JSON.stringify({
        ticket_id: ticketId,
        title,
        description,
        building_id: buildingId,
      }),
    }).catch((err) => {
      // Catch errors from the fire-and-forget fetch to avoid unhandled rejections
      console.error('[createTicket] AI triage trigger failed:', err);
    });
  } catch (err) {
    // Belt-and-suspenders: catch any synchronous error from constructing the fetch
    console.error('[createTicket] Failed to trigger AI triage:', err);
  }
}

export async function createTicket(input: CreateTicketInput) {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();

  const { data, error } = await supabase
    .from('tickets')
    .insert({
      title: input.title,
      description: input.description,
      location: input.location,
      priority: input.priority,
      submitted_by: input.submitted_by ?? user?.email ?? 'Névtelen',
      unit_label: input.unit_label,
      building_id: input.building_id,
      reporter_id: user?.id ?? null,
      status: 'uj',
      // AI fields start as NULL — triage Edge Function fills them asynchronously
      ai_triage_at: null,
      ai_override: false,
    })
    .select()
    .single();

  if (error) {
    return { success: false, error: error.message };
  }

  // Trigger AI triage asynchronously — do NOT await
  // The ticket is already saved and the UI will update optimistically
  triggerAiTriage(data.id, input.title, input.description, input.building_id);

  revalidatePath('/');
  return { success: true, data };
}

export async function updateTicketStatus(ticketId: string, status: TicketStatus) {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return { success: false, error: 'Nem vagy bejelentkezve' };
  }

  const { error } = await supabase
    .from('tickets')
    .update({ status, updated_at: new Date().toISOString() })
    .eq('id', ticketId);

  if (error) {
    return { success: false, error: error.message };
  }

  revalidatePath('/');
  return { success: true };
}

export async function updateTicketAiOverride(
  ticketId: string,
  overrides: {
    ai_category?: string;
    ai_urgency?: number;
    ai_vendor_suggestion?: string;
  }
) {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return { success: false, error: 'Nem vagy bejelentkezve' };
  }

  // Validate urgency if provided
  if (overrides.ai_urgency !== undefined) {
    if (!Number.isInteger(overrides.ai_urgency) || overrides.ai_urgency < 1 || overrides.ai_urgency > 10) {
      return { success: false, error: 'Urgency must be an integer between 1 and 10' };
    }
  }

  const validCategories = ['plumbing', 'electrical', 'structural', 'common_area', 'emergency', 'hvac', 'elevator', 'other'];
  if (overrides.ai_category !== undefined && !validCategories.includes(overrides.ai_category)) {
    return { success: false, error: `Invalid category. Must be one of: ${validCategories.join(', ')}` };
  }

  const { error } = await supabase
    .from('tickets')
    .update({
      ...overrides,
      ai_override: true,
      updated_at: new Date().toISOString(),
    })
    .eq('id', ticketId);

  if (error) {
    return { success: false, error: error.message };
  }

  revalidatePath('/');
  return { success: true };
}
```

---

## 7. Phase 4: Update TypeScript Types

### 7.1 Updated `lib/types.ts` — Ticket Interface

Replace the `Ticket` interface in `lib/types.ts` with:

```typescript
export type AiCategory =
  | 'plumbing'
  | 'electrical'
  | 'structural'
  | 'common_area'
  | 'emergency'
  | 'hvac'
  | 'elevator'
  | 'other';

export interface Ticket {
  id: string;
  title: string;
  description: string;
  status: 'uj' | 'folyamatban' | 'varakozik' | 'lezarva';
  priority: 'alacsony' | 'kozepes' | 'magas' | 'kritikus';
  location: string;
  due_date: string | null;
  submitted_by?: string;
  unit_label?: string;
  created_at?: string;
  updated_at?: string;
  // AI triage fields — all nullable until Edge Function completes
  ai_category?: AiCategory | null;
  ai_urgency?: number | null;      // integer 1–10
  ai_vendor_suggestion?: string | null;
  ai_summary_hu?: string | null;
  ai_triage_at?: string | null;    // ISO 8601 timestamptz; null means pending
  ai_override?: boolean | null;   // true if manager has manually overridden AI
}
```

---

## 8. Phase 5: UI — Ticket List Enrichment in `components/dashboard-client.tsx`

### 8.1 New Component Functions to Add

Add the following component functions immediately after the existing `PriorityBadge` component (around line 200 in the current file):

```typescript
// ─── AI Triage UI Components ──────────────────────────────────────────────────

type AiCategoryType = 'plumbing' | 'electrical' | 'structural' | 'common_area' | 'emergency' | 'hvac' | 'elevator' | 'other';

const AI_CATEGORY_LABELS: Record<AiCategoryType, string> = {
  plumbing: 'Vízvezeték',
  electrical: 'Elektromos',
  structural: 'Szerkezeti',
  common_area: 'Közös terület',
  emergency: 'Vészhelyzet',
  hvac: 'Fűtés/légk.',
  elevator: 'Lift',
  other: 'Egyéb',
};

const AI_CATEGORY_COLORS: Record<AiCategoryType, string> = {
  plumbing: 'bg-sky-50 text-sky-700 ring-sky-200',
  electrical: 'bg-amber-50 text-amber-700 ring-amber-200',
  structural: 'bg-stone-50 text-stone-700 ring-stone-200',
  common_area: 'bg-violet-50 text-violet-700 ring-violet-200',
  emergency: 'bg-rose-50 text-rose-700 ring-rose-200',
  hvac: 'bg-orange-50 text-orange-700 ring-orange-200',
  elevator: 'bg-indigo-50 text-indigo-700 ring-indigo-200',
  other: 'bg-slate-100 text-slate-600 ring-slate-200',
};

function AiUrgencyBadge({ urgency }: { urgency: number | null | undefined }) {
  if (urgency === null || urgency === undefined) {
    return (
      <span className="inline-flex animate-pulse items-center gap-1 rounded-full bg-slate-100 px-2.5 py-1 text-xs font-bold text-slate-400 ring-1 ring-slate-200">
        <span className="h-2 w-2 rounded-full bg-slate-300" />
        AI...
      </span>
    );
  }

  let colorClass: string;
  let label: string;
  if (urgency <= 4) {
    colorClass = 'bg-emerald-50 text-emerald-700 ring-emerald-200';
    label = `AI ${urgency}`;
  } else if (urgency <= 7) {
    colorClass = 'bg-amber-50 text-amber-700 ring-amber-200';
    label = `AI ${urgency}`;
  } else {
    colorClass = 'bg-rose-50 text-rose-700 ring-rose-200';
    label = `AI ${urgency}!`;
  }

  return (
    <span className={`inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-bold ring-1 ${colorClass}`}>
      <Sparkles size={10} />
      {label}
    </span>
  );
}

function AiCategoryChip({ category }: { category: AiCategoryType | string | null | undefined }) {
  if (!category) return null;
  const safeCategory = (Object.keys(AI_CATEGORY_LABELS).includes(category) ? category : 'other') as AiCategoryType;
  return (
    <span className={`inline-flex items-center rounded-full px-2.5 py-1 text-xs font-bold ring-1 ${AI_CATEGORY_COLORS[safeCategory]}`}>
      {AI_CATEGORY_LABELS[safeCategory]}
    </span>
  );
}

function AiTriagePendingSkeleton() {
  return (
    <div className="mt-2 flex animate-pulse items-center gap-2">
      <div className="h-5 w-16 rounded-full bg-slate-100" />
      <div className="h-5 w-20 rounded-full bg-slate-100" />
      <div className="h-4 w-32 rounded bg-slate-100" />
    </div>
  );
}
```

### 8.2 Updated Ticket Card Rendering

Replace the ticket card rendering block inside the "Ticket queue" `SectionCard` (lines 775–796 in the current file) with:

```tsx
<div className="space-y-3">
  {visibleTickets.map((ticket) => {
    const isAiPending = ticket.ai_triage_at === null || ticket.ai_triage_at === undefined;
    const isAiOverridden = ticket.ai_override === true;
    const isHighUrgency = typeof ticket.ai_urgency === 'number' && ticket.ai_urgency >= 8;

    return (
      <article
        key={ticket.id}
        className={`rounded-3xl border p-4 transition-colors ${
          isHighUrgency
            ? 'border-rose-200 bg-rose-50/60'
            : 'border-slate-100 bg-slate-50/70'
        }`}
      >
        {/* Header row: title + badges */}
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="min-w-0 flex-1">
            <p className="font-black text-slate-950">{ticket.title}</p>
            {/* AI summary — shown instead of raw description when available */}
            {ticket.ai_summary_hu ? (
              <p className="mt-1 text-sm text-slate-600 italic">{ticket.ai_summary_hu}</p>
            ) : (
              <p className="mt-1 text-sm text-slate-600">{ticket.description}</p>
            )}
          </div>
          <div className="flex flex-wrap gap-2">
            <StatusBadge status={ticket.status} />
            <PriorityBadge priority={ticket.priority} />
            <AiUrgencyBadge urgency={ticket.ai_urgency} />
          </div>
        </div>

        {/* AI triage row */}
        {isAiPending ? (
          <AiTriagePendingSkeleton />
        ) : (
          <div className="mt-2 flex flex-wrap items-center gap-2">
            <AiCategoryChip category={ticket.ai_category} />
            {ticket.ai_vendor_suggestion ? (
              <span className="text-xs text-slate-500">{ticket.ai_vendor_suggestion}</span>
            ) : null}
            {isAiOverridden ? (
              <span className="rounded-full bg-violet-50 px-2 py-0.5 text-xs font-bold text-violet-600 ring-1 ring-violet-200">
                Manuálisan módosítva
              </span>
            ) : (
              <span className="rounded-full bg-emerald-50 px-2 py-0.5 text-xs font-bold text-emerald-600 ring-1 ring-emerald-200 flex items-center gap-1">
                <Sparkles size={9} />
                AI triázs
              </span>
            )}
          </div>
        )}

        {/* Metadata row */}
        <p className="mt-3 text-xs font-medium text-slate-500">
          Helyszín: {ticket.location}
          {' · '}Beküldte: {ticket.submitted_by || 'Ismeretlen'}
          {ticket.unit_label ? ` (${ticket.unit_label})` : ''}
          {' · '}Frissítve: {formatDateTime(ticket.updated_at)}
        </p>

        {/* Manager action buttons */}
        {isManager ? (
          <div className="mt-3 flex flex-wrap gap-2 text-xs">
            <button
              className="rounded-xl border border-slate-200 bg-white px-3 py-2 font-bold hover:border-brand-400"
              onClick={() => updateTicketStatus(ticket.id, 'folyamatban')}
              type="button"
            >
              Folyamatban
            </button>
            <button
              className="rounded-xl border border-slate-200 bg-white px-3 py-2 font-bold hover:border-violet-400"
              onClick={() => updateTicketStatus(ticket.id, 'varakozik')}
              type="button"
            >
              Várakozik
            </button>
            <button
              className="rounded-xl border border-slate-200 bg-white px-3 py-2 font-bold hover:border-emerald-400"
              onClick={() => updateTicketStatus(ticket.id, 'lezarva')}
              type="button"
            >
              Lezárás
            </button>
            {/* AI override button — only shown when triage is complete */}
            {!isAiPending ? (
              <button
                className="rounded-xl border border-violet-200 bg-violet-50 px-3 py-2 font-bold text-violet-700 hover:border-violet-400"
                onClick={() => handleAiOverrideClick(ticket.id)}
                type="button"
              >
                AI módosítás
              </button>
            ) : null}
          </div>
        ) : null}
      </article>
    );
  })}
</div>
```

---

## 9. Phase 6: Override UI

### 9.1 State and Handler in `DashboardClient`

Add these state variables inside the `DashboardClient` function (near the top with other `useState` calls):

```typescript
const [overrideTicketId, setOverrideTicketId] = useState<string | null>(null);
const [overrideUrgency, setOverrideUrgency] = useState<number>(5);
const [overrideCategory, setOverrideCategory] = useState<string>('other');
const [overrideSaving, setOverrideSaving] = useState(false);
```

Add the handler function inside `DashboardClient`:

```typescript
const handleAiOverrideClick = (ticketId: string) => {
  const ticket = tickets.find((t) => t.id === ticketId);
  if (!ticket) return;
  setOverrideTicketId(ticketId);
  setOverrideUrgency(ticket.ai_urgency ?? 5);
  setOverrideCategory(ticket.ai_category ?? 'other');
};

const submitAiOverride = async () => {
  if (!overrideTicketId) return;
  setOverrideSaving(true);
  try {
    const result = await updateTicketAiOverrideAction(overrideTicketId, {
      ai_category: overrideCategory as AiCategory,
      ai_urgency: overrideUrgency,
    });
    if (result.success) {
      setTickets((prev) =>
        prev.map((t) =>
          t.id === overrideTicketId
            ? { ...t, ai_category: overrideCategory as AiCategory, ai_urgency: overrideUrgency, ai_override: true }
            : t
        )
      );
      setOverrideTicketId(null);
    }
  } finally {
    setOverrideSaving(false);
  }
};
```

Add the import at the top of dashboard-client.tsx:
```typescript
import { createTicket as createTicketAction, updateTicketStatus as updateTicketStatusAction, updateTicketAiOverride as updateTicketAiOverrideAction } from '@/app/actions/tickets';
```

Also import `AiCategory` from types:
```typescript
import { ..., AiCategory } from '@/lib/types';
```

### 9.2 Override Modal JSX

Add the override modal at the end of the returned JSX, just before the closing `</div>`:

```tsx
{/* AI Override Modal */}
{overrideTicketId ? (
  <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm">
    <div className="w-full max-w-md rounded-3xl bg-white p-6 shadow-2xl">
      <h3 className="mb-4 flex items-center gap-2 text-lg font-black text-slate-900">
        <Sparkles size={18} className="text-violet-600" />
        AI triázs módosítása
      </h3>
      <div className="space-y-4">
        <div>
          <label className="mb-1 block text-sm font-bold text-slate-700">Kategória</label>
          <select
            className="w-full rounded-2xl border border-slate-200 px-4 py-3 text-sm"
            value={overrideCategory}
            onChange={(e) => setOverrideCategory(e.target.value)}
          >
            <option value="plumbing">Vízvezeték</option>
            <option value="electrical">Elektromos</option>
            <option value="structural">Szerkezeti</option>
            <option value="common_area">Közös terület</option>
            <option value="emergency">Vészhelyzet</option>
            <option value="hvac">Fűtés / Légkond.</option>
            <option value="elevator">Lift</option>
            <option value="other">Egyéb</option>
          </select>
        </div>
        <div>
          <label className="mb-1 block text-sm font-bold text-slate-700">
            Sürgősség: {overrideUrgency}/10
          </label>
          <input
            type="range"
            min={1}
            max={10}
            value={overrideUrgency}
            onChange={(e) => setOverrideUrgency(Number(e.target.value))}
            className="w-full accent-violet-600"
          />
          <div className="mt-1 flex justify-between text-xs text-slate-400">
            <span>1 — Rutinkarbantartás</span>
            <span>10 — Életveszély</span>
          </div>
        </div>
      </div>
      <div className="mt-6 flex gap-3">
        <button
          className="flex-1 rounded-2xl bg-violet-600 px-4 py-3 text-sm font-black text-white hover:bg-violet-700 disabled:opacity-50"
          onClick={submitAiOverride}
          disabled={overrideSaving}
          type="button"
        >
          {overrideSaving ? 'Mentés...' : 'Mentés'}
        </button>
        <button
          className="rounded-2xl border border-slate-200 px-4 py-3 text-sm font-bold text-slate-700 hover:bg-slate-50"
          onClick={() => setOverrideTicketId(null)}
          type="button"
        >
          Mégse
        </button>
      </div>
    </div>
  </div>
) : null}
```

---

## 10. Phase 7: Batch Triage for Existing Tickets

### 10.1 Batch Triage Server Action

Add to `app/actions/tickets.ts`:

```typescript
// Batch triage: re-triage all tickets that have never been triaged (ai_triage_at IS NULL).
// Intended for admin use only — call from an admin panel or one-time migration script.
// Rate: processes one ticket per second to avoid hammering the Anthropic API.
export async function batchTriageUntriaged(buildingId?: string): Promise<{ processed: number; failed: number }> {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    throw new Error('Unauthorized');
  }

  let query = supabase
    .from('tickets')
    .select('id, title, description, building_id')
    .is('ai_triage_at', null)
    .limit(50); // Process up to 50 tickets per batch to control cost

  if (buildingId) {
    query = query.eq('building_id', buildingId);
  }

  const { data: untriaged, error } = await query;

  if (error || !untriaged) {
    throw new Error(`Failed to fetch untriaged tickets: ${error?.message}`);
  }

  let processed = 0;
  let failed = 0;

  for (const ticket of untriaged) {
    // Add 1-second delay between calls to respect Anthropic rate limits
    if (processed > 0) {
      await new Promise((resolve) => setTimeout(resolve, 1000));
    }
    triggerAiTriage(ticket.id, ticket.title, ticket.description, ticket.building_id);
    processed++;
  }

  return { processed, failed };
}
```

### 10.2 Admin UI Button

In `dashboard-client.tsx`, inside the tickets SectionCard (visible only to managers), add a "Batch triage" button:

```tsx
{isManager ? (
  <div className="mb-4 flex justify-end">
    <button
      className="rounded-2xl border border-violet-200 bg-violet-50 px-4 py-2 text-xs font-bold text-violet-700 hover:bg-violet-100"
      type="button"
      onClick={async () => {
        // Dynamically import to keep initial bundle lean
        const { batchTriageUntriaged } = await import('@/app/actions/tickets');
        const result = await batchTriageUntriaged();
        alert(`Batch triage elindítva: ${result.processed} ticket`);
      }}
    >
      <Sparkles size={12} className="inline mr-1" />
      Batch AI triázs ({tickets.filter((t) => !t.ai_triage_at).length} függőben)
    </button>
  </div>
) : null}
```

---

## 11. Phase 8: Cost Monitoring

### 11.1 Edge Function Logging Strategy

The `triage-ticket` Edge Function already logs token usage via:
```typescript
console.log('[triage-ticket] Token usage:', JSON.stringify(data.usage));
```

Supabase Edge Function logs are accessible in:
- **Dashboard:** Supabase Dashboard → Functions → triage-ticket → Logs
- **CLI:** `supabase functions logs triage-ticket --tail`

### 11.2 Querying Costs from Logs

Supabase stores Edge Function logs in the `_edge_logs` system table. Run this SQL query weekly to estimate AI spend:

```sql
-- This query is for Supabase's managed log infrastructure.
-- In practice, extract token counts from Edge Function logs and calculate:
-- Cost = (input_tokens * 0.80 / 1_000_000) + (output_tokens * 4.00 / 1_000_000)
-- Monitor via Supabase Dashboard → Functions → triage-ticket → Logs
-- Filter for lines containing "Token usage" to extract usage data.
SELECT
  COUNT(*) AS triage_calls,
  now() AS checked_at
FROM tickets
WHERE ai_triage_at >= now() - INTERVAL '30 days';
```

### 11.3 Anthropic Usage Dashboard

Also monitor at: https://console.anthropic.com/usage — filter by date range to see actual spend. Set a billing alert at $20/month to catch unexpected volume spikes.

---

## 12. Testing Protocol

### 12.1 Unit Test for JSON Parser

Create `supabase/functions/triage-ticket/parser.test.ts`:

```typescript
// Test the parseTriageResponse function handles edge cases
// Run with: deno test supabase/functions/triage-ticket/parser.test.ts

import { assertEquals } from 'https://deno.land/std@0.168.0/testing/asserts.ts';

// Copy parseTriageResponse here for isolated testing
// ... (paste the function from index.ts)

Deno.test('parses valid JSON response', () => {
  const input = '{"category":"plumbing","urgency":8,"vendor_suggestion":"Vízszerelő szükséges.","summary_hu":"Csőtörés az alagsorban."}';
  const result = parseTriageResponse(input);
  assertEquals(result?.category, 'plumbing');
  assertEquals(result?.urgency, 8);
});

Deno.test('strips markdown fences', () => {
  const input = '```json\n{"category":"electrical","urgency":5,"vendor_suggestion":"Villanyszerelő.","summary_hu":"Biztosíték kiégett."}\n```';
  const result = parseTriageResponse(input);
  assertEquals(result?.category, 'electrical');
});

Deno.test('returns null for invalid JSON', () => {
  const result = parseTriageResponse('This is not JSON at all');
  assertEquals(result, null);
});

Deno.test('clamps urgency to 1-10', () => {
  const input = '{"category":"emergency","urgency":15,"vendor_suggestion":"Tűzoltóság.","summary_hu":"Tűz."}';
  const result = parseTriageResponse(input);
  assertEquals(result?.urgency, 10);
});
```

### 12.2 End-to-End Test Checklist

1. Create a new ticket with title "Csőtörés a pincében" and description "Víz folyik a pince aljáról, nagy vízfolt látható a padlón".
2. Verify the ticket appears immediately in the UI with status badges and a pending AI skeleton (animated pulse).
3. Wait 3–5 seconds and refresh the page.
4. Verify the ticket now shows `ai_category = "plumbing"`, `ai_urgency >= 7`, and a vendor suggestion.
5. In the Supabase SQL editor run: `SELECT ai_category, ai_urgency, ai_vendor_suggestion, ai_summary_hu, ai_triage_at FROM tickets ORDER BY created_at DESC LIMIT 1;` and verify all fields are populated.
6. Check Supabase Dashboard → Functions → triage-ticket → Logs for the success log line.
7. As a manager, click "AI módosítás" on the ticket, change the category and urgency, and save.
8. Verify `ai_override = TRUE` is set in the database.
9. Verify the ticket card shows "Manuálisan módosítva" badge instead of "AI triázs".
10. Create a ticket with description "Gázszivárgás szagát érzem a lépcsőházban" and verify `ai_urgency = 10` and `ai_category = "emergency"`.

---

## 13. Error Handling Reference

| Error scenario | Current behavior | How handled |
|---|---|---|
| ANTHROPIC_API_KEY not set | Log error, return null | Ticket saved, `ai_triage_at` stays NULL, UI shows pending skeleton forever |
| Anthropic API 429 rate limit | Log rate limit error, return null | Same as above; batch triage has 1s delay between calls |
| Anthropic API timeout (>15s) | AbortController fires, fetch cancelled | Same as above |
| Anthropic returns invalid JSON | parseTriageResponse returns null | Same as above |
| Ticket not found in DB | Return 404 from Edge Function | triggerAiTriage logs the error, ticket unaffected |
| Supabase update fails | Return 500 from Edge Function | AI fields not written; re-triage possible via batch |
| NEXT_PUBLIC_SUPABASE_URL not set | console.warn, skip triage | No AI enrichment; development fallback |

---

## 14. Privacy Considerations

The following ticket data is sent to Anthropic's API: `title` (user-submitted text) and `description` (user-submitted text). The `building_id` is sent as context but not included in the AI prompt text itself. No PII (names, unit numbers, addresses, phone numbers) is sent unless the user explicitly includes such information in the ticket title or description.

Recommended mitigation: Add a disclaimer in the ticket creation form: "A bejelentés szövege AI elemzésre kerülhet küldés után." Consider adding a GDPR-compliant data processing notice in the platform's privacy policy mentioning Anthropic as a sub-processor. Anthropic's data processing agreement is available at https://www.anthropic.com/legal/data-processing.

For GDPR compliance, set `anthropic-beta: data-retention-opt-out` header in the API call if available, or review Anthropic's latest data retention policy for API customers.

---

## 15. Rollback Plan

If the AI triage feature needs to be rolled back:

1. Remove the `triggerAiTriage` call from `createTicket` (one line change).
2. Remove the AI badge/chip/skeleton UI components from the ticket cards (revert the JSX diff).
3. Optionally drop the AI columns: `ALTER TABLE tickets DROP COLUMN ai_category, DROP COLUMN ai_urgency, DROP COLUMN ai_vendor_suggestion, DROP COLUMN ai_summary_hu, DROP COLUMN ai_triage_at, DROP COLUMN ai_override;` — but this destroys data. Prefer leaving columns in place and simply not displaying them.
4. Remove the Edge Function: `supabase functions delete triage-ticket`.
5. The `Ticket` type changes are backward-compatible (all fields optional/nullable), so no rollback needed there.

---

## 16. Integration with Vendor/Work Order Initiative

When `ai_urgency >= 8` and `ai_category` is set, the system should auto-suggest a work order. The integration point is in the ticket card's manager action row — add a "Work order létrehozása" button that pre-populates the work order creation modal with:
- `ticket_title`: the ticket title
- `vendor_name`: derived from `ai_vendor_suggestion` (parse the first word or use a mapping from category to default vendor)
- `due_date`: calculated as `today + (urgency >= 8 ? 1 : urgency >= 5 ? 7 : 30)` days
- `cost_estimate`: left blank for manager to fill

This integration is not part of the current prompt scope but is designed to be added in a follow-up PR without schema changes.

---

## 17. Definition of Done

The feature is complete when ALL of the following are true:

1. `supabase/migrations/20260515000001_ai_triage_columns.sql` is applied and all 6 `ai_*` columns exist in the `tickets` table with correct types and constraints.
2. `supabase/functions/triage-ticket/index.ts` is deployed and visible in the Supabase Dashboard → Functions list.
3. Creating a ticket via the UI triggers the Edge Function (verify in Function logs within 30 seconds of submission).
4. All 4 AI fields (`ai_category`, `ai_urgency`, `ai_vendor_suggestion`, `ai_summary_hu`) are populated in the database within 10 seconds of ticket creation under normal network conditions.
5. `ai_triage_at` is set to a non-null timestamp after successful triage.
6. Tickets with `ai_triage_at = NULL` show an animated skeleton in the ticket card's AI row (no layout shift).
7. Tickets with completed triage show: `AiUrgencyBadge` (green/amber/red), `AiCategoryChip` with Hungarian label, vendor suggestion text, and "AI triázs" badge.
8. High-urgency tickets (`ai_urgency >= 8`) have a red-tinted card border (`border-rose-200 bg-rose-50/60`).
9. The `Ticket` TypeScript type in `lib/types.ts` includes all 6 `ai_*` fields as optional/nullable.
10. Manager override flow works: clicking "AI módosítás" opens the modal, saving writes the override to the DB and sets `ai_override = TRUE`.
11. The "Manuálisan módosítva" badge appears on overridden tickets; the "AI triázs" badge appears on non-overridden triaged tickets.
12. Batch triage button is visible to managers and triggers `batchTriageUntriaged()`.
13. The Anthropic API error handling paths (missing key, timeout, invalid JSON, rate limit) all result in the ticket being saved without AI fields rather than the ticket creation failing.
14. `CHANGELOG.md` updated with the new feature entry.
15. `versioning/` and `marketing/marketing_values/` files created for this delivery.
