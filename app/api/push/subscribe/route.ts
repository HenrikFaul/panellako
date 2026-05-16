import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

export async function POST(request: NextRequest) {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  let subscription: PushSubscription;
  try {
    subscription = await request.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });
  }

  const endpoint = (subscription as unknown as { endpoint: string }).endpoint;
  const keys = (subscription as unknown as { keys: { p256dh: string; auth: string } }).keys;

  if (!endpoint || !keys?.p256dh || !keys?.auth) {
    return NextResponse.json({ error: 'Missing required push subscription fields' }, { status: 400 });
  }

  const { error } = await supabase
    .from('push_subscriptions')
    .upsert(
      {
        profile_id: user.id,
        endpoint,
        p256dh: keys.p256dh,
        auth: keys.auth,
        user_agent: request.headers.get('user-agent') ?? null,
        updated_at: new Date().toISOString(),
      },
      { onConflict: 'endpoint' }
    );

  if (error) {
    console.error('[push/subscribe] DB error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ success: true });
}

export async function DELETE(request: NextRequest) {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { endpoint } = await request.json().catch(() => ({ endpoint: null }));

  if (!endpoint) {
    return NextResponse.json({ error: 'endpoint required' }, { status: 400 });
  }

  await supabase
    .from('push_subscriptions')
    .delete()
    .eq('profile_id', user.id)
    .eq('endpoint', endpoint);

  return NextResponse.json({ success: true });
}
