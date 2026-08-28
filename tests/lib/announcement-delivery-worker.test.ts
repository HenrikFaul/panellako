import { beforeEach, describe, expect, it, vi } from 'vitest';
import {
  runAnnouncementDeliveryBatch,
  type AnnouncementDeliveryClaim,
  type AnnouncementDeliveryStore,
  type AnnouncementDeliveryWorkerConfig,
} from '@/lib/announcement-delivery-worker';

const claim: AnnouncementDeliveryClaim = {
  outbox_id: '10000000-0000-4000-8000-000000000001',
  workspace_id: '20000000-0000-4000-8000-000000000001',
  announcement_id: '30000000-0000-4000-8000-000000000001',
  recipient_profile_id: '40000000-0000-4000-8000-000000000001',
  attempt_count: 1,
  claim_token: '50000000-0000-4000-8000-000000000001',
  claimed_at: '2026-08-28T12:00:00.000Z',
};

const senderId = '60000000-0000-4000-8000-000000000001';
const buildingId = '70000000-0000-4000-8000-000000000001';
const unsubscribeToken = '80000000-0000-4000-8000-000000000001';

const config: AnnouncementDeliveryWorkerConfig = {
  batchSize: 10,
  leaseSeconds: 600,
  maxAttempts: 5,
  baseBackoffSeconds: 30,
  maxBackoffSeconds: 3600,
  appBaseUrl: 'https://panellako.hu/',
};

function createStore(): AnnouncementDeliveryStore {
  return {
    claim: vi.fn().mockResolvedValue([claim]),
    loadRecipientProfiles: vi.fn().mockResolvedValue([{
      id: claim.recipient_profile_id,
      email: 'resident@example.hu',
      notifications_email: true,
      unsubscribe_token: unsubscribeToken,
      status: 'ACTIVE',
    }]),
    loadSenderProfiles: vi.fn().mockResolvedValue([{
      id: senderId,
      display_name: 'Közös Képviselő',
      full_name: 'Képviselő',
    }]),
    loadAnnouncements: vi.fn().mockResolvedValue([{
      id: claim.announcement_id,
      workspace_id: claim.workspace_id,
      building_id: buildingId,
      created_by: senderId,
      title: 'Karbantartási értesítés',
      content: 'A víz rövid ideig szünetel.',
      category: 'uzemeltetes',
    }]),
    loadBuildings: vi.fn().mockResolvedValue([{
      id: buildingId,
      name: 'Minta Társasház',
      address: '1135 Budapest, Minta utca 1.',
    }]),
    complete: vi.fn().mockResolvedValue('DELIVERED'),
    fail: vi.fn().mockResolvedValue('DEAD_LETTER'),
    cancel: vi.fn().mockResolvedValue('CANCELLED'),
  };
}

describe('announcement delivery worker', () => {
  let store: AnnouncementDeliveryStore;
  const render = vi.fn().mockResolvedValue('<html>safe</html>');
  const send = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
    store = createStore();
    send.mockResolvedValue({ success: true, id: 'brevo-message-1' });
  });

  it('resolves current server-side context and completes only with a real provider id', async () => {
    const result = await runAnnouncementDeliveryBatch(store, config, { render, send });

    expect(store.loadRecipientProfiles).toHaveBeenCalledWith([claim.recipient_profile_id]);
    expect(store.loadAnnouncements).toHaveBeenCalledWith([claim.announcement_id]);
    expect(render).toHaveBeenCalledWith(expect.objectContaining({
      announcementTitle: 'Karbantartási értesítés',
      senderName: 'Közös Képviselő',
      unsubscribeUrl: `https://panellako.hu/api/email/unsubscribe?token=${unsubscribeToken}`,
      dashboardUrl: `https://panellako.hu/w/${claim.workspace_id}`,
    }));
    expect(send).toHaveBeenCalledWith(expect.objectContaining({
      to: 'resident@example.hu',
      html: '<html>safe</html>',
    }));
    expect(store.complete).toHaveBeenCalledWith(claim, 'brevo-message-1');
    expect(store.fail).not.toHaveBeenCalled();
    expect(result).toMatchObject({ claimed: 1, delivered: 1, retryScheduled: 0, deadLettered: 0 });
  });

  it('re-checks the current preference and cancels an opted-out recipient before rendering', async () => {
    vi.mocked(store.loadRecipientProfiles).mockResolvedValue([{
      id: claim.recipient_profile_id,
      email: 'resident@example.hu',
      notifications_email: false,
      unsubscribe_token: unsubscribeToken,
      status: 'ACTIVE',
    }]);

    const result = await runAnnouncementDeliveryBatch(store, config, { render, send });

    expect(store.cancel).toHaveBeenCalledWith(claim, 'EMAIL_OPTED_OUT');
    expect(render).not.toHaveBeenCalled();
    expect(send).not.toHaveBeenCalled();
    expect(result.cancelled).toBe(1);
  });

  it('never counts a local stub as delivered and schedules it as retryable', async () => {
    send.mockResolvedValue({ success: true, id: 'stub_preview_only' });
    vi.mocked(store.fail).mockResolvedValue('RETRY_SCHEDULED');

    const result = await runAnnouncementDeliveryBatch(store, config, { render, send });

    expect(store.complete).not.toHaveBeenCalled();
    expect(store.fail).toHaveBeenCalledWith(claim, 'EMAIL_TRANSPORT_STUB', true, config);
    expect(result).toMatchObject({ delivered: 0, retryScheduled: 1, deadLettered: 0 });
  });

  it('schedules retryable provider failures using only a stable error code', async () => {
    send.mockResolvedValue({
      success: false,
      error: 'provider body that must not be persisted',
      errorCode: 'BREVO_RATE_LIMITED',
      retryable: true,
    });
    vi.mocked(store.fail).mockResolvedValue('RETRY_SCHEDULED');

    const result = await runAnnouncementDeliveryBatch(store, config, { render, send });

    expect(store.fail).toHaveBeenCalledWith(claim, 'BREVO_RATE_LIMITED', true, config);
    expect(JSON.stringify(vi.mocked(store.fail).mock.calls)).not.toContain('provider body');
    expect(result.retryScheduled).toBe(1);
  });

  it('normalizes untrusted provider error codes before persistence', async () => {
    send.mockResolvedValue({
      success: false,
      errorCode: 'recipient@example.hu was rejected',
      retryable: false,
    });

    await runAnnouncementDeliveryBatch(store, config, { render, send });

    expect(store.fail).toHaveBeenCalledWith(claim, 'EMAIL_PROVIDER_FAILURE', false, config);
  });

  it('fails closed when the announcement no longer matches the claimed workspace', async () => {
    vi.mocked(store.loadAnnouncements).mockResolvedValue([{
      id: claim.announcement_id,
      workspace_id: '90000000-0000-4000-8000-000000000001',
      building_id: buildingId,
      created_by: senderId,
      title: 'Wrong tenant',
      content: 'Must not send',
      category: 'egyeb',
    }]);

    await runAnnouncementDeliveryBatch(store, config, { render, send });

    expect(store.fail).toHaveBeenCalledWith(claim, 'DELIVERY_CONTEXT_INVALID', false, config);
    expect(send).not.toHaveBeenCalled();
  });

  it('releases every claim into backoff when a bounded context query fails', async () => {
    vi.mocked(store.loadRecipientProfiles).mockRejectedValue(new Error('database details'));
    vi.mocked(store.fail).mockResolvedValue('RETRY_SCHEDULED');

    const result = await runAnnouncementDeliveryBatch(store, config, { render, send });

    expect(store.fail).toHaveBeenCalledWith(claim, 'DELIVERY_CONTEXT_LOAD_FAILED', true, config);
    expect(result.retryScheduled).toBe(1);
    expect(send).not.toHaveBeenCalled();
  });
});
