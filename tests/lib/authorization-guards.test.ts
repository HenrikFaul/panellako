import { describe, expect, it } from 'vitest';
import { authorizationMessage, WorkspaceAuthorizationError } from '@/lib/authorization/guards';

describe('workspace authorization errors', () => {
  it('does not reveal whether a foreign tenant object exists', () => {
    const error = new WorkspaceAuthorizationError('OBJECT_SCOPE_MISMATCH');
    expect(error.message).toBe('A művelet nem engedélyezett.');
    expect(authorizationMessage(error)).not.toMatch(/workspace|building|unit|uuid/i);
  });

  it('keeps authentication failures actionable', () => {
    const error = new WorkspaceAuthorizationError('AUTH_REQUIRED', 'Bejelentkezés szükséges.');
    expect(authorizationMessage(error)).toBe('Bejelentkezés szükséges.');
  });
});
