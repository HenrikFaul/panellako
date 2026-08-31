export type BoundedJsonErrorCode = 'INVALID_JSON' | 'REQUEST_TOO_LARGE';

export class BoundedJsonError extends Error {
  readonly code: BoundedJsonErrorCode;

  constructor(code: BoundedJsonErrorCode) {
    super(code);
    this.name = 'BoundedJsonError';
    this.code = code;
  }
}

/** Read a request body without trusting Content-Length or buffering past the limit. */
export async function readBoundedJson(
  request: Request,
  maximumBytes: number,
): Promise<unknown> {
  const declaredLength = request.headers.get('content-length');
  if (declaredLength !== null) {
    const parsedLength = Number(declaredLength);
    if (Number.isFinite(parsedLength) && parsedLength > maximumBytes) {
      throw new BoundedJsonError('REQUEST_TOO_LARGE');
    }
  }

  if (!request.body) throw new BoundedJsonError('INVALID_JSON');

  const reader = request.body.getReader();
  const chunks: Uint8Array[] = [];
  let totalBytes = 0;
  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      if (!value) continue;
      totalBytes += value.byteLength;
      if (totalBytes > maximumBytes) {
        try {
          await reader.cancel('request-size-limit');
        } catch {
          // Best effort only: no bytes beyond the bounded reader are retained.
        }
        throw new BoundedJsonError('REQUEST_TOO_LARGE');
      }
      chunks.push(value);
    }
  } finally {
    reader.releaseLock();
  }

  const body = new Uint8Array(totalBytes);
  let offset = 0;
  for (const chunk of chunks) {
    body.set(chunk, offset);
    offset += chunk.byteLength;
  }

  try {
    const text = new TextDecoder('utf-8', { fatal: true }).decode(body);
    return JSON.parse(text) as unknown;
  } catch (error) {
    if (error instanceof BoundedJsonError) throw error;
    throw new BoundedJsonError('INVALID_JSON');
  }
}
