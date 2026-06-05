import { NextResponse } from 'next/server';

// Standardized API error codes — mirrors the taxonomy from the ticket system.
// All API routes MUST use apiError() instead of ad-hoc NextResponse.json({ error: ... }).
export const ApiErrorCode = {
  UNAUTHENTICATED:  'UNAUTHENTICATED',
  FORBIDDEN:        'FORBIDDEN',
  NOT_FOUND:        'NOT_FOUND',
  BAD_REQUEST:      'BAD_REQUEST',
  CONFLICT:         'CONFLICT',
  INTERNAL:         'INTERNAL',
  EXTERNAL_SERVICE: 'EXTERNAL_SERVICE',
} as const satisfies Record<string, string>;

export type ApiErrorCode = typeof ApiErrorCode[keyof typeof ApiErrorCode];

// HTTP status defaults per error type
const DEFAULT_STATUS: Record<ApiErrorCode, number> = {
  UNAUTHENTICATED:  401,
  FORBIDDEN:        403,
  NOT_FOUND:        404,
  BAD_REQUEST:      400,
  CONFLICT:         409,
  INTERNAL:         500,
  EXTERNAL_SERVICE: 502,
} satisfies Record<ApiErrorCode, number>;

export function apiError(
  code: ApiErrorCode,
  message?: string,
  statusOverride?: number,
): NextResponse {
  const status = statusOverride ?? DEFAULT_STATUS[code];
  return NextResponse.json(
    message ? { error: code, message } : { error: code },
    { status },
  );
}
