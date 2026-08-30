import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

const workflow = readFileSync('.github/workflows/google-oauth-config.yml', 'utf8');

describe('production Google OAuth provider workflow contract', () => {
  it('requires the production environment plus exact repository, branch, actor and approval guards', () => {
    expect(workflow).toContain('environment: production');
    expect(workflow).toContain('GITHUB_REPOSITORY');
    expect(workflow).toContain('HenrikFaul/panellako');
    expect(workflow).toContain('refs/heads/main');
    expect(workflow).toContain('GITHUB_ACTOR');
    expect(workflow).toContain('if [ "$CONFIRM" != "IGEN:PANELLAKO-GOOGLE-OAUTH" ]');
    expect(workflow).toContain('secrets.SUPABASE_ACCESS_TOKEN');
    expect(workflow).toContain('secrets.PANELLAKO_GOOGLE_OAUTH_CLIENT_ID');
    expect(workflow).toContain('secrets.PANELLAKO_GOOGLE_OAUTH_CLIENT_SECRET');
  });

  it('changes only the Google provider through the documented Auth config endpoint', () => {
    expect(workflow).toContain(
      'https://api.supabase.com/v1/projects/wzromwxpjlyrqbdiapep/config/auth',
    );
    expect(workflow).toContain('external_google_enabled: true');
    expect(workflow).toContain('external_google_client_id: $client_id');
    expect(workflow).toContain('external_google_secret: $client_secret');
    expect(workflow).toContain('external_google_email_optional: false');
    expect(workflow).toContain('external_google_skip_nonce_check: false');
    expect(workflow).toContain('uri_allow_list: $uri_allow_list');
    expect(workflow).toContain('--request PATCH');
  });

  it('fails closed on unexpected live state, and restores the safe state on failed verification', () => {
    expect(workflow).toContain('A Google provider már aktív');
    expect(workflow).toContain('Eltérő Google kliens-ID található');
    expect(workflow).toContain('automatikus átírás tiltott');
    expect(workflow).toContain('A jelenlegi production Auth site origin');
    expect(workflow).toContain('urllib.parse.urlparse');
    expect(workflow).not.toContain('echo "$CURRENT_SITE_URL"');
    expect(workflow).toContain('ROLLBACK_ARMED=true');
    expect(workflow).toContain('external_google_enabled: false');
    expect(workflow).toContain('CURRENT_ALLOW_LIST');
  });

  it('reads the state back and proves the hosted redirect without printing bodies or credentials', () => {
    expect(workflow).toContain('.external_google_enabled == true');
    expect(workflow).toContain('.external_google_client_id == $expected_client_id');
    expect(workflow).toContain('https://panellako.hu/auth/callback');
    expect(workflow).toContain('accounts.google.com');
    expect(workflow).not.toMatch(
      /echo\s+["']?\$(?:BEFORE_BODY|PATCH_BODY|VERIFY_BODY|REQUEST_BODY|ROLLBACK_BODY)/,
    );
    expect(workflow).not.toMatch(
      /cat\s+["']?\$(?:BEFORE_BODY|PATCH_BODY|VERIFY_BODY|REQUEST_BODY|ROLLBACK_BODY)/,
    );
    expect(workflow).not.toContain('set -x');
  });

  it('uses one serialized bounded job without repository or token write permissions', () => {
    expect(workflow).toContain('production-google-oauth-config');
    expect(workflow).toContain('timeout-minutes: 10');
    expect(workflow).toContain('permissions: {}');
    expect(workflow).not.toContain('actions/checkout');
    expect(workflow).not.toContain('contents: write');
    expect(workflow).not.toContain('id-token: write');
  });
});
