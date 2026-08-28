import { randomUUID } from 'node:crypto';
import { createServerClient } from '@supabase/ssr';
import { createClient } from '@supabase/supabase-js';

const EXPECTED_PROJECT_REF = 'wzromwxpjlyrqbdiapep';

function required(name) {
  const value = (process.env[name] ?? '').trim();
  if (!value) throw new Error(`${name} is required`);
  return value;
}

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

function assertNoError(result, operation) {
  if (result.error) throw new Error(`${operation} failed: ${result.error.message}`);
  return result.data;
}

function createAuthenticatedClient(url, anonKey) {
  const cookieJar = new Map();
  const client = createServerClient(url, anonKey, {
    cookies: {
      getAll: () => [...cookieJar].map(([name, value]) => ({ name, value })),
      setAll: (cookies) => {
        for (const { name, value } of cookies) cookieJar.set(name, value);
      },
    },
  });

  return {
    client,
    cookieHeader: () => [...cookieJar].map(([name, value]) => `${name}=${value}`).join('; '),
  };
}

async function signIn(session, email, password, label) {
  const { data, error } = await session.client.auth.signInWithPassword({ email, password });
  if (error || !data.user || !data.session) throw new Error(`${label} sign-in failed`);
  assert(session.cookieHeader().length > 0, `${label} did not receive SSR auth cookies`);
  return data.user;
}

async function fetchHosted(hostUrl, path, cookieHeader = '') {
  const headers = cookieHeader ? { Cookie: cookieHeader } : undefined;
  const response = await fetch(new URL(path, hostUrl), {
    headers,
    redirect: 'manual',
    signal: AbortSignal.timeout(30_000),
  });
  return {
    status: response.status,
    location: response.headers.get('location'),
    body: await response.text(),
  };
}

async function main() {
  const supabaseUrl = required('NEXT_PUBLIC_SUPABASE_URL');
  const anonKey = required('NEXT_PUBLIC_SUPABASE_ANON_KEY');
  const serviceRoleKey = required('SUPABASE_SERVICE_ROLE_KEY');
  const hostUrl = new URL(required('E2E_HOST_URL'));
  const managerEmail = required('E2E_MANAGER_EMAIL');
  const managerPassword = required('E2E_MANAGER_PASSWORD');
  const residentEmail = required('E2E_RESIDENT_EMAIL');
  const residentPassword = required('E2E_RESIDENT_PASSWORD');

  assert(
    new URL(supabaseUrl).hostname === `${EXPECTED_PROJECT_REF}.supabase.co`,
    'Refusing to run against an unexpected Supabase project',
  );
  assert(hostUrl.protocol === 'https:', 'Hosted E2E requires HTTPS');

  const service = createClient(supabaseUrl, serviceRoleKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
  const manager = createAuthenticatedClient(supabaseUrl, anonKey);
  const resident = createAuthenticatedClient(supabaseUrl, anonKey);
  const managerUser = await signIn(manager, managerEmail, managerPassword, 'Manager');
  await signIn(resident, residentEmail, residentPassword, 'Resident');

  const accountLink = assertNoError(
    await service
      .from('person_account_links')
      .select('person_id')
      .eq('profile_id', managerUser.id)
      .is('valid_to', null)
      .maybeSingle(),
    'Manager party lookup',
  );
  assert(accountLink?.person_id, 'Manager has no active person/party link');

  const runId = randomUUID();
  const workspaceId = randomUUID();
  const addressId = randomUUID();
  const unitId = randomUUID();
  const membershipId = randomUUID();
  const mandateId = randomUUID();
  const roleAssignmentId = randomUUID();
  const workspaceName = `E2E Izolációs Ház ${runId.slice(0, 8)}`;
  const formattedAddress = `9999 Tesztváros, Izoláció utca ${runId.slice(0, 4)}.`;

  const cleanup = async () => {
    const steps = [
      ['role_assignments', 'id', roleAssignmentId],
      ['management_mandates', 'id', mandateId],
      ['membership_periods', 'membership_id', membershipId],
      ['workspace_memberships', 'id', membershipId],
      ['units', 'id', unitId],
      ['workspace_buildings', 'workspace_id', workspaceId],
      ['building_address_assignments', 'physical_building_id', workspaceId],
      ['workspaces', 'id', workspaceId],
      ['physical_buildings', 'id', workspaceId],
      ['buildings', 'id', workspaceId],
      ['addresses', 'id', addressId],
    ];
    const failures = [];
    for (const [table, column, value] of steps) {
      const { error } = await service.from(table).delete().eq(column, value);
      if (error) failures.push(`${table}: ${error.message}`);
    }
    if (failures.length > 0) throw new Error(`Fixture cleanup failed: ${failures.join(' | ')}`);
  };

  let primaryError;
  try {
    assertNoError(await service.from('addresses').insert({
      id: addressId,
      country_code: 'HU',
      address_level: 'BUILDING',
      formatted_address: formattedAddress,
      canonical_key: `e2e-isolation-${runId}`,
      source_system: 'MANUAL',
      source_record_id: `hosted-e2e-${runId}`,
      verification_status: 'VERIFIED',
      latitude: 47.4979,
      longitude: 19.0402,
    }), 'Address fixture insert');

    assertNoError(await service.from('buildings').insert({
      id: workspaceId,
      name: workspaceName,
      address: formattedAddress,
      lat: 47.4979,
      lon: 19.0402,
      geocoded_at: new Date().toISOString(),
    }), 'Legacy building fixture insert');

    assertNoError(await service.from('physical_buildings').insert({
      id: workspaceId,
      canonical_name: workspaceName,
      status: 'ACTIVE',
      address_verification_status: 'VERIFIED',
      latitude: 47.4979,
      longitude: 19.0402,
    }), 'Physical building fixture insert');

    assertNoError(await service.from('workspaces').insert({
      id: workspaceId,
      name: workspaceName,
      legal_form: 'CONDOMINIUM',
      governance_mode: 'SELF_MANAGED',
      governance_legal_basis: 'HOSTED_E2E_VERIFIED_FIXTURE',
      status: 'PENDING_VERIFICATION',
      created_by_profile_id: managerUser.id,
    }), 'Workspace fixture insert');

    assertNoError(await service.from('workspace_buildings').insert({
      workspace_id: workspaceId,
      physical_building_id: workspaceId,
      is_primary: true,
    }), 'Workspace/building binding insert');

    assertNoError(await service.from('building_address_assignments').insert({
      physical_building_id: workspaceId,
      address_id: addressId,
      assignment_role: 'PRIMARY',
      is_verified: true,
      source: 'HOSTED_E2E',
      created_by_profile_id: managerUser.id,
    }), 'Building/address binding insert');

    // ACTIVE is a deferred legacy-compatibility invariant: the physical
    // building and primary workspace binding must exist before activation.
    assertNoError(
      await service.from('workspaces').update({ status: 'ACTIVE' }).eq('id', workspaceId),
      'Workspace fixture activation',
    );

    assertNoError(await service.from('units').insert({
      id: unitId,
      building_id: workspaceId,
      unit_label: 'E2E-1',
      workspace_id: workspaceId,
      physical_building_id: workspaceId,
      designation: 'E2E-1',
      normalized_designation: 'e2e-1',
      unit_category: 'APARTMENT',
      status: 'ACTIVE',
      created_by_profile_id: managerUser.id,
    }), 'Unit fixture insert');

    assertNoError(await service.from('workspace_memberships').insert({
      id: membershipId,
      workspace_id: workspaceId,
      profile_id: managerUser.id,
      status: 'ACTIVE',
      source: 'BOOTSTRAP',
      created_by_profile_id: managerUser.id,
      primary_context_unit_id: unitId,
    }), 'Workspace membership fixture insert');

    assertNoError(await service.from('membership_periods').insert({
      workspace_id: workspaceId,
      membership_id: membershipId,
      start_reason: 'HOSTED_E2E',
      created_by_profile_id: managerUser.id,
    }), 'Membership period fixture insert');

    assertNoError(await service.from('management_mandates').insert({
      id: mandateId,
      workspace_id: workspaceId,
      mandate_party_id: accountLink.person_id,
      mandate_type: 'SELF_MANAGED_COORDINATION',
      status: 'ACTIVE',
      verification_status: 'VERIFIED',
      evidence_reference: JSON.stringify({ type: 'HOSTED_E2E', run_id: runId }),
      appointment_reference: 'HOSTED_E2E',
      created_by_profile_id: managerUser.id,
    }), 'Management mandate fixture insert');

    assertNoError(await service.from('role_assignments').insert({
      id: roleAssignmentId,
      workspace_id: workspaceId,
      membership_id: membershipId,
      role_key: 'SELF_MANAGED_ADMIN',
      source_mandate_id: mandateId,
      status: 'ACTIVE',
      granted_by_profile_id: managerUser.id,
      reason: 'HOSTED_TWO_TENANT_E2E',
    }), 'Role assignment fixture insert');

    const managerWorkspaces = assertNoError(
      await manager.client.rpc('get_my_workspaces'),
      'Manager workspace listing',
    ) ?? [];
    const residentWorkspaces = assertNoError(
      await resident.client.rpc('get_my_workspaces'),
      'Resident workspace listing',
    ) ?? [];
    assert(managerWorkspaces.some((row) => row.workspace_id === workspaceId), 'Manager cannot see fixture tenant');
    assert(managerWorkspaces.length >= 2, 'Manager does not see two tenants');
    assert(!residentWorkspaces.some((row) => row.workspace_id === workspaceId), 'Resident can see foreign tenant');
    assert(residentWorkspaces.length >= 1, 'Resident lost the existing tenant');

    const managerContext = assertNoError(
      await manager.client.rpc('get_workspace_context', { p_workspace_id: workspaceId }),
      'Manager workspace context',
    ) ?? [];
    const residentContext = assertNoError(
      await resident.client.rpc('get_workspace_context', { p_workspace_id: workspaceId }),
      'Resident foreign workspace context',
    ) ?? [];
    assert(managerContext.length === 1, 'Manager cannot resolve fixture workspace context');
    assert(managerContext[0].role_keys.includes('SELF_MANAGED_ADMIN'), 'Manager admin role is missing');
    assert(residentContext.length === 0, 'Resident resolved foreign workspace context');

    const residentDirectRead = assertNoError(
      await resident.client.from('workspaces').select('id').eq('id', workspaceId),
      'Resident direct workspace read',
    ) ?? [];
    assert(residentDirectRead.length === 0, 'RLS exposed the foreign workspace row');

    const registerPage = await fetchHosted(hostUrl, '/register');
    assert(registerPage.status === 200, `Hosted registration returned ${registerPage.status}`);
    assert(
      registerPage.body.includes('/_next/static/chunks/app/register/page-')
        && registerPage.body.includes('Regisztráció betöltése'),
      'Hosted email/password registration UI is missing',
    );

    const managerPicker = await fetchHosted(hostUrl, '/app', manager.cookieHeader());
    assert(managerPicker.status === 200, `Manager picker returned ${managerPicker.status}`);
    assert(managerPicker.body.includes(workspaceName), 'Manager picker does not render the second tenant');

    const residentPicker = await fetchHosted(hostUrl, '/app', resident.cookieHeader());
    assert(residentPicker.status === 200, `Resident picker returned ${residentPicker.status}`);
    assert(!residentPicker.body.includes(workspaceName), 'Resident picker renders the foreign tenant');

    const managerDashboard = await fetchHosted(hostUrl, `/w/${workspaceId}`, manager.cookieHeader());
    assert(managerDashboard.status === 200, `Manager dashboard returned ${managerDashboard.status}`);
    assert(managerDashboard.body.includes(workspaceName), 'Manager dashboard does not render fixture tenant');

    const residentDashboard = await fetchHosted(hostUrl, `/w/${workspaceId}`, resident.cookieHeader());
    assert([303, 307, 308].includes(residentDashboard.status), `Resident foreign dashboard returned ${residentDashboard.status}`);
    assert(
      residentDashboard.location === '/app' || residentDashboard.location === `${hostUrl.origin}/app`,
      'Resident foreign dashboard did not redirect to /app',
    );

    const unauthenticatedWorker = await fetchHosted(hostUrl, '/api/cron/announcement-delivery');
    assert(unauthenticatedWorker.status === 401, `Unauthenticated worker returned ${unauthenticatedWorker.status}`);

    console.log(JSON.stringify({
      ok: true,
      runId,
      workspaceId,
      host: hostUrl.origin,
      managerTenantCount: managerWorkspaces.length,
      residentTenantCount: residentWorkspaces.length,
      checks: {
        passwordAuthentication: true,
        registrationPage: true,
        managerTwoTenantPicker: true,
        managerTenantDashboard: true,
        residentTenantIsolation: true,
        databaseRlsIsolation: true,
        workerRejectsAnonymous: true,
      },
    }, null, 2));
  } catch (error) {
    primaryError = error;
  } finally {
    try {
      await cleanup();
    } catch (cleanupError) {
      if (primaryError) {
        throw new AggregateError([primaryError, cleanupError], 'Hosted E2E and cleanup both failed');
      }
      throw cleanupError;
    }
  }

  if (primaryError) throw primaryError;
}

main().catch((error) => {
  const message = error instanceof Error ? error.message : String(error);
  console.error(`Hosted two-tenant E2E failed: ${message}`);
  process.exitCode = 1;
});
