// Supabase Edge Function — send Web Push notifications to subscribed users
// Runtime: Deno (Supabase Edge Runtime)
// Deploy: supabase functions deploy send-push --no-verify-jwt
// Required secrets: VAPID_PUBLIC_KEY, VAPID_PRIVATE_KEY, VAPID_SUBJECT, SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

interface PushPayload {
  title: string;
  body: string;
  url?: string;
  icon?: string;
  badge?: string;
  tag?: string;
}

interface SendPushRequest {
  profile_ids?: string[];  // Send to specific profiles
  building_id?: string;    // Send to all subscribers in a building
  payload: PushPayload;
}

interface PushSubscriptionRow {
  endpoint: string;
  p256dh: string;
  auth: string;
  profile_id: string;
}

// Encode a Uint8Array to base64url (needed for VAPID JWT)
function toBase64Url(buffer: ArrayBuffer): string {
  return btoa(String.fromCharCode(...new Uint8Array(buffer)))
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=/g, '');
}

// Generate VAPID JWT for Web Push authentication
async function generateVapidJwt(audience: string, subject: string, privateKeyBase64: string): Promise<string> {
  const now = Math.floor(Date.now() / 1000);
  const header = toBase64Url(new TextEncoder().encode(JSON.stringify({ typ: 'JWT', alg: 'ES256' })));
  const payload = toBase64Url(new TextEncoder().encode(JSON.stringify({
    aud: audience,
    exp: now + 12 * 3600,
    sub: subject,
  })));

  const keyData = Uint8Array.from(atob(privateKeyBase64.replace(/-/g, '+').replace(/_/g, '/')), c => c.charCodeAt(0));
  const key = await crypto.subtle.importKey(
    'raw',
    keyData,
    { name: 'ECDSA', namedCurve: 'P-256' },
    false,
    ['sign']
  );

  const data = new TextEncoder().encode(`${header}.${payload}`);
  const signature = await crypto.subtle.sign({ name: 'ECDSA', hash: 'SHA-256' }, key, data);
  return `${header}.${payload}.${toBase64Url(signature)}`;
}

// Send a single push notification
async function sendPush(
  subscription: PushSubscriptionRow,
  payload: PushPayload,
  vapidPublicKey: string,
  vapidPrivateKey: string,
  vapidSubject: string
): Promise<{ success: boolean; error?: string }> {
  try {
    const url = new URL(subscription.endpoint);
    const audience = `${url.protocol}//${url.host}`;

    const jwt = await generateVapidJwt(audience, vapidSubject, vapidPrivateKey);

    const body = JSON.stringify(payload);
    const encoder = new TextEncoder();
    const encoded = encoder.encode(body);

    const response = await fetch(subscription.endpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/octet-stream',
        'Content-Encoding': 'aes128gcm',
        'Authorization': `vapid t=${jwt},k=${vapidPublicKey}`,
        'TTL': '86400',
      },
      body: encoded,
    });

    if (!response.ok && response.status !== 201) {
      const text = await response.text();
      return { success: false, error: `Push failed ${response.status}: ${text}` };
    }

    return { success: true };
  } catch (err) {
    return { success: false, error: String(err) };
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

  const vapidPublicKey = Deno.env.get('VAPID_PUBLIC_KEY');
  const vapidPrivateKey = Deno.env.get('VAPID_PRIVATE_KEY');
  const vapidSubject = Deno.env.get('VAPID_SUBJECT') ?? 'mailto:support@panellako.hu';
  const supabaseUrl = Deno.env.get('SUPABASE_URL');
  const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');

  if (!vapidPublicKey || !vapidPrivateKey || !supabaseUrl || !serviceRoleKey) {
    return new Response(JSON.stringify({ error: 'Missing required environment variables' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  let body: SendPushRequest;
  try {
    body = await req.json();
  } catch {
    return new Response(JSON.stringify({ error: 'Invalid JSON' }), {
      status: 400,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  const supabase = createClient(supabaseUrl, serviceRoleKey);

  // Build query for subscriptions
  let query = supabase.from('push_subscriptions').select('endpoint, p256dh, auth, profile_id');

  if (body.profile_ids?.length) {
    query = query.in('profile_id', body.profile_ids);
  } else if (body.building_id) {
    // Get profile_ids for building members
    const { data: members } = await supabase
      .from('memberships')
      .select('profile_id')
      .eq('building_id', body.building_id)
      .eq('active', true);

    if (!members?.length) {
      return new Response(JSON.stringify({ success: true, sent: 0, failed: 0 }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    query = query.in('profile_id', members.map((m: { profile_id: string }) => m.profile_id));
  } else {
    return new Response(JSON.stringify({ error: 'Either profile_ids or building_id required' }), {
      status: 400,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  const { data: subscriptions, error: fetchError } = await query;

  if (fetchError) {
    return new Response(JSON.stringify({ error: fetchError.message }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  if (!subscriptions?.length) {
    return new Response(JSON.stringify({ success: true, sent: 0, failed: 0, message: 'No subscriptions found' }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  // Send to all subscriptions in parallel
  const results = await Promise.allSettled(
    subscriptions.map((sub: PushSubscriptionRow) =>
      sendPush(sub, body.payload, vapidPublicKey, vapidPrivateKey, vapidSubject)
    )
  );

  let sent = 0;
  let failed = 0;
  const expiredEndpoints: string[] = [];

  results.forEach((result, i) => {
    if (result.status === 'fulfilled' && result.value.success) {
      sent++;
    } else {
      failed++;
      // Track expired/invalid subscriptions for cleanup
      expiredEndpoints.push(subscriptions[i].endpoint);
    }
  });

  // Clean up expired subscriptions (410 Gone responses indicate invalid endpoints)
  if (expiredEndpoints.length > 0) {
    await supabase.from('push_subscriptions').delete().in('endpoint', expiredEndpoints);
  }

  return new Response(
    JSON.stringify({ success: true, sent, failed }),
    { status: 200, headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' } }
  );
});
