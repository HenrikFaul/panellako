import type { SupabaseClient } from '@supabase/supabase-js';
import AnnouncementEmail from '@/lib/email-templates/announcement';
import {
  renderEmailTemplate,
  sendEmail,
  type SendEmailOptions,
  type SendEmailResult,
} from '@/lib/email';

export interface AnnouncementDeliveryClaim {
  outbox_id: string;
  workspace_id: string;
  announcement_id: string;
  recipient_profile_id: string;
  attempt_count: number;
  claim_token: string;
  claimed_at: string;
}

interface RecipientProfile {
  id: string;
  email: string;
  notifications_email: boolean | null;
  unsubscribe_token: string | null;
  status: string;
}

interface SenderProfile {
  id: string;
  display_name: string | null;
  full_name: string | null;
}

interface AnnouncementRecord {
  id: string;
  workspace_id: string;
  building_id: string | null;
  created_by: string | null;
  title: string;
  content: string;
  category: string | null;
}

interface BuildingRecord {
  id: string;
  name: string;
  address: string;
}

export interface AnnouncementDeliveryStore {
  claim(config: Pick<AnnouncementDeliveryWorkerConfig, 'batchSize' | 'leaseSeconds' | 'maxAttempts'>): Promise<AnnouncementDeliveryClaim[]>;
  loadRecipientProfiles(profileIds: string[]): Promise<RecipientProfile[]>;
  loadSenderProfiles(profileIds: string[]): Promise<SenderProfile[]>;
  loadAnnouncements(announcementIds: string[]): Promise<AnnouncementRecord[]>;
  loadBuildings(buildingIds: string[]): Promise<BuildingRecord[]>;
  complete(claim: AnnouncementDeliveryClaim, providerMessageId: string): Promise<string>;
  fail(
    claim: AnnouncementDeliveryClaim,
    failureCode: string,
    retryable: boolean,
    config: Pick<AnnouncementDeliveryWorkerConfig, 'maxAttempts' | 'baseBackoffSeconds' | 'maxBackoffSeconds'>,
  ): Promise<string>;
  cancel(claim: AnnouncementDeliveryClaim, reasonCode: string): Promise<string>;
}

export interface AnnouncementDeliveryWorkerConfig {
  batchSize: number;
  leaseSeconds: number;
  maxAttempts: number;
  baseBackoffSeconds: number;
  maxBackoffSeconds: number;
  appBaseUrl: string;
}

interface AnnouncementRenderInput {
  buildingName: string;
  buildingAddress: string;
  announcementTitle: string;
  announcementContent: string;
  category: string;
  senderName: string;
  unsubscribeUrl: string;
  dashboardUrl: string;
}

interface WorkerDependencies {
  send?: (options: SendEmailOptions) => Promise<SendEmailResult>;
  render?: (input: AnnouncementRenderInput) => Promise<string>;
}

export interface AnnouncementDeliveryBatchResult {
  claimed: number;
  delivered: number;
  retryScheduled: number;
  deadLettered: number;
  cancelled: number;
  claimLost: number;
}

function unique(values: Array<string | null>): string[] {
  return [...new Set(values.filter((value): value is string => Boolean(value)))];
}

function isEmailAddress(value: string): boolean {
  return value.length <= 320 && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
}

function isUuid(value: string | null): value is string {
  return Boolean(value && /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value));
}

function safeFailureCode(value: string | undefined): string {
  if (value && /^[A-Z0-9_]{1,64}$/.test(value)) return value;
  return 'EMAIL_PROVIDER_FAILURE';
}

function resultTemplate(claimed: number): AnnouncementDeliveryBatchResult {
  return {
    claimed,
    delivered: 0,
    retryScheduled: 0,
    deadLettered: 0,
    cancelled: 0,
    claimLost: 0,
  };
}

function recordTransition(result: AnnouncementDeliveryBatchResult, transition: string): void {
  if (transition === 'DELIVERED' || transition === 'ALREADY_DELIVERED') {
    result.delivered += 1;
  } else if (transition === 'RETRY_SCHEDULED' || transition === 'ALREADY_FAILED') {
    result.retryScheduled += 1;
  } else if (transition === 'DEAD_LETTER' || transition === 'ALREADY_DEAD_LETTER') {
    result.deadLettered += 1;
  } else if (transition === 'CANCELLED' || transition === 'ALREADY_CANCELLED') {
    result.cancelled += 1;
  } else {
    result.claimLost += 1;
  }
}

async function defaultRender(input: AnnouncementRenderInput): Promise<string> {
  return renderEmailTemplate(AnnouncementEmail(input));
}

function workerUrl(baseUrl: string, path: string): URL {
  return new URL(path, baseUrl.endsWith('/') ? baseUrl : `${baseUrl}/`);
}

export async function runAnnouncementDeliveryBatch(
  store: AnnouncementDeliveryStore,
  config: AnnouncementDeliveryWorkerConfig,
  dependencies: WorkerDependencies = {},
): Promise<AnnouncementDeliveryBatchResult> {
  const claims = await store.claim(config);
  const result = resultTemplate(claims.length);
  if (claims.length === 0) return result;

  const send = dependencies.send ?? sendEmail;
  const render = dependencies.render ?? defaultRender;

  let recipients: RecipientProfile[];
  let announcements: AnnouncementRecord[];
  let buildings: BuildingRecord[];
  let senders: SenderProfile[];

  try {
    [recipients, announcements] = await Promise.all([
      store.loadRecipientProfiles(unique(claims.map(claim => claim.recipient_profile_id))),
      store.loadAnnouncements(unique(claims.map(claim => claim.announcement_id))),
    ]);
    buildings = await store.loadBuildings(unique(announcements.map(announcement => announcement.building_id)));
    senders = await store.loadSenderProfiles(unique(announcements.map(announcement => announcement.created_by)));
  } catch {
    const transitions = await Promise.allSettled(claims.map(claim => store.fail(
      claim,
      'DELIVERY_CONTEXT_LOAD_FAILED',
      true,
      config,
    )));
    for (const transition of transitions) {
      recordTransition(result, transition.status === 'fulfilled' ? transition.value : 'CLAIM_LOST');
    }
    return result;
  }

  const recipientById = new Map(recipients.map(profile => [profile.id, profile]));
  const announcementById = new Map(announcements.map(announcement => [announcement.id, announcement]));
  const buildingById = new Map(buildings.map(building => [building.id, building]));
  const senderById = new Map(senders.map(sender => [sender.id, sender]));

  for (const claim of claims) {
    const recipient = recipientById.get(claim.recipient_profile_id);
    const announcement = announcementById.get(claim.announcement_id);

    try {
      if (!recipient || recipient.status !== 'ACTIVE') {
        recordTransition(result, await store.cancel(claim, 'RECIPIENT_NOT_ACTIVE'));
        continue;
      }
      if (recipient.notifications_email === false) {
        recordTransition(result, await store.cancel(claim, 'EMAIL_OPTED_OUT'));
        continue;
      }
      if (!isEmailAddress(recipient.email)) {
        recordTransition(result, await store.cancel(claim, 'RECIPIENT_EMAIL_INVALID'));
        continue;
      }
      if (!isUuid(recipient.unsubscribe_token)) {
        recordTransition(result, await store.cancel(claim, 'UNSUBSCRIBE_TOKEN_MISSING'));
        continue;
      }
      if (!announcement || announcement.workspace_id !== claim.workspace_id || !announcement.building_id) {
        recordTransition(result, await store.fail(claim, 'DELIVERY_CONTEXT_INVALID', false, config));
        continue;
      }

      const building = buildingById.get(announcement.building_id);
      if (!building) {
        recordTransition(result, await store.fail(claim, 'DELIVERY_CONTEXT_INVALID', false, config));
        continue;
      }

      const sender = announcement.created_by ? senderById.get(announcement.created_by) : undefined;
      const senderName = sender?.display_name?.trim() || sender?.full_name?.trim() || 'PanelLakó';
      const unsubscribeUrl = workerUrl(config.appBaseUrl, '/api/email/unsubscribe');
      unsubscribeUrl.searchParams.set('token', recipient.unsubscribe_token);
      const dashboardUrl = workerUrl(config.appBaseUrl, `/w/${claim.workspace_id}`);
      const html = await render({
        buildingName: building.name,
        buildingAddress: building.address,
        announcementTitle: announcement.title,
        announcementContent: announcement.content,
        category: announcement.category ?? 'egyeb',
        senderName,
        unsubscribeUrl: unsubscribeUrl.toString(),
        dashboardUrl: dashboardUrl.toString(),
      });

      const delivery = await send({
        to: recipient.email,
        subject: `${building.name}: ${announcement.title}`.slice(0, 180),
        html,
        tags: [{ name: 'source', value: 'announcement' }],
      });

      if (delivery.success && delivery.id && !delivery.id.startsWith('stub_')) {
        recordTransition(result, await store.complete(claim, delivery.id));
      } else {
        const failureCode = delivery.success ? 'EMAIL_TRANSPORT_STUB' : safeFailureCode(delivery.errorCode);
        recordTransition(result, await store.fail(
          claim,
          failureCode,
          delivery.success ? true : delivery.retryable === true,
          config,
        ));
      }
    } catch {
      try {
        recordTransition(result, await store.fail(claim, 'DELIVERY_WORKER_ERROR', true, config));
      } catch {
        result.claimLost += 1;
      }
    }
  }

  return result;
}

async function rpcRows<T>(
  client: SupabaseClient,
  functionName: string,
  parameters: Record<string, unknown>,
): Promise<T[]> {
  const { data, error } = await client.rpc(functionName, parameters);
  if (error) throw new Error(`${functionName} failed`);
  return (Array.isArray(data) ? data : []) as T[];
}

async function rpcTransition(
  client: SupabaseClient,
  functionName: string,
  parameters: Record<string, unknown>,
): Promise<string> {
  const { data, error } = await client.rpc(functionName, parameters);
  if (error) throw new Error(`${functionName} failed`);
  if (typeof data === 'string') return data;
  if (Array.isArray(data) && typeof data[0] === 'string') return data[0];
  return 'CLAIM_LOST';
}

async function selectRows<T>(query: PromiseLike<{ data: unknown; error: unknown }>, operation: string): Promise<T[]> {
  const { data, error } = await query;
  if (error) throw new Error(`${operation} failed`);
  return (Array.isArray(data) ? data : []) as T[];
}

export function createSupabaseAnnouncementDeliveryStore(client: SupabaseClient): AnnouncementDeliveryStore {
  return {
    claim: config => rpcRows<AnnouncementDeliveryClaim>(client, 'claim_announcement_delivery_batch', {
      p_limit: config.batchSize,
      p_lease_seconds: config.leaseSeconds,
      p_max_attempts: config.maxAttempts,
    }),
    loadRecipientProfiles: profileIds => profileIds.length === 0
      ? Promise.resolve([])
      : selectRows<RecipientProfile>(
        client
          .from('profiles')
          .select('id, email, notifications_email, unsubscribe_token, status')
          .in('id', profileIds),
        'recipient profile lookup',
      ),
    loadSenderProfiles: profileIds => profileIds.length === 0
      ? Promise.resolve([])
      : selectRows<SenderProfile>(
        client.from('profiles').select('id, display_name, full_name').in('id', profileIds),
        'sender profile lookup',
      ),
    loadAnnouncements: announcementIds => announcementIds.length === 0
      ? Promise.resolve([])
      : selectRows<AnnouncementRecord>(
        client
          .from('announcements')
          .select('id, workspace_id, building_id, created_by, title, content, category')
          .in('id', announcementIds),
        'announcement lookup',
      ),
    loadBuildings: buildingIds => buildingIds.length === 0
      ? Promise.resolve([])
      : selectRows<BuildingRecord>(
        client.from('buildings').select('id, name, address').in('id', buildingIds),
        'building lookup',
      ),
    async complete(claim, providerMessageId) {
      return rpcTransition(client, 'complete_announcement_delivery', {
        p_outbox_id: claim.outbox_id,
        p_claim_token: claim.claim_token,
        p_provider_message_id: providerMessageId,
      });
    },
    async fail(claim, failureCode, retryable, config) {
      return rpcTransition(client, 'fail_announcement_delivery', {
        p_outbox_id: claim.outbox_id,
        p_claim_token: claim.claim_token,
        p_failure_code: failureCode,
        p_retryable: retryable,
        p_max_attempts: config.maxAttempts,
        p_base_backoff_seconds: config.baseBackoffSeconds,
        p_max_backoff_seconds: config.maxBackoffSeconds,
      });
    },
    async cancel(claim, reasonCode) {
      return rpcTransition(client, 'cancel_announcement_delivery', {
        p_outbox_id: claim.outbox_id,
        p_claim_token: claim.claim_token,
        p_reason_code: reasonCode,
      });
    },
  };
}
