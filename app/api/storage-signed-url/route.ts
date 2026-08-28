import { NextRequest, NextResponse } from 'next/server';
import {
  authorizationMessage,
  requireAuthenticatedUser,
  requireWorkspaceCapability,
} from '@/lib/authorization/guards';
export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const path = searchParams.get('path');
  const workspaceId = searchParams.get('workspace_id');
  const meetingId = searchParams.get('meeting_id');

  if (!path || !workspaceId || !meetingId) {
    return NextResponse.json(
      { error: 'path, workspace_id and meeting_id parameters are required' },
      { status: 400 },
    );
  }

  let auth: Awaited<ReturnType<typeof requireAuthenticatedUser>>;
  let context: Awaited<ReturnType<typeof requireWorkspaceCapability>>;
  try {
    [auth, context] = await Promise.all([
      requireAuthenticatedUser(),
      requireWorkspaceCapability(workspaceId, 'meeting.read'),
    ]);
  } catch (error) {
    return NextResponse.json({ error: authorizationMessage(error) }, { status: 403 });
  }
  const { supabase } = auth;

  const { data: meeting } = await supabase
    .from('meetings')
    .select('id, protocol_url')
    .eq('id', meetingId)
    .eq('building_id', context.primaryBuildingId)
    .maybeSingle();
  if (!meeting || meeting.protocol_url !== path) {
    return NextResponse.json({ error: 'A művelet nem engedélyezett.' }, { status: 403 });
  }

  const { data, error } = await supabase.storage
    .from('documents')
    .createSignedUrl(path, 60 * 10); // 10 minutes

  if (error || !data?.signedUrl) {
    return NextResponse.json({ error: error?.message ?? 'Failed to generate signed URL' }, { status: 500 });
  }

  return NextResponse.json({ url: data.signedUrl });
}
