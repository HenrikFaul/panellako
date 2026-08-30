import { sanitizeReturnTo } from '@/lib/auth/return-to';

type GoogleOAuthRequest = {
  provider: 'google';
  options: {
    redirectTo: string;
  };
};

type GoogleOAuthClient = {
  auth: {
    signInWithOAuth(request: GoogleOAuthRequest): Promise<{ error: unknown }>;
  };
};

type GoogleOAuthOptions = {
  origin: string;
  returnTo: string | null | undefined;
  fallback?: string;
};

export function buildOAuthCallbackUrl({
  origin,
  returnTo,
  fallback = '/app',
}: GoogleOAuthOptions): string {
  const parsedOrigin = new URL(origin);
  if (parsedOrigin.protocol !== 'https:' && parsedOrigin.protocol !== 'http:') {
    throw new TypeError('OAuth callback origin must use HTTP or HTTPS.');
  }

  const callbackUrl = new URL('/auth/callback', parsedOrigin.origin);
  callbackUrl.searchParams.set('next', sanitizeReturnTo(returnTo, fallback));
  return callbackUrl.toString();
}

export function requestGoogleOAuth(
  client: GoogleOAuthClient,
  options: GoogleOAuthOptions,
): Promise<{ error: unknown }> {
  return client.auth.signInWithOAuth({
    provider: 'google',
    options: {
      redirectTo: buildOAuthCallbackUrl(options),
    },
  });
}
