import { NextRequest, NextResponse } from 'next/server';
import { createClient as createAdminClient } from '@supabase/supabase-js';
import webpush from 'web-push';
import { requireWorkspaceCapability, WorkspaceAuthorizationError } from '@/lib/authorization/guards';
import { sanitizeReturnTo } from '@/lib/auth/return-to';

export const dynamic = 'force-dynamic';

interface SendBody {
  buildingId: string;
  title: string;
  body: string;
  url?: string;
  targetRole?: 'all' | 'lako' | 'manager';
}

webpush.setVapidDetails(
  'mailto:info@panellako.hu',
  process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY ?? '',
  process.env.VAPID_PRIVATE_KEY ?? ''
);

export async function POST(request: NextRequest) {
  let body: SendBody;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });
  }

  const { buildingId: workspaceId, title, body: msgBody, url, targetRole = 'all' } = body;

  if (!workspaceId || !title?.trim() || !msgBody?.trim()) {
    return NextResponse.json({ error: 'buildingId, title, and body are required' }, { status: 400 });
  }
  if (!['all', 'lako', 'manager'].includes(targetRole)) {
    return NextResponse.json({ error: 'targetRole is invalid' }, { status: 400 });
  }
  if (title.trim().length > 120 || msgBody.trim().length > 1000) {
    return NextResponse.json({ error: 'Notification content is too long' }, { status: 400 });
  }

  try {
    await requireWorkspaceCapability(workspaceId, 'announcement.publish');
  } catch (error) {
    const status = error instanceof WorkspaceAuthorizationError && error.code === 'AUTH_REQUIRED' ? 401 : 403;
    return NextResponse.json({ error: status === 401 ? 'Unauthorized' : 'Forbidden' }, { status });
  }

  const supabaseUrl = (process.env.NEXT_PUBLIC_SUPABASE_URL ?? '').trim();
  const serviceRoleKey = (process.env.SUPABASE_SERVICE_ROLE_KEY ?? '').trim();
  if (!supabaseUrl || !serviceRoleKey) {
    return NextResponse.json({ error: 'Push delivery service is not configured' }, { status: 503 });
  }
  const supabase = createAdminClient(supabaseUrl, serviceRoleKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  // Recipient expansion is service-role-only and derives manager classification
  // from the canonical mandate/delegation authority chain in PostgreSQL.
  const { data: recipients, error: recipientError } = await supabase.rpc(
    'resolve_workspace_push_recipients',
    {
      p_workspace_id: workspaceId,
      p_target_role: targetRole,
    },
  );
  if (recipientError) {
    console.error('[push/send] recipient resolver error:', recipientError.code ?? 'RPC_FAILED');
    return NextResponse.json({ error: 'Push recipients could not be resolved' }, { status: 500 });
  }

  const profileIds = (recipients ?? [])
    .map((recipient: { profile_id?: unknown }) => recipient.profile_id)
    .filter((profileId: unknown): profileId is string => typeof profileId === 'string');

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
    title: title.trim(),
    body: msgBody.trim(),
    url: sanitizeReturnTo(url, `/w/${workspaceId}`),
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
