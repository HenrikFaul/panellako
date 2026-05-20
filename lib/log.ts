/**
 * lib/log.ts — Structured JSON logger
 *
 * Output is single-line JSON so Vercel + Supabase logs auto-parse fields.
 * Use `logger.info({ event, ... })` everywhere instead of `console.log`.
 * Use `withTiming(event, fn, ctx?)` to time async operations and emit
 * a `latency_ms` field on success / a structured error object on failure.
 *
 * Convention: `event` is a dotted snake-case namespace
 * (e.g. `transit.sync.start`, `ndvi.upload.error`). Keep it stable so
 * log-search queries don't break across releases.
 */

type LogLevel = 'debug' | 'info' | 'warn' | 'error';

export interface LogContext {
  event: string;
  level?: LogLevel;
  building_id?: string;
  user_id?: string;
  job_id?: string;
  latency_ms?: number;
  status?: number;
  error?: { name: string; message: string; stack?: string };
  [key: string]: unknown;
}

export function log(ctx: LogContext): void {
  const out = {
    ts: new Date().toISOString(),
    level: ctx.level ?? 'info',
    ...ctx,
  };
  const fn =
    ctx.level === 'error'
      ? console.error
      : ctx.level === 'warn'
      ? console.warn
      : ctx.level === 'debug'
      ? console.debug
      : console.log;
  // JSON output — Vercel + Supabase logs natively parse one-line JSON
  fn(JSON.stringify(out));
}

export const logger = {
  debug: (ctx: Omit<LogContext, 'level'>) => log({ ...ctx, level: 'debug' } as LogContext),
  info:  (ctx: Omit<LogContext, 'level'>) => log({ ...ctx, level: 'info'  } as LogContext),
  warn:  (ctx: Omit<LogContext, 'level'>) => log({ ...ctx, level: 'warn'  } as LogContext),
  error: (ctx: Omit<LogContext, 'level'>) => log({ ...ctx, level: 'error' } as LogContext),
};

/**
 * Run `fn`, emit an `info` log on success and an `error` log on failure,
 * both annotated with `latency_ms`. Re-throws on failure so callers
 * keep their normal control flow.
 */
export function withTiming<T>(
  event: string,
  fn: () => Promise<T>,
  ctx?: Partial<LogContext>,
): Promise<T> {
  const t0 = Date.now();
  return fn().then(
    (r) => {
      logger.info({ event, latency_ms: Date.now() - t0, ...ctx });
      return r;
    },
    (e) => {
      logger.error({
        event,
        latency_ms: Date.now() - t0,
        ...ctx,
        error: {
          name: e?.name ?? 'Error',
          message: String(e?.message ?? e),
          stack: e?.stack,
        },
      });
      throw e;
    },
  );
}
