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

const MANAGER_ROLE_KEYS = new Set([
  'COMMON_REPRESENTATIVE_ADMIN',
  'BOARD_ADMIN',
  'SELF_MANAGED_ADMIN',
  'DELEGATE_OPERATIONS',
]);

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

  // Recipient expansion happens only after the caller-bound capability check.
  const { data: memberships, error: memberError } = await supabase
    .from('workspace_memberships')
    .select('id, profile_id')
    .eq('workspace_id', workspaceId)
    .eq('status', 'ACTIVE');

  if (memberError) {
    console.error('[push/send] memberships query error:', memberError);
    return NextResponse.json({ error: memberError.message }, { status: 500 });
  }

  if (!memberships || memberships.length === 0) {
    return NextResponse.json({ sent: 0, failed: 0 });
  }

  const memberRows = memberships as Array<{ id: string; profile_id: string }>;
  let profileIds = memberRows.map((member) => member.profile_id);

  if (targetRole !== 'all') {
    const membershipIds = memberRows.map((member) => member.id);
    const { data: assignments, error: assignmentError } = await supabase
      .from('role_assignments')
      .select('membership_id, role_key')
      .eq('workspace_id', workspaceId)
      .eq('status', 'ACTIVE')
      .in('membership_id', membershipIds);
    if (assignmentError) {
      return NextResponse.json({ error: 'Recipient roles could not be resolved' }, { status: 500 });
    }

    const managerMembershipIds = new Set(
      (assignments ?? [])
        .filter((assignment: { role_key: string }) => MANAGER_ROLE_KEYS.has(assignment.role_key))
        .map((assignment: { membership_id: string }) => assignment.membership_id),
    );
    profileIds = memberRows
      .filter((member) => targetRole === 'manager'
        ? managerMembershipIds.has(member.id)
        : !managerMembershipIds.has(member.id))
      .map((member) => member.profile_id);
  }

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
