// Supabase Edge Function — AI triage for PanelLakó fault tickets
// Runtime: Deno (Supabase Edge Runtime)
// Model: claude-haiku-4-5-20251001
// Deploy: supabase functions deploy triage-ticket --no-verify-jwt

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

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
  content: Array<{ type: string; text: string }>;
  usage?: { input_tokens: number; output_tokens: number };
}

const ANTHROPIC_API_URL = 'https://api.anthropic.com/v1/messages';
const MODEL_ID = 'claude-haiku-4-5-20251001';
const MAX_TOKENS = 512;
const VALID_CATEGORIES = ['plumbing', 'electrical', 'structural', 'common_area', 'emergency', 'hvac', 'elevator', 'other'] as const;

function buildSystemPrompt(): string {
  return `Te egy magyarországi társasházi hibabejelentés-triázs AI asszisztens vagy.
A feladatod: egy hibabejelentés alapján strukturált JSON választ adni.

SZIGORÚ SZABÁLYOK:
1. Mindig és kizárólag valid JSON objektumot adj vissza — semmi más szöveget.
2. Ne írj magyarázatot, ne adj hozzá backtick-eket, ne kezdj "\`\`\`json"-nal.
3. A JSON egyetlen sorban legyen, kezdődjön { jellel és végződjön } jellel.

VÁLASZ FORMÁTUM:
{"category":"KATEGÓRIA","urgency":SZAM,"vendor_suggestion":"JAVASLAT_MAGYARUL","summary_hu":"ÖSSZEFOGLALÓ_MAGYARUL"}

KATEGÓRIÁK:
- "plumbing" — vízvezeték, csőtörés, szivárgás, WC, mosdó, lefolyó, bojler
- "electrical" — elektromos, villany, kapcsoló, konnekt, biztosíték, áramszünet
- "structural" — repedés, vakolat, falazat, tető, statika, nedvesség, penész
- "common_area" — lépcsőház, kapu, közös helyiség, lift (közös), takarítás
- "emergency" — tűz, gázszivárgás, árvíz, betörésveszély, azonnali életveszély
- "hvac" — fűtés, radiátor, kazán, légkondicionáló, szellőzés
- "elevator" — lift műszaki hiba, lift megáll, lift ajtó
- "other" — minden egyéb

SÜRGŐSSÉG (1–10 egész szám):
- 1–4: Rutinkarbantartás, halasztható
- 5–7: Mielőbbi intézkedés szükséges, de nem azonnali
- 8–9: Sürgős beavatkozás szükséges
- 10: Azonnali életveszély

VENDOR_SUGGESTION: Egyetlen mondat magyarul — a szükséges szakember típusa és sürgősség.
SUMMARY_HU: Egy tömör mondat (max 120 karakter) magyarul — összefoglalja a problémát.`;
}

function buildUserMessage(title: string, description: string): string {
  return `Hibabejelentés adatai:\nCím: ${title}\nLeírás: ${description}\n\nKérlek, triázsd ezt a hibabejelentést. Csak JSON-t adj vissza.`;
}

function parseTriageResponse(rawText: string): TriageResult | null {
  let cleaned = rawText.trim().replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/, '');
  const jsonStart = cleaned.indexOf('{');
  const jsonEnd = cleaned.lastIndexOf('}');
  if (jsonStart === -1 || jsonEnd === -1) {
    console.error('[triage-ticket] No JSON object found:', rawText);
    return null;
  }
  cleaned = cleaned.slice(jsonStart, jsonEnd + 1);

  try {
    const parsed = JSON.parse(cleaned);
    if (typeof parsed.category !== 'string') return null;
    if (typeof parsed.urgency !== 'number' || parsed.urgency < 1 || parsed.urgency > 10) return null;
    if (typeof parsed.vendor_suggestion !== 'string') return null;
    if (typeof parsed.summary_hu !== 'string') return null;

    const normalizedCategory = VALID_CATEGORIES.includes(parsed.category as typeof VALID_CATEGORIES[number])
      ? parsed.category
      : 'other';

    return {
      category: normalizedCategory,
      urgency: Math.max(1, Math.min(10, Math.round(parsed.urgency))),
      vendor_suggestion: String(parsed.vendor_suggestion).slice(0, 500),
      summary_hu: String(parsed.summary_hu).slice(0, 200),
    };
  } catch (err) {
    console.error('[triage-ticket] JSON parse error:', err, 'Raw:', rawText);
    return null;
  }
}

async function callAnthropicApi(title: string, description: string): Promise<TriageResult | null> {
  const apiKey = Deno.env.get('ANTHROPIC_API_KEY');
  if (!apiKey) {
    console.error('[triage-ticket] ANTHROPIC_API_KEY not set');
    return null;
  }

  const requestBody: AnthropicRequest = {
    model: MODEL_ID,
    max_tokens: MAX_TOKENS,
    system: buildSystemPrompt(),
    messages: [{ role: 'user', content: buildUserMessage(title, description) }],
  };

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 15000);

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
      return null;
    }

    const data: AnthropicResponse = await response.json();
    const rawText = data.content[0]?.text ?? '';
    console.log('[triage-ticket] Raw AI response:', rawText);
    console.log('[triage-ticket] Token usage:', JSON.stringify(data.usage));

    return parseTriageResponse(rawText);
  } catch (err) {
    clearTimeout(timeoutId);
    if ((err as Error).name === 'AbortError') {
      console.error('[triage-ticket] Anthropic API timed out after 15s');
    } else {
      console.error('[triage-ticket] Unexpected error:', err);
    }
    return null;
  }
}

serve(async (req: Request) => {
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

  if (!ticket_id || !title || !description) {
    return new Response(JSON.stringify({ error: 'ticket_id, title and description are required' }), {
      status: 400,
      headers: { 'Content-Type': 'application/json' },
    });
  }

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

  console.log(`[triage-ticket] Starting triage for ticket ${ticket_id}: "${title}"`);
  const triageResult = await callAnthropicApi(title, description);

  if (!triageResult) {
    console.error(`[triage-ticket] Triage failed for ticket ${ticket_id}`);
    return new Response(
      JSON.stringify({ success: false, ticket_id, error: 'AI triage failed' }),
      { status: 200, headers: { 'Content-Type': 'application/json' } }
    );
  }

  const { error: updateError } = await supabase
    .from('tickets')
    .update({
      ai_category: triageResult.category,
      ai_urgency: triageResult.urgency,
      ai_vendor_suggestion: triageResult.vendor_suggestion,
      ai_summary_hu: triageResult.summary_hu,
      ai_triage_at: new Date().toISOString(),
      ai_override: false,
    })
    .eq('id', ticket_id);

  if (updateError) {
    console.error(`[triage-ticket] DB update failed for ticket ${ticket_id}:`, updateError);
    return new Response(
      JSON.stringify({ success: false, ticket_id, error: 'Database update failed' }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
  }

  console.log(`[triage-ticket] Triage complete for ticket ${ticket_id}:`, JSON.stringify(triageResult));

  return new Response(
    JSON.stringify({ success: true, ticket_id, triage: triageResult }),
    { status: 200, headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' } }
  );
});
