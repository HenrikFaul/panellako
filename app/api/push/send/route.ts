import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import webpush from 'web-push';

export const dynamic = 'force-dynamic';

interface SendBody {
  buildingId: string;
  title: string;
  body: string;
  url?: string;
  targetRole?: 'all' | 'lako' | 'manager';
}

const MANAGER_ROLES = ['kozos_kepviselo', 'megbizott'];
const LAKO_ROLES = ['lako', 'tulajdonos'];

webpush.setVapidDetails(
  'mailto:info@panellako.hu',
  process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY ?? '',
  process.env.VAPID_PRIVATE_KEY ?? ''
);

export async function POST(request: NextRequest) {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  let body: SendBody;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });
  }

  const { buildingId, title, body: msgBody, url, targetRole = 'all' } = body;

  if (!buildingId || !title || !msgBody) {
    return NextResponse.json({ error: 'buildingId, title, and body are required' }, { status: 400 });
  }

  // Check the caller is a manager of this building
  const { data: senderMembership } = await supabase
    .from('memberships')
    .select('role')
    .eq('profile_id', user.id)
    .eq('building_id', buildingId)
    .eq('active', true)
    .limit(1)
    .maybeSingle();

  if (!senderMembership || !MANAGER_ROLES.includes((senderMembership as { role: string }).role)) {
    return NextResponse.json({ error: 'Forbidden — only managers can send push notifications' }, { status: 403 });
  }

  // Get all active members for this building with their role
  const { data: memberships, error: memberError } = await supabase
    .from('memberships')
    .select('profile_id, role')
    .eq('building_id', buildingId)
    .eq('active', true);

  if (memberError) {
    console.error('[push/send] memberships query error:', memberError);
    return NextResponse.json({ error: memberError.message }, { status: 500 });
  }

  if (!memberships || memberships.length === 0) {
    return NextResponse.json({ sent: 0, failed: 0 });
  }

  // Filter members by targetRole
  const filteredMembers = (memberships as Array<{ profile_id: string; role: string }>).filter((m) => {
    if (targetRole === 'all') return true;
    if (targetRole === 'lako') return LAKO_ROLES.includes(m.role);
    if (targetRole === 'manager') return MANAGER_ROLES.includes(m.role);
    return true;
  });

  const profileIds = filteredMembers.map((m) => m.profile_id);

  if (profileIds.length === 0) {
    return NextResponse.json({ sent: 0, failed: 0 });
  }

  // Get push subscriptions for those profiles
  const { data: subscriptions, error: subError } = await supabase
    .from('push_subscriptions')
    .select('endpoint, p256dh, auth')
    .in('profile_id', profileIds);

  if (subError) {
    console.error('[push/send] subscriptions query error:', subError);
    return NextResponse.json({ error: subError.message }, { status: 500 });
  }

  if (!subscriptions || subscriptions.length === 0) {
    return NextResponse.json({ sent: 0, failed: 0 });
  }

  const payload = JSON.stringify({
    title,
    body: msgBody,
    url: url ?? `/${buildingId}`,
  });

  let sent = 0;
  let failed = 0;
  const expiredEndpoints: string[] = [];

  await Promise.all(
    (subscriptions as Array<{ endpoint: string; p256dh: string; auth: string }>).map(async (sub) => {
      try {
        await webpush.sendNotification(
          {
            endpoint: sub.endpoint,
            keys: { p256dh: sub.p256dh, auth: sub.auth },
          },
          payload
        );
        sent++;
      } catch (err) {
        const statusCode = (err as { statusCode?: number }).statusCode;
        if (statusCode === 410 || statusCode === 404) {
          expiredEndpoints.push(sub.endpoint);
        } else {
          console.error('[push/send] sendNotification error:', err);
        }
        failed++;
      }
    })
  );

  // Clean up expired subscriptions
  if (expiredEndpoints.length > 0) {
    await supabase
      .from('push_subscriptions')
      .delete()
      .in('endpoint', expiredEndpoints);
  }

  return NextResponse.json({ sent, failed });
}
