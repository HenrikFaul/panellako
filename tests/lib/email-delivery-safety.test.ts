import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { isEmailTransportConfigured, sendEmail } from '@/lib/email';

describe('email delivery safety', () => {
  const fetchMock = vi.fn();
  const errorSpy = vi.spyOn(console, 'error').mockImplementation(() => undefined);
  const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => undefined);

  beforeEach(() => {
    vi.clearAllMocks();
    vi.unstubAllEnvs();
    vi.stubGlobal('fetch', fetchMock);
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('hard-fails instead of returning a stub delivery in production', async () => {
    vi.stubEnv('NODE_ENV', 'production');
    vi.stubEnv('BREVO_API_KEY', '');

    const result = await sendEmail({
      to: 'private@example.hu',
      subject: 'Private announcement title',
      html: '<p>Private body</p>',
    });

    expect(isEmailTransportConfigured()).toBe(false);
    expect(result).toMatchObject({
      success: false,
      errorCode: 'EMAIL_TRANSPORT_UNCONFIGURED',
      retryable: true,
    });
    expect(result.id).toBeUndefined();
    expect(fetchMock).not.toHaveBeenCalled();
    expect(JSON.stringify(warnSpy.mock.calls)).not.toContain('private@example.hu');
    expect(JSON.stringify(warnSpy.mock.calls)).not.toContain('Private announcement title');
  });

  it('classifies a retryable Brevo response without logging its potentially sensitive body', async () => {
    vi.stubEnv('BREVO_API_KEY', 'configured-key');
    fetchMock.mockResolvedValue(new Response(
      'recipient private@example.hu and message body must not be logged',
      { status: 429, statusText: 'Too Many Requests' },
    ));

    const result = await sendEmail({
      to: 'private@example.hu',
      subject: 'Private announcement title',
      html: '<p>Private body</p>',
    });

    expect(result).toMatchObject({
      success: false,
      errorCode: 'BREVO_RATE_LIMITED',
      retryable: true,
      providerStatus: 429,
    });
    expect(JSON.stringify(errorSpy.mock.calls)).not.toContain('private@example.hu');
    expect(JSON.stringify(errorSpy.mock.calls)).not.toContain('message body');
  });

  it('requires a real message id in a successful provider response', async () => {
    vi.stubEnv('BREVO_API_KEY', 'configured-key');
    fetchMock.mockResolvedValue(new Response('{}', {
      status: 201,
      headers: { 'Content-Type': 'application/json' },
    }));

    const result = await sendEmail({
      to: 'private@example.hu',
      subject: 'Announcement',
      html: '<p>Body</p>',
    });

    expect(result).toMatchObject({
      success: false,
      errorCode: 'BREVO_RESPONSE_INVALID',
      retryable: true,
    });
  });
});
